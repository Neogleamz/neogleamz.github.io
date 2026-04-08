// --- 10. 3D PRINT QUEUE MODULE ---

function formatPrintTime(mins) {
    if (!mins || isNaN(mins) || mins <= 0) return "";
    const h = Math.floor(mins / 60);
    const m = Math.round(mins % 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
}

let currentPrintJob = null;

async function refreshPrintQueue() {
    try {
        sysLog("Refreshing 3D Print Queue...");
        setMasterStatus("Fetching Queue...", "mod-working");
        const { data, error } = await supabaseClient.from('print_queue').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        printQueueDB = data;
        renderPrintQueue();
        
        // Auto-select first active job if none selected
        const activePrints = printQueueDB.filter(p => p.status !== 'Archived');
        if (!currentPrintJob && activePrints.length > 0) {
            selectPrintJob(activePrints[0].id);
        } else if (currentPrintJob) {
            // Refresh the active job data
            const updated = activePrints.find(j => j.id === currentPrintJob.id);
            if (updated) {
                currentPrintJob = updated;
                renderActivePrintJob(updated.id);
            } else {
                currentPrintJob = null;
                document.getElementById('printMainArea').style.display = 'none';
            }
        } else {
            document.getElementById('printMainArea').style.display = 'none';
        }

        setMasterStatus("Queue Updated", "mod-success");
        setTimeout(() => setMasterStatus("Ready.", "status-idle"), 2000);
    } catch (e) {
        sysLog("Print Queue Error: " + e.message, true);
        setMasterStatus("Sync Error", "mod-error");
    }
}

let printDraggedIndex = null;

function renderPrintQueue() {
    const ui = document.getElementById('printListUI');
    if (!ui) return;
    ui.innerHTML = "";

    let totalWaitTime = 0;
    let totalTasks = 0;
    const activePrints = printQueueDB.filter(p => p.status !== 'Archived');

    if (activePrints.length === 0) {
        ui.innerHTML = "<li style='cursor:default; background:transparent; border:none;'>No 3D print jobs in queue.</li>";
        document.getElementById('printMainArea').style.display = 'none';
    } else {
        printQueueDB.forEach((job, index) => {
            if (job.status === 'Archived') return;
            let cleanPartName = job.part_name.startsWith('RECIPE:::') ? job.part_name.replace('RECIPE:::', '') : job.part_name.split(':::')[0];
            const catalogItem = catalogByName[cleanPartName];
            let printTimePer = typeof getPrintTime === 'function' ? getPrintTime(cleanPartName) : 0;
            const totalTime = printTimePer * job.qty;
            const isActive = job.status !== 'Completed';
            
            if (isActive) {
                totalTasks++;
                totalWaitTime += totalTime;
            }

            let sel = (currentPrintJob && currentPrintJob.id === job.id) ? 'selected' : '';
            let dot = job.status === 'Queued' ? '🟡' : (job.status === 'Completed' ? '🟢' : (job.status === 'Printing' ? '🖨️' : '🧹'));
            
            // Format: "[ID] Neogleamz Name - amount to print - time"
            const displayName = catalogItem ? (catalogItem.neoName || catalogItem.itemName) : cleanPartName;
            const displayID = (job.wo_id && job.wo_id.startsWith('WO-')) ? job.wo_id : ('PR-' + job.id.substring(0, 8).toUpperCase());
            const timeStr = totalTime > 0 ? ` - ${formatPrintTime(totalTime)}` : "";

            ui.innerHTML += `<li class="${sel}" 
                draggable="true"
                ondragstart="printDragStart(event, ${index})" 
                ondragover="printDragOver(event)" 
                ondrop="printDrop(event, ${index})" 
                ondragend="printDragEnd(event)"
                onclick="selectPrintJob('${job.id}')" 
                style="display:flex; justify-content:space-between; align-items:center; cursor:grab; padding: 10px; border-bottom: 1px solid var(--border-color); margin-bottom: 5px; border-radius: 4px;">
                <div style="display:flex; flex-direction:column; gap:2px; min-width:0;">
                    <span style="font-size:14px; font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">☰ ${dot} ${displayID}: ${displayName}${timeStr}</span>
                    ${job.label ? `<span style="font-size:11px; color:#f59e0b; font-style:italic; padding-left:22px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${job.label}</span>` : ''}
                </div>
                <span style="font-weight:900; font-family:monospace; flex-shrink:0;">x${job.qty}</span>
            </li>`;
        });
    }

    const tasksEl = document.getElementById('totalPrintTasks');
    const timeEl = document.getElementById('totalPrintingTime');
    if (tasksEl) tasksEl.innerText = totalTasks;
    if (timeEl) timeEl.innerText = formatPrintTime(totalWaitTime) || "0m";
}

function printDragStart(e, index) { 
    printDraggedIndex = index; 
    e.target.style.opacity = '0.5'; 
    e.dataTransfer.effectAllowed = 'move';
}
function printDragOver(e) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }
function printDragEnd(e) { e.target.style.opacity = '1'; }
function printDrop(e, index) {
    e.preventDefault();
    if (printDraggedIndex !== null && printDraggedIndex !== index) {
        let movedItem = printQueueDB.splice(printDraggedIndex, 1)[0];
        printQueueDB.splice(index, 0, movedItem);
        renderPrintQueue();
        if (typeof savePrintOrderPrefs === 'function') savePrintOrderPrefs();
    }
}

function selectPrintJob(id) {
    currentPrintJob = printQueueDB.find(j => j.id === id);
    renderPrintQueue();
    if (currentPrintJob) {
        renderActivePrintJob(currentPrintJob.id);
    }
}

function renderActivePrintJob(id) {
    const job = printQueueDB.find(j => j.id === id);
    if (!job) return;

    document.getElementById('printMainArea').style.display = 'block';
    
    // Simplified human-readable name for title
    let cleanPartName = job.part_name.startsWith('RECIPE:::') ? job.part_name.replace('RECIPE:::', '') : job.part_name.split(':::')[0];
    const catalogItem = catalogByName[cleanPartName];
    const displayName = catalogItem ? (catalogItem.neoName || catalogItem.itemName) : cleanPartName;
    const displayID = (job.wo_id && job.wo_id.startsWith('WO-')) ? job.wo_id : ('PR-' + job.id.substring(0, 8).toUpperCase());

    document.getElementById('printJobTitle').innerText = `${displayID}: ${displayName}`;

    // Show label if present
    const labelEl = document.getElementById('printJobLabelBadge');
    if (labelEl) {
        if (job.label) { labelEl.innerText = job.label; labelEl.style.display = 'inline-block'; }
        else labelEl.style.display = 'none';
    }

    document.getElementById('printJobQty').innerText = job.qty;
    document.getElementById('printJobSource').innerText = job.wo_id || 'Manual Entry';

    const b = document.getElementById('printJobBadge');
    const stEl = document.getElementById('printJobStartTime');
    b.innerText = job.status;
    b.className = "status-badge";
    if (job.status === 'Queued') b.classList.add('st-queued');
    else if (job.status === 'Printing') b.classList.add('st-picking');
    else if (job.status === 'Cleaned') b.classList.add('st-production');
    else if (job.status === 'Completed') b.classList.add('st-completed');

    if (stEl) {
        if (job.started_at) {
            let d = new Date(job.started_at);
            let dateStr = d.toLocaleDateString([], { month: 'numeric', day: 'numeric' });
            let timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            stEl.innerText = `START: ${dateStr} ${timeStr}`;
            stEl.style.display = 'inline-block';
        } else {
            stEl.style.display = 'none';
        }
    }
    const enEl = document.getElementById('printJobEndTime');
    if (enEl) {
        if (job.completed_at) {
            let d = new Date(job.completed_at);
            let dateStr = d.toLocaleDateString([], { month: 'numeric', day: 'numeric' });
            let timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            enEl.innerText = `FINISH: ${dateStr} ${timeStr}`;
            enEl.style.display = 'inline-block';
        } else {
            enEl.style.display = 'none';
        }
    }

    // Pipeline highlights
    ['Queued', 'Printing', 'Cleaned', 'Completed'].forEach(s => {
        const pEl = document.getElementById('pipe-P-' + s);
        const sEl = document.getElementById('sect-P-' + s);
        if (pEl) pEl.classList.remove('active');
        if (sEl) sEl.style.display = 'none';
    });

    const activePipe = document.getElementById('pipe-P-' + job.status);
    const activeSect = document.getElementById('sect-P-' + job.status);
    if (activePipe) activePipe.classList.add('active');
    if (activeSect) activeSect.style.display = 'block';


    // SOP logic for Printing stage
    if (job.status === 'Printing' || job.status === 'Cleaned') {
        const sopList = document.getElementById('printSOPList');
        let cleanPartName = job.part_name.startsWith('RECIPE:::') ? job.part_name.replace('RECIPE:::', '') : job.part_name.split(':::')[0];
        let mainPayload = sopsDB[cleanPartName];
        let steps = []; let qa = [];
        if (mainPayload) {
            if (Array.isArray(mainPayload)) steps = mainPayload;
            else if (typeof mainPayload === 'object') { steps = mainPayload.steps || []; qa = mainPayload.qaChecks || []; }
        }
        
        let grpId = 'layerz_' + encodeURIComponent(cleanPartName.replace(/\s+/g,'_'));
        let isEditing = window.activeInlineSopEditors && window.activeInlineSopEditors[grpId] === true;
        let isExpanded = localStorage.getItem('layerzSopExpanded_' + grpId) !== 'false'; // default expanded
        let disp = isExpanded ? 'block' : 'none';
        let chev = isExpanded ? '▼' : '▶';
        if(isEditing) { disp = 'block'; chev = '▼'; }
        
        let htmlOut = `
        <div class="sop-grp-card" id="sopgrp_${grpId}" style="background:var(--bg-panel); border:1px solid var(--border-color); border-radius:6px; margin-bottom:12px; transition:transform 0.2s;">
            <div style="background:var(--bg-bar); padding:8px 12px; border-radius: 6px; cursor:pointer; display:flex; justify-content:space-between; align-items:center; border-left:4px solid ${isEditing ? '#F59E0B' : '#0ea5e9'}; font-weight:bold; font-size:13px; color:var(--text-heading);" onclick="if(!${isEditing}){ let d=document.getElementById('sopgrp_body_${grpId}'); let ic=document.getElementById('sopgrp_icon_${grpId}'); if(d.style.display==='none'){d.style.display='block';ic.innerText='▼';localStorage.setItem('layerzSopExpanded_${grpId}','true');}else{d.style.display='none';ic.innerText='▶';localStorage.setItem('layerzSopExpanded_${grpId}','false');} }">
                <div style="flex-grow:1;">
                    ⚙️ Machine Instructions: ${cleanPartName} ${isEditing ? ' <span style="color:#F59E0B; font-size:11px; font-weight:900;">[ INLINE EDIT MODE ]</span>' : ''}
                </div>
                <div style="display:flex; align-items:center; gap:8px;" onclick="event.stopPropagation()">
                    <button class="btn-ghost-base btn-ghost-blue" style="font-size:10px; padding:2px 8px;" onclick="openPrintSOP('${cleanPartName.replace(/'/g, "\\'")}')">🖨️ PRINT</button>
                    <button onclick="toggleInlineEditor('${grpId}')" class="btn-ghost-base ${isEditing ? 'btn-ghost-red' : 'btn-ghost-brand'}" style="font-size:10px; padding:2px 8px;">${isEditing ? '✕ CANCEL' : '🔒 EDIT'}</button>
                    <div style="cursor:pointer; padding:0 8px; font-size:11px; margin-left:4px;" onclick="let d=document.getElementById('sopgrp_body_${grpId}'); if(d.style.display==='none'){d.style.display='block';this.innerText='▼';localStorage.setItem('layerzSopExpanded_${grpId}','true');}else{d.style.display='none';this.innerText='▶';localStorage.setItem('layerzSopExpanded_${grpId}','false');}" id="sopgrp_icon_${grpId}">${chev}</div>
                </div>
            </div>
            <div id="sopgrp_body_${grpId}" style="display:${disp}; padding:10px 15px; border-top:1px solid var(--border-color);">
        `;
        
        if(isEditing) {
            let qaText = qa.join('\n');
            let mappedSteps = steps.map(s => typeof s !== 'string' ? s : {text: s, m1: {url: "", type: "img"}, m2: {url: "", type: "img"}, m3: {url: "", type: "img"}});
            if(mappedSteps.length === 0) mappedSteps = [{}];
            let stepsHtml = '';
            mappedSteps.forEach((s, idx) => {
                let safeText = s.text || ''; let m1 = s.m1 || {type: s.type || 'img', url: s.url || ''}; let m2 = s.m2 || {type: 'img', url: ''}; let m3 = s.m3 || {type: 'img', url: ''};
                let rowGen = (m, n) => { let u = (m.url||'').replace(/"/g,'"').replace(/'/g,"\\'"); return `<div class="media-row"><select class="m${n}-type" style="border:1px solid var(--border-input); background:var(--bg-input); color:var(--text-main);"><option value="img" ${m.type==='img'?'selected':''}>🖼️ Image</option><option value="doc" ${m.type==='doc'?'selected':''}>📄 Doc</option><option value="vid" ${m.type==='vid'?'selected':''}>🎥 Vid</option></select><input type="text" class="m${n}-url" value="${u}" placeholder="URL ${n}" style="border:1px solid var(--border-input); background:var(--bg-input); color:var(--text-main);"></div>`; };
                stepsHtml += `<div class="sop-step-row inline-sop-step-row"><div class="sop-step-movers"><button class="icon-btn btn-icon-sq" style="border:none; background:var(--bg-input);" onclick="moveSOPUp(this)">▲</button><button class="icon-btn btn-icon-sq" style="border:none; background:var(--bg-input);" onclick="moveSOPDown(this)">▼</button><button class="icon-btn btn-icon-sq" style="font-size:16px; font-weight:900; border:none; background:#3b82f6; color:white; margin-top:auto;" onclick="addSOPRow(this)">+</button><button class="btn-red icon-btn btn-icon-sq" style="margin-top:5px;" onclick="removeSOPRow(this)">🗑</button></div><div class="sop-text-container"><div class="sop-text-rich" contenteditable="true" placeholder="Type instructions here...">${safeText}</div></div><div class="sop-controls-container">${typeof getRTToolbar === 'function' ? getRTToolbar() : ''}<div style="font-size:11px; font-weight:bold; color:var(--text-muted); margin-top:4px;">ATTACHMENTS (Optional)</div>${rowGen(m1, 1)} ${rowGen(m2, 2)} ${rowGen(m3, 3)}</div></div>`;
            });
            
            htmlOut += `
                            <!-- Layout Container (Side-by-side with resizer) -->
                            <div id="inlineContainer_${grpId}" style="display:flex; flex-direction:row; width:100%; border:1px solid var(--border-color); border-radius:8px; overflow:hidden;">
                                
                                <!-- Pane 1: Telemetry & Live Preview (Side-by-side like Master SOP) -->
                                <div id="inlineLeftPane_${grpId}" style="flex: 0 0 65%; min-width:30px; display:flex; flex-direction:row; gap:15px; padding:15px; background:var(--bg-body); border-right:1px solid var(--border-color);  overflow:hidden;">
                                    
                                    <!-- Column 1: Config & Input -->
                                    <div id="inlineInputCol_${grpId}" style="flex:1; background:var(--bg-panel); border-radius:12px; padding:20px; border:1px solid var(--border-color); display:flex; flex-direction:column; min-width:320px;">
                                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                                            <h3 style="margin:0; color:var(--text-heading); font-size:16px;">CHECKLIST</h3>
                                            <div style="display:flex; gap:8px;">
                                                <button onclick="openMediaManager('telemetry')" style="padding:5px 10px; font-size:11px; font-weight:700; background:rgba(14,165,233,0.1); border:1px solid #0ea5e9; color:#0ea5e9; border-radius:6px; cursor:pointer; letter-spacing:0.5px; display:flex; align-items:center; gap:4px;"><i class="fa-solid fa-bolt"></i> MEDIA</button>
                                                <button onclick="openSOPTokenGuide()" style="padding:5px 10px; font-size:11px; font-weight:700; background:rgba(245,158,11,0.1); border:1px solid #F59E0B; color:#F59E0B; border-radius:6px; cursor:pointer; letter-spacing:0.5px;">❓ GUIDE</button>
                                                <button onclick="if(typeof toggleHorizontalPreview==='function') toggleHorizontalPreview('inlineLeftPane_${grpId}', 'inlinePreviewContainer_${grpId}', this);" style="padding:5px 10px; font-size:11px; font-weight:700; background:rgba(59,130,246,0.1); border:1px solid #3b82f6; color:#3b82f6; border-radius:6px; cursor:pointer; letter-spacing:0.5px;">👁️ PREVIEW</button>
                                            </div>
                                        </div>
                                        <div style="font-size:11px; color:var(--text-muted); line-height:1.8; margin-bottom:10px; background:var(--bg-bar); padding:8px 12px; border-radius:6px;">
                                            <b style="color:#10b981; font-family:monospace;"># </b>Header &nbsp;·&nbsp;
                                            <b style="color:var(--text-muted); font-family:monospace;">&gt; </b>Subtext &nbsp;·&nbsp;
                                            <b style="color:#F59E0B; font-family:monospace;">[INPUT]</b> Field &nbsp;·&nbsp;
                                            <b style="color:#0ea5e9; font-family:monospace;">[SCAN]</b> Bin &nbsp;— <span style="color:#F59E0B; cursor:pointer; font-weight:700;" onclick="openSOPTokenGuide()">❓ Guide</span>
                                        </div>
                                        <textarea id="inlineSopQA_${grpId}" oninput="if(typeof inlineRenderTelemetryPreview==='function') inlineRenderTelemetryPreview('${grpId}')" placeholder="# Checklist Step" style="flex-grow:1; width:100%; padding:15px; border-radius:8px; border:1px solid var(--border-input); background:var(--bg-input); color:var(--text-main); resize:none; font-size:12px; font-family:monospace; line-height:1.5; outline:none; min-height:150px; white-space:nowrap;">${qaText}</textarea>
                                    </div>
                                    
                                    <!-- Column 2: Live Preview Render -->
                                    <div id="inlinePreviewContainer_${grpId}" style="flex:1; background:var(--bg-container); border-radius:12px; padding:20px; border:1px solid var(--border-color); display:flex; flex-direction:column; min-width:0;">
                                        <div style="font-size:11px; font-weight:900; color:#F59E0B; margin-bottom:15px; letter-spacing:1px; text-transform:uppercase;">CHECKLIST PREVIEW</div>
                                        <div id="inlineSopQAPreview_${grpId}" style="flex-grow:1; display:flex; flex-direction:column; gap:4px; overflow-y:auto; padding-right:10px;"></div>
                                    </div>

                                </div>
                                
                                <!-- Dedicated Vertical Resizer Handle -->
                                <div id="inlineResizer_{grpId}" class="h-resizer" onmousedown="if(typeof initInlineResize===\'function\'){initInlineResize(event, \'${grpId}\');}"></div>
                                
                                <!-- Pane 2: Rich Text Steps -->
                                <div id="inlineRightPane_${grpId}" style="flex: 1; min-width:30px; display:flex; flex-direction:column; padding:15px; background:var(--bg-body); border-left:1px solid var(--border-color);  overflow:hidden;">
                                    <div style="flex:1; background:var(--bg-panel); border-radius:12px; padding:20px; border:1px solid var(--border-color); display:flex; flex-direction:column; min-width:0;">
                                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                                            <h3 style="margin:0; color:var(--text-heading); font-size:16px;">Rich Text Instructions</h3>
                                        </div>
                                        <div id="inlineSopSteps_${grpId}" style="display:flex; flex-direction:column; gap:10px; overflow-y:auto; flex-grow:1;">${stepsHtml}</div>
                                        <button class="btn-green" style="padding:10px; font-size:12px; font-weight:bold; margin-top:15px;" onclick="if(typeof addInlineSOPRow==='function') addInlineSOPRow('${grpId}')">+ ADD PROCEDURE STEP</button>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Save Actions -->
                            <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:10px; padding-top:15px; border-top:1px solid var(--border-color);">
                                <button class="btn-red" style="padding:8px 15px; font-size:12px;" onclick="if(typeof toggleInlineEditor==='function') toggleInlineEditor('${grpId}')">✕ Cancel Changes</button>
                                <button class="btn-green" style="padding:8px 25px; font-size:14px; font-weight:900;" onclick="if(typeof saveInlineSopBlock==='function') { saveInlineSopBlock('${grpId}', '${cleanPartName.replace(/'/g, "\\'")}'); setTimeout(()=>renderActivePrintJob(currentPrintJob.id), 500); }">💾 SAVE SOP MASTER BLUEPRINT</button>
                            </div>

                            <!-- Injecting Drag Handlers for Resizer -->
                            <script>
                            setTimeout(() => { 
                                if(typeof inlineRenderTelemetryPreview==='function') inlineRenderTelemetryPreview('${grpId}'); 
                            let savedOrder = localStorage.getItem('inlineSopSwapOrder_${grpId}');
                            if(savedOrder === 'right-left') {
                                let c = document.getElementById('inlineContainer_${grpId}');
                                let l = document.getElementById('inlineLeftPane_${grpId}');
                                let r = document.getElementById('inlineRightPane_${grpId}');
                                let z = document.getElementById('inlineResizer_${grpId}');
                                if(c && l && r && z) {
                                    c.insertBefore(r, z);
                                    c.insertBefore(z, l);
                                }
                            } 
                                
                                let rz = document.getElementById('inlineResizer_${grpId}');
                                let lp = document.getElementById('inlineLeftPane_${grpId}');
                                let rp = document.getElementById('inlineRightPane_${grpId}');
                                let isDragging = false;
                                
                                if(rz && lp && rp) {
                                    rz.addEventListener('mousedown', (e) => {
                                        isDragging = true;
                                        document.body.style.cursor = 'col-resize';
                                        e.preventDefault();
                                    });
                                    document.addEventListener('mousemove', (e) => {
                                        if(!isDragging) return;
                                        let container = rz.parentElement;
                                        let totalW = container.getBoundingClientRect().width;
                                        let rect = container.getBoundingClientRect();
                                        let newLeftW = e.clientX - rect.left;
                                        
                                        if(newLeftW < 100) newLeftW = 100;
                                        if(totalW - newLeftW < 100) newLeftW = totalW - 100;
                                        
                                        lp.style.flex = \`0 0 \${newLeftW}px\`;
                                        rp.style.flex = \`1 1 0\`;
                                    });
                                    document.addEventListener('mouseup', () => {
                                        if(isDragging) {
                                            isDragging = false;
                                            document.body.style.cursor = '';
                                        }
                                    });
                                }
                            }, 20);
                            <\/script>
            `;
        } else {
            if (qa.length === 0 && steps.length === 0) {
                htmlOut += `<div style="color:var(--text-muted); font-size:11px; font-style:italic;">No steps configured.</div>`;
            } else {
                if (qa.length > 0) {
                    htmlOut += `<div style="font-weight:bold; color:var(--text-heading); font-size:12px; margin-bottom:5px; border-bottom:1px solid rgba(14,165,233,0.3); padding-bottom:3px;">📋 Telemetry / Checks</div>`;
                    qa.forEach((q, qIdx) => {
                        let parsed = typeof parseProductionTelemetryLine === 'function' ? parseProductionTelemetryLine(q, qIdx) : q;
                        if (q.startsWith('> ')) {
                            htmlOut += `<label class="checklist-item" style="display:flex; align-items:flex-start; flex-wrap:wrap; gap:6px; cursor:pointer; padding:2px 8px 2px 28px; width:100%; transition:all 0.2s; margin-bottom:2px;"><input type="checkbox" style="width:12px; height:12px; flex-shrink:0; cursor:pointer; margin-top:2px;"><span style="font-size:11px; flex:1;">${parsed}</span></label>`;
                        } else if (!q.startsWith('[INPUT]') && !q.startsWith('# ') && !/^\[(IMG|BARCODE|QR):/.test(q)) {
                            htmlOut += `<label class="checklist-item" style="display:flex; align-items:flex-start; flex-wrap:wrap; gap:10px; cursor:pointer; padding:4px 8px; border:1px solid var(--border-color); border-radius:6px; background:var(--bg-container); width:100%; transition:all 0.2s; margin-bottom:4px;"><input type="checkbox" style="width:14px; height:14px; flex-shrink:0; cursor:pointer; margin-top:0px;"><span style="font-size:11px; flex:1;">${parsed}</span></label>`;
                        } else {
                            htmlOut += `<div style="width:100%; margin-bottom:6px; font-size:11px;">${parsed}</div>`;
                        }
                    });
                    htmlOut += `<div style="height:6px;"></div>`;
                }
                
                if(steps.length > 0) {
                    let stepCounter = 1;
                    steps.forEach((s) => {
                        if (typeof s === 'string') s = { text: s };
                        htmlOut += `<div class="checklist-item" style="background:var(--bg-container); border:1px solid var(--border-color); margin-bottom:8px;">
                            <div class="chk-text" style="width:100%;">
                                <strong style="color:#8b5cf6; font-size:12px;">Step ${stepCounter++}:</strong><br> ${s.text}
                            </div>
                        </div>`;
                    });
                }
            }
        }
        
        htmlOut += `</div></div>`;
        sopList.innerHTML = htmlOut;
        if (typeof processTelemetryCanvasRendering === 'function') processTelemetryCanvasRendering(sopList);
    }
}

async function advancePrintStatus(newStatus) {
    if (!currentPrintJob) return;
    try {
        sysLog(`Print Job ${currentPrintJob.id} -> ${newStatus}`);
        setMasterStatus("Updating Status...", "mod-working");

        const updatePayload = { status: newStatus };
        if (newStatus === 'Printing') updatePayload.started_at = new Date().toISOString();
        if (newStatus === 'Completed') {
            updatePayload.completed_at = new Date().toISOString();
            updatePayload.status = 'Archived';
            
            // 📦 INVENTORY INTEGRATION: Add finished good and deduct filaments (if manual job)
            const k = currentPrintJob.part_name;
            let manualUpserts = [];
            
            if (!inventoryDB[k]) inventoryDB[k] = { consumed_qty: 0, manual_adjustment: 0, produced_qty: 0, sold_qty: 0, min_stock: 0, scrap_qty: 0 };
            inventoryDB[k].produced_qty += (parseFloat(currentPrintJob.qty) || 0);

            if (currentPrintJob.wo_id === "Manual Entry" || !currentPrintJob.wo_id) {
                let cleanPartName = currentPrintJob.part_name.startsWith('RECIPE:::') ? currentPrintJob.part_name.replace('RECIPE:::', '') : currentPrintJob.part_name.split(':::')[0];
                if (typeof getDirectMaterials === 'function' && productsDB[cleanPartName]) {
                    let exactRaws = getDirectMaterials(cleanPartName, parseFloat(currentPrintJob.qty) || 1);
                    Object.keys(exactRaws).forEach(rawK => {
                        let req = exactRaws[rawK];
                        if(!inventoryDB[rawK]) inventoryDB[rawK] = { consumed_qty: 0, manual_adjustment: 0, produced_qty: 0, sold_qty: 0, min_stock: 0, scrap_qty: 0 };
                        inventoryDB[rawK].consumed_qty += req;
                        manualUpserts.push({ item_key: rawK, consumed_qty: inventoryDB[rawK].consumed_qty, manual_adjustment: inventoryDB[rawK].manual_adjustment, produced_qty: inventoryDB[rawK].produced_qty, sold_qty: inventoryDB[rawK].sold_qty, min_stock: inventoryDB[rawK].min_stock, scrap_qty: inventoryDB[rawK].scrap_qty, prototype_consumed_qty: inventoryDB[rawK].prototype_consumed_qty||0, assembly_consumed_qty: inventoryDB[rawK].assembly_consumed_qty||0, production_consumed_qty: inventoryDB[rawK].production_consumed_qty||0, prototype_produced_qty: inventoryDB[rawK].prototype_produced_qty||0 });
                    });
                }
            }

            manualUpserts.push({ item_key: k, consumed_qty: inventoryDB[k].consumed_qty, manual_adjustment: inventoryDB[k].manual_adjustment, produced_qty: inventoryDB[k].produced_qty, sold_qty: inventoryDB[k].sold_qty, min_stock: inventoryDB[k].min_stock, scrap_qty: inventoryDB[k].scrap_qty, prototype_consumed_qty: inventoryDB[k].prototype_consumed_qty||0, assembly_consumed_qty: inventoryDB[k].assembly_consumed_qty||0, production_consumed_qty: inventoryDB[k].production_consumed_qty||0, prototype_produced_qty: inventoryDB[k].prototype_produced_qty||0 });
            const { error: invErr } = await supabaseClient.from('inventory_consumption').upsert(manualUpserts, { onConflict: 'item_key' });
            if (invErr) throw new Error("Inventory update failed: " + invErr.message);

            // 🔄 REFRESH UI: Make sure inventory tab reflects the new stock
            if (typeof renderInventoryTable === 'function') renderInventoryTable();
            if (typeof renderAnalyticsDashboard === 'function') renderAnalyticsDashboard();
        }

        const { error } = await supabaseClient.from('print_queue').update(updatePayload).eq('id', currentPrintJob.id);
        if (error) throw error;
        
        currentPrintJob.status = updatePayload.status || newStatus;
        if(currentPrintJob.status === 'Archived') {
            currentPrintJob = printQueueDB.find(j => j.status !== 'Archived') || null;
        }

        setMasterStatus("Job Updated!", "mod-success");
        await refreshPrintQueue();
    } catch (e) {
        sysLog(e.message, true);
        setMasterStatus("Update Error", "mod-error");
    }
}

async function deletePrintJob() {
    try {
        if (!currentPrintJob) return;
        let cleanPartName = currentPrintJob.part_name.startsWith('RECIPE:::') ? currentPrintJob.part_name.replace('RECIPE:::', '') : currentPrintJob.part_name.split(':::')[0];
        const catalogItem = catalogByName[cleanPartName];
        const displayName = catalogItem ? (catalogItem.neoName || catalogItem.itemName) : cleanPartName;
        let displayID = (currentPrintJob.wo_id && currentPrintJob.wo_id.startsWith('WO-')) ? currentPrintJob.wo_id : ('PR-' + currentPrintJob.id.substring(0, 8).toUpperCase());
        if (!confirm(`Delete ${displayID}: ${displayName}?`)) return;
        sysLog(`Deleting Print Job ${currentPrintJob.id}`);
        setMasterStatus("Deleting...", "mod-working");

        const { error } = await supabaseClient.from('print_queue').delete().eq('id', currentPrintJob.id);
        if (error) throw new Error(error.message);

        printQueueDB = printQueueDB.filter(p => p.id !== currentPrintJob.id);
        currentPrintJob = printQueueDB.find(p => p.status !== 'Archived') || null;
        setMasterStatus("Deleted", "mod-success");
        setTimeout(() => setMasterStatus("Ready.", "status-idle"), 2000);
        refreshPrintQueue();
        if (currentPrintJob) renderActivePrintJob(currentPrintJob.id); else document.getElementById('printMainArea').style.display = 'none';
    } catch(e) { sysLog(e.message, true); }
}

async function archiveCurrentPrint() {
    try {
        if(!currentPrintJob) return;
        if(currentPrintJob.status === 'Archived') return alert("Already archived.");
        let cleanPartName = currentPrintJob.part_name.startsWith('RECIPE:::') ? currentPrintJob.part_name.replace('RECIPE:::', '') : currentPrintJob.part_name.split(':::')[0];
        const catalogItem = catalogByName[cleanPartName];
        const displayName = catalogItem ? (catalogItem.neoName || catalogItem.itemName) : cleanPartName;
        let displayID = (currentPrintJob.wo_id && currentPrintJob.wo_id.startsWith('WO-')) ? currentPrintJob.wo_id : ('PR-' + currentPrintJob.id.substring(0, 8).toUpperCase());
        if(confirm(`Archive Print Job ${displayID}: ${displayName}?`)) {
            sysLog(`Archiving Print ${currentPrintJob.id}`); setMasterStatus("Archiving...", "mod-working");
            const {error} = await supabaseClient.from('print_queue').update({status: 'Archived'}).eq('id', currentPrintJob.id);
            if(error) throw new Error(error.message);
            currentPrintJob.status = 'Archived';
            setMasterStatus("Archived!", "mod-success"); setTimeout(()=>setMasterStatus("Ready.", "status-idle"), 2000);
            currentPrintJob = printQueueDB.find(p => p.status !== 'Archived') || null;
            refreshPrintQueue();
            if (currentPrintJob) renderActivePrintJob(currentPrintJob.id); else document.getElementById('printMainArea').style.display = 'none';
        }
    } catch(e) { sysLog(e.message, true); }
}


function openPrintSOP(pName) {
    try {
        pName = pName.split(':::')[0];
        let steps = sopsDB[pName] || [];
        if (!Array.isArray(steps)) {
            if (steps.steps && Array.isArray(steps.steps)) steps = steps.steps;
            else steps = Object.values(steps);
        }
        
        let html = `<html><head><title>SOP - ${pName}</title><style>body{font-family:sans-serif; padding:10px; font-size:11px;} .step{margin-bottom:15px; border-bottom:1px solid #ccc; padding-bottom:10px; font-size:12px;} .header{background:#f1f5f9; padding:6px; font-weight:bold; font-size:14px; margin:15px 0 8px 0; border-left:4px solid #0ea5e9;} img{max-width:100%; max-height:250px; display:block; margin-top:8px;} a {color:#0ea5e9; font-weight:bold; margin-right:15px;} h2{margin:0 0 5px 0; font-size:16px;} h3{margin:0 0 10px 0; font-size:14px;}</style></head><body>`;
        html += `<h2>Compiled SOP Guide</h2><h3>Master Recipe: ${pName}</h3><hr>`;
        
        if(steps.length === 0) {
            html += `<p>No SOP steps currently defined for this recipe.</p>`;
        } else {
            let stepCounter = 1;
            steps.forEach((s) => {
                if(s.isHeader) { 
                    html += `<div class="header">${s.text}</div>`; 
                } else if(typeof s === 'string') { 
                    html += `<div class="step"><strong style="color:#0ea5e9; font-size:14px;">Step ${stepCounter++}:</strong><br> ${s}</div>`; 
                } else { 
                    html += `<div class="step"><strong style="color:#0ea5e9; font-size:14px;">Step ${stepCounter++}:</strong><br> ${s.text || ''}</div>`; 
                }
            });
        }
        
        html += `</body></html>`;
        let win = window.open('', '', 'width=800,height=600');
        win.document.write(html);
        win.document.close();
        setTimeout(() => win.print(), 500);
    } catch(e) { 
        sysLog(`Print SOP Error: ${e.message}`, true); 
    }
}

async function addPrintJob(partName, qty, woId = null, label = null) {
    const payload = {
        part_name: partName,
        qty: qty,
        status: 'Queued',
        wo_id: woId,
        label: label || null,
        created_at: new Date().toISOString()
    };
    const { error } = await supabaseClient.from('print_queue').insert([payload]);
    if (error) sysLog("Add Print Job Error: " + error.message, true);
    else refreshPrintQueue();
}

function openManualPrintModal() {
    const sel = document.getElementById('manualPrintSelect');
    if(sel) {
        sel.innerHTML = '<option value="">-- Select 3D Part --</option>';
        Object.keys(productsDB).sort((a,b) => {
            return a.localeCompare(b);
        }).forEach(k => {
            if (productsDB[k] && productsDB[k].is_3d_print) {
                sel.innerHTML += `<option value="RECIPE:::${String(k).replace(/"/g, '&quot;')}">🖨️ ${k}</option>`;
            }
        });
    }
    const q = document.getElementById('manualPrintQty');
    if(q) q.value = 1;
    const lbl = document.getElementById('manualPrintLabel');
    if(lbl) lbl.value = '';
    document.getElementById('manualPrintModal').style.display = 'flex';
}

function closeManualPrintModal() {
    document.getElementById('manualPrintModal').style.display = 'none';
}

async function submitManualPrint() {
    const k = document.getElementById('manualPrintSelect').value;
    const q = parseInt(document.getElementById('manualPrintQty').value);
    const label = document.getElementById('manualPrintLabel')?.value.trim() || null;
    if (!k || isNaN(q) || q <= 0) return alert("Please select a valid 3D part and quantity.");
    
    closeManualPrintModal();
    setMasterStatus("Queuing Manual Print...", "mod-working");
    
    await addPrintJob(k, q, "Manual Entry", label);
    
    setMasterStatus("Job Queued!", "mod-success");
    setTimeout(() => setMasterStatus("Ready.", "status-idle"), 2000);
}

