const fs = require('fs');
let content = fs.readFileSync('tools/SK8Lytz_App_Master_Reference.md', 'utf8');

const regex = /### A\. Active Shopify Webhook Infrastructure[\s\S]*?\*\*Required Shopify Admin Configuration:\*\*/;

const replacementStr = `### A. Active Shopify Webhook Infrastructure (\`shopify-webhook\`)
The \`shopify-webhook\` Edge Function natively processes inbound JSON payloads directly from Shopify. Because Shopify requires OAuth Dev Apps for historical API pulls, this application relies **strictly** on live Webhook pushes for operational data.

**CRITICAL DEPLOYMENT FLAG:** The \`shopify-webhook\` Edge Function MUST be deployed with the \`--no-verify-jwt\` flag (\`npx supabase functions deploy shopify-webhook --no-verify-jwt\`). If deployed with default JWT verification, Supabase will reject Shopify's HMAC payloads with a 401 Unauthorized error before they reach the parser.

### B. Force Sync Proxy Architecture (\`shopify-force-sync\`)
To gracefully handle dropped webhooks without requiring terminal scripts or sacrificing native deduplication logic, the system utilizes a \`shopify-force-sync\` Edge Function.
* **Security:** Deployed with standard JWT verification. Can only be invoked securely from the frontend authenticated UI.
* **Architecture:** It utilizes the \`SHOPIFY_CLIENT_ID\` and \`SHOPIFY_CLIENT_SECRET\` secrets to query the Shopify REST API for a specific Order ID.
* **Data Parity:** Instead of duplicating complex parsing logic, it cryptographically signs the fetched JSON payload and *proxies* it locally via POST request directly to the \`shopify-webhook\` endpoint. This guarantees 100% data parity and leverages existing idempotency locks.

**Required Shopify Admin Configuration:**`;

if(regex.test(content)) {
    content = content.replace(regex, replacementStr);
    fs.writeFileSync('tools/SK8Lytz_App_Master_Reference.md', content);
    console.log("Success");
} else {
    console.log("Could not find target string.");
}
