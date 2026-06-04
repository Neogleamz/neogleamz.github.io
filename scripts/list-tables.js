const fs = require('fs');
const path = require('path');
const tables = new Set();
function scanDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            if (file !== 'node_modules' && file !== '.git' && file !== '.agents') scanDir(fullPath);
        } else if (file.endsWith('.js') || file.endsWith('.html')) {
            const content = fs.readFileSync(fullPath, 'utf8');
            const regex = /supabaseClient\.from\(['"`]([^'"`]+)['"`]\)/g;
            let match;
            while ((match = regex.exec(content)) !== null) {
                tables.add(match[1]);
            }
        }
    }
}
scanDir('.');
console.log(JSON.stringify(Array.from(tables).sort(), null, 2));
