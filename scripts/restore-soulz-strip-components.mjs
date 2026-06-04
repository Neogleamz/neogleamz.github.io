import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  console.log("Restoring Soulz Black LED Strip components...");
  
  const targetParentUuid = '40557fe8-8d42-48c4-8a06-989c298cd6eb'; // Soulz Black LED Strip

  const components = [
    {"item_key":"Soulz black JST Wire:::Soulz:::(Grouped Raw Items):::(Mixed Specs)","quantity":1},
    {"item_key":"Soulz red JST Wire:::Soulz:::(Grouped Raw Items):::(Mixed Specs)","quantity":1},
    {"item_key":"Soulz yellow JST Wire:::Soulz:::(Grouped Raw Items):::(Mixed Specs)","quantity":1},
    {"item_key":"Soulz Black Silicone:::Soulz:::(Grouped Raw Items):::(Mixed Specs)","quantity":710},
    {"item_key":"Black Wire Sleeve:::Soulz:::(Grouped Raw Items):::(Mixed Specs)","quantity":170},
    {"item_key":"4mm LED Strip:::Soulz,Haloz:::(Grouped Raw Items):::(Mixed Specs)","quantity":710},
    {"item_key":"JST Female:::Soulz:::(Grouped Raw Items):::(Mixed Specs)","quantity":2},
    {"item_key":"Black HeatShrink 6mm:::Haloz,Soulz,Glowz,Railz:::(Grouped Raw Items):::(Mixed Specs)","quantity":20},
    {"item_key":"Black HeatShrink 4mm:::Haloz,Soulz,Glowz,Railz:::(Grouped Raw Items):::(Mixed Specs)","quantity":20},
    {"item_key":"RECIPE:::Soulz TPU Heel Black","quantity":1}
  ];

  const { data: flc } = await supabase.from('full_landed_costs').select('item_uuid, item_name, neogleamz_product, parcel_no');

  // Clear existing (if any)
  await supabase.from('product_recipes').delete().eq('parent_item_uuid', targetParentUuid);

  for (const comp of components) {
    let compUuid = null;
    let isSubassembly = false;
    
    if (comp.item_key.startsWith('RECIPE:::')) {
      const recipeName = comp.item_key.replace('RECIPE:::', '');
      const recipeRow = flc.find(f => f.neogleamz_product === recipeName && f.parcel_no === 'RECIPE_AUTO');
      if (recipeRow) {
        compUuid = recipeRow.item_uuid;
        isSubassembly = true;
      }
    } else {
      const rawName = comp.item_key.split(':::')[0].trim().replace(/\u00A0/g, " "); // Handle nbsp just in case
      // Try exact match on item_name first
      const rawRow = flc.find(f => (f.item_name || '').replace(/\u00A0/g, " ") === rawName);
      if (rawRow) {
        compUuid = rawRow.item_uuid;
      } else {
        console.log("Could not find raw material:", rawName);
      }
    }

    if (compUuid) {
      await supabase.from('product_recipes').insert({
        parent_item_uuid: targetParentUuid,
        component_item_uuid: compUuid,
        quantity: comp.quantity,
        is_subassembly: isSubassembly,
        is_3d_print: false,
        is_label: false,
        print_time_mins: 0,
        labor_time_mins: 0,
        shop_rate_hr: 0,
        msrp: 0,
        wholesale_price: 0
      });
      console.log(`Inserted ${comp.item_key} (${comp.quantity}) with UUID: ${compUuid}`);
    } else {
      console.log(`Failed to resolve UUID for ${comp.item_key}`);
    }
  }
}

run();
