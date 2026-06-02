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

const supabase = createClient(supabaseUrl, supabaseKey);

async function testUpdate() {
    console.log('Testing updates on storefront_aliases...');
    
    const { data: update1, error: error1 } = await supabase
        .from('storefront_aliases')
        .update({ is_primary: false })
        .eq('internal_recipe_name', 'Haloz');
        
    console.log('Reset result:', { data: update1, error: error1 });
    
    const { data: update2, error: error2 } = await supabase
        .from('storefront_aliases')
        .update({ is_primary: true })
        .eq('storefront_sku', 'SK8Lytz HALOZ');
        
    console.log('Set primary result:', { data: update2, error: error2 });
}

testUpdate();
