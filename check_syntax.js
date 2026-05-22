const fs = require('fs');
const content = fs.readFileSync('qa-dashboard.html', 'utf8');
const script = content.match(/<script>([\s\S]*?)<\/script>/)[1];
const vm = require('vm');
try {
    new vm.Script(script);
    console.log('Syntax OK');
} catch (e) {
    console.error('Syntax Error:', e);
}
