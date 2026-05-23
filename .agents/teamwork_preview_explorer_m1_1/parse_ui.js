const fs = require('fs');
const html = fs.readFileSync('d:/GitHub/neogleamz.github.io/index.html', 'utf8');
const idRegex = /id=["']([^"']+)["']/g;
const classRegex = /class=["']([^"']+)["']/g;
const dataTabRegex = /data-tab=["']([^"']+)["']/g;

let ids = new Set();
let classes = new Set();
let dataTabs = new Set();
let match;

while ((match = idRegex.exec(html)) !== null) ids.add(match[1]);
while ((match = dataTabRegex.exec(html)) !== null) dataTabs.add(match[1]);

// Filter IDs that look like layout elements
const filteredIds = Array.from(ids).filter(id => 
  id.toLowerCase().includes('modal') || 
  id.toLowerCase().includes('hub') || 
  id.toLowerCase().includes('tab') || 
  id.toLowerCase().includes('page') || 
  id.toLowerCase().includes('view') || 
  id.toLowerCase().includes('panel')
).sort();

console.log("=== DATA TABS (HUBS/PAGES) ===");
console.log(Array.from(dataTabs).sort().join('\n'));
console.log("\n=== FILTERED IDs (Modals/Views/Panels) ===");
console.log(filteredIds.join('\n'));

// Also try to find legacy hub names vs canonical ones
// Looking for STOCKPILEZ, MAKERZ, FULFILLZ, REVENUEZ, SOCIALZ, NEXL
const allText = html.toUpperCase();
const targets = ["STOCKPILEZ", "MAKERZ", "FULFILLZ", "REVENUEZ", "SOCIALZ", "NEXL", "INVENTORY", "PRODUCTION", "SALES", "PACKING", "CEO", "SYSTEM"];
console.log("\n=== TEXT OCCURRENCES ===");
targets.forEach(t => {
  console.log(`${t}: ${allText.includes(t)}`);
});
