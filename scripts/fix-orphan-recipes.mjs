import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  // 1. Get all true rows to build the mapping
  const { data: flcData } = await supabase.from('full_landed_costs').select('*').order('created_at', { ascending: false });
  
  let stringToTrueUUID = {};
  flcData.forEach(r => {
    if (r.parcel_no === 'RECIPE_AUTO' && r.neogleamz_product) {
      stringToTrueUUID[r.neogleamz_product] = r.item_uuid; // map 'Glowz Lid' directly
    }
  });

  // 2. Find all ORPHAN_PARCEL rows that match a RECIPE name
  const garbageRows = flcData.filter(r => r.parcel_no === 'ORPHAN_PARCEL' && r.neogleamz_name && stringToTrueUUID[r.neogleamz_name]);
  console.log(`Found ${garbageRows.length} ORPHAN_PARCEL rows that match recipe names`);

  // 3. For each garbage row, get its IC data and move it to the true UUID
  for (const gRow of garbageRows) {
    const garbageUUID = gRow.item_uuid;
    const stringKey = gRow.neogleamz_name; // e.g. "Glowz Lid"
    
    const trueUUID = stringToTrueUUID[stringKey];
    if (trueUUID && trueUUID !== garbageUUID) {
        // Update inventory_consumption
        const { data: icData } = await supabase.from('inventory_consumption').select('*').eq('item_uuid', garbageUUID);
        if (icData && icData.length > 0) {
            console.log(`Moving IC data from garbage UUID to true UUID for ${stringKey}`);
            for (const ic of icData) {
                // Combine it if a true row already exists
                const { data: existingIc } = await supabase.from('inventory_consumption').select('*').eq('item_uuid', trueUUID).maybeSingle();
                
                await supabase.from('inventory_consumption').delete().eq('item_uuid', garbageUUID);
                
                if (existingIc) {
                    existingIc.consumed_qty = (existingIc.consumed_qty || 0) + (ic.consumed_qty || 0);
                    existingIc.produced_qty = (existingIc.produced_qty || 0) + (ic.produced_qty || 0);
                    existingIc.sold_qty = (existingIc.sold_qty || 0) + (ic.sold_qty || 0);
                    existingIc.manual_adjustment = (existingIc.manual_adjustment || 0) + (ic.manual_adjustment || 0);
                    existingIc.scrap_qty = (existingIc.scrap_qty || 0) + (ic.scrap_qty || 0);
                    await supabase.from('inventory_consumption').upsert(existingIc, { onConflict: 'item_uuid' });
                } else {
                    ic.item_uuid = trueUUID;
                    await supabase.from('inventory_consumption').upsert(ic, { onConflict: 'item_uuid' });
                }
            }
        }
    } else {
        console.log(`WARNING: Could not find true UUID for ${stringKey}`);
    }
    
    // 4. Delete the garbage FLC row
    await supabase.from('full_landed_costs').delete().eq('item_uuid', garbageUUID);
  }
  
  // ALSO check if any ORPHAN_PARCEL has "Unknown" item_name and its neogleamz_name isn't in stringToTrueUUID
  const otherOrphans = flcData.filter(r => r.parcel_no === 'ORPHAN_PARCEL' && !stringToTrueUUID[r.neogleamz_name]);
  console.log(`Found ${otherOrphans.length} other ORPHAN_PARCEL rows.`);
  // Wait, some ORPHAN_PARCEL rows are legit orphaned raw materials! But let's see which ones they are.
  
  console.log('Migration complete');
}

run();
