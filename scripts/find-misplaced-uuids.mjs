import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  console.log("Checking for misplaced UUIDs across tables...");
  const {data: flc} = await supabase.from('full_landed_costs').select('item_uuid, neogleamz_product, parcel_no');
  
  let recipes = {};
  flc.filter(r=>r.parcel_no==='RECIPE_AUTO' && r.neogleamz_product).forEach(r=>{recipes[r.neogleamz_product]=r.item_uuid});
  
  const tables = ['sales_ledger', 'storefront_aliases', 'pack_ship_sops', 'production_sops', 'label_designs', 'work_orders', 'print_queue'];
  
  for(const table of tables) {
    const uuidCol = ['pack_ship_sops', 'sales_ledger', 'storefront_aliases'].includes(table) ? 'recipe_item_uuid' : (table==='print_queue' ? 'part_item_uuid' : 'product_item_uuid');
    const {data} = await supabase.from(table).select(`id, ${uuidCol}`);
    
    if(!data) {
      console.log(`Table ${table} failed to fetch.`);
      continue;
    }

    let badCount = 0;
    data.forEach(row => {
      const currentUuid = row[uuidCol];
      const flcRow = flc.find(f=>f.item_uuid === currentUuid);
      if(flcRow && flcRow.parcel_no !== 'RECIPE_AUTO' && flcRow.neogleamz_product && recipes[flcRow.neogleamz_product]) {
        badCount++;
      }
    });
    console.log(`Table ${table}: ${badCount} misplaced UUIDs`);
  }
}
run();
