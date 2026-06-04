import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  console.log("Fetching full_landed_costs and inventory_consumption...");
  const [flcRes, invRes, snapRes] = await Promise.all([
    supabase.from('full_landed_costs').select('*'),
    supabase.from('inventory_consumption').select('*'),
    supabase.from('inventory_snapshots').select('*')
  ]);
  
  const flc = flcRes.data;
  const inv = invRes.data;
  const snapshots = snapRes.data;

  // 1. Build a map of ALL possible string keys to all their possible UUIDs from FLC
  const stringToUuids = {};
  
  flc.forEach(r => {
    let nn = r.neogleamz_name || "";
    let np = r.neogleamz_product || "";
    let inam = r.item_name || "";
    let sp = r.specification || "";
    
    let key1 = nn ? `${nn}:::${np}:::(Grouped Raw Items):::(Mixed Specs)` : `:::${np}:::${inam}:::${sp}`;
    let key2 = `RECIPE:::${np}`;

    if (!stringToUuids[key1]) stringToUuids[key1] = [];
    stringToUuids[key1].push(r.item_uuid);
    
    if (r.parcel_no === 'RECIPE_AUTO') {
      if (!stringToUuids[key2]) stringToUuids[key2] = [];
      stringToUuids[key2].push(r.item_uuid);
    }
  });

  // 2. Identify the "Correct" UUID for each string key (the one actually used in inventory_consumption)
  const activeUuids = new Set(inv.map(r => r.item_uuid));
  const correctUuidMap = {};

  Object.keys(stringToUuids).forEach(strKey => {
    const uuidsForThisString = stringToUuids[strKey];
    // Find the UUID that is currently active in inventory_consumption
    let activeMatch = uuidsForThisString.find(u => activeUuids.has(u));
    if (activeMatch) {
      correctUuidMap[strKey] = activeMatch;
      
      // Also map ALL the other inactive UUIDs to the active one, so we can fix them too!
      uuidsForThisString.forEach(u => {
        correctUuidMap[u] = activeMatch;
      });
    } else {
      // If none are active, just use the first one
      correctUuidMap[strKey] = uuidsForThisString[0];
    }
  });

  // Additional explicit mappings
  correctUuidMap['RECIPE:::Soulz Black LED Strip'] = '40557fe8-8d42-48c4-8a06-989c298cd6eb';
  correctUuidMap['RECIPE:::Soulz White LED Strip'] = '654388ed-e2aa-4cd4-884b-010531bdcff2';
  
  // Also map common misspellings from old snapshots
  correctUuidMap['BARCODE_LABEL:::Soulz White Dual Stipe V1'] = correctUuidMap['BARCODE_LABEL:::Soulz White Dual Stripe V1'] || correctUuidMap['BARCODE_LABEL:::Soulz White Dual Stripe V1'];
  
  // Let's also look up any "bad" UUIDs that are currently in the snapshots and fix them to the active ones
  // We already did this by mapping all `uuidsForThisString` to the `activeMatch` above!

  // 3. Update the snapshots
  let updatedCount = 0;

  for (const snap of snapshots) {
    let changed = false;
    let newData = [];
    
    for (const row of snap.snapshot_data) {
      let key = row.item_uuid || row.item_key;
      if (!key) continue;
      
      let uuid = null;
      
      if (correctUuidMap[key]) {
        uuid = correctUuidMap[key];
      } else {
        // If it's a UUID but not in correctUuidMap, try to find a matching active UUID by comparing FLC names
        let rowFlc = flc.find(f => f.item_uuid === key);
        if (rowFlc) {
          let nn = rowFlc.neogleamz_name || "";
          let np = rowFlc.neogleamz_product || "";
          let inam = rowFlc.item_name || "";
          let sp = rowFlc.specification || "";
          let strKey = nn ? `${nn}:::${np}:::(Grouped Raw Items):::(Mixed Specs)` : `:::${np}:::${inam}:::${sp}`;
          if (correctUuidMap[strKey]) {
            uuid = correctUuidMap[strKey];
          }
        }
      }

      if (uuid && uuid !== key) {
        let newRow = { ...row };
        delete newRow.item_key;
        newRow.item_uuid = uuid;
        
        // Merge duplicates if they resolve to the same active UUID
        let existing = newData.find(r => r.item_uuid === uuid);
        if (existing) {
           existing.consumed_qty = (existing.consumed_qty || 0) + (newRow.consumed_qty || 0);
           existing.produced_qty = (existing.produced_qty || 0) + (newRow.produced_qty || 0);
           existing.scrap_qty = (existing.scrap_qty || 0) + (newRow.scrap_qty || 0);
           existing.sold_qty = (existing.sold_qty || 0) + (newRow.sold_qty || 0);
           existing.manual_adjustment = (existing.manual_adjustment || 0) + (newRow.manual_adjustment || 0);
        } else {
           newData.push(newRow);
        }
        changed = true;
      } else {
        if (key.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
            // Check if it's an orphaned ghost UUID
            if (!activeUuids.has(key)) {
                console.log(`WARNING: Snapshot ${snap.name} contains orphaned ghost UUID ${key}`);
            }
        }
        
        let existing = newData.find(r => (r.item_uuid || r.item_key) === key);
        if (!existing) newData.push(row);
      }
    }

    if (changed) {
      console.log(`Updating snapshot ${snap.name} with PERFECT UUID alignments...`);
      await supabase.from('inventory_snapshots').update({ snapshot_data: newData }).eq('id', snap.id);
      updatedCount++;
    }
  }

  console.log(`Successfully perfectly aligned ${updatedCount} snapshots!`);
}

run();
