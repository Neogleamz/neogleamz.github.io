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

async function checkAliases() {
    const { data: aliasData, error: aliasError } = await supabase
        .from('storefront_aliases')
        .select('*');
        
    if (aliasError) {
        console.error('Error fetching aliases:', aliasError);
    } else {
        console.log('Aliases in database:', aliasData.slice(0, 3));
    }
}

checkAliases();
