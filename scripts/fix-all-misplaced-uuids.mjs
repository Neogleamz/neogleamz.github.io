import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  console.log("Fixing misplaced UUIDs across all tables...");
  const {data: flc} = await supabase.from('full_landed_costs').select('item_uuid, neogleamz_product, parcel_no');
  
  let recipes = {};
  flc.filter(r=>r.parcel_no==='RECIPE_AUTO' && r.neogleamz_product).forEach(r=>{recipes[r.neogleamz_product]=r.item_uuid});
  
  const tables = [
    { name: 'sales_ledger', pk: 'id', uuidCol: 'recipe_item_uuid' },
    { name: 'storefront_aliases', pk: 'product_sku', uuidCol: 'recipe_item_uuid' },
    { name: 'pack_ship_sops', pk: 'sop_id', uuidCol: 'recipe_item_uuid' },
    { name: 'production_sops', pk: 'sop_id', uuidCol: 'product_item_uuid' },
    { name: 'work_orders', pk: 'order_id', uuidCol: 'product_item_uuid' },
    { name: 'print_queue', pk: 'job_id', uuidCol: 'part_item_uuid' },
    { name: 'label_designs', pk: 'design_id', uuidCol: 'product_item_uuid' }
  ];
  
  for(const table of tables) {
    const {data, error} = await supabase.from(table.name).select(`${table.pk}, ${table.uuidCol}`);
    
    if(error || !data) {
      console.log(`Table ${table.name} failed to fetch: ${error?.message}`);
      continue;
    }

    let fixCount = 0;
    for(const row of data) {
      const currentUuid = row[table.uuidCol];
      if (!currentUuid) continue;
      
      const flcRow = flc.find(f=>f.item_uuid === currentUuid);
      if(flcRow && flcRow.parcel_no !== 'RECIPE_AUTO' && flcRow.neogleamz_product && recipes[flcRow.neogleamz_product]) {
        const correctUuid = recipes[flcRow.neogleamz_product];
        
        console.log(`Fixing ${table.name} [${row[table.pk]}]: ${currentUuid} -> ${correctUuid}`);
        
        await supabase.from(table.name).update({ [table.uuidCol]: correctUuid }).eq(table.pk, row[table.pk]);
        fixCount++;
      }
    }
    console.log(`Table ${table.name}: Fixed ${fixCount} rows.`);
  }
}
run();
