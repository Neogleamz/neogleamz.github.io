import { createClient } from '@supabase/supabase-js';
import xlsx from 'xlsx';

const supabase = createClient(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const manualMap = {
    'SK8Lytz SOULZ - Black': '36563668-b296-4bbb-a504-74cb9bfd2665',
    'NEW Rechargeable Bluetooth ARGB LED Lights for Quad Roller Skates SK8Lytz SOULZ[Black] - Black': '36563668-b296-4bbb-a504-74cb9bfd2665',
    'SK8Lytz SOULZ - White Dual-Stripe': '91703f5e-606f-4c24-8c70-9564a64bb67d',
    'NEW Rechargeable Bluetooth ARGB LED Lights for Quad Roller Skates SK8Lytz SOULZ[White Dual-Stripe] - White Dual-Stripe': '91703f5e-606f-4c24-8c70-9564a64bb67d',
    'SOULZ LED Strips': '40557fe8-8d42-48c4-8a06-989c298cd6eb', 
    'SOULZ Control Unit': 'bc68ecb7-4951-44f0-82a4-5c49c6877dd1', 
    'SOULZ Boot Clips': '807738a3-1787-4e37-9c92-6a070e7be947', 
    'Low Profile Baseball Cap - White / One size': '63937c1a-32a8-45fd-a60a-c313d48a80bc',
    'Low Profile Baseball Cap - Black / One size': '63937c1a-32a8-45fd-a60a-c313d48a80bc',
    'Neogleamz Flexi Phone Cases | Stylish Protective Covers, Unique Gift, Smartphone Accessory, Cool Vibe, Custom Design - iPhone 14 Pro': '63937c1a-32a8-45fd-a60a-c313d48a80bc',
    'Unisex Hoodie - XL / Safety Orange': '63937c1a-32a8-45fd-a60a-c313d48a80bc'
  };

  // 1. Create missing aliases in storefront_aliases
  for (const [sku, uuid] of Object.entries(manualMap)) {
    const { data: existing } = await supabase.from('storefront_aliases').select('product_sku').eq('product_sku', sku);
    if (!existing || existing.length === 0) {
      await supabase.from('storefront_aliases').insert({
        product_sku: sku,
        platform: 'Shopify Webhook',
        is_shopify_synced: true,
        recipe_item_uuid: uuid
      });
      console.log('Inserted missing alias:', sku);
    } else {
      await supabase.from('storefront_aliases').update({ recipe_item_uuid: uuid }).eq('product_sku', sku);
      console.log('Updated alias:', sku);
    }
  }

  // 2. Scrape Soulz Black LED Strip components from Backup
  const wb = xlsx.readFile('data/exports/Neogleamz_Full_Backup_2026-06-03_18-20-30.xlsx');
  const recipesSheet = xlsx.utils.sheet_to_json(wb.Sheets['Product Recipes']);
  
  const targetRecipe = 'Soulz Black LED Strip';
  const components = recipesSheet.filter(r => r.recipe_name === targetRecipe);
  
  if (components.length > 0) {
    console.log(`Found ${components.length} components for ${targetRecipe} in backup.`);
    
    // Get true UUIDs for the components based on name
    const { data: flc } = await supabase.from('full_landed_costs').select('item_uuid, item_name, neogleamz_product');
    
    // Get true UUID for target recipe
    const parentUuidObj = flc.find(f => f.neogleamz_product === targetRecipe);
    if (parentUuidObj) {
      const parentUuid = parentUuidObj.item_uuid;
      
      // Delete existing empty components if any
      await supabase.from('product_recipes').delete().eq('parent_item_uuid', parentUuid);
      
      for (const comp of components) {
        // Need to find component UUID
        let compUuid = null;
        let isSubassembly = false;
        
        // Is it a recipe?
        const compRecipe = flc.find(f => f.neogleamz_product === comp.component_item_name);
        if (compRecipe) {
          compUuid = compRecipe.item_uuid;
          isSubassembly = true;
        } else {
          // Is it a raw material?
          const compRaw = flc.find(f => f.item_name === comp.component_item_name || f.neogleamz_product === comp.component_item_name);
          if (compRaw) {
            compUuid = compRaw.item_uuid;
          }
        }
        
        if (compUuid) {
          await supabase.from('product_recipes').insert({
            parent_item_uuid: parentUuid,
            component_item_uuid: compUuid,
            quantity: comp.quantity || 1,
            is_subassembly: isSubassembly,
            is_3d_print: comp.is_3d_print === 'TRUE' || comp.is_3d_print === true,
            is_label: comp.is_label === 'TRUE' || comp.is_label === true,
            print_time_mins: parseFloat(comp.print_time_mins) || 0,
            labor_time_mins: parseFloat(comp.labor_time_mins) || 0,
            shop_rate_hr: parseFloat(comp.shop_rate_hr) || 0,
            msrp: parseFloat(comp.msrp) || 0,
            wholesale_price: parseFloat(comp.wholesale_price) || 0
          });
          console.log(`Restored component: ${comp.component_item_name} (${comp.quantity})`);
        } else {
          console.log(`Could not find UUID for component: ${comp.component_item_name}`);
        }
      }
    } else {
      console.log(`Could not find True UUID for ${targetRecipe} in full_landed_costs`);
    }
  } else {
    console.log(`No components found for ${targetRecipe} in backup.`);
  }
}

run();
