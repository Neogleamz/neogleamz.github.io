import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const {data: flc} = await supabase.from('full_landed_costs').select('item_uuid, neogleamz_product, item_name, parcel_no').in('neogleamz_product', ['Clipz', 'Haloz', 'Glowz', 'Railz', 'TEST RECIPE', 'Shipping 4.0" x 6.0"']);
  const uuids = flc.map(r=>r.item_uuid);
  const {data: ic} = await supabase.from('inventory_consumption').select('*').in('item_uuid', uuids).or('sold_qty.gt.0, produced_qty.gt.0');
  
  console.log('Misplaced IC rows:');
  for(let r of ic) {
    const product = flc.find(f=>f.item_uuid === r.item_uuid);
    console.log(`${product.neogleamz_product} - ${product.item_name} [${product.parcel_no}] (${r.item_uuid}): sold=${r.sold_qty}, prod=${r.produced_qty}`);
  }
}
run();
