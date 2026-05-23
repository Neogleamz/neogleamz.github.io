const fs = require('fs');
const path = require('path');

let scriptContent = fs.readFileSync(path.resolve(__dirname, '../assets/js/labelz-module.js'), 'utf-8');

// just print the function exportLabelzPDF
const match = scriptContent.match(/window\.exportLabelzPDF = function\(\) \{[\s\S]*?\}/);
console.log(match ? match[0] : 'NOT FOUND');
