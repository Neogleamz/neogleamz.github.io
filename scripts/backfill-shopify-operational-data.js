const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Try to parse .env.local automatically
try {
    const envFile = fs.readFileSync('.env.local', 'utf8');
    envFile.split('\n').forEach(line => {
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (match) process.env[match[1]] = match[2].replace(/(^['"]|['"]$)/g, '').trim();
    });
} catch(e) { /* skip if missing */ }

// We expect these in environment, or prompt user to supply them.
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SHOPIFY_CLIENT_ID = process.env.SHOPIFY_CLIENT_ID;
const SHOPIFY_CLIENT_SECRET = process.env.SHOPIFY_CLIENT_SECRET;
const SHOPIFY_DOMAIN = process.env.SHOPIFY_DOMAIN || 'neogleamz.myshopify.com';

if (!SUPABASE_URL || !SUPABASE_KEY || !SHOPIFY_CLIENT_ID || !SHOPIFY_CLIENT_SECRET) {
    console.error("❌ Missing required environment variables! Please provide SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SHOPIFY_CLIENT_ID, and SHOPIFY_CLIENT_SECRET in .env.local");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

let SHOPIFY_TOKEN = null;

async function getShopifyAccessToken() {
    console.log("🔐 Generating secure access token via Client Credentials...");
    const response = await fetch(`https://${SHOPIFY_DOMAIN}/admin/oauth/access_token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            client_id: SHOPIFY_CLIENT_ID,
            client_secret: SHOPIFY_CLIENT_SECRET,
            grant_type: 'client_credentials'
        })
    });
    
    const data = await response.json();
    if (data.access_token) {
        SHOPIFY_TOKEN = data.access_token;
        console.log("✅ Token generated successfully.");
    } else {
        console.error("❌ Failed to generate access token:", data);
        process.exit(1);
    }
}

async function fetchExtendedOrderData(orderId) {
    // The Shopify orderId might be the numeric string or the gid
    // Let's ensure it's a gid format for GraphQL
    let gid = orderId.toString();
    if (!gid.startsWith('gid://shopify/Order/')) {
        // If order_id is just a numeric string or order name, we have to find it.
        // Wait, the sales_ledger 'order_id' is actually the order name (e.g. #1007) or numeric ID.
        // Let's assume it's the numeric ID if we just pull orders from Shopify.
    }

    const query = `
    query getOrderDetails($id: ID!) {
      order(id: $id) {
        id
        fulfillments {
          trackingInfo {
            company
            number
          }
        }
        transactions {
          kind
          status
          amountSet {
            shopMoney {
              amount
            }
          }
          fees {
            amount {
              amount
            }
          }
        }
      }
    }`;

    try {
        const response = await fetch(`https://${SHOPIFY_DOMAIN}/admin/api/2024-01/graphql.json`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Shopify-Access-Token': SHOPIFY_TOKEN
            },
            body: JSON.stringify({ query, variables: { id: `gid://shopify/Order/${orderId}` } })
        });

        const json = await response.json();
        let fee = null, payout = null, trackingNumber = null, carrierName = null;

        if (json?.data?.order) {
            const order = json.data.order;
            if (order.fulfillments && order.fulfillments.length > 0) {
                const info = order.fulfillments[0].trackingInfo;
                if (info && info.length > 0) { 
                    trackingNumber = info[0].number; 
                    carrierName = info[0].company; 
                }
            }
            if (order.transactions) {
                const saleTx = order.transactions.find(tx => (tx.kind === 'SALE' || tx.kind === 'CAPTURE') && tx.status === 'SUCCESS');
                if (saleTx) {
                    const amount = parseFloat(saleTx.amountSet?.shopMoney?.amount || 0);
                    let totalFees = 0;
                    if (saleTx.fees) {
                        totalFees = saleTx.fees.reduce((sum, f) => sum + parseFloat(f.amount?.amount || 0), 0);
                    }
                    fee = totalFees; 
                    payout = amount - totalFees;
                }
            }
        } else {
             // Maybe search by name if numeric ID fails
             console.log(`Order not found by ID: ${orderId}`);
        }
        
        return { fee, payout, trackingNumber, carrierName };
    } catch (e) {
        console.error('GraphQL Fetch Error:', e);
        return { fee: null, payout: null, trackingNumber: null, carrierName: null };
    }
}

// Function to fetch Shopify orders via REST to get ID mapping since sales_ledger might use order name (#1007)
async function getShopifyOrderMap() {
    let url = `https://${SHOPIFY_DOMAIN}/admin/api/2024-01/orders.json?status=any&limit=250`;
    let map = {};
    
    while(url) {
        const res = await fetch(url, {
            headers: { 'X-Shopify-Access-Token': SHOPIFY_TOKEN }
        });
        const json = await res.json();
        if(json.orders) {
            json.orders.forEach(o => {
                map[o.name] = o.id; // #1007 -> 1234567890
                map[o.id.toString()] = o.id;
            });
        } else {
            console.error("❌ Shopify API Error:", json);
        }
        
        // Pagination logic would go here if > 250 orders, simplified for backfill
        url = null; 
    }
    return map;
}

async function runBackfill() {
    console.log("🚀 Starting Historical Backfill Engine...");
    await getShopifyAccessToken();
    
    // 1. Fetch target orders from local Supabase
    const { data: orders, error } = await supabase
        .from('sales_ledger')
        .select('id, order_id, Source')
        .eq('Source', 'web')
        .eq('actual_payout', 0);
        
    if (error) {
        console.error("Database fetch failed:", error);
        return;
    }
    
    if (!orders || orders.length === 0) {
        console.log("✅ No matching 'web' orders found that need backfilling.");
        return;
    }
    
    console.log(`📦 Found ${orders.length} orders requiring operational data true-up.`);
    
    // 2. Build mapping
    const shopifyMap = await getShopifyOrderMap();
    
    let successCount = 0;
    
    // 3. Process each order
    for (const row of orders) {
        const orderNameOrId = row.order_id;
        const shopifyId = shopifyMap[orderNameOrId];
        
        if (!shopifyId) {
            console.log(`⚠️ Warning: Could not resolve Shopify ID for ${orderNameOrId}`);
            continue;
        }
        
        console.log(`▶ Fetching data for order ${orderNameOrId} (Shopify ID: ${shopifyId})...`);
        const data = await fetchExtendedOrderData(shopifyId);
        
        // 4. Update Supabase
        const updatePayload = {};
        if (data.trackingNumber) updatePayload.tracking_number = data.trackingNumber;
        if (data.carrierName) updatePayload.carrier_name = data.carrierName;
        if (data.payout !== null) updatePayload.actual_payout = data.payout;
        // if (data.fee !== null) // we don't have an actual_fee column, fee is calculated or ignored if we use payout
        
        if (Object.keys(updatePayload).length > 0) {
            const { error: updateError } = await supabase
                .from('sales_ledger')
                .update(updatePayload)
                .eq('id', row.id);
                
            if (updateError) {
                console.error(`❌ Failed to update ${orderNameOrId}:`, updateError);
            } else {
                console.log(`✅ Updated ${orderNameOrId}: ${JSON.stringify(updatePayload)}`);
                successCount++;
            }
        }
    }
    
    console.log(`\n🎉 Backfill Complete! Successfully updated ${successCount} out of ${orders.length} target orders.`);
}

runBackfill();
