/**
 * @typedef {Object} WorkOrderRow
 * @property {string} wo_id
 * @property {string} product_name
 * @property {number} qty
 * @property {string|null} label
 * @property {string} status
 * @property {Object|string} wip_state
 * @property {Object|string} routing
 */

/**
 * @typedef {Object} ProductionSopRow
 * @property {string} product_name
 * @property {Object|string} steps
 */
// --- 11. PRODUCTION MANAGER, ROUTING ENGINE, MEDIA, EXPORTS ---
function parseMediaUrl(url) { if(!url) return null; let m = url.match(/\/(?:file\/d\/|uc\?id=|open\?id=)([a-zA-Z0-9_-]+)/); return m ? m[1] : null; }
function openMediaModal(url, renderType) { try { const container = document.getElementById('mediaContainer'); if(renderType === 'img') { container.style.background = 'transparent'; container.innerHTML = window.safeHTML(
    `<img src="${url}" style="max-width:100%; max-height:100%; object-fit:contain; cursor: zoom-out;" data-click="click_closeMediaModal">`
); } else if (renderType === 'vid') { container.style.background = '#000000'; container.innerHTML = window.safeHTML(
    `<video src="${url}" style="max-width:100%; max-height:100%; outline:none; box-shadow:0 0 40px rgba(0,0,0,0.5);" controls autoplay controlsList="nodownload"></video>`
); } else { container.style.background = '#ffffff'; container.innerHTML = window.safeHTML(
    `<iframe src="${url}" style="width:100%; height:100%; border:none;" allowfullscreen allow="autoplay"></iframe>`
); } document.getElementById('mediaModal').style.display = 'flex'; } catch(e) { sysLog(e.message, true); } }
function closeMediaModal() { try { document.getElementById('mediaModal').style.display = 'none'; document.getElementById('mediaContainer').innerHTML = window.safeHTML(''); } catch(e) { sysLog(e.message, true); } }

function execRT(cmd, val=null) { document.execCommand(cmd, false, val); }
function getRTToolbar() { return `<div class="rt-toolbar"><button type="button" class="rt-btn" onmousedown="event.preventDefault(); execRT('bold')" title="Bold"><b>B</b></button><button type="button" class="rt-btn" onmousedown="event.preventDefault(); execRT('italic')" title="Italic"><i>I</i></button><button type="button" class="rt-btn" onmousedown="event.preventDefault(); execRT('underline')" title="Underline"><u>U</u></button><button type="button" class="rt-btn" onmousedown="event.preventDefault(); execRT('strikeThrough')" title="Strikethrough"><s>S</s></button><span style="color:var(--border-input); margin:0 4px;">|</span><button type="button" class="rt-btn" onmousedown="event.preventDefault(); execRT('justifyLeft')" title="Align Left">⬅</button><button type="button" class="rt-btn" onmousedown="event.preventDefault(); execRT('justifyCenter')" title="Align Center">⬌</button><button type="button" class="rt-btn" onmousedown="event.preventDefault(); execRT('justifyRight')" title="Align Right">➡</button><span style="color:var(--border-input); margin:0 4px;">|</span><button type="button" class="rt-btn" onmousedown="event.preventDefault(); execRT('insertUnorderedList')" title="Bullet List">●</button><button type="button" class="rt-btn" onmousedown="event.preventDefault(); execRT('insertOrderedList')" title="Number List">1.</button><span style="color:var(--border-input); margin:0 4px;">|</span><input type="color" onchange="execRT('foreColor', this.value)" title="Text Color" style="width:24px; height:24px; padding:0; border:none; cursor:pointer; background:transparent;"><select onchange="execRT('fontSize', this.value)" style="width:auto; padding:4px; font-size:12px; border:1px solid var(--border-input); border-radius:4px; background:var(--bg-input); color:var(--text-main); margin-right:4px;"><option value="3">Normal Font</option><option value="4">Large Font</option><option value="5">Huge Font</option></select></div>`; }

window.generateEditableSOPRow = function(s, idx, prodId = 'unknown', sopType = 'batches') {
    let safeText = s.text || ''; 
    let attachments = [];
    
    // Legacy support
    if (s.m1 && s.m1.url) attachments.push(s.m1);
    if (s.m2 && s.m2.url) attachments.push(s.m2);
    if (s.m3 && s.m3.url) attachments.push(s.m3);
    
    // New format support
    if (s.attachments && s.attachments.length > 0) {
        attachments = s.attachments;
    }

    // Always ensure at least 1 empty row is rendered if there are no attachments
    if (attachments.length === 0) {
        attachments.push({type: 'img', url: ''});
    }

    let attachmentHtml = '';
    attachments.forEach((m, i) => {
        let n = i + 1;
        let u = (m.url||'').replace(/"/g,'"').replace(/'/g,"\\'"); 
        attachmentHtml += `
            <div class="media-row media-row-dynamic" style="display:flex; gap:4px; align-items:center; margin-bottom:4px;">
                <select class="m-type" style="border:1px solid var(--border-input); background:var(--bg-input); color:var(--text-main); padding:4px; border-radius:4px;">
                    <option value="img" ${m.type==='img'?'selected':''}>🖼️ Image</option>
                    <option value="doc" ${m.type==='doc'?'selected':''}>📄 Doc</option>
                    <option value="vid" ${m.type==='vid'?'selected':''}>🎬 Vid</option>
                </select>
                <input type="text" class="m-url" value="${u}" placeholder="URL" style="flex-grow:1; border:1px solid var(--border-input); background:var(--bg-input); color:var(--text-main); padding:4px; border-radius:4px; min-width:0;">
                <button type="button" class="btn-red-muted icon-btn btn-icon-sq" style="padding:4px 8px; border-radius:4px;" data-click="click_removeAttachmentRow">✕</button>
            </div>
        `;
    });

    return `
        <div class="sop-step-row">
            <div class="sop-step-movers">
                <button class="icon-btn btn-icon-sq" style="border:none; background:var(--bg-input);" data-click="click_moveSOPUp">▲</button>
                <button class="icon-btn btn-icon-sq" style="border:none; background:var(--bg-input);" data-click="click_moveSOPDown">▼</button>
                <button class="icon-btn btn-icon-sq" style="font-size:16px; font-weight:900; border:none; background:#3b82f6; color:white; margin-top:auto;" data-click="click_addSOPRow" data-prodid="${prodId}" data-soptype="${sopType}">+</button>
                <button class="btn-red-muted icon-btn btn-icon-sq" style="margin-top:5px;" data-click="click_removeSOPRow">✕</button>
            </div>
            <div class="sop-text-container">
                <div class="sop-text-rich" contenteditable="true" placeholder="Type instructions here...">${safeText}</div>
            </div>
            <div class="sop-controls-container">
                ${getRTToolbar()}
                <div style="display:flex; justify-content:flex-end; margin-top:8px; margin-bottom:4px; padding:4px 8px; border-radius:6px;">
                    <div style="display:flex; gap:4px;">
                        <button type="button" data-mousedown="mousedown_smartPhotoPaste" style="font-size:10px; font-weight:bold; padding:2px 8px; border-radius:4px; border:1px solid #F59E0B; background:rgba(245,158,11,0.15); color:#F59E0B; cursor:pointer;" title="Smart Photo Paste">📸 PHOTO</button>
                        <button type="button" data-mousedown="mousedown_sopDirectUpload" data-prodid="${prodId}" data-soptype="${sopType}" style="font-size:10px; font-weight:bold; padding:2px 8px; border-radius:4px; border:1px solid #3b82f6; background:rgba(59,130,246,0.15); color:#3b82f6; cursor:pointer;" title="Upload File to Supabase">☁️ UPLOAD MEDIA</button>
                        <button type="button" data-mousedown="mousedown_smartAttachmentUrl" style="font-size:10px; font-weight:bold; padding:2px 6px; border-radius:4px; border:1px solid #10b981; background:rgba(16,185,129,0.15); color:#10b981; cursor:pointer;">+ NEW URL</button>
                    </div>
                </div>
                <div class="attachments-container" style="display:flex; flex-direction:column;">
                    ${attachmentHtml}
                </div>
            </div>
        </div>
    `;
};

// Map old local function name to global function just in case
function generateEditableSOPRow(s, idx, prodId = 'unknown', sopType = 'batches') { return window.generateEditableSOPRow(s, idx, prodId, sopType); }

let currentSopMode = 'production'; // 'production' or '3d'

function openSOPMasterModal(mode = 'production') {
    currentSopMode = mode;
    document.getElementById('sopMasterTitle').innerText = (mode === '3d') ? '📝 LAYERZ SOP EDITOR' : '📝 BATCHEZ SOP EDITOR';
    populateSOPDropdown();
    document.getElementById('sopMasterModal').style.display = 'flex';
    renderMasterSOP();
}

function populateSOPDropdown() {
    try {
    const sopSelect = document.getElementById('sopMasterProductSelect');
    if (!sopSelect) return;

    let options = '<option value="">-- Select Item to Edit SOP --</option>';
    if (currentSopMode === '3d') {
        // Show only 3D Printed Products/Recipes (is_3d_print flag lives on productsDB entries)
        Object.keys(productsDB).sort().forEach(p => {
            let pData = productsDB[p];
            if (pData && pData.is_3d_print) {
                let time = pData.print_time_mins || 0;
                options += `<option value="${String(p).replace(/"/g, '&quot;')}">🖨️ ${p}${time ? ' (' + time + 'm)' : ''}</option>`;
            }
        });
    } else {
        // Grouped like RECIPEZ: 📦 Retail → ⚙️ Sub-Assemblies → 🖨️ 3D Prints
        let sorted = Object.keys(productsDB).sort();
        let retail  = sorted.filter(p => !isSubassemblyDB[p] && !(productsDB[p] && productsDB[p].is_3d_print) && !(productsDB[p] && productsDB[p].is_label));
        let subs    = sorted.filter(p =>  isSubassemblyDB[p] && !(productsDB[p] && productsDB[p].is_3d_print) && !(productsDB[p] && productsDB[p].is_label));
        let prints  = sorted.filter(p => productsDB[p] && productsDB[p].is_3d_print && !(productsDB[p] && productsDB[p].is_label));
        const grp = (label, icon, arr) => arr.length ? `<optgroup label="${label}">${arr.map(p => `<option value="${String(p).replace(/"/g,'&quot;')}">${icon} ${p}</option>`).join('')}</optgroup>` : '';
        options += grp('📦 RETAIL PRODUCTS', '📦', retail);
        options += grp('⚙️ SUB-ASSEMBLIES',  '⚙️',  subs);
        options += grp('🖨️ 3D PRINTS',       '🖨️',  prints);
    }
    sopSelect.innerHTML = window.safeHTML(options);
    } catch(e) { sysLog(e.message, true); }
}

function renderMasterSOP() {
    try {
        const p = document.getElementById('sopMasterProductSelect').value;
        const area = document.getElementById('sopMasterEditorArea');
        const qaArea = document.getElementById('productionAdminQA');
        if(!p) {
            area.innerHTML = window.safeHTML(
                "<div style='color:var(--text-muted); text-align:center; padding:20px; font-size:18px;'>Select an item above to start writing instructions.</div>"
            );
            if(qaArea) { qaArea.value = ''; if(typeof renderProductionTelemetryPreview === 'function') renderProductionTelemetryPreview(); }
            return;
        }
        let dbPayload = sopsDB[p];
        let steps = [];
        let qaChecks = [];
        if (dbPayload) {
            if (Array.isArray(dbPayload)) { steps = dbPayload; }
            else if (typeof dbPayload === 'object') {
                steps = dbPayload.steps || [];
                qaChecks = dbPayload.qaChecks || [];
            }
        }
        if(qaArea) {
            qaArea.value = qaChecks.join('\n');
            if(typeof renderProductionTelemetryPreview === 'function') renderProductionTelemetryPreview();
        }
        let mappedSteps = steps.map(s => typeof s === 'string' ? {text: s, attachments: []} : s);
        if(mappedSteps.length === 0) mappedSteps = [{}];
        let h = "";
        mappedSteps.forEach((s, idx) => { h += generateEditableSOPRow(s, idx, p, 'batches'); });
        area.innerHTML = window.safeHTML(h);
    } catch(e) { sysLog(e.message, true); }
}

function addSOPRow(btn) { try { let pId = btn ? btn.getAttribute('data-prodid') : 'unknown'; let sType = btn ? btn.getAttribute('data-soptype') : 'batches'; let newRow = document.createElement('div'); newRow.innerHTML = window.safeHTML(generateEditableSOPRow({}, 999, pId, sType)); let rowNode = newRow.firstChild; if(btn && btn.closest) { let currentRow = btn.closest('.sop-step-row'); currentRow.parentNode.insertBefore(rowNode, currentRow.nextSibling); } else { let area = document.getElementById('sopMasterEditorArea'); if(area) area.appendChild(rowNode); } } catch(e) { sysLog("UI Error adding SOP step: " + e.message, true); } }
function removeSOPRow(btn) { try { btn.closest('.sop-step-row').remove(); } catch(e) { sysLog("UI Error removing SOP step: " + e.message, true); } }
function moveSOPUp(btn) { try { let row = btn.closest('.sop-step-row'); if(row.previousElementSibling && row.previousElementSibling.classList.contains('sop-step-row')) { row.parentNode.insertBefore(row, row.previousElementSibling); } } catch(e) { sysLog("UI Error moving SOP up: " + e.message, true); } }
function moveSOPDown(btn) { try { let row = btn.closest('.sop-step-row'); if(row.nextElementSibling && row.nextElementSibling.classList.contains('sop-step-row')) { row.parentNode.insertBefore(row.nextElementSibling, row); } } catch(e) { sysLog("UI Error moving SOP down: " + e.message, true); } }

window.addSOPRow = addSOPRow;
window.removeSOPRow = removeSOPRow;
window.moveSOPUp = moveSOPUp;
window.moveSOPDown = moveSOPDown;

window.triggerSopDirectUpload = function(btn) {
    try {
        let input = document.getElementById('sopDirectUploadInput');
        if (!input) {
            input = document.createElement('input');
            input.type = 'file';
            input.id = 'sopDirectUploadInput';
            input.style.display = 'none';
            input.accept = 'image/*,video/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt';
            document.body.appendChild(input);
        }
        let prodId = btn.getAttribute('data-prodid') || '';
        let sopType = btn.getAttribute('data-soptype') || 'batches';
        
        if (!prodId) {
            if (sopType === 'batches') {
                let sel = document.getElementById('sopMasterProductSelect');
                if (sel) prodId = sel.value;
            } else if (sopType === 'packerz') {
                let sel = document.getElementById('packerzAdminRecipeSelect');
                if (sel) prodId = sel.value;
            }
        }
        if (!prodId) prodId = 'unknown';
        
        input.onchange = async function(e) {
            let file = e.target.files[0];
            if (!file) return;
            
            let originalText = btn.innerHTML;
            btn.innerHTML = '⏳ UPLOADING...';
            btn.style.pointerEvents = 'none';
            
            try {
                let cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
                let path = `sops/${sopType}/${prodId}/${Date.now()}_${cleanName}`;
                
                const { data, error } = await supabaseClient.storage.from('sop-media').upload(path, file);
                if (error) throw error;
                
                const { data: urlData } = supabaseClient.storage.from('sop-media').getPublicUrl(path);
                if (!urlData || !urlData.publicUrl) throw new Error("Could not retrieve public URL");
                
                let publicUrl = urlData.publicUrl;
                
                let fileType = 'doc';
                if (file.type.startsWith('image/')) fileType = 'img';
                else if (file.type.startsWith('video/')) fileType = 'vid';
                
                let targetTextareaId = btn.getAttribute('data-target-textarea');
                if (targetTextareaId) {
                    let ta = document.getElementById(targetTextareaId);
                    if (ta) {
                        let token = fileType === 'img' ? `[IMG:${publicUrl}]` : `[MEDIA:${publicUrl}]`;
                        ta.value = ta.value + (ta.value.endsWith('\n') || ta.value === '' ? '' : '\n') + token;
                        // trigger input event to update preview
                        ta.dispatchEvent(new Event('input', { bubbles: true }));
                    }
                } else {
                    let row = btn.closest('.sop-step-row');
                    if (row) {
                        let urlInputs = Array.from(row.querySelectorAll('.m-url'));
                        let emptyInput = urlInputs.find(inp => !inp.value.trim());
                        
                        if (!emptyInput) {
                            if (typeof window.click_addAttachmentRow === 'function') {
                                window.click_addAttachmentRow(btn);
                                urlInputs = Array.from(row.querySelectorAll('.m-url'));
                                emptyInput = urlInputs[urlInputs.length - 1];
                            }
                        }
                        
                        if (emptyInput) {
                            emptyInput.value = publicUrl;
                            let mRow = emptyInput.closest('.media-row');
                            if (mRow) {
                                let typeSel = mRow.querySelector('.m-type');
                                if (typeSel) typeSel.value = fileType;
                            }
                        }
                    }
                }
            } catch (err) {
                sysLog("SOP Upload Error: " + err.message, true);
                alert("Upload failed: " + err.message);
            } finally {
                btn.innerHTML = originalText;
                btn.style.pointerEvents = 'auto';
                input.value = ''; 
            }
        };
        
        input.click();
    } catch (e) {
        sysLog("UI Error triggering direct upload: " + e.message, true);
    }
};


function extractSOPDataFromUI(containerId) {
    let steps = []; document.getElementById(containerId).querySelectorAll('.sop-step-row').forEach(row => { 
        let t = row.querySelector('.sop-text-rich'); 
        let attachments = [];
        row.querySelectorAll('.media-row').forEach(mr => {
            let typeSel = mr.querySelector('.m-type');
            let urlInp = mr.querySelector('.m-url');
            if (typeSel && urlInp) {
                attachments.push({type: typeSel.value, url: urlInp.value});
            }
        });
        if(t && t.innerHTML.trim()) { 
            steps.push({ text: t.innerHTML.trim(), attachments: attachments }); 
        } 
    }); 
    return steps;
}

async function saveMasterSOP() {
    const p = document.getElementById('sopMasterProductSelect').value;
    if(!p) return;

    await executeWithButtonAction('btnSaveMasterSOP', 'UPLOADING PROTOCOLS...', '💾 SAVED SUCCESSFULLY!', async () => {
        let steps = extractSOPDataFromUI('sopMasterEditorArea');
        let rawQa = document.getElementById('productionAdminQA')?.value || '';
        let qaLines = rawQa.trim() === '' ? [] : rawQa.split('\n').map(l=>l.trim());
        const payload = { qaChecks: qaLines, steps: steps };
        sopsDB[p] = payload;
        sysLog(`Saving Master SOP for ${p}`);
        setMasterStatus("Saving...", "mod-working");

        const {error} = await supabaseClient.from('production_sops').upsert({product_name: p, steps: payload}, {onConflict: 'product_name'});
        if(error) throw new Error(error.message);

        setMasterStatus("Saved!", "mod-success");
        setTimeout(()=>setMasterStatus("Ready.", "status-idle"), 2000);
        if(typeof currentWO !== 'undefined' && currentWO && currentWO.product_name === p) renderActiveWO(currentWO.wo_id);
    }).catch(e => {
        sysLog(e.message, true); setMasterStatus("Error", "mod-error");
    });
}
async function saveInlineSOP() {
    if(typeof currentWO === 'undefined' || !currentWO) return;

    await executeWithButtonAction('btnSaveInlineSOP', 'UPLOADING PROTOCOLS...', '💾 SAVED SUCCESSFULLY!', async () => {
        const p = currentWO.product_name;
        let steps = extractSOPDataFromUI('inlineSOPContainer');
        let existingQa = [];
        if (sopsDB[p] && typeof sopsDB[p] === 'object' && !Array.isArray(sopsDB[p])) existingQa = sopsDB[p].qaChecks || [];
        const payload = { qaChecks: existingQa, steps: steps };
        sopsDB[p] = payload;
        sysLog(`Saving Inline SOP for ${p}`);
        setMasterStatus("Saving...", "mod-working");

        const {error} = await supabaseClient.from('production_sops').upsert({product_name: p, steps: payload}, {onConflict: 'product_name'});
        if(error) throw new Error(error.message);

        setMasterStatus("Saved!", "mod-success");
        setTimeout(()=>setMasterStatus("Ready.", "status-idle"), 2000);
        toggleSOPLock();
    }).catch(e => {
        sysLog(e.message, true); setMasterStatus("Error", "mod-error");
    });
}

function openNewWOModal() {
    document.getElementById('woErrorBox').style.display = 'none';
    document.getElementById('woRoutingArea').style.display = 'none';
    document.getElementById('newWOQty').value = 1;
    let r = document.getElementById('newWOProductRetail'); if(r) r.value = '';
    let s = document.getElementById('newWOProductSub'); if(s) s.value = '';
    let p = document.getElementById('newWOProductPrint'); if(p) p.value = '';
    let lbl = document.getElementById('newWOLabel'); if(lbl) lbl.value = '';
    document.getElementById('newWOModal').style.display = 'flex';
    checkWORouting();
}

let multiBatchItems = [];

function openMultiBatchModal(mode = 'all') {
    multiBatchItems = [];
    document.getElementById('multiBatchQty').value = 1;
    let r = document.getElementById('multiBatchProductRetail'); if(r) r.value = '';
    let s = document.getElementById('multiBatchProductSub'); if(s) s.value = '';
    let p = document.getElementById('multiBatchProductPrint'); if(p) p.value = '';

    if(r) r.style.display = 'block';
    if(s) s.style.display = 'block';
    if(p) p.style.display = 'block';

    renderStagedBatchItems();
    document.getElementById('multiBatchOrderModal').style.display = 'flex';
}

function getMultiBatchProduct() {
    let r = document.getElementById('multiBatchProductRetail');
    let s = document.getElementById('multiBatchProductSub');
    let p = document.getElementById('multiBatchProductPrint');
    return (r && r.value) || (s && s.value) || (p && p.value) || '';
}

function getNewWOProduct() {
    let r = document.getElementById('newWOProductRetail');
    let s = document.getElementById('newWOProductSub');
    let p = document.getElementById('newWOProductPrint');
    return (r && r.value) || (s && s.value) || (p && p.value) || '';
}

function stageBatchItem() {
    try {
    const p = getMultiBatchProduct();
    const q = parseFloat(document.getElementById('multiBatchQty').value);
    if(!p || isNaN(q) || q <= 0) return alert("Select product and valid quantity.");

    let existing = multiBatchItems.find(i => i.p === p);
    if(existing) {
        existing.q += q;
    } else {
        multiBatchItems.push({p: p, q: q});
    }

    // Clear selections
    let mr = document.getElementById('multiBatchProductRetail'); if(mr) mr.value = '';
    let ms = document.getElementById('multiBatchProductSub'); if(ms) ms.value = '';
    let mp = document.getElementById('multiBatchProductPrint'); if(mp) mp.value = '';

    renderStagedBatchItems();
    } catch(e) { sysLog(e.message, true); }
}

function removeBatchItem(index) {
    multiBatchItems.splice(index, 1);
    renderStagedBatchItems();
}

function renderStagedBatchItems() {
    try {
    let list = document.getElementById('stagedBatchItemsList');
    if(multiBatchItems.length === 0) {
        list.innerHTML = window.safeHTML(
            '<li class="empty-state" style="list-style:none;">Cart is empty. Add products above.</li>'
        );
        return;
    }

    let h = '';
    multiBatchItems.forEach((item, index) => {
        let f = fmtKey(item.p); let name = f.nn ? f.nn : f.in;
        h += `<li style="display:flex; justify-content:space-between; align-items:center; background:var(--bg-panel); padding:10px 15px; border-radius:6px; border:1px solid var(--border-color);">
            <div style="font-weight:bold; color:var(--text-heading); font-size:14px;">${item.q}x <span style="color:#0ea5e9;">${name}</span></div>
            <button class="btn-red-muted btn-xs" data-click="click_removeBatchItem" data-index="${index}">✕</button>
        </li>`;
    });
    list.innerHTML = window.safeHTML(h);
    } catch(e) { sysLog(e.message, true); }
}

function checkWORouting() {
    try {
    const p = getNewWOProduct();
    const q = parseFloat(document.getElementById('newWOQty').value) || 0;
    const rArea = document.getElementById('woRoutingArea');
    const rList = document.getElementById('woRoutingList');
    if(!p || q <= 0) { rArea.style.display = 'none'; return; }

    let subsNeeded = {};
    function hunt(recipeName, q_mult, depth = 0) {
        (productsDB[recipeName] || []).forEach(part => {
            let k = String(part.item_key || part.di_item_id || part.name || "");
            let pq = (parseFloat(part.quantity || part.qty) || 1) * q_mult;
            if (k.startsWith('RECIPE:::')) {
                let subName = k.replace('RECIPE:::', '');
                let isSub = typeof isSubassemblyDB !== 'undefined' && isSubassemblyDB[subName];
                let is3DP = typeof productsDB !== 'undefined' && productsDB[subName] && productsDB[subName].is_3d_print;
                if(isSub || is3DP) {
                    if (!subsNeeded[subName]) {
                        subsNeeded[subName] = { req: 0, depth: depth };
                    }
                    subsNeeded[subName].req += pq;
                    hunt(subName, pq, depth + 1);
                }
            }
        });
    }
    hunt(p, q, 0);

    let keys = Object.keys(subsNeeded);
    if(keys.length === 0) {
        rList.innerHTML = window.safeHTML('');
        rArea.style.display = 'none';
        return;
    }
    rArea.style.display = 'block';
    let h = "";
    let openKeys = [];

    keys.forEach((k, i) => {
        let node = subsNeeded[k];
        let req = node.req; let curDepth = node.depth;
        let invKey = `RECIPE:::${k}`; let inv = inventoryDB[invKey] || {produced_qty:0, sold_qty:0, consumed_qty:0, scrap_qty:0, manual_adjustment:0};
        let c_prod = parseFloat(inv.production_consumed_qty)||0; let c_proto = parseFloat(inv.prototype_consumed_qty)||0; let pb = parseFloat(inv.prototype_produced_qty)||0;
        let onHand = (inv.produced_qty||0) - (inv.sold_qty||0) - c_prod - (inv.scrap_qty||0) + (inv.manual_adjustment||0) - Math.max(0, c_proto - pb);
        let autoPull = Math.min(req, Math.max(0, onHand)); let autoBuild = req - autoPull;

        let is3DPUI = typeof productsDB !== 'undefined' && productsDB[k] && productsDB[k].is_3d_print;
        let icon = is3DPUI ? '🖨️' : '⚙️';
        let safeK = k.replace(/\s+/g,'_').replace(/[^a-zA-Z0-9_]/g, '');

        let hasChildren = (i + 1 < keys.length && subsNeeded[keys[i+1]].depth > curDepth);

        // Close depth scopes if we went up the tree
        while (openKeys.length > 0 && subsNeeded[openKeys[openKeys.length - 1]].depth >= curDepth) {
            h += `</div>`;
            openKeys.pop();
        }

        let chevron = hasChildren ? `<span id="route_icon_${safeK}" style="display:inline-block; transition:transform 0.2s; transform:rotate(-90deg); margin-right:6px; font-size:10px; color:var(--text-muted);">▼</span>` : `<span style="display:inline-block; width:16px; margin-right:6px;"></span>`;
        let clickAttr = hasChildren ? `data-click="click_toggleRouteChildren" data-route="${safeK}" style="cursor:pointer; display:flex; flex-direction:column; flex:1; padding:4px 0;"` : `style="display:flex; flex-direction:column; flex:1; padding:4px 0;"`;

        let rowHtml = `<div class="route-row" data-subname="${k}">
                <div ${clickAttr}>
                    <strong style="color:var(--text-heading); font-size:13px; display:flex; align-items:center; user-select:none;">
                        ${chevron} ${icon} ${k}
                    </strong>
                    <span style="font-size:11px; color:var(--text-muted); margin-left:22px;">Need: ${req.toFixed(2)} | On Shelf: ${onHand.toFixed(2)}</span>
                </div>
                <div class="route-inputs" style="margin-left:15px;">
                    <div style="display:flex; flex-direction:column; align-items:center;">
                        <span class="route-label" style="color:#10b981;">Pull Shelf</span>
                        <input type="number" class="route-pull-input" id="route_pull_${safeK}" value="${autoPull.toFixed(2)}" min="0" max="${Math.max(0, onHand)}" step="any" oninput="balanceRoute('${safeK}', ${req}, 'pull', ${Math.max(0, onHand)})">
                    </div>
                    <div style="display:flex; flex-direction:column; align-items:center;">
                        <span class="route-label" style="color:#f59e0b;">Build Scratch</span>
                        <input type="number" class="route-build-input" id="route_build_${safeK}" value="${autoBuild.toFixed(2)}" min="0" max="${req}" step="any" oninput="balanceRoute('${safeK}', ${req}, 'build', ${Math.max(0, onHand)})">
                    </div>
                </div>
              </div>`;

        if (hasChildren) {
            h += rowHtml;
            h += `<div id="route_children_${safeK}" style="display:none; flex-direction:column; margin-left:11px; padding-left:11px; border-left:1px dashed var(--border-color); gap:0px;">`;
            openKeys.push(k);
        } else {
            h += rowHtml;
        }
    });

    while (openKeys.length > 0) {
        h += `</div>`;
        openKeys.pop();
    }

    rList.innerHTML = window.safeHTML(h);
    } catch(e) { sysLog(e.message, true); }
}

function balanceRoute(safeKey, total, changed, maxPull) {
    let pullEl = document.getElementById(`route_pull_${safeKey}`); let buildEl = document.getElementById(`route_build_${safeKey}`);
    if(changed === 'pull') {
        let val = parseFloat(pullEl.value) || 0;
        if(val > maxPull) { val = maxPull; pullEl.value = val; }
        if(val > total) { val = total; pullEl.value = val; }
        buildEl.value = (Math.max(0, total - val)).toFixed(2);
    } else {
        let val = parseFloat(buildEl.value) || 0;
        if(val > total) { val = total; buildEl.value = val; }
        let theoreticalPull = total - val;
        if(theoreticalPull > maxPull) {
            theoreticalPull = maxPull;
            val = total - maxPull;
            buildEl.value = val.toFixed(2);
        }
        pullEl.value = (Math.max(0, theoreticalPull)).toFixed(2);
    }
}

function getDirectMaterials(name, amount) {
    let res = {};
    (productsDB[name] || []).forEach(part => {
        let k = String(part.item_key || part.di_item_id || part.name); let q = (parseFloat(part.quantity || part.qty) || 1) * amount;

        let subName = k.replace('RECIPE:::', '');
        let is3DPrint = productsDB[subName] && productsDB[subName].is_3d_print;

        if(!k.startsWith('RECIPE:::') || is3DPrint) {
            res[k] = (res[k] || 0) + q;
        }
    });
    return res;
}

window.calculateExactWODeductions = function(wo) {
    let raws_production = {}; let raws_assembly = {}; let pulls = {}; let raws_total = {};
    let built_subs = {};
    function traverseBOM(recipeName, qty, isTopLevel) {
        (productsDB[recipeName] || []).forEach(part => {
            let k = String(part.item_key || part.di_item_id || part.name);
            let q = (parseFloat(part.quantity || part.qty) || 1) * qty;

            let subName = k.replace('RECIPE:::', '');
            let is3DPrint = productsDB[subName] && productsDB[subName].is_3d_print;

            if(!k.startsWith('RECIPE:::') || is3DPrint) {
                if (isTopLevel) {
                    raws_production[k] = (raws_production[k] || 0) + q;
                } else {
                    raws_assembly[k] = (raws_assembly[k] || 0) + q;
                }
                raws_total[k] = (raws_total[k] || 0) + q;
            } else {
                let pullQty = 0;
                let buildQty = q;

                // Allow dynamic override from the routing map for manually stated shelf pulls, regardless of structural depth
                if (wo.routing && wo.routing[subName]) {
                    pullQty = parseFloat(wo.routing[subName].pull || 0);
                    buildQty = parseFloat(wo.routing[subName].build || 0);
                }

                if (pullQty > 0) {
                    pulls[k] = (pulls[k] || 0) + pullQty;
                }

                if (buildQty > 0) {
                    built_subs[k] = (built_subs[k] || 0) + buildQty;
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
                    const subPrints = find3DPrintedComponents(subName, buildQty, routingMap);
                    for (let s in subPrints) {
                        prints[s] = (prints[s] || 0) + (parseFloat(subPrints[s]) || 0);
                    }
                }
            }
        } else {
            // LEGACY 3D PRINTED RAW MATERIAL (STOCKPILEZ ITEM)
            // catalogCache is async — fall back to productsDB if not yet populated
            const catalogEntry = (typeof catalogCache !== 'undefined') ? catalogCache[k] : null;
            const isLegacy3DPrint = (catalogEntry && catalogEntry.is_3d_print) ||
                                    (!catalogEntry && productsDB[k] && productsDB[k].is_3d_print);
            if (isLegacy3DPrint) {
                prints[k] = (prints[k] || 0) + q;
            }
        }
    });
    return prints;
}

function sortReportTable(th, n, isNumeric) {
    let table = th.closest('table');
    let tbody = table.querySelector('tbody');
    let rows = Array.from(tbody.querySelectorAll('tr'));
    if(rows.length === 0 || (rows.length === 1 && rows[0].innerText.includes('No '))) return; // empty table

    let isAsc = th.getAttribute('data-asc') !== 'true';
    th.setAttribute('data-asc', isAsc ? 'true' : 'false');

    table.querySelectorAll('th').forEach(h => {
        if(h !== th) h.removeAttribute('data-asc');
        h.innerHTML = window.safeHTML(h.innerHTML.replace(' ▲', '').replace(' ▼', '').replace(' ↕', ' ↕'));
        if(!h.innerHTML.includes('↕')) h.innerHTML += ' ↕';
    });
    th.innerHTML = window.safeHTML(th.innerHTML.replace(' ↕', '') + (isAsc ? ' ▲' : ' ▼'));

    rows.sort((a, b) => {
        let textA = a.querySelectorAll('td')[n].innerText;
        let textB = b.querySelectorAll('td')[n].innerText;
        if(!isNumeric) {
            return isAsc ? textA.localeCompare(textB) : textB.localeCompare(textA);
        }
        let valA = parseFloat(textA.replace(/[^0-9.-]/g, ''))||0;
        let valB = parseFloat(textB.replace(/[^0-9.-]/g, ''))||0;
        return isAsc ? valA - valB : valB - valA;
    });

    const frag = document.createDocumentFragment();
    rows.forEach(r => frag.appendChild(r));
    tbody.appendChild(frag);
}

function generateMultiBatchOrderReport() {
    try {
    if(multiBatchItems.length === 0) return alert("Cart is empty.");

    let exactDeductions = { raws: {}, pulls: {}, built_subs: {} };

    // Aggregate deductions for every staged item assuming 100% build strategy for sub-assemblies
    multiBatchItems.forEach(item => {
        let tempWO = { product_name: item.p, qty: item.q, routing: {} };
        let itemDeductions = calculateExactWODeductions(tempWO);

        Object.keys(itemDeductions.raws).forEach(k => {
            exactDeductions.raws[k] = (exactDeductions.raws[k] || 0) + itemDeductions.raws[k];
        });
        Object.keys(itemDeductions.pulls).forEach(k => {
            exactDeductions.pulls[k] = (exactDeductions.pulls[k] || 0) + itemDeductions.pulls[k];
        });
        Object.keys(itemDeductions.built_subs).forEach(k => {
            exactDeductions.built_subs[k] = (exactDeductions.built_subs[k] || 0) + itemDeductions.built_subs[k];
        });
    });

    let h = '';

    // Calculate critical procurement first
    let orderList = [];
    Object.keys(exactDeductions.raws).forEach(k => {
        let req = exactDeductions.raws[k];
        let c = catalogCache[k] || {totalQty: 0, is_3d_print: false};
        let i = inventoryDB[k] || {consumed_qty: 0, manual_adjustment: 0, scrap_qty: 0};
        let onHand = c.totalQty - i.consumed_qty - i.scrap_qty + i.manual_adjustment;
        let diff = onHand - req;
        if(diff < 0) {
            let f = fmtKey(k); let name = f.nn ? f.nn : f.in;
            orderList.push({ name: name, qty: Math.abs(diff) });
        }
    });

    if(orderList.length > 0) {
        h += `
            <div style="background:var(--bg-negative); padding:15px; border-radius:8px; border:1px solid #ef4444; margin-bottom:20px;">
            <h3 style="color:#ef4444; border-bottom:1px solid rgba(239,68,68,0.3); padding-bottom:10px; margin-top:0;">🚨 Critical Procurement (Must Order)</h3>
            <table style="width:100%; border-collapse:collapse; font-size:14px;">
                <thead>
                    <tr style="border-bottom:2px solid rgba(239,68,68,0.3); text-align:left;">
                        <th style="padding:8px; cursor:pointer; user-select:none;" data-click="click_sortReportTable" data-col="0" data-desc="false">Material ↕</th>
                        <th style="padding:8px; text-align:right; cursor:pointer; user-select:none;" data-click="click_sortReportTable" data-col="1" data-desc="true">Quantity To Order ↕</th>
                    </tr>
                </thead>
                <tbody>
        `;
        orderList.forEach(item => {
            h += `<tr style="border-bottom:1px solid var(--border-color);">
                <td style="padding:8px; font-weight:bold; color:var(--text-heading);">${item.name}</td>
                <td style="padding:8px; text-align:right; color:#ef4444; font-weight:bold;">${item.qty.toFixed(2)}</td>
            </tr>`;
        });
        h += `</tbody></table></div>`;
    }

    h += `
        <h3 style="color:var(--primary-color); border-bottom:1px solid var(--border-color); padding-bottom:10px; margin-top:0;">Raw Materials Demand</h3>
        <table style="width:100%; border-collapse:collapse; margin-bottom:20px; font-size:14px;">
            <thead>
                <tr style="border-bottom:2px solid var(--border-color); text-align:left;">
                    <th style="padding:8px; cursor:pointer; user-select:none;" data-click="click_sortReportTable" data-col="0" data-desc="false">Material ↕</th>
                    <th style="padding:8px; text-align:right; cursor:pointer; user-select:none;" data-click="click_sortReportTable" data-col="1" data-desc="true">Required ↕</th>
                    <th style="padding:8px; text-align:right; cursor:pointer; user-select:none;" data-click="click_sortReportTable" data-col="2" data-desc="true">In Stock ↕</th>
                    <th style="padding:8px; text-align:right; cursor:pointer; user-select:none;" data-click="click_sortReportTable" data-col="3" data-desc="true">Balance ↕</th>
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

    if(!hasRaws) h += `<tr><td colspan="4" class="empty-state" style="border:none;">No raw materials required.</td></tr>`;
    h += `</tbody></table>`;

    h += `
        <h3 style="color:#FF8C00; border-bottom:1px solid var(--border-color); padding-bottom:10px;">Sub-Assemblies To Pull</h3>
        <table style="width:100%; border-collapse:collapse; margin-bottom:20px; font-size:14px;">
            <thead>
                <tr style="border-bottom:2px solid var(--border-color); text-align:left;">
                    <th style="padding:8px; cursor:pointer; user-select:none;" data-click="click_sortReportTable" data-col="0" data-desc="false">Sub-Assembly ↕</th>
                    <th style="padding:8px; text-align:right; cursor:pointer; user-select:none;" data-click="click_sortReportTable" data-col="1" data-desc="true">Pull Qty ↕</th>
                    <th style="padding:8px; text-align:right; cursor:pointer; user-select:none;" data-click="click_sortReportTable" data-col="2" data-desc="true">In Stock ↕</th>
                    <th style="padding:8px; text-align:right; cursor:pointer; user-select:none;" data-click="click_sortReportTable" data-col="3" data-desc="true">Balance ↕</th>
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

    h += `
        <h3 style="color:var(--primary-color); border-bottom:1px solid var(--border-color); padding-bottom:10px;">Sub-Assemblies To Build (Production Targets)</h3>
        <table style="width:100%; border-collapse:collapse; margin-bottom:20px; font-size:14px;">
            <thead>
                <tr style="border-bottom:2px solid var(--border-color); text-align:left;">
                    <th style="padding:8px; cursor:pointer; user-select:none;" data-click="click_sortReportTable" data-col="0" data-desc="false">Sub-Assembly ↕</th>
                    <th style="padding:8px; text-align:right; cursor:pointer; user-select:none;" data-click="click_sortReportTable" data-col="1" data-desc="true">Target Qty ↕</th>
                    <th style="padding:8px; text-align:right; cursor:pointer; user-select:none;" data-click="click_sortReportTable" data-col="2" data-desc="true">Current Stock ↕</th>
                    <th style="padding:8px; text-align:right; cursor:pointer; user-select:none;" data-click="click_sortReportTable" data-col="3" data-desc="true">Estimated Total ↕</th>
                </tr>
            </thead>
            <tbody>
    `;

    let hasBuilds = false;
    Object.keys(exactDeductions.built_subs).forEach(k => {
        hasBuilds = true;
        let req = exactDeductions.built_subs[k];
        let i = inventoryDB[k] || {produced_qty:0, sold_qty:0, consumed_qty:0, prototype_produced_qty:0, prototype_consumed_qty:0, scrap_qty:0, manual_adjustment:0};
        let b = parseFloat(i.produced_qty) || 0; let pb = parseFloat(i.prototype_produced_qty) || 0; let sold = parseFloat(i.sold_qty) || 0; let c_prod = parseFloat(i.production_consumed_qty) || 0; let c_proto = parseFloat(i.prototype_consumed_qty) || 0; let scrap = parseFloat(i.scrap_qty) || 0; let adj = parseFloat(i.manual_adjustment) || 0;
        let onHand = b - sold - c_prod - scrap + adj - Math.max(0, c_proto - pb);
        let estTotal = onHand + req;

        let name = k.replace('RECIPE:::', '');

        h += `<tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
            <td style="padding:8px; font-weight:bold; color:var(--text-heading);">${name}</td>
            <td style="padding:8px; text-align:right; color:#3b82f6; font-weight:bold;">${req.toFixed(2)}</td>
            <td style="padding:8px; text-align:right; color:var(--text-main);">${onHand.toFixed(2)}</td>
            <td style="padding:8px; text-align:right; font-weight:bold; color:#10b981;">+${estTotal.toFixed(2)}</td>
        </tr>`;
    });

    if(!hasBuilds) h += `<tr><td colspan="4" style="text-align:center; padding:10px; color:var(--text-muted);">No sub-assemblies built.</td></tr>`;
    h += `</tbody></table>`;

    document.getElementById('batchOrderReportContent').innerHTML = window.safeHTML(h);
    document.getElementById('multiBatchOrderModal').style.display = 'none';
    document.getElementById('batchOrderReportModal').style.display = 'flex';
    } catch(e) { sysLog(e.message, true); }
}

function printBatchOrderReport() {
    const printContent = document.getElementById('batchOrderReportContent').innerHTML;
    const printWindow = window.open('', '', 'height=600,width=800');
    // Ensure styles map to printable black/white/red/green versions for paper
    printWindow.document.write(`<html><head><title>Batch Order Projection</title><style>body{font-family:sans-serif; padding:20px; color:#000;} table{width:100%; border-collapse:collapse; margin-bottom:20px;} th,td{border-bottom:1px solid #ccc; padding:8px; text-align:left;} th.right, td.right{text-align:right;} h3{border-bottom:2px solid #000; padding-bottom:5px; margin-top:20px;}</style></head><body><h1>📦 Batch Order Projection</h1>${printContent.replace(/color:#ef4444/g, 'color:red').replace(/color:#10b981/g, 'color:green').replace(/color:var\(--text-[^)]+\)/g, 'color:black').replace(/ ▲| ▼| ↕/g, '')}</body></html>`);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); }, 250);
}

async function validateAndCreateWO() {
    await executeWithButtonAction('btnSpawnWO', 'SPAWNING...', '✅ CREATED!', async () => {
        const p = getNewWOProduct(); const q = parseFloat(document.getElementById('newWOQty').value); if(!p || isNaN(q) || q <= 0) return alert("Select product and quantity.");
        const label = document.getElementById('newWOLabel')?.value.trim() || null;

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
            let cleanK = k.replace('RECIPE:::', '');
            let is3DPrint = productsDB[cleanK] && productsDB[cleanK].is_3d_print;

            let req = exactDeductions.raws[k];
            let c = catalogCache[k] || {totalQty: 0, is_3d_print: false};
            let i = inventoryDB[k] || {consumed_qty: 0, manual_adjustment: 0, scrap_qty: 0};

            let onHand = c.totalQty - i.consumed_qty - i.scrap_qty + i.manual_adjustment;

            if (is3DPrint) {
                let FGI = inventoryDB[k] || {produced_qty:0, sold_qty:0, consumed_qty:0, scrap_qty:0, manual_adjustment:0};
                let c_prod = parseFloat(FGI.production_consumed_qty)||0; let c_proto = parseFloat(FGI.prototype_consumed_qty)||0; let pb = parseFloat(FGI.prototype_produced_qty)||0;
                onHand = (FGI.produced_qty||0) - (FGI.sold_qty||0) - c_prod - (FGI.scrap_qty||0) + (FGI.manual_adjustment||0) - Math.max(0, c_proto - pb);
            }

            if(req > onHand) {
                if (!is3DPrint) {
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

        if(shortfalls.length > 0) { document.getElementById('woShortfallList').innerHTML = window.safeHTML(shortfalls.join('')); document.getElementById('woErrorBox').style.display = 'block'; return; }

        let batchType = document.getElementById('batchTypeSelect') ? document.getElementById('batchTypeSelect').value : 'Production';
        let woId = "WO-" + Date.now().toString().slice(-6);
        let wo = { wo_id: woId, product_name: p, qty: q, label: label, status: 'Queued', wip_state: { batch_type: batchType }, routing: routingMap };
        sysLog(`Creating Work Order ${woId}`); setMasterStatus("Creating WO...", "mod-working");

        const {error} = await supabaseClient.from('work_orders').insert({
            wo_id: wo.wo_id, product_name: wo.product_name, qty: wo.qty, label: wo.label, status: wo.status,
            wip_state: wo.wip_state, routing: wo.routing
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

            let amountToPrint = totalNeeded;

            // Strictly deploy print jobs based exclusively on the routing map calculations (Pulls vs Builds), eliminating rogue autonomous logic out of sync with Batchez.
            if (amountToPrint > 0) {
                if (typeof addPrintJob === 'function') {
                    printPromises.push(addPrintJob(prefix + part, amountToPrint, woId, label || null));
                }
            }
        });

        if (printPromises.length > 0) {
            sysLog(`Spawning ${printPromises.length} 3D print jobs for ${woId}...`);
            await Promise.all(printPromises);
        }

        workOrdersDB.unshift(wo); document.getElementById('newWOModal').style.display = 'none'; setMasterStatus("Created!", "mod-success"); setTimeout(()=>setMasterStatus("Ready.", "status-idle"), 2000); currentWO = wo; renderWOList(); saveWOOrderPrefs();
    }).catch(e => { sysLog(e.message, true); setMasterStatus("Error", "mod-error"); });
}

let woDraggedIndex = null;

function renderWOList() {
    try {
        const ui = document.getElementById('woListUI'); ui.innerHTML = window.safeHTML("");

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
        if(activeCount === 0) { ui.innerHTML = window.safeHTML(
            "<li style='cursor:default; background:transparent; border:none;'>No active Work Orders.</li>"
        ); document.getElementById('woMainArea').style.display = 'none'; return; }

        let woListHtml = [];
        workOrdersDB.forEach((wo, index) => {
            if (wo.status === 'Archived') return;
            if(typeof wo.wip_state === 'string') wo.wip_state = JSON.parse(wo.wip_state || '{}');
            if(typeof wo.routing === 'string') wo.routing = JSON.parse(wo.routing || '{}');
            let sel = (currentWO && currentWO.wo_id === wo.wo_id) ? 'selected' : '';
            let dot = wo.status === 'Queued' ? '🟡' : (wo.status === 'Completed' ? '🟢' : (wo.status === 'Picking' ? '🔵' : '🟠'));

            woListHtml.push(`<li class="${sel}"
                draggable="true"
                ondragstart="woDragStart(event, ${index})"
                ondragover="woDragOver(event)"
                ondrop="woDrop(event, ${index})"
                ondragend="woDragEnd(event)"
                data-click="click_selectWO" data-id="${wo.wo_id}"
                style="display:flex; justify-content:space-between; align-items:center; cursor:grab; padding: 10px; border-bottom: 1px solid var(--border-color); margin-bottom: 5px; border-radius: 4px;">
                <div style="display:flex; flex-direction:column; gap:2px; min-width:0;">
                    <span style="font-weight:700; font-size:14px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">☰ ${dot} ${wo.wo_id}: ${wo.product_name}</span>
                    ${wo.label ? `<span style="font-size:11px; color:#f59e0b; font-style:italic; padding-left:22px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${wo.label}</span>` : ''}
                </div>
                <span style="font-weight:900; font-family:monospace; flex-shrink:0;">x${wo.qty}</span>
            </li>`);
        });
        ui.innerHTML = window.safeHTML(woListHtml.join(''));
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

async function toggleWIPCheckbox(chk, key) { try { if(!currentWO) return; let isChecked = chk.checked; if(isChecked) chk.parentElement.classList.add('done'); else chk.parentElement.classList.remove('done'); if(!currentWO.wip_state) currentWO.wip_state = {}; currentWO.wip_state[key] = isChecked; await supabaseClient.from('work_orders').update({ wip_state: currentWO.wip_state }).eq('wo_id', currentWO.wo_id); } catch(e) { sysLog("Failed to save checkbox state.", true); } }
async function checkAllInGroup(grpId) { try { if(!currentWO) return; let chks = document.querySelectorAll(`.${grpId}-chk`); let changed = false; if(!currentWO.wip_state) currentWO.wip_state = {}; chks.forEach(chk => { if(!chk.checked) { chk.checked = true; chk.parentElement.classList.add('done'); let k = chk.getAttribute('data-key'); currentWO.wip_state[k] = true; changed = true; } }); if(changed) { sysLog(`Checked group in WO ${currentWO.wo_id}`); await supabaseClient.from('work_orders').update({ wip_state: currentWO.wip_state }).eq('wo_id', currentWO.wo_id); } } catch(e) { sysLog("Failed to save group check.", true); } }
function toggleSOPLock() { isSOPLocked = !isSOPLocked; const btn = document.getElementById('sopLockBtn'); if(btn) btn.innerText = isSOPLocked ? '🔒' : '🔓'; if(currentWO) renderActiveWO(currentWO.wo_id); }

function formatWOTime(ms) {
    if (!ms || ms < 0) return "0m 0s";
    let totalSec = Math.floor(ms / 1000);
    let m = Math.floor(totalSec / 60);
    let s = totalSec % 60;
    let h = Math.floor(m / 60);
    m = m % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    return `${m}m ${s}s`;
}

window.togglePipelinePause = async function() {
    if (!currentWO || !currentWO.wip_state) return;
    let w = currentWO.wip_state;
    if (!w.active_stage) return;
    
    if (w.is_paused) {
        // Resume
        w.stage_start_time = Date.now();
        w.is_paused = false;
    } else {
        // Pause
        if (w.stage_start_time) {
            let stageKey = w.active_stage === 'Picking' ? 'elapsed_picking' : 'elapsed_production';
            w[stageKey] = (w[stageKey] || 0) + (Date.now() - w.stage_start_time);
        }
        w.stage_start_time = null;
        w.is_paused = true;
    }
    
    try {
        await supabaseClient.from('work_orders').update({ wip_state: w }).eq('wo_id', currentWO.wo_id);
        renderActiveWO(currentWO.wo_id);
    } catch(e) {
        sysLog("Failed to pause/resume pipeline timer.", true);
    }
};

async function editWOQty(id) {
    let wo = workOrdersDB.find(w => w.wo_id === id);
    if (!wo) return;
    if ((wo.wip_state && wo.wip_state.materials_pulled) || wo.status === 'Completed') return alert("Cannot edit quantity after materials have been physically pulled from shelf stock!");

    let ans = prompt(`Current Target Quantity: ${wo.qty}\n\nEnter the new corrected quantity for this Work Order:`, wo.qty);
    if (ans === null) return;
    let newQty = parseFloat(ans);
    if (isNaN(newQty) || newQty <= 0) return alert("Invalid quantity limit.");
    if (newQty === wo.qty) return;

    if (!confirm(`Are you sure you want to adjust the Work Order yield from ${wo.qty} to ${newQty}?\n\nThis will proportionally scale all Sub-Assembly routing allocations attached to this batch.`)) return;

    setMasterStatus("Updating Quantity...", "mod-working");
    let oldQty = parseFloat(wo.qty);
    let ratio = newQty / oldQty;

    let clonedRouting = JSON.parse(JSON.stringify(wo.routing || {}));
    Object.keys(clonedRouting).forEach(sub => {
        clonedRouting[sub].pull = parseFloat((parseFloat(clonedRouting[sub].pull || 0) * ratio).toFixed(4));
        clonedRouting[sub].build = parseFloat((parseFloat(clonedRouting[sub].build || 0) * ratio).toFixed(4));
    });

    try {
        const { error } = await supabaseClient.from('work_orders').update({
            qty: newQty,
            routing: clonedRouting
        }).eq('wo_id', id);

        if (error) throw error;

        wo.qty = newQty;
        wo.routing = clonedRouting;
        sysLog(`Adjusted WO ${wo.wo_id} quantity ${oldQty} -> ${newQty}`);
        setMasterStatus("Quantity Updated!", "mod-success");
        setTimeout(() => setMasterStatus("Ready.", "status-idle"), 2000);
        renderActiveWO(id);
        renderWOList();
    } catch(e) {
        sysLog(e.message, true);
        setMasterStatus("Error", "mod-error");
    }
}

function renderActiveWO(id) {
    try {
        let wo = workOrdersDB.find(w => w.wo_id === id); if(!wo) return;
        document.getElementById('woMainArea').style.display = 'flex';
        let isEditableQty = !(wo.wip_state && wo.wip_state.materials_pulled) && wo.status !== 'Completed';
        let qtyDisplay = isEditableQty ? `<span data-click="click_editWOQty" data-id="${wo.wo_id}" title="Edit WO Yield Target" style="cursor:pointer; display:inline-flex; align-items:center; gap:6px; background:rgba(14,165,233,0.15); border:1px dashed #0ea5e9; padding:2px 10px; border-radius:6px; color:#0ea5e9; transition:all 0.2s; position:relative; top:-2px;" onmouseover="this.style.background='rgba(14,165,233,0.3)'" onmouseout="this.style.background='rgba(14,165,233,0.15)'">${wo.qty} ✏️</span>` : wo.qty;
        document.getElementById('woTitle').innerHTML = window.safeHTML(
            (wo.label ? `[${wo.label}] ` : '') + `${wo.wo_id}: ${wo.product_name} - [ ${qtyDisplay} UNITS ]`
        );
        document.getElementById('woQtyTarget').innerText = wo.qty;
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

        document.getElementById('pipe-Queued').innerHTML = window.safeHTML('1. Queued');
        document.getElementById('pipe-Picking').innerHTML = window.safeHTML('2. Start Picking Parts');
        document.getElementById('pipe-Production').innerHTML = window.safeHTML('3. Send to Production');
        document.getElementById('pipe-Completed').innerHTML = window.safeHTML('4. Finalize Batch');

        let wip = wo.wip_state || {};
        const lockBtn = document.getElementById('sopLockBtn'); if(lockBtn) lockBtn.innerText = isSOPLocked ? '🔒' : '🔓';

        if (!window._pipelineTimerInterval) {
            window._pipelineTimerInterval = setInterval(() => {
                let span = document.getElementById('pipelineTimerSpan');
                if (span && span.getAttribute('data-running') === 'true') {
                    let start = parseInt(span.getAttribute('data-start'));
                    let baseline = parseInt(span.getAttribute('data-baseline'));
                    if (!isNaN(start) && !isNaN(baseline)) {
                        let elapsed = baseline + (Date.now() - start);
                        span.innerText = `Running (${formatWOTime(elapsed)})`;
                    }
                }
            }, 1000);
        }

        let timerUI = "";
        if (wip.active_stage) {
            let baseline = (wip.active_stage === 'Picking' ? (wip.elapsed_picking||0) : (wip.elapsed_production||0));
            let isRunning = wip.stage_start_time && !wip.is_paused;
            let elapsedSoFar = baseline;
            if (isRunning) elapsedSoFar += (Date.now() - wip.stage_start_time);
            let timeStr = formatWOTime(elapsedSoFar);
            let btnAction = wip.is_paused ? '▶️ Resume' : '⏸️ Pause';
            timerUI = `<div style="margin-left:auto; display:flex; align-items:center; gap:8px;">
                <span id="pipelineTimerSpan" data-running="${isRunning}" data-baseline="${baseline}" data-start="${wip.stage_start_time || ''}" style="font-size:11px; font-family:monospace; color:${wip.is_paused ? 'var(--text-muted)' : '#10b981'};">${wip.is_paused ? 'Paused' : 'Running'} (${timeStr})</span>
                <button data-click="togglePipelinePause" class="btn-slate" style="padding:2px 8px; font-size:10px;">${btnAction}</button>
            </div>`;
        }

        if (wo.status === 'Picking' || wo.status === 'In Production' || wo.status === 'Completed') {
            document.getElementById('pipe-Queued').style.pointerEvents = 'none';
            document.getElementById('pipe-Queued').style.opacity = '0.6';
            document.getElementById('pipe-Queued').innerHTML = window.safeHTML('🔒 1. Queued');
        }
        if (wo.status === 'In Production' || wo.status === 'Completed' || (wo.wip_state && wo.wip_state.materials_pulled)) {
            document.getElementById('pipe-Picking').style.pointerEvents = 'none';
            document.getElementById('pipe-Picking').style.opacity = '0.6';
            document.getElementById('pipe-Picking').innerHTML = window.safeHTML('🔒 2. Parts Picked & Deducted');
        }
        if (wo.status === 'Completed') {
            document.getElementById('pipe-Production').style.pointerEvents = 'none';
            document.getElementById('pipe-Production').style.opacity = '0.6';
            document.getElementById('pipe-Production').innerHTML = window.safeHTML('🔒 3. Send to Production');
            document.getElementById('pipe-Completed').style.pointerEvents = 'none';
            document.getElementById('pipe-Completed').style.opacity = '0.6';
            document.getElementById('pipe-Completed').innerHTML = window.safeHTML('🔒 4. Finalize Batch');
        }

        if(wo.status === 'Queued') { document.getElementById('pipe-Queued').classList.add('active'); document.getElementById('sect-Queued').classList.add('active'); }
        else if(wo.status === 'Picking') {
            document.getElementById('pipe-Picking').classList.add('active'); document.getElementById('sect-Picking').classList.add('active');
            if(timerUI) document.getElementById('pipe-Picking').innerHTML = window.safeHTML(`<div style="display:flex; align-items:center; width:100%;">2. Start Picking Parts ${timerUI}</div>`);
            let pList = document.getElementById('woPickList'); let html = `<div class="kitting-board">`; let chkIdx = 0; let grpCounter = 0;
            let directRaws = getDirectMaterials(wo.product_name, wo.qty);
            if(Object.keys(directRaws).length > 0) {
                let currentGrpId = `pickgrp_${grpCounter++}`;

                let isTopSub = typeof isSubassemblyDB !== 'undefined' && isSubassemblyDB[wo.product_name];
                let isTop3D = typeof productsDB !== 'undefined' && productsDB[wo.product_name] && productsDB[wo.product_name].is_3d_print;
                let topLevelTitle = isTop3D ? `🟠 Build: 🖨️ ${wo.product_name} (x${wo.qty})` : (isTopSub ? `🟠 Build: ⚙️ ${wo.product_name} (x${wo.qty})` : `📦 Direct Raw Materials`);

                html += `<div class="kitting-card"><h4>${topLevelTitle} <button class="btn-blue btn-check-all" data-grp-id="${currentGrpId}" style="float:right; width:auto; padding:2px 8px; font-size:10px;">✓ All</button></h4>`;
                Object.keys(directRaws).forEach(k => {
                    let req = directRaws[k]; let c = catalogCache[k] || {}; let isRecipe = k.startsWith('RECIPE:::'); let f = fmtKey(k); let cleanName = isRecipe ? k.replace('RECIPE:::', '') : (f.nn ? f.nn : (c.itemName || f.in));
                    let isPart3D = isRecipe && productsDB[cleanName] && productsDB[cleanName].is_3d_print;
                    let emojiPrefix = isPart3D ? '🖨️' : (isRecipe ? '⚙️' : '');
                    let name = `${emojiPrefix} ${cleanName}`.trim();
                    let displaySpec = isRecipe ? "" : (c.spec === "(Mixed Specs)" ? " (Mixed Specs)" : (c.spec ? `${c.spec}` : ""));

                    let chkKey = `pick_${chkIdx++}`; let isDone = wip[chkKey] ? 'checked' : ''; let doneCls = wip[chkKey] ? 'done' : '';
                    html += `<div class="checklist-item ${doneCls}" style="padding: 8px 10px;"><input type="checkbox" class="${currentGrpId}-chk wip-checkbox" data-key="${chkKey}" ${isDone}> <div class="chk-text" style="font-size:13px; flex-grow:1;"><strong>${req.toFixed(2)}x</strong> ${name} <div style="color:var(--text-muted); font-size:10px;">${displaySpec}</div></div></div>`;
                });
                html += `</div>`;
            }

            let exactDeds = calculateExactWODeductions(wo);
            let shelfPulls = [];
            Object.keys(exactDeds.pulls).forEach(k => {
                let cleanName = k.replace('RECIPE:::', '');
                let isPart3D = productsDB[cleanName] && productsDB[cleanName].is_3d_print;
                let emojiPrefix = isPart3D ? '🖨️' : '⚙️';
                shelfPulls.push({name: `${emojiPrefix} ${cleanName}`, q: exactDeds.pulls[k]});
            });
            if(shelfPulls.length > 0) {
                let currentGrpId = `pickgrp_${grpCounter++}`;
                html += `<div class="kitting-card route-card-pull"><h4>🟢 Pull Pre-Built from Shelf <button class="btn-blue btn-check-all" data-grp-id="${currentGrpId}" style="float:right; width:auto; padding:2px 8px; font-size:10px;">✓ All</button></h4>`;
                shelfPulls.forEach(sub => {
                    let chkKey = `pick_${chkIdx++}`; let isDone = wip[chkKey] ? 'checked' : ''; let doneCls = wip[chkKey] ? 'done' : '';
                    html += `<div class="checklist-item ${doneCls}" style="padding: 8px 10px;"><input type="checkbox" class="${currentGrpId}-chk wip-checkbox" data-key="${chkKey}" ${isDone}> <div class="chk-text" style="font-size:13px; color:#15803d; flex-grow:1;"><strong>${sub.q.toFixed(2)}x</strong> ${sub.name}</div></div>`;
                });
                html += `</div>`;
            }

            if(exactDeds.built_subs) {
                Object.keys(exactDeds.built_subs).forEach(subK => {
                    let qty = exactDeds.built_subs[subK];
                    if(qty > 0) {
                        let cleanSubName = subK.replace('RECIPE:::', '');
                        let isTop3D = productsDB[cleanSubName] && productsDB[cleanSubName].is_3d_print;
                        let titleEmoji = isTop3D ? '🖨️' : '⚙️';

                        let subDirect = getDirectMaterials(cleanSubName, qty);
                        if(Object.keys(subDirect).length > 0) {
                            let currentGrpId = `pickgrp_${grpCounter++}`;
                            html += `<div class="kitting-card route-card-build"><h4>🟠 Build: ${titleEmoji} ${cleanSubName} (x${qty}) <button class="btn-blue btn-check-all" data-grp-id="${currentGrpId}" style="float:right; width:auto; padding:2px 8px; font-size:10px;">✓ All</button></h4>`;
                            Object.keys(subDirect).forEach(k => {
                                let req = subDirect[k]; let c = catalogCache[k] || {}; let isRecipe = k.startsWith('RECIPE:::'); let f = fmtKey(k); let cleanName = isRecipe ? k.replace('RECIPE:::', '') : (f.nn ? f.nn : (c.itemName || f.in));
                                let isPart3D = isRecipe && productsDB[cleanName] && productsDB[cleanName].is_3d_print;
                                let emojiPrefix = isPart3D ? '🖨️' : (isRecipe ? '⚙️' : '');
                                let name = `${emojiPrefix} ${cleanName}`.trim();
                                let displaySpec = isRecipe ? "" : (c.spec === "(Mixed Specs)" ? " (Mixed Specs)" : (c.spec ? `${c.spec}` : ""));

                                let chkKey = `pick_${chkIdx++}`; let isDone = wip[chkKey] ? 'checked' : ''; let doneCls = wip[chkKey] ? 'done' : '';
                                html += `<div class="checklist-item ${doneCls}" style="padding: 8px 10px;"><input type="checkbox" class="${currentGrpId}-chk wip-checkbox" data-key="${chkKey}" ${isDone}> <div class="chk-text" style="font-size:13px; flex-grow:1;"><strong>${req.toFixed(2)}x</strong> ${name} <div style="color:var(--text-muted); font-size:10px;">${displaySpec}</div></div></div>`;
                            });
                            html += `</div>`;
                        }
                    }
                });
            }
            pList.innerHTML = window.safeHTML(html + `</div>`);
            pList.querySelectorAll('.btn-check-all').forEach(btn => {
                let grpId = btn.getAttribute('data-grp-id');
                btn.addEventListener('click', (e) => { e.stopPropagation(); checkAllInGroup(grpId); });
            });
            pList.querySelectorAll('.wip-checkbox').forEach(chk => {
                let key = chk.getAttribute('data-key');
                chk.addEventListener('change', (e) => { toggleWIPCheckbox(chk, key); });
            });
        }
        else if(wo.status === 'In Production') {
            document.getElementById('pipe-Production').classList.add('active'); document.getElementById('sect-Production').classList.add('active');
            if(timerUI) document.getElementById('pipe-Production').innerHTML = window.safeHTML(`<div style="display:flex; align-items:center; width:100%;">3. Send to Production ${timerUI}</div>`);

            let sList = document.getElementById('woSOPList'); sList.innerHTML = window.safeHTML(""); let saveContainer = document.getElementById('inlineSaveContainer');

                            let sopGroups = [];

                // Fetch Sub-Assembly SOPs
                if(wo.routing) {
                    Object.keys(wo.routing).forEach(sub => {
                        if(wo.routing[sub].build > 0) {
                            let subPayload = sopsDB[sub];
                            let subSteps = []; let subQa = [];
                            if (subPayload) {
                                if (Array.isArray(subPayload)) subSteps = subPayload;
                                else if (typeof subPayload === 'object') { subSteps = subPayload.steps || []; subQa = subPayload.qaChecks || []; }
                            }
                            let is3D = typeof productsDB !== 'undefined' && productsDB[sub] && productsDB[sub].is_3d_print;
                            let emoji = is3D ? '🖨️' : '⚙️';
                            let desc = is3D ? '3D Print' : 'Build Sub-Assembly';

                            sopGroups.push({
                                id: encodeURIComponent(sub.replace(/\s+/g,'_')),
                                rawName: sub,
                                title: `${emoji} ${desc}: ${sub} (Quantity: ${wo.routing[sub].build})`,
                                qa: subQa,
                                steps: subSteps
                            });
                        }
                    });
                }

                // Fetch Main Assembly SOPs
                let mainPayload = sopsDB[wo.product_name];
                let mainSteps = []; let mainQa = [];
                if (mainPayload) {
                    if (Array.isArray(mainPayload)) mainSteps = mainPayload;
                    else if (typeof mainPayload === 'object') { mainSteps = mainPayload.steps || []; mainQa = mainPayload.qaChecks || []; }
                }
                sopGroups.push({
                    id: "main_assembly",
                    rawName: wo.product_name,
                    title: `📦 Final Assembly: ${wo.product_name}`,
                    qa: mainQa,
                    steps: mainSteps
                });

                // Sort Groups based on saved localStorage order
                let savedSort = [];
                try { savedSort = JSON.parse(localStorage.getItem('batchezSopSort_' + wo.product_name)) || []; } catch(e){ console.error(e); }

                if (savedSort.length > 0) {
                    sopGroups.sort((a,b) => {
                        let idxA = savedSort.indexOf(a.id);
                        let idxB = savedSort.indexOf(b.id);
                        if(idxA === -1) idxA = 999;
                        if(idxB === -1) idxB = 999;
                        return idxA - idxB;
                    });
                }

                let htmlOut = '';
                sopGroups.forEach((grp, grpIdx) => {
                    let isExpanded = localStorage.getItem('batchezSopExpanded_' + grp.id) === 'true';
                    let disp = isExpanded ? 'block' : 'none';
                    let chev = isExpanded ? '▼' : '▶';
                    let isEditing = window.activeInlineSopEditors && window.activeInlineSopEditors[grp.id] === true;
                    if(isEditing) { disp = 'block'; chev = '▼'; }

                    htmlOut += `
                    <div class="sop-grp-card" id="sopgrp_${grp.id}" draggable="true" data-grp-id="${grp.id}" data-prod-name="${wo.product_name.replace(/'/g, "\\'")}" style="background:var(--bg-panel); border:1px solid var(--border-color); border-radius:6px; margin-bottom:12px; transition:transform 0.2s;">
                        <div class="sop-grp-header-click" data-grp-id="${grp.id}" style="background:var(--bg-bar); padding:8px 12px; border-radius: 6px; cursor:pointer; display:flex; justify-content:space-between; align-items:center; border-left:4px solid ${isEditing ? '#F59E0B' : '#0ea5e9'}; font-weight:bold; font-size:13px; color:var(--text-heading);">
                            <div style="flex-grow:1; pointer-events:none;">
                                ${grp.title} ${isEditing ? ' <span style="color:#F59E0B; font-size:11px; font-weight:900;">[ INLINE EDIT MODE ]</span>' : ''}
                            </div>
                            <div style="display:flex; align-items:center; gap:8px;">
                                <button class="btn-slate sop-print-btn" data-raw-name="${grp.rawName.replace(/'/g, "\\'")}" style="font-size:10px; padding:2px 8px;">🖨️ PRINT SOP</button>
                                <button class="${isEditing ? 'btn-red-muted' : 'btn-orange-muted'} sop-edit-btn" data-grp-id="${grp.id}" style="font-size:10px; padding:2px 8px;">${isEditing ? '✕ CANCEL' : '🔒 EDIT'}</button>
                                <div class="sop-chev-btn" data-grp-id="${grp.id}" style="cursor:pointer; padding:0 8px; font-size:11px; margin-left:4px;" id="sopgrp_icon_${grp.id}">${chev}</div>
                            </div>
                        </div>
                        <div id="sopgrp_body_${grp.id}" style="display:${disp}; padding:10px 15px; border-top:1px solid var(--border-color);">
                    `;

                    if(isEditing) {
                        let qaText = grp.qa.join('\\n');
                        let mappedSteps = grp.steps.map(s => typeof s !== 'string' ? s : {text: s, attachments: []});
                        if(mappedSteps.length === 0) mappedSteps = [{}];
                        let stepsHtml = '';
                        mappedSteps.forEach((s, idx) => {
                            stepsHtml += window.generateEditableSOPRow(s, idx, wo.product_name, 'batches');
                        });

                        htmlOut += `
                            <!-- Layout Container (Side-by-side with resizer) -->
                            <div id="inlineContainer_${grp.id}" style="display:flex; flex-direction:row; width:100%; border:1px solid var(--border-color); border-radius:8px; overflow:hidden;">

                                <!-- Pane 1: Telemetry & Live Preview (Side-by-side like Master SOP) -->
                                <div id="inlineLeftPane_${grp.id}" style="flex: 0 0 65%; min-width:30px; display:flex; flex-direction:row; gap:15px; padding:15px; background:var(--bg-body); border-right:1px solid var(--border-color);  overflow:hidden;">

                                    <!-- Column 1: Config & Input -->
                                    <div id="inlineInputCol_${grp.id}" style="flex:1; background:var(--bg-panel); border-radius:12px; padding:20px; border:1px solid var(--border-color); display:flex; flex-direction:column; min-width:320px;">
                                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                                            <h3 style="margin:0; color:var(--text-heading); font-size:16px;">CHECKLIST</h3>
                                            <div style="display:flex; gap:5px; flex-wrap:nowrap; align-items:center;">
                                                <button class="sop-print-btn" data-raw-name="${grp.rawName.replace(/'/g, '\'')}" style="padding:3px 8px; font-size:10px; font-weight:700; background:rgba(16,185,129,0.1); border:1px solid #10b981; color:#10b981; border-radius:5px; cursor:pointer; white-space:nowrap;">🖨️ Print</button>
                                                <button data-mousedown="mousedown_sopDirectUpload" data-prodid="${wo.product_name.replace(/'/g, '\'')}" data-soptype="batches" data-target-textarea="inlineSopQA_${grp.id}" style="padding:3px 8px; font-size:10px; font-weight:700; background:rgba(59,130,246,0.15); border:1px solid #3b82f6; color:#3b82f6; border-radius:5px; cursor:pointer; white-space:nowrap;" title="Upload File to Supabase">☁️ Upload</button>
                                                <button data-click="click_openSOPSnapshotCamera_inlineProduction" data-textid="inlineSopQA_${grp.id}" style="padding:3px 8px; font-size:10px; font-weight:700; background:rgba(245,158,11,0.15); border:1px solid #F59E0B; color:#F59E0B; border-radius:5px; cursor:pointer; white-space:nowrap;">📸 Photo</button>
                                                <button data-click="click_openSOPTokenGuide" style="padding:3px 8px; font-size:10px; font-weight:700; background:rgba(245,158,11,0.1); border:1px solid #F59E0B; color:#F59E0B; border-radius:5px; cursor:pointer; white-space:nowrap;">❓ Guide</button>
                                                <button data-click="click_toggleHorizontalPreview" data-left="inlineLeftPane_${grp.id}" data-preview="inlinePreviewContainer_${grp.id}" style="padding:3px 8px; font-size:10px; font-weight:700; background:rgba(59,130,246,0.1); border:1px solid #3b82f6; color:#3b82f6; border-radius:5px; cursor:pointer; white-space:nowrap;">👁️ Preview</button>
                                            </div>
                                        </div>
                                        <div style="font-size:11px; color:var(--text-muted); line-height:1.8; margin-bottom:10px; background:var(--bg-bar); padding:8px 12px; border-radius:6px;">
                                            <b style="color:#10b981; font-family:monospace;"># </b>Header &nbsp;&middot;&nbsp;
                                            <b style="color:var(--text-muted); font-family:monospace;">&gt; </b>Subtext &nbsp;&middot;&nbsp;
                                            <b style="color:#F59E0B; font-family:monospace;">[INPUT]</b> Field &nbsp;&middot;&nbsp;
                                            <b style="color:#0ea5e9; font-family:monospace;">[SCAN:itemKey]</b> Bin Scan &nbsp;&middot;&nbsp;
                                            <b style="color:#a78bfa; font-family:monospace;">[IMG:url]</b> Image &nbsp;&middot;&nbsp;
                                            <b style="color:#f472b6; font-family:monospace;">[BARCODE:val]</b> Barcode &nbsp;&middot;&nbsp;
                                            <b style="color:#fb923c; font-family:monospace;">[QR:val]</b> QR Code &nbsp;&middot;&nbsp;
                                            <b style="color:#10b981; font-family:monospace;">[CAMERA]</b> Take Photo
                                            &nbsp;&mdash; <span style="color:#ef4444; cursor:pointer; font-weight:900;" data-click="click_openSOPTokenGuide">&#10067; Full Guide</span>
                                        </div>
                                        <textarea id="inlineSopQA_${grp.id}" oninput="if(typeof inlineRenderTelemetryPreview==='function') inlineRenderTelemetryPreview('${grp.id}')" placeholder="# Checklist Step" style="flex-grow:1; width:100%; padding:15px; border-radius:8px; border:1px solid var(--border-input); background:var(--bg-input); color:var(--text-main); resize:none; font-size:12px; font-family:monospace; line-height:1.5; outline:none; min-height:150px; white-space:nowrap;">${qaText}</textarea>
                                    </div>

                                    <!-- Column 2: Live Preview Render -->
                                    <div id="inlinePreviewContainer_${grp.id}" style="flex:1; background:var(--bg-container); border-radius:12px; padding:20px; border:1px solid var(--border-color); display:flex; flex-direction:column; min-width:0;">
                                        <div style="font-size:11px; font-weight:900; color:#F59E0B; margin-bottom:15px; letter-spacing:1px; text-transform:uppercase;">CHECKLIST PREVIEW</div>
                                        <div id="inlineSopQAPreview_${grp.id}" style="flex-grow:1; display:flex; flex-direction:column; gap:4px; overflow-y:auto; padding-right:10px;"></div>
                                    </div>

                                </div>

                                <!-- Dedicated Vertical Resizer Handle -->
                                <div id="inlineResizer_${grp.id}" class="h-resizer" onmousedown="if(typeof initInlineResize==='function'){initInlineResize(event, '${grp.id}');}"></div>

                                <!-- Pane 2: Rich Text Steps -->
                                <div id="inlineRightPane_${grp.id}" style="flex: 1; min-width:30px; display:flex; flex-direction:column; padding:15px; background:var(--bg-body); border-left:1px solid var(--border-color);  overflow:hidden;">
                                    <div style="flex:1; background:var(--bg-panel); border-radius:12px; padding:20px; border:1px solid var(--border-color); display:flex; flex-direction:column; min-width:0;">
                                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                                            <h3 style="margin:0; color:var(--text-heading); font-size:16px;">Rich Text Instructions</h3>
                                        </div>
                                        <div id="inlineSopSteps_${grp.id}" style="display:flex; flex-direction:column; gap:10px; overflow-y:auto; flex-grow:1;">${stepsHtml}</div>
                                        <button class="btn-blue-muted" style="padding:10px; font-size:12px; font-weight:bold; margin-top:15px;" data-click="click_addInlineSOPRow" data-grp="${grp.id}">+ ADD PROCEDURE STEP</button>
                                    </div>
                                </div>
                            </div>

                            <!-- Save Actions -->
                            <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:10px; padding-top:15px; border-top:1px solid var(--border-color);">
                                <button class="btn-red-muted" style="padding:8px 15px; font-size:12px;" data-click="click_toggleInlineEditor" data-grp="${grp.id}">✕ Cancel Changes</button>
                                <button class="btn-green-neon" style="padding:8px 25px; font-size:14px; font-weight:900;" data-click="click_saveInlineSopBlock" data-grp="${grp.id}" data-rawname="${grp.rawName.replace(/'/g, "\\'")}">💾 SAVE SOP MASTER BLUEPRINT</button>
                            </div>
                        </div>
                        <script>
                        setTimeout(() => {
                            if(typeof inlineRenderTelemetryPreview==='function') inlineRenderTelemetryPreview('${grp.id}');

                            let savedOrder = localStorage.getItem('inlineSopSwapOrder_${grp.id}');
                            if(savedOrder === 'right-left') {
                                let c = document.getElementById('inlineContainer_${grp.id}');
                                let l = document.getElementById('inlineLeftPane_${grp.id}');
                                let r = document.getElementById('inlineRightPane_${grp.id}');
                                let z = document.getElementById('inlineResizer_${grp.id}');
                                if(c && l && r && z) { c.insertBefore(r, z); c.insertBefore(z, l); }
                            }

                            let rz = document.getElementById('inlineResizer_${grp.id}');
                            let lp = document.getElementById('inlineLeftPane_${grp.id}');
                            let rp = document.getElementById('inlineRightPane_${grp.id}');
                            let isDragging = false;

                            if(rz && lp && rp) {
                                rz.addEventListener('mousedown', (e) => {
                                    isDragging = true;
                                    document.body.style.cursor = 'col-resize';
                                    e.preventDefault();
                                });
                                function doInlineSOPResize_${grp.id}(e) {
                                    if(!isDragging) return;
                                    let container = rz.parentElement;
                                    let totalW = container.getBoundingClientRect().width;
                                    let rect = container.getBoundingClientRect();
                                    let newLeftW = e.clientX - rect.left;

                                    if(newLeftW < 100) newLeftW = 100;
                                    if(totalW - newLeftW < 100) newLeftW = totalW - 100;

                                    lp.style.flex = \`0 0 \${newLeftW}px\`;
                                    rp.style.flex = \`1 1 0\`;
                                }
                                function stopInlineSOPResize_${grp.id}() {
                                    if(isDragging) {
                                        isDragging = false;
                                        document.body.style.cursor = '';
                                        document.removeEventListener('mousemove', doInlineSOPResize_${grp.id});
                                        document.removeEventListener('mouseup', stopInlineSOPResize_${grp.id});
                                    }
                                }
                                document.addEventListener('mousemove', doInlineSOPResize_${grp.id});
                                document.addEventListener('mouseup', stopInlineSOPResize_${grp.id});
                            }
                        }, 20);
                        </script>
                        `;
                    } else {
                        if (grp.qa.length === 0 && grp.steps.length === 0) {
                            htmlOut += `<div style="color:var(--text-muted); font-size:11px; font-style:italic;">No steps configured.</div>`;
                        } else {
                            if (grp.qa.length > 0) {
                                htmlOut += `<div style="font-weight:bold; color:var(--text-heading); font-size:12px; margin-bottom:5px; border-bottom:1px solid rgba(14,165,233,0.3); padding-bottom:3px;">📋 Telemetry / Checks</div>`;
                                grp.qa.forEach((q, qIdx) => {
                                    let chkKey = `sop_tele_${grp.id}_${qIdx}`; let isDone = wip[chkKey] ? 'checked' : ''; let doneCls = wip[chkKey] ? 'done' : '';
                                    let parsed = typeof parseProductionTelemetryLine === 'function' ? parseProductionTelemetryLine(q, qIdx) : q;
                                    if (q.startsWith('> ')) {
                                        htmlOut += `<label class="checklist-item ${doneCls}" style="display:flex; align-items:flex-start; flex-wrap:wrap; gap:6px; cursor:pointer; padding:2px 8px 2px 28px; width:100%; transition:all 0.2s; margin-bottom:2px;"><input type="checkbox" class="wip-checkbox" ${isDone} data-key="${chkKey}" style="width:12px; height:12px; flex-shrink:0; cursor:pointer; margin-top:2px;"><span style="font-size:11px; flex:1;">${parsed}</span></label>`;
                                    } else if (!q.startsWith('[INPUT]') && !q.startsWith('# ') && !/^\[(IMG|BARCODE|QR):/.test(q)) {
                                        htmlOut += `<label class="checklist-item ${doneCls}" style="display:flex; align-items:flex-start; flex-wrap:wrap; gap:10px; cursor:pointer; padding:4px 8px; border:1px solid var(--border-color); border-radius:6px; background:var(--bg-container); width:100%; transition:all 0.2s; margin-bottom:4px;"><input type="checkbox" class="wip-checkbox" ${isDone} data-key="${chkKey}" style="width:14px; height:14px; flex-shrink:0; cursor:pointer; margin-top:0px;"><span style="font-size:11px; flex:1;">${parsed}</span></label>`;
                                    } else {
                                        htmlOut += `<div style="width:100%; margin-bottom:6px; font-size:11px;">${parsed}</div>`;
                                    }
                                });
                                htmlOut += `<div style="height:6px;"></div>`;
                            }

                            if (grp.steps.length > 0) {
                                let mappedSteps = grp.steps.map(s => typeof s !== 'string' ? s : {text: s, attachments: []});
                                let stepCounter = 1;
                                mappedSteps.forEach((s, sIdx) => {
                                    let chkKey = `sop_step_${grp.id}_${sIdx}`; let isDone = wip[chkKey] ? 'checked' : ''; let doneCls = wip[chkKey] ? 'done' : '';
                                    let attachmentHtml = `<div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:6px;">`;
                                    let stepAttachments = s.attachments && s.attachments.length > 0 ? s.attachments : [s.m1, s.m2, s.m3];
                                    stepAttachments.forEach(m => {
                                        if(m && m.url) {
                                            let dId = parseMediaUrl(m.url); let safeUrl = m.url.replace(/'/g, "\\\\'").replace(/"/g, '"');
                                            
                                            // Safe Auto-recover for definitively non-image types
                                            let derivedType = m.type;
                                            if (derivedType === 'img') {
                                                let lowUrl = safeUrl.toLowerCase();
                                                if (lowUrl.includes('.mp4') || lowUrl.includes('.webm') || lowUrl.includes('.avi')) derivedType = 'vid';
                                                else if (lowUrl.includes('.pdf') || lowUrl.includes('.docx') || lowUrl.includes('.xlsx') || lowUrl.includes('.txt')) derivedType = 'doc';
                                            }

                                            if (derivedType === 'img') {
                                                let imgThumbUrl = dId ? `https://drive.google.com/thumbnail?id=${dId}&sz=w800` : safeUrl;
                                                attachmentHtml += `<img loading="lazy" src="${imgThumbUrl}" class="media-thumb sop-media-img" data-url="${imgThumbUrl}" style="max-height:100px; object-fit:contain; border-radius:6px; border:1px solid var(--border-color); cursor:zoom-in;">`;
                                            } else {
                                                let isNativeVid = !dId && m.type === 'vid' && (safeUrl.includes('.mp4') || safeUrl.includes('.webm') || safeUrl.includes('supabase.co'));
                                                if (isNativeVid) {
                                                    attachmentHtml += `<div class="media-thumb sop-media-vid grid-stack" data-url="${safeUrl}" style="max-height:100px; background:#1e293b; border-radius:6px; overflow:hidden; border:1px solid var(--border-color); cursor:zoom-in;"><video preload="none" src="${safeUrl}" style="width:100%; height:100%; object-fit:cover; opacity:0;" muted playsinline></video><div class="overlay-center-flex" style="flex-direction:column; gap:8px; z-index:1;"><i class="fa-solid fa-play" style="font-size:24px; color:white; filter:drop-shadow(0 2px 4px rgba(0,0,0,0.5));"></i><span style="color:white; font-size:10px; font-weight:bold;">VIDEO</span></div></div>`;
                                                } else {
                                                    let mediaUrl = dId ? `https://drive.google.com/file/d/${dId}/preview` : safeUrl;
                                                    if (mediaUrl.includes('sharepoint.com') && !mediaUrl.includes('action=embedview')) mediaUrl += (mediaUrl.includes('?') ? '&' : '?') + 'action=embedview';
                                                    attachmentHtml += `<div class="media-thumb sop-media-iframe" data-url="${mediaUrl}" style="max-height:100px; border-radius:6px; overflow:hidden; border:1px solid var(--border-color); cursor:zoom-in;"><iframe loading="lazy" src="${mediaUrl}" style="width:100%; height:100%; border:none; pointer-events:none;"></iframe></div>`;
                                                }
                                            }
                                        }
                                    });
                                    attachmentHtml += `</div>`;
                                    htmlOut += `<div class="checklist-item ${doneCls}" style="padding:4px 8px; margin-bottom:4px;"><input type="checkbox" class="wip-checkbox" data-key="${chkKey}" ${isDone}> <div class="chk-text" style="width:100%; font-size:11px;"><strong style="color:#0ea5e9; font-size:12px;">Step ${stepCounter++}:</strong><br> ${s.text} ${attachmentHtml}</div></div>`;
                                });
                            }
                        }
                    }
                    htmlOut += `</div></div>`;
                });
                sList.innerHTML = window.safeHTML(htmlOut);

                // Re-bind events stripped by DOMPurify
                sList.querySelectorAll('.sop-grp-card').forEach(card => {
                    let grpId = card.getAttribute('data-grp-id');
                    let rawName = card.getAttribute('data-prod-name');
                    card.addEventListener('dragstart', (e) => batchezSopDragStart(e, grpId));
                    card.addEventListener('dragover', (e) => batchezSopDragOver(e));
                    card.addEventListener('drop', (e) => batchezSopDrop(e, grpId, rawName));
                    card.addEventListener('dragend', (e) => batchezSopDragEnd(e));
                });
                sList.querySelectorAll('.sop-grp-header-click').forEach(el => {
                    let grpId = el.getAttribute('data-grp-id');
                    el.addEventListener('click', () => { 
                        if(!(window.activeInlineSopEditors && window.activeInlineSopEditors[grpId])) {
                            toggleBatchezSopGroup(grpId); 
                        }
                    });
                });
                sList.querySelectorAll('.sop-print-btn').forEach(btn => {
                    let rawName = btn.getAttribute('data-raw-name');
                    btn.addEventListener('click', (e) => { e.stopPropagation(); window.openSopPrintModal('production', rawName); });
                });
                sList.querySelectorAll('.sop-edit-btn').forEach(btn => {
                    let grpId = btn.getAttribute('data-grp-id');
                    btn.addEventListener('click', (e) => { e.stopPropagation(); toggleInlineEditor(grpId); });
                });
                sList.querySelectorAll('.sop-chev-btn').forEach(btn => {
                    let grpId = btn.getAttribute('data-grp-id');
                    btn.addEventListener('click', (e) => { e.stopPropagation(); toggleBatchezSopGroup(grpId); });
                });
                sList.querySelectorAll('.sop-media-img').forEach(img => {
                    let url = img.getAttribute('data-url');
                    img.addEventListener('click', (e) => { e.stopPropagation(); openMediaModal(url, 'img'); });
                });
                sList.querySelectorAll('.sop-media-vid').forEach(vid => {
                    let url = vid.getAttribute('data-url');
                    vid.addEventListener('click', (e) => { e.stopPropagation(); openMediaModal(url, 'vid'); });
                });
                sList.querySelectorAll('.sop-media-iframe').forEach(ifr => {
                    let url = ifr.getAttribute('data-url');
                    ifr.addEventListener('click', (e) => { e.stopPropagation(); openMediaModal(url, 'iframe'); });
                });
                sList.querySelectorAll('.wip-checkbox').forEach(chk => {
                    let key = chk.getAttribute('data-key');
                    chk.addEventListener('change', (e) => { toggleWIPCheckbox(chk, key); });
                });

                if (typeof processTelemetryCanvasRendering === 'function') processTelemetryCanvasRendering(sList);
        }
        else if(wo.status === 'Completed') {
            document.getElementById('pipe-Completed').classList.add('active');
            document.getElementById('sect-Completed').classList.add('active');
        }
    } catch(e) { sysLog(e.message, true); }
}

async function advanceWO(newStatus, bypassModal = false) {
    try {
        if(!currentWO) return;
        const targetWO = currentWO;
        
        // Ensure data integrity before modification
        if (typeof targetWO.wip_state === 'string') targetWO.wip_state = JSON.parse(targetWO.wip_state || '{}');
        if (typeof targetWO.routing === 'string') targetWO.routing = JSON.parse(targetWO.routing || '{}');

        if(targetWO.status === 'Archived' || targetWO.status === 'Completed') return showToast('This Work Order is already finalized.', 'error');

        if ((targetWO.wip_state && targetWO.wip_state.materials_pulled) && (newStatus === 'Queued' || newStatus === 'Picking')) {
            return alert("Materials have already been pulled for this Work Order. You cannot revert to previous planning stages.");
        }

        if (newStatus === 'Completed' && !bypassModal) {
            let w = targetWO.wip_state || {};
            let drafts = w.scrap_draft || {};
            let tableHtml = buildDraftModalHtml(targetWO, drafts);

            document.getElementById('finalizeWoHeaderBg').style.background = 'rgba(16, 185, 129, 0.1)';
            document.getElementById('finalizeWoHeaderBg').style.borderBottomColor = 'rgba(255,255,255,0.1)';
            document.getElementById('finalizeWoTitle').innerHTML = window.safeHTML('✅ Verify Batch Finalization');
            document.getElementById('finalizeWoTitle').style.color = '#10b981';

            let btn = document.getElementById('finalizeWoActionBtn');
            btn.className = 'btn-green';
            btn.innerHTML = window.safeHTML('Finalize & Deduct');
            btn.onclick = window.submitFinalizeWo;

            let m = document.getElementById('finalizeWoItemsList');
            if (m) {
                m.innerHTML = window.safeHTML(tableHtml);
                document.getElementById('finalizeWoModal').style.display = 'flex';
            }
            return;
        }

        sysLog(`WO ${targetWO.wo_id} -> ${newStatus}`); setMasterStatus("Updating...", "mod-working");
        if (newStatus === 'In Production' || newStatus === 'Completed') {
            if (!(targetWO.wip_state && targetWO.wip_state.materials_pulled)) {
                if(!confirm(`Deduct raw materials for ${targetWO.wo_id}?`)) { setMasterStatus("Ready.", "status-idle"); return; }
                let exactDeductions = calculateExactWODeductions(targetWO);
                let upsKeys = new Set();
                let bType = targetWO.wip_state && targetWO.wip_state.batch_type ? targetWO.wip_state.batch_type : 'Production';
                let isScrapTicket = targetWO.label && targetWO.label.includes('[SCRAP REBUILD]');

                Object.keys(exactDeductions.raws_production).forEach(k => {
                    let req = exactDeductions.raws_production[k];
                    if(!inventoryDB[k]) inventoryDB[k]={consumed_qty:0, manual_adjustment:0, produced_qty:0, sold_qty:0, min_stock:0, scrap_qty:0, prototype_consumed_qty:0, assembly_consumed_qty:0, production_consumed_qty:0, prototype_produced_qty:0};
                    if (isScrapTicket) { inventoryDB[k].scrap_qty = (inventoryDB[k].scrap_qty||0) + req; } else {
                        inventoryDB[k].consumed_qty += req;
                        if(bType === 'Prototype') inventoryDB[k].prototype_consumed_qty = (inventoryDB[k].prototype_consumed_qty||0) + req;
                        else inventoryDB[k].production_consumed_qty = (inventoryDB[k].production_consumed_qty||0) + req;
                    }
                    upsKeys.add(k);
                });
                Object.keys(exactDeductions.raws_assembly).forEach(k => {
                    let req = exactDeductions.raws_assembly[k];
                    if(!inventoryDB[k]) inventoryDB[k]={consumed_qty:0, manual_adjustment:0, produced_qty:0, sold_qty:0, min_stock:0, scrap_qty:0, prototype_consumed_qty:0, assembly_consumed_qty:0, production_consumed_qty:0, prototype_produced_qty:0};
                    if (isScrapTicket) { inventoryDB[k].scrap_qty = (inventoryDB[k].scrap_qty||0) + req; } else {
                        inventoryDB[k].consumed_qty += req;
                        if(bType === 'Prototype') inventoryDB[k].prototype_consumed_qty = (inventoryDB[k].prototype_consumed_qty||0) + req;
                        else inventoryDB[k].production_consumed_qty = (inventoryDB[k].production_consumed_qty||0) + req;
                    }
                    upsKeys.add(k);
                });
                Object.keys(exactDeductions.pulls).forEach(k => {
                    let req = exactDeductions.pulls[k];
                    if(!inventoryDB[k]) inventoryDB[k]={consumed_qty:0, manual_adjustment:0, produced_qty:0, sold_qty:0, min_stock:0, scrap_qty:0, prototype_consumed_qty:0, assembly_consumed_qty:0, production_consumed_qty:0, prototype_produced_qty:0};
                    if (isScrapTicket) { inventoryDB[k].scrap_qty = (inventoryDB[k].scrap_qty||0) + req; } else {
                        inventoryDB[k].consumed_qty += req;
                        if(bType === 'Prototype') inventoryDB[k].prototype_consumed_qty = (inventoryDB[k].prototype_consumed_qty||0) + req;
                        else inventoryDB[k].production_consumed_qty = (inventoryDB[k].production_consumed_qty||0) + req;
                    }
                    upsKeys.add(k);
                });

                let ups = Array.from(upsKeys).map(k => ({item_key: k, consumed_qty: inventoryDB[k].consumed_qty, manual_adjustment: inventoryDB[k].manual_adjustment, produced_qty: inventoryDB[k].produced_qty, sold_qty: inventoryDB[k].sold_qty, min_stock: inventoryDB[k].min_stock, scrap_qty: inventoryDB[k].scrap_qty, prototype_consumed_qty: inventoryDB[k].prototype_consumed_qty||0, assembly_consumed_qty: inventoryDB[k].assembly_consumed_qty||0, production_consumed_qty: inventoryDB[k].production_consumed_qty||0, prototype_produced_qty: inventoryDB[k].prototype_produced_qty||0}));
                if(ups.length > 0) await supabaseClient.from('inventory_consumption').upsert(ups, {onConflict:'item_key'});

                if(!targetWO.wip_state) targetWO.wip_state = {};
                targetWO.wip_state.materials_pulled = true;
                await supabaseClient.from('work_orders').update({ wip_state: targetWO.wip_state }).eq('wo_id', targetWO.wo_id);
            }
        }

        if (newStatus === 'Completed') {
            if(!confirm(`Add ${targetWO.qty} Finished Goods to Inventory Yield?`)) { setMasterStatus("Ready.", "status-idle"); return; }
            let bType = targetWO.wip_state && targetWO.wip_state.batch_type ? targetWO.wip_state.batch_type : 'Production';

            let exactDeductions = calculateExactWODeductions(targetWO);
            let upsKeys = new Set();

            let isScrapTicket = targetWO.label && targetWO.label.includes('[SCRAP REBUILD]');
            Object.keys(exactDeductions.built_subs).forEach(k => {
                let req = exactDeductions.built_subs[k];
                if(!inventoryDB[k]) inventoryDB[k]={consumed_qty:0, manual_adjustment:0, produced_qty:0, sold_qty:0, min_stock:0, scrap_qty:0, prototype_consumed_qty:0, assembly_consumed_qty:0, production_consumed_qty:0, prototype_produced_qty:0};

                if (isScrapTicket) {
                    inventoryDB[k].scrap_qty = (inventoryDB[k].scrap_qty || 0) + req;
                } else {
                    inventoryDB[k].consumed_qty += req;
                    if(bType === 'Prototype') inventoryDB[k].prototype_consumed_qty = (inventoryDB[k].prototype_consumed_qty||0) + req;
                    else inventoryDB[k].production_consumed_qty = (inventoryDB[k].production_consumed_qty||0) + req;
                }

                let cleanName = k.replace('RECIPE:::', '');
                let is3D = productsDB[cleanName] && productsDB[cleanName].is_3d_print;

                if (!is3D) {
                    if(bType === 'Prototype') inventoryDB[k].prototype_produced_qty = (inventoryDB[k].prototype_produced_qty||0) + req;
                    else inventoryDB[k].produced_qty += req;
                }
                upsKeys.add(k);
            });

            let fgiKey = `RECIPE:::${targetWO.product_name}`;
            if(!inventoryDB[fgiKey]) inventoryDB[fgiKey]={consumed_qty:0, manual_adjustment:0, produced_qty:0, sold_qty:0, min_stock:0, scrap_qty:0, prototype_consumed_qty:0, assembly_consumed_qty:0, production_consumed_qty:0, prototype_produced_qty:0};

            if(bType === 'Prototype') inventoryDB[fgiKey].prototype_produced_qty = (inventoryDB[fgiKey].prototype_produced_qty||0) + targetWO.qty;
            else inventoryDB[fgiKey].produced_qty += targetWO.qty;
            upsKeys.add(fgiKey);

            let ups = Array.from(upsKeys).map(k => ({item_key: k, consumed_qty: inventoryDB[k].consumed_qty, manual_adjustment: inventoryDB[k].manual_adjustment, produced_qty: inventoryDB[k].produced_qty, sold_qty: inventoryDB[k].sold_qty, min_stock: inventoryDB[k].min_stock, scrap_qty: inventoryDB[k].scrap_qty, prototype_consumed_qty: inventoryDB[k].prototype_consumed_qty||0, assembly_consumed_qty: inventoryDB[k].assembly_consumed_qty||0, production_consumed_qty: inventoryDB[k].production_consumed_qty||0, prototype_produced_qty: inventoryDB[k].prototype_produced_qty||0}));
            if(ups.length > 0) await supabaseClient.from('inventory_consumption').upsert(ups, {onConflict:'item_key'});
        }

        if (!targetWO.wip_state) targetWO.wip_state = {};
        
        if (newStatus === 'Picking') {
            targetWO.wip_state.stage_start_time = Date.now();
            targetWO.wip_state.active_stage = 'Picking';
            targetWO.wip_state.is_paused = false;
        } else if (newStatus === 'In Production') {
            if (targetWO.wip_state.active_stage === 'Picking' && targetWO.wip_state.stage_start_time && !targetWO.wip_state.is_paused) {
                targetWO.wip_state.elapsed_picking = (targetWO.wip_state.elapsed_picking || 0) + (Date.now() - targetWO.wip_state.stage_start_time);
            }
            targetWO.wip_state.stage_start_time = Date.now();
            targetWO.wip_state.active_stage = 'Production';
            targetWO.wip_state.is_paused = false;
        } else if (newStatus === 'Completed') {
            if (targetWO.wip_state.stage_start_time && !targetWO.wip_state.is_paused) {
                let stageKey = targetWO.wip_state.active_stage === 'Picking' ? 'elapsed_picking' : 'elapsed_production';
                targetWO.wip_state[stageKey] = (targetWO.wip_state[stageKey] || 0) + (Date.now() - targetWO.wip_state.stage_start_time);
            }
            targetWO.wip_state.stage_start_time = null;
            targetWO.wip_state.active_stage = null;
            targetWO.wip_state.is_paused = false;
        }

        const updateData = {status: newStatus, wip_state: targetWO.wip_state};
        if(newStatus !== 'Queued' && !targetWO.started_at) {
            targetWO.started_at = new Date().toISOString();
            updateData.started_at = targetWO.started_at;
        }
        if(newStatus === 'Completed') {
            targetWO.completed_at = new Date().toISOString();
            updateData.completed_at = targetWO.completed_at;
            updateData.status = 'Archived';
            targetWO.status = 'Archived';
        }

        sysLog(`PATCHing WO ${targetWO.wo_id} -> ${updateData.status}`);
        const {error} = await supabaseClient.from('work_orders').update(updateData).eq('wo_id', targetWO.wo_id); 
        if(error) {
            sysLog(`PATCH ERROR: ${error.message} (${error.code})`, true);
            if(error.details) sysLog(`DETAILS: ${error.details}`, true);
            if(error.hint) sysLog(`HINT: ${error.hint}`, true);
            throw new Error(error.message);
        }

        // Auto-spawn 3D Print Jobs (Raw Goods based)
        try {
            const { data: existingPrints } = await supabaseClient.from('print_queue').select('id').eq('wo_id', targetWO.wo_id);
            if (!existingPrints || existingPrints.length === 0) {
                const printJobs = find3DPrintedComponents(targetWO.product_name, targetWO.qty, targetWO.routing);
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
                        await addPrintJob(prefix + job, amountToPrint, targetWO.wo_id);
                    }
                }
            }
        } catch(pe) { sysLog("Print Spawn Error: " + pe.message, true); }

        if(currentWO && currentWO.wo_id === targetWO.wo_id) {
            currentWO.status = updateData.status || newStatus;
            if(currentWO.status === 'Archived') {
                currentWO = workOrdersDB.find(w => w.status !== 'Archived') || null;
            }
        }
        setMasterStatus("Updated!", "mod-success"); setTimeout(()=>setMasterStatus("Ready.", "status-idle"), 2000); renderWOList();
    } catch(e) { sysLog(e.message, true); setMasterStatus("Error", "mod-error"); }
}

async function deleteCurrentWO() { try { if(!currentWO) return; if(confirm(`Delete ${currentWO.wo_id}?`)) { await supabaseClient.from('work_orders').delete().eq('wo_id', currentWO.wo_id); workOrdersDB = workOrdersDB.filter(w => w.wo_id !== currentWO.wo_id); currentWO = workOrdersDB.find(w => w.status !== 'Archived') || null; renderWOList(); } } catch(e) { sysLog(e.message, true); } }

async function archiveCurrentWO() {
    try {
        if(!currentWO) return;
        if(currentWO.status === 'Archived') return showToast('Already archived.', 'error');
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

async function deleteWorkOrder() {
    if (!currentWO) return;
    // Safety guard: block deletion if materials have already been pulled to prevent inventory corruption
    if (currentWO.wip_state && currentWO.wip_state.materials_pulled) {
        return showToast('Cannot delete — materials have already been pulled for this Work Order. Archive it instead.', 'error');
    }
    if (!confirm(`⚠️ Permanently delete ${currentWO.wo_id}: ${currentWO.product_name}?\n\nThis cannot be undone.`)) return;
    try {
        sysLog(`Deleting WO ${currentWO.wo_id}`);
        setMasterStatus("Deleting...", "mod-working");
        const { error } = await supabaseClient.from('work_orders').delete().eq('wo_id', currentWO.wo_id);
        if (error) throw new Error(error.message);
        workOrdersDB = workOrdersDB.filter(w => w.wo_id !== currentWO.wo_id);
        currentWO = workOrdersDB.find(w => w.status !== 'Archived') || null;
        setMasterStatus("Deleted!", "mod-success");
        setTimeout(() => setMasterStatus("Ready.", "status-idle"), 2000);
        renderWOList();
        if (!currentWO) document.getElementById('woMainArea').style.display = 'none';
    } catch(e) {
        sysLog(e.message, true);
        showToast('Delete failed: ' + e.message, 'error');
        setMasterStatus("Error", "mod-error");
    }
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
            document.getElementById('archiveListArea').innerHTML = window.safeHTML(
                '<p style="color:var(--text-muted); text-align:center;">Fetching records...</p>'
            );
            await refreshPrintQueue();
            window._layerzArchiveLoaded = true;
        }
    }
    renderArchiveList();
}
let _archiveFullData = [];

function renderArchiveList() {
    try {
        const searchEl = document.getElementById('archiveSearchInput');
        if (searchEl) searchEl.value = '';

        if (currentArchiveTab === 'batchez') {
            _archiveFullData = workOrdersDB.filter(w => w.status === 'Archived');
        } else {
            _archiveFullData = printQueueDB.filter(p => p.status === 'Archived');
        }
        _renderArchiveCards(_archiveFullData);
    } catch(e) { sysLog(e.message, true); }
}

function filterArchiveList(q) {
    try {
        if (!q || !q.trim()) { _renderArchiveCards(_archiveFullData); return; }
        const lq = q.toLowerCase().trim();
        let filtered;
        if (currentArchiveTab === 'batchez') {
            filtered = _archiveFullData.filter(w =>
                (w.wo_id || '').toLowerCase().includes(lq) ||
                (w.product_name || '').toLowerCase().includes(lq) ||
                (w.label || '').toLowerCase().includes(lq)
            );
        } else {
            filtered = _archiveFullData.filter(j =>
                (j.wo_id || '').toLowerCase().includes(lq) ||
                (j.part_name || '').toLowerCase().includes(lq) ||
                (j.label || '').toLowerCase().includes(lq)
            );
        }
        _renderArchiveCards(filtered);
    } catch(e) { sysLog(e.message, true); }
}

function toggleArchiveDetail(id) {
    try {
        const detail = document.getElementById(id);
        const chevron = document.getElementById(id + '-chev');
        if (!detail) return;
        const isOpen = detail.style.display !== 'none';
        detail.style.display = isOpen ? 'none' : 'flex';
        if (chevron) chevron.classList.toggle('open', !isOpen);
    } catch(e) { sysLog(e.message, true); }
}

function _renderArchiveCards(items) {
    try {
        const listArea = document.getElementById('archiveListArea');
    if (!listArea) return;
    if (items.length === 0) {
        listArea.innerHTML = window.safeHTML(
            `<div style="text-align:center; padding:40px; color:var(--text-muted); font-style:italic;">No archived records found.</div>`
        );
        return;
    }
    const fmt = (d) => d ? new Date(d).toLocaleString([], { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : null;
    const fmtShort = (d) => d ? new Date(d).toLocaleString([], { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

    if (currentArchiveTab === 'batchez') {
        listArea.innerHTML = window.safeHTML(items.map((wo, i) => {
            const dtC = fmt(wo.started_at || wo.created_at) || '—';
            const dtF = fmt(wo.completed_at);
            const arcId = `arc-b-${i}`;
            const statusClass = wo.completed_at ? 'completed' : 'manual';
            const statusLabel = wo.completed_at ? '✓ COMPLETED' : '⚡ ARCHIVED';
            let w = wo.wip_state || {};
            let pTime = w.elapsed_picking || 0;
            let mTime = w.elapsed_production || 0;
            let totalT = pTime + mTime;
            let timeHtml = totalT > 0 ? `<div class="archive-card-detail-row"><span>Picking Time:</span><strong>${formatWOTime(pTime)}</strong></div><div class="archive-card-detail-row"><span>Production Time:</span><strong>${formatWOTime(mTime)}</strong></div><div class="archive-card-detail-row"><span>Total Build Time:</span><strong style="color:#10b981;">${formatWOTime(totalT)}</strong></div>` : '';
            let headerTimes = totalT > 0 ? `<div style="display:flex; gap:8px; font-family:monospace; font-size:10px; color:var(--text-muted); margin-right:10px; white-space:nowrap;"><span>Pick: ${formatWOTime(pTime)}</span><span>Prod: ${formatWOTime(mTime)}</span></div>` : '';

            return `
            <div class="archive-card">
                <div class="archive-card-header" data-click="toggleArchiveDetail" data-arc-id="${arcId}">
                    <div class="archive-card-status ${statusClass}">${statusLabel}</div>
                    <div class="archive-card-id">${wo.wo_id}</div>
                    <div class="archive-card-title" style="flex-grow:1; margin-left:15px; overflow:hidden; text-overflow:ellipsis; min-width:50px;">${wo.label ? `"${wo.label}" — ` : ''}${wo.product_name}</div>
                    <div class="archive-card-meta" style="white-space:nowrap; margin-right:10px;">x${wo.qty} · ${fmtShort(wo.completed_at || wo.created_at)}</div>
                    ${headerTimes}
                    <button data-click="hardDeleteArchive" data-arc-type="batchez" data-arc-id="${wo.wo_id}" class="btn-red-neon" style="width:auto; padding:4px 10px; font-size:10px; flex-shrink:0;">🗑️ DELETE</button>
                    <div class="archive-card-chevron" id="${arcId}-chev">▶</div>
                </div>
                <div class="archive-card-detail" id="${arcId}" style="display:none; flex-direction:column;">
                    ${wo.label ? `<div class="archive-card-detail-row"><span>Label:</span><strong>"${wo.label}"</strong></div>` : ''}
                    <div class="archive-card-detail-row"><span>Product:</span><strong>${wo.product_name}</strong></div>
                    <div class="archive-card-detail-row"><span>Qty Target:</span><strong>${wo.qty} units</strong></div>
                    <div class="archive-card-detail-row"><span>Started:</span><strong>${dtC}</strong></div>
                    <div class="archive-card-detail-row"><span>Completed:</span><strong>${dtF || 'Manual Archive'}</strong></div>
                    ${timeHtml}
                </div>
            </div>`;
        }).join(''));
    } else {
        listArea.innerHTML = window.safeHTML(items.map((job, i) => {
            const dtC = fmt(job.started_at || job.created_at) || '—';
            const dtF = fmt(job.completed_at);
            const arcId = `arc-l-${i}`;
            let cleanPartName = (job.part_name || 'Unknown Part').startsWith('RECIPE:::') ? job.part_name.replace('RECIPE:::', '') : (job.part_name || '').split(':::')[0];
            const catItem = typeof catalogByName !== 'undefined' ? catalogByName[cleanPartName] : null;
            const displayName = catItem ? (catItem.neoName || catItem.itemName) : cleanPartName;
            const displayID = (job.wo_id && job.wo_id.startsWith('WO-')) ? job.wo_id : ('PR-' + String(job.id || '').substring(0, 8).toUpperCase());
            return `
            <div class="archive-card">
                <div class="archive-card-header" data-click="toggleArchiveDetail" data-arc-id="${arcId}">
                    <div class="archive-card-status print">🖨️ PRINTED</div>
                    <div class="archive-card-id">${displayID}</div>
                    <div class="archive-card-title" style="flex-grow:1; margin-left:15px; overflow:hidden; text-overflow:ellipsis; min-width:50px;">${job.label ? `"${job.label}" — ` : ''}${displayName}</div>
                    <div class="archive-card-meta" style="white-space:nowrap; margin-right:10px;">x${job.qty} · ${fmtShort(job.completed_at || job.created_at)}</div>
                    <button data-click="hardDeleteArchive" data-arc-type="layerz" data-arc-id="${job.id}" class="btn-red-neon" style="width:auto; padding:4px 10px; font-size:10px; flex-shrink:0;">🗑️ DELETE</button>
                    <div class="archive-card-chevron" id="${arcId}-chev">▶</div>
                </div>
                <div class="archive-card-detail" id="${arcId}" style="display:none; flex-direction:column;">
                    ${job.label ? `<div class="archive-card-detail-row"><span>Label:</span><strong>"${job.label}"</strong></div>` : ''}
                    <div class="archive-card-detail-row"><span>Part:</span><strong>${displayName}</strong></div>
                    <div class="archive-card-detail-row"><span>Qty Printed:</span><strong>${job.qty}</strong></div>
                    <div class="archive-card-detail-row"><span>Source WO:</span><strong>${job.wo_id || 'Manual Entry'}</strong></div>
                    <div class="archive-card-detail-row"><span>Started:</span><strong>${dtC}</strong></div>
                    <div class="archive-card-detail-row"><span>Completed:</span><strong>${dtF || 'Manual Archive'}</strong></div>
                </div>
            </div>`;
        }).join(''));
    }
    } catch(e) { sysLog(e.message, true); }
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

async function deleteAllArchive() {
    if(!confirm(`⚠️ DANGER: Are you sure you want to permanently delete ALL archived records in the ${currentArchiveTab === 'batchez' ? 'Batchez' : 'Layerz'} tab?\n\nThis action cannot be undone.`)) return;
    sysLog(`Hard deleting ALL archives from ${currentArchiveTab}`);
    setMasterStatus("Deleting Archive...", "mod-working");

    const btn = document.querySelector('.btn-red[data-click="click_window_deleteAllArchive"]');
    if (btn) { btn.innerText = "Deleting..."; btn.disabled = true; }

    try {
        if(currentArchiveTab === 'batchez') {
            const {error} = await supabaseClient.from('work_orders').delete().eq('status', 'Archived');
            if (error) throw new Error(error.message);
            workOrdersDB = workOrdersDB.filter(w => w.status !== 'Archived');
        } else {
            const {error} = await supabaseClient.from('print_queue').delete().eq('status', 'Archived');
            if (error) throw new Error(error.message);
            printQueueDB = printQueueDB.filter(p => p.status !== 'Archived');
        }
        setMasterStatus("Archive Cleared!", "mod-success");
        setTimeout(()=>setMasterStatus("Ready.", "status-idle"), 2000);
        renderArchiveList();
    } catch(e) {
        sysLog(e.message, true);
        setMasterStatus("Error", "mod-error");
    } finally {
        if (btn) { btn.innerText = "🗑️ Clear Archive"; btn.disabled = false; }
    }
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
            Object.keys(directRaws).forEach(k => { let req = directRaws[k]; let c = catalogCache[k] || {}; let is3D = k.startsWith('RECIPE:::'); let f = fmtKey(k); let name = is3D ? k.replace('RECIPE:::', '') : (f.nn ? f.nn : (c.itemName || f.in)); let sp = is3D ? "" : (c.spec === "(Mixed Specs)" ? "⚙️ (Mixed Specs)" : (c.spec || "")); html += `<tr><td>[   ]</td><td>${is3D ? '🖨️ ' : ''}${name}</td><td>${sp}</td><td><strong>${req.toFixed(2)}</strong></td></tr>`; });
        }
        let exactDeds = calculateExactWODeductions(currentWO);
        if(Object.keys(exactDeds.pulls).length > 0) {
            let pulls = [];
            Object.keys(exactDeds.pulls).forEach(k => pulls.push({name: k.replace('RECIPE:::', ''), q: exactDeds.pulls[k]}));
            if(pulls.length > 0) {
                html += `<tr><td colspan="4" class="group-header" style="background:#d1fae5; color:#15803d;">🟢 Pull Pre-Built from Shelf</td></tr>`;
                pulls.forEach(sub => { html += `<tr><td>[   ]</td><td colspan="2">⚙️ ${sub.name}</td><td><strong>${sub.q.toFixed(2)}</strong></td></tr>`; });
            }
        }
        if(currentWO.routing) {
            Object.keys(currentWO.routing).forEach(sub => {
                if(currentWO.routing[sub].build > 0) {
                    let subDirect = getDirectMaterials(sub, currentWO.routing[sub].build);
                    if(Object.keys(subDirect).length > 0) {
                        let isT3D = typeof productsDB !== 'undefined' && productsDB[sub] && productsDB[sub].is_3d_print;
                        let tEmo = isT3D ? '🖨️' : '⚙️';
                        html += `<tr><td colspan="4" class="group-header" style="background:#fef3c7; color:#b45309;">🟠 Build: ${tEmo} ${sub} (x${currentWO.routing[sub].build})</td></tr>`;
                        Object.keys(subDirect).forEach(k => { let req = subDirect[k]; let c = catalogCache[k] || {}; let is3D = k.startsWith('RECIPE:::'); let f = fmtKey(k); let name = is3D ? k.replace('RECIPE:::', '') : (f.nn ? f.nn : (c.itemName || f.in)); let sp = is3D ? "" : (c.spec === "(Mixed Specs)" ? "⚙️ (Mixed Specs)" : (c.spec || "")); html += `<tr><td>[   ]</td><td>${is3D ? '🖨️ ' : ''}${name}</td><td>${sp}</td><td><strong>${req.toFixed(2)}</strong></td></tr>`; });
                    }
                }
            });
        }
        html += `</tbody></table></body></html>`; let win = window.open('', '', 'width=800,height=600'); win.document.write(html); win.document.close(); setTimeout(() => win.print(), 250);
    } catch(e) { sysLog(e.message, true); }
}

window.activePrintContext = 'production';
window.activePrintTargetOverride = null;

window.openSopPrintModal = function(context = 'production', targetOverride = null) {
    window.activePrintContext = context;
    window.activePrintTargetOverride = targetOverride;
    let el = document.getElementById('sopPrintOptionsModal');
    if (el) el.style.display = 'flex';
};

window.closeSopPrintModal = function() {
    let el = document.getElementById('sopPrintOptionsModal');
    if (el) el.style.display = 'none';
};

window.executeSopPrint = function(printType) {
    window.closeSopPrintModal();
    
    if(window.activePrintContext === 'packerz') {
        if(typeof window.executePackerzSopPrint === 'function') {
            window.executePackerzSopPrint(printType);
        } else {
            sysLog("Packerz SOP printing logic not loaded.", true);
        }
        return;
    }

    try {
        if(!currentWO && typeof currentWO === 'undefined' && !window.activePrintTargetOverride && (!document.getElementById('sopModalWrapper') || document.getElementById('sopModalWrapper').style.display === 'none')) {
            sysLog("Cannot print SOP without a valid target context.", true);
            return;
        }

        // 1. GATHER DATA
        let checklistsToRender = [];
        let richtextStepsToRender = [];
        let hasRichText = false;
        let globalRichTextHTML = '';
        let headerTitle = currentWO ? currentWO.wo_id : 'SOP Document';
        let targetProductName = currentWO ? currentWO.product_name : '';

        if (window.activePrintTargetOverride) {
            targetProductName = window.activePrintTargetOverride;
            headerTitle = "SOP: " + targetProductName;
        } else if(document.getElementById('sopModalWrapper') && document.getElementById('sopModalWrapper').style.display !== 'none') {
            targetProductName = currentProductSOP || targetProductName;
            headerTitle = "SOP: " + targetProductName;
        }

        // Helper to extract qaChecks and steps correctly
        function extractPayload(payload) {
            if(!payload) return { qa: [], steps: [] };
            if(Array.isArray(payload)) return { qa: payload, steps: [] }; // Legacy format
            return {
                qa: Array.isArray(payload.qaChecks) ? payload.qaChecks : (payload.qaChecks ? Object.keys(payload.qaChecks).map(k=>payload.qaChecks[k]) : []),
                steps: Array.isArray(payload.steps) ? payload.steps : (payload.steps ? Object.keys(payload.steps).map(k=>payload.steps[k]) : [])
            };
        }

        // Sub-assemblies routing if present and NO TARGET OVERRIDE
        if(currentWO && currentWO.routing && !window.activePrintTargetOverride && !(document.getElementById('sopModalWrapper') && document.getElementById('sopModalWrapper').style.display !== 'none')) {
            Object.keys(currentWO.routing).forEach(sub => {
                if(currentWO.routing[sub].build > 0) {
                    let subPayload = extractPayload(sopsDB[sub]);
                    if(subPayload.qa.length > 0 || subPayload.steps.length > 0) {
                        let is3D = typeof productsDB !== 'undefined' && productsDB[sub] && productsDB[sub].is_3d_print;
                        let emo = is3D ? '🖨️' : '⚙️';
                        let tp = is3D ? '3D Print' : 'Build Sub-Assembly';
                        
                        if(subPayload.qa.length > 0) {
                            checklistsToRender.push({ isHeader: true, text: `${emo} ${tp}: ${sub}` });
                            checklistsToRender = checklistsToRender.concat(subPayload.qa);
                        }
                        if(subPayload.steps.length > 0) {
                            richtextStepsToRender.push({ isHeader: true, text: `${emo} ${tp}: ${sub}` });
                            richtextStepsToRender = richtextStepsToRender.concat(subPayload.steps);
                        }
                    }
                }
            });
        }

        // Main steps
        let mainPayload = extractPayload(sopsDB[targetProductName]);
        if(mainPayload.qa.length > 0 || mainPayload.steps.length > 0 || checklistsToRender.length > 0 || richtextStepsToRender.length > 0) {
            let is3D = typeof productsDB !== 'undefined' && productsDB[targetProductName] && productsDB[targetProductName].is_3d_print;
            let emo = is3D ? '🖨️' : '⚙️';
            let tp = is3D ? '3D Print' : (window.activePrintTargetOverride ? 'Sub-Assembly' : 'Final Assembly');
            let mainHeader = window.activePrintTargetOverride ? `${emo} ${tp}: ${targetProductName}` : `📦 Final Assembly: ${targetProductName}`;

            if(mainPayload.qa.length > 0) {
                checklistsToRender.push({ isHeader: true, text: mainHeader }); 
                checklistsToRender = checklistsToRender.concat(mainPayload.qa); 
            }
            if(mainPayload.steps.length > 0) {
                richtextStepsToRender.push({ isHeader: true, text: mainHeader });
                richtextStepsToRender = richtextStepsToRender.concat(mainPayload.steps);
            }
        }

        // Fetch Global Rich Text if requested
        if(printType === 'richtext' || printType === 'full') {
            let pData = productsDB[targetProductName];
            if(pData && pData.sop_richtext) {
                globalRichTextHTML = pData.sop_richtext;
                hasRichText = true;
            }
            if(richtextStepsToRender.length > 0) {
                hasRichText = true;
            }
        }

        let mappedChecklist = checklistsToRender.map(s => (s.isHeader || typeof s !== 'string') ? s : {text: s, attachments: []});
        let mappedRichText = richtextStepsToRender.map(s => (s.isHeader || typeof s !== 'string') ? s : {text: s, attachments: []});

        // 2. BUILD HTML HEAD & CSS
        let html = `<html><head><title>SOP - ${headerTitle}</title>
<style>
body { font-family: sans-serif; padding: 20px; font-size: 13px; max-width: 800px; margin: 0 auto; color: #333; }
hr { border: 0; border-top: 2px solid #0ea5e9; margin: 20px 0; }
.header { background: #f1f5f9; padding: 10px; font-weight: bold; font-size: 16px; margin: 25px 0 15px 0; border-left: 5px solid #0ea5e9; border-radius: 4px; }
.step { margin-bottom: 12px; display: flex; align-items: flex-start; gap: 12px; font-size: 14px; line-height: 1.5; }
.step-checkbox { width: 16px; height: 16px; border: 2px solid #ccc; border-radius: 3px; margin-top: 2px; flex-shrink: 0; }
.step-content { flex: 1; }
.telemetry-header { font-weight: bold; font-size: 18px; color: #0ea5e9; margin-top: 15px; margin-bottom: 8px; border-bottom: 1px dashed #ccc; padding-bottom: 4px; }
.telemetry-subtext { font-size: 12px; color: #666; font-style: italic; margin-left: 5px; }
img { max-width: 100%; max-height: 350px; display: block; margin-top: 10px; border-radius: 6px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
a { color: #0ea5e9; font-weight: bold; margin-right: 15px; text-decoration: none; }
h2 { margin: 0 0 5px 0; font-size: 24px; color: #111; }
h3 { margin: 0 0 10px 0; font-size: 16px; color: #555; }
.richtext-container { margin-top: 30px; padding-top: 20px; border-top: 3px solid #f59e0b; }
.richtext-container img { max-width: 100%; height: auto; }
</style></head><body>`;
        
        html += `<h2>Compiled SOP Document</h2><h3>${headerTitle}</h3><hr>`;

        // 3. RENDER CHECKLIST
        if(printType === 'checklist' || printType === 'full') {
            if(mappedChecklist.length === 0) {
                html += `<p style="color:#666; font-style:italic;">No checklist steps defined.</p>`;
            } else {
                mappedChecklist.forEach((s) => {
                    if(s.isHeader) { 
                        html += `<div class="header">${s.text}</div>`; 
                    } else { 
                        // Parse standard text through telemetry engine logic to convert markdown-like syntax
                        let parsedHTML = parseProductionTelemetryLine(s.text, -1);
                        
                        // Prevent checkboxes from appearing next to headers and subtexts
                        if (s.text.startsWith('# ') || s.text.startsWith('> ') || s.text.startsWith('[INPUT]') || s.text.startsWith('[CAMERA]')) {
                            html += `<div class="step-content" style="margin-top:10px; margin-bottom:6px;">${parsedHTML}</div>`;
                        } else {
                            html += `<div class="step">
                                        <div class="step-checkbox"></div>
                                        <div class="step-content">${parsedHTML}</div>
                                     </div>`; 
                        }
                    }
                });
            }
        }

        // 4. RENDER RICH TEXT
        if(printType === 'richtext' || printType === 'full') {
            if(hasRichText) {
                html += `<div class="richtext-container">
                            <h2 style="color:#f59e0b; margin-bottom:20px;">SOP Documentation</h2>`;
                
                if (globalRichTextHTML) {
                    html += `<div style="margin-bottom:30px;">${globalRichTextHTML}</div>`;
                }

                if (mappedRichText.length > 0) {
                    let stepCounter = 1;
                    mappedRichText.forEach((s) => {
                        if (s.isHeader) {
                            html += `<div class="header" style="background:rgba(245,158,11,0.05); border-left-color:#F59E0B;">${s.text}</div>`;
                            stepCounter = 1; // Reset steps per assembly
                        } else {
                            let content = typeof parseProductionTelemetryLine === 'function' ? parseProductionTelemetryLine(s.text || '', -1) : s.text || '';
                            html += `<div style="margin-bottom:25px; padding-bottom:15px; border-bottom:1px dashed #ccc;">
                                        <strong style="color:#F59E0B; font-size:16px; display:block; margin-bottom:10px;">Step ${stepCounter++}</strong>
                                        <div style="font-size:15px; line-height:1.6; white-space:pre-wrap;">${content}</div>
                                     </div>`;
                        }
                    });
                }

                html += `</div>`;
            } else if (printType === 'richtext') {
                html += `<p style="color:#666; font-style:italic;">No Rich Text Documentation exists for this SOP.</p>`;
            }
        }

        html += `</body></html>`; 
        
        let win = window.open('', '', 'width=800,height=800'); 
        win.document.write(html); 
        win.document.close(); 
        
        // Slight delay to allow image loading before triggering print dialog
        setTimeout(() => win.print(), 700);
        
    } catch(e) { 
        sysLog("Print Engine Error: " + e.message, true); 
    }
}

function parseProductionTelemetryLine(q, contextIdx) {
    let html;

    function parseInputs(text) { return text.replace(/\[INPUT\]/gi, `<input type="text" placeholder="..." style="padding:4px 8px; border-radius:4px; background:rgba(255,255,255,0.1); border:1px solid #10b981; color:#fff; font-family:monospace; font-size:12px; width:120px; font-weight:bold; margin:0 6px;">`); }

    function parseImgs(text) {
        text = text.replace(/\[PDF:(https?:\/\/[^\]]+)\]/gi, (_, url) => { const safe = url.replace(/'/g, "\\'"); return `<button type="button" data-click="click_openPdf" data-url="${safe}" class="btn-slate-muted">📄 View PDF</button>`; });
        text = text.replace(/\[VID:(https?:\/\/[^\]]+)\]/gi, (_, url) => { const safe = url.replace(/'/g, "\\'"); return `<button type="button" data-click="click_openVideo" data-url="${safe}" class="btn-blue-muted">🎥 Play Video</button>`; });
        text = text.replace(/\[IMG:(https?:\/\/[^\]]+)\]/gi, (_, url) => {
            const safe = url.replace(/'/g, "\\'");
            if(url.toLowerCase().endsWith('.pdf')) { return `<button type="button" data-click="click_openPdf" data-url="${safe}" class="btn-slate-muted">📄 View PDF</button>`; }
            if(url.toLowerCase().endsWith('.mp4') || url.toLowerCase().endsWith('.webm')) { return `<button type="button" data-click="click_openVideo" data-url="${safe}" class="btn-blue-muted">🎥 Play Video</button>`; }
            return `<img src="${url}" loading="lazy" style="max-height:80px; max-width:100%; border-radius:6px; border:1px solid var(--border-color); cursor:zoom-in; margin:4px 2px; display:inline-block; vertical-align:middle;" data-click="click_openImage" data-url="${safe}">`;
        });
        return text;
    }

    function parseBarcodes(text) { return text.replace(/\[BARCODE:([^\]]+)\]/gi, (_, val) => { const id = `sop-bc-prod-${contextIdx}-${Math.random().toString(36).substring(7)}`; return `<svg id="${id}" data-value="${val.trim()}" class="sop-barcode-svg" style="max-width:200px; background:white; padding:6px; border-radius:6px; display:block; margin:4px 0;"></svg>`; }); }

    function parseQR(text) { return text.replace(/\[QR:([^\]]+)\]/gi, (_, val) => { const id = `sop-qr-prod-${contextIdx}-${Math.random().toString(36).substring(7)}`; return `<canvas id="${id}" data-value="${val.trim()}" class="sop-qr-canvas" style="border-radius:6px; display:block; margin:4px 0;"></canvas>`; }); }

    function parseScan(text) { return text.replace(/\[SCAN:([^\]]+)\]/gi, (_, val) => { return `<span style="background:rgba(14,165,233,0.15); border:1px solid #0ea5e9; color:#0ea5e9; padding:2px 8px; border-radius:12px; font-size:11px; font-weight:800; white-space:nowrap; margin:0 4px; vertical-align:middle;">📷 SCAN: ${val.trim()}</span>`; }); }

    function parseAll(text) { return parseQR(parseBarcodes(parseImgs(parseInputs(parseScan(text))))); }

    if (/^\[IMG:(https?:\/\/[^\]]+)\]$/i.test(q)) {
        const url = q.match(/\[IMG:(https?:\/\/[^\]]+)\]/i)[1];
        const safe = url.replace(/'/g, "\\'");
        html = `<div style="margin:4px 0;"><img src="${url}" loading="lazy" style="max-width:100%; max-height:200px; border-radius:8px; border:1px solid var(--border-color); cursor:zoom-in;" data-click="click_openImage" data-url="${safe}"></div>`;
    } else if (/^\[BARCODE:([^\]]+)\]$/i.test(q)) {
        const val = q.match(/\[BARCODE:([^\]]+)\]/i)[1].trim();
        const id = `sop-bc-prod-${contextIdx}-${Math.random().toString(36).substring(7)}`;
        html = `<div style="margin:4px 0; padding:8px; background:white; border-radius:8px; display:inline-block;"><svg id="${id}" data-value="${val}" class="sop-barcode-svg"></svg></div>`;
    } else if (/^\[QR:([^\]]+)\]$/i.test(q)) {
        const val = q.match(/\[QR:([^\]]+)\]/i)[1].trim();
        const id = `sop-qr-prod-${contextIdx}-${Math.random().toString(36).substring(7)}`;
        html = `<div style="margin:4px 0;"><canvas id="${id}" data-value="${val}" class="sop-qr-canvas"></canvas></div>`;
    } else if (q.startsWith('[INPUT]') && q.match(/\[INPUT\]/gi).length === 1 && q.indexOf('[INPUT]') === 0) {
        let label = q.replace(/\[INPUT\]/ig, '').trim();
        html = `<div style="display:flex; justify-content:space-between; align-items:center; gap:8px; margin-top:2px; margin-bottom:2px; padding:6px 10px; background:var(--bg-panel); border:1px solid var(--border-color); border-radius:6px; width:100%;"><label style="font-size:12px; font-weight:900; color:#F59E0B; text-transform:uppercase; flex-shrink:0;">${label}</label><input type="text" placeholder="..." style="flex:1; padding:6px; border-radius:4px; background:var(--bg-input); border:1px solid var(--border-color); color:#fff; font-family:monospace; font-size:13px; font-weight:bold;"></div>`;
    } else if (q.startsWith('[CAMERA]') && q.match(/\[CAMERA\]/gi).length === 1 && q.indexOf('[CAMERA]') === 0) {
        let label = q.replace(/\[CAMERA\]/ig, '').trim();
        if(!label) label = "Camera Log";
        html = `<div style="display:flex; justify-content:space-between; align-items:center; gap:8px; margin-top:2px; margin-bottom:2px; padding:6px 10px; background:var(--bg-panel); border:1px solid var(--border-color); border-radius:6px; width:100%;"><label style="font-size:12px; font-weight:900; color:#F59E0B; text-transform:uppercase; flex-shrink:0;">${label}</label><div style="flex:1; display:flex; flex-direction:column; align-items:flex-end;"><button type="button" class="btn-orange-muted worker-photo-btn" data-click="click_workerTakePhoto" data-ctx="${contextIdx}" data-label="${label}" style="padding:6px 12px; font-size:12px; border-radius:6px; display:flex; align-items:center; gap:5px; width:100%; max-width:200px; justify-content:center;">📸 TAKE PHOTO</button><div id="worker-photo-res-${contextIdx}" style="display:none; margin-top:8px; width:100%; text-align:right;"></div></div></div>`;
    } else if (q.startsWith('# ')) {
        let content = parseAll(q.substring(2).trim());
        html = `<div style="font-size:14px; font-weight:900; color:#10b981; margin-top:8px; border-bottom:1px solid rgba(16,185,129,0.3); padding-bottom:4px; margin-bottom:4px; display:flex; align-items:center; flex-wrap:wrap; width:100%; line-height:1.4;">${content}</div>`;
    } else if (q.startsWith('> ')) {
        let content = parseAll(q.substring(2).trim());
        html = `<span style="display:flex; align-items:flex-start; flex-wrap:wrap; flex-direction:column; line-height:1.4; font-size:12px; font-weight:600; color:var(--text-muted); padding-left:4px;">${content}</span>`;
    } else {
        if(q.startsWith('- ')) q = q.substring(2).trim();
        let content = parseAll(q);
        html = `<span style="display:flex; align-items:flex-start; flex-wrap:wrap; flex-direction:column; line-height:1.4; font-size:13px; font-weight:700; color:var(--text-heading); flex:1;">${content}</span>`;
    }
    return html;
}

window.click_openSOPSnapshotCamera_production = function(e) {
    if(typeof e !== 'undefined' && e) e.preventDefault();
    window.activeSOPTextAreaId = 'productionAdminQA';
    if(typeof openSOPSnapshotCamera === 'function') openSOPSnapshotCamera();
};

window.click_openSOPSnapshotCamera_inlineProduction = function(btn) {
    if (btn && btn.dataset && btn.dataset.textid) {
        window.activeSOPTextAreaId = btn.dataset.textid;
    }
    if(typeof openSOPSnapshotCamera === 'function') openSOPSnapshotCamera();
};

window.click_openSOPSnapshotCamera_smart = function(btn) {
    let container = btn.closest('.sop-controls-container').querySelector('.attachments-container');
    if (!container) return;
    
    // Find first empty URL input
    let inputs = Array.from(container.querySelectorAll('.m-url'));
    let targetInput = inputs.find(i => i.value.trim() === '');
    
    // If all are full, create a new row
    if (!targetInput) {
        window.click_addAttachmentRow(btn);
        inputs = Array.from(container.querySelectorAll('.m-url'));
        targetInput = inputs[inputs.length - 1];
    }
    
    window.activeSOPTextAreaId = 'attachment';
    window.activeAttachmentInput = targetInput;
    if(typeof openSOPSnapshotCamera === 'function') openSOPSnapshotCamera();
};

window.click_addAttachmentRow = function(btn) {
    let container = btn.closest('.sop-controls-container').querySelector('.attachments-container');
    if (!container) return;
    
    let newRow = document.createElement('div');
    newRow.className = 'media-row media-row-dynamic';
    newRow.style.cssText = 'display:flex; gap:4px; align-items:center; margin-bottom:4px;';
    newRow.innerHTML = `
        <select class="m-type" style="border:1px solid var(--border-input); background:var(--bg-input); color:var(--text-main); padding:4px; border-radius:4px;">
            <option value="img" selected>🖼️ Image</option>
            <option value="doc">📄 Doc</option>
            <option value="vid">🎬 Vid</option>
        </select>
        <input type="text" class="m-url" value="" placeholder="URL" style="flex-grow:1; border:1px solid var(--border-input); background:var(--bg-input); color:var(--text-main); padding:4px; border-radius:4px; min-width:0;">
        <button type="button" class="btn-red-muted icon-btn btn-icon-sq" style="padding:4px 8px; border-radius:4px;" data-click="click_removeAttachmentRow">✕</button>
    `;
    container.appendChild(newRow);
};

window.click_openSOPSnapshotCamera_richText = function(btn) {
    window.activeSOPTextAreaId = 'richText';
    let sel = window.getSelection();
    if (sel.rangeCount > 0) {
        window.activeRichTextRange = sel.getRangeAt(0);
    } else {
        window.activeRichTextRange = null;
    }
    window.activeRichTextContainer = btn.closest('.sop-step-row').querySelector('.sop-text-rich');
    if(typeof openSOPSnapshotCamera === 'function') openSOPSnapshotCamera();
};

function processTelemetryCanvasRendering(container) {
    if (typeof JsBarcode !== 'undefined') {
        container.querySelectorAll('.sop-barcode-svg').forEach(el => {
            try { JsBarcode(el, el.dataset.value || 'NEOGLEAMZ', { format: 'CODE128', width: 1.8, height: 50, displayValue: true, fontSize: 11, margin: 6, lineColor: '#000', background: '#ffffff' }); }
            catch(e) { el.outerHTML = `<span style="color:#ef4444;font-size:11px;">⚠️ Barcode error: ${e.message}</span>`; }
        });
    }
    if (typeof QRCode !== 'undefined') {
        container.querySelectorAll('.sop-qr-canvas').forEach(el => {
            try { QRCode.toCanvas(el, el.dataset.value || 'https://neogleamz.com', { width: 80, margin: 1 }); }
            catch(e) { el.outerHTML = `<span style="color:#ef4444;font-size:11px;">⚠️ QR error: ${e.message}</span>`; }
        });
    }
}

function renderProductionTelemetryPreview() {
    try {
    const rawText = document.getElementById('productionAdminQA')?.value || '';
    const previewContainer = document.getElementById('productionAdminQAPreview');
    if(!previewContainer) return;

    if(!rawText.trim()) {
        previewContainer.innerHTML = window.safeHTML(
            `<div style="text-align:center; padding:40px; color:var(--text-muted); font-size:13px; font-style:italic;">Type in the telemetry editor to preview elements.</div>`
        );
        return;
    }

    const qaChecks = rawText.split('\n').filter(x => x.trim() !== '');
    let html = '';

    qaChecks.forEach((line, idx) => {
        let q = line.trim();
        if(!q) return;

        let contentHtml = parseProductionTelemetryLine(q, idx);

        if (q.startsWith('> ')) {
            html += `<label style="display:flex; align-items:flex-start; flex-wrap:wrap; gap:6px; font-size:11px; font-weight:600; color:var(--text-muted); cursor:pointer; padding:4px 8px 4px 28px; margin-bottom:0; border-radius:4px; transition:all 0.2s; width:100%;" onmouseover="this.style.background='rgba(16,185,129,0.05)'" onmouseout="this.style.background='transparent'"><input type="checkbox" disabled style="width:12px; height:12px; flex-shrink:0; cursor:not-allowed; margin-top:2px;">${contentHtml}</label>`;
        } else if (!q.startsWith('[INPUT]') && !q.startsWith('# ') && !/^\[(IMG|BARCODE|QR):/.test(q)) {
            html += `<label style="display:flex; align-items:flex-start; flex-wrap:wrap; gap:10px; cursor:pointer; padding:6px 10px; margin-bottom:4px; border:1px solid var(--border-color); border-radius:6px; background:var(--bg-panel); transition:all 0.2s; width:100%;" onmouseover="this.style.borderColor='#10b981'" onmouseout="this.style.borderColor='var(--border-color)'"><input type="checkbox" disabled style="width:16px; height:16px; flex-shrink:0; cursor:not-allowed; margin-top:2px;">${contentHtml}</label>`;
        } else {
            html += `<div style="width:100%; pointer-events:none; opacity:0.8;">${contentHtml}</div>`;
        }
    });

    previewContainer.innerHTML = window.safeHTML(html);
    processTelemetryCanvasRendering(previewContainer);
    } catch(e) { sysLog(e.message, true); }
}


let batchezDraggedGrpId = null;

function batchezSopDragStart(e, grpId) {
    batchezDraggedGrpId = grpId;
    e.target.style.opacity = '0.4';
    e.dataTransfer.effectAllowed = 'move';
}

function batchezSopDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
}

function batchezSopDragEnd(e) {
    e.target.style.opacity = '1';
}

function batchezSopDrop(e, targetGrpId, prodName) {
    e.preventDefault();
    e.target.style.opacity = '1';
    if (!batchezDraggedGrpId || batchezDraggedGrpId === targetGrpId) return;

    const container = document.getElementById('woSOPList');
    if (!container) return;
    const cards = Array.from(container.querySelectorAll('.sop-grp-card'));
    let srcIdx = cards.findIndex(c => c.id === 'sopgrp_' + batchezDraggedGrpId);
    let tgtIdx = cards.findIndex(c => c.id === 'sopgrp_' + targetGrpId);
    if (srcIdx < 0 || tgtIdx < 0) return;

    let currentSort = cards.map(c => c.id.replace('sopgrp_', ''));
    let movedItem = currentSort.splice(srcIdx, 1)[0];
    currentSort.splice(tgtIdx, 0, movedItem);

    localStorage.setItem('batchezSopSort_' + prodName, JSON.stringify(currentSort));
    if (currentWO) renderActiveWO(currentWO.wo_id);
}

function toggleBatchezSopGroup(grpId) {
    let body = document.getElementById('sopgrp_body_' + grpId);
    let icon = document.getElementById('sopgrp_icon_' + grpId);
    if(body.style.display === 'none') {
        body.style.display = 'block';
        icon.innerText = '▼';
        localStorage.setItem('batchezSopExpanded_' + grpId, 'true');
    } else {
        body.style.display = 'none';
        icon.innerText = '▶';
        localStorage.setItem('batchezSopExpanded_' + grpId, 'false');
    }
}


window.activeInlineSopEditors = window.activeInlineSopEditors || {};
window.toggleInlineEditor = function(id) {
    try {
    window.activeInlineSopEditors[id] = !window.activeInlineSopEditors[id];
    if(typeof currentPrintJob !== "undefined" && currentPrintJob && currentPrintJob.id && document.getElementById("paneProdPrint") && document.getElementById("paneProdPrint").style.display !== "none") {
        if(typeof renderActivePrintJob === "function") renderActivePrintJob(currentPrintJob.id);
    } else {
        if(typeof renderActiveWO === "function" && typeof currentWO !== "undefined" && currentWO) renderActiveWO(currentWO.wo_id);
    }
    setTimeout(() => {
        if(window.activeInlineSopEditors[id] && typeof inlineRenderTelemetryPreview === 'function') {
            inlineRenderTelemetryPreview(id);
        }
    }, 150);
    } catch(e) { sysLog(e.message, true); }
};

window.saveInlineSopBlock = async function(grpId, productName) {
    try {
        let stepsContainer = 'inlineSopSteps_' + grpId;
        // Check if extractSOPDataFromUI is available globally, which it is in production-module.js
        let steps = typeof extractSOPDataFromUI === 'function' ? extractSOPDataFromUI(stepsContainer) : [];
        if (typeof extractSOPDataFromUI !== 'function') {
            sysLog('extractSOPDataFromUI is not defined!', true);
        }

        let rawQa = document.getElementById('inlineSopQA_' + grpId)?.value || '';
        let qaLines = rawQa.trim() === '' ? [] : rawQa.split('\n').map(l=>l.trim());

        const payload = { qaChecks: qaLines, steps: steps };
        if(typeof sopsDB !== 'undefined') sopsDB[productName] = payload;
        if(typeof sysLog === 'function') sysLog('Saving Inline SOP for ' + productName);

        if(typeof supabaseClient !== 'undefined') {
            const {error} = await supabaseClient.from('production_sops').upsert({product_name: productName, steps: payload}, {onConflict: 'product_name'});
            if(error) throw new Error(error.message);
        }

        // Turn off inline edit mode for this item
        window.activeInlineSopEditors[grpId] = false;

        // Rerender view
        if(typeof currentPrintJob !== "undefined" && currentPrintJob && currentPrintJob.id && document.getElementById("paneProdPrint") && document.getElementById("paneProdPrint").style.display !== "none") {
            if(typeof renderActivePrintJob === "function") renderActivePrintJob(currentPrintJob.id);
        } else {
            if(typeof renderActiveWO === "function" && typeof currentWO !== "undefined" && currentWO) renderActiveWO(currentWO.wo_id);
        }

    } catch(e) {
        if(typeof sysLog === 'function') sysLog(e.message, true);
        alert("Failed to save SOP: " + e.message);
    }
};

window.addInlineSOPRow = function(grpId) {
    try {
        let newRow = document.createElement('div');
        newRow.innerHTML = window.safeHTML(
            typeof generateEditableSOPRow === 'function' ? generateEditableSOPRow({}, 999) : ''
        );
        let rowNode = newRow.firstChild;
        let area = document.getElementById('inlineSopSteps_' + grpId);
        if(area && rowNode) area.appendChild(rowNode);
    } catch(e) { console.error(e); }
};

window.toggleHorizontalPreview = function(paneId, colId, btnEl) {
    let pane = document.getElementById(paneId);
    let col = document.getElementById(colId);
    if (!pane || !col) return;

    let inputCol = col.previousElementSibling;
    let currentInputWidth = inputCol.getBoundingClientRect().width;
    let wrapper = pane.parentElement;
    let wrapperWidth = wrapper.getBoundingClientRect().width;

    if (col.style.display === 'none') {
        col.style.display = 'flex';
        btnEl.style.background = 'rgba(59,130,246,0.1)';

        let newPaneWidth = currentInputWidth * 2 + 15;
        if(newPaneWidth > wrapperWidth * 0.70) newPaneWidth = wrapperWidth * 0.70;

        pane.style.flex = '0 0 ' + newPaneWidth + 'px';
        pane.style.width = newPaneWidth + 'px';
    } else {
        col.style.display = 'none';
        btnEl.style.background = 'transparent';

        let targetWidth = currentInputWidth;
        if(targetWidth > wrapperWidth * 0.35) targetWidth = wrapperWidth * 0.35;

        pane.style.flex = '0 0 ' + targetWidth + 'px';
        pane.style.width = targetWidth + 'px';
    }
};

window.isInlineResizing = false;
window.currentInlineResizeGrp = null;


window.inlineRenderTelemetryPreview = function(grpId) {
    try {
    const rawText = document.getElementById('inlineSopQA_' + grpId)?.value || '';
    const previewContainer = document.getElementById('inlineSopQAPreview_' + grpId);
    if(!previewContainer) return;

    if(!rawText.trim()) {
        previewContainer.innerHTML = window.safeHTML(
            `<div style="text-align:center; padding:40px; color:var(--text-muted); font-size:13px; font-style:italic;">Type in the telemetry editor to preview elements.</div>`
        );
        return;
    }

    const qaChecks = rawText.split('\n').filter(x => x.trim() !== '');
    let html = '';

    qaChecks.forEach((line, idx) => {
        let q = line.trim();
        if(!q) return;

        let contentHtml = typeof parseProductionTelemetryLine === 'function' ? parseProductionTelemetryLine(q, idx) : q;

        if (q.startsWith('> ')) {
            html += `<label style="display:flex; align-items:flex-start; flex-wrap:wrap; gap:6px; font-size:11px; font-weight:600; color:var(--text-muted); cursor:pointer; padding:4px 8px 4px 28px; margin-bottom:0; border-radius:4px; transition:all 0.2s; width:100%;" onmouseover="this.style.background='rgba(16,185,129,0.05)'" onmouseout="this.style.background='transparent'"><input type="checkbox" disabled style="width:12px; height:12px; flex-shrink:0; cursor:not-allowed; margin-top:2px;">${contentHtml}</label>`;
        } else if (!q.startsWith('[INPUT]') && !q.startsWith('# ') && !/^\[(IMG|BARCODE|QR):/.test(q)) {
            html += `<label style="display:flex; align-items:flex-start; flex-wrap:wrap; gap:10px; cursor:pointer; padding:6px 10px; margin-bottom:4px; border:1px solid var(--border-color); border-radius:6px; background:var(--bg-panel); transition:all 0.2s; width:100%;" onmouseover="this.style.borderColor='#10b981'" onmouseout="this.style.borderColor='var(--border-color)'"><input type="checkbox" disabled style="width:16px; height:16px; flex-shrink:0; cursor:not-allowed; margin-top:2px;">${contentHtml}</label>`;
        } else {
            html += `<div style="width:100%; pointer-events:none; opacity:0.8;">${contentHtml}</div>`;
        }
    });

    previewContainer.innerHTML = window.safeHTML(
        html || `<div style="text-align:center; padding:40px; color:var(--text-muted); font-size:13px; font-style:italic;">No checklist steps to preview.</div>`
    );

    if (typeof processTelemetryCanvasRendering === 'function') {
        processTelemetryCanvasRendering(previewContainer);
    }
    } catch(e) { sysLog(e.message, true); }
};

function buildDraftModalHtml(wo, drafts) {
    try {
    let ht = '';

    // Direct Raws
    let directRaws = getDirectMaterials(wo.product_name, wo.qty);
    if(Object.keys(directRaws).length > 0) {
        ht += `<div class="kitting-card" style="box-sizing:border-box; flex: 1 1 400px;"><h4>📦 Direct Raw Materials</h4>`;
        Object.keys(directRaws).forEach(k => {
            let req = directRaws[k]; let c = catalogCache[k] || {}; let is3D = k.startsWith('RECIPE:::'); let f = fmtKey(k); let name = is3D ? k.replace('RECIPE:::', '') : (f.nn ? f.nn : (c.itemName || f.in)); let displaySpec = is3D ? "" : (c.spec === "(Mixed Specs)" ? "⚙️ (Mixed Specs)" : (c.spec ? `⚙️ ${c.spec}` : ""));
            let curVal = drafts[k] ? drafts[k] : '';
            ht += `<div class="checklist-item" style="padding: 10px 15px; display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.05);">
                <div class="chk-text" style="font-size:14px; flex-grow:1; font-weight:bold;">${name} <div style="color:var(--text-muted); font-size:11px; font-weight:normal; margin-top:2px;">${displaySpec}</div></div>
                <div style="display:flex; gap:12px;">
                    <div style="display:flex; flex-direction:column; align-items:center;">
                        <span style="font-size:10px; color:var(--text-muted); text-transform:uppercase; margin-bottom:4px; font-weight:bold;">Pulled</span>
                        <input type="text" disabled value="${req.toFixed(2)}" style="width:65px; background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.1); color:var(--text-muted); text-align:center; padding:6px; border-radius:6px; font-weight:bold; cursor:not-allowed;">
                    </div>
                    <div style="display:flex; flex-direction:column; align-items:center;">
                        <span style="font-size:10px; color:#ef4444; text-transform:uppercase; margin-bottom:4px; font-weight:bold;">Loss</span>
                        <input type="number" class="wo-scrap-input" data-key="${k}" min="0" step="any" placeholder="0" value="${curVal}" style="width:65px; background:var(--bg-input); border:1px solid rgba(239, 68, 68, 0.4); color:#ef4444; padding:6px; border-radius:6px; text-align:center; font-weight:bold; font-size:14px;" />
                    </div>
                </div>
            </div>`;
        });
        ht += `</div>`;
    }

    let exactDeds = calculateExactWODeductions(wo);
    let shelfPulls = [];
    Object.keys(exactDeds.pulls).forEach(k => {
        shelfPulls.push({name: k.replace('RECIPE:::', ''), q: exactDeds.pulls[k]});
    });

    if(shelfPulls.length > 0) {
        ht += `<div class="kitting-card route-card-pull" style="box-sizing:border-box; flex: 1 1 400px;"><h4>🟢 Pull Pre-Built from Shelf</h4>`;
        shelfPulls.forEach(sub => {
            let is3D = typeof productsDB !== 'undefined' && productsDB[sub.name] && productsDB[sub.name].is_3d_print;
            let icon = is3D ? '🖨️' : '⚙️';
            let k = `RECIPE:::${sub.name}`;
            let curVal = drafts[k] ? drafts[k] : '';
            ht += `<div class="checklist-item" style="padding: 10px 15px; display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.05);">
                <div class="chk-text" style="font-size:14px; color:#10b981; flex-grow:1; font-weight:bold;">${icon} ${sub.name}</div>
                <div style="display:flex; gap:12px;">
                    <div style="display:flex; flex-direction:column; align-items:center;">
                        <span style="font-size:10px; color:var(--text-muted); text-transform:uppercase; margin-bottom:4px; font-weight:bold;">Pulled</span>
                        <input type="text" disabled value="${sub.q.toFixed(2)}" style="width:65px; background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.1); color:var(--text-muted); text-align:center; padding:6px; border-radius:6px; font-weight:bold; cursor:not-allowed;">
                    </div>
                    <div style="display:flex; flex-direction:column; align-items:center;">
                        <span style="font-size:10px; color:#ef4444; text-transform:uppercase; margin-bottom:4px; font-weight:bold;">Loss</span>
                        <input type="number" class="wo-scrap-input" data-key="${k}" min="0" step="any" placeholder="0" value="${curVal}" style="width:65px; background:var(--bg-input); border:1px solid rgba(239, 68, 68, 0.4); color:#ef4444; padding:6px; border-radius:6px; text-align:center; font-weight:bold; font-size:14px;" />
                    </div>
                </div>
            </div>`;
        });
        ht += `</div>`;
    }

    // Build from Scratch Sub-assemblies
    if(exactDeds.built_subs) {
        let sortedSubs = Object.keys(exactDeds.built_subs).sort((a, b) => {
            let cleanA = a.replace('RECIPE:::', '');
            let cleanB = b.replace('RECIPE:::', '');
            let is3DA = typeof productsDB !== 'undefined' && productsDB[cleanA] && productsDB[cleanA].is_3d_print ? 1 : 0;
            let is3DB = typeof productsDB !== 'undefined' && productsDB[cleanB] && productsDB[cleanB].is_3d_print ? 1 : 0;
            if (is3DA !== is3DB) return is3DA - is3DB; // 0 for Sub, 1 for 3D Print, so Subs come first
            return cleanA.localeCompare(cleanB);
        });

        sortedSubs.forEach(subK => {
            let qty = exactDeds.built_subs[subK];
            if(qty > 0) {
                let cleanSubName = subK.replace('RECIPE:::', '');
                let isTop3D = typeof productsDB !== 'undefined' && productsDB[cleanSubName] && productsDB[cleanSubName].is_3d_print;
                let titleEmoji = isTop3D ? '🖨️' : '⚙️';

                let subDirect = getDirectMaterials(cleanSubName, qty);
                if(Object.keys(subDirect).length > 0) {
                    let topScrapKey = subK;
                    let topCurVal = drafts[topScrapKey + '__BUILD'] ? drafts[topScrapKey + '__BUILD'] : '';
                    ht += `<div class="kitting-card route-card-build" style="box-sizing:border-box; flex: 1 1 400px;"><h4>🟠 Build: ${titleEmoji} ${cleanSubName}</h4>`;

                    // Add top-level loss row for the entire sub-assembly
                    ht += `<div class="checklist-item" style="padding: 10px 15px; display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #ef4444; background-color: rgba(239, 68, 68, 0.05); margin-bottom: 5px;">
                        <div class="chk-text" style="font-size:14px; flex-grow:1; font-weight:bold; color:#ef4444;">🚨 SCRAP ENTIRE: ${cleanSubName} <div style="font-size:10px; color:var(--text-muted); font-weight:normal; margin-top:2px;">Scrapping this will forcefully deduct its required raw materials from stock.</div></div>
                        <div style="display:flex; gap:12px;">
                            <div style="display:flex; flex-direction:column; align-items:center;">
                                <span style="font-size:10px; color:#ef4444; text-transform:uppercase; margin-bottom:4px; font-weight:bold;">Loss</span>
                                <input type="number" class="wo-scrap-input" data-key="${topScrapKey}__BUILD" min="0" step="any" placeholder="0" value="${topCurVal}" style="width:65px; background:var(--bg-input); border:1px solid rgba(239, 68, 68, 0.4); color:#ef4444; padding:6px; border-radius:6px; text-align:center; font-weight:bold; font-size:14px;" />
                            </div>
                        </div>
                    </div>`;

                    Object.keys(subDirect).forEach(k => {
                        let req = subDirect[k]; let c = catalogCache[k] || {}; let isRecipe = k.startsWith('RECIPE:::'); let f = fmtKey(k); let cleanName = isRecipe ? k.replace('RECIPE:::', '') : (f.nn ? f.nn : (c.itemName || f.in));
                        let isPart3D = isRecipe && typeof productsDB !== 'undefined' && productsDB[cleanName] && productsDB[cleanName].is_3d_print;
                        let emojiPrefix = isPart3D ? '🖨️' : (isRecipe ? '⚙️' : '');
                        let name = `${emojiPrefix} ${cleanName}`.trim();
                        let displaySpec = isRecipe ? "" : (c.spec === "(Mixed Specs)" ? " (Mixed Specs)" : (c.spec ? `${c.spec}` : ""));
                        let curVal = drafts[k] ? drafts[k] : '';
                        ht += `<div class="checklist-item" style="padding: 10px 15px; display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.05);">
                            <div class="chk-text" style="font-size:14px; flex-grow:1; font-weight:bold;">${name} <div style="color:var(--text-muted); font-size:11px; font-weight:normal; margin-top:2px;">${displaySpec}</div></div>
                            <div style="display:flex; gap:12px;">
                                <div style="display:flex; flex-direction:column; align-items:center;">
                                    <span style="font-size:10px; color:var(--text-muted); text-transform:uppercase; margin-bottom:4px; font-weight:bold;">Pulled</span>
                                    <input type="text" disabled value="${req.toFixed(2)}" style="width:65px; background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.1); color:var(--text-muted); text-align:center; padding:6px; border-radius:6px; font-weight:bold; cursor:not-allowed;">
                                </div>
                                <div style="display:flex; flex-direction:column; align-items:center;">
                                    <span style="font-size:10px; color:#ef4444; text-transform:uppercase; margin-bottom:4px; font-weight:bold;">Loss</span>
                                    <input type="number" class="wo-scrap-input" data-key="${k}" min="0" step="any" placeholder="0" value="${curVal}" style="width:65px; background:var(--bg-input); border:1px solid rgba(239, 68, 68, 0.4); color:#ef4444; padding:6px; border-radius:6px; text-align:center; font-weight:bold; font-size:14px;" />
                                </div>
                            </div>
                        </div>`;
                    });
                    ht += `</div>`;
                }
            }
        });
    }

    if (ht === '') {
        ht = `<div style="text-align:center; padding:15px; width:100%; color:var(--text-muted);">No materials pulled for this batch.</div>`;
    }

    return ht;
    } catch(e) { sysLog(e.message, true); return ''; }
}

window.submitFinalizeWo = async function() {
    try {
        await window.executeWithButtonAction('finalizeWoActionBtn', '💾 FINALIZING...', '✅ FINALIZED', async () => {
            let scrapInputs = document.querySelectorAll('.wo-scrap-input');
        let upsKeys = new Set();
        let totalScrapEntries = 0;
        let directUpserts = {};

        scrapInputs.forEach(input => {
            let v = parseFloat(input.value) || 0;
            if (v > 0) {
                let k = input.getAttribute('data-key');
                directUpserts[k] = (directUpserts[k] || 0) + v;
            }
        });

        let spawnedScrapWOs = [];
        let spawnedScrapPrints = [];

        let pNameClean = currentWO.product_name.replace('RECIPE:::', '');
        let isTopLevelSub = typeof isSubassemblyDB !== 'undefined' && !!isSubassemblyDB[pNameClean];
        let isTopLevel3D = typeof productsDB !== 'undefined' && !!(productsDB[pNameClean] && productsDB[pNameClean].is_3d_print);
        let isScrapRebuildTicket = currentWO.label && currentWO.label.includes('[SCRAP REBUILD]');
        let isYieldEnforced = isScrapRebuildTicket ? true : (!isTopLevelSub && !isTopLevel3D);

        Object.keys(directUpserts).forEach(k => {
            let v = directUpserts[k];
            let actualK = k.endsWith('__BUILD') ? k.replace('__BUILD', '') : k;

            if(!inventoryDB[actualK]) inventoryDB[actualK]={consumed_qty:0, manual_adjustment:0, produced_qty:0, sold_qty:0, min_stock:0, scrap_qty:0, prototype_consumed_qty:0, assembly_consumed_qty:0, production_consumed_qty:0, prototype_produced_qty:0};

            inventoryDB[actualK].scrap_qty = (inventoryDB[actualK].scrap_qty || 0) + v;
            upsKeys.add(actualK);
            totalScrapEntries++;

            if (isYieldEnforced) {
                let cleanK = actualK.replace('RECIPE:::', '');
                let is3D = productsDB[cleanK] && productsDB[cleanK].is_3d_print;

                if (k.endsWith('__BUILD')) {
                    // Instantly spawn a Scrap Rebuild recovery ticket instead of magically mapping inventory loss below.
                    let recoveryWoId = "WO-" + Date.now().toString().slice(-4) + "-" + Math.random().toString(36).substring(2, 7).toUpperCase();

                    spawnedScrapWOs.push({
                        wo_id: recoveryWoId,
                        product_name: cleanK,
                        qty: v,
                        label: `[SCRAP REBUILD] (fr: ${currentWO.wo_id})`,
                        status: 'Queued',
                        wip_state: { batch_type: currentWO.batch_type || 'Production' },
                        routing: {}
                    });
                } else if (is3D) {
                    let recoveryWoId = "WO-" + Date.now().toString().slice(-4) + "-" + Math.random().toString(36).substring(2, 7).toUpperCase();
                    spawnedScrapPrints.push({
                        part_name: cleanK,
                        qty: v,
                        wo_id: recoveryWoId,
                        label: `[SCRAP REBUILD] (fr: ${currentWO.wo_id})`
                    });
                }
            }
        });

        if(upsKeys.size > 0) {
            setMasterStatus("Logging Scrap...", "mod-working");
            let ups = Array.from(upsKeys).map(k => ({
                item_key: k,
                consumed_qty: inventoryDB[k].consumed_qty,
                manual_adjustment: inventoryDB[k].manual_adjustment,
                produced_qty: inventoryDB[k].produced_qty,
                sold_qty: inventoryDB[k].sold_qty,
                min_stock: inventoryDB[k].min_stock,
                scrap_qty: inventoryDB[k].scrap_qty,
                prototype_consumed_qty: inventoryDB[k].prototype_consumed_qty||0,
                assembly_consumed_qty: inventoryDB[k].assembly_consumed_qty||0,
                production_consumed_qty: inventoryDB[k].production_consumed_qty||0,
                prototype_produced_qty: inventoryDB[k].prototype_produced_qty||0
            }));
            await supabaseClient.from('inventory_consumption').upsert(ups, {onConflict:'item_key'});
        }

        if (spawnedScrapWOs.length > 0 || spawnedScrapPrints.length > 0) {
            setMasterStatus("Deploying Replacements...", "mod-working");
            if (spawnedScrapWOs.length > 0) {
                const {error: scrapErr} = await supabaseClient.from('work_orders').insert(
                    spawnedScrapWOs.map(s => ({
                        wo_id: s.wo_id, product_name: s.product_name, qty: s.qty, label: s.label, status: s.status,
                        wip_state: s.wip_state, routing: s.routing
                    }))
                );
                if (scrapErr) throw new Error("Scrap WO Deploy Error: " + scrapErr.message);

                spawnedScrapWOs.forEach(s => workOrdersDB.unshift(s));

                // Queue any nested 3D prints required by these auto-recovery tickets
                for (let s of spawnedScrapWOs) {
                    if (productsDB[s.product_name] && productsDB[s.product_name].is_3d_print) {
                        if (typeof addPrintJob === 'function') {
                            await addPrintJob("RECIPE:::" + s.product_name, s.qty, s.wo_id, s.label);
                        }
                    } else {
                        const printsToSpawn = find3DPrintedComponents(s.product_name, s.qty, s.routing);
                        for (let part of Object.keys(printsToSpawn)) {
                            if (typeof addPrintJob === 'function') {
                                await addPrintJob("RECIPE:::" + part, printsToSpawn[part], s.wo_id, s.label);
                            }
                        }
                    }
                }
            }

            // Queue component-level 3D prints that were explicitly scrapped explicitly
            for (let p of spawnedScrapPrints) {
                if (typeof addPrintJob === 'function') {
                    await addPrintJob("RECIPE:::" + p.part_name, p.qty, p.wo_id, p.label);
                }
            }
        }

        setTimeout(() => {
            document.getElementById('finalizeWoModal').style.display = 'none';
        }, 800);
        sysLog(`Batch verified. ${totalScrapEntries} scrap line(s) logged.`);

        // Push payload forward into actual completion
        await advanceWO('Completed', true);
        });

    } catch (e) {
        sysLog(e.message, true);
        alert("Failed to submit Work Order finals.");
    }
};

window.openDraftScrapModal = function() {
    try {
    if (!currentWO) return;
    let w = currentWO.wip_state || {};
    let drafts = w.scrap_draft || {};
    let tableHtml = buildDraftModalHtml(currentWO, drafts);

    document.getElementById('finalizeWoHeaderBg').style.background = 'rgba(239, 68, 68, 0.1)';
    document.getElementById('finalizeWoHeaderBg').style.borderBottomColor = 'rgba(255,255,255,0.1)';
    document.getElementById('finalizeWoTitle').innerHTML = window.safeHTML('🗑️ Update Scrap Tally');
    document.getElementById('finalizeWoTitle').style.color = '#ef4444';

    let btn = document.getElementById('finalizeWoActionBtn');
    btn.className = 'btn-red';
    btn.innerHTML = window.safeHTML('Save Tally Draft');
    btn.onclick = window.saveDraftScrap;

    let m = document.getElementById('finalizeWoItemsList');
    if (m) {
        m.innerHTML = window.safeHTML(tableHtml);
        document.getElementById('finalizeWoModal').style.display = 'flex';
    }
    } catch(e) { sysLog(e.message, true); }
};

window.saveDraftScrap = async function() {
    try {
    if (!currentWO) return;
    
    await window.executeWithButtonAction('finalizeWoActionBtn', '💾 SAVING DRAFT...', '✅ DRAFT SAVED', async () => {
        let scrapInputs = document.querySelectorAll('.wo-scrap-input');
        let drafts = {};
        scrapInputs.forEach(input => {
            let v = parseFloat(input.value) || 0;
            if (v > 0) drafts[input.getAttribute('data-key')] = v;
        });

        if(!currentWO.wip_state) currentWO.wip_state = {};
        currentWO.wip_state.scrap_draft = drafts;

        setMasterStatus("Saving Scrap Draft...", "mod-working");
        
        let { error } = await supabaseClient.from('work_orders').update({ wip_state: currentWO.wip_state }).eq('wo_id', currentWO.wo_id);
        if (error) throw error;

        setTimeout(() => {
            document.getElementById('finalizeWoModal').style.display = 'none';
        }, 800);
        setMasterStatus("Draft Saved", "mod-success");
        setTimeout(() => setMasterStatus("Ready.", "status-idle"), 2000);
    });
    } catch(e) { sysLog(e.message, true); }
};

// ====== GLOBAL BINDINGS ======
if (typeof window !== 'undefined') {
    window.openNewWOModal = typeof openNewWOModal !== 'undefined' ? openNewWOModal : undefined;
    window.openMultiBatchModal = typeof openMultiBatchModal !== 'undefined' ? openMultiBatchModal : undefined;
    window.openSOPMasterModal = typeof openSOPMasterModal !== 'undefined' ? openSOPMasterModal : undefined;
    window.openArchiveExplorer = typeof openArchiveExplorer !== 'undefined' ? openArchiveExplorer : undefined;
    window.deleteWorkOrder = typeof deleteWorkOrder !== 'undefined' ? deleteWorkOrder : undefined;
    window.advanceWO = typeof advanceWO !== 'undefined' ? advanceWO : undefined;
    window.printPickList = typeof printPickList !== 'undefined' ? printPickList : undefined;
    window.printSOP = typeof printSOP !== 'undefined' ? printSOP : undefined;
    window.openPrintSOP = typeof openPrintSOP !== 'undefined' ? openPrintSOP : undefined;
    window.deleteAllArchive = typeof deleteAllArchive !== 'undefined' ? deleteAllArchive : undefined;
    window.closeArchiveExplorer = typeof closeArchiveExplorer !== 'undefined' ? closeArchiveExplorer : undefined;
    window.switchArchiveTab = typeof switchArchiveTab !== 'undefined' ? switchArchiveTab : undefined;
    window.hardDeleteArchive = typeof hardDeleteArchive !== 'undefined' ? hardDeleteArchive : undefined;
    window.closeSOPMasterModal = typeof closeSOPMasterModal !== 'undefined' ? closeSOPMasterModal : undefined;
    window.toggleInlineEditor = typeof toggleInlineEditor !== 'undefined' ? toggleInlineEditor : undefined;
    window.saveInlineSopBlock = typeof saveInlineSopBlock !== 'undefined' ? saveInlineSopBlock : undefined;
    window.addInlineSOPRow = typeof addInlineSOPRow !== 'undefined' ? addInlineSOPRow : undefined;
    window.toggleBatchezSopGroup = typeof toggleBatchezSopGroup !== 'undefined' ? toggleBatchezSopGroup : undefined;
    window.submitFinalizeWo = typeof submitFinalizeWo !== 'undefined' ? submitFinalizeWo : undefined;
    window.openDraftScrapModal = typeof openDraftScrapModal !== 'undefined' ? openDraftScrapModal : undefined;
    window.validateAndCreateWO = typeof validateAndCreateWO !== 'undefined' ? validateAndCreateWO : undefined;
}
