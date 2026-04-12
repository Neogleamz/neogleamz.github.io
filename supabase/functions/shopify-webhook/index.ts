// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

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
async function verifyShopifyWebhook(rawBody: string, hmacHeader: string, secret: string) {
    if (!secret || !hmacHeader) return false;
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign', 'verify']
    );
    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(rawBody));
    const base64Signature = btoa(String.fromCharCode(...new Uint8Array(signature)));
    return base64Signature === hmacHeader;
}

serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const hmacHeader = req.headers.get('x-shopify-hmac-sha256');
  const shopifySecret = Deno.env.get('SHOPIFY_WEBHOOK_SECRET');
  
  try {
    const rawBody = await req.text()

    if (!hmacHeader || !await verifyShopifyWebhook(rawBody, hmacHeader, shopifySecret || '')) {
        console.error("HMAC Verification Failed! Unauthorized access attempt.");
        return new Response('Unauthorized', { status: 401 });
    }

    const order = JSON.parse(rawBody)

    // Initialize Supabase Admin Client
    const supabase = createClient(supabaseUrl, supabaseKey)

    // 1. Fetch alias mapping to convert Shopify SKUs to Internal Recipes
    const { data: aliases } = await supabase.from('storefront_aliases').select('*')
    const aliasMap: Record<string, string> = {}
    if (aliases) {
        aliases.forEach((a: any) => { aliasMap[a.storefront_sku] = a.internal_recipe_name })
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

      const orderIdStr = order.name || String(order.id); // Define orderIdStr here

      const piiEmail = await hashPII(order.email);
      const piiPhone = await hashPII(order.phone || order.customer?.phone);
      const piiShipName = await hashPII(order.shipping_address?.name);
      const piiShipAddr = await hashPII(order.shipping_address?.address1);

      if(order.line_items) {
        order.line_items.forEach((item: any, index: any) => {
          const skuName = item.name || item.title;
          const qty = parseInt(item.quantity) || 1;
          const price = parseFloat(item.price) || 0;
          const internalName = aliasMap[skuName] || skuName;
          console.log(` -> Mapping SKU: [${skuName}] to Internal Recipe: [${internalName}]`);

          // Sum accurate discount allocations for this specific line item to avoid cart-level double-counting
          let lineDiscount = 0;
          if (item.discount_allocations && item.discount_allocations.length > 0) {
            lineDiscount = item.discount_allocations.reduce((sum: any, d: any) => sum + parseFloat(d.amount || 0), 0);
          }

          // Segregate specific order-level aggregate fees/shipping only onto the FIRST row to perfectly replicate CSV behavior
          const rowShip = index === 0 ? ship : 0;
          const rowTax = index === 0 ? tax : 0;
          const rowFee = index === 0 ? fee : 0;
          const rowBalance = index === 0 ? balance : 0;
          const rowCartTotal = index === 0 ? tot : 0;

          // Accurately calculate True Net Profit for this specific loop matrix
          const subtotal = price * qty;
          const net = subtotal + rowShip + rowTax - lineDiscount - rowFee;

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
            refunded_amount: 0
          });

          invUpdates.push({
            item_key: `RECIPE:::${internalName}`,
            sold_qty_increment: qty // custom DB function needed or read-modify-write
          });
        });
      }

    // 3. Inject to Database
    const { error: insertErr } = await supabase.from('sales_ledger').insert(ledgerRows)
    if (insertErr) {
        console.error("Insert Error", insertErr)
        return new Response(JSON.stringify({ error: insertErr.message }), { status: 500 })
    }

    // NOTE: Inventory updates via API edge function would require reading current qty and adding to it,
    // or utilizing a Postgres RPC function.

    return new Response(JSON.stringify({ success: true, count: ledgerRows.length }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200
    })

  } catch (err: any) {
    console.error("Webhook Error", err)
    return new Response(JSON.stringify({ error: err.message }), { status: 400 })
  }
})
