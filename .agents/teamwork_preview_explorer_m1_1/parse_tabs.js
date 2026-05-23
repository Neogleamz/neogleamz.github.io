const fs = require('fs');
const html = fs.readFileSync('d:/GitHub/neogleamz.github.io/index.html', 'utf8');

// Find all buttons or elements with id that contain 'tab'
const regex = /<([^>]+)\s+(id|class|data-[a-z]+)=["']([^"']*(?:hub|tab|modal|page|view)["'][^>]*)>/gi;
let m;
const lines = [];
while ((m = regex.exec(html)) !== null) {
    if (m[3].includes('modal') || m[3].includes('hub') || m[3].includes('tab')) {
        // extract the full tag to see its context
        lines.push(m[0]);
    }
}
fs.writeFileSync('tabs.txt', lines.join('\n'));
console.log('Wrote tabs to tabs.txt');
