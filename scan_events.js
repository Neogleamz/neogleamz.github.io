const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const regex = /\s+on[a-z]+="[^"]*"/gi;
const m = html.match(regex) || [];
console.log([...new Set(m.map(x=>x.trim()))].join('\n'));
