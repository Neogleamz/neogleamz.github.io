const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

function getEnv(key) {
    try {
        const envFile = fs.readFileSync('.env.local', 'utf-8');
        const match = envFile.match(new RegExp(`${key}=(.+)`));
        return match ? match[1].trim().replace(/^["']|["']$/g, '') : null;
    } catch (e) {
        return null;
    }
}

const supabaseUrl = getEnv('SUPABASE_URL');
const supabaseKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');

const supabase = createClient(supabaseUrl, supabaseKey);

function getDeterministic9DigitHash(str) {
    if (!str) return '100000000';
    let hash = 0;
    const cleanStr = String(str).trim().toLowerCase();
    for (let i = 0; i < cleanStr.length; i++) {
        hash = (hash * 31 + cleanStr.charCodeAt(i)) % 900000000;
    }
    return String(100000000 + Math.abs(hash));
}

async function cleanBarcodes() {
    console.log('Fetching storefront aliases...');
    const { data: aliases, error } = await supabase
        .from('storefront_aliases')
        .select('*');
        
    if (error) {
        console.error('Error fetching aliases:', error);
        return;
    }
    
    console.log(`Found ${aliases.length} aliases. Checking for fallback barcode matches...`);
    
    let count = 0;
    for (const alias of aliases) {
        if (!alias.is_shopify_synced) {
            const recipeBC = getDeterministic9DigitHash(alias.internal_recipe_name);
            if (alias.barcode_value === recipeBC) {
                console.log(`Resetting barcode for ${alias.product_sku} (currently ${alias.barcode_value}, matches recipe fallback for ${alias.internal_recipe_name})`);
                
                const { error: updateError } = await supabase
                    .from('storefront_aliases')
                    .update({ barcode_value: null })
                    .eq('product_sku', alias.product_sku);
                    
                if (updateError) {
                    console.error(`Error updating ${alias.product_sku}:`, updateError);
                } else {
                    count++;
                }
            }
        }
    }
    
    console.log(`Successfully reset ${count} fallback barcodes to NULL in the database.`);
}

cleanBarcodes();
