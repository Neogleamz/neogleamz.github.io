import { createClient } from '@supabase/supabase-js';

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
    'USB Charging Bundle': '469a8bbf-bfe5-4652-ae1c-1162eee344ce'
  };

  const MISC_APPAREL_UUID = '63937c1a-32a8-45fd-a60a-c313d48a80bc';

  console.log("Fixing remaining UNMAPPED SKUs...");
  
  const tables = ['sales_ledger', 'storefront_aliases'];
  
  for(const table of tables) {
    const isSales = table === 'sales_ledger';
    const pk = isSales ? 'id' : 'product_sku';
    const skuCol = isSales ? 'storefront_sku' : 'product_sku';
    
    const {data} = await supabase.from(table).select(`${pk}, ${skuCol}, recipe_item_uuid`).is('recipe_item_uuid', null);
    
    if(!data) continue;
    
    let fixCount = 0;
    for(const row of data) {
      const sku = row[skuCol];
      let correctUuid = null;
      
      if (manualMap[sku]) {
        correctUuid = manualMap[sku];
      } else if (sku.includes('Low Profile Baseball Cap') || sku.includes('Flexi Phone Case') || sku.includes('Unisex')) {
        correctUuid = MISC_APPAREL_UUID;
      }
      
      if (correctUuid) {
        await supabase.from(table).update({ recipe_item_uuid: correctUuid }).eq(pk, row[pk]);
        fixCount++;
      }
    }
    console.log(`Fixed ${fixCount} unmapped rows in ${table}.`);
  }
}

run();
