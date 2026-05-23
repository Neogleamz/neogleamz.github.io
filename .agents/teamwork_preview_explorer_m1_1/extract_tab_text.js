const fs = require('fs');
const html = fs.readFileSync('d:/GitHub/neogleamz.github.io/index.html', 'utf8');
const regex = /<button class=["']tab-btn[^>]*>([\s\S]*?)<\/button>/gi;
let m;
while ((m = regex.exec(html)) !== null) {
    console.log(m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
}
