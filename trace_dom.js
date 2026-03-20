const fs = require('fs');
const lines = fs.readFileSync('index.html', 'utf-8').split('\n');
let depth = 0;
let inApp = false;

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('class="app-container"')) {
        inApp = true;
        console.log(`[${i+1}] START APP-CONTAINER`);
    }
    if (!inApp) continue;
    
    // rough count
    let opens = (line.match(/<div/g) || []).length;
    let closes = (line.match(/<\/div/g) || []).length;
    
    for (let j=0; j < opens; j++) {
        depth++;
        if (line.includes('id="salezhub-tab"') || line.includes('id="synchub-tab"') || line.includes('ceoContent') || line.includes('ceo-tab-inner')) {
            console.log(`[${i+1}] ${'  '.repeat(depth)} OPEN (Depth: ${depth}): ${line.trim()}`);
        }
    }
    
    for (let j=0; j < closes; j++) {
        if (depth === 1) {
            console.log(`[${i+1}] APP-CONTAINER CLOSED AT LINE ${i+1}!`);
            process.exit(0);
        }
        depth--;
        if (line.includes('<!-- End of sales-tab -->')) {
            console.log(`[${i+1}] ${'  '.repeat(depth)} CLOSED salezhub-tab (Depth: ${depth})`);
        }
    }
}
