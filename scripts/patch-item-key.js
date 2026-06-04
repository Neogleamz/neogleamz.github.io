const fs = require('fs');
const files = ['production-module.js', 'sales-module.js', 'print-module.js', 'barcodz-module.js', 'packerz-module.js'];
files.forEach(f => {
    let txt = fs.readFileSync('assets/js/' + f, 'utf8');
    let original = txt;
    // Replace item_key assignments with item_uuid
    txt = txt.replace(/item_key:\s*([a-zA-Z0-9_]+)/g, 'item_uuid: window.uuidMap[$1] || $1');
    if (txt !== original) {
        fs.writeFileSync('assets/js/' + f, txt);
        console.log(`Updated ${f}`);
    }
});
