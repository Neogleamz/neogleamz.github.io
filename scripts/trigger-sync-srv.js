const fs = require('fs');

function getEnv(key) {
    try {
        const envFile = fs.readFileSync('.env.local', 'utf-8');
        const match = envFile.match(new RegExp(`${key}=(.+)`));
        return match ? match[1].trim().replace(/(^["']|["']$)/g, '') : null;
    } catch (e) {
        return null;
    }
}

const supabaseUrl = getEnv('VITE_SUPABASE_URL') || getEnv('SUPABASE_URL');
const serviceRoleKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');

if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing credentials in .env.local');
    process.exit(1);
}

const functionUrl = `${supabaseUrl}/functions/v1/shopify-force-sync`;

async function trigger() {
    console.log('Sending direct HTTP POST request to shopify-force-sync edge function...');
    try {
        const res = await fetch(functionUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': serviceRoleKey,
                'Authorization': `Bearer ${serviceRoleKey}`
            },
            body: JSON.stringify({ sync_catalog: true })
        });
        const text = await res.text();
        console.log('Response Status:', res.status);
        console.log('Response Body:', text);
    } catch (err) {
        console.error('Fetch error:', err);
    }
}

trigger();
