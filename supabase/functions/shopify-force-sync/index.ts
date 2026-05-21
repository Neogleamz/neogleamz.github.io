import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";
import { encode as hexEncode } from "https://deno.land/std@0.168.0/encoding/hex.ts";
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
        const { order_id } = await req.json();
        if (!order_id) throw new Error("Missing order_id");

        const SHOPIFY_CLIENT_ID = Deno.env.get('SHOPIFY_CLIENT_ID');
        const SHOPIFY_CLIENT_SECRET = Deno.env.get('SHOPIFY_CLIENT_SECRET');
        const SHOPIFY_WEBHOOK_SECRET = Deno.env.get('SHOPIFY_WEBHOOK_SECRET');
        const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || Deno.env.get('VITE_SUPABASE_URL');
        const SHOPIFY_DOMAIN = Deno.env.get('SHOPIFY_DOMAIN') || 'neogleamz.myshopify.com';

        if (!SHOPIFY_CLIENT_ID || !SHOPIFY_CLIENT_SECRET || !SHOPIFY_WEBHOOK_SECRET) {
            throw new Error("Missing Shopify credentials in Edge Function environment.");
        }

        console.log(`[FORCE SYNC] Authenticating with Shopify for order_id: ${order_id}`);
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
