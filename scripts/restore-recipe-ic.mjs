import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  console.log("Restoring misplaced recipe consumption logs...");

  // 1. Get all IC rows that have recipe-specific data (sold, produced)
  const { data: icData } = await supabase.from('inventory_consumption')
    .select('*')
    .or('sold_qty.gt.0, produced_qty.gt.0, prototype_produced_qty.gt.0');

  // 2. Get all FLC rows for mapping
  const { data: flcData } = await supabase.from('full_landed_costs').select('item_uuid, neogleamz_product, parcel_no');

  let recipeUuids = {};
  flcData.forEach(r => {
    if (r.parcel_no === 'RECIPE_AUTO' && r.neogleamz_product) {
      recipeUuids[r.neogleamz_product] = r.item_uuid;
    }
  });

  for (const ic of icData) {
    const flc = flcData.find(f => f.item_uuid === ic.item_uuid);
    if (flc && flc.parcel_no !== 'RECIPE_AUTO') {
      // It's mapped to a raw material! Find the correct recipe UUID.
      const correctUuid = recipeUuids[flc.neogleamz_product];
      
      if (correctUuid && correctUuid !== ic.item_uuid) {
        console.log(`Moving ${flc.neogleamz_product} IC from Raw Material -> True Recipe UUID`);
        
        // See if the correct recipe UUID already has an IC row
        const { data: existingIc } = await supabase.from('inventory_consumption').select('*').eq('item_uuid', correctUuid).maybeSingle();
        
        await supabase.from('inventory_consumption').delete().eq('item_uuid', ic.item_uuid);

        if (existingIc) {
          existingIc.consumed_qty = (existingIc.consumed_qty || 0) + (ic.consumed_qty || 0);
          existingIc.produced_qty = (existingIc.produced_qty || 0) + (ic.produced_qty || 0);
          existingIc.sold_qty = (existingIc.sold_qty || 0) + (ic.sold_qty || 0);
          existingIc.prototype_produced_qty = (existingIc.prototype_produced_qty || 0) + (ic.prototype_produced_qty || 0);
          await supabase.from('inventory_consumption').upsert(existingIc, { onConflict: 'item_uuid' });
        } else {
          ic.item_uuid = correctUuid;
          await supabase.from('inventory_consumption').upsert(ic, { onConflict: 'item_uuid' });
        }
      }
    }
  }

  console.log("Completed restoring recipe inventory consumption!");
}

run();
