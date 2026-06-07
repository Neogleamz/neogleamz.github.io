const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../assets/js/system-tools-module.js');

let content = fs.readFileSync(file, 'utf8');

if (!content.includes('window.pingLocalEngine')) {
    content += `

// --- 14. LOCAL ENGINE & SANDBOX AUTOMATION ---
window.pingLocalEngine = async function() {
    let indicator = document.getElementById('engineStatusIndicator');
    let term = document.getElementById('engineTerminal');
    if(!indicator || !term) return;
    
    try {
        let res = await fetch('http://127.0.0.1:4000/api/sandbox/status');
        if (res.ok) {
            indicator.innerHTML = '> LOCAL_ENGINE: CONNECTED';
            indicator.style.color = '#a3e635';
            term.innerHTML += '<div>[' + new Date().toLocaleTimeString() + '] 🟢 Engine Ping Successful. Ready.</div>';
            
            let btnChaos = document.getElementById('btnChaosMonkey');
            if(btnChaos) btnChaos.disabled = false;
        }
    } catch (e) {
        indicator.innerHTML = '> LOCAL_ENGINE: DISCONNECTED';
        indicator.style.color = '#ef4444';
        term.innerHTML += '<div style="color:#ef4444">[' + new Date().toLocaleTimeString() + '] ❌ Engine not found. Did you run START_NEO_ENGINE.bat?</div>';
    }
    term.scrollTop = term.scrollHeight;
};

window.executeSandboxBackupStart = async function() {
    let term = document.getElementById('engineTerminal');
    if(!term) return;
    
    term.innerHTML += '<div>[' + new Date().toLocaleTimeString() + '] ⏳ Requesting Sandbox Backup & Start...</div>';
    term.scrollTop = term.scrollHeight;
    try {
        let res = await fetch('http://127.0.0.1:4000/api/sandbox/backup-and-start', { method: 'POST' });
        let data = await res.json();
        term.innerHTML += '<div>[' + new Date().toLocaleTimeString() + '] 🟢 ' + data.message + '</div>';
    } catch(e) {
        term.innerHTML += '<div style="color:#ef4444">[' + new Date().toLocaleTimeString() + '] ❌ Failed to contact engine. Check connection.</div>';
    }
    term.scrollTop = term.scrollHeight;
};

window.toggleSandboxMode = function() {
    let current = localStorage.getItem('neogleamz_sandbox_mode');
    if (current === 'true') {
        localStorage.setItem('neogleamz_sandbox_mode', 'false');
    } else {
        localStorage.setItem('neogleamz_sandbox_mode', 'true');
    }
    window.location.reload();
};

// Auto-run on load to set button text and auto-connect to engine if active
document.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem('neogleamz_sandbox_mode') === 'true') {
        let btn = document.getElementById('btnToggleSandboxMode');
        if(btn) {
            btn.innerHTML = '✅ EXIT SANDBOX MODE';
            btn.style.background = '#22c55e'; // turn green to exit
        }
        // Auto-ping engine since we are in sandbox mode!
        setTimeout(() => { if(window.pingLocalEngine) window.pingLocalEngine(); }, 1000);
    }
});

window.runChaosMonkey = function() {
    let term = document.getElementById('engineTerminal');
    if(!term) return;
    
    if (localStorage.getItem('neogleamz_sandbox_mode') !== 'true') {
        term.innerHTML += '<div style="color:#ef4444">[' + new Date().toLocaleTimeString() + '] ❌ QA Chaos Monkey CANNOT run in Production! Enable Sandbox Mode first!</div>';
        return;
    }
    
    term.innerHTML += '<div style="color:#f59e0b">[' + new Date().toLocaleTimeString() + '] 🐒 Chaos Monkey unleashed. Simulating UI interactions...</div>';
    term.scrollTop = term.scrollHeight;
    
    let clickables = Array.from(document.querySelectorAll('[data-click]'))
        .filter(el => {
            let act = el.getAttribute('data-click').toLowerCase();
            return !act.includes('delete') && !act.includes('export') && !act.includes('restore') && !act.includes('sync');
        });
        
    clickables = clickables.sort(() => 0.5 - Math.random()).slice(0, 20);
    
    let i = 0;
    let interval = setInterval(() => {
        if (i >= clickables.length) {
            clearInterval(interval);
            term.innerHTML += '<div style="color:#a3e635">[' + new Date().toLocaleTimeString() + '] 🟢 Chaos testing cycle complete. Check DB logs for UUID crashes.</div>';
            term.scrollTop = term.scrollHeight;
            return;
        }
        let el = clickables[i];
        let action = el.getAttribute('data-click');
        
        term.innerHTML += '<div style="color:#64748b">  ... Clicking target: ' + action + '</div>';
        term.scrollTop = term.scrollHeight;
        
        try {
            el.click();
        } catch(e) {
            term.innerHTML += '<div style="color:#ef4444">  ❌ Error on ' + action + ': ' + e.message + '</div>';
        }
        i++;
    }, 500);
};
`;
    fs.writeFileSync(file, content, 'utf8');
    console.log("Successfully appended to system-tools-module.js");
} else {
    // If it was already injected but had localhost:4000, replace it with 127.0.0.1:4000
    let updatedContent = content.replace(/localhost:4000/g, '127.0.0.1:4000');
    if (content !== updatedContent) {
        fs.writeFileSync(file, updatedContent, 'utf8');
        console.log("Successfully updated localhost to 127.0.0.1");
    } else {
        console.log("Already updated.");
    }
}
