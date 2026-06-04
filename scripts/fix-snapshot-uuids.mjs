import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  console.log("Fetching full_landed_costs to build UUID map...");
  const { data: flc } = await supabase.from('full_landed_costs').select('item_uuid, item_name, neogleamz_name, neogleamz_product, specification, parcel_no');
  
  const uuidMap = {};
  
  flc.forEach(r => {
    // Exact logic from legacy catalog builder
    let nn = r.neogleamz_name || "";
    let np = r.neogleamz_product || "";
    let inam = r.item_name || "";
    let sp = r.specification || "";
    
    // Legacy String Key
    let key = nn ? `${nn}:::${np}:::(Grouped Raw Items):::(Mixed Specs)` : `:::${np}:::${inam}:::${sp}`;
    uuidMap[key] = r.item_uuid;

    // FGI Recipe String Key
    if (r.parcel_no === 'RECIPE_AUTO') {
      uuidMap[`RECIPE:::${np}`] = r.item_uuid;
    }
    
    // Self UUID to UUID mapping (if a snapshot already has UUIDs but calls them item_key)
    uuidMap[r.item_uuid] = r.item_uuid;
  });

  // Additional explicit mappings just in case
  uuidMap['RECIPE:::Soulz Black LED Strip'] = '40557fe8-8d42-48c4-8a06-989c298cd6eb';
  uuidMap['RECIPE:::Soulz White LED Strip'] = '654388ed-e2aa-4cd4-884b-010531bdcff2';

  console.log("Fetching all inventory snapshots...");
  const { data: snapshots } = await supabase.from('inventory_snapshots').select('*');

  let updatedCount = 0;

  for (const snap of snapshots) {
    let changed = false;
    let newData = [];
    
    for (const row of snap.snapshot_data) {
      let key = row.item_uuid || row.item_key;
      if (!key) continue;
      
      // If the key is already a UUID format, keep it
      let uuid = null;
      if (key.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        uuid = key;
      } else {
        // Map string key to UUID
        uuid = uuidMap[key];
      }

      if (uuid) {
        let newRow = { ...row };
        delete newRow.item_key;
        newRow.item_uuid = uuid;
        newData.push(newRow);
        changed = true;
      } else {
        console.log(`WARNING: Could not map string key in snapshot '${snap.name}':`, key);
        newData.push(row); // Keep it anyway so we don't lose data, but it might stay orphaned
      }
    }

    if (changed) {
      console.log(`Updating snapshot ${snap.name} with UUIDs...`);
      await supabase.from('inventory_snapshots').update({ snapshot_data: newData }).eq('id', snap.id);
      updatedCount++;
    }
  }

  console.log(`Successfully updated ${updatedCount} snapshots!`);
}

run();
