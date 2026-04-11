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
    regexItemName: "DI\\d{11}\\s+([^\\n]+)",
    regexUnitPrice: "(?:US \\$|CN ￥)\\s*([\\d.]+)",
    regexQuantity: "(?:US \\$|CN ￥).*?\\n(\\d+)",
    regexSpecs: "(?:Specification model|specification|Product specifications|model|Color|size|power|Light color|Applicable Model)[：:]\\s*([^\\n\\t\\r]+)"
};
const DEFAULT_PARCEL_RULES = {
    regexParcelNum: "PN\\d{11}",
    regexActualPaid: "Actual Paid\\s*:\\s*US \\$\\s*([\\d.]+)",
    regexChargeableWeight: "Actual Chargeable Weight\\s*(\\d+)\\s*g",
    regexFeeStructure: "{FEE_NAME}\\s*(?:US \\$|CN ￥)\\s*([\\d.]+)",
    regexDeductionStructure: "{FEE_NAME}\\s*-\\s*(?:US \\$|CN ￥)\\s*([\\d.]+)",
    regexLineItemNum: "DI\\d{11}",
    regexItemName: "DI\\d{11}\\s+([^\\n]+)",
    regexQuantity: "\\n(\\d+)\\n\\d+(?:\\n|$)",
    regexGroupWeight: "\\n\\d+\\n(\\d+)(?:\\n|$)",
    regexSpecs: "(?:specification|Color|model|Product specifications|Specification model|size|power|Light color|Applicable Model)[：:]\\s*(.*)"
};

window.escapeHtmlForRegex = function(text) {
    if (!text) return "";
    return text.toString()
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
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
            
            // Auto-repair missing essential keys that were wiped in v.2026.04.07.bug
            window.PARSER_PROFILES.forEach(p => {
                if(!p.rules.regexItemName) p.rules.regexItemName = DEFAULT_PARSER_RULES.regexItemName;
                if(!p.rules.regexQuantity) p.rules.regexQuantity = DEFAULT_PARSER_RULES.regexQuantity;
            });
            window.PARCEL_PROFILES.forEach(p => {
                if(!p.rules.regexGroupWeight) p.rules.regexGroupWeight = DEFAULT_PARCEL_RULES.regexGroupWeight;
            });
            // Force strict adherence on memory block 0
            if (window.PARSER_PROFILES[0] && window.PARSER_PROFILES[0].name === "Factory Default") {
                window.PARSER_PROFILES[0].rules = {...DEFAULT_PARSER_RULES};
            }

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
        regexItemName: document.getElementById('regexItemName').value.trim(),
        regexQuantity: document.getElementById('regexQuantity').value.trim(),
        regexUnitPrice: document.getElementById('regexUnitPrice').value.trim(),
        regexSpecs: document.getElementById('regexSpecs').value.trim()
    };
};

window.toggleRawOrderView = function() {
    let ta = document.getElementById('liveRegexPlaygroundPayload');
    let btn = document.getElementById('btnToggleView');
    if (window._isOrderRawView) {
        ta.value = window.__LATEST_RAW_ORDER_DUMP || "";
        window._isOrderRawView = false;
        if (btn) btn.innerHTML = "👁️ VIEW SOURCE HTML";
    } else {
        ta.value = window.__LATEST_RAW_ORDER_HTML_DUMP || "No HTML source cached. Please run a test or import sandbox.";
        window._isOrderRawView = true;
        if (btn) btn.innerHTML = "👁️ VIEW EXTRACTED TEXT";
    }
    window.evaluateAllRegex();
};

window.openParserConfig = function() {
    window.openGlobalRegexPlayground("orders");
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
window.closeParserConfig = function() { document.getElementById('globalRegexPlaygroundModalContainer').style.display = 'none'; };

window.restoreDefaultParserRules = function() {
    let sel = document.getElementById('regexPresetSelect');
    if (sel) { sel.value = 0; window.loadSelectedRegexPreset(); }
};

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

window.UI_COLOR_MAP = {
    regexOrderNum: { text: '#ec4899', bg: 'rgba(236,72,153,0.4)' },
    regexParcelNum: { text: '#ec4899', bg: 'rgba(236,72,153,0.4)' },
    regexOrderDate: { text: '#8b5cf6', bg: 'rgba(139,92,246,0.4)' },
    regexActualPaid: { text: '#8b5cf6', bg: 'rgba(139,92,246,0.4)' },
    regexOrderTotal: { text: '#10b981', bg: 'rgba(16,185,129,0.4)' },
    regexChargeableWeight: { text: '#10b981', bg: 'rgba(16,185,129,0.4)' },
    regexPostage: { text: '#f43f5e', bg: 'rgba(244,63,94,0.4)' },
    regexSecondaryFee: { text: '#d946ef', bg: 'rgba(217,70,239,0.4)' },
    regexFeeStructure: { text: '#f43f5e', bg: 'rgba(244,63,94,0.4)' },
    regexDeductionStructure: { text: '#d946ef', bg: 'rgba(217,70,239,0.4)' },
    regexLineItemNum: { text: '#06b6d4', bg: 'rgba(6,182,212,0.4)' },
    regexParcelLineItemNum: { text: '#06b6d4', bg: 'rgba(6,182,212,0.4)' },
    regexItemName: { text: '#eab308', bg: 'rgba(234,179,8,0.4)' },
    regexParcelItemName: { text: '#eab308', bg: 'rgba(234,179,8,0.4)' },
    regexUnitPrice: { text: '#84cc16', bg: 'rgba(132,204,22,0.4)' },
    regexQuantity: { text: '#3b82f6', bg: 'rgba(59,130,246,0.4)' },
    regexParcelQuantity: { text: '#3b82f6', bg: 'rgba(59,130,246,0.4)' },
    regexGroupWeight: { text: '#a855f7', bg: 'rgba(168,85,247,0.4)' },
    regexSpecs: { text: '#f59e0b', bg: 'rgba(245,158,11,0.4)' },
    regexParcelSpecs: { text: '#f59e0b', bg: 'rgba(245,158,11,0.4)' }
};

window._regexParseTimer = null;
window.evaluateAllRegex = function() {
    clearTimeout(window._regexParseTimer);
    window._regexParseTimer = setTimeout(() => {
        let ids = [];
        if (window.EXTRACTOR_CONFIGS && window.EXTRACTOR_CONFIGS.orders) {
            window.EXTRACTOR_CONFIGS.orders.groups.forEach(g => g.fields.forEach(f => ids.push(f.id)));
        }
        
        let targetTxt = document.getElementById('liveRegexPlaygroundPayload').value || "";
        let searchQ = (document.getElementById('liveRegexSearchBox')?.value || "").trim();
        
        let regionsToHighlight = [];
        if (searchQ) {
            try {
                let searchRegex = new RegExp(searchQ.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
                let searchIter;
                if(String.prototype.matchAll) searchIter = targetTxt.matchAll(searchRegex);
                if (searchIter) {
                    for (const m of searchIter) {
                        regionsToHighlight.push({ start: m.index, end: m.index + m[0].length, id: 'SEARCH' });
                    }
                }
            } catch(e) {}
        }

        ids.forEach(id => {
            let extractedArray = window.evaluateLiveRegex(id, targetTxt, true); // true = raw array bypass
            if (extractedArray && extractedArray.length > 0) {
                extractedArray.forEach(extObj => {
                    if(extObj.str && extObj.str.trim() !== '') {
                        regionsToHighlight.push({ start: extObj.start, end: extObj.end, id: id });
                    }
                });
            }
        });

        // Sort descending because we insert spans index-forward
        regionsToHighlight.sort((a,b) => a.start - b.start);

        let safeTxt = "";
        let lastIndex = 0;
        
        regionsToHighlight.forEach(region => {
            if (region.start < lastIndex) return; // skip overlap
            if (region.end <= region.start) return; // skip empty
            
            let cID = region.id;
            let textColor = '#10b981';
            let bgColor = 'rgba(16,185,129,0.4)';
            
            if (cID === 'SEARCH') {
                textColor = '#f59e0b';
                bgColor = 'rgba(245,158,11,0.6)';
            } else if (window.UI_COLOR_MAP[cID]) {
                textColor = window.UI_COLOR_MAP[cID].text;
                bgColor = window.UI_COLOR_MAP[cID].bg;
            }

            safeTxt += window.escapeHtmlForRegex(targetTxt.substring(lastIndex, region.start));
            let matchText = window.escapeHtmlForRegex(targetTxt.substring(region.start, region.end));
            safeTxt += `<mark style="background:${bgColor}; color:${textColor}; border-radius:3px; box-shadow:0 0 5px ${bgColor.replace('0.4','0.5').replace('0.6','0.8')}; padding:1px 0;">${matchText}</mark>`;
            lastIndex = region.end;
        });
        
        safeTxt += window.escapeHtmlForRegex(targetTxt.substring(lastIndex));

        let hlLayer = document.getElementById('liveRegexHighlightLayer');
        if(hlLayer) hlLayer.innerHTML = safeTxt;

    }, 300);
};

window.evaluateLiveRegex = function(id, manualTargetTxt = null, returnAll = false) {
    let el = document.getElementById(id);
    let inputStr = el ? (el.value || "") : "";
    let targetTxt = manualTargetTxt !== null ? manualTargetTxt : document.getElementById('liveRegexPlaygroundPayload').value;
    let badge = document.getElementById('eval_' + id);
    
    if(!badge) return null;

    if(!inputStr || inputStr.trim() === "") {
        badge.innerText = "Empty Rule"; badge.style.color = "#cbd5e1"; return null;
    }
    
    try {
        let regexSingle = new RegExp(inputStr, "di");
        let singleMatch = targetTxt.match(regexSingle);
        
        // Setup global iterator map safely
        let globalRegex = new RegExp(inputStr, "dgi");
        let allMatchesIter;
        if(String.prototype.matchAll) {
            allMatchesIter = targetTxt.matchAll(globalRegex);
        } else {
            // Polyfill if matchAll somehow fails
            return null;
        }

        let allResults = [];
        for (const m of allMatchesIter) {
            if (returnAll) {
                let val = m[1] !== undefined ? m[1] : m[0];
                let sIndex = m.index;
                if (m.indices && m.indices[1]) {
                    sIndex = m.indices[1][0];
                } else if (m[1] !== undefined && m[0] && m[1]) {
                    let offset = m[0].lastIndexOf(m[1]);
                    if (offset !== -1) sIndex += offset;
                }
                allResults.push({ str: val, start: sIndex, end: sIndex + val.length });
            } else {
                allResults.push(m[1] !== undefined ? m[1] : m[0]);
            }
        }

        if(singleMatch && allResults.length > 0) {
            let result = singleMatch[1] !== undefined ? singleMatch[1] : singleMatch[0];
            badge.innerText = `Matched (${allResults.length}): [ ${result} ]`;
            badge.style.color = window.UI_COLOR_MAP[id] ? window.UI_COLOR_MAP[id].text : "#10b981";
            
            return returnAll ? allResults : result;
        } else {
            badge.innerText = "NO MATCH";
            badge.style.color = "#ef4444"; // red
            return null;
        }
    } catch(e) {
        badge.innerText = "SYNTAX ERR";
        badge.style.color = "#ef4444";
        return null;
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
        regexItemName: document.getElementById('regexParcelItemName').value.trim(),
        regexQuantity: document.getElementById('regexParcelQuantity').value.trim(),
        regexSpecs: document.getElementById('regexParcelSpecs').value.trim()
    };
};

window.toggleRawParcelView = function() {
    let ta = document.getElementById('liveParcelRegexPlaygroundPayload');
    let btn = document.getElementById('btnToggleView');
    if (window._isParcelRawView) {
        ta.value = window.__LATEST_RAW_PARCEL_DUMP || "";
        window._isParcelRawView = false;
        if (btn) btn.innerHTML = "👁️ VIEW SOURCE HTML";
    } else {
        ta.value = window.__LATEST_RAW_PARCEL_HTML_DUMP || "No HTML source cached. Please run a test or import sandbox.";
        window._isParcelRawView = true;
        if (btn) btn.innerHTML = "👁️ VIEW EXTRACTED TEXT";
    }
    window.evaluateAllParcelRegex();
};

window.openParcelConfig = function() {
    window.openGlobalRegexPlayground("parcels");
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
window.closeParcelConfig = function() { document.getElementById('globalRegexPlaygroundModalContainer').style.display = 'none'; };

window.restoreDefaultParcelRules = function() {
    let sel = document.getElementById('parcelPresetSelect');
    if (sel) { sel.value = 0; window.loadSelectedParcelRegexPreset(); }
};

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

window._parcelRegexParseTimer = null;
window.evaluateAllParcelRegex = function() {
    clearTimeout(window._parcelRegexParseTimer);
    window._parcelRegexParseTimer = setTimeout(() => {
        let ids = [];
        if (window.EXTRACTOR_CONFIGS && window.EXTRACTOR_CONFIGS.parcels) {
            window.EXTRACTOR_CONFIGS.parcels.groups.forEach(g => g.fields.forEach(f => ids.push(f.id)));
        }
        
        let targetTxt = document.getElementById('liveParcelRegexPlaygroundPayload').value || "";
        let searchQ = (document.getElementById('liveParcelRegexSearchBox')?.value || "").trim();
        
        let regionsToHighlight = [];
        if (searchQ) {
            try {
                let searchRegex = new RegExp(searchQ.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
                let searchIter;
                if(String.prototype.matchAll) searchIter = targetTxt.matchAll(searchRegex);
                if (searchIter) {
                    for (const m of searchIter) {
                        regionsToHighlight.push({ start: m.index, end: m.index + m[0].length, id: 'SEARCH' });
                    }
                }
            } catch(e) {}
        }

        ids.forEach(id => {
            let extractedArray = window.evaluateLiveParcelRegex(id, targetTxt, true); // true = raw array bypass
            if (extractedArray && extractedArray.length > 0) {
                extractedArray.forEach(extObj => {
                    if(extObj.str && extObj.str.trim() !== '') {
                        regionsToHighlight.push({ start: extObj.start, end: extObj.end, id: id });
                    }
                });
            }
        });

        // Sort descending because we insert spans index-forward
        regionsToHighlight.sort((a,b) => a.start - b.start);

        // Map distributed weights dynamically
        let distributedWeightIndexes = new Set();
        let lastWeightIdx = -1;
        let itemsSince = 0;
        
        for (let i = 0; i < regionsToHighlight.length; i++) {
            let r = regionsToHighlight[i];
            if (r.id === 'regexParcelItemName') {
                if (lastWeightIdx !== -1) itemsSince++;
            } else if (r.id === 'regexGroupWeight') {
                if (lastWeightIdx !== -1 && itemsSince > 1) distributedWeightIndexes.add(lastWeightIdx);
                lastWeightIdx = i;
                itemsSince = 0;
            }
        }
        if (lastWeightIdx !== -1 && itemsSince > 0) distributedWeightIndexes.add(lastWeightIdx);

        let safeTxt = "";
        let lastIndex = 0;
        
        regionsToHighlight.forEach((region, rIdx) => {
            if (region.start < lastIndex) return; // skip overlap
            if (region.end <= region.start) return; // skip empty
            
            let cID = region.id;
            let textColor = '#10b981';
            let bgColor = 'rgba(16,185,129,0.4)';
            
            if (cID === 'SEARCH') {
                textColor = '#f59e0b';
                bgColor = 'rgba(245,158,11,0.6)';
            } else if (window.UI_COLOR_MAP[cID]) {
                textColor = window.UI_COLOR_MAP[cID].text;
                bgColor = window.UI_COLOR_MAP[cID].bg;
            }

            safeTxt += window.escapeHtmlForRegex(targetTxt.substring(lastIndex, region.start));
            let matchText = window.escapeHtmlForRegex(targetTxt.substring(region.start, region.end));
            let emojiPrefix = (cID === 'regexGroupWeight' && distributedWeightIndexes.has(rIdx)) ? `<span style="font-size:11px; margin-right:4px;">🧮</span>` : "";
            safeTxt += `<mark style="background:${bgColor}; color:${textColor}; border-radius:3px; box-shadow:0 0 5px ${bgColor.replace('0.4','0.5').replace('0.6','0.8')}; padding:1px 0;">${emojiPrefix}${matchText}</mark>`;
            lastIndex = region.end;
        });
        
        safeTxt += window.escapeHtmlForRegex(targetTxt.substring(lastIndex));

        let hlLayer = document.getElementById('liveParcelRegexHighlightLayer');
        if(hlLayer) hlLayer.innerHTML = safeTxt;

    }, 300);
};

window.evaluateLiveParcelRegex = function(id, manualTargetTxt = null, returnAll = false) {
    let el = document.getElementById(id);
    let inputStr = el ? (el.value || "") : "";
    let targetTxt = manualTargetTxt !== null ? manualTargetTxt : document.getElementById('liveParcelRegexPlaygroundPayload').value;
    let badge = document.getElementById('eval_' + id);
    
    if(!badge) return null;

    if(!inputStr || inputStr.trim() === "") {
        badge.innerText = "Empty Rule"; badge.style.color = "#cbd5e1"; return null;
    }
    
    try {
        let regexStr = inputStr;
        if(id === 'regexFeeStructure' || id === 'regexDeductionStructure') {
             regexStr = regexStr.replace("{FEE_NAME}", "Actual Shipping Fee"); // test interpolation
        }
        
        let regexSingle = new RegExp(regexStr, "di");
        let singleMatch = targetTxt.match(regexSingle);
        
        // Setup global iterator map safely
        let globalRegex = new RegExp(regexStr, "dgi");
        let allMatchesIter;
        if(String.prototype.matchAll) {
            allMatchesIter = targetTxt.matchAll(globalRegex);
        } else {
            // Polyfill if matchAll somehow fails
            return null;
        }

        let allResults = [];
        for (const m of allMatchesIter) {
            if (returnAll) {
                let val = m[1] !== undefined ? m[1] : m[0];
                let sIndex = m.index;
                if (m.indices && m.indices[1]) {
                    sIndex = m.indices[1][0];
                } else if (m[1] !== undefined && m[0] && m[1]) {
                    let offset = m[0].lastIndexOf(m[1]);
                    if (offset !== -1) sIndex += offset;
                }
                allResults.push({ str: val, start: sIndex, end: sIndex + val.length });
            } else {
                allResults.push(m[1] !== undefined ? m[1] : m[0]);
            }
        }

        if(singleMatch && allResults.length > 0) {
            let result = singleMatch[1] !== undefined ? singleMatch[1] : singleMatch[0];
            badge.innerText = `Matched (${allResults.length}): [ ${result} ]`;
            badge.style.color = window.UI_COLOR_MAP[id] ? window.UI_COLOR_MAP[id].text : "#10b981";
            
            return returnAll ? allResults : result;
        } else {
            badge.innerText = "NO MATCH";
            badge.style.color = "#ef4444"; // red
            return null;
        }
    } catch(e) {
        badge.innerText = "SYNTAX ERR";
        badge.style.color = "#ef4444";
        return null;
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
window.__sandboxData2 = null;
window.__sandboxSortCol = null;
window.__sandboxSortCol2 = null;
window.__sandboxSortAsc = true;
window.__sandboxSortAsc2 = true;
window.__sandboxTitle = "";
window.__sandboxTitle2 = "";
window.__sandboxTable1Title = "Table 1 (Primary)";
window.__sandboxTable2Title = "Table 2 (Secondary)";

window.openSandboxModal = function(payload, title, payload2=null, table1Title="Table 1 (Primary)", table2Title="Table 2 (Secondary)", liveImportMeta=null) {
    window.__sandboxData = payload && payload.length ? [...payload] : [];
    window.__sandboxData2 = payload2 && payload2.length ? [...payload2] : null;
    window.__sandboxTitle = title || "data_payload";
    window.__pendingLiveImportMeta = liveImportMeta;
    
    let actionFooter = document.getElementById('sandboxActionFooter');
    let btnDiscard = document.getElementById('btnSandboxDiscard');
    let btnSync = document.getElementById('btnSandboxSync');
    let btnClose = document.getElementById('btnSandboxClose');
    let titleEl = document.getElementById('sandboxModalTitle');
    let hdrBg = document.getElementById('sandboxDataModal').querySelector('div > div:first-child');
    let modalWrapper = document.getElementById('sandboxDataModal').firstElementChild;

    if(actionFooter) actionFooter.style.display = "flex";

    if (liveImportMeta) {
        window.__sandboxTitle += " [⚠️ LIVE STAGING]";
        titleEl.style.color = "#ef4444"; 
        if(hdrBg) hdrBg.style.background = "rgba(239, 68, 68, 0.1)"; 
        if(modalWrapper) modalWrapper.style.border = "1px solid #ef4444";
        if(btnDiscard) btnDiscard.style.display = "block";
        if(btnSync) btnSync.style.display = "block";
        if(btnClose) btnClose.style.display = "none";
    } else {
        titleEl.style.color = "#f59e0b"; 
        if(hdrBg) hdrBg.style.background = "rgba(245, 158, 11, 0.1)"; 
        if(modalWrapper) modalWrapper.style.border = "1px dashed #f59e0b";
        if(btnDiscard) btnDiscard.style.display = "none";
        if(btnSync) btnSync.style.display = "none";
        if(btnClose) btnClose.style.display = "block";
    }

    window.__sandboxTable1Title = table1Title;
    window.__sandboxTable2Title = table2Title;
    window.__sandboxSortCol = null;
    window.__sandboxSortCol2 = null;
    window.__sandboxSortAsc = true;
    window.__sandboxSortAsc2 = true;
    window._renderSandboxModal();
    document.getElementById('sandboxDataModal').style.display = 'flex';
};

window.sortSandboxModal = function(col, tableNum=1) {
    let targetData = tableNum === 2 ? window.__sandboxData2 : window.__sandboxData;
    if(!targetData || !targetData.length) return;
    
    let isAsc = true;
    if (tableNum === 2) {
        if (window.__sandboxSortCol2 === col) window.__sandboxSortAsc2 = !window.__sandboxSortAsc2;
        else { window.__sandboxSortCol2 = col; window.__sandboxSortAsc2 = true; }
        isAsc = window.__sandboxSortAsc2;
    } else {
        if (window.__sandboxSortCol === col) window.__sandboxSortAsc = !window.__sandboxSortAsc;
        else { window.__sandboxSortCol = col; window.__sandboxSortAsc = true; }
        isAsc = window.__sandboxSortAsc;
    }
    
    targetData.sort((a,b) => {
        let v1 = a[col]; let v2 = b[col];
        if(typeof v1 === 'string') v1 = v1.toLowerCase();
        if(typeof v2 === 'string') v2 = v2.toLowerCase();
        if (v1 < v2) return isAsc ? -1 : 1;
        if (v1 > v2) return isAsc ? 1 : -1;
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
        let renderTable = (data, title, tableNum) => {
            let sortCol = tableNum === 2 ? window.__sandboxSortCol2 : window.__sandboxSortCol;
            let sortAsc = tableNum === 2 ? window.__sandboxSortAsc2 : window.__sandboxSortAsc;
            let cols = Object.keys(data[0] || {}).filter(k => !k.startsWith('_'));
            
            let h = ``;
            if(title) h += `<h3 style="color:#10b981; margin: 15px 0 10px 0;">${title}</h3>`;
            
            h += `<table style="width:100%; text-align:left; border-collapse:collapse; white-space:nowrap; margin-bottom: 20px;">`;
            h += `<thead><tr>`;
            cols.forEach(c => {
                let indicator = sortCol === c ? (sortAsc ? " <span style='color:#fff;'>▲</span>" : " <span style='color:#fff;'>▼</span>") : "";
                let displayC = c;
                let colorRule = "color:#f59e0b; border-bottom:2px solid rgba(245,158,11,0.5);"; 
                if (['transaction_type', 'total_dist_weight_g', 'unit_weight_g', 'unit_china_landed_price', 'net_profit', 'transaction_fees', 'cogs_at_sale'].includes(c.toLowerCase())) {
                    displayC = "🧮 " + c;
                    colorRule = "color:#c084fc; border-bottom:2px solid rgba(192,132,252,0.6);";
                } else if (c.toLowerCase().endsWith("_hash")) {
                    displayC = "🔐 " + c;
                    colorRule = "color:#fbbf24; border-bottom:2px solid rgba(251,191,36,0.6);"; // amber logic for secure keys
                }
                h += `<th onclick="window.sortSandboxModal('${c}', ${tableNum})" style="padding:10px 15px; position:sticky; top:0; background:var(--bg-panel); text-transform:uppercase; font-size:10px; letter-spacing:1px; cursor:pointer; ${colorRule}" title="Sort by ${c}">${displayC}${indicator}</th>`;
            });
            h += `</tr></thead><tbody>`;
            data.forEach(row => {
                h += `<tr>`;
                cols.forEach(c => {
                    let rawVal = row[c];
                    let val = typeof rawVal === 'object' && rawVal !== null ? JSON.stringify(rawVal) : String(rawVal === undefined || rawVal === null ? "" : rawVal);
                    
                    let cellColor = "color:#cbd5e1;";
                    let prefix = "";
                    let cLow = c.toLowerCase();
                    
                    if (cLow === 'transaction_type' || cLow === 'unit_weight_g' || cLow === 'unit_china_landed_price' || cLow === 'net_profit' || cLow === 'transaction_fees' || cLow === 'cogs_at_sale') {
                        cellColor = "color:#e9d5ff; font-weight:800; background:rgba(168,85,247,0.05);";
                        prefix = `<span style="font-size:10px; margin-right:4px;">🧮</span>`;
                    } else if (cLow === 'total_dist_weight_g' && row._is_distributed) {
                        cellColor = "color:#e9d5ff; font-weight:800; background:rgba(168,85,247,0.05);";
                        prefix = `<span style="font-size:10px; margin-right:4px;">🧮</span>`;
                    } else if (cLow === 'order_total' && (parseFloat(row.makeup_fee) > 0)) {
                        cellColor = "color:#e9d5ff; font-weight:800; background:rgba(168,85,247,0.05);";
                        prefix = `<span style="font-size:10px; margin-right:4px;">🧮</span>`;
                    } else if (cLow.endsWith("_hash") && row[c]) {
                        cellColor = "color:#fde68a; font-family:'Courier New', monospace; font-size:9px;";
                        prefix = `<span style="font-size:10px; margin-right:4px;">🔐</span>`;
                    }
                    
                    h += `<td style="padding:8px 15px; border-bottom:1px solid rgba(255,255,255,0.05); font-family:monospace; max-width:250px; overflow:hidden; text-overflow:ellipsis; ${cellColor}" title="${val.replace(/"/g, '&quot;')}">${prefix}${val}</td>`
                });
                h += `</tr>`;
            });
            h += `</tbody></table>`;
            return h;
        };
        
        let finalHtml = renderTable(window.__sandboxData, window.__sandboxTable1Title, 1);
        if (window.__sandboxData2 && window.__sandboxData2.length > 0) {
            finalHtml += renderTable(window.__sandboxData2, window.__sandboxTable2Title, 2);
        }
        body.innerHTML = finalHtml;
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
        let resObj = type === 'orders' ? await extractOrders(inputNode.files, isTestMode) : await extractParcels(inputNode.files, isTestMode);
        if (resObj.count > 0) {
            importTrace(`Data successfully extracted globally! Detected ${resObj.count} valid dictionary instances.`, false, termId);
            
            if (isTestMode) {
                importTrace(`🧪 SANDBOX INTERCEPT: Array diverted directly to visual inspector.`, true, termId);
                setSysProgress(100, 'success'); setModuleStatus(statId, "🧪 Test Parsed!", "mod-success"); 
                
                if (typeof window.openSandboxModal === 'function') {
                    if (resObj.data2) {
                        window.openSandboxModal(resObj.data, `SANDBOX_${type.toUpperCase()}_RESULTS`, resObj.data2, `${resObj.table} (Primary)`, `${resObj.table2} (Secondary)`);
                    } else {
                        window.openSandboxModal(resObj.data, `SANDBOX_${type.toUpperCase()}_RESULTS`, null, `${resObj.table} (Primary)`);
                    }
                }
                
                inputNode.value = ""; 
                setTimeout(()=> { setModuleStatus(statId, "Ready.", "status-idle"); setSysProgress(0,'working'); }, 3000);
                inputNode.disabled = false;
            } else {
                importTrace(`⚠️ PRODUCTION STAGING INTERCEPT: Array diverted to visual inspector for approval.`, true, termId);
                setSysProgress(100, 'success'); setModuleStatus(statId, "⚠️ Waiting for Sync...", "mod-working"); 
                
                let liveImportContext = { resObj: resObj, statId: statId, termId: termId, type: type, inputNodeId: inputNode.id };
                if (typeof window.openSandboxModal === 'function') {
                    if (resObj.data2) window.openSandboxModal(resObj.data, `PRODUCTION_${type.toUpperCase()}_TARGETS`, resObj.data2, `${resObj.table} (Primary)`, `${resObj.table2} (Secondary)`, liveImportContext);
                    else window.openSandboxModal(resObj.data, `PRODUCTION_${type.toUpperCase()}_TARGETS`, null, `${resObj.table} (Primary)`, null, liveImportContext);
                }
                // We keep inputNode disabled during staging block. It releases during the commit phase.
            }
        } else { 
            importTrace(`HALT WARNING: Zero valid DOM items located in the payload targets.`, true, termId);
            setSysProgress(100, 'error'); setModuleStatus(statId, "❌ No data.", "mod-error"); setTimeout(()=>setSysProgress(0,'working'),3000); 
            inputNode.disabled = false;
        }
    } catch(e) { 
        importTrace(`CRITICAL FAULT: ${e.message}`, true, termId);
        sysLog(e.message, true); setSysProgress(100, 'error'); setModuleStatus(statId, "❌ Error.", "mod-error"); setTimeout(()=>setSysProgress(0,'working'),3000); 
        inputNode.disabled = false;
    }
}

window.commitSandboxImport = async function() {
    let ctx = window.__pendingLiveImportMeta;
    if (!ctx) return;
    
    document.getElementById('sandboxDataModal').style.display = 'none';
    let termId = ctx.termId; let statId = ctx.statId; let resObj = ctx.resObj;
    
    try {
        importTrace(`Transmitting [${resObj.table}] staged payload -> supabaseClient...`, false, termId);
        sysLog(`Pushing ${resObj.count} items...`); setSysProgress(80, 'working');
        const {error} = await supabaseClient.from(resObj.table).upsert(resObj.data, {onConflict: resObj.conflict}); if(error) throw new Error(error.message);
        
        if (resObj.data2) { 
            importTrace(`Secondary relation array found! Transmitting [${resObj.table2}] insertion payload...`, false, termId);
            const {error2} = await supabaseClient.from(resObj.table2).upsert(resObj.data2, {onConflict: resObj.conflict2}); if(error2) throw new Error(error2.message); 
        }
        
        importTrace(`Upload Cycle Completed Successfully! Local data sync triggered.`, false, termId);
        setSysProgress(100, 'success'); setModuleStatus(statId, `✅ Synced!`, 'mod-success'); 
        
        let fileInput = document.getElementById(ctx.inputNodeId);
        if(fileInput) { fileInput.value = ""; fileInput.disabled = false; }
        
        setTimeout(() => { setSysProgress(0,'working'); if(typeof syncAndCalculate === 'function') syncAndCalculate(); }, 1000);
    } catch(e) {
        importTrace(`CRITICAL STAGING FAULT: ${e.message}`, true, termId);
        sysLog(e.message, true); setSysProgress(100, 'error'); setModuleStatus(statId, "❌ Sync Error.", "mod-error"); 
        
        let fileInput = document.getElementById(ctx.inputNodeId);
        if(fileInput) fileInput.disabled = false;
        setTimeout(()=>setSysProgress(0,'working'),3000); 
    }
    window.__pendingLiveImportMeta = null;
};

window.cancelSandboxImport = function() {
    let ctx = window.__pendingLiveImportMeta;
    document.getElementById('sandboxDataModal').style.display = 'none';
    window.__pendingLiveImportMeta = null;
    
    if (ctx) {
        let termId = ctx.termId;
        let statId = ctx.statId;
        importTrace(`🗑️ STAGING ABORTED: Payload discarded securely.`, true, termId);
        setModuleStatus(statId, "Cancelled.", "status-idle");
        setSysProgress(0, 'working');
        
        let fileInput = document.getElementById(ctx.inputNodeId);
        if(fileInput) { 
            fileInput.value = ""; 
            fileInput.disabled = false; 
        }
    }
};

async function extractOrders(files, isTestMode=false) {
    let a = [];
    for(let f of files) {
        let _fText = await f.text();
        window.__LATEST_RAW_ORDER_HTML_DUMP = _fText;
        const d = new DOMParser().parseFromString(_fText, 'text/html');
        let validBlocks = Array.from(d.querySelectorAll('tbody, table, .order-list-item')).filter(el=>el.innerText.includes("Order No：") || el.innerText.match(new RegExp(window.PARSER_RULES.regexOrderNum)));
        
        if (validBlocks.length > 0) {
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
                    let qMatch = r.innerText.match(new RegExp(window.PARSER_RULES.regexQuantity, "i"));
                    let q = qMatch && qMatch[1] ? parseInt(qMatch[1]) : (parseInt(cs[2].innerText.replace(/[^0-9]/g,''))||1);
                    
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
                    
                    let nameMatch = r.innerText.match(new RegExp(window.PARSER_RULES.regexItemName, "i"));
                    if(nameMatch && nameMatch[1]) pn = nameMatch[1].trim();
                    
                    if(!pn) {
                        for (let l of Array.from(r.querySelectorAll('a'))) {
                            let t = l.getAttribute('title'), x = l.innerText.trim();
                            if (t && t.length > 10) { pn = t; break; }
                            if (x && x.length > 15 && !x.includes("DI26") && !x.toLowerCase().includes("superbuy") && !x.toLowerCase().includes("contact")) { pn = x; break; }
                        }
                        if(!pn || pn.toLowerCase().includes("product-img")) Array.from(r.querySelectorAll('img')).forEach(i=>{let a=i.getAttribute('alt'); if(a&&a.length>10&&!a.includes("代购商品")){pn=a;return;}});
                    }
                    
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
                    
                    let qMatchLast = r.innerText.match(new RegExp(window.PARSER_RULES.regexQuantity, "i"));
                    let q = qMatchLast && qMatchLast[1] ? parseInt(qMatchLast[1]) : (parseInt(r.querySelectorAll('td')[2]?.innerText.replace(/[^0-9]/g,''))||1);
                    
                    let uclp = up + feePerItem;
                    
                    a.push({di_item_id:id, order_date:dt, order_no:oNo, alibaba_order:tId, item_name:pn, specification:sp, unit_price:parseFloat(up.toFixed(4)), quantity:q, postage:post, order_total:oTot, unit_china_landed_price:parseFloat(uclp.toFixed(4)), makeup_fee: makeup});
                }
            });
        });
    } return { count: a.length, table: 'raw_orders', conflict: 'di_item_id', data: a };
}

async function extractParcels(files, isTestMode=false) {
    let sum=[], itm=[];
    for(let f of files) {
        let _fText = await f.text();
        window.__LATEST_RAW_PARCEL_HTML_DUMP = _fText;
        const d = new DOMParser().parseFromString(_fText, 'text/html'); const bt = d.body.textContent.replace(/\s+/g,' ');
        let pm = bt.match(new RegExp(window.PARCEL_RULES.regexParcelNum, "i")); if(!pm) continue; let pNo = pm[0];
        
        // UNCONDITIONAL CACHING FOR PLAYGROUND: Force physical line breaks between all table cells/rows
        let vHtml = _fText.replace(/<\/(td|tr|div|p|li)>/gi, '</$1>\n').replace(/<br\s*\/?>/gi, '\n');
        let vD = new DOMParser().parseFromString(vHtml, 'text/html');
        let cleaned = vD.body.innerText.split('\n').map(l=>l.trim()).filter(l=>l.length>0).join('\n');
        window.__LATEST_RAW_PARCEL_DUMP = `[📦 PARCEL INSTANCE]\n---------------------------------------\n` + cleaned;

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
                let cb=[], cbw=0; const pb=()=>{ if(cb.length>0){ let tq=cb.reduce((s,i)=>s+i.q,0); if(tq===0) tq=1; let isDist = cb.length>1; cb.forEach(i=>itm.push({parcel_no:pNo, di_item_id:i.d, item_name:i.n, specification:i.s, quantity:i.q, total_dist_weight_g:Math.round(cbw*(i.q/tq)), unit_weight_g:Math.round((cbw*(i.q/tq))/(i.q||1)*100)/100, _is_distributed:isDist})); cb=[]; } };
                for(let j=1; j<t.rows.length; j++){
                    let cs=t.rows[j].cells; if(cs.length>=3){
                        let rn=cs[0]?cs[0].textContent.replace(/View Inspection/g,'').replace(/\s+/g,' ').trim():''; if(!rn) continue;
                        
                        let dm = rn.match(new RegExp(window.PARCEL_RULES.regexLineItemNum, "i"));
                        let dc = dm ? dm[0] : ''; 
                        let rw = dc ? rn.replace(dc,'').trim() : rn;
                        
                        let sm = rw.match(new RegExp(window.PARCEL_RULES.regexSpecs, "i"));
                        let sp = sm && sm[1] ? sm[1].trim() : ''; 
                        let fn = rw;
                        
                        let nameMatch = rn.match(new RegExp(window.PARCEL_RULES.regexItemName, "i"));
                        if (nameMatch && nameMatch[1]) {
                            fn = nameMatch[1].trim();
                        } else {
                            if(sm && sm[0]) { fn = rw.replace(sm[0], '').trim(); }
                            if(sp && fn.includes(sp)) { fn = fn.replace(sp,'').trim(); }
                        }
                        fn = fn.replace(/[-\s,：:]+$/,'').trim();
                        
                        let qMatch = rn.match(new RegExp(window.PARCEL_RULES.regexQuantity, "i"));
                        let q = qMatch && qMatch[1] ? parseInt(qMatch[1]) : (parseInt(cs[1]?cs[1].textContent.trim():0)||0);
                        
                        let pw=parseInt(cs[2]?cs[2].textContent.trim():'');
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

// --- XLSX UTILITY: Converts an ExcelJS Worksheet to an array of plain row objects,
// matching the output format of the legacy XLSX.utils.sheet_to_json() call.
/**
 * @param {object} worksheet - An ExcelJS Worksheet instance
 * @returns {Object[]} Array of row data objects keyed by header row values
 */
function excelSheetToJson(worksheet) {
    const headers = [];
    const rows = [];
    worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) {
            row.eachCell((cell) => headers.push(cell.value !== null && cell.value !== undefined ? String(cell.value) : ''));
        } else {
            const rowObj = {};
            row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                const header = headers[colNumber - 1];
                if (header) rowObj[header] = (cell.value instanceof Date) ? cell.value.toISOString() : (cell.value ?? '');
            });
            if (Object.values(rowObj).some(v => v !== '')) rows.push(rowObj);
        }
    });
    return rows;
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
        const wb = new ExcelJS.Workbook();
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
            if (!exportData || exportData.length === 0) return;
            const ws = wb.addWorksheet(sheetName);
            ws.addRow(Object.keys(exportData[0]));
            exportData.forEach(rowObj => ws.addRow(Object.values(rowObj)));
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
        const buffer = await wb.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const downloadUrl = URL.createObjectURL(blob);
        const downloadAnchor = document.createElement('a');
        downloadAnchor.href = downloadUrl;
        downloadAnchor.download = `Neogleamz_Full_Backup_${dateStr}_${timeStr}.xlsx`;
        downloadAnchor.click();
        URL.revokeObjectURL(downloadUrl);
        setMasterStatus("Export Complete!", "mod-success"); setTimeout(()=>setMasterStatus("Ready.", "status-idle"), 2000);
    } catch (e) { sysLog(e.message, true); setMasterStatus("Export Error", "mod-error"); }
}

let pendingRestoreData = {};
function handleFileSelect(input) {
    const file = input.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.load(e.target.result);
            pendingRestoreData = {}; let html = '';
            for (const worksheet of workbook.worksheets) {
                const sheetName = worksheet.name;
                const roa = excelSheetToJson(worksheet);
                if (roa.length > 0) { pendingRestoreData[sheetName] = roa; html += `<label style="display:flex; align-items:center; justify-content:flex-start; gap:10px; font-size:13px; margin:6px 0; color:var(--text-main); font-weight:bold;"><input type="checkbox" class="restore-chk" value="${sheetName}" checked style="width:16px; height:16px; margin:0; flex-shrink:0; cursor:pointer;"> Restore ${sheetName.replace(/_/g, ' ')} (${roa.length} rows)</label>`; }
            }
            document.getElementById('restoreCheckboxes').innerHTML = html; document.getElementById('restorePreview').style.display = 'block';
        } catch (err) { sysLog('Restore file parse error: ' + err.message, true); }
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

// ----------------------------------------------------
// UNIFIED TEMPLATE-DRIVEN REGEX PLAYGROUND BUILDER
// ----------------------------------------------------
window.EXTRACTOR_CONFIGS = {
    orders: {
        title: "Orderz RegEx Playground",
        rulesKey: "PARSER_RULES",
        profilesKey: "PARSER_PROFILES",
        activeProfileIdxKey: "ACTIVE_PROFILE_INDEX",
        evaluatorFn: "evaluateLiveRegex",
        evaluatorAllFn: "evaluateAllRegex",
        saveNewFn: "saveRegexPresetAsNew",
        overwriteFn: "overwriteCurrentRegexPreset",
        deleteFn: "deleteRegexPreset",
        onDropdownChangeFn: "loadSelectedRegexPreset",
        closeModalFn: "closeParserConfig",
        applyBtnFn: "window.PARSER_RULES=window.getCurrentUIRules(); window.closeParserConfig();",
        livePlaygroundPayloadId: "liveRegexPlaygroundPayload",
        searchBoxId: "liveRegexSearchBox",
        toggleViewFn: "toggleRawOrderView",
        resetFn: "restoreDefaultParserRules",
        presetDropdownId: "regexPresetSelect",
        groups: [
            {
                table: "raw_orders",
                label_suffix: "ORDER METADATA",
                icon: "🗂️",
                color: "#38bdf8",
                fields: [
                    { id: "regexOrderNum", prop: "regexOrderNum", label: "Order Number (DO String)", type: "input", color: "#ec4899", placeholder: "/DO\\\\d+/" },
                    { id: "regexOrderDate", prop: "regexOrderDate", label: "Order Date Structure", type: "input", color: "#8b5cf6", placeholder: "/\\\\d{4}-\\\\d{2}-\\\\d{2}/" },
                    { id: "regexOrderTotal", prop: "regexOrderTotal", label: "Total Amount Parser (Capture Group 1)", type: "input", color: "#10b981", placeholder: "/Total Amount:.*?[￥$]\\\\s*([\\\\d.]+)/i" },
                    { id: "regexFeeStructure", prop: "regexPostage", label: "Postage Deductions ({FEE_NAME} intercepts string)", type: "input", color: "#f43f5e", placeholder: "/{FEE_NAME}\\\\s*-\\\\s*(?:US \\\\$|CN ￥)\\\\s*([\\\\d.]+)/" },
                    { id: "regexSecondaryFee", prop: "regexMakeup", label: "Secondary Make Up Fee (Capture Group 1)", type: "input", color: "#d946ef", placeholder: "/Make up the postage\\\\s*(?:US \\\\$|CN ￥)\\\\s*([\\\\d.]+)/" }
                ]
            },
            {
                table: "raw_orders",
                label_suffix: "LINE ITEMS",
                icon: "📦",
                color: "#ec4899",
                fields: [
                    { id: "regexLineItemNum", prop: "regexLineItemNum", label: "Line Item Internal Number (DI String)", type: "input", color: "#06b6d4", placeholder: "/DI\\\\d+/" },
                    { id: "regexAlibabaOrder", prop: "regexAlibabaOrder", label: "Alibaba Target Order ID", type: "readonly", color: "#64748b", placeholder: "🤖 System Auto-Extracted via (?:ALIBABA|TB|Order) pattern." },
                    { id: "regexUnitPrice", prop: "regexUnitPrice", label: "Unit Price Identifier (Capture Group 1)", type: "input", color: "#6366f1", placeholder: "/Unit\\\\s*Price.*?([\\\\d.]+)/i" },
                    { id: "regexItemName", prop: "regexItemName", label: "Item Name Parser (Capture Group 1)", type: "input", color: "#eab308", placeholder: "/DI\\\\d+\\\\s+([^\\\\n]+)/" },
                    { id: "regexQuantity", prop: "regexQuantity", label: "Quantity Identifier (Capture Group 1)", type: "input", color: "#3b82f6", placeholder: "/(?:US \\\\$|CN ￥).*?\\\\n(\\\\d+)/" },
                    { id: "regexSpecs", prop: "regexSpecs", label: "Product Specification Tag (Capture Group 1)", type: "textarea", height: "50px", color: "#f59e0b", placeholder: "/(?:Specification model|specification|Product specifications.../" },
                    { id: "regexChinaLanded", prop: "regexChinaLanded", label: "Unit China Landed Price (Calculated)", type: "readonly", color: "#94a3b8", placeholder: "🧮 Math Object: (Unit Price) + (Fees ÷ Total Qty)." }
                ]
            }
        ]
    },
    parcels: {
        title: "Parcelz RegEx Playground",
        rulesKey: "PARCEL_RULES",
        profilesKey: "PARCEL_PROFILES",
        activeProfileIdxKey: "ACTIVE_PARCEL_PROFILE_INDEX",
        evaluatorFn: "evaluateLiveParcelRegex",
        evaluatorAllFn: "evaluateAllParcelRegex",
        saveNewFn: "saveParcelRegexPresetAsNew",
        overwriteFn: "overwriteCurrentParcelRegexPreset",
        deleteFn: "deleteParcelRegexPreset",
        onDropdownChangeFn: "loadSelectedParcelRegexPreset",
        closeModalFn: "closeParcelConfig",
        applyBtnFn: "window.PARCEL_RULES=window.getCurrentParcelUIRules(); window.closeParcelConfig();",
        livePlaygroundPayloadId: "liveParcelRegexPlaygroundPayload",
        searchBoxId: "liveParcelRegexSearchBox",
        toggleViewFn: "toggleRawParcelView",
        resetFn: "restoreDefaultParcelRules",
        presetDropdownId: "parcelPresetSelect",
        groups: [
            {
                table: "raw_parcel_summary",
                label_suffix: "METADATA",
                icon: "🗂️",
                color: "#38bdf8",
                fields: [
                    { id: "regexParcelNum", prop: "regexParcelNum", label: "Parcel Number", type: "input", color: "#ec4899", placeholder: "/PN\\\\d{11}/" },
                    { id: "regexActualPaid", prop: "regexActualPaid", label: "Total Actual Paid", type: "input", color: "#8b5cf6", placeholder: "/Actual Paid\\\\s*:\\\\s*US \\\\$\\\\s*([\\\\d.]+)/" },
                    { id: "regexChargeableWeight", prop: "regexChargeableWeight", label: "Chargeable Weight", type: "input", color: "#10b981", placeholder: "/Actual Chargeable Weight\\\\s*(\\\\d+)\\\\s*g/" },
                    { id: "regexFeeStructure", prop: "regexFeeStructure", label: "Base Fee Extractor ({FEE_NAME} intercepts string)", type: "input", color: "#f43f5e", placeholder: "/{FEE_NAME}\\\\s*(?:US \\\\$|CN ￥)\\\\s*([\\\\d.]+)/" },
                    { id: "regexDeductionStructure", prop: "regexDeductionStructure", label: "Base Deduction Extractor ({FEE_NAME} intercepts string)", type: "input", color: "#d946ef", placeholder: "/{FEE_NAME}\\\\s*-\\\\s*(?:US \\\\$|CN ￥)\\\\s*([\\\\d.]+)/" }
                ]
            },
            {
                table: "raw_parcel_items",
                label_suffix: "LINE ITEMS",
                icon: "📦",
                color: "#ec4899",
                fields: [
                    { id: "regexParcelLineItemNum", prop: "regexLineItemNum", label: "Line Item Number (DI String)", type: "input", color: "#06b6d4", placeholder: "/DI\\\\d+/" },
                    { id: "regexParcelItemName", prop: "regexItemName", label: "Item Name Parser (Capture Group 1)", type: "input", color: "#eab308", placeholder: "/DI\\\\d+\\\\s+([^\\\\n]+)/" },
                    { id: "regexParcelQuantity", prop: "regexQuantity", label: "Quantity Identifier (Capture Group 1)", type: "input", color: "#3b82f6", placeholder: "/\\\\n(\\\\d+)\\\\n\\\\d+(?:\\\\n|$)/" },
                    { id: "regexGroupWeight", prop: "regexGroupWeight", label: "Base Group Weight Extractor (Capture Group 1)", type: "input", color: "#a855f7", placeholder: "/\\\\n\\\\d+\\\\n(\\\\d+)(?:\\\\n|$)/" },
                    { id: "regexParcelSpecs", prop: "regexSpecs", label: "Product Specification Tag", type: "textarea", height: "50px", color: "#f59e0b", placeholder: "/(?:specification|Color|model)[：:]\\\\s*(.*)/" },
                    { id: "regexTotalDistWeight", prop: "regexTotalDistWeight", label: "Total Dist. Weight (Calculated G)", type: "readonly", color: "#7c3aed", placeholder: "🧮 Math Object: Base Weight split dynamically by Unit Array." },
                    { id: "regexUnitWeight", prop: "regexUnitWeight", label: "Unit Weight (Calculated G)", type: "readonly", color: "#c084fc", placeholder: "🧮 Math Object: (Total Dist. Weight) ÷ (Quantity)." }
                ]
            }
        ]
    }
};

window.openGlobalRegexPlayground = function(type) {
    if (type === "orders" && !window.PARSER_RULES) loadParserConfig();
    if (type === "parcels" && !window.PARCEL_RULES) loadParcelConfig();
    
    let conf = window.EXTRACTOR_CONFIGS[type];
    if (!conf) return;

    let h = `<div style="background:var(--bg-panel); border:1px solid var(--border-color); border-radius:12px; width:98vw; height:94vh; margin-top:30px; display:flex; flex-direction:column; box-shadow:0 15px 50px rgba(0,0,0,0.5);">
        <div style="padding:15px 25px; border-bottom:1px solid rgba(255,255,255,0.1); display:flex; align-items:center; background:rgba(56, 189, 248, 0.1); border-radius:12px 12px 0 0; position:relative;">
            <div style="flex:1;">
                <h2 style="margin:0; font-size:18px; color:#38bdf8; display:flex; align-items:center; gap:10px;">⚙️ <span>${conf.title}</span></h2>
                <p style="margin:4px 0 0 0; font-size:12px; color:var(--text-muted); padding-right:30px;">Visually verify logic mappings. As you type, the engine evaluates your strings instantly against the cached target.</p>
            </div>
            <div style="display:flex; align-items:center; gap:15px; margin-top:-6px;">
                <button type="button" onclick="event.stopPropagation(); event.preventDefault(); window.open('https://regex101.com/', '_blank'); return false;" style="cursor:pointer; font-size:13px; color:#10b981; text-decoration:none; display:flex; align-items:center; justify-content:center; gap:5px; border:1px solid #10b981; padding:0 15px; border-radius:6px; background:rgba(16, 185, 129, 0.1); max-width:max-content; height:32px;">📚 REGEX HELPER ENGINE ↗</button>
                <button onclick="window.${conf.closeModalFn}()" class="btn-red-muted" style="font-size:13px; font-weight:bold; height:32px; width: max-content; padding: 0 15px;" title="Close Window">Close</button>
            </div>
        </div>
        
        <div style="display:flex; flex:1; overflow:hidden;">
            <!-- Left Column: Input Fields -->
            <div style="flex:1; padding:15px; overflow-y:auto; border-right:1px solid rgba(255,255,255,0.05); display:flex; flex-direction:column; gap:8px; max-width:400px; font-size:11px;">
                
                <div style="padding:10px; border:1px solid rgba(${type==='orders'?'56, 189, 248':'245, 158, 11'}, 0.3); background:rgba(${type==='orders'?'56, 189, 248':'245, 158, 11'}, 0.05); border-radius:8px; display:flex; flex-direction:column; gap:6px;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span style="font-size:11px; color:#fff; font-weight:bold;">Active Regex Profile</span>
                        <div style="display:flex; gap:6px;">
                            <button onclick="window.${conf.saveNewFn}()" class="btn-blue-muted btn-sm" style="font-size:9px;">💾 Save As New</button>
                            <button id="btnOverwritePreset" onclick="window.${conf.overwriteFn}()" class="btn-orange-muted btn-sm" style="font-size:9px; display:none;">🔄 Overwrite</button>
                            <button id="btnDeletePreset" onclick="window.${conf.deleteFn}()" class="btn-red-muted btn-sm" style="font-size:9px; display:none;">🗑️ Delete</button>
                        </div>
                    </div>
                    <select id="${conf.presetDropdownId}" class="input-dark" style="font-size:11px; padding:4px; width:100%; border:1px solid ${type==='orders'?'#38bdf8':'#f59e0b'};" onchange="window.${conf.onDropdownChangeFn}()"></select>
                </div>`;

    conf.groups.forEach((g, gIdx) => {
        let suffixHTML = g.label_suffix ? `<span style="opacity:0.7; font-size:10px;">(${g.label_suffix})</span>` : ``;
        h += `<div style="margin: 10px 0 0 0; padding-bottom:5px; border-bottom:2px solid ${g.color}; cursor:pointer;" onclick="let el=document.getElementById('dynGrp_${type}_${gIdx}'); el.style.display=el.style.display==='none'?'flex':'none';">
            <h3 style="margin:0; font-size:12px; color:${g.color}; text-transform:uppercase; display:flex; justify-content:space-between; align-items:center;">
                <span>${g.icon} ${g.table} ${suffixHTML}</span> <span style="font-size:10px; opacity:0.5;">▼</span>
            </h3>
        </div>
        <div id="dynGrp_${type}_${gIdx}" style="display:flex; flex-direction:column; gap:8px;">`;
        
        g.fields.forEach(f => {
            h += `<div style="padding-bottom:10px; border-bottom:1px dashed rgba(255,255,255,0.1);">
                    <h4 style="margin:0 0 4px 0; color:${f.color}; font-size:11px;">${f.label}</h4>`;
            
            
            if (f.type === "textarea") {
                 h += `<textarea id="${f.id}" onkeyup="window.${conf.evaluatorFn}('${f.id}')" style="width:100%; height:${f.height}; font-family:monospace; background:black; color:#10b981; resize:vertical; padding:6px; border:1px solid var(--border-color); border-radius:6px; font-size:10px;" placeholder="${f.placeholder}"></textarea>`;
            } else if (f.type === "readonly") {
                 h += `<div style="width:100%; font-family:monospace; background:rgba(0,0,0,0.5); color:${f.color}; font-size:11px; padding:6px; border:1px solid ${f.color}40; border-radius:4px; display:flex; align-items:center; gap:6px;">${f.placeholder}</div>`;
            } else {
                 h += `<input type="text" id="${f.id}" onkeyup="window.${conf.evaluatorFn}('${f.id}')" style="width:100%; font-family:monospace; background:black; color:#10b981; font-size:11px;" placeholder="${f.placeholder}">`;
            }
            if (f.type !== "readonly") h += `<div id="eval_${f.id}" style="font-size:10px; margin-top:4px; min-height:12px; color:#cbd5e1;"></div>`;
            h += `</div>`;
        });
        h += `</div>`;
    });

    h += `</div>
            <!-- Right Column: Live Target Payload -->
            <div style="flex:1; padding:20px; background:rgba(0,0,0,0.3); border-radius: 0 0 12px 0; display:flex; flex-direction:column;">
                <h3 style="margin:0 0 10px 0; color:#f59e0b; display:flex; justify-content:space-between; align-items:center;">
                    🎯 Live Target Text Payload
                    <div style="display:flex; gap:6px;">
                        <button id="btnToggleView" onclick="window.${conf.toggleViewFn}()" class="btn-slate-muted btn-sm" style="font-size:10px;">👁️ VIEW SOURCE HTML</button>
                        <button onclick="window.${conf.resetFn}()" class="btn-red-muted btn-sm" style="font-size:10px;">RESET TO DEFAULTS</button>
                    </div>
                </h3>
                <input type="text" id="${conf.searchBoxId}" class="input-dark" style="margin-bottom:10px; font-size:12px; font-family:monospace; width:100%;" placeholder="🔍 Search:   Type to instantly find and highlight string matches..." onkeyup="window.${conf.evaluatorAllFn}()">
                
                <div style="position:relative; flex:1; border:1px solid rgba(255,255,255,0.1); border-radius:6px; overflow:hidden;">
                    <textarea id="${conf.livePlaygroundPayloadId}" style="position:absolute; top:0; left:0; width:100%; height:100%; background:transparent; color:transparent; caret-color:#10b981; font-family:monospace; font-size:11px; padding:10px; resize:none; border:none; z-index:1;" oninput="window.${conf.evaluatorAllFn}()" spellcheck="false"></textarea>
                    
                    <!-- Visualization Layer below the transparent text -->
                    <div id="${type}liveRegexHighlightLayer" style="position:absolute; top:0; left:0; width:100%; height:100%; font-family:monospace; font-size:11px; padding:10px; pointer-events:none; z-index:0; overflow:hidden; white-space:pre-wrap; word-wrap:break-word; color:#cbd5e1; background:black;"></div>
                </div>
            </div>
        </div>
        
        <!-- Modal Footer -->
        <div style="padding:15px 25px; background:var(--bg-panel); border-top:1px solid rgba(255,255,255,0.1); display:flex; justify-content:flex-end; gap:10px; border-radius:0 0 12px 12px;">
            <button class="btn-red-muted" onclick="window.${conf.closeModalFn}()">Cancel</button>
            <button class="btn-green-neon" style="padding:10px 25px; font-weight:bold;" onclick="${conf.applyBtnFn}">✅ APPLY ACTIVE RULES (TEMPORARY)</button>
        </div>
    </div>`;

    document.getElementById("globalRegexPlaygroundModalContainer").innerHTML = h;
    document.getElementById("globalRegexPlaygroundModalContainer").style.display = "flex";

    // Bind scroll syncing between textarea and highlight layer safely
    let payloadBox = document.getElementById(conf.livePlaygroundPayloadId);
    let hlLayer = document.getElementById(type + "liveRegexHighlightLayer");
    if (payloadBox && hlLayer) {
        payloadBox.addEventListener("scroll", function() {
            hlLayer.scrollTop = payloadBox.scrollTop;
            hlLayer.scrollLeft = payloadBox.scrollLeft;
        });
    }

    // Explicit backward compatibility for older hardcoded spans
    // Note: older evaluateLiveRegex functions look directly for 'liveRegexHighlightLayer'
    if (type === "orders") hlLayer.id = "liveRegexHighlightLayer";
    if (type === "parcels") hlLayer.id = "liveParcelRegexHighlightLayer";

    // Now populate the generated interface with the current active rules mapped in JSON
    let activeRules = window[conf.rulesKey];
    conf.groups.forEach(g => {
        g.fields.forEach(f => {
            let el = document.getElementById(f.id);
            if(el) el.value = activeRules[f.prop] || "";
        });
    });

    if (type === "orders") {
        document.getElementById(conf.livePlaygroundPayloadId).value = window.__LATEST_RAW_ORDER_DUMP || "";
        window._isOrderRawView = false;
        if(typeof window.renderPresetDropdown === 'function') window.renderPresetDropdown();
        if(typeof window.evaluateAllRegex === 'function') setTimeout(window.evaluateAllRegex, 50);
    } else {
        document.getElementById(conf.livePlaygroundPayloadId).value = window.__LATEST_RAW_PARCEL_DUMP || "";
        window._isParcelRawView = false;
        if(typeof window.renderParcelPresetDropdown === 'function') window.renderParcelPresetDropdown();
        if(typeof window.evaluateAllParcelRegex === 'function') setTimeout(window.evaluateAllParcelRegex, 50);
    }
};



// ==================== PAPER PROFILES MGR ====================
window.activePaperProfiles = [
    { n: 'Dymo 2.25" x 1.25"', w: 2.25, h: 1.25 },
    { n: 'Dymo Address 1.125" x 3.5"', w: 3.5, h: 1.125 },
    { n: 'Dymo Return 0.75" x 2"', w: 2, h: 0.75 },
    { n: 'Dymo Multi 2.125" x 1"', w: 2.125, h: 1 },
    { n: 'Square 1.0" x 1.0"', w: 1, h: 1 },
    { n: 'Standard 3.0" x 1.0"', w: 3, h: 1 },
    { n: 'Shipping 4.0" x 6.0"', w: 4, h: 6 },
    { n: 'A4 Sheet List', w: 8.5, h: 11 }
];

async function loadPaperProfiles() {
    try {
        const { data, error } = await supabaseClient.from('app_settings').select('setting_value').eq('setting_key', 'paper_profiles').single();
        if (data && data.setting_value) {
            window.activePaperProfiles = data.setting_value;
        } else {
            await savePaperProfiles(false);
        }
    } catch(e) {
        console.warn("No paper profiles cloud config found. Initializing defaults.");
    }
    renderPaperProfileTable();
    renderPaperProfileDropdowns();
}

async function savePaperProfiles(silent = false) {
    if (!silent) setMasterStatus("Saving Papers...", "mod-working");
    try {
        await supabaseClient.from('app_settings').upsert({ setting_key: 'paper_profiles', setting_value: window.activePaperProfiles });
        if (!silent) {
            setMasterStatus("Profiles Saved!", "mod-success");
            setTimeout(() => setMasterStatus("Ready.", "status-idle"), 2000);
            renderPaperProfileDropdowns();
        }
    } catch(e) {
        if (!silent) setMasterStatus("Error Saving", "mod-error");
    }
}

let editingPaperIdx = -1;

function renderPaperProfileTable() {
    const tbody = document.getElementById('paperProfileTableBody');
    if (!tbody) return;
    let h = '';
    window.activePaperProfiles.forEach((p, idx) => {
        if (editingPaperIdx === idx) {
             h += `<tr>`;
             h += `<td style="padding:10px; border-bottom:1px solid rgba(255,255,255,0.1);"><input type="text" id="inlineEditN_${idx}" value="${p.n.replace(/"/g, '&quot;')}" style="width:100%; padding:4px; font-size:11px; background:var(--bg-input); color:white; border:1px solid var(--border-color); border-radius:4px;"></td>`;
             h += `<td style="padding:10px; border-bottom:1px solid rgba(255,255,255,0.1);"><input type="number" id="inlineEditW_${idx}" value="${p.w}" style="width:60px; padding:4px; font-size:12px; text-align:right; background:var(--bg-input); color:white; border:1px solid var(--border-color); border-radius:4px;"></td>`;
             h += `<td style="padding:10px; border-bottom:1px solid rgba(255,255,255,0.1);"><input type="number" id="inlineEditH_${idx}" value="${p.h}" style="width:60px; padding:4px; font-size:12px; text-align:right; background:var(--bg-input); color:white; border:1px solid var(--border-color); border-radius:4px;"></td>`;
             h += `<td style="padding:10px; text-align:center; border-bottom:1px solid rgba(255,255,255,0.1);">
                      <div style="display:flex; justify-content:center; gap:6px;">
                          <button class="btn-green btn-action-dense" style="display:flex; justify-content:center; align-items:center;" onclick="saveInlineEditPaper(${idx})">SAVE</button>
                      </div>
                   </td>`;
             h += `</tr>`;
        } else {
             h += `<tr>`;
             h += `<td style="padding:10px; border-bottom:1px solid rgba(255,255,255,0.1); font-weight:bold;">${p.n}</td>`;
             h += `<td style="padding:10px; text-align:right; border-bottom:1px solid rgba(255,255,255,0.1);">${p.w}"</td>`;
             h += `<td style="padding:10px; text-align:right; border-bottom:1px solid rgba(255,255,255,0.1);">${p.h}"</td>`;
             h += `<td style="padding:10px; border-bottom:1px solid rgba(255,255,255,0.1);">
                      <div style="display:flex; justify-content:center; gap:6px;">
                          <button class="btn-ghost-base btn-ghost-brand btn-action-dense" style="display:flex; justify-content:center; align-items:center;" onclick="editPaperProfile(${idx})">✏️</button>
                          <button class="btn-red-muted btn-action-dense" style="display:flex; justify-content:center; align-items:center;" onclick="deletePaperProfile(${idx})">🗑️</button>
                      </div>
                   </td>`;
             h += `</tr>`;
        }
    });
    tbody.innerHTML = h;
}

function editPaperProfile(idx) {
    editingPaperIdx = idx;
    renderPaperProfileTable();
}

function saveInlineEditPaper(idx) {
    const n = document.getElementById(`inlineEditN_${idx}`).value.trim();
    const w = parseFloat(document.getElementById(`inlineEditW_${idx}`).value);
    const h = parseFloat(document.getElementById(`inlineEditH_${idx}`).value);
    if (!n || isNaN(w) || isNaN(h) || w <= 0 || h <= 0) return alert('Invalid paper dimensions.');
    
    window.activePaperProfiles[idx] = { n, w, h };
    editingPaperIdx = -1;
    renderPaperProfileTable();
    savePaperProfiles(false);
}

function addPaperProfile() {
    const n = document.getElementById('newPaperName').value.trim();
    const w = parseFloat(document.getElementById('newPaperW').value);
    const h = parseFloat(document.getElementById('newPaperH').value);
    if (!n || isNaN(w) || isNaN(h) || w <= 0 || h <= 0) return alert('Invalid paper dimensions.');
    
    window.activePaperProfiles.push({ n, w, h });
    
    document.getElementById('newPaperName').value = '';
    document.getElementById('newPaperW').value = '';
    document.getElementById('newPaperH').value = '';
    renderPaperProfileTable();
    savePaperProfiles(false);
}

function deletePaperProfile(idx) {
    if(!confirm("Delete this Paper Profile?")) return;
    window.activePaperProfiles.splice(idx, 1);
    renderPaperProfileTable();
    savePaperProfiles(false);
}

function renderPaperProfileDropdowns() {
    const lists = ['barcodzSizeSelect', 'labelzSizeSelect', 'labelzDesignerSize'];
    lists.forEach(id => {
        const sel = document.getElementById(id);
        if (!sel) return;
        let pValStr = sel.value; 
        let pName = "";
        try { pName = JSON.parse(pValStr).n; } catch(e) {}
        
        let h = '';
        window.activePaperProfiles.forEach(p => {
            let jsonStr = JSON.stringify(p).replace(/"/g, '&quot;');
            let selStr = p.n === pName ? ' selected' : '';
            h += `<option value="${jsonStr}"${selStr}>${p.n}</option>`;
        });
        sel.innerHTML = h;
    });
}
// ============================================================
