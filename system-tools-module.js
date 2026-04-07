// --- 12. PARSERS & FILE SYNC ---
function setModuleStatus(id, m, t) { try{let e=document.getElementById(id); e.innerText=m; e.className=`mod-status ${t}`;}catch(x){} }

// Global Configuration Object for RegEx Settings
const DEFAULT_PARSER_RULES = {
    regexOrderNum: "DO\\d+",
    regexOrderDate: "\\d{4}-\\d{2}-\\d{2}",
    regexOrderTotal: "Total Amount:.*?[￥$]\\s*([\\d.]+)",
    regexPostage: "Postage Inclusive:.*?[￥$]\\s*([\\d.]+)",
    regexMakeup: "\\(Make up[：:]\\s*(?:US\\s*\\$|CN\\s*￥)\\s*([\\d.]+)\\)",
    regexLineItemNum: "DI\\d{11}",
    regexUnitPrice: "(?:US \\$|CN ￥)\\s*([\\d.]+)",
    regexSpecs: "(?:Specification model|specification|Product specifications|model|Color|size|power|Light color|Applicable Model)[：:]\\s*([^\\n\\t\\r]+)"
};
const DEFAULT_PARCEL_RULES = {
    regexParcelNum: "PN\\d{11}",
    regexActualPaid: "Actual Paid\\s*:\\s*US \\$\\s*([\\d.]+)",
    regexChargeableWeight: "Actual Chargeable Weight\\s*(\\d+)\\s*g",
    regexFeeStructure: "{FEE_NAME}\\s*(?:US \\$|CN ￥)\\s*([\\d.]+)",
    regexDeductionStructure: "{FEE_NAME}\\s*-\\s*(?:US \\$|CN ￥)\\s*([\\d.]+)",
    regexLineItemNum: "DI\\d{11}",
    regexSpecs: "(?:specification|Color|model|Product specifications|Specification model|size|power|Light color|Applicable Model)[：:]\\s*(.*)"
};

window.PARSER_PROFILES = [];
window.ACTIVE_PROFILE_INDEX = 0;
window.PARSER_RULES = null;

window.PARCEL_PROFILES = [];
window.ACTIVE_PARCEL_PROFILE_INDEX = 0;
window.PARCEL_RULES = null;

window.loadParserConfig = function() {
    try {
        let stored = localStorage.getItem('neogleamz_parser_profiles');
        if (stored) {
            let data = JSON.parse(stored);
            window.PARSER_PROFILES = data.profiles || [{name: "Factory Default", rules: {...DEFAULT_PARSER_RULES}}];
            window.ACTIVE_PROFILE_INDEX = data.active !== undefined ? data.active : 0;
            if(!window.PARSER_PROFILES[window.ACTIVE_PROFILE_INDEX]) window.ACTIVE_PROFILE_INDEX = 0;
            window.PARSER_RULES = window.PARSER_PROFILES[window.ACTIVE_PROFILE_INDEX].rules;
        } else {
            let oldStorage = localStorage.getItem('neogleamz_parser_rules');
            if (oldStorage) {
                window.PARSER_PROFILES = [
                    {name: "Factory Default", rules: {...DEFAULT_PARSER_RULES}},
                    {name: "Legacy Custom Profile", rules: JSON.parse(oldStorage)}
                ];
                window.ACTIVE_PROFILE_INDEX = 1;
                window.PARSER_RULES = window.PARSER_PROFILES[1].rules;
            } else {
                window.PARSER_PROFILES = [{name: "Factory Default", rules: {...DEFAULT_PARSER_RULES}}];
                window.ACTIVE_PROFILE_INDEX = 0;
                window.PARSER_RULES = window.PARSER_PROFILES[0].rules;
            }
        }
    } catch(e) {
        window.PARSER_PROFILES = [{name: "Factory Default", rules: {...DEFAULT_PARSER_RULES}}];
        window.ACTIVE_PROFILE_INDEX = 0;
        window.PARSER_RULES = window.PARSER_PROFILES[0].rules;
    }
};

window.saveStorageProfiles = function() {
    localStorage.setItem('neogleamz_parser_profiles', JSON.stringify({
        active: window.ACTIVE_PROFILE_INDEX,
        profiles: window.PARSER_PROFILES
    }));
};

window.getCurrentUIRules = function() {
    return {
        regexOrderNum: document.getElementById('regexOrderNum').value.trim(),
        regexOrderDate: document.getElementById('regexOrderDate').value.trim(),
        regexOrderTotal: document.getElementById('regexOrderTotal').value.trim(),
        regexPostage: document.getElementById('regexPostage').value.trim(),
        regexMakeup: document.getElementById('regexMakeup').value.trim(),
        regexLineItemNum: document.getElementById('regexLineItemNum').value.trim(),
        regexUnitPrice: document.getElementById('regexUnitPrice').value.trim(),
        regexSpecs: document.getElementById('regexSpecs').value.trim()
    };
};

window.openParserConfig = function() {
    if(!window.PARSER_RULES) loadParserConfig();
    document.getElementById('regexOrderNum').value = window.PARSER_RULES.regexOrderNum || "";
    document.getElementById('regexOrderDate').value = window.PARSER_RULES.regexOrderDate || "";
    document.getElementById('regexOrderTotal').value = window.PARSER_RULES.regexOrderTotal || "";
    document.getElementById('regexPostage').value = window.PARSER_RULES.regexPostage || "";
    document.getElementById('regexMakeup').value = window.PARSER_RULES.regexMakeup || "";
    document.getElementById('regexLineItemNum').value = window.PARSER_RULES.regexLineItemNum || "";
    document.getElementById('regexUnitPrice').value = window.PARSER_RULES.regexUnitPrice || "";
    document.getElementById('regexSpecs').value = window.PARSER_RULES.regexSpecs || "";
    document.getElementById('liveRegexPlaygroundPayload').value = window.__LATEST_RAW_ORDER_DUMP || "";
    document.getElementById('parserConfigModal').style.display = 'flex';
    window.renderPresetDropdown();
    window.evaluateAllRegex();
};

window.renderPresetDropdown = function() {
    let sel = document.getElementById('regexPresetSelect');
    if(!sel) return;
    sel.innerHTML = "";
    window.PARSER_PROFILES.forEach((p, idx) => {
        let opt = document.createElement('option');
        opt.value = idx; opt.innerText = p.name;
        if(idx === window.ACTIVE_PROFILE_INDEX) opt.selected = true;
        sel.appendChild(opt);
    });
    
    let btnDelete = document.getElementById('btnDeletePreset');
    let btnOver = document.getElementById('btnOverwritePreset');
    if (window.ACTIVE_PROFILE_INDEX === 0) {
        if(btnDelete) btnDelete.style.display = 'none';
        if(btnOver) btnOver.style.display = 'none';
    } else {
        if(btnDelete) btnDelete.style.display = 'inline-block';
        if(btnOver) btnOver.style.display = 'inline-block';
    }
};

window.closeParserConfig = function() { document.getElementById('parserConfigModal').style.display = 'none'; };

window.loadSelectedRegexPreset = function() {
    let sel = document.getElementById('regexPresetSelect');
    window.ACTIVE_PROFILE_INDEX = parseInt(sel.value);
    window.PARSER_RULES = window.PARSER_PROFILES[window.ACTIVE_PROFILE_INDEX].rules;
    window.saveStorageProfiles();
    window.openParserConfig();
};

window.saveRegexPresetAsNew = function() {
    let name = prompt("Enter a name for this new Extraction Profile:");
    if(!name || name.trim() === "") return;
    window.PARSER_PROFILES.push({name: name.trim(), rules: window.getCurrentUIRules()});
    window.ACTIVE_PROFILE_INDEX = window.PARSER_PROFILES.length - 1;
    window.PARSER_RULES = window.PARSER_PROFILES[window.ACTIVE_PROFILE_INDEX].rules;
    window.saveStorageProfiles();
    window.renderPresetDropdown();
    alert(`Successfully saved new profile: ${name}`);
};

window.overwriteCurrentRegexPreset = function() {
    if(window.ACTIVE_PROFILE_INDEX === 0) { alert("Cannot overwrite the Factory Default profile."); return; }
    let cur = window.PARSER_PROFILES[window.ACTIVE_PROFILE_INDEX];
    if(confirm(`Overwrite profile [ ${cur.name} ] with the current visual rules?`)) {
        cur.rules = window.getCurrentUIRules();
        window.PARSER_RULES = cur.rules;
        window.saveStorageProfiles();
        alert(`Profile [ ${cur.name} ] automatically updated!`);
    }
};

window.deleteRegexPreset = function() {
    if(window.ACTIVE_PROFILE_INDEX === 0) { alert("Factory Default cannot be deleted."); return; }
    let cur = window.PARSER_PROFILES[window.ACTIVE_PROFILE_INDEX];
    if(confirm(`DANGER: Are you sure you want to completely erase the [ ${cur.name} ] profile?`)) {
        window.PARSER_PROFILES.splice(window.ACTIVE_PROFILE_INDEX, 1);
        window.ACTIVE_PROFILE_INDEX = 0; // fallback to default
        window.PARSER_RULES = window.PARSER_PROFILES[0].rules;
        window.saveStorageProfiles();
        window.openParserConfig();
    }
};

window.__LATEST_RAW_ORDER_DUMP = "";

window.evaluateAllRegex = function() {
    const ids = ['regexOrderNum', 'regexOrderDate', 'regexOrderTotal', 'regexPostage', 'regexMakeup', 'regexLineItemNum', 'regexUnitPrice', 'regexSpecs'];
    ids.forEach(id => window.evaluateLiveRegex(id));
};

window.evaluateLiveRegex = function(id) {
    let inputStr = document.getElementById(id).value;
    let targetTxt = document.getElementById('liveRegexPlaygroundPayload').value;
    let badge = document.getElementById('eval_' + id);
    
    if(!badge) return;

    if(!inputStr || inputStr.trim() === "") {
        badge.innerText = "Empty Rule"; badge.style.color = "#cbd5e1"; return;
    }
    
    try {
        let regex = new RegExp(inputStr, "i");
        let match = targetTxt.match(regex);
        
        if(match) {
            let result = match[1] !== undefined ? match[1] : match[0];
            badge.innerText = `Result: [ ${result} ]`;
            badge.style.color = "#10b981"; // green
        } else {
            badge.innerText = "NO MATCH";
            badge.style.color = "#ef4444"; // red
        }
    } catch(e) {
        badge.innerText = "SYNTAX ERR";
        badge.style.color = "#ef4444";
    }
};

// Bootstrap Configuration
loadParserConfig();

window.loadParcelConfig = function() {
    try {
        let stored = localStorage.getItem('neogleamz_parcel_profiles');
        if (stored) {
            let data = JSON.parse(stored);
            window.PARCEL_PROFILES = data.profiles || [{name: "Factory Default", rules: {...DEFAULT_PARCEL_RULES}}];
            window.ACTIVE_PARCEL_PROFILE_INDEX = data.active !== undefined ? data.active : 0;
            if(!window.PARCEL_PROFILES[window.ACTIVE_PARCEL_PROFILE_INDEX]) window.ACTIVE_PARCEL_PROFILE_INDEX = 0;
            window.PARCEL_RULES = window.PARCEL_PROFILES[window.ACTIVE_PARCEL_PROFILE_INDEX].rules;
        } else {
            window.PARCEL_PROFILES = [{name: "Factory Default", rules: {...DEFAULT_PARCEL_RULES}}];
            window.ACTIVE_PARCEL_PROFILE_INDEX = 0;
            window.PARCEL_RULES = window.PARCEL_PROFILES[0].rules;
        }
    } catch(e) {
        window.PARCEL_PROFILES = [{name: "Factory Default", rules: {...DEFAULT_PARCEL_RULES}}];
        window.ACTIVE_PARCEL_PROFILE_INDEX = 0;
        window.PARCEL_RULES = window.PARCEL_PROFILES[0].rules;
    }
};

window.saveParcelProfiles = function() {
    localStorage.setItem('neogleamz_parcel_profiles', JSON.stringify({
        active: window.ACTIVE_PARCEL_PROFILE_INDEX,
        profiles: window.PARCEL_PROFILES
    }));
};

window.getCurrentParcelUIRules = function() {
    return {
        regexParcelNum: document.getElementById('regexParcelNum').value.trim(),
        regexActualPaid: document.getElementById('regexActualPaid').value.trim(),
        regexChargeableWeight: document.getElementById('regexChargeableWeight').value.trim(),
        regexFeeStructure: document.getElementById('regexFeeStructure').value.trim(),
        regexDeductionStructure: document.getElementById('regexDeductionStructure').value.trim(),
        regexLineItemNum: document.getElementById('regexParcelLineItemNum').value.trim(),
        regexSpecs: document.getElementById('regexParcelSpecs').value.trim()
    };
};

window.openParcelConfig = function() {
    if(!window.PARCEL_RULES) loadParcelConfig();
    document.getElementById('regexParcelNum').value = window.PARCEL_RULES.regexParcelNum || "";
    document.getElementById('regexActualPaid').value = window.PARCEL_RULES.regexActualPaid || "";
    document.getElementById('regexChargeableWeight').value = window.PARCEL_RULES.regexChargeableWeight || "";
    document.getElementById('regexFeeStructure').value = window.PARCEL_RULES.regexFeeStructure || "";
    document.getElementById('regexDeductionStructure').value = window.PARCEL_RULES.regexDeductionStructure || "";
    document.getElementById('regexParcelLineItemNum').value = window.PARCEL_RULES.regexLineItemNum || "";
    document.getElementById('regexParcelSpecs').value = window.PARCEL_RULES.regexSpecs || "";
    document.getElementById('liveParcelRegexPlaygroundPayload').value = window.__LATEST_RAW_PARCEL_DUMP || "";
    document.getElementById('parcelConfigModal').style.display = 'flex';
    window.renderParcelPresetDropdown();
    window.evaluateAllParcelRegex();
};

window.renderParcelPresetDropdown = function() {
    let sel = document.getElementById('parcelPresetSelect');
    if(!sel) return;
    sel.innerHTML = "";
    window.PARCEL_PROFILES.forEach((p, idx) => {
        let opt = document.createElement('option');
        opt.value = idx; opt.innerText = p.name;
        if(idx === window.ACTIVE_PARCEL_PROFILE_INDEX) opt.selected = true;
        sel.appendChild(opt);
    });
    
    let btnDelete = document.getElementById('btnDeleteParcelPreset');
    let btnOver = document.getElementById('btnOverwriteParcelPreset');
    if (window.ACTIVE_PARCEL_PROFILE_INDEX === 0) {
        if(btnDelete) btnDelete.style.display = 'none';
        if(btnOver) btnOver.style.display = 'none';
    } else {
        if(btnDelete) btnDelete.style.display = 'inline-block';
        if(btnOver) btnOver.style.display = 'inline-block';
    }
};

window.closeParcelConfig = function() { document.getElementById('parcelConfigModal').style.display = 'none'; };

window.loadSelectedParcelRegexPreset = function() {
    let sel = document.getElementById('parcelPresetSelect');
    window.ACTIVE_PARCEL_PROFILE_INDEX = parseInt(sel.value);
    window.PARCEL_RULES = window.PARCEL_PROFILES[window.ACTIVE_PARCEL_PROFILE_INDEX].rules;
    window.saveParcelProfiles();
    window.openParcelConfig();
};

window.saveParcelRegexPresetAsNew = function() {
    let name = prompt("Enter a name for this new Parcel Extraction Profile:");
    if(!name || name.trim() === "") return;
    window.PARCEL_PROFILES.push({name: name.trim(), rules: window.getCurrentParcelUIRules()});
    window.ACTIVE_PARCEL_PROFILE_INDEX = window.PARCEL_PROFILES.length - 1;
    window.PARCEL_RULES = window.PARCEL_PROFILES[window.ACTIVE_PARCEL_PROFILE_INDEX].rules;
    window.saveParcelProfiles();
    window.renderParcelPresetDropdown();
    alert(`Successfully saved new profile: ${name}`);
};

window.overwriteCurrentParcelRegexPreset = function() {
    if(window.ACTIVE_PARCEL_PROFILE_INDEX === 0) { alert("Cannot overwrite the Factory Default profile."); return; }
    let cur = window.PARCEL_PROFILES[window.ACTIVE_PARCEL_PROFILE_INDEX];
    if(confirm(`Overwrite profile [ ${cur.name} ] with the current visual rules?`)) {
        cur.rules = window.getCurrentParcelUIRules();
        window.PARCEL_RULES = cur.rules;
        window.saveParcelProfiles();
        alert(`Profile [ ${cur.name} ] automatically updated!`);
    }
};

window.deleteParcelRegexPreset = function() {
    if(window.ACTIVE_PARCEL_PROFILE_INDEX === 0) { alert("Factory Default cannot be deleted."); return; }
    let cur = window.PARCEL_PROFILES[window.ACTIVE_PARCEL_PROFILE_INDEX];
    if(confirm(`DANGER: Are you sure you want to completely erase the [ ${cur.name} ] profile?`)) {
        window.PARCEL_PROFILES.splice(window.ACTIVE_PARCEL_PROFILE_INDEX, 1);
        window.ACTIVE_PARCEL_PROFILE_INDEX = 0; // fallback to default
        window.PARCEL_RULES = window.PARCEL_PROFILES[0].rules;
        window.saveParcelProfiles();
        window.openParcelConfig();
    }
};

window.__LATEST_RAW_PARCEL_DUMP = "";

window.evaluateAllParcelRegex = function() {
    const ids = ['regexParcelNum', 'regexActualPaid', 'regexChargeableWeight', 'regexFeeStructure', 'regexDeductionStructure', 'regexParcelLineItemNum', 'regexParcelSpecs'];
    ids.forEach(id => window.evaluateLiveParcelRegex(id));
};

window.evaluateLiveParcelRegex = function(id) {
    let inputStr = document.getElementById(id).value;
    let targetTxt = document.getElementById('liveParcelRegexPlaygroundPayload').value;
    let badge = document.getElementById('eval_' + id);
    
    if(!badge) return;

    if(!inputStr || inputStr.trim() === "") {
        badge.innerText = "Empty Rule"; badge.style.color = "#cbd5e1"; return;
    }
    
    try {
        let regexStr = inputStr;
        if(id === 'regexFeeStructure' || id === 'regexDeductionStructure') {
             regexStr = regexStr.replace("{FEE_NAME}", "Actual Shipping Fee"); // test interpolation
        }
        let regex = new RegExp(regexStr, "i");
        let match = targetTxt.match(regex);
        
        if(match) {
            let result = match[1] !== undefined ? match[1] : match[0];
            badge.innerText = `Result: [ ${result} ]`;
            badge.style.color = "#10b981"; // green
        } else {
            badge.innerText = "NO MATCH";
            badge.style.color = "#ef4444"; // red
        }
    } catch(e) {
        badge.innerText = "SYNTAX ERR";
        badge.style.color = "#ef4444";
    }
};

loadParcelConfig();

// Safe event listener binding (Production)
const orderFilesEl = document.getElementById('orderFiles');
if (orderFilesEl) orderFilesEl.addEventListener('change', async(e)=>{if(e.target.files.length>0) await runFileImport(e.target, 'orders', false);});
const parcelFilesEl = document.getElementById('parcelFiles');
if (parcelFilesEl) parcelFilesEl.addEventListener('change', async(e)=>{if(e.target.files.length>0) await runFileImport(e.target, 'parcels', false);});

// Safe event listener binding (Sandbox Test Mode)
const orderFilesTestEl = document.getElementById('orderFilesTest');
if (orderFilesTestEl) orderFilesTestEl.addEventListener('change', async(e)=>{if(e.target.files.length>0) await runFileImport(e.target, 'orders', true);});
const parcelFilesTestEl = document.getElementById('parcelFilesTest');
if (parcelFilesTestEl) parcelFilesTestEl.addEventListener('change', async(e)=>{if(e.target.files.length>0) await runFileImport(e.target, 'parcels', true);});

// Global Sandbox Visualization Engine
window.__sandboxData = [];
window.__sandboxSortCol = null;
window.__sandboxSortAsc = true;
window.__sandboxTitle = "";

window.openSandboxModal = function(payload, title) {
    window.__sandboxData = payload && payload.length ? [...payload] : [];
    window.__sandboxTitle = title || "data_payload";
    window.__sandboxSortCol = null;
    window.__sandboxSortAsc = true;
    window._renderSandboxModal();
    document.getElementById('sandboxDataModal').style.display = 'flex';
};

window.sortSandboxModal = function(col) {
    if(!window.__sandboxData || !window.__sandboxData.length) return;
    if (window.__sandboxSortCol === col) {
        window.__sandboxSortAsc = !window.__sandboxSortAsc;
    } else {
        window.__sandboxSortCol = col;
        window.__sandboxSortAsc = true;
    }
    
    window.__sandboxData.sort((a,b) => {
        let v1 = a[col]; let v2 = b[col];
        if(typeof v1 === 'string') v1 = v1.toLowerCase();
        if(typeof v2 === 'string') v2 = v2.toLowerCase();
        if (v1 < v2) return window.__sandboxSortAsc ? -1 : 1;
        if (v1 > v2) return window.__sandboxSortAsc ? 1 : -1;
        return 0;
    });
    
    window._renderSandboxModal();
};

window._renderSandboxModal = function() {
    let payload = window.__sandboxData;
    document.getElementById('sandboxModalTitle').innerText = window.__sandboxTitle;
    let body = document.getElementById('sandboxModalBody');
    if (!payload || payload.length === 0) {
        body.innerHTML = "<div style='color:#ef4444; font-weight:bold;'>Error: Evaluated payload array is physically empty.</div>";
    } else {
        let cols = Object.keys(payload[0] || {});
        let h = `<table style="width:100%; text-align:left; border-collapse:collapse; white-space:nowrap;">`;
        h += `<thead><tr>`;
        cols.forEach(c => {
            let indicator = window.__sandboxSortCol === c ? (window.__sandboxSortAsc ? " <span style='color:#fff;'>▲</span>" : " <span style='color:#fff;'>▼</span>") : "";
            h += `<th onclick="window.sortSandboxModal('${c}')" style="padding:10px 15px; border-bottom:2px solid rgba(245,158,11,0.5); color:#f59e0b; position:sticky; top:0; background:var(--bg-panel); text-transform:uppercase; font-size:10px; letter-spacing:1px; cursor:pointer;" title="Sort by ${c}">${c}${indicator}</th>`;
        });
        h += `</tr></thead><tbody>`;
        payload.forEach(row => {
            h += `<tr>`;
            cols.forEach(c => {
                let rawVal = row[c];
                let val = typeof rawVal === 'object' && rawVal !== null ? JSON.stringify(rawVal) : String(rawVal === undefined || rawVal === null ? "" : rawVal);
                h += `<td style="padding:8px 15px; border-bottom:1px solid rgba(255,255,255,0.05); color:#cbd5e1; font-family:monospace; max-width:250px; overflow:hidden; text-overflow:ellipsis;">${val}</td>`
            });
            h += `</tr>`;
        });
        h += `</tbody></table>`;
        body.innerHTML = h;
    }
};

function importTrace(msg, isErr=false, termId='importzProgressTerminal') {
    let t = document.getElementById(termId);
    if(t) {
        let line = document.createElement('div');
        line.style.color = isErr ? '#ef4444' : (termId === 'importzProgressTerminal' ? '#38bdf8' : '#f59e0b');
        line.style.paddingBottom = '3px';
        line.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
        line.innerText = `> ${msg}`;
        t.appendChild(line);
        t.parentElement.scrollTop = t.parentElement.scrollHeight;
    }
}

async function runFileImport(inputNode, type, isTestMode = false) {
    if(!inputNode.files.length) return;
    
    // Safety check interceptor: Prevents accidental live production imports while experimental mathematical constraints are active in RAM
    if (!isTestMode) {
        if (type === 'orders') {
            let isNotDefault = window.ACTIVE_PROFILE_INDEX !== 0;
            let currentStr = JSON.stringify(window.PARSER_RULES || {});
            let defaultStr = JSON.stringify((window.PARSER_PROFILES && window.PARSER_PROFILES[0]) ? window.PARSER_PROFILES[0].rules : window.DEFAULT_PARSER_RULES);
            if (isNotDefault || currentStr !== defaultStr) {
                 let safe = confirm("⚠️ SECURITY INTERCEPT ⚠️\n\nYou are attempting to execute a LIVE Database Import using a Custom or Temporary RegEx Extraction Profile!\n\nIf you proceed, this experimental logic will be permanently written to the raw production Supabase database tables.\n\nAre you ABSOLUTELY sure you want to run this experimental code against live data?");
                 if(!safe) { inputNode.value = ""; return; }
            }
        } else if (type === 'parcels') {
            let isNotDefault = window.ACTIVE_PARCEL_PROFILE_INDEX !== 0;
            let currentStr = JSON.stringify(window.PARCEL_RULES || {});
            let defaultStr = JSON.stringify((window.PARCEL_PROFILES && window.PARCEL_PROFILES[0]) ? window.PARCEL_PROFILES[0].rules : window.DEFAULT_PARCEL_RULES);
            if (isNotDefault || currentStr !== defaultStr) {
                 let safe = confirm("⚠️ SECURITY INTERCEPT ⚠️\n\nYou are attempting to execute a LIVE Parcel Database Import using a Custom RegEx Profile!\n\nIf you proceed, this experimental logic will be permanently written to the raw production Supabase database tables.\n\nAre you ABSOLUTELY sure you want to run this experimental code against live data?");
                 if(!safe) { inputNode.value = ""; return; }
            }
        }
    }
    
    let termId = type === 'orders' ? 'importzProgressTerminal' : 'parcelzProgressTerminal';
    let term = document.getElementById(termId); if(term) term.innerHTML = "";
    
    importTrace(`INITIALIZING IMPORT PROTOCOL: [${type.toUpperCase()}]`, false, termId);
    if(isTestMode) importTrace(`🧪 DRY RUN SANDBOX ENGAGED: Bypassing Supabase Connection.`, false, termId);
    importTrace(`Loaded ${inputNode.files.length} payload file(s) into memory matrix.`, false, termId);
    let statId = type === 'orders' ? 'statusOrders' : 'statusParcels';
    setSysProgress(20, 'working'); setModuleStatus(statId, "⏳ Parsing...", "mod-working"); inputNode.disabled = true;
    try {
        let resObj = type === 'orders' ? await extractOrders(inputNode.files, isTestMode) : await extractParcels(inputNode.files);
        if (resObj.count > 0) {
            importTrace(`Data successfully extracted globally! Detected ${resObj.count} valid dictionary instances.`, false, termId);
            
            if (isTestMode) {
                importTrace(`🧪 SANDBOX INTERCEPT: Array diverted directly to visual inspector.`, true, termId);
                setSysProgress(100, 'success'); setModuleStatus(statId, "🧪 Test Parsed!", "mod-success"); 
                
                // Show modal overlay via helper function
                if (typeof window.openSandboxModal === 'function') {
                    let targetArray = resObj.data2 ? resObj.data2 : resObj.data;
                    window.openSandboxModal(targetArray, `SANDBOX_${type.toUpperCase()}_RESULTS`);
                }
                
                inputNode.value = ""; 
                setTimeout(()=> { setModuleStatus(statId, "Ready.", "status-idle"); setSysProgress(0,'working'); }, 3000);
                inputNode.disabled = false;
                return;
            }

            importTrace(`Transmitting [${resObj.table}] insertion payload -> supabaseClient...`, false, termId);
            sysLog(`Pushing ${resObj.count} items...`); setSysProgress(80, 'working');
            const {error} = await supabaseClient.from(resObj.table).upsert(resObj.data, {onConflict: resObj.conflict}); if(error) throw new Error(error.message);
            if (resObj.data2) { 
                importTrace(`Secondary relation payload found! Transmitting [${resObj.table2}] insertion payload...`, false, termId);
                const {error2} = await supabaseClient.from(resObj.table2).upsert(resObj.data2, {onConflict: resObj.conflict2}); if(error2) throw new Error(error2.message); 
            }
            importTrace(`Upload Cycle Completed Successfully! Local data sync triggered.`, false, termId);
            setSysProgress(100, 'success'); setModuleStatus(statId, `✅ Synced!`, 'mod-success'); inputNode.value = ""; setTimeout(()=>{setSysProgress(0,'working');syncAndCalculate();}, 1000);
        } else { 
            importTrace(`HALT WARNING: Zero valid DOM items located in the payload targets.`, true, termId);
            setSysProgress(100, 'error'); setModuleStatus(statId, "❌ No data.", "mod-error"); setTimeout(()=>setSysProgress(0,'working'),3000); 
        }
    } catch(e) { 
        importTrace(`CRITICAL FAULT: ${e.message}`, true, termId);
        sysLog(e.message, true); setSysProgress(100, 'error'); setModuleStatus(statId, "❌ Error.", "mod-error"); setTimeout(()=>setSysProgress(0,'working'),3000); 
    }
    inputNode.disabled = false;
}

async function extractOrders(files, isTestMode=false) {
    let a = [];
    for(let f of files) {
        const d = new DOMParser().parseFromString(await f.text(), 'text/html');
        let validBlocks = Array.from(d.querySelectorAll('tbody, table, .order-list-item')).filter(el=>el.innerText.includes("Order No：") || el.innerText.match(new RegExp(window.PARSER_RULES.regexOrderNum)));
        
        if (isTestMode && validBlocks.length > 0) {
            window.__LATEST_RAW_ORDER_DUMP = validBlocks.map((b, idx) => {
                let cleaned = b.innerText.split('\n').map(l=>l.trim()).filter(l=>l.length>0).join('\n');
                return `[📦 ORDER INSTANCE ${idx + 1}]\n---------------------------------------\n` + cleaned;
            }).join('\n\n\n');
        }

        validBlocks.forEach(b => {
            let bt = b.innerText; 
            let oNo = (bt.match(new RegExp(window.PARSER_RULES.regexOrderNum))||["N/A"])[0]; 
            let dt = (bt.match(new RegExp(window.PARSER_RULES.regexOrderDate))||[""])[0]; 
            
            let tMatch = bt.match(new RegExp(window.PARSER_RULES.regexOrderTotal, "i"));
            let oTot = tMatch ? parseFloat(tMatch[1]) : 0; 
            
            let pMatch = bt.match(new RegExp(window.PARSER_RULES.regexPostage, "i"));
            let post = pMatch ? parseFloat(pMatch[1]) : 0;
            
            let mMatch = bt.match(new RegExp(window.PARSER_RULES.regexMakeup, "i"));
            let makeup = mMatch ? parseFloat(mMatch[1]) : 0;
            oTot += makeup; // Dynamically folds Make Up fee directly into the distributive Order Total
            
            let trs = Array.from(b.querySelectorAll('tr')).filter(r=>r.innerText.match(new RegExp(window.PARSER_RULES.regexLineItemNum)));  
            let tq=0; let tBaseCost = 0;
            
            trs.forEach(r=>{ 
                let cs=r.querySelectorAll('td'); 
                if(cs.length>=3) { 
                    let q = parseInt(cs[2].innerText.replace(/[^0-9]/g,''))||1; 
                    let upMatch = r.innerText.match(new RegExp(window.PARSER_RULES.regexUnitPrice)); 
                    let up = upMatch ? parseFloat(upMatch[1]) : 0; 
                    tq += q; tBaseCost += (up * q); 
                } 
            });
            
            tBaseCost += makeup; // Make up fees explicitly inflate the known physical baseline goods cost
            
            let hiddenFee = oTot - tBaseCost; if (hiddenFee < 0) hiddenFee = 0; let feePerItem = tq > 0 ? (hiddenFee / tq) : 0;
            
            trs.forEach(r => {
                let m = r.innerText.match(new RegExp(window.PARSER_RULES.regexLineItemNum)); 
                if(m && !r.innerText.includes("Order No：")){
                    let id = m[0], pn = ""; 
                    for (let l of Array.from(r.querySelectorAll('a'))) {
                        let t = l.getAttribute('title'), x = l.innerText.trim();
                        if (t && t.length > 10) { pn = t; break; }
                        if (x && x.length > 15 && !x.includes("DI26") && !x.toLowerCase().includes("superbuy") && !x.toLowerCase().includes("contact")) { pn = x; break; }
                    }
                    if(!pn || pn.toLowerCase().includes("product-img")) Array.from(r.querySelectorAll('img')).forEach(i=>{let a=i.getAttribute('alt'); if(a&&a.length>10&&!a.includes("代购商品")){pn=a;return;}});
                    
                    pn = pn.replace('代购商品','').trim(); 
                    
                    let sm = r.innerText.match(new RegExp(window.PARSER_RULES.regexSpecs, "i"));
                    let sp = sm && sm[1] ? sm[1].trim() : "";
                    
                    if(sp && pn.includes(sp)) pn=pn.replace(sp,'').trim(); 
                    pn=pn.replace(/[-\s,：:]+$/,'').trim();
                    
                    let tId = r.innerText.match(/(?:ALIBABA|TB|Order):([\d-]+)/i)?r.innerText.match(/(?:ALIBABA|TB|Order):([\d-]+)/i)[1]:""; 
                    
                    let upM = r.innerText.match(new RegExp(window.PARSER_RULES.regexUnitPrice)); 
                    let up = upM ? parseFloat(upM[1]) : 0; 
                    
                    // USER REQUEST: Fold the invoice logic directly into the raw unit_price baseline
                    up = up + (tq > 0 ? (makeup / tq) : 0);
                    
                    let q = parseInt(r.querySelectorAll('td')[2]?.innerText.replace(/[^0-9]/g,''))||1;
                    let uclp = up + feePerItem;
                    
                    a.push({di_item_id:id, order_date:dt, order_no:oNo, alibaba_order:tId, item_name:pn, specification:sp, unit_price:parseFloat(up.toFixed(4)), quantity:q, postage:post, order_total:oTot, unit_china_landed_price:parseFloat(uclp.toFixed(4))});
                }
            });
        });
    } return { count: a.length, table: 'raw_orders', conflict: 'di_item_id', data: a };
}

async function extractParcels(files) {
    let sum=[], itm=[];
    for(let f of files) {
        const d = new DOMParser().parseFromString(await f.text(), 'text/html'); const bt = d.body.textContent.replace(/\s+/g,' ');
        let pm = bt.match(new RegExp(window.PARCEL_RULES.regexParcelNum, "i")); if(!pm) continue; let pNo = pm[0];
        window.__LATEST_RAW_PARCEL_DUMP = bt; // Cache for Sandbox test engine
        let am = bt.match(new RegExp(window.PARCEL_RULES.regexActualPaid, "i")); if(!am) continue; let aP = parseFloat(am[1]); 
        let ab = bt.substring(bt.indexOf(am[0]) + am[0].length);
        let awMatch = ab.match(new RegExp(window.PARCEL_RULES.regexChargeableWeight, "i")); let aW = awMatch ? parseInt(awMatch[1]) : 0;
        
        let xc = (n, isD=false) => { 
            let rule = isD ? window.PARCEL_RULES.regexDeductionStructure : window.PARCEL_RULES.regexFeeStructure;
            rule = rule.replace("{FEE_NAME}", n);
            let m = ab.match(new RegExp(rule, 'i')); return m ? parseFloat(m[1]) : 0; 
        };
        
        sum.push({ parcel_no:pNo, actual_paid:aP, actual_chargeable_weight_g:aW, actual_shipping_fee:xc("Actual Shipping Fee"), first_tier_cost:xc("1st"), second_tier_cost:xc("2nd"), custom_clearance_fee:xc("Custom Clearance Fee"), remote_area_surcharge:xc("Remote area surcharge"), fuel_surcharge:xc("Fuel Surcharge"), operating_cost:xc("Operating Cost"), tax:xc("Tax"), insurance:xc("Insurance"), storage_fee:xc("Storage Fee"), epe_loose_filling:xc("EPE Loose Filling"), corner_protector:xc("Corner Protector"), moister_barrier_bag:xc("Moister-Barrier Bag"), packing_video:xc("Whole-Process Packing Video"), one_percent_discount:xc("1% Discount",true), points_discount:xc("Points Discount",true), coupon_discount:xc("Coupon Discount",true), discount_code:xc("Discount code Discount",true) });
        
        d.querySelectorAll('table').forEach(t=>{
            if(t.rows[0]&&t.rows[0].textContent.toLowerCase().includes('item name')&&t.rows[0].textContent.toLowerCase().includes('operation')) {
                let cb=[], cbw=0; const pb=()=>{ if(cb.length>0){ let tq=cb.reduce((s,i)=>s+i.q,0); if(tq===0) tq=1; cb.forEach(i=>itm.push({parcel_no:pNo, di_item_id:i.d, item_name:i.n, specification:i.s, quantity:i.q, total_dist_weight_g:Math.round(cbw*(i.q/tq)), unit_weight_g:Math.round((cbw*(i.q/tq))/(i.q||1)*100)/100})); cb=[]; } };
                for(let j=1; j<t.rows.length; j++){
                    let cs=t.rows[j].cells; if(cs.length>=3){
                        let rn=cs[0]?cs[0].textContent.replace(/View Inspection/g,'').replace(/\s+/g,' ').trim():''; if(!rn) continue;
                        
                        let dm = rn.match(new RegExp(window.PARCEL_RULES.regexLineItemNum, "i"));
                        let dc = dm ? dm[0] : ''; 
                        let rw = dc ? rn.replace(dc,'').trim() : rn;
                        
                        let sm = rw.match(new RegExp(window.PARCEL_RULES.regexSpecs, "i"));
                        let sp = sm && sm[1] ? sm[1].trim() : ''; 
                        let fn = rw;
                        if(sm && sm[0]) { fn = rw.replace(sm[0], '').trim(); }
                        if(sp && fn.includes(sp)) { fn = fn.replace(sp,'').trim(); }
                        fn = fn.replace(/[-\s,：:]+$/,'').trim();
                        
                        let q=parseInt(cs[1]?cs[1].textContent.trim():0)||0; let pw=parseInt(cs[2]?cs[2].textContent.trim():'');
                        if(!isNaN(pw)){pb(); cbw=pw; cb.push({d:dc,n:fn,s:sp,q:q});} else cb.push({d:dc,n:fn,s:sp,q:q});
                    }
                } pb();
            }
        });
    } return { count: sum.length, table: 'raw_parcel_summary', conflict: 'parcel_no', data: sum, table2: 'raw_parcel_items', conflict2: 'parcel_no, di_item_id', data2: itm };
}

async function syncAndCalculate() {
    const btnCalc = document.getElementById('btnCalc'); if(btnCalc) btnCalc.disabled = true;
    setMasterStatus("⚙️ Downloading data...", "mod-working"); sysLog("Sync/Calc..."); setSysProgress(20, 'working');
    try {
        const [oR, sR, iR, eR] = await Promise.all([ supabaseClient.from('raw_orders').select('*'), supabaseClient.from('raw_parcel_summary').select('*'), supabaseClient.from('raw_parcel_items').select('*'), supabaseClient.from('full_landed_costs').select('parcel_no, di_item_id, neogleamz_name, neogleamz_product, quantity, lot_multiplier') ]);
        if(oR.error) throw new Error(oR.error.message); if(sR.error) throw new Error(sR.error.message); if(iR.error) throw new Error(iR.error.message);
        if(!iR.data||iR.data.length===0) { sysLog("No raw items.", true); setSysProgress(0, 'working'); if(btnCalc) btnCalc.disabled=false; return; }
        sysLog("Calculating Math..."); setSysProgress(60, 'working'); setMasterStatus("🧮 Calculating...", "mod-working");
        let eM={}; if(eR.data) eR.data.forEach(r => eM[`${r.parcel_no}_${r.di_item_id}`]=r);
        let oM={}; (oR.data||[]).forEach(o => oM[o.di_item_id]=o); let sM={}; (sR.data||[]).forEach(s => sM[s.parcel_no]=s);
        let pT={}; iR.data.forEach(i => { if(!pT[i.parcel_no]) pT[i.parcel_no]={w:0}; pT[i.parcel_no].w += Number(i.total_dist_weight_g)||0; });
        let dI=[];
        iR.data.forEach(i => {
            let pN=i.parcel_no, d=i.di_item_id; let o=oM[d]||{}, s=sM[pN]||{}, e=eM[`${pN}_${d}`]||{};
            let q=e.quantity||i.quantity||1; let mult = e.lot_multiplier || 1; let up=Number(o.unit_price)||0; let uclp=Number(o.unit_china_landed_price)||up; let tw=Number(i.total_dist_weight_g)||0; let psc=Number(s.actual_paid)||0; let ptw=pT[pN].w||1;
            let uws = q > 0 ? ((tw / ptw) * psc / q) : 0; 
            let fuc = uclp + uws;
            let roundedUws = Math.round(uws * 10000) / 10000;
            let roundedFuc = Math.round(fuc * 10000) / 10000;
            let roundedTotal = Math.round(fuc * q * 100) / 100;
            
            dI.push({ parcel_no:pN, di_item_id:d, item_name:i.item_name||o.item_name||"", specification:i.specification||o.specification||"", quantity:q, lot_multiplier:mult, neogleamz_name:e.neogleamz_name||'', neogleamz_product:e.neogleamz_product||'', total_dist_weight_g:tw, unit_weight_g:i.unit_weight_g, order_date:o.order_date, order_no:o.order_no, alibaba_order:o.alibaba_order, order_unit_price:up, order_postage:o.postage, order_total:o.order_total, unit_china_landed_price:uclp, actual_paid:s.actual_paid, actual_chargeable_weight_g:s.actual_chargeable_weight_g, actual_shipping_fee:s.actual_shipping_fee, first_tier_cost:s.first_tier_cost, second_tier_cost:s.second_tier_cost, custom_clearance_fee:s.custom_clearance_fee, remote_area_surcharge:s.remote_area_surcharge, fuel_surcharge:s.fuel_surcharge, operating_cost:s.operating_cost, tax:s.tax, insurance:s.insurance, storage_fee:s.storage_fee, epe_loose_filling:s.epe_loose_filling, corner_protector:s.corner_protector, moister_barrier_bag:s.moister_barrier_bag, packing_video:s.packing_video, one_percent_discount:s.one_percent_discount, points_discount:s.points_discount, coupon_discount:s.coupon_discount, discount_code:s.discount_code, unit_ship_weight:roundedUws, final_cost_weight:roundedFuc, total_cost_weight:roundedTotal });
        });
        sysLog(`Pushing ${dI.length} rows...`); setSysProgress(80, 'working');
        const {error} = await supabaseClient.from('full_landed_costs').upsert(dI, {onConflict:'parcel_no, di_item_id'}); if(error) throw new Error(error.message);
        if(typeof loadData === 'function') await loadData(true); setSysProgress(100, 'success'); setMasterStatus(`✅ Calculated!`, "mod-success"); setTimeout(()=>{setSysProgress(0,'working');}, 3000);
    } catch (error) { setSysProgress(100, 'error'); sysLog(error.message, true); setMasterStatus("❌ Calc Error.", "mod-error"); setTimeout(()=>setSysProgress(0,'working'), 3000); }
    if(btnCalc) btnCalc.disabled = false;
}

// --- 13. NEW BACKUP & RESTORE SYSTEM ---
function openBackupModal() {
    document.getElementById('backupModal').style.display = 'flex';
    document.getElementById('restorePreview').style.display = 'none';
    document.getElementById('importBackupFile').value = '';
}

function closeBackupModal() { document.getElementById('backupModal').style.display = 'none'; }

async function executeExport() {
    try {
        setMasterStatus("Exporting...", "mod-working"); sysLog("Exporting full system backup...");
        const wb = XLSX.utils.book_new();
        async function addSheet(tableName, sheetName) {
            const { data, error } = await supabaseClient.from(tableName).select('*');
            if (error) throw error;
            let exportData = data;
            if (tableName === 'product_recipes') {
                exportData = data.map(r => ({ product_name: r.product_name, components: JSON.stringify(r.components), labor_time_mins: r.labor_time_mins, labor_rate_hr: r.labor_rate_hr, msrp: r.msrp, wholesale_price: r.wholesale_price, is_subassembly: r.is_subassembly }));
            } else if (tableName === 'production_sops') {
                exportData = data.map(r => ({ product_name: r.product_name, steps: JSON.stringify(r.steps) }));
            } else if (tableName === 'work_orders') {
                exportData = data.map(r => ({ ...r, wip_state: JSON.stringify(r.wip_state), routing: JSON.stringify(r.routing || {}) }));
            } else if (tableName === 'pack_ship_sops') {
                exportData = data.map(r => ({ ...r, instruction_json: typeof r.instruction_json === 'object' ? JSON.stringify(r.instruction_json) : r.instruction_json }));
            } else if (tableName === 'sop_archives') {
                exportData = data.map(r => ({ ...r, telemetry_json: typeof r.telemetry_json === 'object' ? JSON.stringify(r.telemetry_json) : r.telemetry_json }));
            }
            const ws = XLSX.utils.json_to_sheet(exportData); XLSX.utils.book_append_sheet(wb, ws, sheetName);
        }
        await addSheet('full_landed_costs', 'Master_Ledger');
        await addSheet('product_recipes', 'Recipes');
        await addSheet('inventory_consumption', 'Inventory');
        await addSheet('work_orders', 'Work_Orders');
        await addSheet('production_sops', 'SOPs');
        await addSheet('sales_ledger', 'Sales_Ledger');
        await addSheet('storefront_aliases', 'Storefront_Aliases');
        await addSheet('print_queue', 'Print_Queue');
        await addSheet('app_settings', 'App_Settings');
        await addSheet('socialz_audience', 'Socialz_Users');
        await addSheet('pack_ship_sops', 'Pack_Ship_SOPs');
        await addSheet('sop_archives', 'SOP_Archives');
        await addSheet('raw_orders', 'Raw_Orders');
        await addSheet('raw_parcel_summary', 'Raw_Parcel_Summary');
        await addSheet('raw_parcel_items', 'Raw_Parcel_Items');
        const now = new Date(); const dateStr = now.toISOString().split('T')[0]; const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
        XLSX.writeFile(wb, `Neogleamz_Full_Backup_${dateStr}_${timeStr}.xlsx`);
        setMasterStatus("Export Complete!", "mod-success"); setTimeout(()=>setMasterStatus("Ready.", "status-idle"), 2000);
    } catch (e) { sysLog(e.message, true); setMasterStatus("Export Error", "mod-error"); }
}

let pendingRestoreData = {};
function handleFileSelect(input) {
    const file = input.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        const data = new Uint8Array(e.target.result); const workbook = XLSX.read(data, {type: 'array'});
        pendingRestoreData = {}; let html = '';
        workbook.SheetNames.forEach(sheetName => {
            const roa = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
            if(roa.length > 0) { pendingRestoreData[sheetName] = roa; html += `<label style="display:flex; align-items:center; justify-content:flex-start; gap:10px; font-size:13px; margin:6px 0; color:var(--text-main); font-weight:bold;"><input type="checkbox" class="restore-chk" value="${sheetName}" checked style="width:16px; height:16px; margin:0; flex-shrink:0; cursor:pointer;"> Restore ${sheetName.replace(/_/g, ' ')} (${roa.length} rows)</label>`; }
        });
        document.getElementById('restoreCheckboxes').innerHTML = html; document.getElementById('restorePreview').style.display = 'block';
    };
    reader.readAsArrayBuffer(file);
}

async function executeRestore() {
    const checkboxes = document.querySelectorAll('.restore-chk:checked');
    if(checkboxes.length === 0) return alert("Select at least one sheet.");
    if(!confirm("⚠️ OVERWRITE cloud data?")) return;
    try {
        setMasterStatus("Restoring...", "mod-working"); setSysProgress(20, 'working');
        for (let chk of checkboxes) {
            const sheetName = chk.value; const rawData = pendingRestoreData[sheetName]; sysLog(`Restoring sheet: ${sheetName}`);
            let tableName = ''; let conflictKey = ''; let parsedData = rawData;
            if (sheetName === 'Master_Ledger') { tableName = 'full_landed_costs'; conflictKey = 'parcel_no, di_item_id'; } 
            else if (sheetName === 'Recipes') { tableName = 'product_recipes'; conflictKey = 'product_name'; parsedData = rawData.map(r => ({ ...r, components: JSON.parse(r.components || '[]') })); } 
            else if (sheetName === 'Inventory') { tableName = 'inventory_consumption'; conflictKey = 'item_key'; } 
            else if (sheetName === 'Work_Orders') { tableName = 'work_orders'; conflictKey = 'wo_id'; parsedData = rawData.map(r => ({ ...r, wip_state: JSON.parse(r.wip_state || '{}'), routing: JSON.parse(r.routing || '{}') })); } 
            else if (sheetName === 'SOPs') { tableName = 'production_sops'; conflictKey = 'product_name'; parsedData = rawData.map(r => ({ ...r, steps: JSON.parse(r.steps || '[]') })); }
            else if (sheetName === 'Sales_Ledger') { tableName = 'sales_ledger'; conflictKey = 'id'; }
            else if (sheetName === 'Storefront_Aliases') { tableName = 'storefront_aliases'; conflictKey = 'storefront_sku'; }
            else if (sheetName === 'Print_Queue') { tableName = 'print_queue'; conflictKey = 'id'; }
            else if (sheetName === 'App_Settings') { tableName = 'app_settings'; conflictKey = 'id'; }
            else if (sheetName === 'Socialz_Users') { tableName = 'socialz_audience'; conflictKey = 'name'; }
            else if (sheetName === 'Pack_Ship_SOPs') { tableName = 'pack_ship_sops'; conflictKey = 'internal_recipe_name'; parsedData = rawData.map(r => ({ ...r, instruction_json: typeof r.instruction_json === 'string' && r.instruction_json.startsWith('{') ? JSON.parse(r.instruction_json) : r.instruction_json })); }
            else if (sheetName === 'SOP_Archives') { tableName = 'sop_archives'; conflictKey = 'id'; parsedData = rawData.map(r => ({ ...r, telemetry_json: typeof r.telemetry_json === 'string' && r.telemetry_json.startsWith('[') ? JSON.parse(r.telemetry_json) : r.telemetry_json })); }
            else if (sheetName === 'Raw_Orders') { tableName = 'raw_orders'; conflictKey = 'di_item_id'; }
            else if (sheetName === 'Raw_Parcel_Summary') { tableName = 'raw_parcel_summary'; conflictKey = 'parcel_no'; }
            else if (sheetName === 'Raw_Parcel_Items') { tableName = 'raw_parcel_items'; conflictKey = 'parcel_no, di_item_id'; }
            if (tableName) {
                const { error } = await supabaseClient.from(tableName).upsert(parsedData, { onConflict: conflictKey });
                if (error) throw error;
            }
        }
        setMasterStatus("Complete!", "mod-success"); closeBackupModal(); if(typeof loadData === 'function') await loadData(true);
    } catch(e) { sysLog(e.message, true); setMasterStatus("Restore Error", "mod-error"); }
}
