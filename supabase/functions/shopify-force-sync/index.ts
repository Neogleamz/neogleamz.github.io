import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function generateHmac(bodyStr: string, secret: string) {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );
    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(bodyStr));
    return base64Encode(new Uint8Array(signature));
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const body = await req.json().catch(() => ({}));
        const { order_id, sync_catalog } = body;

        const SHOPIFY_CLIENT_ID = Deno.env.get('SHOPIFY_CLIENT_ID');
        const SHOPIFY_CLIENT_SECRET = Deno.env.get('SHOPIFY_CLIENT_SECRET');
        const SHOPIFY_WEBHOOK_SECRET = Deno.env.get('SHOPIFY_WEBHOOK_SECRET');
        const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || Deno.env.get('VITE_SUPABASE_URL');
        const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        const SHOPIFY_DOMAIN = Deno.env.get('SHOPIFY_DOMAIN') || 'neogleamz.myshopify.com';

        if (!SHOPIFY_CLIENT_ID || !SHOPIFY_CLIENT_SECRET) {
            throw new Error("Missing Shopify credentials in Edge Function environment.");
        }

        // Authenticate with Shopify
        console.log(`[SHOPIFY SYNC] Authenticating with Shopify...`);
        const authRes = await fetch(`https://${SHOPIFY_DOMAIN}/admin/oauth/access_token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                client_id: SHOPIFY_CLIENT_ID,
                client_secret: SHOPIFY_CLIENT_SECRET,
                grant_type: 'client_credentials'
            })
        });
        
        const authData = await authRes.json();
        if (!authData.access_token) {
            throw new Error("Failed to generate Shopify access token.");
        }

        const token = authData.access_token;

        if (sync_catalog) {
            // Pull all variants/products from Shopify catalog and upsert into storefront_aliases
            if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
                throw new Error("Missing Supabase credentials in Edge Function environment.");
            }
            const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
            
            // Fetch all existing storefront_aliases to preserve manual/previously defined mappings
            const { data: existingAliases } = await supabase
                .from('storefront_aliases')
                .select('product_sku, recipe_item_uuid, is_primary');
            
            const existingMap = new Map();
            if (existingAliases) {
                existingAliases.forEach((row: any) => {
                    existingMap.set(row.product_sku, {
                        recipe_item_uuid: row.recipe_item_uuid,
                        is_primary: !!row.is_primary
                    });
                });
            }

            let importedCount = 0;
            let matchedCount = 0;
            let nextPageUrl = `https://${SHOPIFY_DOMAIN}/admin/api/2024-01/products.json?limit=250`;
            let pageCount = 0;

            while (nextPageUrl && pageCount < 10) {
                console.log(`[SHOPIFY CATALOG SYNC] Fetching: ${nextPageUrl}`);
                const productsRes = await fetch(nextPageUrl, {
                    headers: { 'X-Shopify-Access-Token': token }
                });
                if (!productsRes.ok) {
                    throw new Error(`Failed to fetch products from Shopify: ${productsRes.statusText}`);
                }
                const productsData = await productsRes.json();
                const products = productsData.products || [];
                
                const upsertRows: any[] = [];
                
                for (const product of products) {
                    for (const variant of (product.variants || [])) {
                        const sku = (variant.sku || "").trim();
                        const barcode = String(variant.barcode || "").trim();
                        
                        if (sku) {
                            const variantTitle = (variant.title && variant.title !== "Default Title") ? ` - ${variant.title}` : "";
                            const fullTitle = `${product.title}${variantTitle}`.trim();
                            
                            const existingSkuEntry = existingMap.get(sku);
                            const existingTitleEntry = fullTitle ? existingMap.get(fullTitle) : null;
                            let existingRecipe = (existingSkuEntry && existingSkuEntry.recipe_item_uuid)
                                || (existingTitleEntry && existingTitleEntry.recipe_item_uuid)
                                || null;
                            const existingPrimary = (existingSkuEntry && existingSkuEntry.is_primary)
                                || (existingTitleEntry && existingTitleEntry.is_primary)
                                || false;

                            const targetSku = sku;
                            upsertRows.push({
                                product_sku: fullTitle || targetSku,
                                recipe_item_uuid: existingRecipe,
                                barcode_value: barcode || null,
                                is_shopify_synced: true,
                                platform: 'Shopify Webhook', // Match standard webhook platform value
                                is_primary: existingPrimary, // Preserve primary state
                                shopify_sku: sku
                            });
                            
                            importedCount++;
                            if (existingRecipe) matchedCount++;
                        }
                    }
                }
                
                if (upsertRows.length > 0) {
                    const { error: upsertErr } = await supabase
                        .from('storefront_aliases')
                        .upsert(upsertRows, { onConflict: 'shopify_sku' });
                    if (upsertErr) throw upsertErr;
                }
                
                // Pagination Link Header parsing
                const linkHeader = productsRes.headers.get('Link');
                nextPageUrl = "";
                if (linkHeader) {
                    const nextMatch = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
                    if (nextMatch && nextMatch[1]) {
                        nextPageUrl = nextMatch[1];
                    }
                }
                pageCount++;
            }

            return new Response(JSON.stringify({ 
                success: true, 
                message: `Successfully synced Shopify catalog.`, 
                importedCount, 
                matchedCount 
            }), { 
                status: 200, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            });
        }

        // Default: sync specific order
        if (!order_id) throw new Error("Missing order_id or sync_catalog parameter.");
        if (!SHOPIFY_WEBHOOK_SECRET) {
            throw new Error("Missing SHOPIFY_WEBHOOK_SECRET in Edge Function environment.");
        }

        console.log(`[FORCE SYNC] Fetching ID for order: #${order_id.replace('#', '')}`);
        const cleanOrderId = order_id.toString().replace('#', '');
        const listRes = await fetch(`https://${SHOPIFY_DOMAIN}/admin/api/2024-01/orders.json?status=any&name=${cleanOrderId}`, {
            headers: { 'X-Shopify-Access-Token': token }
        });
        const listData = await listRes.json();
        
        if (!listData.orders || listData.orders.length === 0) {
            return new Response(JSON.stringify({ error: `Order #${cleanOrderId} not found in Shopify.` }), { status: 404, headers: corsHeaders });
        }

        const internalOrderId = listData.orders[0].id;
        
        console.log(`[FORCE SYNC] Fetching payload for internal ID: ${internalOrderId}`);
        const orderRes = await fetch(`https://${SHOPIFY_DOMAIN}/admin/api/2024-01/orders/${internalOrderId}.json`, {
            headers: { 'X-Shopify-Access-Token': token }
        });
        const orderData = await orderRes.json();
        const rawPayload = JSON.stringify(orderData.order);

        console.log(`[FORCE SYNC] Generating HMAC signature...`);
        const hmac = await generateHmac(rawPayload, SHOPIFY_WEBHOOK_SECRET);

        console.log(`[FORCE SYNC] Proxying payload to native shopify-webhook Edge Function...`);
        const webhookUrl = `${SUPABASE_URL}/functions/v1/shopify-webhook`;
        
        const proxyRes = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-shopify-topic': 'orders/create',
                'x-shopify-hmac-sha256': hmac
            },
            body: rawPayload
        });

        const proxyText = await proxyRes.text();
        
        if (!proxyRes.ok) {
            throw new Error(`Webhook engine rejected payload: HTTP ${proxyRes.status} - ${proxyText}`);
        }

        console.log(`[FORCE SYNC] Success: ${proxyText}`);
        return new Response(JSON.stringify({ success: true, message: `Successfully synced order #${cleanOrderId}`, details: proxyText }), { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });

    } catch (err: any) {
        console.error("[FORCE SYNC ERROR]", err);
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
    }
});
