const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

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

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function triggerSync() {
    console.log(`Invoking shopify-force-sync via Supabase Client...`);
    try {
        const { data, error } = await supabase.functions.invoke('shopify-force-sync', {
            body: { sync_catalog: true }
        });
        
        if (error) {
            console.error('Invocation error:', error);
        } else {
            console.log('Invocation success:', data);
        }
    } catch (err) {
        console.error('Client error:', err);
    }
}

triggerSync();
