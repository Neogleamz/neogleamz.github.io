const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase
    .from('product_recipes')
    .select('product_item_uuid, components')
    // We need to join with full_landed_costs to get the name, but we can just fetch all and find it
  
  if (error) {
    console.error(error);
    return;
  }

  const { data: flc } = await supabase.from('full_landed_costs').select('item_uuid, neogleamz_product');
  const uuidMap = {};
  flc.forEach(r => uuidMap[r.item_uuid] = r.neogleamz_product);

  const glowz = data.find(r => uuidMap[r.product_item_uuid] === 'Glowz Silicone');
  console.log("GLOWZ SILICONE COMPONENTS:");
  console.log(JSON.stringify(glowz, null, 2));
}

run();
