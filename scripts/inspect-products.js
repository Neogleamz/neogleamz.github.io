const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

function getEnv(key) {
    try {
        const envFile = fs.readFileSync('.env.local', 'utf-8');
        const match = envFile.match(new RegExp(`${key}=(.+)`));
        return match ? match[1].trim() : null;
    } catch (e) {
        return null;
    }
}

const supabaseUrl = getEnv('VITE_SUPABASE_URL') || getEnv('SUPABASE_URL');
const supabaseKey = getEnv('VITE_SUPABASE_ANON_KEY') || getEnv('SUPABASE_ANON_KEY') || getEnv('SUPABASE_SERVICE_ROLE_KEY');

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkProducts() {
    const { data, error } = await supabase
        .from('product_recipes')
        .select('*');
        
    if (error) {
        console.error('Error fetching products:', error);
    } else {
        console.log('Products in database:', data.map(p => p.product_name));
    }
}

checkProducts();
