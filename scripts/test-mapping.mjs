import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const {data: flcData} = await supabase.from('full_landed_costs').select('*');
  let uuidToNameMap = {};
  
  flcData.forEach(r => {
    let nn = String(r['neogleamz_name']||'').trim();
    let np = String(r['neogleamz_product']||'').trim();
    let inam = String(r['item_name']||'Unknown').trim();
    let sp = String(r['specification']||'').trim();
    let k = nn ? `${nn}:::${np}:::(Grouped Raw Items):::(Mixed Specs)` : `:::${np}:::${inam}:::${sp}`;
    
    if (r.parcel_no === 'RECIPE_AUTO' && np) {
      uuidToNameMap[r.item_uuid] = `RECIPE:::${np}`;
      return;
    }
    
    if (!uuidToNameMap[r.item_uuid] || !uuidToNameMap[r.item_uuid].startsWith('RECIPE:::')) {
      uuidToNameMap[r.item_uuid] = k;
    }
  });
  
  const {data: icData} = await supabase.from('inventory_consumption').select('*');
  let matchCount = 0;
  let totalIc = icData.length;
  
  icData.forEach(ic => {
    if (uuidToNameMap[ic.item_uuid]) {
      matchCount++;
    } else {
      console.log(`Failed to match IC uuid: ${ic.item_uuid}`);
    }
  });
  
  console.log(`Matched ${matchCount} out of ${totalIc} IC rows`);
}
run();
