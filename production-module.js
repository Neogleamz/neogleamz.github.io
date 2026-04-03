// --- 11. PRODUCTION MANAGER, ROUTING ENGINE, MEDIA, EXPORTS ---
function parseMediaUrl(url) { if(!url) return null; let m = url.match(/\/(?:file\/d\/|uc\?id=|open\?id=)([a-zA-Z0-9_-]+)/); return m ? m[1] : null; }
function openMediaModal(url, renderType) { try { const container = document.getElementById('mediaContainer'); if(renderType === 'img') { container.style.background = 'transparent'; container.innerHTML = `<img src="${url}" style="max-width:100%; max-height:100%; object-fit:contain; cursor: zoom-out;" onclick="closeMediaModal()">`; } else if (renderType === 'vid') { container.style.background = '#000000'; container.innerHTML = `<video src="${url}" style="max-width:100%; max-height:100%; outline:none; box-shadow:0 0 40px rgba(0,0,0,0.5);" controls autoplay controlsList="nodownload"></video>`; } else { container.style.background = '#ffffff'; container.innerHTML = `<iframe src="${url}" style="width:100%; height:100%; border:none;" allowfullscreen allow="autoplay"></iframe>`; } document.getElementById('mediaModal').style.display = 'flex'; } catch(e) { sysLog(e.message, true); } }
function closeMediaModal() { try { document.getElementById('mediaModal').style.display = 'none'; document.getElementById('mediaContainer').innerHTML = ''; } catch(e) { sysLog(e.message, true); } }

function execRT(cmd, val=null) { document.execCommand(cmd, false, val); }
function getRTToolbar() { return `<div class="rt-toolbar"><button type="button" class="rt-btn" onmousedown="event.preventDefault(); execRT('bold')" title="Bold"><b>B</b></button><button type="button" class="rt-btn" onmousedown="event.preventDefault(); execRT('italic')" title="Italic"><i>I</i></button><button type="button" class="rt-btn" onmousedown="event.preventDefault(); execRT('underline')" title="Underline"><u>U</u></button><button type="button" class="rt-btn" onmousedown="event.preventDefault(); execRT('strikeThrough')" title="Strikethrough"><s>S</s></button><span style="color:var(--border-input); margin:0 4px;">|</span><button type="button" class="rt-btn" onmousedown="event.preventDefault(); execRT('justifyLeft')" title="Align Left">⬅</button><button type="button" class="rt-btn" onmousedown="event.preventDefault(); execRT('justifyCenter')" title="Align Center">⬌</button><button type="button" class="rt-btn" onmousedown="event.preventDefault(); execRT('justifyRight')" title="Align Right">➡</button><span style="color:var(--border-input); margin:0 4px;">|</span><button type="button" class="rt-btn" onmousedown="event.preventDefault(); execRT('insertUnorderedList')" title="Bullet List">●</button><button type="button" class="rt-btn" onmousedown="event.preventDefault(); execRT('insertOrderedList')" title="Number List">1.</button><span style="color:var(--border-input); margin:0 4px;">|</span><input type="color" onchange="execRT('foreColor', this.value)" title="Text Color" style="width:24px; height:24px; padding:0; border:none; cursor:pointer; background:transparent;"><select onchange="execRT('fontSize', this.value)" style="width:auto; padding:4px; font-size:12px; border:1px solid var(--border-input); border-radius:4px; background:var(--bg-input); color:var(--text-main);"><option value="3">Normal Font</option><option value="4">Large Font</option><option value="5">Huge Font</option></select></div>`; }

function generateEditableSOPRow(s, idx) {
    let safeText = s.text || ''; let m1 = s.m1 || {type: s.type || 'img', url: s.url || ''}; let m2 = s.m2 || {type: 'img', url: ''}; let m3 = s.m3 || {type: 'img', url: ''};
    let rowGen = (m, n) => { let u = (m.url||'').replace(/"/g,'"').replace(/'/g,"\\'"); return `<div class="media-row"><select class="m${n}-type" style="border:1px solid var(--border-input); background:var(--bg-input); color:var(--text-main);"><option value="img" ${m.type==='img'?'selected':''}>🖼️ Image</option><option value="doc" ${m.type==='doc'?'selected':''}>📄 Doc</option><option value="vid" ${m.type==='vid'?'selected':''}>🎬 Vid</option></select><input type="text" class="m${n}-url" value="${u}" placeholder="URL ${n}" style="border:1px solid var(--border-input); background:var(--bg-input); color:var(--text-main);"></div>`; };
    return `<div class="sop-step-row"><div class="sop-step-movers"><button class="icon-btn" style="width:28px!important; height:28px; font-size:14px; border:none; background:var(--bg-input);" onclick="moveSOPUp(this)">▲</button><button class="icon-btn" style="width:28px!important; height:28px; font-size:14px; border:none; background:var(--bg-input);" onclick="moveSOPDown(this)">▼</button><button class="icon-btn" style="width:28px!important; height:28px; font-size:16px; font-weight:900; border:none; background:#3b82f6; color:white; margin-top:auto;" onclick="addSOPRow(this)">+</button><button class="btn-red icon-btn" style="width:28px!important; height:28px; font-size:12px; margin-top:5px;" onclick="removeSOPRow(this)">X</button></div><div class="sop-text-container"><div class="sop-text-rich" contenteditable="true" placeholder="Type instructions here...">${safeText}</div></div><div class="sop-controls-container">${getRTToolbar()}<div style="font-size:11px; font-weight:bold; color:var(--text-muted); margin-top:4px;">ATTACHMENTS (Optional)</div>${rowGen(m1, 1)} ${rowGen(m2, 2)} ${rowGen(m3, 3)}</div></div>`;
}

let currentSopMode = 'production'; // 'production' or '3d'

function openSOPMasterModal(mode = 'production') { 
    currentSopMode = mode;
    document.getElementById('sopMasterTitle').innerText = (mode === '3d') ? '📝 3D Print SOP Editor' : '📝 Production SOP Editor';
    populateSOPDropdown();
    document.getElementById('sopMasterModal').style.display = 'flex'; 
    renderMasterSOP();
}

function populateSOPDropdown() {
    const sopSelect = document.getElementById('sopMasterProductSelect');
    if (!sopSelect) return;
    
    let options = '<option value="">-- Select Item to Edit SOP --</option>';
    if (currentSopMode === '3d') {
        // Show only 3D Printed Raw Goods (iterate catalogCache which now has flags)
        Object.keys(catalogCache).forEach(k => {
            let c = catalogCache[k];
            if (c && c.is_3d_print) {
                let name = c.neoName || c.itemName;
                let time = c.print_time_mins || 0;
                options += `<option value="${String(k).replace(/"/g, '&quot;')}">🖨️ ${name} (${time}m)</option>`;
            }
        });
    } else {
        // Show all Products (Retail and Sub-assemblies)
        Object.keys(productsDB).sort().forEach(p => {
            options += `<option value="${String(p).replace(/"/g, '&quot;')}">📝 ${p}</option>`;
        });
    }
    sopSelect.innerHTML = options;
}

function renderMasterSOP() { 
    try { 
        const p = document.getElementById('sopMasterProductSelect').value; 
        const area = document.getElementById('sopMasterEditorArea'); 
        if(!p) { 
            area.innerHTML = "<div style='color:var(--text-muted); text-align:center; padding:20px; font-size:18px;'>Select an item above to start writing instructions.</div>"; 
            return; 
        } 
        let steps = sopsDB[p] || []; 
        let mappedSteps = steps.map(s => typeof s === 'string' ? {text: s, m1: {url:"", type:"img"}, m2: {url:"", type:"img"}, m3: {url:"", type:"img"}} : s); 
        if(mappedSteps.length === 0) mappedSteps = [{}]; 
        let h = ""; 
        mappedSteps.forEach((s, idx) => { h += generateEditableSOPRow(s, idx); }); 
        area.innerHTML = h; 
    } catch(e) { sysLog(e.message, true); } 
}

function addSOPRow(btn) { try { let newRow = document.createElement('div'); newRow.innerHTML = generateEditableSOPRow({}, 999); let rowNode = newRow.firstChild; if(btn && btn.closest) { let currentRow = btn.closest('.sop-step-row'); currentRow.parentNode.insertBefore(rowNode, currentRow.nextSibling); } else { let area = document.getElementById('sopMasterEditorArea'); if(area) area.appendChild(rowNode); } } catch(e) {} }
function removeSOPRow(btn) { try { btn.closest('.sop-step-row').remove(); } catch(e) {} }
function moveSOPUp(btn) { try { let row = btn.closest('.sop-step-row'); if(row.previousElementSibling && row.previousElementSibling.classList.contains('sop-step-row')) { row.parentNode.insertBefore(row, row.previousElementSibling); } } catch(e) {} }
function moveSOPDown(btn) { try { let row = btn.closest('.sop-step-row'); if(row.nextElementSibling && row.nextElementSibling.classList.contains('sop-step-row')) { row.parentNode.insertBefore(row.nextElementSibling, row); } } catch(e) {} }

function extractSOPDataFromUI(containerId) {
    let steps = []; document.getElementById(containerId).querySelectorAll('.sop-step-row').forEach(row => { let t = row.querySelector('.sop-text-rich'); let m1t = row.querySelector('.m1-type').value; let m1u = row.querySelector('.m1-url').value; let m2t = row.querySelector('.m2-type').value; let m2u = row.querySelector('.m2-url').value; let m3t = row.querySelector('.m3-type').value; let m3u = row.querySelector('.m3-url').value; if(t && t.innerHTML.trim()) { steps.push({ text: t.innerHTML.trim(), m1: {type: m1t, url: m1u}, m2: {type: m2t, url: m2u}, m3: {type: m3t, url: m3u} }); } }); return steps;
}

async function saveMasterSOP() { try { const p = document.getElementById('sopMasterProductSelect').value; if(!p) return; let steps = extractSOPDataFromUI('sopMasterEditorArea'); sopsDB[p] = steps; sysLog(`Saving Master SOP for ${p}`); setMasterStatus("Saving...", "mod-working"); const {error} = await supabaseClient.from('production_sops').upsert({product_name: p, steps: steps}, {onConflict: 'product_name'}); if(error) throw new Error(error.message); setMasterStatus("Saved!", "mod-success"); setTimeout(()=>setMasterStatus("Ready.", "status-idle"), 2000); document.getElementById('sopMasterModal').style.display = 'none'; if(currentWO && currentWO.product_name === p) renderActiveWO(currentWO.wo_id); } catch(e) { sysLog(e.message, true); setMasterStatus("Error", "mod-error"); } }
async function saveInlineSOP() { try { if(!currentWO) return; const p = currentWO.product_name; let steps = extractSOPDataFromUI('inlineSOPContainer'); sopsDB[p] = steps; sysLog(`Saving Inline SOP for ${p}`); setMasterStatus("Saving...", "mod-working"); const {error} = await supabaseClient.from('production_sops').upsert({product_name: p, steps: steps}, {onConflict: 'product_name'}); if(error) throw new Error(error.message); setMasterStatus("Saved!", "mod-success"); setTimeout(()=>setMasterStatus("Ready.", "status-idle"), 2000); toggleSOPLock(); } catch(e) { sysLog(e.message, true); setMasterStatus("Error", "mod-error"); } }

window.isBatchOrderMode = false;
function openNewWOModal(mode = 'create') { 
    window.isBatchOrderMode = (mode === 'order');
    document.getElementById('woErrorBox').style.display = 'none'; 
    document.getElementById('woRoutingArea').style.display = 'none'; 
    document.getElementById('newWOQty').value = 1; 
    
    const modalTitle = document.querySelector('#newWOModal h2');
    const submitBtn = document.querySelector('#newWOModal .btn-green');
    
    if (window.isBatchOrderMode) {
        modalTitle.innerText = "📦 Batch Order Estimator";
        submitBtn.innerText = "Calculate Raw Demands";
        submitBtn.onclick = function() { generateBatchOrderReport(); };
    } else {
        modalTitle.innerText = "🏭 Start Production Batch";
        submitBtn.innerText = "Verify Inventory & Create";
        submitBtn.onclick = function() { validateAndCreateWO(); };
    }
    
    document.getElementById('newWOModal').style.display = 'flex'; 
    checkWORouting(); 
}

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
        let req = subsNeeded[k]; let invKey = `RECIPE:::${k}`; let i = inventoryDB[invKey] || {produced_qty:0, sold_qty:0, consumed_qty:0, scrap_qty:0, manual_adjustment:0};
        let c_prod = parseFloat(i.production_consumed_qty)||0; let c_proto = parseFloat(i.prototype_consumed_qty)||0; let pb = parseFloat(i.prototype_produced_qty)||0;
        let onHand = (i.produced_qty||0) - (i.sold_qty||0) - c_prod - (i.scrap_qty||0) + (i.manual_adjustment||0) - Math.max(0, c_proto - pb);
        let autoPull = Math.min(req, Math.max(0, onHand)); let autoBuild = req - autoPull;
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
        
        if(!k.startsWith('RECIPE:::')) { 
            res[k] = (res[k] || 0) + q; 
        }
    });
    return res;
}

function calculateExactWODeductions(wo) {
    let raws_production = {}; let raws_assembly = {}; let pulls = {}; let raws_total = {};
    let built_subs = {};
    
    function traverseBOM(recipeName, qty, isTopLevel) {
        (productsDB[recipeName] || []).forEach(part => {
            let k = String(part.item_key || part.di_item_id || part.name); 
            let q = (parseFloat(part.quantity || part.qty) || 1) * qty;
            
            if(!k.startsWith('RECIPE:::')) { 
                if (isTopLevel) {
                    raws_production[k] = (raws_production[k] || 0) + q;
                } else {
                    raws_assembly[k] = (raws_assembly[k] || 0) + q;
                }
                raws_total[k] = (raws_total[k] || 0) + q; 
            } else {
                let subName = k.replace('RECIPE:::', '');
                let pullQty = 0;
                let buildQty = q;
                
                // Allow dynamic override from the first-level map for manually stated shelf pulls
                if (isTopLevel && wo.routing && wo.routing[subName]) {
                    pullQty = parseFloat(wo.routing[subName].pull || 0);
                    buildQty = parseFloat(wo.routing[subName].build || 0);
                } 
                
                if (pullQty > 0) {
                    pulls[k] = (pulls[k] || 0) + pullQty;
                }
                
                if (buildQty > 0) {
                    built_subs[k] = (built_subs[k] || 0) + buildQty;
                    // Recurse heavily into the defined dependencies to guarantee deep material alignment
                    traverseBOM(subName, buildQty, false);
                }
            }
        });
    }

    traverseBOM(wo.product_name, wo.qty, true);
    
    return { raws: raws_total, raws_production, raws_assembly, pulls, built_subs };
}

function find3DPrintedComponents(rootProduct, rootQty, routingMap) {
    let prints = {};
    const recipe = productsDB[rootProduct] || [];
    
    recipe.forEach(part => {
        let k = String(part.item_key || part.di_item_id || part.name || "");
        let q = (parseFloat(part.quantity || part.qty) || 1) * rootQty;
        const cleanK = k.replace('RECIPE:::', '');
        // 3D PRINTED SUB-ASSEMBLY (RECIPE)
        if (k.startsWith('RECIPE:::')) {
            const subName = cleanK;
            
            // Check if we are building or pulling this sub-assembly
            let buildQty = q;
            if (routingMap && routingMap[subName]) {
                // IMPORTANT: routingMap[subName] is an object {pull, build}
                buildQty = parseFloat(routingMap[subName].build || 0);
            }

            if (buildQty > 0) {
                // If the sub-assembly itself is marked as 3D print, add it
                if (productsDB[subName] && productsDB[subName].is_3d_print) {
                    prints[subName] = (prints[subName] || 0) + buildQty;
                } else {
                    // Otherwise, recurse to find its 3D printed components
                    const subPrints = find3DPrintedComponents(subName, buildQty, null);
                    for (let s in subPrints) {
                        prints[s] = (prints[s] || 0) + (parseFloat(subPrints[s]) || 0);
                    }
                }
            }
        } else {
            // LEGACY 3D PRINTED RAW MATERIAL (STOCKPILEZ ITEM)
            if (typeof catalogCache !== 'undefined' && catalogCache[k] && catalogCache[k].is_3d_print) {
                prints[k] = (prints[k] || 0) + q;
            }
        }
    });
    return prints;
}

function generateBatchOrderReport() {
    const p = document.getElementById('newWOProduct').value; 
    const q = parseFloat(document.getElementById('newWOQty').value); 
    if(!p || isNaN(q) || q <= 0) return alert("Select product and quantity.");
    
    let routingMap = {};
    document.querySelectorAll('.route-row').forEach(row => {
        let subName = row.getAttribute('data-subname');
        let pull = parseFloat(row.querySelector('.route-pull-input').value) || 0;
        let build = parseFloat(row.querySelector('.route-build-input').value) || 0;
        routingMap[subName] = { pull: pull, build: build };
    });

    let tempWO = { product_name: p, qty: q, routing: routingMap };
    let exactDeductions = calculateExactWODeductions(tempWO);

    // Build the report HTML inside batchOrderReportContent
    let h = `
        <h3 style="color:var(--primary-color); border-bottom:1px solid var(--border-color); padding-bottom:10px; margin-top:0;">Raw Materials Demand</h3>
        <table style="width:100%; border-collapse:collapse; margin-bottom:20px; font-size:14px;">
            <thead>
                <tr style="border-bottom:2px solid var(--border-color); text-align:left;">
                    <th style="padding:8px;">Material</th>
                    <th style="padding:8px; text-align:right;">Required</th>
                    <th style="padding:8px; text-align:right;">In Stock</th>
                    <th style="padding:8px; text-align:right;">Balance</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    let hasRaws = false;
    Object.keys(exactDeductions.raws).forEach(k => {
        hasRaws = true;
        let req = exactDeductions.raws[k]; 
        let c = catalogCache[k] || {totalQty: 0, is_3d_print: false}; 
        let i = inventoryDB[k] || {consumed_qty: 0, manual_adjustment: 0, scrap_qty: 0}; 
        let onHand = c.totalQty - i.consumed_qty - i.scrap_qty + i.manual_adjustment; 
        let diff = onHand - req;
        
        let f = fmtKey(k); 
        let name = f.nn ? f.nn : f.in; 
        
        let diffColor = diff < 0 ? '#ef4444' : '#10b981';
        let stockColor = onHand <= 0 ? '#ef4444' : 'var(--text-main)';
        
        h += `<tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
            <td style="padding:8px; font-weight:bold; color:var(--text-heading);">${name}</td>
            <td style="padding:8px; text-align:right; color:#f59e0b; font-weight:bold;">${req.toFixed(2)}</td>
            <td style="padding:8px; text-align:right; color:${stockColor};">${onHand.toFixed(2)}</td>
            <td style="padding:8px; text-align:right; font-weight:bold; color:${diffColor};">${diff > 0 ? '+'+diff.toFixed(2) : diff.toFixed(2)}</td>
        </tr>`;
    });
    
    if(!hasRaws) h += `<tr><td colspan="4" style="text-align:center; padding:10px; color:var(--text-muted);">No raw materials required.</td></tr>`;
    h += `</tbody></table>`;

    h += `
        <h3 style="color:var(--primary-color); border-bottom:1px solid var(--border-color); padding-bottom:10px;">Sub-Assemblies To Pull</h3>
        <table style="width:100%; border-collapse:collapse; margin-bottom:20px; font-size:14px;">
            <thead>
                <tr style="border-bottom:2px solid var(--border-color); text-align:left;">
                    <th style="padding:8px;">Sub-Assembly</th>
                    <th style="padding:8px; text-align:right;">Pull Qty</th>
                    <th style="padding:8px; text-align:right;">In Stock</th>
                    <th style="padding:8px; text-align:right;">Balance</th>
                </tr>
            </thead>
            <tbody>
    `;

    let hasPulls = false;
    Object.keys(exactDeductions.pulls).forEach(k => {
        hasPulls = true;
        let req = exactDeductions.pulls[k]; 
        let i = inventoryDB[k] || {produced_qty:0, sold_qty:0, consumed_qty:0, prototype_produced_qty:0, prototype_consumed_qty:0, scrap_qty:0, manual_adjustment:0};
        let b = parseFloat(i.produced_qty) || 0; let pb = parseFloat(i.prototype_produced_qty) || 0; let sold = parseFloat(i.sold_qty) || 0; let c_prod = parseFloat(i.production_consumed_qty) || 0; let c_proto = parseFloat(i.prototype_consumed_qty) || 0; let scrap = parseFloat(i.scrap_qty) || 0; let adj = parseFloat(i.manual_adjustment) || 0;
        let onHand = b - sold - c_prod - scrap + adj - Math.max(0, c_proto - pb); 
        let diff = onHand - req;
        
        let name = k.replace('RECIPE:::', '');
        
        let diffColor = diff < 0 ? '#ef4444' : '#10b981';
        let stockColor = onHand <= 0 ? '#ef4444' : 'var(--text-main)';
        
        h += `<tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
            <td style="padding:8px; font-weight:bold; color:var(--text-heading);">${name}</td>
            <td style="padding:8px; text-align:right; color:#8b5cf6; font-weight:bold;">${req.toFixed(2)}</td>
            <td style="padding:8px; text-align:right; color:${stockColor};">${onHand.toFixed(2)}</td>
            <td style="padding:8px; text-align:right; font-weight:bold; color:${diffColor};">${diff > 0 ? '+'+diff.toFixed(2) : diff.toFixed(2)}</td>
        </tr>`;
    });

    if(!hasPulls) h += `<tr><td colspan="4" style="text-align:center; padding:10px; color:var(--text-muted);">No sub-assemblies pulled.</td></tr>`;
    h += `</tbody></table>`;

    document.getElementById('batchOrderReportContent').innerHTML = h;
    document.getElementById('newWOModal').style.display = 'none';
    document.getElementById('batchOrderReportModal').style.display = 'flex';
}

function printBatchOrderReport() {
    const printContent = document.getElementById('batchOrderReportContent').innerHTML;
    const printWindow = window.open('', '', 'height=600,width=800');
    // Ensure styles map to printable black/white/red/green versions for paper
    printWindow.document.write(`<html><head><title>Batch Order Projection</title><style>body{font-family:sans-serif; padding:20px; color:#000;} table{width:100%; border-collapse:collapse; margin-bottom:20px;} th,td{border-bottom:1px solid #ccc; padding:8px; text-align:left;} th.right, td.right{text-align:right;} h3{border-bottom:2px solid #000; padding-bottom:5px; margin-top:20px;}</style></head><body><h1>📦 Batch Order Projection</h1>${printContent.replace(/color:#ef4444/g, 'color:red').replace(/color:#10b981/g, 'color:green').replace(/color:var\(--text-[^\)]+\)/g, 'color:black')}</body></html>`);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); }, 250);
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
            let req = exactDeductions.raws[k]; let c = catalogCache[k] || {totalQty: 0, is_3d_print: false}; let i = inventoryDB[k] || {consumed_qty: 0, manual_adjustment: 0, scrap_qty: 0}; 
            let onHand = c.totalQty - i.consumed_qty - i.scrap_qty + i.manual_adjustment; 
            if(req > onHand) { 
                if (!c.is_3d_print) {
                    let f = fmtKey(k); let name = f.nn ? f.nn : f.in; shortfalls.push(`<li><strong>${name}</strong>: Need ${req.toFixed(2)}, Have ${onHand.toFixed(2)}</li>`); 
                }
            }
        });

        Object.keys(exactDeductions.pulls).forEach(k => {
            let req = exactDeductions.pulls[k]; let i = inventoryDB[k] || {produced_qty:0, sold_qty:0, consumed_qty:0, scrap_qty:0, manual_adjustment:0};
            let c_prod = parseFloat(i.production_consumed_qty)||0; let c_proto = parseFloat(i.prototype_consumed_qty)||0; let pb = parseFloat(i.prototype_produced_qty)||0;
            let onHand = (i.produced_qty||0) - (i.sold_qty||0) - c_prod - (i.scrap_qty||0) + (i.manual_adjustment||0) - Math.max(0, c_proto - pb);
            if(req > onHand) { let name = k.replace('RECIPE:::', ''); shortfalls.push(`<li><strong>⚙️ ${name}</strong>: Need to pull ${req.toFixed(2)}, Shelf has ${onHand.toFixed(2)}</li>`); }
        });

        if(shortfalls.length > 0) { document.getElementById('woShortfallList').innerHTML = shortfalls.join(''); document.getElementById('woErrorBox').style.display = 'block'; return; }
        
        let batchType = document.getElementById('batchTypeSelect') ? document.getElementById('batchTypeSelect').value : 'Production';
        let woId = "WO-" + Date.now().toString().slice(-6); 
        let wo = { wo_id: woId, product_name: p, qty: q, status: 'Queued', wip_state: { batch_type: batchType }, routing: routingMap }; 
        sysLog(`Creating Work Order ${woId}`); setMasterStatus("Creating WO...", "mod-working");
        
        const {error} = await supabaseClient.from('work_orders').insert({
            wo_id: wo.wo_id, product_name: wo.product_name, qty: wo.qty, status: wo.status, 
            wip_state: JSON.stringify(wo.wip_state), routing: JSON.stringify(wo.routing)
        }); 
        if(error) throw new Error(error.message); 

        // 🖨️ AUTO-SPAWN 3D PRINT JOBS
        const printsToSpawn = find3DPrintedComponents(p, q, routingMap);
        const printPromises = [];
        
        Object.keys(printsToSpawn).forEach(part => {
            let totalNeeded = printsToSpawn[part];
            let isLegacyRaw = (typeof catalogCache !== 'undefined' && catalogCache[part]);
            let invKey = isLegacyRaw ? part : `RECIPE:::${part}`;
            let prefix = isLegacyRaw ? "" : "RECIPE:::";
            
            let i = inventoryDB[invKey] || {produced_qty:0, sold_qty:0, consumed_qty:0, scrap_qty:0, manual_adjustment: 0};
            
            // Calculate active on-shelf stock for this exact 3D printed component
            let rawOnHand = isLegacyRaw ? ((catalogCache[part] ? catalogCache[part].totalQty : 0) - (i.consumed_qty||0) - (i.scrap_qty||0) + (i.manual_adjustment||0)) : 0;
            let c_prod = parseFloat(i.production_consumed_qty)||0; let c_proto = parseFloat(i.prototype_consumed_qty)||0; let pb = parseFloat(i.prototype_produced_qty)||0;
            let onHand = isLegacyRaw ? rawOnHand : ((i.produced_qty||0) - (i.sold_qty||0) - c_prod - (i.scrap_qty||0) + (i.manual_adjustment||0) - Math.max(0, c_proto - pb));
            
            let amountToPrint = totalNeeded;
            if (onHand > 0) {
                amountToPrint = Math.max(0, totalNeeded - onHand);
            }
            
            // Only queue a print job for structural fallback/shortfalls instead of unconditionally spooling full amounts
            if (amountToPrint > 0) {
                if (typeof addPrintJob === 'function') {
                    printPromises.push(addPrintJob(prefix + part, amountToPrint, woId));
                }
            }
        });
        
        if (printPromises.length > 0) {
            sysLog(`Spawning ${printPromises.length} 3D print jobs for ${woId}...`);
            await Promise.all(printPromises);
        }
        
        workOrdersDB.unshift(wo); document.getElementById('newWOModal').style.display = 'none'; setMasterStatus("Created!", "mod-success"); setTimeout(()=>setMasterStatus("Ready.", "status-idle"), 2000); currentWO = wo; renderWOList(); saveWOOrderPrefs();
    } catch(e) { sysLog(e.message, true); setMasterStatus("Error", "mod-error"); }
}

let woDraggedIndex = null;

function renderWOList() {
    try {
        const ui = document.getElementById('woListUI'); ui.innerHTML = "";
        
        let activeBatches = 0;
        let totalUnits = 0;
        workOrdersDB.forEach(wo => {
            if (wo.status === 'Archived') return;
            if (wo.status !== 'Completed') {
                activeBatches++;
                totalUnits += (parseFloat(wo.qty) || 0);
            }
        });
        const batchEl = document.getElementById('activeBatchCount');
        const unitEl = document.getElementById('activeUnitCount');
        if (batchEl) batchEl.innerText = activeBatches;
        if (unitEl) unitEl.innerText = totalUnits;

        let activeCount = workOrdersDB.filter(w => w.status !== 'Archived').length;
        if(activeCount === 0) { ui.innerHTML = "<li style='cursor:default; background:transparent; border:none;'>No active Work Orders.</li>"; document.getElementById('woMainArea').style.display = 'none'; return; }
        
        workOrdersDB.forEach((wo, index) => { 
            if (wo.status === 'Archived') return;
            if(typeof wo.wip_state === 'string') wo.wip_state = JSON.parse(wo.wip_state || '{}');
            if(typeof wo.routing === 'string') wo.routing = JSON.parse(wo.routing || '{}');
            let sel = (currentWO && currentWO.wo_id === wo.wo_id) ? 'selected' : ''; 
            let dot = wo.status === 'Queued' ? '🟡' : (wo.status === 'Completed' ? '🟢' : (wo.status === 'Picking' ? '🔵' : '🟠')); 
            
            ui.innerHTML += `<li class="${sel}" 
                draggable="true"
                ondragstart="woDragStart(event, ${index})" 
                ondragover="woDragOver(event)" 
                ondrop="woDrop(event, ${index})" 
                ondragend="woDragEnd(event)"
                onclick="selectWO('${wo.wo_id}')" 
                style="display:flex; justify-content:space-between; align-items:center; cursor:grab; padding: 10px; border-bottom: 1px solid var(--border-color); margin-bottom: 5px; border-radius: 4px;">
                <div style="display:flex; align-items:center; gap:8px;">
                    <span style="font-weight:700; font-size:14px;">☰ ${dot} ${wo.wo_id}: ${wo.product_name}</span>
                </div>
                <span style="font-weight:900; font-family:monospace;">x${wo.qty}</span>
            </li>`; 
        });
        if(!currentWO) {
            let activeWO = workOrdersDB.find(w => w.status !== 'Archived');
            if(activeWO) {
                setTimeout(() => selectWO(activeWO.wo_id), 50);
            } else {
                document.getElementById('woMainArea').style.display = 'none';
            }
        } else {
            // Already selected, just ensure main area renders
            if(currentWO) { isSOPLocked = true; renderActiveWO(currentWO.wo_id); }
        }
    } catch(e) { sysLog(e.message, true); }
}

function woDragStart(e, index) { 
    woDraggedIndex = index; 
    e.target.style.opacity = '0.5'; 
    e.dataTransfer.effectAllowed = 'move';
}
function woDragOver(e) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }
function woDragEnd(e) { e.target.style.opacity = '1'; }
function woDrop(e, index) {
    e.preventDefault();
    if (woDraggedIndex !== null && woDraggedIndex !== index) {
        let movedItem = workOrdersDB.splice(woDraggedIndex, 1)[0];
        workOrdersDB.splice(index, 0, movedItem);
        renderWOList();
        if (typeof saveWOOrderPrefs === 'function') saveWOOrderPrefs();
    }
}
function selectWO(id) { try { currentWO = workOrdersDB.find(w => w.wo_id === id); isSOPLocked = true; renderWOList(); } catch(e) { sysLog(e.message, true); } }

async function toggleWIPCheckbox(chk, key) { try { if(!currentWO) return; let isChecked = chk.checked; if(isChecked) chk.parentElement.classList.add('done'); else chk.parentElement.classList.remove('done'); if(!currentWO.wip_state) currentWO.wip_state = {}; currentWO.wip_state[key] = isChecked; await supabaseClient.from('work_orders').update({ wip_state: JSON.stringify(currentWO.wip_state) }).eq('wo_id', currentWO.wo_id); } catch(e) { sysLog("Failed to save checkbox state.", true); } }
async function checkAllInGroup(grpId) { try { if(!currentWO) return; let chks = document.querySelectorAll(`.${grpId}-chk`); let changed = false; if(!currentWO.wip_state) currentWO.wip_state = {}; chks.forEach(chk => { if(!chk.checked) { chk.checked = true; chk.parentElement.classList.add('done'); let k = chk.getAttribute('data-key'); currentWO.wip_state[k] = true; changed = true; } }); if(changed) { sysLog(`Checked group in WO ${currentWO.wo_id}`); await supabaseClient.from('work_orders').update({ wip_state: JSON.stringify(currentWO.wip_state) }).eq('wo_id', currentWO.wo_id); } } catch(e) { sysLog("Failed to save group check.", true); } }
function toggleSOPLock() { isSOPLocked = !isSOPLocked; const btn = document.getElementById('sopLockBtn'); if(btn) btn.innerText = isSOPLocked ? '🔒' : '🔓'; if(currentWO) renderActiveWO(currentWO.wo_id); }

function renderActiveWO(id) {
    try {
        let wo = workOrdersDB.find(w => w.wo_id === id); if(!wo) return;
        document.getElementById('woMainArea').style.display = 'flex'; document.getElementById('woTitle').innerText = `${wo.wo_id}: ${wo.product_name} - [ ${wo.qty} UNITS ]`; document.getElementById('woQtyTarget').innerText = wo.qty;
        let b = document.getElementById('woBadge'); b.innerText = wo.status; b.className = "status-badge";
        if(wo.status === 'Queued') b.classList.add('st-queued'); else if(wo.status === 'Picking') b.classList.add('st-picking'); else if(wo.status === 'Completed') b.classList.add('st-completed'); else b.classList.add('st-production');
        
        const stEl = document.getElementById('woStartTime');
        const enEl = document.getElementById('woEndTime');
        const fmtDT = (iso) => { if(!iso) return ""; let d = new Date(iso); return d.toLocaleDateString([], {month:'numeric', day:'numeric'}) + " " + d.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}); };
        
        if(stEl) {
            if(wo.started_at) { stEl.innerText = `START: ${fmtDT(wo.started_at)}`; stEl.style.display = 'inline-block'; }
            else stEl.style.display = 'none';
        }
        if(enEl) {
            if(wo.completed_at) { enEl.innerText = `FINISH: ${fmtDT(wo.completed_at)}`; enEl.style.display = 'inline-block'; }
            else enEl.style.display = 'none';
        }
        ['Queued', 'Picking', 'Production', 'Completed'].forEach(s => { 
            let el = document.getElementById('pipe-'+s);
            el.classList.remove('active'); 
            el.style.pointerEvents = 'auto';
            el.style.opacity = '1';
            document.getElementById('sect-'+s).classList.remove('active'); 
        });

        document.getElementById('pipe-Queued').innerHTML = '1. Queued';
        document.getElementById('pipe-Picking').innerHTML = '2. Start Picking Parts';
        document.getElementById('pipe-Production').innerHTML = '3. Send to Production';
        document.getElementById('pipe-Completed').innerHTML = '4. Finalize Batch';

        let wip = wo.wip_state || {};
        const lockBtn = document.getElementById('sopLockBtn'); if(lockBtn) lockBtn.innerText = isSOPLocked ? '🔒' : '🔓';
        
        if (wo.status === 'Picking' || wo.status === 'In Production' || wo.status === 'Completed') {
            document.getElementById('pipe-Queued').style.pointerEvents = 'none';
            document.getElementById('pipe-Queued').style.opacity = '0.6';
            document.getElementById('pipe-Queued').innerHTML = '🔒 1. Queued';
        }
        if (wo.status === 'In Production' || wo.status === 'Completed' || wo.materials_pulled) {
            document.getElementById('pipe-Picking').style.pointerEvents = 'none';
            document.getElementById('pipe-Picking').style.opacity = '0.6';
            document.getElementById('pipe-Picking').innerHTML = '🔒 2. Parts Picked & Deducted';
        }
        if (wo.status === 'Completed') {
            document.getElementById('pipe-Production').style.pointerEvents = 'none';
            document.getElementById('pipe-Production').style.opacity = '0.6';
            document.getElementById('pipe-Production').innerHTML = '🔒 3. Send to Production';
            document.getElementById('pipe-Completed').style.pointerEvents = 'none';
            document.getElementById('pipe-Completed').style.opacity = '0.6';
            document.getElementById('pipe-Completed').innerHTML = '🔒 4. Finalize Batch';
        }

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
                                    if (m.type === 'img') { 
                                        let imgThumbUrl = dId ? `https://googleusercontent.com/profile/picture/0` : safeUrl; 
                                        attachmentHtml += `<img loading="lazy" src="${imgThumbUrl}" style="max-width:300px; max-height:200px; border-radius:6px; border:1px solid var(--border-color); cursor:zoom-in;" onclick="openMediaModal('${imgThumbUrl}', 'img')">`; 
                                    } else { 
                                        let isNativeVid = !dId && m.type === 'vid' && (safeUrl.includes('.mp4') || safeUrl.includes('.webm') || safeUrl.includes('supabase.co'));
                                        if (isNativeVid) {
                                            attachmentHtml += `<div style="position:relative; width:300px; height:200px; background:#1e293b; border-radius:6px; overflow:hidden; border:1px solid var(--border-color); cursor:zoom-in;" onclick="openMediaModal('${safeUrl}', 'vid')"><video preload="none" src="${safeUrl}" style="width:100%; height:100%; object-fit:cover; opacity:0;" muted playsinline></video><div style="position:absolute; inset:0; display:flex; justify-content:center; align-items:center; flex-direction:column; gap:8px;"><i class="fa-solid fa-play" style="font-size:32px; color:white; filter:drop-shadow(0 2px 4px rgba(0,0,0,0.5));"></i><span style="color:white; font-size:11px; font-weight:bold;">NATIVE VIDEO</span></div></div>`;
                                        } else {
                                            let mediaUrl = dId ? `https://drive.google.com/file/d/${dId}/preview` : safeUrl; 
                                            if (mediaUrl.includes('sharepoint.com') && !mediaUrl.includes('action=embedview')) mediaUrl += (mediaUrl.includes('?') ? '&' : '?') + 'action=embedview';
                                            attachmentHtml += `<div style="position:relative; width:300px; height:200px; border-radius:6px; overflow:hidden; border:1px solid var(--border-color); cursor:zoom-in;" onclick="openMediaModal('${mediaUrl}', 'iframe')"><iframe loading="lazy" src="${mediaUrl}" style="width:100%; height:100%; border:none; pointer-events:none;"></iframe></div>`; 
                                        }
                                    }
                                }
                            });
                            attachmentHtml += `</div>`;
                            sList.innerHTML += `<div class="checklist-item ${doneCls}"><input type="checkbox" ${isDone} onchange="toggleWIPCheckbox(this, '${chkKey}')"> <div class="chk-text" style="width:100%;"><strong style="color:#0ea5e9; font-size:16px;">Step ${stepCounter++}:</strong><br> ${s.text} ${attachmentHtml}</div></div>`;
                        }
                    });
                }
            }
        }
        else if(wo.status === 'Completed') { 
            document.getElementById('pipe-Completed').classList.add('active'); 
            document.getElementById('sect-Completed').classList.add('active'); 
        }
    } catch(e) { sysLog(e.message, true); }
}

async function advanceWO(newStatus) {
    try {
        if(!currentWO) return; 
        if(currentWO.status === 'Completed') return alert("WO archived.");
        
        if (currentWO.materials_pulled && (newStatus === 'Queued' || newStatus === 'Picking')) {
            return alert("Materials have already been pulled for this Work Order. You cannot revert to previous planning stages.");
        }

        sysLog(`WO ${currentWO.wo_id} -> ${newStatus}`); setMasterStatus("Updating...", "mod-working");
        if (newStatus === 'In Production' || newStatus === 'Completed') {
            if (!currentWO.materials_pulled) {
                if(!confirm(`Deduct raw materials for ${currentWO.wo_id}?`)) { setMasterStatus("Ready.", "status-idle"); return; }
                let exactDeductions = calculateExactWODeductions(currentWO);
                let upsKeys = new Set();
                let bType = currentWO.wip_state && currentWO.wip_state.batch_type ? currentWO.wip_state.batch_type : 'Production';
                
                Object.keys(exactDeductions.raws_production).forEach(k => {
                    let req = exactDeductions.raws_production[k];
                    if(!inventoryDB[k]) inventoryDB[k]={consumed_qty:0, manual_adjustment:0, produced_qty:0, sold_qty:0, min_stock:0, scrap_qty:0, prototype_consumed_qty:0, assembly_consumed_qty:0, production_consumed_qty:0, prototype_produced_qty:0}; 
                    inventoryDB[k].consumed_qty += req; 
                    if(bType === 'Prototype') inventoryDB[k].prototype_consumed_qty = (inventoryDB[k].prototype_consumed_qty||0) + req;
                    else inventoryDB[k].production_consumed_qty = (inventoryDB[k].production_consumed_qty||0) + req;
                    upsKeys.add(k);
                });
                Object.keys(exactDeductions.raws_assembly).forEach(k => {
                    let req = exactDeductions.raws_assembly[k];
                    if(!inventoryDB[k]) inventoryDB[k]={consumed_qty:0, manual_adjustment:0, produced_qty:0, sold_qty:0, min_stock:0, scrap_qty:0, prototype_consumed_qty:0, assembly_consumed_qty:0, production_consumed_qty:0, prototype_produced_qty:0}; 
                    inventoryDB[k].consumed_qty += req; 
                    if(bType === 'Prototype') inventoryDB[k].prototype_consumed_qty = (inventoryDB[k].prototype_consumed_qty||0) + req;
                    else inventoryDB[k].production_consumed_qty = (inventoryDB[k].production_consumed_qty||0) + req; // Rerouted from assembly
                    upsKeys.add(k);
                });
                Object.keys(exactDeductions.pulls).forEach(k => {
                    let req = exactDeductions.pulls[k];
                    if(!inventoryDB[k]) inventoryDB[k]={consumed_qty:0, manual_adjustment:0, produced_qty:0, sold_qty:0, min_stock:0, scrap_qty:0, prototype_consumed_qty:0, assembly_consumed_qty:0, production_consumed_qty:0, prototype_produced_qty:0}; 
                    
                    inventoryDB[k].consumed_qty += req; 
                    if(bType === 'Prototype') inventoryDB[k].prototype_consumed_qty = (inventoryDB[k].prototype_consumed_qty||0) + req;
                    else inventoryDB[k].production_consumed_qty = (inventoryDB[k].production_consumed_qty||0) + req;
                    
                    upsKeys.add(k);
                });
                
                let ups = Array.from(upsKeys).map(k => ({item_key: k, consumed_qty: inventoryDB[k].consumed_qty, manual_adjustment: inventoryDB[k].manual_adjustment, produced_qty: inventoryDB[k].produced_qty, sold_qty: inventoryDB[k].sold_qty, min_stock: inventoryDB[k].min_stock, scrap_qty: inventoryDB[k].scrap_qty, prototype_consumed_qty: inventoryDB[k].prototype_consumed_qty||0, assembly_consumed_qty: inventoryDB[k].assembly_consumed_qty||0, production_consumed_qty: inventoryDB[k].production_consumed_qty||0, prototype_produced_qty: inventoryDB[k].prototype_produced_qty||0}));
                if(ups.length > 0) await supabaseClient.from('inventory_consumption').upsert(ups, {onConflict:'item_key'}); 
                
                currentWO.materials_pulled = true;
                await supabaseClient.from('work_orders').update({ materials_pulled: true }).eq('wo_id', currentWO.wo_id);
            }
        }

        if (newStatus === 'Completed') {
            if(!confirm(`Add ${currentWO.qty} Finished Goods to Inventory Yield?`)) { setMasterStatus("Ready.", "status-idle"); return; }
            let bType = currentWO.wip_state && currentWO.wip_state.batch_type ? currentWO.wip_state.batch_type : 'Production';
            
            let exactDeductions = calculateExactWODeductions(currentWO);
            let upsKeys = new Set();
            
            Object.keys(exactDeductions.built_subs).forEach(k => {
                let req = exactDeductions.built_subs[k];
                if(!inventoryDB[k]) inventoryDB[k]={consumed_qty:0, manual_adjustment:0, produced_qty:0, sold_qty:0, min_stock:0, scrap_qty:0, prototype_consumed_qty:0, assembly_consumed_qty:0, production_consumed_qty:0, prototype_produced_qty:0}; 
                
                inventoryDB[k].consumed_qty += req;
                if(bType === 'Prototype') inventoryDB[k].prototype_consumed_qty = (inventoryDB[k].prototype_consumed_qty||0) + req;
                else inventoryDB[k].production_consumed_qty = (inventoryDB[k].production_consumed_qty||0) + req;
                
                let cleanName = k.replace('RECIPE:::', '');
                let is3D = productsDB[cleanName] && productsDB[cleanName].is_3d_print;
                
                if (!is3D) {
                    if(bType === 'Prototype') inventoryDB[k].prototype_produced_qty = (inventoryDB[k].prototype_produced_qty||0) + req;
                    else inventoryDB[k].produced_qty += req;
                }
                upsKeys.add(k);
            });

            let fgiKey = `RECIPE:::${currentWO.product_name}`;
            if(!inventoryDB[fgiKey]) inventoryDB[fgiKey]={consumed_qty:0, manual_adjustment:0, produced_qty:0, sold_qty:0, min_stock:0, scrap_qty:0, prototype_consumed_qty:0, assembly_consumed_qty:0, production_consumed_qty:0, prototype_produced_qty:0};
            
            if(bType === 'Prototype') inventoryDB[fgiKey].prototype_produced_qty = (inventoryDB[fgiKey].prototype_produced_qty||0) + currentWO.qty;
            else inventoryDB[fgiKey].produced_qty += currentWO.qty;
            upsKeys.add(fgiKey);
            
            let ups = Array.from(upsKeys).map(k => ({item_key: k, consumed_qty: inventoryDB[k].consumed_qty, manual_adjustment: inventoryDB[k].manual_adjustment, produced_qty: inventoryDB[k].produced_qty, sold_qty: inventoryDB[k].sold_qty, min_stock: inventoryDB[k].min_stock, scrap_qty: inventoryDB[k].scrap_qty, prototype_consumed_qty: inventoryDB[k].prototype_consumed_qty||0, assembly_consumed_qty: inventoryDB[k].assembly_consumed_qty||0, production_consumed_qty: inventoryDB[k].production_consumed_qty||0, prototype_produced_qty: inventoryDB[k].prototype_produced_qty||0}));
            if(ups.length > 0) await supabaseClient.from('inventory_consumption').upsert(ups, {onConflict:'item_key'});
        }
        
        const updateData = {status: newStatus};
        if(newStatus !== 'Queued' && !currentWO.started_at) {
            currentWO.started_at = new Date().toISOString();
            updateData.started_at = currentWO.started_at;
        }
        if(newStatus === 'Completed') {
            currentWO.completed_at = new Date().toISOString();
            updateData.completed_at = currentWO.completed_at;
            updateData.status = 'Archived';
        }

        const {error} = await supabaseClient.from('work_orders').update(updateData).eq('wo_id', currentWO.wo_id); if(error) throw new Error(error.message); 
        
        // Auto-spawn 3D Print Jobs (Raw Goods based)
        try {
            const { data: existingPrints } = await supabaseClient.from('print_queue').select('id').eq('wo_id', currentWO.wo_id);
            if (!existingPrints || existingPrints.length === 0) {
                const printJobs = find3DPrintedComponents(currentWO.product_name, currentWO.qty, currentWO.routing);
                for(let job of Object.keys(printJobs)) {
                    let totalNeeded = printJobs[job];
                    let isLegacyRaw = (typeof catalogCache !== 'undefined' && catalogCache[job]);
                    let invKey = isLegacyRaw ? job : `RECIPE:::${job}`;
                    let prefix = isLegacyRaw ? "" : "RECIPE:::";

                    let i = inventoryDB[invKey] || {produced_qty:0, sold_qty:0, consumed_qty:0, scrap_qty:0, manual_adjustment: 0};
                    let rawOnHand = isLegacyRaw ? ((catalogCache[job] ? catalogCache[job].totalQty : 0) - (i.consumed_qty||0) - (i.scrap_qty||0) + (i.manual_adjustment||0)) : 0;
                    let c_prod = parseFloat(i.production_consumed_qty)||0; let c_proto = parseFloat(i.prototype_consumed_qty)||0; let pb = parseFloat(i.prototype_produced_qty)||0;
                    let onHand = isLegacyRaw ? rawOnHand : ((i.produced_qty||0) - (i.sold_qty||0) - c_prod - (i.scrap_qty||0) + (i.manual_adjustment||0) - Math.max(0, c_proto - pb));
                    
                    let amountToPrint = totalNeeded;
                    if (onHand > 0) amountToPrint = Math.max(0, totalNeeded - onHand);

                    if (amountToPrint > 0 && typeof addPrintJob === 'function') {
                        await addPrintJob(prefix + job, amountToPrint, currentWO.wo_id);
                    }
                }
            }
        } catch(pe) { sysLog("Print Spawn Error: " + pe.message, true); }

        currentWO.status = updateData.status || newStatus; 
        if(currentWO.status === 'Archived') {
            currentWO = workOrdersDB.find(w => w.status !== 'Archived') || null;
        }
        setMasterStatus("Updated!", "mod-success"); setTimeout(()=>setMasterStatus("Ready.", "status-idle"), 2000); renderWOList(); 
    } catch(e) { sysLog(e.message, true); setMasterStatus("Error", "mod-error"); }
}

async function deleteCurrentWO() { try { if(!currentWO) return; if(confirm(`Delete ${currentWO.wo_id}?`)) { await supabaseClient.from('work_orders').delete().eq('wo_id', currentWO.wo_id); workOrdersDB = workOrdersDB.filter(w => w.wo_id !== currentWO.wo_id); currentWO = workOrdersDB.find(w => w.status !== 'Archived') || null; renderWOList(); } } catch(e) { sysLog(e.message, true); } }

async function archiveCurrentWO() {
    try {
        if(!currentWO) return;
        if(currentWO.status === 'Archived') return alert("Already archived.");
        if(confirm(`Archive WO ${currentWO.wo_id}?`)) {
            sysLog(`Archiving ${currentWO.wo_id}`); setMasterStatus("Archiving...", "mod-working");
            const {error} = await supabaseClient.from('work_orders').update({status: 'Archived'}).eq('wo_id', currentWO.wo_id);
            if(error) throw new Error(error.message);
            currentWO.status = 'Archived';
            setMasterStatus("Archived!", "mod-success"); setTimeout(()=>setMasterStatus("Ready.", "status-idle"), 2000);
            currentWO = workOrdersDB.find(w => w.status !== 'Archived') || null;
            renderWOList();
        }
    } catch(e) { sysLog(e.message, true); }
}

let currentArchiveTab = 'batchez';
function openArchiveExplorer(tab = 'batchez') {
    document.getElementById('archiveExplorerModal').style.display = 'flex';
    switchArchiveTab(tab);
}
function closeArchiveExplorer() {
    document.getElementById('archiveExplorerModal').style.display = 'none';
}
async function switchArchiveTab(tab) {
    currentArchiveTab = tab;
    document.getElementById('tabArchBatchez').style.borderBottom = tab === 'batchez' ? '3px solid #0ea5e9' : '3px solid transparent';
    document.getElementById('tabArchLayerz').style.borderBottom = tab === 'layerz' ? '3px solid #0ea5e9' : '3px solid transparent';
    
    if (tab === 'layerz' && !window._layerzArchiveLoaded) {
        if (typeof refreshPrintQueue === 'function') {
            document.getElementById('archiveListArea').innerHTML = '<p style="color:var(--text-muted); text-align:center;">Fetching records...</p>';
            await refreshPrintQueue();
            window._layerzArchiveLoaded = true;
        }
    }
    renderArchiveList();
}
function renderArchiveList() {
    const listArea = document.getElementById('archiveListArea');
    listArea.innerHTML = '';
    
    if (currentArchiveTab === 'batchez') {
        const archivedItemz = workOrdersDB.filter(w => w.status === 'Archived');
        if(archivedItemz.length === 0) { listArea.innerHTML = '<p style="color:var(--text-muted); text-align:center;">No archived batches found.</p>'; return; }
        
        const fmt = (d) => d ? new Date(d).toLocaleString([], { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : null;
        archivedItemz.forEach(wo => {
            const dtC = fmt(wo.started_at || wo.created_at) || 'Unknown';
            const dtF = fmt(wo.completed_at) || 'Manual Archive';
            listArea.innerHTML += `<div style="display:flex; justify-content:space-between; align-items:center; background:var(--bg-panel); padding:15px; border-radius:8px; border:1px solid var(--border-color); margin-bottom:10px;">
                <div>
                    <strong style="color:var(--text-heading); font-size:16px;">${wo.wo_id}: ${wo.product_name}</strong>
                    <div style="font-size:12px; color:var(--text-muted); margin-top:5px;">Target Qty: ${wo.qty} | Started: ${dtC} | <span style="color:var(--neon-green)">Completed: ${dtF}</span></div>
                </div>
                <div style="display:flex; gap:10px;">
                    <button class="btn-red" style="width:auto; padding:8px 15px; font-size:13px;" onclick="hardDeleteArchive('batchez', '${wo.wo_id}')">🗑️ Hard Delete</button>
                </div>
            </div>`;
        });
    } else {
        const archivedItemz = printQueueDB.filter(p => p.status === 'Archived');
        if(archivedItemz.length === 0) { listArea.innerHTML = '<p style="color:var(--text-muted); text-align:center;">No archived prints found.</p>'; return; }
        
        const fmt = (d) => d ? new Date(d).toLocaleString([], { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : null;
        archivedItemz.forEach(job => {
            const dtC = fmt(job.started_at || job.created_at) || 'Unknown';
            const dtF = fmt(job.completed_at) || 'Manual Archive';
            
            let cleanPartName = (job.part_name || 'Unknown Part').split(':::')[0];
            const catItem = typeof catalogByName !== 'undefined' ? catalogByName[cleanPartName] : null;
            const displayName = catItem ? (catItem.neoName || catItem.itemName) : cleanPartName;
            
            let displayID = (job.wo_id && job.wo_id.startsWith('WO-')) ? job.wo_id : ('PR-' + String(job.id || '').substring(0, 8).toUpperCase());

            listArea.innerHTML += `<div style="display:flex; justify-content:space-between; align-items:center; background:var(--bg-panel); padding:15px; border-radius:8px; border:1px solid var(--border-color); margin-bottom:10px;">
                <div>
                    <strong style="color:var(--text-heading); font-size:16px;">${displayID}: ${displayName}</strong>
                    <div style="font-size:12px; color:var(--text-muted); margin-top:5px;">Target Qty: ${job.qty} | Started: ${dtC} | <span style="color:var(--neon-purple)">Completed: ${dtF}</span></div>
                </div>
                <div style="display:flex; gap:10px;">
                    <button class="btn-red" style="width:auto; padding:8px 15px; font-size:13px;" onclick="hardDeleteArchive('layerz', '${job.id}')">🗑️ Hard Delete</button>
                </div>
            </div>`;
        });
    }
}


async function hardDeleteArchive(type, id) {
    if(!confirm('Permanently destroy this archived record? This action cannot be undone.')) return;
    sysLog(`Hard deleting ${id} from ${type}`);
    setMasterStatus("Deleting...", "mod-working");
    try {
        if(type === 'batchez') {
            await supabaseClient.from('work_orders').delete().eq('wo_id', id);
            workOrdersDB = workOrdersDB.filter(w => w.wo_id !== id);
        } else {
            await supabaseClient.from('print_queue').delete().eq('id', id);
            printQueueDB = printQueueDB.filter(p => p.id !== id);
        }
        setMasterStatus("Deleted!", "mod-success");
        setTimeout(()=>setMasterStatus("Ready.", "status-idle"), 2000);
        renderArchiveList();
    } catch(e) { sysLog(e.message, true); setMasterStatus("Error", "mod-error"); }
}

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

