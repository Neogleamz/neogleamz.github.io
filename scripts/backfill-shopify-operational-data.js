const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const crypto = require('crypto');

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

function hashPII(rawStr) {
    if (rawStr === null || rawStr === undefined) return null;
    const str = String(rawStr);
    if (str.trim() === '') return null;
    return crypto.createHash('sha256').update(str.trim().toLowerCase()).digest('hex');
}

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

// Keep the GraphQL query for the exact fees and payouts which REST doesn't provide
async function fetchGraphQLFinancials(shopifyId) {
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
            body: JSON.stringify({ query, variables: { id: `gid://shopify/Order/${shopifyId}` } })
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
        }
        return { fee, payout, trackingNumber, carrierName };
    } catch (e) {
        return { fee: null, payout: null, trackingNumber: null, carrierName: null };
    }
}

// Fetch the full standard payload just like the Webhook uses
async function fetchOrderREST(shopifyId) {
    try {
        const response = await fetch(`https://${SHOPIFY_DOMAIN}/admin/api/2024-01/orders/${shopifyId}.json`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-Shopify-Access-Token': SHOPIFY_TOKEN
            }
        });
        const json = await response.json();
        return json?.order || null;
    } catch (e) {
        console.error('REST Fetch Error:', e);
        return null;
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
    console.log("🚀 Starting Comprehensive Historical Backfill Engine...");
    await getShopifyAccessToken();
    
    // 1. Fetch target orders from local Supabase (Pulling all API/Web orders)
    const { data: orders, error } = await supabase
        .from('sales_ledger')
        .select('id, order_id, Source')
        // Removing filter to ensure EVERYTHING gets updated as requested
        .neq('Source', 'manual');
        
    if (error) {
        console.error("Database fetch failed:", error);
        return;
    }
    
    if (!orders || orders.length === 0) {
        console.log("✅ No matching orders found that need backfilling.");
        return;
    }
    
    console.log(`📦 Found ${orders.length} total orders for synchronization.`);
    
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
        
        console.log(`▶ Fetching multi-API data for order ${orderNameOrId} (Shopify ID: ${shopifyId})...`);
        const gqlData = await fetchGraphQLFinancials(shopifyId);
        const restOrder = await fetchOrderREST(shopifyId);
        
        // 4. Update Supabase
        const updatePayload = {};
        if (gqlData.trackingNumber) updatePayload.tracking_number = gqlData.trackingNumber;
        if (gqlData.carrierName) updatePayload.carrier_name = gqlData.carrierName;
        if (gqlData.payout !== null) updatePayload.actual_payout = gqlData.payout;

        if (restOrder) {
            updatePayload.financial_status = restOrder.financial_status || null;
            updatePayload.fulfillment_status = restOrder.fulfillment_status || null;
            updatePayload.cancelled_at = restOrder.cancelled_at || null;
            updatePayload.cancel_reason = restOrder.cancel_reason || null;
            updatePayload.tags = restOrder.tags || null;
            updatePayload.currency = restOrder.currency || null;
            
            if (restOrder.shipping_lines && restOrder.shipping_lines.length > 0) {
                updatePayload.shipping_method = restOrder.shipping_lines[0].title;
            }
            if (restOrder.shipping_address) {
                updatePayload.shipping_city = restOrder.shipping_address.city;
                updatePayload.shipping_province = restOrder.shipping_address.province;
                updatePayload.shipping_zip = restOrder.shipping_address.zip;
                updatePayload.shipping_country = restOrder.shipping_address.country;
            }
            if (restOrder.payment_gateway_names) {
                updatePayload.payment_method = restOrder.payment_gateway_names.join(', ');
            }

            updatePayload.customer_email_hash = hashPII(restOrder.email);
            updatePayload.customer_phone_hash = hashPII(restOrder.phone || restOrder.customer?.phone);
            updatePayload.shipping_name_hash = hashPII(restOrder.shipping_address?.name);
            updatePayload.shipping_address_hash = hashPII(restOrder.shipping_address?.address1);

            let orderTotalRefunded = parseFloat(restOrder.total_refunded) || 0;
            if (orderTotalRefunded === 0 && restOrder.refunds && restOrder.refunds.length > 0) {
                restOrder.refunds.forEach((r) => {
                    if (r.transactions) {
                        r.transactions.forEach((t) => {
                            if (t.kind === 'refund' && t.status === 'success') {
                                orderTotalRefunded += parseFloat(t.amount || 0);
                            }
                        });
                    }
                });
            }
            updatePayload.refunded_amount = orderTotalRefunded;
        }
        
        if (Object.keys(updatePayload).length > 0) {
            const { error: updateError } = await supabase
                .from('sales_ledger')
                .update(updatePayload)
                .eq('id', row.id);
                
            if (updateError) {
                console.error(`❌ Failed to update ${orderNameOrId}:`, updateError);
            } else {
                console.log(`✅ Updated ${orderNameOrId} with fresh multi-API payload`);
                successCount++;
            }
        }
    }
    
    console.log(`\n🎉 Comprehensive Backfill Complete! Successfully updated ${successCount} out of ${orders.length} orders.`);
}

runBackfill();

