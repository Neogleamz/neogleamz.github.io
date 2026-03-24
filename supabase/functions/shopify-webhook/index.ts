import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  // TODO: Add proper HMAC verification using Deno Crypto API Web Crypto
  // const hmac = req.headers.get('x-shopify-hmac-sha256')
  
  try {
    const rawBody = await req.text()
    const order = JSON.parse(rawBody)

    // Initialize Supabase Admin Client
    const supabase = createClient(supabaseUrl, supabaseKey)

    // 1. Fetch alias mapping to convert Shopify SKUs to Internal Recipes
    const { data: aliases } = await supabase.from('storefront_aliases').select('*')
    const aliasMap = {}
    if (aliases) {
        aliases.forEach((a: any) => { aliasMap[a.storefront_sku] = a.internal_recipe_name })
    }

    // 2. Map Shopify Data to Neogleamz `sales_ledger` format
      let dateStr = order.created_at ? order.created_at.split('T')[0] : new Date().toISOString().split('T')[0];
      
      // Order level aggregations
      let ship = parseFloat(order.total_shipping_price_set?.shop_money?.amount || 0);
      let tax = parseFloat(order.total_tax) || 0;
      let tot = parseFloat(order.total_price) || 0;
      let balance = parseFloat(order.total_outstanding) || 0;
      let fee = (tot * 0.029) + 0.30; // Stripe/Shopify Payments Processing Rate

      let ledgerRows: any[] = [];
      let invUpdates: any[] = []; // Initialize invUpdates here

      let orderIdStr = order.name || String(order.id); // Define orderIdStr here

      if(order.line_items) {
        order.line_items.forEach((item, index) => {
          let skuName = item.name || item.title;
          let qty = parseInt(item.quantity) || 1;
          let price = parseFloat(item.price) || 0;
          let internalName = aliasMap[skuName] || skuName;
          console.log(` -> Mapping SKU: [${skuName}] to Internal Recipe: [${internalName}]`);

          // Sum accurate discount allocations for this specific line item to avoid cart-level double-counting
          let lineDiscount = 0;
          if (item.discount_allocations && item.discount_allocations.length > 0) {
            lineDiscount = item.discount_allocations.reduce((sum, d) => sum + parseFloat(d.amount || 0), 0);
          }

          // Segregate specific order-level aggregate fees/shipping only onto the FIRST row to perfectly replicate CSV behavior
          let rowShip = index === 0 ? ship : 0;
          let rowTax = index === 0 ? tax : 0;
          let rowFee = index === 0 ? fee : 0;
          let rowBalance = index === 0 ? balance : 0;
          let rowCartTotal = index === 0 ? tot : 0;

          // Accurately calculate True Net Profit for this specific loop matrix
          let subtotal = price * qty;
          let net = subtotal + rowShip + rowTax - lineDiscount - rowFee;

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
            net_profit: net
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
