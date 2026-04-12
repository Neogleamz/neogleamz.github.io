const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');

// Temporarily replace script blocks
const scripts = [];
html = html.replace(/<script[\s\S]*?<\/script>/gi, (match) => {
    scripts.push(match);
    return `__SCRIPT_BLOCK_${scripts.length - 1}__`;
});

const regex = /\s+on(click|change|mouseover|mouseout|input|focus|blur|keyup|mousedown|submit)="([^"]*)"/gi;

let eventMap = {};
let actionCounter = 1;

html = html.replace(regex, (match, eventName, code) => {
    eventName = eventName.toLowerCase();
    
    // Normalize code to create a clean action name
    let baseName = code.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_').substring(0, 30);
    if(baseName.startsWith('_')) baseName = baseName.substring(1);
    if(baseName.endsWith('_')) baseName = baseName.substring(0, baseName.length - 1);
    
    if(!baseName) baseName = `action_${actionCounter++}`;

    let actionName = `${eventName}_${baseName}`;
    
    // De-duplicate actions with exact same code
    let existingEntry = null;
    if (!eventMap[eventName]) eventMap[eventName] = {};
    
    for (const [key, val] of Object.entries(eventMap[eventName])) {
        if (val === code) {
            existingEntry = key;
            break;
        }
    }
    
    if (existingEntry) {
        actionName = existingEntry;
    } else {
        // Handle collisions
        while (eventMap[eventName][actionName] && eventMap[eventName][actionName] !== code) {
            actionName += `_${actionCounter++}`;
        }
        eventMap[eventName][actionName] = code;
    }

    return ` data-${eventName}="${actionName}"`;
});

// Restore script blocks
html = html.replace(/__SCRIPT_BLOCK_(\d+)__/g, (match, index) => {
    return scripts[index];
});

fs.writeFileSync('index.html', html, 'utf8');

let jsOutput = `
// ==========================================
// SYSTEM EVENT DELEGATOR
// Replaces inline HTML handlers per Native Vanilla DOM Rules
// ==========================================

import { sysLog } from './system-tools-module.js';

document.addEventListener('DOMContentLoaded', () => {
`;

for (const eventName of Object.keys(eventMap)) {
    // We use capturing wrapper for focus/blur for event delegation
    const useCapture = (eventName === 'focus' || eventName === 'blur') ? 'true' : 'false';
    
    jsOutput += `
    document.body.addEventListener('${eventName}', function(event) {
        const el = event.target.closest('[data-${eventName}]');
        if (!el) return;
        const action = el.getAttribute('data-${eventName}');
        
        try {
            switch(action) {
`;

    for (const [actionName, code] of Object.entries(eventMap[eventName])) {
        let safeCode = code;
        if (safeCode.includes('this.')) {
             safeCode = safeCode.replace(/this\./g, 'el.');
        } else if (safeCode.includes('this,')) {
             safeCode = safeCode.replace(/this,/g, 'el,');
        } else if (safeCode.includes('(this)')) {
             safeCode = safeCode.replace(/\(this\)/g, '(el)');
        }
        
        jsOutput += `                case '${actionName}':\n`;
        jsOutput += `                    ${safeCode};\n`;
        jsOutput += `                    break;\n`;
    }

    jsOutput += `            }
        } catch (error) {
            console.error(\`[Event Delegator] Error executing \${action} on \${eventName}:\`, error);
        }
    }, ${useCapture});
`;
}

jsOutput += `
});
`;

fs.writeFileSync('system-event-delegator.js', jsOutput, 'utf8');

console.log("SUCCESS: Replaced inline handlers and generated system-event-delegator.js");
