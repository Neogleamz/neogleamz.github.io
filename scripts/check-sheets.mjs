import ExcelJS from 'exceljs';
const wb = new ExcelJS.Workbook();
await wb.xlsx.readFile('D:/GitHub/neogleamz.github.io/data/exports/Neogleamz_Full_Backup_2026-06-03_18-20-30.xlsx');
console.log(wb.worksheets.map(s => s.name));
