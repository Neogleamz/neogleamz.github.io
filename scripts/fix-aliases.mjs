import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  console.log("Fixing storefront aliases...");

  const { data: aliases } = await supabase.from('storefront_aliases').select('*');
  const { data: recipes } = await supabase.from('full_landed_costs').select('item_uuid, neogleamz_product').eq('parcel_no', 'RECIPE_AUTO');

  let recipeMap = {};
  recipes.forEach(r => {
    if (r.neogleamz_product) {
      recipeMap[r.neogleamz_product] = r.item_uuid;
    }
  });

  let updateCount = 0;

  for (const alias of aliases) {
    if (alias.internal_recipe_name && recipeMap[alias.internal_recipe_name]) {
      const correctUuid = recipeMap[alias.internal_recipe_name];
      if (alias.recipe_item_uuid !== correctUuid) {
        console.log(`Fixing alias ${alias.product_sku}: ${alias.recipe_item_uuid} -> ${correctUuid}`);
        await supabase.from('storefront_aliases').update({ recipe_item_uuid: correctUuid }).eq('product_sku', alias.product_sku);
        updateCount++;
      }
    }
  }

  console.log(`Updated ${updateCount} aliases to correct recipe UUIDs.`);
}
run();
