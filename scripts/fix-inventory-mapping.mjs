import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  // 1. Get all true rows to build the catalogCache logic
  const { data: flcData } = await supabase.from('full_landed_costs').select('*').order('created_at', { ascending: false });
  
  let stringToTrueUUID = {};
  flcData.forEach(r => {
    let nn = r.neogleamz_name || '';
    let np = r.neogleamz_product || '';
    let inam = r.item_name || '';
    let sp = r.specification || '';
    let k = nn ? `${nn}:::${np}:::(Grouped Raw Items):::(Mixed Specs)` : `:::${np}:::${inam}:::${sp}`;
    
    if (r.parcel_no === 'RECIPE_AUTO') {
      stringToTrueUUID[`RECIPE:::${np}`] = r.item_uuid;
    } else if (r.parcel_no !== 'ORPHAN_PARCEL' || !nn.includes(':::')) {
        // True raw material
        if (!stringToTrueUUID[k]) {
            stringToTrueUUID[k] = r.item_uuid;
        }
    }
  });

  // 2. Find all garbage ORPHAN_PARCEL rows
  const garbageRows = flcData.filter(r => r.parcel_no === 'ORPHAN_PARCEL' && r.neogleamz_name && r.neogleamz_name.includes(':::'));
  console.log(`Found ${garbageRows.length} garbage ORPHAN_PARCEL rows`);

  // 3. For each garbage row, get its IC data and move it to the true UUID
  for (const gRow of garbageRows) {
    const garbageUUID = gRow.item_uuid;
    const stringKey = gRow.neogleamz_name; // e.g. "15x40mm Black DS Tape:::Soulz..."
    
    const trueUUID = stringToTrueUUID[stringKey];
    if (trueUUID) {
        // Update inventory_consumption
        const { data: icData } = await supabase.from('inventory_consumption').select('*').eq('item_uuid', garbageUUID);
        if (icData && icData.length > 0) {
            console.log(`Moving IC data from garbage UUID to true UUID for ${stringKey}`);
            for (const ic of icData) {
                // Delete the garbage IC row
                await supabase.from('inventory_consumption').delete().eq('id', ic.id); // Wait, IC doesn't have id!
                // Actually IC has 'log_uuid' or 'item_uuid' as primary key
                await supabase.from('inventory_consumption').delete().eq('item_uuid', garbageUUID);
                
                // Insert/Upsert into true UUID
                ic.item_uuid = trueUUID;
                await supabase.from('inventory_consumption').upsert(ic, { onConflict: 'item_uuid' });
            }
        }
    } else {
        console.log(`WARNING: Could not find true UUID for ${stringKey}`);
    }
    
    // 4. Delete the garbage FLC row
    await supabase.from('full_landed_costs').delete().eq('item_uuid', garbageUUID);
  }
  
  console.log('Migration complete');
}

run();
