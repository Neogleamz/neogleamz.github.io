import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Fetching full_landed_costs...");
  const { data: flcData } = await supabase.from('full_landed_costs').select('*');
  
  console.log("Fetching product_recipes...");
  const { data: prData } = await supabase.from('product_recipes').select('product_item_uuid');

  let missingRecipes = [];
  
  for (let pr of prData) {
    let flcRow = flcData.find(r => r.item_uuid === pr.product_item_uuid);
    if (flcRow && flcRow.parcel_no !== 'RECIPE_AUTO') {
      let recName = flcRow.neogleamz_product;
      // Check if a RECIPE_AUTO already exists
      let existingRecipe = flcData.find(r => r.neogleamz_product === recName && r.parcel_no === 'RECIPE_AUTO');
      
      if (!existingRecipe) {
        console.log(`Creating missing RECIPE_AUTO for: ${recName}`);
        const { data: newRow, error: insErr } = await supabase.from('full_landed_costs').insert({
          parcel_no: 'RECIPE_AUTO',
          di_item_id: 'RECIPE-' + Date.now() + Math.floor(Math.random()*1000),
          order_no: 'MANUAL',
          alibaba_order: 'MANUAL',
          item_name: recName,
          specification: '',
          quantity: 1,
          neogleamz_name: '',
          neogleamz_product: recName
        }).select('item_uuid').single();
        
        if (insErr) {
          console.error("Error creating", recName, insErr);
          continue;
        }
        existingRecipe = newRow;
      }
      
      console.log(`Updating product_recipes to use RECIPE_AUTO uuid for ${recName}`);
      await supabase.from('product_recipes')
        .update({ product_item_uuid: existingRecipe.item_uuid })
        .eq('product_item_uuid', pr.product_item_uuid);
    }
  }

  console.log("Fix complete.");
}

run();
