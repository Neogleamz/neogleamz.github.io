import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data: flcData } = await supabase.from('full_landed_costs').select('*').order('created_at', { ascending: false });
  const { data: prData } = await supabase.from('product_recipes').select('*');

  let uuidToNameMap = {};
  
  // Phase 1: loadProductsData mapping
  flcData.forEach(r => {
    if (r.item_uuid) {
      let nm = "Unknown";
      if (r.parcel_no === 'RECIPE_AUTO' && r.neogleamz_product) {
          nm = 'RECIPE:::' + r.neogleamz_product;
      } else if (r.neogleamz_name && r.neogleamz_name.trim() !== "") {
          nm = r.neogleamz_name + ':::' + (r.neogleamz_product||'') + ':::(Grouped Raw Items):::(Mixed Specs)';
      } else {
          nm = ':::' + (r.neogleamz_product||'') + ':::' + (r.item_name||'Unknown') + ':::' + (r.specification||'');
      }
      uuidToNameMap[r.item_uuid] = nm;
    }
  });

  // Phase 2: buildCatalogCache mapping
  flcData.forEach(r => {
    let nn = r.neogleamz_name;
    let np = r.neogleamz_product;
    let inam = r.item_name;
    let sp = r.specification;
    let k = nn ? `${nn}:::${np}:::(Grouped Raw Items):::(Mixed Specs)` : `:::${np}:::${inam}:::${sp}`;

    if (r.item_uuid) {
        if (r.parcel_no === 'RECIPE_AUTO' && np) {
            uuidToNameMap[r.item_uuid] = `RECIPE:::${np}`;
        } else {
            if (!uuidToNameMap[r.item_uuid] || !uuidToNameMap[r.item_uuid].startsWith('RECIPE:::')) {
                uuidToNameMap[r.item_uuid] = k;
            }
        }
    }
  });

  // Map recipes
  prData.forEach(row => {
    let mappedName = uuidToNameMap[row.product_item_uuid];
    if (mappedName) {
      row.product_name = mappedName.replace('RECIPE:::', '');
    } else {
      row.product_name = row.product_item_uuid;
    }
  });

  const glowz = prData.find(r => r.product_name && r.product_name.includes('Glowz'));
  console.log("Mapped Glowz Recipe Name:", glowz?.product_name);
  console.log("UUID for Glowz Recipe:", glowz?.product_item_uuid);
  console.log("uuidToNameMap for Glowz Recipe:", uuidToNameMap[glowz?.product_item_uuid]);
  
  const recAutoRow = flcData.find(r => r.item_uuid === glowz?.product_item_uuid);
  console.log("DB Row for Glowz Recipe UUID:", recAutoRow);
}

run();
