// deno-lint-ignore-file no-explicit-any
import { serve } from "std/http/server.ts"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

async function hashPII(rawStr: any) {
    if (rawStr === null || rawStr === undefined) return null;
    const str = String(rawStr);
    if (str.trim() === '') return null;
    const msgUint8 = new TextEncoder().encode(str.trim().toLowerCase());
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
async function verifyShopifyWebhook(rawBuffer: ArrayBuffer, hmacHeader: string, secret: string) {
    if (!secret || !hmacHeader) return false;
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign', 'verify']
    );
    const signature = await crypto.subtle.sign('HMAC', key, rawBuffer);
    const base64Signature = btoa(String.fromCharCode(...new Uint8Array(signature)));
    return base64Signature === hmacHeader;
}
// GRAPHQL Fetch completely removed due to Shopify Dev Dashboard API constraints.
// System strictly relies on Webhook pushed payloads.

serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const hmacHeader = req.headers.get('x-shopify-hmac-sha256');
  const shopifySecret = Deno.env.get('SHOPIFY_WEBHOOK_SECRET');
  let topic = req.headers.get('x-shopify-topic');
  const shopifyEventId = req.headers.get('x-shopify-webhook-id');
  
  let activeEventId: string | null = null;
  
  try {
    const rawBuffer = await req.arrayBuffer();
    const rawBody = new TextDecoder().decode(rawBuffer);
    const payload = JSON.parse(rawBody)

    // Initialize Supabase Admin Client
    const supabase = createClient(supabaseUrl, supabaseKey)

    if (payload.action === 'replay' && payload.shopify_event_id) {
        // UI MANUALLY TRIGGERED REPLAY (Bypass HMAC, fetch from DB)
        activeEventId = payload.shopify_event_id;
        const { data: logEntry } = await supabase.from('shopify_webhook_logs').select('*').eq('shopify_event_id', activeEventId).single();
        if (!logEntry) return new Response(JSON.stringify({ error: 'Log not found' }), { status: 404 });
        
        Object.assign(payload, logEntry.payload);
        topic = logEntry.topic || topic;
        
        delete payload.action;
        delete payload.shopify_event_id;
    } else {
        // NATIVE WEBHOOK INGESTION
        if (!hmacHeader || !await verifyShopifyWebhook(rawBuffer, hmacHeader, shopifySecret || '')) {
            console.error("HMAC Verification Failed! Unauthorized access attempt.");
            return new Response('Unauthorized', { status: 401 });
        }

        activeEventId = shopifyEventId || `custom-${Date.now()}`;
        const { error: logErr } = await supabase.from('shopify_webhook_logs').insert({
            shopify_event_id: activeEventId,
            topic: topic,
            payload: payload,
            status: 'pending'
        });
        if (logErr && logErr.code !== '23505') console.error('Failed to log webhook', logErr);
    }

    // TOPIC ROUTER: If it's a product update/create, securely ingest the barcode
    if (topic === 'products/update' || topic === 'products/create') {
        const product = payload;
        const aliasUpsertPromises: any[] = [];
        
        if (product.variants && Array.isArray(product.variants)) {
            product.variants.forEach((variant: any) => {
                const sku = (variant.sku || "").trim();
                const barcode = String(variant.barcode || "").trim();
                if (sku) {
                    const upsertPayload: any = {
                        product_sku: sku,
                        is_shopify_synced: true,
                        platform: 'Shopify Webhook',
                        shopify_sku: sku
                    };
                    if (barcode) {
                        upsertPayload.barcode_value = barcode;
                    }
                    
                    aliasUpsertPromises.push(
                        supabase.from('storefront_aliases').upsert(upsertPayload, { onConflict: 'product_sku' })
                    );
                }
            });
        }
        
        if (aliasUpsertPromises.length > 0) {
            await Promise.all(aliasUpsertPromises).catch(err => {
                console.error("Failed to sync product variants:", err);
            });
        }
        return new Response(JSON.stringify({ success: true, mode: 'product_update' }), { status: 200 });
    }

    // TOPIC ROUTER: If it's a pure fulfillment create, handle lightweight tracking update
    if (topic === 'fulfillments/create') {
        const tracking_number = payload.tracking_numbers?.[0] || null;
        const carrier_name = payload.tracking_company || null;
        if (tracking_number) {
            await supabase.from('sales_ledger')
                .update({ tracking_number, carrier_name, fulfillment_status: 'fulfilled' })
                .eq('linked_order_id', String(payload.order_id));
        }
        return new Response(JSON.stringify({ success: true, mode: 'fulfillment_update' }), { status: 200 });
    }

    // Default to full Order parsing
    const order = payload;

    // Supabase Admin Client already initialized at top of block
    // 1. Fetch alias mapping to convert Shopify SKUs to Internal Recipes
    const { data: aliases } = await supabase.from('storefront_aliases').select('*')
    const aliasMap: Record<string, string> = {}
    if (aliases) {
        aliases.forEach((a: any) => { aliasMap[a.product_sku] = a.internal_recipe_name })
    }

    // 2. Map Shopify Data to Neogleamz `sales_ledger` format
      const dateStr = order.created_at ? order.created_at.split('T')[0] : new Date().toISOString().split('T')[0];
      
      // Order level aggregations
      const ship = parseFloat(order.total_shipping_price_set?.shop_money?.amount || 0);
      const tax = parseFloat(order.total_tax) || 0;
      const tot = parseFloat(order.total_price) || 0;
      const balance = parseFloat(order.total_outstanding) || 0;
      const fee = (tot * 0.029) + 0.30; // Stripe/Shopify Payments Processing Rate

      const ledgerRows: any[] = [];
      const invUpdates: any[] = []; // Initialize invUpdates here
      const aliasUpsertPromises: any[] = []; // Track background alias upserts

      const orderIdStr = order.name || String(order.id); // Define orderIdStr here

      // No API available to fetch exact payouts or historical tracking on initial order load.
      // System will fallback to estimated fees. Real tracking injected later via fulfillments/create webhook.
      const trueFee = fee;
      const truePayout = tot - trueFee;
      
      let trackNum = null;
      let carrName = null;
      if (order.fulfillments && order.fulfillments.length > 0) {
          const f = order.fulfillments[0];
          trackNum = f.tracking_numbers?.[0] || f.tracking_number || null;
          carrName = f.tracking_company || null;
      }

      // Shopify tags are a comma-separated string
      const tagsStr = String(order.tags || "");
      
      // Extract Label Cost (e.g. "Label: 4.55" or "Label: $5.00")
      let tagShippingCost = 0;
      const costMatch = tagsStr.match(/Label:\s*\$?(\d+(?:\.\d{1,2})?)/i);
      if (costMatch && costMatch[1]) {
          tagShippingCost = parseFloat(costMatch[1]);
      }

      // Extract Transaction Type (e.g. "Type: Warranty", "Type: Gift", "Type: Pre-Ship Exchange")
      let tagTransactionType: string | null = null;
      const typeMatch = tagsStr.match(/Type:\s*([A-Za-z\- \t]+)(?:,|$)/i);
      if (typeMatch && typeMatch[1]) {
          tagTransactionType = typeMatch[1].trim();
      }

      // extData shippingCost falls back to tag extraction if present
      const extData = { trackingNumber: trackNum, carrierName: carrName, shippingCost: tagShippingCost };
      const piiEmail = await hashPII(order.email);
      const piiPhone = await hashPII(order.phone || order.customer?.phone);
      const piiShipName = await hashPII(order.shipping_address?.name);
      const piiShipAddr = await hashPII(order.shipping_address?.address1);

      if(order.line_items) {
        order.line_items.forEach((item: any, index: any) => {
          const skuName = item.sku || item.name || item.title;
          const qty = parseInt(item.quantity) || 1;
          const price = parseFloat(item.price) || 0;
          
          // Map to internal recipe name by checking SKU first, then full item name, then product title
          const internalName = aliasMap[item.sku] || aliasMap[item.name] || aliasMap[item.title] || item.name || item.title;
          console.log(` -> Mapping SKU: [${skuName}] to Internal Recipe: [${internalName}]`);

          // Auto-upsert/register storefront alias mapping using official variant SKU
          if (item.sku) {
              const cleanItemSku = String(item.sku).trim();
              const targetSku = cleanItemSku;
              
              const itemTitle = item.title === 'Default Title' ? '' : ` - ${item.title}`;
              const fullTitle = `${item.name}${itemTitle}`.trim();

              const upsertPayload: any = {
                  product_sku: fullTitle || targetSku,
                  is_shopify_synced: true,
                  platform: 'Shopify Webhook',
                  shopify_sku: cleanItemSku || null
              };
              
              // Only inject barcode_value if it exists, explicitly preventing null overwrites
              if (item.barcode) {
                  upsertPayload.barcode_value = String(item.barcode).trim();
              }

              const aliasPromise = supabase.from('storefront_aliases').upsert(upsertPayload, { onConflict: 'shopify_sku' });
              aliasUpsertPromises.push(aliasPromise);
          }

          // Sum accurate discount allocations for this specific line item to avoid cart-level double-counting
          let lineDiscount = 0;
          if (item.discount_allocations && item.discount_allocations.length > 0) {
            lineDiscount = item.discount_allocations.reduce((sum: any, d: any) => sum + parseFloat(d.amount || 0), 0);
          }

          // Segregate specific order-level aggregate fees/shipping only onto the FIRST row to perfectly replicate CSV behavior
          const rowShip = index === 0 ? ship : 0;
          const rowTax = index === 0 ? tax : 0;
          const rowFee = index === 0 ? trueFee : 0;
          const rowBalance = index === 0 ? balance : 0;
          const rowCartTotal = index === 0 ? tot : 0;
          const rowPayout = index === 0 ? truePayout : 0;
          const rowActualShippingCost = index === 0 ? extData.shippingCost : 0;

          // Accurately calculate True Net Profit for this specific loop matrix
          const subtotal = price * qty;
          
          let orderTotalRefunded = parseFloat(order.total_refunded) || 0;
          if (orderTotalRefunded === 0 && order.refunds && order.refunds.length > 0) {
              order.refunds.forEach((r: any) => {
                  if (r.transactions) {
                      r.transactions.forEach((t: any) => {
                          if (t.kind === 'refund' && t.status === 'success') {
                              orderTotalRefunded += parseFloat(t.amount || 0);
                          }
                      });
                  }
              });
          }
          const rowRefundedAmount = index === 0 ? orderTotalRefunded : 0;
          
          // Deduce Transaction Type Native Match
          let itemFulfill = String(item.fulfillment_status || "pending").trim().toLowerCase();
          if (itemFulfill === 'null' || itemFulfill === '') itemFulfill = 'pending';
          const fStat = String(order.financial_status || "").trim().toLowerCase();
          
          let tType = 'Standard';
          if (tot === 0 && fStat !== 'refunded') {
              tType = 'NEEDS ATTENTION';
          } else if (itemFulfill === 'pending' || itemFulfill === 'unfulfilled') {
              if (fStat === 'paid') tType = 'Pre-Ship Exchange';
              if (fStat === 'refunded' || fStat === 'partially_refunded') tType = 'Cancelled';
          } else if (fStat === 'refunded' || fStat === 'partially_refunded') {
              tType = 'Refund';
          }

          // Override deduction with Explicit Tag if present
          if (tagTransactionType) {
              tType = tagTransactionType;
          }

          // Net Profit deducts Refunds naturally if they occurred.
          const net = subtotal + rowShip + rowTax - lineDiscount - rowFee - rowActualShippingCost - rowRefundedAmount;

          // AGGREGATOR: Prevent false-flagging of legitimate identical line items in Draft Orders
          const existingRow = ledgerRows.find((r: any) => String(r.storefront_sku) === String(skuName));
          if (existingRow) {
              console.log(` -> Aggregating duplicate line item: [${skuName}] (+${qty})`);
              existingRow.qty_sold += qty;
              existingRow.subtotal += subtotal;
              existingRow.discount_amount += lineDiscount;
              existingRow.net_profit += (subtotal - lineDiscount); // rowShip, rowFee, etc are mapped to the first index.
              
              const existingInv = invUpdates.find((i: any) => i.item_key === `RECIPE:::${internalName}`);
              if (existingInv) {
                  existingInv.sold_qty_increment += qty;
              } else {
                  invUpdates.push({ item_key: `RECIPE:::${internalName}`, sold_qty_increment: qty });
              }
              return;
          }

          ledgerRows.push({
            order_id: orderIdStr,
            sale_date: dateStr,
            storefront_sku: skuName,
            internal_recipe_name: internalName,
            qty_sold: qty,
            actual_sale_price: price,
            cogs_at_sale: 0, 
            subtotal: subtotal,
            shipping: rowShip,
            taxes: rowTax,
            discount_code: '',
            discount_amount: lineDiscount,
            total: rowCartTotal,
            Source: order.source_name || 'API Event',
            'Outstanding Balance': rowBalance,
            transaction_fees: rowFee,
            net_profit: net,
            // EXTENDED ORDER DATA (NON-PII)
            financial_status: order.financial_status || null,
            fulfillment_status: order.fulfillment_status || null,
            cancelled_at: order.cancelled_at || null,
            cancel_reason: order.cancel_reason || null,
            lineitem_compare_at_price: parseFloat(item.compare_at_price) || 0,
            lineitem_fulfillment_status: item.fulfillment_status || null,
            tags: order.tags || null,
            currency: order.currency || null,
            shipping_method: order.shipping_lines && order.shipping_lines.length > 0 ? order.shipping_lines[0].title : null,
            shipping_city: order.shipping_address ? order.shipping_address.city : null,
            shipping_province: order.shipping_address ? order.shipping_address.province : null,
            shipping_zip: order.shipping_address ? order.shipping_address.zip : null,
            shipping_country: order.shipping_address ? order.shipping_address.country : null,
            payment_method: order.payment_gateway_names ? order.payment_gateway_names.join(', ') : null,
            risk_level: null,
            customer_email_hash: piiEmail,
            customer_phone_hash: piiPhone,
            shipping_name_hash: piiShipName,
            shipping_address_hash: piiShipAddr,
            refunded_amount: rowRefundedAmount,
            tracking_number: extData.trackingNumber,
            carrier_name: extData.carrierName,
            actual_shipping_cost: rowActualShippingCost,
            actual_payout: rowPayout,
            linked_order_id: String(order.id),
            transaction_type: tType,
            isFirstRow: index === 0
          });

          invUpdates.push({
            item_key: `RECIPE:::${internalName}`,
            sold_qty_increment: qty // custom DB function needed or read-modify-write
          });
        });
      }

    // 3. Inject to Database (Upsert Logic)
    const { data: existingRecords } = await supabase
      .from('sales_ledger')
      .select('*')
      .eq('order_id', orderIdStr);

    const insertRows: any[] = [];
    const updatePromises: any[] = [];

    ledgerRows.forEach(row => {
      const existing = existingRecords?.find((e: any) => String(e.order_id) === String(row.order_id) && String(e.storefront_sku) === String(row.storefront_sku));
      if (existing && existing.id) {
        
        // Carry forward existing manually injected values that the webhook does not natively receive
        const dbShippingCost = parseFloat(existing.actual_shipping_cost) || 0;
        const dbCogs = parseFloat(existing.cogs_at_sale) || 0;
        
        // Recalculate Net Profit and Actual Payout preserving the database's existing cost data
        const updatedNetProfit = row.subtotal + row.shipping + row.taxes - row.discount_amount - row.transaction_fees - dbShippingCost - row.refunded_amount - dbCogs;
        const updatedPayout = row.total - row.transaction_fees - row.refunded_amount;
        
        row.actual_shipping_cost = dbShippingCost;
        row.cogs_at_sale = dbCogs;
        row.net_profit = updatedNetProfit;
        row.actual_payout = updatedPayout;

        const updatePayload = { ...row };
        delete updatePayload.id;
        delete updatePayload.created_at;
        
        // Prevent wiping fulfillment data if it was already injected
        if (updatePayload.tracking_number === null && existing.tracking_number !== null) delete updatePayload.tracking_number;
        if (updatePayload.carrier_name === null && existing.carrier_name !== null) delete updatePayload.carrier_name;

        updatePromises.push(supabase.from('sales_ledger').update(updatePayload).eq('id', existing.id));
      } else {
        insertRows.push(row);
      }
    });

    // Ghost Row Detection: Identify items physically removed from the order in Shopify
    const existingToCancel = existingRecords?.filter((e: any) => 
      !ledgerRows.some(r => String(r.order_id) === String(e.order_id) && String(r.storefront_sku) === String(e.storefront_sku))
    );

    if (existingToCancel && existingToCancel.length > 0) {
      existingToCancel.forEach((ghost: any) => {
        updatePromises.push(
          supabase.from('sales_ledger')
            .update({ 
              transaction_type: 'Cancelled', 
              net_profit: 0, 
              actual_payout: 0,
              cogs_at_sale: 0,
              actual_shipping_cost: 0
            })
            .eq('id', ghost.id)
        );
      });
    }

    if (insertRows.length > 0) {
      const { error: insertErr } = await supabase.from('sales_ledger').insert(insertRows);
      if (insertErr) {
        console.error("Insert Error", insertErr);
        return new Response(JSON.stringify({ error: insertErr.message }), { status: 500 });
      }
    }

    if (updatePromises.length > 0) {
      const results = await Promise.all(updatePromises);
      const firstError = results.find(r => r.error);
      if (firstError && firstError.error) {
        console.error("Update Error", firstError.error);
        return new Response(JSON.stringify({ error: firstError.error.message }), { status: 500 });
      }
    }
    
    // Await all background storefront alias upserts
    if (aliasUpsertPromises.length > 0) {
        await Promise.all(aliasUpsertPromises).catch(err => {
            console.error("Failed to auto-sync storefront aliases in background:", err);
        });
    }

    // NOTE: Inventory updates via API edge function would require reading current qty and adding to it,
    // or utilizing a Postgres RPC function.

    if (activeEventId) {
        await supabase.from('shopify_webhook_logs').update({ status: 'processed' }).eq('shopify_event_id', activeEventId);
    }

    return new Response(JSON.stringify({ success: true, count: ledgerRows.length }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200
    })

  } catch (err: any) {
    console.error("Webhook Error", err)
    if (activeEventId) {
        const supabase = createClient(supabaseUrl, supabaseKey)
        await supabase.from('shopify_webhook_logs').update({ status: 'failed' }).eq('shopify_event_id', activeEventId);
    }
    return new Response(JSON.stringify({ error: err.message }), { status: 400 })
  }
})
