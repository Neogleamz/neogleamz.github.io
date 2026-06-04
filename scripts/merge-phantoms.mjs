import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

const MAPPING = {
  'Beamz': 'Glowz',
  'Soulz Black': 'Soulz Black V1',
  'Soulz White': 'Soulz White V1',
  'Soulz White Dual Stipe': 'Soulz White Dual Stripe V1',
  'Soulz Black TPU Toe': 'Soulz TPU Toe Black'
};

async function run() {
  console.log("Starting phantom merge...");

  // 1. Get the true UUIDs for the target recipes
  const { data: flcData } = await supabase.from('full_landed_costs').select('*').order('created_at', { ascending: false });
  
  let stringToTrueUUID = {};
  flcData.forEach(r => {
    if (r.parcel_no === 'RECIPE_AUTO' && r.neogleamz_product) {
      stringToTrueUUID[r.neogleamz_product] = r.item_uuid; 
    }
  });

  for (const [phantomName, targetName] of Object.entries(MAPPING)) {
    const targetUUID = stringToTrueUUID[targetName];
    if (!targetUUID) {
        console.log(`❌ ERROR: Could not find target UUID for ${targetName}`);
        continue;
    }

    // Find the phantom row
    const phantomRow = flcData.find(r => r.parcel_no === 'ORPHAN_PARCEL' && r.neogleamz_name === phantomName);
    if (!phantomRow) {
        console.log(`ℹ️ SKIP: Phantom row ${phantomName} not found. Already merged?`);
        continue;
    }

    const phantomUUID = phantomRow.item_uuid;
    console.log(`\n🔄 Merging ${phantomName} (${phantomUUID}) -> ${targetName} (${targetUUID})`);

    // Update inventory_consumption
    const { data: icData } = await supabase.from('inventory_consumption').select('*').eq('item_uuid', phantomUUID);
    if (icData && icData.length > 0) {
        for (const ic of icData) {
            const { data: existingIc } = await supabase.from('inventory_consumption').select('*').eq('item_uuid', targetUUID).maybeSingle();
            
            await supabase.from('inventory_consumption').delete().eq('item_uuid', phantomUUID);
            
            if (existingIc) {
                existingIc.consumed_qty = (existingIc.consumed_qty || 0) + (ic.consumed_qty || 0);
                existingIc.produced_qty = (existingIc.produced_qty || 0) + (ic.produced_qty || 0);
                existingIc.sold_qty = (existingIc.sold_qty || 0) + (ic.sold_qty || 0);
                existingIc.manual_adjustment = (existingIc.manual_adjustment || 0) + (ic.manual_adjustment || 0);
                existingIc.scrap_qty = (existingIc.scrap_qty || 0) + (ic.scrap_qty || 0);
                await supabase.from('inventory_consumption').upsert(existingIc, { onConflict: 'item_uuid' });
                console.log(`   Merged IC data into existing row for ${targetName}`);
            } else {
                ic.item_uuid = targetUUID;
                await supabase.from('inventory_consumption').upsert(ic, { onConflict: 'item_uuid' });
                console.log(`   Transferred IC data to new row for ${targetName}`);
            }
        }
    } else {
        console.log(`   No IC data to merge.`);
    }

    // Delete the phantom row
    await supabase.from('full_landed_costs').delete().eq('item_uuid', phantomUUID);
    console.log(`   Deleted phantom FLC row for ${phantomName}`);
  }

  console.log("\n✅ Phantom merge complete!");
}

run();
