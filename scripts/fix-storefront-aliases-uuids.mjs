import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  console.log("Fixing misplaced UUIDs in storefront_aliases...");
  const {data: flc} = await supabase.from('full_landed_costs').select('item_uuid, neogleamz_product, parcel_no');
  
  let recipes = {};
  flc.filter(r=>r.parcel_no==='RECIPE_AUTO' && r.neogleamz_product).forEach(r=>{recipes[r.neogleamz_product]=r.item_uuid});
  
  const {data, error} = await supabase.from('storefront_aliases').select(`product_sku, recipe_item_uuid`);
  
  if(error || !data) {
    console.log(`Table storefront_aliases failed to fetch: ${error?.message}`);
    return;
  }

  let fixCount = 0;
  for(const row of data) {
    const currentUuid = row.recipe_item_uuid;
    if (!currentUuid) continue;
    
    const flcRow = flc.find(f=>f.item_uuid === currentUuid);
    if(flcRow && flcRow.parcel_no !== 'RECIPE_AUTO' && flcRow.neogleamz_product && recipes[flcRow.neogleamz_product]) {
      const correctUuid = recipes[flcRow.neogleamz_product];
      
      console.log(`Fixing storefront_aliases [${row.product_sku}]: ${currentUuid} -> ${correctUuid}`);
      
      await supabase.from('storefront_aliases').update({ recipe_item_uuid: correctUuid }).eq('product_sku', row.product_sku);
      fixCount++;
    }
  }
  console.log(`Table storefront_aliases: Fixed ${fixCount} rows.`);
}
run();
