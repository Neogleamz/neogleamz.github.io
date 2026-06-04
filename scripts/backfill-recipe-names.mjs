import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Fetching full_landed_costs...");
  const { data: flcData, error: flcErr } = await supabase
    .from('full_landed_costs')
    .select('*');

  if (flcErr) {
    console.error("Error fetching flc:", flcErr);
    process.exit(1);
  }

  // Build the UUID map EXACTLY like the frontend does
  const uuidToNameMap = {};
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

  console.log("Fetching product_recipes...");
  const { data: prData, error: prErr } = await supabase
    .from('product_recipes')
    .select('product_item_uuid, components');

  if (prErr) {
    console.error("Error fetching product_recipes:", prErr);
    process.exit(1);
  }

  let updatedCount = 0;

  for (let row of prData) {
    let comps = row.components;
    if (!comps || !Array.isArray(comps) || comps.length === 0) continue;

    let modified = false;
    let newComps = comps.map(c => {
      let p = { ...c };
      if (p.item_uuid && !p.item_key && uuidToNameMap[p.item_uuid]) {
        p.item_key = uuidToNameMap[p.item_uuid];
        modified = true;
      }
      return p;
    });

    if (modified) {
      const { error: updateErr } = await supabase
        .from('product_recipes')
        .update({ components: newComps })
        .eq('product_item_uuid', row.product_item_uuid);
      
      if (updateErr) {
        console.error("Error updating recipe", row.product_item_uuid, updateErr);
      } else {
        updatedCount++;
      }
    }
  }

  console.log(`Successfully backfilled human-readable names for ${updatedCount} recipes!`);
}

run();
