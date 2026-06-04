import ExcelJS from 'exceljs';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  console.log("Reading XLSX Backup...");
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(String.raw`D:\GitHub\neogleamz.github.io\data\exports\Neogleamz_Full_Backup_2026-06-03_18-20-30.xlsx`);
  
  const sheet = workbook.getWorksheet('Sales_Ledger');
  if (!sheet) {
    console.error("Sales_Ledger sheet not found!");
    return;
  }

  // Get headers from first row
  const headers = {};
  sheet.getRow(1).eachCell((cell, colNumber) => {
    headers[colNumber] = cell.value;
  });
  
  console.log("Headers found:", Object.values(headers));
  
  const { data: flc } = await supabase.from('full_landed_costs').select('item_uuid, neogleamz_product').eq('parcel_no', 'RECIPE_AUTO');
  let recipes = {};
  flc.forEach(r => { if(r.neogleamz_product) recipes[r.neogleamz_product] = r.item_uuid; });

  const rowsToInsert = [];
  
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // skip header
    
    let dbRow = {};
    row.eachCell((cell, colNumber) => {
      const header = headers[colNumber];
      if (header && header !== 'id') {
        dbRow[header] = cell.value;
      }
    });

    if (dbRow['internal_recipe_name']) {
      const correctUuid = recipes[dbRow['internal_recipe_name']];
      if (correctUuid) {
        dbRow['recipe_item_uuid'] = correctUuid;
      }
    }
    
    // Parse dates to standard format if needed
    for(let k in dbRow) {
      if(dbRow[k] instanceof Date) {
        dbRow[k] = dbRow[k].toISOString();
      }
    }

    rowsToInsert.push(dbRow);
  });
  
  console.log(`Found ${rowsToInsert.length} sales ledger rows in backup.`);

  if (rowsToInsert.length > 0) {
    // Delete existing records to avoid duplicates
    await supabase.from('sales_ledger').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    const { data, error } = await supabase.from('sales_ledger').insert(rowsToInsert);
    if (error) {
      console.error("Insert error:", error.message);
      // Fallback: Drop internal_recipe_name because it was removed in migration
      console.log("Trying to insert without legacy column...");
      rowsToInsert.forEach(r => delete r.internal_recipe_name);
      const res = await supabase.from('sales_ledger').insert(rowsToInsert);
      if(res.error) console.error("Second insert error:", res.error);
      else console.log("Success fully inserted remaining rows!");
    } else {
      console.log("Successfully restored sales ledger!");
    }
  }
}

run();
