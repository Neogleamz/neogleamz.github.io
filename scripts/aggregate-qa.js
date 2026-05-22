const fs = require('fs');
const path = require('path');

const reportsBaseDir = path.join(__dirname, '../.qa-reports');
const dirs = fs.readdirSync(reportsBaseDir).filter(f => fs.statSync(path.join(reportsBaseDir, f)).isDirectory());

// Sort by name descending (which works for ISO timestamps)
dirs.sort((a, b) => b.localeCompare(a));
const latestDir = path.join(reportsBaseDir, dirs[0]);

console.log(`Scanning latest QA run: ${dirs[0]}`);

const allIssues = new Set();
const resolutions = new Set();

function scanDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            scanDir(fullPath);
        } else if (file.endsWith('.md')) {
            const resMatch = file.match(/qa-report-(\d+x\d+)/);
            if (resMatch) resolutions.add(resMatch[1]);
            
            const content = fs.readFileSync(fullPath, 'utf8');
            const lines = content.split('\n');
            for (const line of lines) {
                if (line.includes('**Boundary Breach**') || 
                    line.includes('**Internal Overflow**') || 
                    line.includes('**CRITICAL**')) {
                    
                    const issue = line.replace(/^- \*\*[^*]+\*\*: /, '').trim();
                    if (issue) allIssues.add(issue);
                }
            }
        }
    }
}

scanDir(latestDir);

console.log(`Found ${allIssues.size} unique layout violations across ${resolutions.size} resolutions.`);
console.log('---');
Array.from(allIssues).sort().forEach(issue => console.log(issue));
