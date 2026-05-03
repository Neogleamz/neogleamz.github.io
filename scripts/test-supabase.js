const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// Helper to read from .env.local without external dependencies
function getEnv(key) {
    try {
        const envFile = fs.readFileSync('.env.local', 'utf-8');
        const match = envFile.match(new RegExp(`${key}=(.+)`));
        return match ? match[1].trim() : null;
    } catch (e) {
        console.error('Error reading .env.local:', e.message);
        return null;
    }
}

const supabaseUrl = getEnv('VITE_SUPABASE_URL');
const supabaseKey = getEnv('VITE_SUPABASE_ANON_KEY');

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
    console.log('Testing connection...');
    const { data: selectData, error: selectError } = await supabase.from('teams').select('*');
    console.log('Select Result:', selectData, selectError);
    
    // Cleanup the test team if it exists
    const { data: insertData, error: insertError } = await supabase.from('teams').insert([{ name: 'Test Team (Orphan Cleanup)' }]).select();
    console.log('Insert Result:', insertData, insertError);
}

test();
