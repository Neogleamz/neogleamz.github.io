const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname);
const targets = ['.js', '.html'];
const patterns = [
  { name: 'innerHTML assignment', regex: /\.innerHTML\s*=/g },
  { name: 'outerHTML assignment', regex: /\.outerHTML\s*=/g },
  { name: 'insertAdjacentHTML', regex: /insertAdjacentHTML\s*\(/g },
  { name: 'document.write', regex: /document\.write\s*\(/g },
  { name: 'eval usage', regex: /eval\s*\(/g }
];

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true })
    .flatMap((dirent) => {
      const res = path.join(dir, dirent.name);
      if (dirent.isDirectory()) {
        if (dirent.name === 'node_modules' || dirent.name === '.git') return [];
        return walk(res);
      }
      if (targets.includes(path.extname(res))) return [res];
      return [];
    });
}

function scanFile(filePath) {
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  const findings = [];
  lines.forEach((line, index) => {
    patterns.forEach((pattern) => {
      if (pattern.regex.test(line)) {
        findings.push({ line: index + 1, pattern: pattern.name, text: line.trim() });
      }
      pattern.regex.lastIndex = 0;
    });
  });
  return findings;
}

const files = walk(repoRoot);
let total = 0;
console.log('XSS Risk Scan');
console.log('==============');
files.forEach((file) => {
  const findings = scanFile(file);
  if (findings.length > 0) {
    total += findings.length;
    console.log(`\n${path.relative(repoRoot, file)}:`);
    findings.forEach((item) => {
      console.log(`  [${item.line}] ${item.pattern} -> ${item.text}`);
    });
  }
});
console.log(`\nTotal findings: ${total}`);
if (total === 0) {
  console.log('No risky DOM injection patterns found.');
}
