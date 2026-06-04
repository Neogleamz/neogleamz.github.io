import ExcelJS from 'exceljs';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  console.log("Reading XLSX Backup for Inventory...");
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(String.raw`D:\GitHub\neogleamz.github.io\data\exports\Neogleamz_Full_Backup_2026-06-03_18-20-30.xlsx`);
  
  const sheet = workbook.getWorksheet('Inventory');
  
  const headers = {};
  sheet.getRow(1).eachCell((cell, colNumber) => {
    headers[colNumber] = cell.value;
  });
  
  const { data: flc } = await supabase.from('full_landed_costs').select('*');
  
  let keyMap = {};
  flc.forEach(r => { 
    if (r.parcel_no === 'RECIPE_AUTO' && r.neogleamz_product) {
      keyMap[`RECIPE:::${r.neogleamz_product}`] = r.item_uuid;
    } else {
      let np = r.neogleamz_product || ''; 
      let nn = r.neogleamz_name || ''; 
      let inam = r.item_name || ''; 
      let sp = r.specification || ''; 
      
      let k1 = `${np}:::${nn}:::${nn ? "(Grouped Raw Items)" : inam}:::${nn ? "(Mixed Specs)" : sp}`;
      let k2 = `${nn}:::${np}:::${nn ? "(Grouped Raw Items)" : inam}:::${nn ? "(Mixed Specs)" : sp}`;
      
      keyMap[k1] = r.item_uuid;
      keyMap[k2] = r.item_uuid;
      if (np) keyMap[np] = r.item_uuid;
      if (nn) keyMap[nn] = r.item_uuid;
      
      // Also map things like "BARCODE_LABEL:::Haloz"
      if (r.neogleamz_product && r.neogleamz_name === 'BARCODE_LABEL') {
         keyMap[`BARCODE_LABEL:::${r.neogleamz_product}`] = r.item_uuid;
      }
      if (r.neogleamz_name && r.neogleamz_product === 'BARCODE_LABEL') {
         keyMap[`BARCODE_LABEL:::${r.neogleamz_name}`] = r.item_uuid;
      }
    }
  });

  const payloads = [];
  
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    
    let dbRow = {};
    row.eachCell((cell, colNumber) => {
      const header = headers[colNumber];
      if (header && header !== 'id') {
        dbRow[header] = cell.value;
      }
    });

    if (dbRow['item_key']) {
      let strKey = dbRow['item_key'];
      const correctUuid = keyMap[strKey];
      if (correctUuid) {
        dbRow['item_uuid'] = correctUuid;
        delete dbRow['item_key'];
        
        for(let k in dbRow) {
            if(dbRow[k] === null || dbRow[k] === undefined || dbRow[k] === '') dbRow[k] = 0;
        }

        payloads.push(dbRow);
      } else {
        console.log("Still could not map item_key:", strKey);
      }
    }
  });
  
  console.log(`Found ${payloads.length} inventory consumption rows to restore.`);

  if (payloads.length > 0) {
    await supabase.from('inventory_consumption').delete().neq('item_uuid', '00000000-0000-0000-0000-000000000000');
    
    const { data, error } = await supabase.from('inventory_consumption').upsert(payloads, { onConflict: 'item_uuid' });
    if (error) {
      console.error("Insert error:", error.message);
    } else {
      console.log("Successfully restored full inventory_consumption from backup!");
      
      const clipzFGI = keyMap['RECIPE:::Clipz'];
      if(clipzFGI) {
         // Since they fulfilled 1043 again, let's just forcefully set the correct Math:
         // PROD = 12, SOLD = 12
         await supabase.from('inventory_consumption').update({ sold_qty: 12, produced_qty: 12 }).eq('item_uuid', clipzFGI);
         console.log("Clipz corrected to SOLD 12, PROD 12 (0 in stock)");
      }
    }
  }
}

run();
