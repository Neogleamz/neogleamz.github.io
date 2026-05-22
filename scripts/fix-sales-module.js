const fs = require('fs');
let code = fs.readFileSync('assets/js/sales-module.js', 'utf8');

// Replace innerHTML
code = code.replace(/\.innerHTML\s*(\+?=)\s*(.+);/g, (match, op, rhs) => {
    if (rhs.includes('window.safeHTML')) return match;
    return '.innerHTML ' + op + ' window.safeHTML(' + rhs + ');';
});

// Replace inline handlers
code = code.replace(/onfocus="storeOldVal\(this\)"/g, 'data-focus="focus_storeOldVal"');
code = code.replace(/onblur="updateSaleCell\(this,\s*'([^']+)',\s*'([^']+)',\s*'([^']+)',\s*(true|false)\)"/g, 'data-blur="blur_updateSaleCell" data-order="$1" data-sku="$2" data-col="$3" data-isnum="$4"');
code = code.replace(/onchange="updateSaleType\(this,\s*'([^']+)',\s*'([^']+)'\)"/g, 'data-change="change_updateSaleType" data-order="$1" data-sku="$2"');
code = code.replace(/onclick="renderSimulatorOrder\('([^']+)'\)"/g, 'data-click="click_renderSimulatorOrder" data-oid="$1"');

fs.writeFileSync('assets/js/sales-module.js', code);
console.log('Modifications applied.');
