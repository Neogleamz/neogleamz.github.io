// --- 11. PRODUCTION MANAGER, ROUTING ENGINE, MEDIA, EXPORTS ---
function parseMediaUrl(url) { if(!url) return null; let m = url.match(/\/(?:file\/d\/|uc\?id=|open\?id=)([a-zA-Z0-9_-]+)/); return m ? m[1] : null; }
function openMediaModal(url, renderType) { try { const container = document.getElementById('mediaContainer'); if(renderType === 'img') { container.style.background = 'transparent'; container.innerHTML = `<img src="${url}" style="max-width:100%; max-height:100%; object-fit:contain; cursor: zoom-out;" onclick="closeMediaModal()">`; } else { container.style.background = '#ffffff'; container.innerHTML = `<iframe src="${url}" style="width:100%; height:100%; border:none;" allowfullscreen allow="autoplay"></iframe>`; } document.getElementById('mediaModal').style.display = 'flex'; } catch(e) { sysLog(e.message, true); } }
function closeMediaModal() { try { document.getElementById('mediaModal').style.display = 'none'; document.getElementById('mediaContainer').innerHTML = ''; } catch(e) { sysLog(e.message, true); } }

function execRT(cmd, val=null) { document.execCommand(cmd, false, val); }
function getRTToolbar() { return `<div class="rt-toolbar"><button type="button" class="rt-btn" onmousedown="event.preventDefault(); execRT('bold')" title="Bold"><b>B</b></button><button type="button" class="rt-btn" onmousedown="event.preventDefault(); execRT('italic')" title="Italic"><i>I</i></button><button type="button" class="rt-btn" onmousedown="event.preventDefault(); execRT('underline')" title="Underline"><u>U</u></button><button type="button" class="rt-btn" onmousedown="event.preventDefault(); execRT('strikeThrough')" title="Strikethrough"><s>S</s></button><span style="color:var(--border-input); margin:0 4px;">|</span><button type="button" class="rt-btn" onmousedown="event.preventDefault(); execRT('justifyLeft')" title="Align Left">⬅</button><button type="button" class="rt-btn" onmousedown="event.preventDefault(); execRT('justifyCenter')" title="Align Center">⬌</button><button type="button" class="rt-btn" onmousedown="event.preventDefault(); execRT('justifyRight')" title="Align Right">➡</button><span style="color:var(--border-input); margin:0 4px;">|</span><button type="button" class="rt-btn" onmousedown="event.preventDefault(); execRT('insertUnorderedList')" title="Bullet List">●</button><button type="button" class="rt-btn" onmousedown="event.preventDefault(); execRT('insertOrderedList')" title="Number List">1.</button><span style="color:var(--border-input); margin:0 4px;">|</span><input type="color" onchange="execRT('foreColor', this.value)" title="Text Color" style="width:24px; height:24px; padding:0; border:none; cursor:pointer; background:transparent;"><select onchange="execRT('fontSize', this.value)" style="width:auto; padding:4px; font-size:12px; border:1px solid var(--border-input); border-radius:4px; background:var(--bg-input); color:var(--text-main);"><option value="3">Normal Font</option><option value="4">Large Font</option><option value="5">Huge Font</option></select></div>`; }

function generateEditableSOPRow(s, idx) {
    let safeText = s.text || ''; let m1 = s.m1 || {type: s.type || 'img', url: s.url || ''}; let m2 = s.m2 || {type: 'img', url: ''}; let m3 = s.m3 || {type: 'img', url: ''};
    let rowGen = (m, n) => { let u = (m.url||'').replace(/"/g,'"').replace(/'/g,"\\'"); return `<div class="media-row"><select class="m${n}-type" style="border:1px solid var(--border-input); background:var(--bg-input); color:var(--text-main);"><option value="img" ${m.type==='img'?'selected':''}>🖼️ Image</option><option value="doc" ${m.type==='doc'?'selected':''}>📄 Doc</option><option value="vid" ${m.type==='vid'?'selected':''}>🎬 Vid</option></select><input type="text" class="m${n}-url" value="${u}" placeholder="URL ${n}" style="border:1px solid var(--border-input); background:var(--bg-input); color:var(--text-main);"></div>`; };
    return `<div class="sop-step-row"><div class="sop-step-movers"><button class="icon-btn" style="width:28px!important; height:28px; font-size:14px; border:none; background:var(--bg-input);" onclick="moveSOPUp(this)">▲</button><button class="icon-btn" style="width:28px!important; height:28px; font-size:14px; border:none; background:var(--bg-input);" onclick="moveSOPDown(this)">▼</button><button class="btn-red icon-btn" style="width:28px!important; height:28px; font-size:12px; margin-top:auto;" onclick="removeSOPRow(this)">X</button></div><div class="sop-text-container"><div class="sop-text-rich" contenteditable="true" placeholder="Type instructions here...">${safeText}</div></div><div class="sop-controls-container">${getRTToolbar()}<div style="font-size:11px; font-weight:bold; color:var(--text-muted); margin-top:4px;">ATTACHMENTS (Optional)</div>${rowGen(m1, 1)} ${rowGen(m2, 2)} ${rowGen(m3, 3)}</div></div>`;
}

function openSOPMasterModal() { document.getElementById('sopMasterModal').style.display = 'flex'; }
function renderMasterSOP() { try { const p = document.getElementById('sopMasterProductSelect').value; const area = document.getElementById('sopMasterEditorArea'); if(!p) { area.innerHTML = "<div style='color:var(--text-muted); text-align:center; padding:20px; font-size:18px;'>Select a product above to start writing instructions.</div>"; return; } let steps = sopsDB[p] || []; let mappedSteps = steps.map(s => typeof s === 'string' ? {text: s, m1: {url:"", type:"img"}, m2: {url:"", type:"img"}, m3: {url:"", type:"img"}} : s); if(mappedSteps.length === 0) mappedSteps = [{}]; let h = ""; mappedSteps.forEach((s, idx) => { h += generateEditableSOPRow(s, idx); }); h += `<button class="btn-blue" style="width:auto; padding:10px 20px; font-size:14px; align-self:flex-start;" onclick="addSOPRow('sopMasterEditorArea')">+ Add New Step</button>`; area.innerHTML = h; } catch(e) { sysLog(e.message, true); } }

function addSOPRow(areaId) { try { const area = document.getElementById(areaId); const btn = area.querySelector('.btn-blue'); const div = document.createElement('div'); div.outerHTML = generateEditableSOPRow({}, 999); area.insertBefore(document.createRange().createContextualFragment(div.outerHTML), btn); } catch(e) {} }
function removeSOPRow(btn) { try { btn.closest('.sop-step-row').remove(); } catch(e) {} }
function moveSOPUp(btn) { try { let row = btn.closest('.sop-step-row'); if(row.previousElementSibling && row.previousElementSibling.classList.contains('sop-step-row')) { row.parentNode.insertBefore(row, row.previousElementSibling); } } catch(e) {} }
function moveSOPDown(btn) { try { let row = btn.closest('.sop-step-row'); if(row.nextElementSibling && row.nextElementSibling.classList.contains('sop-step-row')) { row.parentNode.insertBefore(row.nextElementSibling, row); } } catch(e) {} }

function extractSOPDataFromUI(containerId) {
    let steps = []; document.getElementById(containerId).querySelectorAll('.sop-step-row').forEach(row => { let t = row.querySelector('.sop-text-rich'); let m1t = row.querySelector('.m1-type').value; let m1u = row.querySelector('.m1-url').value; let m2t = row.querySelector('.m2-type').value; let m2u = row.querySelector('.m2-url').value; let m3t = row.querySelector('.m3-type').value; let m3u = row.querySelector('.m3-url').value; if(t && t.innerHTML.trim()) { steps.push({ text: t.innerHTML.trim(), m1: {type: m1t, url: m1u}, m2: {type: m2t, url: m2u}, m3: {type: m3t, url: m3u} }); } }); return steps;
}

async function saveMasterSOP() { try { const p = document.getElementById('sopMasterProductSelect').value; if(!p) return; let steps = extractSOPDataFromUI('sopMasterEditorArea'); sopsDB[p] = steps; sysLog(`Saving Master SOP for ${p}`); setMasterStatus("Saving...", "mod-working"); const {error} = await supabaseClient.from('production_sops').upsert({product_name: p, steps: steps}); if(error) throw new Error(error.message); setMasterStatus("Saved!", "mod-success"); setTimeout(()=>setMasterStatus("Ready.", "status-idle"), 2000); document.getElementById('sopMasterModal').style.display = 'none'; if(currentWO && currentWO.product_name === p) renderActiveWO(currentWO.wo_id); } catch(e) { sysLog(e.message, true); setMasterStatus("Error", "mod-error"); } }
async function saveInlineSOP() { try { if(!currentWO) return; const p = currentWO.product_name; let steps = extractSOPDataFromUI('inlineSOPContainer'); sopsDB[p] = steps; sysLog(`Saving Inline SOP for ${p}`); setMasterStatus("Saving...", "mod-working"); const {error} = await supabaseClient.from('production_sops').upsert({product_name: p, steps: steps}); if(error) throw new Error(error.message); setMasterStatus("Saved!", "mod-success"); setTimeout(()=>setMasterStatus("Ready.", "status-idle"), 2000); toggleSOPLock(); } catch(e) { sysLog(e.message, true); setMasterStatus("Error", "mod-error"); } }

function openNewWOModal() { document.getElementById('woErrorBox').style.display = 'none'; document.getElementById('woRoutingArea').style.display = 'none'; document.getElementById('newWOQty').value = 1; document.getElementById('newWOModal').style.display = 'flex'; checkWORouting(); }

function checkWORouting() {
    const p = document.getElementById('newWOProduct').value;
    const q = parseFloat(document.getElementById('newWOQty').value) || 0;
    const rArea = document.getElementById('woRoutingArea');
    const rList = document.getElementById('woRoutingList');
    if(!p || q <= 0) { rArea.style.display = 'none'; return; }

    let subsNeeded = {};
    (productsDB[p] || []).forEach(part => {
        let k = String(part.item_key || part.di_item_id || part.name || "");
        let pq = (parseFloat(part.quantity || part.qty) || 1) * q;
        if (k.startsWith('RECIPE:::')) {
            let subName = k.replace('RECIPE:::', '');
            if(isSubassemblyDB[subName]) { subsNeeded[subName] = (subsNeeded[subName] || 0) + pq; }
        }
    });

    let keys = Object.keys(subsNeeded);
    if(keys.length === 0) { rArea.style.display = 'none'; return; }

    rArea.style.display = 'block'; let h = "";
    keys.forEach(k => {
        let req = subsNeeded[k]; let invKey = `RECIPE:::${k}`; let i = inventoryDB[invKey] || {produced_qty:0, sold_qty:0};
        let onHand = i.produced_qty - i.sold_qty; let autoPull = Math.min(req, Math.max(0, onHand)); let autoBuild = req - autoPull;
        let safeK = k.replace(/\s+/g,'_').replace(/[^a-zA-Z0-9_]/g, '');
        h += `<div class="route-row" data-subname="${k}">
                <div style="display:flex; flex-direction:column;">
                    <strong style="color:var(--text-heading); font-size:13px;">⚙️ ${k}</strong>
                    <span style="font-size:11px; color:var(--text-muted);">Need: ${req.toFixed(2)} | On Shelf: ${onHand.toFixed(2)}</span>
                </div>
                <div class="route-inputs">
                    <div style="display:flex; flex-direction:column; align-items:center;">
                        <span class="route-label" style="color:#10b981;">Pull Shelf</span>
                        <input type="number" class="route-pull-input" id="route_pull_${safeK}" value="${autoPull.toFixed(2)}" min="0" max="${req}" step="any" oninput="balanceRoute('${safeK}', ${req}, 'pull')">
                    </div>
                    <div style="display:flex; flex-direction:column; align-items:center;">
                        <span class="route-label" style="color:#f59e0b;">Build Scratch</span>
                        <input type="number" class="route-build-input" id="route_build_${safeK}" value="${autoBuild.toFixed(2)}" min="0" max="${req}" step="any" oninput="balanceRoute('${safeK}', ${req}, 'build')">
                    </div>
                </div>
              </div>`;
    });
    rList.innerHTML = h;
}

function balanceRoute(safeKey, total, changed) {
    let pullEl = document.getElementById(`route_pull_${safeKey}`); let buildEl = document.getElementById(`route_build_${safeKey}`);
    if(changed === 'pull') {
        let val = parseFloat(pullEl.value) || 0; if(val > total) { val = total; pullEl.value = val; }
        buildEl.value = (total - val).toFixed(2);
    } else {
        let val = parseFloat(buildEl.value) || 0; if(val > total) { val = total; buildEl.value = val; }
        pullEl.value = (total - val).toFixed(2);
    }
}

function getDirectMaterials(name, amount) {
    let res = {};
    (productsDB[name] || []).forEach(part => {
        let k = String(part.item_key || part.di_item_id || part.name); let q = (parseFloat(part.quantity || part.qty) || 1) * amount;
        if(!k.startsWith('RECIPE:::')) { res[k] = (res[k] || 0) + q; }
    });
    return res;
}

function calculateExactWODeductions(wo) {
    let raws = {}; let pulls = {};
    let topDirect = getDirectMaterials(wo.product_name, wo.qty);
    for(let k in topDirect) raws[k] = (raws[k] || 0) + topDirect[k];
    
    if(wo.routing) {
        for(let sub in wo.routing) {
            if(wo.routing[sub].pull > 0) pulls[`RECIPE:::${sub}`] = wo.routing[sub].pull;
            if(wo.routing[sub].build > 0) {
                let subDirect = getDirectMaterials(sub, wo.routing[sub].build);
                for(let k in subDirect) raws[k] = (raws[k] || 0) + subDirect[k];
            }
        }
    }
    return { raws, pulls };
}

function find3DPrintedComponents(rootProduct, rootQty, routingMap) {
    let prints = {};
    const recipe = productsDB[rootProduct] || [];
    recipe.forEach(part => {
        let k = String(part.item_key || part.di_item_id || part.name);
        let q = (parseFloat(part.quantity || part.qty) || 1) * rootQty;
        if (k.startsWith('RECIPE:::')) {
            let subName = k.replace('RECIPE:::', '');
            // Check if this sub-assembly itself is a 3D print
            if (productsDB[subName] && productsDB[subName].is_3d_print) {
                let buildQty = q;
                if (routingMap && routingMap[subName]) buildQty = routingMap[subName].build || 0;
                if (buildQty > 0) prints[subName] = (prints[subName] || 0) + buildQty;
            } else {
                // Not a 3D print, but check its children if we are building it
                let buildQty = q;
                if (routingMap && routingMap[subName]) buildQty = routingMap[subName].build || 0;
                if (buildQty > 0) {
                    let subPrints = find3DPrintedComponents(subName, buildQty, null);
                    for (let s in subPrints) prints[s] = (prints[s] || 0) + subPrints[s];
                }
            }
        }
    });
    return prints;
}

async function validateAndCreateWO() {
    try {
        const p = document.getElementById('newWOProduct').value; const q = parseFloat(document.getElementById('newWOQty').value); if(!p || isNaN(q) || q <= 0) return alert("Select product and quantity.");
        
        let routingMap = {};
        document.querySelectorAll('.route-row').forEach(row => {
            let subName = row.getAttribute('data-subname');
            let pull = parseFloat(row.querySelector('.route-pull-input').value) || 0;
            let build = parseFloat(row.querySelector('.route-build-input').value) || 0;
            routingMap[subName] = { pull: pull, build: build };
        });

        let tempWO = { product_name: p, qty: q, routing: routingMap };
        let exactDeductions = calculateExactWODeductions(tempWO);
        let shortfalls = [];

        Object.keys(exactDeductions.raws).forEach(k => {
            let req = exactDeductions.raws[k]; let c = catalogCache[k] || {totalQty: 0}; let i = inventoryDB[k] || {consumed_qty: 0, manual_adjustment: 0, scrap_qty: 0}; 
            let onHand = c.totalQty - i.consumed_qty - i.scrap_qty + i.manual_adjustment; 
            if(req > onHand) { let f = fmtKey(k); let name = f.nn ? f.nn : f.in; shortfalls.push(`<li><strong>${name}</strong>: Need ${req.toFixed(2)}, Have ${onHand.toFixed(2)}</li>`); }
        });

        Object.keys(exactDeductions.pulls).forEach(k => {
            let req = exactDeductions.pulls[k]; let i = inventoryDB[k] || {produced_qty: 0, sold_qty: 0}; 
            let onHand = i.produced_qty - i.sold_qty;
            if(req > onHand) { let name = k.replace('RECIPE:::', ''); shortfalls.push(`<li><strong>⚙️ ${name}</strong>: Need to pull ${req.toFixed(2)}, Shelf has ${onHand.toFixed(2)}</li>`); }
        });

        if(shortfalls.length > 0) { document.getElementById('woShortfallList').innerHTML = shortfalls.join(''); document.getElementById('woErrorBox').style.display = 'block'; return; }
        
        let woId = "WO-" + Date.now().toString().slice(-6); 
        let wo = { wo_id: woId, product_name: p, qty: q, status: 'Queued', wip_state: {}, routing: routingMap }; 
        sysLog(`Creating Work Order ${woId}`); setMasterStatus("Creating WO...", "mod-working");
        
        const {error} = await supabaseClient.from('work_orders').insert({
            wo_id: wo.wo_id, product_name: wo.product_name, qty: wo.qty, status: wo.status, 
            wip_state: JSON.stringify(wo.wip_state), routing: JSON.stringify(wo.routing)
        }); 
        if(error) throw new Error(error.message); 

        // 🖨️ AUTO-SPAWN 3D PRINT JOBS
        const printsToSpawn = find3DPrintedComponents(p, q, routingMap);
        const printPromises = Object.keys(printsToSpawn).map(part => {
            if (typeof addPrintJob === 'function') return addPrintJob(part, printsToSpawn[part], woId);
        });
        if (printPromises.length > 0) {
            sysLog(`Spawning ${printPromises.length} 3D print jobs for ${woId}...`);
            await Promise.all(printPromises);
        }
        
        workOrdersDB.unshift(wo); document.getElementById('newWOModal').style.display = 'none'; setMasterStatus("Created!", "mod-success"); setTimeout(()=>setMasterStatus("Ready.", "status-idle"), 2000); currentWO = wo; renderWOList(); saveWOOrderPrefs();
    } catch(e) { sysLog(e.message, true); setMasterStatus("Error", "mod-error"); }
}

function moveWOUp(id, e) { e.stopPropagation(); let idx = workOrdersDB.findIndex(w => w.wo_id === id); if (idx > 0) { let temp = workOrdersDB[idx]; workOrdersDB[idx] = workOrdersDB[idx - 1]; workOrdersDB[idx - 1] = temp; saveWOOrderPrefs(); renderWOList(); } }
function moveWODown(id, e) { e.stopPropagation(); let idx = workOrdersDB.findIndex(w => w.wo_id === id); if (idx < workOrdersDB.length - 1) { let temp = workOrdersDB[idx]; workOrdersDB[idx] = workOrdersDB[idx + 1]; workOrdersDB[idx + 1] = temp; saveWOOrderPrefs(); renderWOList(); } }

function renderWOList() {
    try {
        const ui = document.getElementById('woListUI'); ui.innerHTML = "";
        if(workOrdersDB.length === 0) { ui.innerHTML = "<li style='cursor:default; background:transparent; border:none;'>No active Work Orders.</li>"; document.getElementById('woMainArea').style.display = 'none'; return; }
        workOrdersDB.forEach(wo => { 
            if(typeof wo.wip_state === 'string') wo.wip_state = JSON.parse(wo.wip_state || '{}');
            if(typeof wo.routing === 'string') wo.routing = JSON.parse(wo.routing || '{}');
            let sel = (currentWO && currentWO.wo_id === wo.wo_id) ? 'selected' : ''; let dot = wo.status === 'Queued' ? '🟡' : (wo.status === 'Completed' ? '🟢' : (wo.status === 'Picking' ? '🔵' : '🟠')); 
            ui.innerHTML += `<li class="${sel}" onclick="selectWO('${wo.wo_id}')" style="display:flex; justify-content:space-between; align-items:center;"><div style="display:flex; align-items:center; gap:8px;"><div style="display:flex; flex-direction:column; gap:2px;"><button class="icon-btn" style="width:16px!important; height:16px; font-size:8px; border:none; background:transparent; color:inherit;" onclick="moveWOUp('${wo.wo_id}', event)">▲</button><button class="icon-btn" style="width:16px!important; height:16px; font-size:8px; border:none; background:transparent; color:inherit;" onclick="moveWODown('${wo.wo_id}', event)">▼</button></div><span>${dot} <strong>${wo.wo_id}</strong>: ${wo.product_name}</span></div><span style="font-weight:bold;">x${wo.qty}</span></li>`; 
        });
        if(!currentWO && workOrdersDB.length > 0) currentWO = workOrdersDB[0]; if(currentWO) { isSOPLocked = true; renderActiveWO(currentWO.wo_id); }
    } catch(e) { sysLog(e.message, true); }
}
function selectWO(id) { try { currentWO = workOrdersDB.find(w => w.wo_id === id); isSOPLocked = true; renderWOList(); } catch(e) { sysLog(e.message, true); } }

async function toggleWIPCheckbox(chk, key) { try { if(!currentWO) return; let isChecked = chk.checked; if(isChecked) chk.parentElement.classList.add('done'); else chk.parentElement.classList.remove('done'); if(!currentWO.wip_state) currentWO.wip_state = {}; currentWO.wip_state[key] = isChecked; await supabaseClient.from('work_orders').update({ wip_state: JSON.stringify(currentWO.wip_state) }).eq('wo_id', currentWO.wo_id); } catch(e) { sysLog("Failed to save checkbox state.", true); } }
async function checkAllInGroup(grpId) { try { if(!currentWO) return; let chks = document.querySelectorAll(`.${grpId}-chk`); let changed = false; if(!currentWO.wip_state) currentWO.wip_state = {}; chks.forEach(chk => { if(!chk.checked) { chk.checked = true; chk.parentElement.classList.add('done'); let k = chk.getAttribute('data-key'); currentWO.wip_state[k] = true; changed = true; } }); if(changed) { sysLog(`Checked group in WO ${currentWO.wo_id}`); await supabaseClient.from('work_orders').update({ wip_state: JSON.stringify(currentWO.wip_state) }).eq('wo_id', currentWO.wo_id); } } catch(e) { sysLog("Failed to save group check.", true); } }
function toggleSOPLock() { isSOPLocked = !isSOPLocked; const btn = document.getElementById('sopLockBtn'); if(btn) btn.innerText = isSOPLocked ? '🔒' : '🔓'; if(currentWO) renderActiveWO(currentWO.wo_id); }

function renderActiveWO(id) {
    try {
        let wo = workOrdersDB.find(w => w.wo_id === id); if(!wo) return;
        document.getElementById('woMainArea').style.display = 'flex'; document.getElementById('woTitle').innerText = `${wo.wo_id}: ${wo.product_name}`; document.getElementById('woQtyTarget').innerText = wo.qty;
        let b = document.getElementById('woBadge'); b.innerText = wo.status; b.className = "status-badge";
        if(wo.status === 'Queued') b.classList.add('st-queued'); else if(wo.status === 'Picking') b.classList.add('st-picking'); else if(wo.status === 'Completed') b.classList.add('st-completed'); else b.classList.add('st-production');
        ['Queued', 'Picking', 'Production', 'Completed'].forEach(s => { document.getElementById('pipe-'+s).classList.remove('active'); document.getElementById('sect-'+s).classList.remove('active'); });
        let wip = wo.wip_state || {};
        const lockBtn = document.getElementById('sopLockBtn'); if(lockBtn) lockBtn.innerText = isSOPLocked ? '🔒' : '🔓';
        
        if(wo.status === 'Queued') { document.getElementById('pipe-Queued').classList.add('active'); document.getElementById('sect-Queued').classList.add('active'); }
        else if(wo.status === 'Picking') { 
            document.getElementById('pipe-Picking').classList.add('active'); document.getElementById('sect-Picking').classList.add('active'); 
            let pList = document.getElementById('woPickList'); let html = `<div class="kitting-board">`; let chkIdx = 0; let grpCounter = 0;
            let directRaws = getDirectMaterials(wo.product_name, wo.qty);
            if(Object.keys(directRaws).length > 0) {
                let currentGrpId = `pickgrp_${grpCounter++}`;
                html += `<div class="kitting-card"><h4>📦 Direct Raw Materials <button class="btn-blue" style="float:right; width:auto; padding:2px 8px; font-size:10px;" onclick="checkAllInGroup('${currentGrpId}')">✓ All</button></h4>`;
                Object.keys(directRaws).forEach(k => {
                    let req = directRaws[k]; let f = fmtKey(k); let c = catalogCache[k] || {}; let name = f.nn ? f.nn : (c.itemName || f.in); let displaySpec = c.spec === "(Mixed Specs)" ? "⚙️ (Mixed Specs)" : (c.spec ? `⚙️ ${c.spec}` : "");
                    let chkKey = `pick_${chkIdx++}`; let isDone = wip[chkKey] ? 'checked' : ''; let doneCls = wip[chkKey] ? 'done' : '';
                    html += `<div class="checklist-item ${doneCls}" style="padding: 8px 10px;"><input type="checkbox" class="${currentGrpId}-chk" data-key="${chkKey}" ${isDone} onchange="toggleWIPCheckbox(this, '${chkKey}')"> <div class="chk-text" style="font-size:13px;"><strong>${req.toFixed(2)}x</strong> ${name} <div style="color:var(--text-muted); font-size:10px;">${displaySpec}</div></div></div>`;
                });
                html += `</div>`;
            }
            let shelfPulls = [];
            if(wo.routing) { Object.keys(wo.routing).forEach(sub => { if(wo.routing[sub].pull > 0) shelfPulls.push({name: sub, q: wo.routing[sub].pull}); }); }
            if(shelfPulls.length > 0) {
                let currentGrpId = `pickgrp_${grpCounter++}`;
                html += `<div class="kitting-card route-card-pull"><h4>🟢 Pull Pre-Built from Shelf <button class="btn-blue" style="float:right; width:auto; padding:2px 8px; font-size:10px;" onclick="checkAllInGroup('${currentGrpId}')">✓ All</button></h4>`;
                shelfPulls.forEach(sub => {
                    let chkKey = `pick_${chkIdx++}`; let isDone = wip[chkKey] ? 'checked' : ''; let doneCls = wip[chkKey] ? 'done' : '';
                    html += `<div class="checklist-item ${doneCls}" style="padding: 8px 10px;"><input type="checkbox" class="${currentGrpId}-chk" data-key="${chkKey}" ${isDone} onchange="toggleWIPCheckbox(this, '${chkKey}')"> <div class="chk-text" style="font-size:13px; color:#15803d;"><strong>${sub.q.toFixed(2)}x</strong> ⚙️ ${sub.name}</div></div>`;
                });
                html += `</div>`;
            }
            if(wo.routing) {
                Object.keys(wo.routing).forEach(sub => {
                    if(wo.routing[sub].build > 0) {
                        let subDirect = getDirectMaterials(sub, wo.routing[sub].build);
                        if(Object.keys(subDirect).length > 0) {
                            let currentGrpId = `pickgrp_${grpCounter++}`;
                            html += `<div class="kitting-card route-card-build"><h4>🟠 Build: ⚙️ ${sub} (x${wo.routing[sub].build}) <button class="btn-blue" style="float:right; width:auto; padding:2px 8px; font-size:10px;" onclick="checkAllInGroup('${currentGrpId}')">✓ All</button></h4>`;
                            Object.keys(subDirect).forEach(k => {
                                let req = subDirect[k]; let f = fmtKey(k); let c = catalogCache[k] || {}; let name = f.nn ? f.nn : (c.itemName || f.in); let displaySpec = c.spec === "(Mixed Specs)" ? "⚙️ (Mixed Specs)" : (c.spec ? `⚙️ ${c.spec}` : "");
                                let chkKey = `pick_${chkIdx++}`; let isDone = wip[chkKey] ? 'checked' : ''; let doneCls = wip[chkKey] ? 'done' : '';
                                html += `<div class="checklist-item ${doneCls}" style="padding: 8px 10px;"><input type="checkbox" class="${currentGrpId}-chk" data-key="${chkKey}" ${isDone} onchange="toggleWIPCheckbox(this, '${chkKey}')"> <div class="chk-text" style="font-size:13px;"><strong>${req.toFixed(2)}x</strong> ${name} <div style="color:var(--text-muted); font-size:10px;">${displaySpec}</div></div></div>`;
                            });
                            html += `</div>`;
                        }
                    }
                });
            }
            pList.innerHTML = html + `</div>`;
        }
        else if(wo.status === 'In Production') { 
            document.getElementById('pipe-Production').classList.add('active'); document.getElementById('sect-Production').classList.add('active'); 
            let stepsToRender = [];
            if(wo.routing) {
                Object.keys(wo.routing).forEach(sub => {
                    if(wo.routing[sub].build > 0) {
                        let subSteps = sopsDB[sub] || [];
                        if(subSteps.length > 0) {
                            stepsToRender.push({ isHeader: true, text: `⚙️ Build Sub-Assembly: ${sub} (Quantity: ${wo.routing[sub].build})` });
                            stepsToRender = stepsToRender.concat(subSteps);
                        }
                    }
                });
            }
            let mainSteps = sopsDB[wo.product_name] || [];
            if(mainSteps.length > 0 || stepsToRender.length > 0) {
                if(mainSteps.length > 0) {
                    stepsToRender.push({ isHeader: true, text: `📦 Final Assembly: ${wo.product_name}` });
                    stepsToRender = stepsToRender.concat(mainSteps);
                }
            }
            let sList = document.getElementById('woSOPList'); sList.innerHTML = ""; let saveContainer = document.getElementById('inlineSaveContainer');
            if(!isSOPLocked) {
                let mappedSteps = mainSteps.map(s => typeof s === 'string' ? {text: s, m1: {url:"", type:"img"}, m2: {url:"", type:"img"}, m3: {url:"", type:"img"}} : s);
                if(mappedSteps.length === 0) mappedSteps = [{}]; let editHtml = `<div style="background:var(--bg-container); padding:15px; border-radius:8px; border:2px solid #0ea5e9;">`;
                mappedSteps.forEach((s, idx) => { editHtml += generateEditableSOPRow(s, idx); }); editHtml += `<button class="btn-blue" style="width:auto; padding:8px 15px; font-size:13px;" onclick="addSOPRow('woSOPList')">+ Add New Step</button></div>`;
                sList.innerHTML = editHtml; saveContainer.style.display = 'block';
            } else {
                saveContainer.style.display = 'none'; 
                let mappedSteps = stepsToRender.map(s => (s.isHeader || typeof s !== 'string') ? s : {text: s, m1: {url: "", type: "img"}, m2: {url: "", type: "img"}, m3: {url: "", type: "img"}});
                if(mappedSteps.length === 0) sList.innerHTML = `<div style="padding:15px; color:var(--text-muted);">No SOPs written for this product or its sub-assemblies yet.</div>`;
                else {
                    let stepCounter = 1;
                    mappedSteps.forEach((s, idx) => {
                        if(s.isHeader) {
                            sList.innerHTML += `<div style="background:var(--bg-bar); padding:10px 15px; margin:20px 0 10px 0; border-radius:6px; border-left:4px solid #0ea5e9; font-weight:bold; font-size:16px; color:var(--text-heading);">${s.text}</div>`;
                        } else {
                            let chkKey = `sop_${idx}`; let isDone = wip[chkKey] ? 'checked' : ''; let doneCls = wip[chkKey] ? 'done' : ''; let attachmentHtml = `<div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:10px;">`;
                            [s.m1, s.m2, s.m3].forEach(m => {
                                if(m && m.url) {
                                    let dId = parseMediaUrl(m.url); let safeUrl = m.url.replace(/'/g, "\\'").replace(/"/g, '"');
                                    if (m.type === 'img') { let imgThumbUrl = dId ? `https://googleusercontent.com/profile/picture/0` : safeUrl; attachmentHtml += `<img src="${imgThumbUrl}" style="max-width:300px; max-height:200px; border-radius:6px; border:1px solid var(--border-color); cursor:zoom-in;" onclick="openMediaModal('${imgThumbUrl}', 'img')">`; } 
                                    else { let mediaUrl = dId ? `https://drive.google.com/file/d/${dId}/preview` : safeUrl; let icon = m.type === 'vid' ? '🎬' : '📄'; attachmentHtml += `<div style="position:relative; width: 300px; height: 200px; border-radius: 6px; overflow: hidden; border: 1px solid var(--border-color); cursor: zoom-in;" onclick="openMediaModal('${mediaUrl}', 'iframe')"><iframe src="${mediaUrl}" style="width: 100%; height: 100%; border: none; pointer-events: none;"></iframe></div>`; }
                                }
                            });
                            attachmentHtml += `</div>`;
                            sList.innerHTML += `<div class="checklist-item ${doneCls}"><input type="checkbox" ${isDone} onchange="toggleWIPCheckbox(this, '${chkKey}')"> <div class="chk-text" style="width:100%;"><strong style="color:#0ea5e9; font-size:16px;">Step ${stepCounter++}:</strong><br> ${s.text} ${attachmentHtml}</div></div>`;
                        }
                    });
                }
            }
        }
        else if(wo.status === 'Completed') { document.getElementById('pipe-Completed').classList.add('active'); document.getElementById('sect-Completed').classList.add('active'); }
    } catch(e) { sysLog(e.message, true); }
}

async function advanceWO(newStatus) {
    try {
        if(!currentWO) return; if(currentWO.status === 'Completed') return alert("WO archived.");
        sysLog(`WO ${currentWO.wo_id} -> ${newStatus}`); setMasterStatus("Updating...", "mod-working");
        if(newStatus === 'Completed') {
            if(!confirm("Deduct raw materials and add finished goods?")) { setMasterStatus("Ready.", "status-idle"); return; }
            let exactDeductions = calculateExactWODeductions(currentWO);
            let ups = [];
            Object.keys(exactDeductions.raws).forEach(k => {
                let req = exactDeductions.raws[k];
                if(!inventoryDB[k]) inventoryDB[k]={consumed_qty:0, manual_adjustment:0, produced_qty:0, sold_qty:0, min_stock:0, scrap_qty:0}; 
                inventoryDB[k].consumed_qty += req; 
                ups.push({item_key:k, ...inventoryDB[k]});
            });
            Object.keys(exactDeductions.pulls).forEach(k => {
                let req = exactDeductions.pulls[k];
                if(!inventoryDB[k]) inventoryDB[k]={consumed_qty:0, manual_adjustment:0, produced_qty:0, sold_qty:0, min_stock:0, scrap_qty:0}; 
                inventoryDB[k].sold_qty += req; 
                ups.push({item_key:k, ...inventoryDB[k]});
            });
            let fgiKey = `RECIPE:::${currentWO.product_name}`;
            if(!inventoryDB[fgiKey]) inventoryDB[fgiKey]={consumed_qty:0, manual_adjustment:0, produced_qty:0, sold_qty:0, min_stock:0, scrap_qty:0};
            inventoryDB[fgiKey].produced_qty += currentWO.qty;
            ups.push({item_key:fgiKey, ...inventoryDB[fgiKey]});
            await supabaseClient.from('inventory_consumption').upsert(ups, {onConflict:'item_key'}); 
        }
        const {error} = await supabaseClient.from('work_orders').update({status: newStatus}).eq('wo_id', currentWO.wo_id); if(error) throw new Error(error.message); currentWO.status = newStatus; setMasterStatus("Updated!", "mod-success"); setTimeout(()=>setMasterStatus("Ready.", "status-idle"), 2000); renderWOList(); 
    } catch(e) { sysLog(e.message, true); setMasterStatus("Error", "mod-error"); }
}

async function deleteCurrentWO() { try { if(!currentWO) return; if(confirm(`Delete ${currentWO.wo_id}?`)) { await supabaseClient.from('work_orders').delete().eq('wo_id', currentWO.wo_id); workOrdersDB = workOrdersDB.filter(w => w.wo_id !== currentWO.wo_id); currentWO = workOrdersDB[0] || null; renderWOList(); } } catch(e) { sysLog(e.message, true); } }

function printPickList() {
    try {
        if(!currentWO) return;
        let html = `<html><head><title>Pick List - ${currentWO.wo_id}</title><style>body{font-family:sans-serif; padding:10px; font-size:11px;} table{width:100%; border-collapse:collapse; margin-top:10px; font-size:11px;} th,td{border:1px solid #ccc; padding:4px; text-align:left;} th{background:#f1f5f9;} .group-header{background:#e0f2fe; font-weight:bold; font-size:12px;} h2{margin:0 0 5px 0; font-size:16px;} h3{margin:0 0 10px 0; font-size:14px;}</style></head><body>`; 
        html += `<h2>Pick List: ${currentWO.wo_id}</h2><h3>Product: ${currentWO.product_name} (Qty: ${currentWO.qty})</h3>`; 
        html += `<table><thead><tr><th style="width:40px;">Pick</th><th>Item Name</th><th>Spec</th><th style="width:80px;">Qty Needed</th></tr></thead><tbody>`;
        let directRaws = getDirectMaterials(currentWO.product_name, currentWO.qty);
        if(Object.keys(directRaws).length > 0) {
            html += `<tr><td colspan="4" class="group-header">📦 Direct Raw Materials</td></tr>`;
            Object.keys(directRaws).forEach(k => { let req = directRaws[k]; let f = fmtKey(k); let c = catalogCache[k] || {}; let name = f.nn ? f.nn : (c.itemName || f.in); let sp = c.spec === "(Mixed Specs)" ? "⚙️ (Mixed Specs)" : (c.spec || ""); html += `<tr><td>[   ]</td><td>${name}</td><td>${sp}</td><td><strong>${req.toFixed(2)}</strong></td></tr>`; });
        }
        if(currentWO.routing) {
            let pulls = []; Object.keys(currentWO.routing).forEach(sub => { if(currentWO.routing[sub].pull > 0) pulls.push({name: sub, q: currentWO.routing[sub].pull}); });
            if(pulls.length > 0) {
                html += `<tr><td colspan="4" class="group-header" style="background:#d1fae5; color:#15803d;">🟢 Pull Pre-Built from Shelf</td></tr>`;
                pulls.forEach(sub => { html += `<tr><td>[   ]</td><td colspan="2">⚙️ ${sub.name}</td><td><strong>${sub.q.toFixed(2)}</strong></td></tr>`; });
            }
            Object.keys(currentWO.routing).forEach(sub => {
                if(currentWO.routing[sub].build > 0) {
                    let subDirect = getDirectMaterials(sub, currentWO.routing[sub].build);
                    if(Object.keys(subDirect).length > 0) {
                        html += `<tr><td colspan="4" class="group-header" style="background:#fef3c7; color:#b45309;">🟠 Build: ⚙️ ${sub} (x${currentWO.routing[sub].build})</td></tr>`;
                        Object.keys(subDirect).forEach(k => { let req = subDirect[k]; let f = fmtKey(k); let c = catalogCache[k] || {}; let name = f.nn ? f.nn : (c.itemName || f.in); let sp = c.spec === "(Mixed Specs)" ? "⚙️ (Mixed Specs)" : (c.spec || ""); html += `<tr><td>[   ]</td><td>${name}</td><td>${sp}</td><td><strong>${req.toFixed(2)}</strong></td></tr>`; });
                    }
                }
            });
        }
        html += `</tbody></table></body></html>`; let win = window.open('', '', 'width=800,height=600'); win.document.write(html); win.document.close(); setTimeout(() => win.print(), 250);
    } catch(e) { sysLog(e.message, true); }
}

function printSOP() {
    try {
        if(!currentWO) return; 
        let stepsToRender = [];
        if(currentWO.routing) {
            Object.keys(currentWO.routing).forEach(sub => {
                if(currentWO.routing[sub].build > 0) {
                    let subSteps = sopsDB[sub] || [];
                    if(subSteps.length > 0) { stepsToRender.push({ isHeader: true, text: `⚙️ Build Sub-Assembly: ${sub}` }); stepsToRender = stepsToRender.concat(subSteps); }
                }
            });
        }
        let mainSteps = sopsDB[currentWO.product_name] || [];
        if(mainSteps.length > 0 || stepsToRender.length > 0) {
            if(mainSteps.length > 0) { stepsToRender.push({ isHeader: true, text: `📦 Final Assembly: ${currentWO.product_name}` }); stepsToRender = stepsToRender.concat(mainSteps); }
        }
        let mappedSteps = stepsToRender.map(s => (s.isHeader || typeof s !== 'string') ? s : {text: s, m1:{url: "", type: "img"}, m2:{url: "", type: "img"}, m3:{url: "", type: "img"}}); 
        let html = `<html><head><title>SOP - ${currentWO.wo_id}</title><style>body{font-family:sans-serif; padding:10px; font-size:11px;} .step{margin-bottom:15px; border-bottom:1px solid #ccc; padding-bottom:10px; font-size:12px;} .header{background:#f1f5f9; padding:6px; font-weight:bold; font-size:14px; margin:15px 0 8px 0; border-left:4px solid #0ea5e9;} img{max-width:100%; max-height:250px; display:block; margin-top:8px;} a {color:#0ea5e9; font-weight:bold; margin-right:15px;} h2{margin:0 0 5px 0; font-size:16px;} h3{margin:0 0 10px 0; font-size:14px;}</style></head><body>`; 
        html += `<h2>Compiled SOP</h2><h3>Work Order: ${currentWO.wo_id}</h3><hr>`;
        if(mappedSteps.length === 0) html += `<p>No SOPs defined.</p>`;
        else { 
            let stepCounter = 1;
            mappedSteps.forEach((s) => { 
                if(s.isHeader) { html += `<div class="header">${s.text}</div>`; }
                else { html += `<div class="step"><strong style="color:#0ea5e9; font-size:14px;">Step ${stepCounter++}:</strong><br> ${s.text}</div>`; }
            }); 
        }
        html += `</body></html>`; let win = window.open('', '', 'width=800,height=600'); win.document.write(html); win.document.close(); setTimeout(() => win.print(), 500);
    } catch(e) { sysLog(e.message, true); }
}
