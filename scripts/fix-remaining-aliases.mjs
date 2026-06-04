import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const map = { 
    'NEW Rechargeable Bluetooth ARGB LED Lights for Quad Roller Skates SK8Lytz HALOZ': 'Haloz', 
    'RAILZ Prototypes': 'Railz', 
    'SK8Lytz CLIPZ': 'Clipz', 
    'SK8Lytz HALOZ': 'Haloz' 
  }; 
  for (let sku in map) { 
    const recipeName = map[sku]; 
    const { data } = await supabase.from('full_landed_costs').select('item_uuid').eq('parcel_no', 'RECIPE_AUTO').eq('neogleamz_product', recipeName).single(); 
    if(data) { 
      await supabase.from('storefront_aliases').update({ recipe_item_uuid: data.item_uuid }).eq('product_sku', sku); 
      console.log(`Fixed ${sku} -> ${recipeName} (${data.item_uuid})`); 
    } 
  }
}
run();
