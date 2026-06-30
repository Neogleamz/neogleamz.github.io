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

// recipe_item_uuid is a uuid column. Raw items (and any unmapped SKU) legitimately have
// no recipe, so we must store null rather than a product-name string (which would throw
// 22P02 invalid input syntax for type uuid and abort the whole ledger insert).
const isUuid = (s: any) =>
    typeof s === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

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
    const titleMap: Record<string, string> = {}
    if (aliases) {
        aliases.forEach((a: any) => { 
            if (a.product_sku) aliasMap[a.product_sku] = a.recipe_item_uuid;
            if (a.shopify_sku) aliasMap[a.shopify_sku] = a.recipe_item_uuid;
            if (a.barcode_value) aliasMap[a.barcode_value] = a.recipe_item_uuid;
            
            if (a.shopify_sku && a.product_sku) titleMap[a.shopify_sku] = a.product_sku;
            if (a.barcode_value && a.product_sku) titleMap[a.barcode_value] = a.product_sku;
        })
    }

    // 1b. Load recipe + cost data to compute COGS server-side (mirrors browser calculateProductBreakdown)
    const [{ data: allRecipes }, { data: allCosts }] = await Promise.all([
        supabase.from('product_recipes').select('product_item_uuid,components,labor_time_mins,labor_rate_hr'),
        supabase.from('full_landed_costs').select('item_uuid,parcel_no,item_name,neogleamz_name,total_cost_weight,quantity,lot_multiplier')
    ]);

    // uuid → recipe components map
    const recipeByUuid: Record<string, any[]> = {};
    // uuid → labor map
    const laborByUuid: Record<string, { time: number; rate: number }> = {};
    if (allRecipes) {
        allRecipes.forEach((r: any) => {
            recipeByUuid[r.product_item_uuid] = r.components || [];
            laborByUuid[r.product_item_uuid] = { time: parseFloat(r.labor_time_mins) || 0, rate: parseFloat(r.labor_rate_hr) || 0 };
        });
    }

    // Build uuid -> name mapping for sub-assemblies (stored in full_landed_costs with parcel_no = 'RECIPE_AUTO')
    const subassemblyUuidMap: Record<string, string> = {};
    if (allCosts) {
        allCosts.forEach((c: any) => {
            if (c.parcel_no === 'RECIPE_AUTO' || c.parcel_no === 'ORPHAN_PARCEL') {
                const name = c.item_name || c.neogleamz_name;
                if (name) subassemblyUuidMap[name] = c.item_uuid;
            }
        });
    }

    // item_uuid → average unit cost map (weighted average across all purchase batches)
    const avgCostByUuid: Record<string, number> = {};
    if (allCosts) {
        const totals: Record<string, { sumCost: number; sumQty: number }> = {};
        allCosts.forEach((c: any) => {
            if (!c.item_uuid || c.parcel_no === 'RECIPE_AUTO' || c.parcel_no === 'ORPHAN_PARCEL') return;
            const qty = (parseFloat(c.quantity) || 1) * (parseFloat(c.lot_multiplier) || 1);
            const totalCost = parseFloat(c.total_cost_weight) || 0;
            if (!totals[c.item_uuid]) totals[c.item_uuid] = { sumCost: 0, sumQty: 0 };
            totals[c.item_uuid].sumCost += totalCost;
            totals[c.item_uuid].sumQty += qty;
        });
        Object.entries(totals).forEach(([uuid, t]) => {
            avgCostByUuid[uuid] = t.sumQty > 0 ? (t.sumCost / t.sumQty) : 0;
        });
    }

    // Recursive COGS resolver — mirrors window.calculateProductBreakdown
    const computeCogs = (recipeUuid: string, visited = new Set<string>()): number => {
        if (!recipeUuid || visited.has(recipeUuid)) return 0;
        const branch = new Set(visited);
        branch.add(recipeUuid);

        const components = recipeByUuid[recipeUuid] || [];
        let raw = 0;
        components.forEach((comp: any) => {
            const qty = parseFloat(comp.quantity || comp.qty) || 1;
            if (comp.item_key && comp.item_key.startsWith('RECIPE:::')) {
                // Sub-assembly
                const subName = comp.item_key.replace('RECIPE:::', '');
                const subUuid = comp.item_uuid || subassemblyUuidMap[subName] || aliases?.find((a: any) => 
                    a.product_sku === subName || a.product_sku === `RECIPE:::${subName}`
                )?.recipe_item_uuid;
                if (subUuid) {
                    raw += computeCogs(subUuid, branch) * qty;
                }
            } else if (comp.item_uuid && avgCostByUuid[comp.item_uuid]) {
                // Raw material
                raw += avgCostByUuid[comp.item_uuid] * qty;
            }
        });

        const labor = laborByUuid[recipeUuid]
            ? (laborByUuid[recipeUuid].time / 60) * laborByUuid[recipeUuid].rate
            : 0;

        return raw + labor;
    };


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

      // Pre-calculate refunded quantities by line_item_id
      const refundedLineItems: Record<string, number> = {};
      if (order.refunds) {
          order.refunds.forEach((r: any) => {
              if (r.refund_line_items) {
                  r.refund_line_items.forEach((ri: any) => {
                      const liId = String(ri.line_item_id);
                      refundedLineItems[liId] = (refundedLineItems[liId] || 0) + (parseInt(ri.quantity) || 0);
                  });
              }
          });
      }

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

      let orderLevelAssigned = false; // Ensure order-level fees go to the first ACTIVE row only

      if(order.line_items) {
        order.line_items.forEach((item: any, _index: any) => {
          const skuName = titleMap[item.sku] || titleMap[item.name] || titleMap[item.title] || item.title || item.name || item.sku;
          const qty = parseInt(item.quantity) || 1;
          const price = parseFloat(item.price) || 0;

          const lineItemId = String(item.id);
          const refundedQty = refundedLineItems[lineItemId] || 0;
          const netQty = Math.max(0, qty - refundedQty);
          // isReturned = this line item was fully returned/refunded (no net units remain)
          // qty_sold stays as the original qty (1) — the TYPE label explains the situation
          const isReturned = netQty === 0 && qty > 0;
          // isFirstActiveRow = the first non-returned item, which receives all order-level aggregates
          const isFirstActiveRow = !isReturned && !orderLevelAssigned;
          if (isFirstActiveRow) orderLevelAssigned = true;
          
          // Map to internal recipe name by checking SKU first, then full item name, then product title
          const internalName = aliasMap[item.sku] || aliasMap[skuName] || aliasMap[item.name] || aliasMap[item.title] || item.name || item.title;
          console.log(` -> Mapping SKU: [${skuName}] to Internal Recipe: [${internalName}]`);

          // Auto-upsert/register storefront alias mapping using official variant SKU
          if (item.sku) {
              const cleanItemSku = String(item.sku).trim();
              const targetSku = cleanItemSku;
              
              const itemTitle = (item.title === 'Default Title' || item.name.includes(item.title)) ? '' : ` - ${item.title}`;
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

          // Sum accurate discount allocations — only for active (non-returned) items
          let lineDiscount = 0;
          if (!isReturned && item.discount_allocations && item.discount_allocations.length > 0) {
            lineDiscount = item.discount_allocations.reduce((sum: any, d: any) => sum + parseFloat(d.amount || 0), 0);
          }

          // Order-level aggregates (fees, shipping, refunded amount) only go to the FIRST ACTIVE row.
          // Returned rows are purely informational — they carry no financial impact.
          const rowShip = isFirstActiveRow ? ship : 0;
          const rowTax = isFirstActiveRow ? tax : 0;
          const rowFee = isFirstActiveRow ? trueFee : 0;
          const rowBalance = isFirstActiveRow ? balance : 0;
          const rowCartTotal = isFirstActiveRow ? tot : 0;
          const rowPayout = isFirstActiveRow ? truePayout : 0;
          const rowActualShippingCost = isFirstActiveRow ? extData.shippingCost : 0;

          // Returned rows: subtotal = 0 (no revenue captured, item came back)
          // Active rows: subtotal = price * qty
          const subtotal = isReturned ? 0 : price * qty;

          // refunded_amount is stored on returned rows for reference but NOT deducted from net profit.
          // The returned row's subtotal=0 already accounts for the revenue reversal.
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
          const rowRefundedAmount = isReturned ? orderTotalRefunded : 0;
          
          // Deduce Transaction Type Native Match
          let itemFulfill = String(item.fulfillment_status || "pending").trim().toLowerCase();
          if (itemFulfill === 'null' || itemFulfill === '') itemFulfill = 'pending';
          const fStat = String(order.financial_status || "").trim().toLowerCase();
          
          let tType = 'Standard';
          if (isReturned) {
              // Derive the refund label from the order tag to reflect why it was returned,
              // not just that it was restocked (it may have been defective, exchanged, etc.)
              if (tagTransactionType) {
                  tType = `Refunded - ${tagTransactionType}`;
              } else {
                  tType = 'Refunded - Restocked';
              }
          } else {
              if (tot === 0 && fStat !== 'refunded') {
                  tType = 'NEEDS ATTENTION';
              } else if (itemFulfill === 'pending' || itemFulfill === 'unfulfilled') {
                  // A paid, not-yet-shipped order is a normal pending sale -> stays 'Standard'.
                  // Genuine exchanges/warranties are set via the Shopify "Type:" tag override below.
                  if (fStat === 'refunded' || fStat === 'partially_refunded') tType = 'Cancelled';
              } else if (fStat === 'refunded' || fStat === 'partially_refunded') {
                  tType = 'Refund';
              }

              // Override deduction with Explicit Tag if present
              if (tagTransactionType) {
                  tType = tagTransactionType;
              }
          }

          const recipeUuidForRow = isUuid(internalName) ? internalName : null;
          const cogsAtSale = recipeUuidForRow ? computeCogs(recipeUuidForRow) * qty : 0;

          // Returned rows: net = -(cogs_at_sale) - (actual_shipping_cost) i.e. the true cost of the warranty/return.
          // Active rows: net = subtotal + order-level aggregates - fees - label cost - cogs
          const net = isReturned
              ? -(cogsAtSale) - rowActualShippingCost
              : (subtotal + rowShip + rowTax - lineDiscount - rowFee - rowActualShippingCost - cogsAtSale);

          ledgerRows.push({
            order_id: orderIdStr,
            line_item_id: lineItemId,
            sale_date: dateStr,
            storefront_sku: skuName,
            recipe_item_uuid: recipeUuidForRow,
            qty_sold: qty,
            actual_sale_price: price,
            cogs_at_sale: cogsAtSale,
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
            isFirstRow: isFirstActiveRow
          });

          invUpdates.push({
            item_key: `RECIPE:::${internalName}`,
            sold_qty_increment: netQty
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
      const existing = existingRecords?.find((e: any) => 
        String(e.order_id) === String(row.order_id) && 
        (e.line_item_id ? String(e.line_item_id) === String(row.line_item_id) : String(e.storefront_sku) === String(row.storefront_sku))
      );
      if (existing && existing.id) {
        
        // Carry forward existing manually injected values that the webhook does not natively receive.
        // If cogs_at_sale is currently 0 in the DB, adopt the newly computed COGS from the webhook.
        const dbShippingCost = parseFloat(existing.actual_shipping_cost) || 0;
        const dbCogs = parseFloat(existing.cogs_at_sale) || row.cogs_at_sale || 0;
        
        // Recalculate Net Profit and Actual Payout preserving the database's existing cost data.
        // For returned rows: net = -(cogs) - (return label cost), reflecting the true cost of the warranty/return.
        // For active rows: standard formula including all order-level aggregates.
        const isReturnedRow = String(existing.transaction_type || '').startsWith('Refunded -');
        const updatedNetProfit = isReturnedRow
            ? -(dbCogs) - (dbShippingCost)
            : row.subtotal + row.shipping + row.taxes - row.discount_amount - row.transaction_fees - dbShippingCost - dbCogs;
        const updatedPayout = isReturnedRow ? 0 : (row.total - row.transaction_fees);
        
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

        // Preserve manually-set transaction_type — if the user has already labeled this row
        // (e.g. 'Warranty', 'Post-ship exchange') directly in Orderz, never overwrite it via webhook replay.
        if (existing.transaction_type && existing.transaction_type !== 'Standard' && existing.transaction_type !== 'Refunded - Restocked') {
            delete updatePayload.transaction_type;
        }

        updatePromises.push(supabase.from('sales_ledger').update(updatePayload).eq('id', existing.id));
      } else {
        insertRows.push(row);
      }
    });

    // Ghost Row Detection: Identify items physically removed from the order in Shopify
    const existingToCancel = existingRecords?.filter((e: any) => 
      !ledgerRows.some(r => 
        String(r.order_id) === String(e.order_id) && 
        (e.line_item_id ? String(r.line_item_id) === String(e.line_item_id) : String(r.storefront_sku) === String(e.storefront_sku))
      )
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
        // Mark the log as failed (not left stranded at 'pending') so the failure is visible.
        if (activeEventId) await supabase.from('shopify_webhook_logs').update({ status: 'failed' }).eq('shopify_event_id', activeEventId);
        return new Response(JSON.stringify({ error: insertErr.message }), { status: 500 });
      }
    }

    if (updatePromises.length > 0) {
      const results = await Promise.all(updatePromises);
      const firstError = results.find(r => r.error);
      if (firstError && firstError.error) {
        console.error("Update Error", firstError.error);
        // Mark the log as failed (not left stranded at 'pending') so the failure is visible.
        if (activeEventId) await supabase.from('shopify_webhook_logs').update({ status: 'failed' }).eq('shopify_event_id', activeEventId);
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
