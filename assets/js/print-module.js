/* eslint-disable no-unused-vars */
/**
 * @typedef {Object} PrintQueueRow
 * @property {string} id
 * @property {string} part_name
 * @property {number} qty
 * @property {string} status
 * @property {string|null} wo_id
 * @property {string|null} label
 * @property {string} created_at
 * @property {string|null} started_at
 * @property {string|null} completed_at
 */
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
        const { data, error } = await supabaseClient.from('print_queue').select('*').order('created_at', { ascending: false }).order('id', { ascending: true });
        if (error) throw error;
        
        if (data && window.uuidToNameMap) {
            data.forEach(row => {
                if (row.part_item_uuid) {
                    let mappedName = window.uuidToNameMap[row.part_item_uuid];
                    if (mappedName && mappedName.startsWith('RECIPE:::')) {
                        row.part_name = mappedName.replace('RECIPE:::', '');
                    } else if (mappedName) {
                        row.part_name = mappedName;
                    }
                }
            });
        }
        
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
    ui.innerHTML = window.safeHTML("");

    let totalWaitTime = 0;
    let totalTasks = 0;
    const activePrints = printQueueDB.filter(p => p.status !== 'Archived');

    if (activePrints.length === 0) {
        ui.innerHTML = window.safeHTML(
            "<li style='cursor:default; background:transparent; border:none;'>No 3D print jobs in queue.</li>"
        );
        document.getElementById('printMainArea').style.display = 'none';
    } else {
        let printListHtml = [];
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

            printListHtml.push(`<li class="${sel}" 
                draggable="true"
                data-drag-index="${index}"
                data-click="click_selectPrintJob" data-id="${job.id}"
                style="display:flex; justify-content:space-between; align-items:center; cursor:grab; padding: 10px; border-bottom: 1px solid var(--border-color); margin-bottom: 5px; border-radius: 4px;">
                <div style="display:flex; flex-direction:column; gap:2px; min-width:0;">
                    <span style="font-size:14px; font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">☰ ${dot} ${displayID}: ${displayName}${timeStr}</span>
                    ${job.label ? `<span style="font-size:11px; color:#f59e0b; font-style:italic; padding-left:22px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${job.label}</span>` : ''}
                </div>
                <span style="font-weight:900; font-family:monospace; flex-shrink:0;">x${job.qty}</span>
            </li>`);
        });
        ui.innerHTML = window.safeHTML(printListHtml.join(''));
        
        // Attach drag events to newly rendered items
        const listItems = ui.querySelectorAll('li[draggable="true"]');
        listItems.forEach(li => {
            li.addEventListener('dragstart', printDragStart);
            li.addEventListener('dragover', printDragOver);
            li.addEventListener('drop', printDrop);
            li.addEventListener('dragend', printDragEnd);
        });
    }

    const tasksEl = document.getElementById('totalPrintTasks');
    const timeEl = document.getElementById('totalPrintingTime');
    if (tasksEl) tasksEl.innerText = totalTasks;
    if (timeEl) timeEl.innerText = formatPrintTime(totalWaitTime) || "0m";
}

function printDragStart(e) { 
    printDraggedIndex = parseInt(e.currentTarget.getAttribute('data-drag-index')); 
    e.currentTarget.style.opacity = '0.5'; 
    e.dataTransfer.effectAllowed = 'move';
}
function printDragOver(e) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }
function printDragEnd(e) { e.currentTarget.style.opacity = '1'; }
function printDrop(e) {
    e.preventDefault();
    let index = parseInt(e.currentTarget.getAttribute('data-drag-index'));
    if (printDraggedIndex !== null && printDraggedIndex !== index && !isNaN(index)) {
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
    if (!job) {
        document.getElementById('printMainArea').style.display = 'none';
        return;
    }

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
        if (pEl) {
            pEl.classList.remove('active');
            pEl.style.pointerEvents = 'auto';
            pEl.style.opacity = '1';
            pEl.style.background = '';
            pEl.disabled = false;
            if (pEl._stateTimeout) { clearTimeout(pEl._stateTimeout); delete pEl._stateTimeout; }
        }
        if (sEl) sEl.style.display = 'none';
    });

    const activePipe = document.getElementById('pipe-P-' + job.status);
    const activeSect = document.getElementById('sect-P-' + job.status);
    if (activePipe) activePipe.classList.add('active');
    if (activeSect) activeSect.style.display = 'block';

    // Timer Logic
    document.getElementById('pipe-P-Printing').innerHTML = window.safeHTML('2. Start Print Job');
    document.getElementById('pipe-P-Cleaned').innerHTML = window.safeHTML('3. Mark as Cleaned');

    let wip = job.wip_state || {};
    
    // Clear old interval if it exists so we can re-bind
    
    
    

    if (job.status === 'Cleaned') {
        let baseline = (wip.elapsed_cleaned||0);
        let isRunning = wip.stage_start_time && !wip.is_paused;
        let elapsedSoFar = baseline;
        if (isRunning) elapsedSoFar += (Date.now() - wip.stage_start_time);
        
        let h = Math.floor(elapsedSoFar / 3600000);
        let m = Math.floor((elapsedSoFar % 3600000) / 60000);
        let s = Math.floor((elapsedSoFar % 60000) / 1000);
        let timeStr = h > 0 ? `${h}h ${m}m ${s}s` : `${m}m ${s}s`;
        
        let btnAction = wip.is_paused ? '▶️ Resume' : '⏸️ Pause';
        let timerUI = `<div style="margin-left:auto; display:flex; align-items:center; gap:8px;" data-click="click_stopPropagation">
            <span id="printPipelineTimerSpan" data-running="${isRunning}" data-baseline="${baseline}" data-start="${wip.stage_start_time || ''}" style="font-size:11px; font-family:monospace; color:${wip.is_paused ? 'var(--text-muted)' : '#10b981'};">${wip.is_paused ? 'Paused' : 'Running'} (${timeStr})</span>
            <button data-click="click_togglePrintTimerPause" class="btn-slate" style="padding:2px 8px; font-size:10px;">${btnAction}</button>
        </div>`;
        document.getElementById('pipe-P-Cleaned').innerHTML = window.safeHTML(`<div style="display:flex; align-items:center; width:100%;">3. Mark as Cleaned ${timerUI}</div>`);
    } else if (job.status === 'Printing') {
        let totalElapsed = (wip.elapsed_printing || 0);
        if (wip.active_run) {
            totalElapsed += (wip.active_run.elapsed || 0);
            if (!wip.active_run.is_paused && wip.active_run.start_time) {
                totalElapsed += (Date.now() - wip.active_run.start_time);
            }
        }
        let h = Math.floor(totalElapsed / 3600000);
        let m = Math.floor((totalElapsed % 3600000) / 60000);
        let s = Math.floor((totalElapsed % 60000) / 1000);
        let timeStr = h > 0 ? `${h}h ${m}m ${s}s` : `${m}m ${s}s`;
        let lbl = wip.active_run ? (wip.active_run.is_paused ? 'Paused' : 'Running') : 'Idle';
        let timerUI = `<div style="margin-left:auto; display:flex; align-items:center; gap:8px;">
            <span style="font-size:11px; font-family:monospace; color:var(--text-muted);">${lbl} (Total: ${timeStr})</span>
        </div>`;
        document.getElementById('pipe-P-Printing').innerHTML = window.safeHTML(`<div style="display:flex; align-items:center; width:100%;">2. Start Print Job ${timerUI}</div>`);
    }

    if (job.status === 'Printing') {
        const mgr = document.getElementById('layerzRunManager');
        if (mgr) {
            let activeRun = wip.active_run;
            let runs = wip.runs || [];
            let totalSuccess = runs.reduce((acc, r) => acc + (parseFloat(r.success_qty)||0), 0);
            let targetQty = parseFloat(job.qty) || 0;
            let remainingQty = Math.max(0, targetQty - totalSuccess);

            let pct = targetQty > 0 ? Math.min(100, Math.floor((totalSuccess/targetQty)*100)) : 0;
            
            let htmlOut = `
            <div style="background:var(--bg-panel); border:1px solid var(--border-color); border-radius:8px; overflow:hidden;">
                <div style="background:var(--bg-bar); padding:10px 15px; border-bottom:1px solid var(--border-color); display:flex; justify-content:space-between; align-items:center;">
                    <h3 style="margin:0; font-size:14px; color:var(--text-heading);">🖨️ Bed Run Manager</h3>
                    <div style="font-size:12px; font-weight:bold; color:var(--text-muted);">
                        Yield: <span style="color:#10b981;">${totalSuccess}</span> / ${targetQty}
                    </div>
                </div>
                
                <div style="padding:15px;">
                    <div style="width:100%; height:6px; background:var(--bg-input); border-radius:3px; margin-bottom:20px; overflow:hidden;">
                        <div style="width:${pct}%; height:100%; background:#10b981; transition:width 0.3s;"></div>
                    </div>
            `;
            
            if (activeRun) {
                let rIsRunning = !activeRun.is_paused;
                let rElapsed = activeRun.elapsed || 0;
                if (rIsRunning && activeRun.start_time) rElapsed += (Date.now() - activeRun.start_time);
                
                let h = Math.floor(rElapsed / 3600000);
                let m = Math.floor((rElapsed % 3600000) / 60000);
                let s = Math.floor((rElapsed % 60000) / 1000);
                let timeStr = h > 0 ? `${h}h ${m}m ${s}s` : `${m}m ${s}s`;
                
                htmlOut += `
                    <div style="background:rgba(14,165,233,0.1); border:1px solid #0ea5e9; padding:15px; border-radius:8px; display:flex; flex-direction:column; gap:10px;">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <strong style="color:#0ea5e9; font-size:13px;">Active Run: ${activeRun.run_qty} parts</strong>
                            <div style="display:flex; align-items:center; gap:10px;">
                                <span id="layerzActiveRunTimerSpan" data-running="${rIsRunning}" data-baseline="${activeRun.elapsed || 0}" data-start="${activeRun.start_time || ''}" style="font-family:monospace; font-size:14px; font-weight:bold; color:${activeRun.is_paused ? 'var(--text-muted)' : '#0ea5e9'};">${timeStr}</span>
                                <button data-click="click_toggleLayerzRunPause" class="${activeRun.is_paused ? 'btn-blue' : 'btn-slate'}" style="padding:4px 10px; font-size:11px;">${activeRun.is_paused ? '▶️ Resume' : '⏸️ Pause'}</button>
                            </div>
                        </div>
                        <button class="btn-orange" style="padding:8px; font-weight:bold; letter-spacing:1px; width:100%;" data-click="click_openLayerzRunCompleteModal">🏁 COMPLETE RUN & RECORD YIELD</button>
                    </div>
                `;
            } else if (remainingQty > 0) {
                htmlOut += `
                    <div style="display:flex; gap:15px; align-items:flex-end;">
                        <div style="width:140px; flex-shrink:0;">
                            <label style="font-size:11px; font-weight:bold; color:var(--text-heading); margin-bottom:4px; display:block; white-space:nowrap;">Parts on Bed (Qty)</label>
                            <input type="number" id="layerzNewRunQty" min="1" step="any" value="${remainingQty}" style="width:100%; background:var(--bg-input); border:1px solid var(--border-color); color:var(--text-main); padding:8px; border-radius:6px; font-size:14px; box-sizing:border-box;">
                        </div>
                        <button class="btn-blue" style="padding:8px 20px; font-weight:bold; height:37px; flex:1; display:flex; justify-content:center; align-items:center;" data-click="click_startLayerzRun">▶️ START NEW RUN</button>
                    </div>
                `;
            } else {
                 htmlOut += `
                    <div style="text-align:center; padding:10px; color:#10b981; font-weight:bold; font-size:14px;">
                        ✓ All parts completed. Advance pipeline to Cleaned.
                    </div>
                `;
            }
            
            if (runs.length > 0) {
                htmlOut += `<div style="margin-top:20px; border-top:1px solid var(--border-color); padding-top:15px;">
                    <h4 style="margin:0 0 10px 0; font-size:12px; color:var(--text-heading);">Run History</h4>
                    <div style="display:flex; flex-direction:column; gap:8px;">
                `;
                runs.forEach((r, idx) => {
                    let runH = Math.floor((r.elapsed||0) / 3600000);
                    let runM = Math.floor(((r.elapsed||0) % 3600000) / 60000);
                    let runT = runH > 0 ? `${runH}h ${runM}m` : `${runM}m`;
                    htmlOut += `
                        <div style="background:var(--bg-container); border:1px solid var(--border-color); padding:8px 12px; border-radius:6px; display:flex; justify-content:space-between; align-items:center; font-size:12px;">
                            <div><strong style="color:var(--text-main);">Run #${idx+1}</strong> <span style="color:var(--text-muted);">(${runT})</span></div>
                            <div style="display:flex; gap:15px;">
                                <span>Target: <strong>${r.run_qty}</strong></span>
                                <span style="color:#10b981;">Success: <strong>${r.success_qty}</strong></span>
                                <span style="color:#ef4444;">Scrap: <strong>${r.scrap_qty}</strong></span>
                            </div>
                        </div>
                    `;
                });
                htmlOut += `</div></div>`;
            }
            
            htmlOut += `</div></div>`;
            mgr.innerHTML = window.safeHTML(htmlOut);
        }
    } else if (job.status === 'Cleaned') {
        const mgr = document.getElementById('layerzCleanedManager');
        if (mgr) {
            let isRunning = wip.stage_start_time && !wip.is_paused;
            let elapsed = wip.elapsed_cleaned || 0;
            if (isRunning && wip.stage_start_time) elapsed += (Date.now() - wip.stage_start_time);
            
            let h = Math.floor(elapsed / 3600000);
            let m = Math.floor((elapsed % 3600000) / 60000);
            let s = Math.floor((elapsed % 60000) / 1000);
            let timeStr = h > 0 ? `${h}h ${m}m ${s}s` : `${m}m ${s}s`;
            
            let totalYielded = parseFloat(job.qty) || 0;
            if (wip.runs && wip.runs.length > 0) {
                totalYielded = wip.runs.reduce((sum, r) => sum + (parseFloat(r.success_qty) || 0), 0);
            }

            let htmlOut = `
            <div style="background:var(--bg-panel); border:1px solid var(--border-color); border-radius:8px; overflow:hidden;">
                <div style="background:var(--bg-bar); padding:10px 15px; border-bottom:1px solid var(--border-color); display:flex; justify-content:space-between; align-items:center;">
                    <h3 style="margin:0; font-size:14px; color:var(--text-heading);">🛠️ Post-Processing Manager</h3>
                    <div style="font-size:12px; font-weight:bold; color:var(--text-muted);">
                        Parts to Clean: <span style="color:#0ea5e9;">${totalYielded}</span>
                    </div>
                </div>
                
                <div style="padding:15px;">
            `;
            
            if (!wip.stage_start_time && elapsed === 0) {
                // Not started yet
                htmlOut += `
                    <div style="display:flex; justify-content:center; padding:20px 0;">
                        <button class="btn-blue" style="padding:12px 30px; font-weight:bold; font-size:14px; letter-spacing:1px;" data-click="click_togglePrintTimerPause">▶️ START CLEANING</button>
                    </div>
                `;
            } else {
                // Running or Paused
                htmlOut += `
                    <div style="background:rgba(14,165,233,0.1); border:1px solid #0ea5e9; padding:15px; border-radius:8px; display:flex; flex-direction:column; gap:15px;">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <strong style="color:#0ea5e9; font-size:13px;">Cleaning in Progress</strong>
                            <div style="display:flex; align-items:center; gap:10px;">
                                <span id="layerzCleanedTimerSpan" data-running="${isRunning}" data-baseline="${wip.elapsed_cleaned || 0}" data-start="${wip.stage_start_time || ''}" style="font-family:monospace; font-size:16px; font-weight:bold; color:${wip.is_paused ? 'var(--text-muted)' : '#0ea5e9'};">${timeStr}</span>
                                <button data-click="click_togglePrintTimerPause" class="${wip.is_paused ? 'btn-blue' : 'btn-slate'}" style="padding:6px 12px; font-size:12px;">${wip.is_paused ? '▶️ Resume' : '⏸️ Pause'}</button>
                            </div>
                        </div>
                        <button class="btn-orange" style="padding:10px; font-weight:bold; letter-spacing:1px; width:100%; font-size:14px;" data-click="click_advancePrintStatus_Completed">🏁 COMPLETE CLEANING & RECORD YIELD</button>
                    </div>
                `;
            }
            htmlOut += `</div></div>`;
            mgr.innerHTML = window.safeHTML(htmlOut);
        }
    } else {
        const mgr = document.getElementById('layerzRunManager');
        if (mgr) mgr.innerHTML = "";
        const cMgr = document.getElementById('layerzCleanedManager');
        if (cMgr) cMgr.innerHTML = "";
    }

    // SOP logic for Printing stage
    if (job.status === 'Printing' || job.status === 'Cleaned') {
        const sopList = document.getElementById(job.status === 'Cleaned' ? 'printSOPListCleaned' : 'printSOPList');
        let cleanPartName = job.part_name.startsWith('RECIPE:::') ? job.part_name.replace('RECIPE:::', '') : job.part_name.split(':::')[0];
        let mainPayload = sopsDB[cleanPartName];
        let steps = []; let qa = [];
        if (mainPayload) {
            if (Array.isArray(mainPayload)) steps = mainPayload;
            else if (typeof mainPayload === 'object') { steps = mainPayload.steps || []; qa = mainPayload.qaChecks || []; }
        }
        
        let grpId = 'layerz_' + encodeURIComponent(cleanPartName.replace(/\s+/g,'_'));
        let isExpanded = localStorage.getItem('layerzSopExpanded_' + grpId) !== 'false'; // default expanded
        let disp = isExpanded ? 'block' : 'none';
        let chev = isExpanded ? '▼' : '▶';
        
        let htmlOut = `
        <div class="sop-grp-card" id="sopgrp_${grpId}" style="background:var(--bg-panel); border:1px solid var(--border-color); border-radius:6px; margin-bottom:12px; transition:transform 0.2s;">
            <div style="background:var(--bg-bar); padding:8px 12px; border-radius: 6px; cursor:pointer; display:flex; justify-content:space-between; align-items:center; border-left:4px solid #0ea5e9; font-weight:bold; font-size:13px; color:var(--text-heading);" data-click="click_toggleLayerzSopGroup" data-grp="${grpId}">
                <div style="flex-grow:1;">
                    🖨️ 3D Print Instructions: ${cleanPartName}
                </div>
                <div style="display:flex; align-items:center; gap:8px;" data-click="click_stopPropagation">
                    <button class="btn-slate" style="font-size:10px; padding:2px 8px;" data-click="click_openLayerzPrintSOP" data-name="${cleanPartName.replace(/"/g, '&quot;')}">🖨️ PRINT</button>
                    <button data-click="click_openLayerzSOPEditor" data-name="${cleanPartName.replace(/"/g, '&quot;')}" class="btn-orange-muted" style="font-size:10px; padding:2px 8px;">🔒 EDIT</button>
                    <div style="cursor:pointer; padding:0 8px; font-size:11px; margin-left:4px;" data-click="click_toggleLayerzSopGroup" data-grp="${grpId}" data-icon="true" id="sopgrp_icon_${grpId}">${chev}</div>
                </div>
            </div>
            <div id="sopgrp_body_${grpId}" style="display:${disp}; padding:10px 15px; border-top:1px solid var(--border-color);">
        `;
        
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
        
        htmlOut += `</div></div>`;
        sopList.innerHTML = window.safeHTML(htmlOut);
        if (typeof processTelemetryCanvasRendering === 'function') processTelemetryCanvasRendering(sopList);
    }
}

window.submitFinalizePrint = async function() {
    let btn = document.querySelector('[data-click="click_submitFinalizePrint"]');
    await window.executeWithButtonAction(btn, 'LOGGING...', '✅ LOGGED', async () => {
        let success = parseFloat(document.getElementById('finalizePrintSuccess').value) || 0;
        let failed = parseFloat(document.getElementById('finalizePrintFailed').value) || 0;
        await advancePrintStatus('Completed', true, success, failed);
        setTimeout(() => { document.getElementById('finalizePrintModal').style.display = 'none'; }, 800);
    });
};

async function executeCleaningInventoryMath(partName, failedQ, wo_id, label) {
    if (failedQ <= 0) return;
    const k = partName;
    if (!inventoryDB[k]) inventoryDB[k] = { consumed_qty: 0, manual_adjustment: 0, produced_qty: 0, sold_qty: 0, min_stock: 0, scrap_qty: 0 };
    
    // Only increase scrap qty. It was already produced in Stage 2.
    inventoryDB[k].scrap_qty = (inventoryDB[k].scrap_qty || 0) + failedQ;
    
    let manualUpserts = [];
    manualUpserts.push({ item_uuid: window.uuidMap[k] || k, consumed_qty: inventoryDB[k].consumed_qty, manual_adjustment: inventoryDB[k].manual_adjustment, produced_qty: inventoryDB[k].produced_qty, sold_qty: inventoryDB[k].sold_qty, min_stock: inventoryDB[k].min_stock, scrap_qty: inventoryDB[k].scrap_qty, prototype_consumed_qty: inventoryDB[k].prototype_consumed_qty||0, assembly_consumed_qty: inventoryDB[k].assembly_consumed_qty||0, production_consumed_qty: inventoryDB[k].production_consumed_qty||0, prototype_produced_qty: inventoryDB[k].prototype_produced_qty||0 });
    
    const { error: invErr } = await supabaseClient.from('inventory_consumption').upsert(manualUpserts, { onConflict: 'item_key' });
    if (invErr) throw new Error("Cleaning Inventory update failed: " + invErr.message);

    let isScrapTicket = label && label.includes('[SCRAP REBUILD]');
    let isYieldEnforced = false;
    
    if (isScrapTicket || (label && label.includes('[PRINT FAILURE RECOVERY]'))) {
        isYieldEnforced = true;
    } else if (wo_id && wo_id !== 'Manual Entry') {
        let parentWO = typeof workOrdersDB !== 'undefined' ? workOrdersDB.find(w => String(w.wo_id) === String(wo_id)) : null;
        if (!parentWO) {
            try {
                const { data } = await supabaseClient.from('work_orders').select('*').eq('wo_id', wo_id).single();
                parentWO = data;
            } catch(e) { console.error(e); }
        }
        if (parentWO) {
            let pNameClean = parentWO.product_name.replace('RECIPE:::', '');
            let isSub = typeof isSubassemblyDB !== 'undefined' && !!isSubassemblyDB[pNameClean];
            let is3DP = typeof productsDB !== 'undefined' && !!(productsDB[pNameClean] && productsDB[pNameClean].is_3d_print);
            if (!isSub && !is3DP) isYieldEnforced = true;
        }
    }
    
    if (isYieldEnforced) {
        let recoveryLabel = isScrapTicket ? label : `[PRINT FAILURE RECOVERY]`;
        if (typeof addPrintJob === 'function') {
            await addPrintJob(partName, failedQ, wo_id, recoveryLabel);
        }
    }
}

async function executePrintInventoryMath(partName, successQ, failedQ, isScrapTicket, wo_id, label, skipRecovery = false) {
    let manualUpserts = [];
    const k = partName;
    if (!inventoryDB[k]) inventoryDB[k] = { consumed_qty: 0, manual_adjustment: 0, produced_qty: 0, sold_qty: 0, min_stock: 0, scrap_qty: 0, prototype_consumed_qty: 0, assembly_consumed_qty: 0, production_consumed_qty: 0, prototype_produced_qty: 0 };
    
    let bType = 'Production';
    if (typeof currentPrintJob !== 'undefined' && currentPrintJob && currentPrintJob.wip_state && currentPrintJob.wip_state.batch_type) {
        bType = currentPrintJob.wip_state.batch_type;
    }
    if (bType === 'Production' && typeof printQueueDB !== 'undefined' && printQueueDB) {
        let matchingJob = printQueueDB.find(j => j.wo_id === wo_id || j.part_name === partName);
        if (matchingJob && matchingJob.wip_state && matchingJob.wip_state.batch_type) {
            bType = matchingJob.wip_state.batch_type;
        }
    }
    if (bType === 'Production' && wo_id && wo_id !== 'Manual Entry') {
        let parentWO = typeof workOrdersDB !== 'undefined' ? workOrdersDB.find(w => String(w.wo_id) === String(wo_id)) : null;
        if (!parentWO) {
            try {
                const { data } = await supabaseClient.from('work_orders').select('*').eq('wo_id', wo_id).single();
                parentWO = data;
            } catch(e) { console.error(e); }
        }
        if (parentWO && parentWO.wip_state && parentWO.wip_state.batch_type) {
            bType = parentWO.wip_state.batch_type;
        }
    }

    let totalAttempts = successQ + failedQ;
    if (bType === 'Prototype') {
        inventoryDB[k].prototype_produced_qty = (inventoryDB[k].prototype_produced_qty || 0) + totalAttempts;
    } else {
        inventoryDB[k].produced_qty += totalAttempts;
    }
    inventoryDB[k].scrap_qty = (inventoryDB[k].scrap_qty || 0) + failedQ;

    let cleanPartName = partName.startsWith('RECIPE:::') ? partName.replace('RECIPE:::', '') : partName.split(':::')[0];
    if (typeof getDirectMaterials === 'function' && productsDB[cleanPartName]) {
        let exactRaws = getDirectMaterials(cleanPartName, totalAttempts);
        Object.keys(exactRaws).forEach(rawK => {
            let req = exactRaws[rawK];
            if(!inventoryDB[rawK]) inventoryDB[rawK] = { consumed_qty: 0, manual_adjustment: 0, produced_qty: 0, sold_qty: 0, min_stock: 0, scrap_qty: 0, prototype_consumed_qty: 0, assembly_consumed_qty: 0, production_consumed_qty: 0, prototype_produced_qty: 0 };
            if (isScrapTicket) {
                inventoryDB[rawK].scrap_qty = (inventoryDB[rawK].scrap_qty || 0) + req;
            } else {
                inventoryDB[rawK].consumed_qty += req;
                if (bType === 'Prototype') {
                    inventoryDB[rawK].prototype_consumed_qty = (inventoryDB[rawK].prototype_consumed_qty || 0) + req;
                } else {
                    inventoryDB[rawK].production_consumed_qty = (inventoryDB[rawK].production_consumed_qty || 0) + req;
                }
            }
            
            manualUpserts.push({ item_uuid: window.uuidMap[k] || k, consumed_qty: inventoryDB[rawK].consumed_qty, manual_adjustment: inventoryDB[rawK].manual_adjustment, produced_qty: inventoryDB[rawK].produced_qty, sold_qty: inventoryDB[rawK].sold_qty, min_stock: inventoryDB[rawK].min_stock, scrap_qty: inventoryDB[rawK].scrap_qty, prototype_consumed_qty: inventoryDB[rawK].prototype_consumed_qty||0, assembly_consumed_qty: inventoryDB[rawK].assembly_consumed_qty||0, production_consumed_qty: inventoryDB[rawK].production_consumed_qty||0, prototype_produced_qty: inventoryDB[rawK].prototype_produced_qty||0 });
        });
    }

    manualUpserts.push({ item_uuid: window.uuidMap[k] || k, consumed_qty: inventoryDB[k].consumed_qty, manual_adjustment: inventoryDB[k].manual_adjustment, produced_qty: inventoryDB[k].produced_qty, sold_qty: inventoryDB[k].sold_qty, min_stock: inventoryDB[k].min_stock, scrap_qty: inventoryDB[k].scrap_qty, prototype_consumed_qty: inventoryDB[k].prototype_consumed_qty||0, assembly_consumed_qty: inventoryDB[k].assembly_consumed_qty||0, production_consumed_qty: inventoryDB[k].production_consumed_qty||0, prototype_produced_qty: inventoryDB[k].prototype_produced_qty||0 });
    const { error: invErr } = await supabaseClient.from('inventory_consumption').upsert(manualUpserts, { onConflict: 'item_key' });
    if (invErr) throw new Error("Inventory update failed: " + invErr.message);

    if (failedQ > 0) {
        let isYieldEnforced = false;
        if (isScrapTicket || (label && label.includes('[PRINT FAILURE RECOVERY]'))) {
            isYieldEnforced = true;
        } else if (wo_id && wo_id !== 'Manual Entry') {
            let parentWO = typeof workOrdersDB !== 'undefined' ? workOrdersDB.find(w => String(w.wo_id) === String(wo_id)) : null;
            if (!parentWO) {
                try {
                    const { data } = await supabaseClient.from('work_orders').select('*').eq('wo_id', wo_id).single();
                    parentWO = data;
                } catch(e) { console.error(e); }
            }
            if (parentWO) {
                let pNameClean = parentWO.product_name.replace('RECIPE:::', '');
                let isSub = typeof isSubassemblyDB !== 'undefined' && !!isSubassemblyDB[pNameClean];
                let is3DP = typeof productsDB !== 'undefined' && !!(productsDB[pNameClean] && productsDB[pNameClean].is_3d_print);
                if (!isSub && !is3DP) isYieldEnforced = true;
            }
        }
        
        if (isYieldEnforced && !skipRecovery) {
            let recoveryLabel = isScrapTicket ? label : `[PRINT FAILURE RECOVERY]`;
            if (typeof addPrintJob === 'function') {
                await addPrintJob(partName, failedQ, wo_id, recoveryLabel);
            }
        }
    }

    if (typeof renderInventoryTable === 'function') renderInventoryTable();
    if (typeof renderAnalyticsDashboard === 'function') renderAnalyticsDashboard();
}

async function advancePrintStatus(newStatus, bypassModal = false, finalSuccess = null, finalFailed = null) {
    if (!currentPrintJob) return;
    try {
        let currentWip = currentPrintJob.wip_state || {};
        let hasRuns = currentWip.runs && currentWip.runs.length > 0;

        if (newStatus === 'Completed' && !bypassModal) {
            document.getElementById('finalizePrintName').value = currentPrintJob.part_name;
            document.getElementById('finalizePrintJobId').value = currentPrintJob.id;
            
            let isAlreadyDone = currentPrintJob.status === 'Archived' || currentPrintJob.status === 'Completed' || currentPrintJob.completed;
            let btn = document.querySelector('[data-click="click_submitFinalizePrint"]');

            if (isAlreadyDone) {
                let successQ = 0; let failedQ = 0;
                if (currentWip.final_yield) {
                    successQ = currentWip.final_yield.success;
                    failedQ = currentWip.final_yield.failed;
                }
                document.getElementById('finalizePrintSuccess').value = successQ;
                document.getElementById('finalizePrintFailed').value = failedQ;
                document.getElementById('finalizePrintSuccess').disabled = true;
                document.getElementById('finalizePrintFailed').disabled = true;
                if (btn) {
                    btn.innerText = "Already Logged";
                    btn.disabled = true;
                }
            } else {
                let qty = parseFloat(currentPrintJob.qty) || 0;
                if (hasRuns) {
                    qty = currentWip.runs.reduce((sum, r) => sum + (parseFloat(r.success_qty) || 0), 0);
                }
                
                document.getElementById('finalizePrintSuccess').value = qty;
                document.getElementById('finalizePrintFailed').value = 0;
                document.getElementById('finalizePrintSuccess').disabled = false;
                document.getElementById('finalizePrintFailed').disabled = false;
                if (btn) {
                    btn.innerText = "Complete & Log";
                    btn.disabled = false;
                }
                
                document.getElementById('finalizePrintSuccess').oninput = function() {
                    let v = parseFloat(this.value)||0;
                    document.getElementById('finalizePrintFailed').value = Math.max(0, qty - v);
                };
                document.getElementById('finalizePrintFailed').oninput = function() {
                    let v = parseFloat(this.value)||0;
                    document.getElementById('finalizePrintSuccess').value = Math.max(0, qty - v);
                };
            }
            
            document.getElementById('finalizePrintModal').style.display = 'flex';
            return;
        }

        sysLog(`Print Job ${currentPrintJob.id} -> ${newStatus}`);
        setMasterStatus("Updating Status...", "mod-working");

        const updatePayload = { status: newStatus };
        
        // Accumulate time for the previous stage if running
        if (currentPrintJob.status === 'Printing' && currentWip.stage_start_time && !currentWip.is_paused) {
            currentWip.elapsed_printing = (currentWip.elapsed_printing || 0) + (Date.now() - currentWip.stage_start_time);
        } else if (currentPrintJob.status === 'Cleaned' && currentWip.stage_start_time && !currentWip.is_paused) {
            currentWip.elapsed_cleaned = (currentWip.elapsed_cleaned || 0) + (Date.now() - currentWip.stage_start_time);
        }

        // Setup timer for the newly entered stage
        if (newStatus === 'Printing') {
            currentWip.stage_start_time = Date.now();
            currentWip.is_paused = false;
        } else if (newStatus === 'Cleaned') {
            currentWip.stage_start_time = null;
            currentWip.is_paused = true;
        } else if (newStatus === 'Completed') {
            currentWip.stage_start_time = null;
            currentWip.completed_by_email = window.currentUser ? window.currentUser.email : 'guest_operator';
            currentWip.completed_by_id = window.currentUser ? window.currentUser.id : null;
            
            if (finalSuccess !== null || finalFailed !== null) {
                currentWip.final_yield = {
                    success: finalSuccess !== null ? finalSuccess : 0,
                    failed: finalFailed !== null ? finalFailed : 0
                };
            }
        }
        updatePayload.wip_state = currentWip;

        if (newStatus === 'Printing') updatePayload.started_at = new Date().toISOString();
        if (newStatus === 'Completed') {
            updatePayload.completed_at = new Date().toISOString();
            updatePayload.status = 'Archived';
            
            if (!hasRuns) {
                let successQ = finalSuccess !== null ? finalSuccess : (parseFloat(currentPrintJob.qty) || 0);
                let failedQ = finalFailed !== null ? finalFailed : 0;
                let isScrapTicket = currentPrintJob.label && currentPrintJob.label.includes('[SCRAP REBUILD]');
                await executePrintInventoryMath(currentPrintJob.part_name, successQ, failedQ, isScrapTicket, currentPrintJob.wo_id, currentPrintJob.label);
                
                if (typeof window.teSyncTask === 'function') {
                    await window.teSyncTask('layerz', currentPrintJob.id, 'comment', {
                        content: `🧼 Print Job Finalized: ${successQ} parts successful, ${failedQ} parts failed/scrapped.`
                    });
                    if (currentPrintJob.wo_id && currentPrintJob.wo_id.startsWith('WO-')) {
                        let cleanPart = currentPrintJob.part_name.startsWith('RECIPE:::') ? currentPrintJob.part_name.replace('RECIPE:::', '') : currentPrintJob.part_name.split(':::')[0];
                        await window.teSyncTask('batchez', currentPrintJob.wo_id, 'comment', {
                            content: `🧼 Print Job Finalized (Part: ${cleanPart}): ${successQ} parts successful, ${failedQ} parts failed/scrapped.`
                        });
                    }
                }
            } else {
                let failedQ = finalFailed !== null ? finalFailed : 0;
                let totalSuccessFromRuns = currentWip.runs.reduce((sum, r) => sum + (parseFloat(r.success_qty) || 0), 0);
                let successQ = finalSuccess !== null ? finalSuccess : Math.max(0, totalSuccessFromRuns - failedQ);
                
                if (failedQ > 0) {
                    await executeCleaningInventoryMath(currentPrintJob.part_name, failedQ, currentPrintJob.wo_id, currentPrintJob.label);
                }
                
                if (typeof window.teSyncTask === 'function') {
                    await window.teSyncTask('layerz', currentPrintJob.id, 'comment', {
                        content: `🧼 Cleaning Stage Completed: ${successQ} parts cleaned successfully, ${failedQ} parts scrapped during cleaning.`
                    });
                    if (currentPrintJob.wo_id && currentPrintJob.wo_id.startsWith('WO-')) {
                        let cleanPart = currentPrintJob.part_name.startsWith('RECIPE:::') ? currentPrintJob.part_name.replace('RECIPE:::', '') : currentPrintJob.part_name.split(':::')[0];
                        await window.teSyncTask('batchez', currentPrintJob.wo_id, 'comment', {
                            content: `🧼 Cleaning Stage Completed (Part: ${cleanPart}): ${successQ} parts cleaned successfully, ${failedQ} parts scrapped during cleaning.`
                        });
                    }
                }
            }
        }

        const { error } = await supabaseClient.from('print_queue').update(updatePayload).eq('id', currentPrintJob.id);
        if (error) throw error;
        
        let oldJobId = currentPrintJob.id;
        currentPrintJob.status = updatePayload.status || newStatus;
        if(currentPrintJob.status === 'Archived') {
            currentPrintJob = printQueueDB.find(j => j.status !== 'Archived') || null;
        }

        setMasterStatus("Job Updated!", "mod-success");
        
        if (typeof window.teSyncTask === 'function') {
            if (newStatus === 'Printing' || newStatus === 'Cleaned') {
                await window.teSyncTask('layerz', oldJobId, 'start');
            } else if (newStatus === 'Completed') {
                await window.teSyncTask('layerz', oldJobId, 'complete');
            }
        }
        await refreshPrintQueue();
    } catch (e) {
        sysLog(e.message, true);
        setMasterStatus("Update Error", "mod-error");
    }
}

async function deletePrintJob() {
    try {
        if (!currentPrintJob) return;
        let oldJobId = currentPrintJob.id;
        let cleanPartName = currentPrintJob.part_name.startsWith('RECIPE:::') ? currentPrintJob.part_name.replace('RECIPE:::', '') : currentPrintJob.part_name.split(':::')[0];
        const catalogItem = catalogByName[cleanPartName];
        const displayName = catalogItem ? (catalogItem.neoName || catalogItem.itemName) : cleanPartName;
        let displayID = (currentPrintJob.wo_id && currentPrintJob.wo_id.startsWith('WO-')) ? currentPrintJob.wo_id : ('PR-' + currentPrintJob.id.substring(0, 8).toUpperCase());
        if (!confirm(`Delete ${displayID}: ${displayName}?`)) return;
        sysLog(`Deleting Print Job ${currentPrintJob.id}`);
        setMasterStatus("Deleting...", "mod-working");

        const { error } = await supabaseClient.from('print_queue').delete().eq('id', currentPrintJob.id);
        if (error) throw new Error(error.message);

        if (typeof window.teSyncTask === 'function') {
            await window.teSyncTask('layerz', oldJobId, 'delete');
        }

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
            let w = currentPrintJob.wip_state || {};
            w.completed_by_email = window.currentUser ? window.currentUser.email : 'guest_operator';
            w.completed_by_id = window.currentUser ? window.currentUser.id : null;
            const {error} = await supabaseClient.from('print_queue').update({status: 'Archived', wip_state: w}).eq('id', currentPrintJob.id);
            if(error) throw new Error(error.message);
            currentPrintJob.wip_state = w;
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
    let bType = 'Production';
    if (woId && woId !== 'Manual Entry') {
        let parentWO = typeof workOrdersDB !== 'undefined' ? workOrdersDB.find(w => String(w.wo_id) === String(woId)) : null;
        if (parentWO && parentWO.wip_state && parentWO.wip_state.batch_type) {
            bType = parentWO.wip_state.batch_type;
        }
    }

    let uuidKey = partName.startsWith('RECIPE:::') ? partName : 'RECIPE:::' + partName;
    let pUuid = window.uuidMap[uuidKey];
    if (!pUuid) sysLog("Warning: UUID not found for part " + partName, true);

    const payload = {
        part_item_uuid: pUuid,
        qty: qty,
        status: 'Queued',
        wo_id: woId,
        label: label || null,
        created_at: new Date().toISOString(),
        wip_state: {
            created_by_email: window.currentUser ? window.currentUser.email : 'guest_operator',
            created_by_id: window.currentUser ? window.currentUser.id : null,
            batch_type: bType
        }
    };
    const { data, error } = await supabaseClient.from('print_queue').insert([payload]).select();
    if (error) {
        sysLog("Add Print Job Error: " + error.message, true);
    } else {
        if (data && data.length > 0 && typeof window.teSyncTask === 'function') {
            let printJobId = data[0].id;
            let cleanPart = partName.startsWith('RECIPE:::') ? partName.replace('RECIPE:::', '') : partName.split(':::')[0];
            await window.teSyncTask('layerz', printJobId, 'create', {
                title: `🖨️ Layerz: Print ${cleanPart} (Qty: ${qty}) [${woId || 'Manual'}]`,
                linked_module: 'inventory',
                description: `${cleanPart} (Qty: ${qty})`,
                metadata: { linked_print_id: printJobId }
            });
        }
        refreshPrintQueue();
    }
}

function openManualPrintModal() {
    const sel = document.getElementById('manualPrintSelect');
    if(sel) {
        let manualPrintHtml = ['<option value="">-- Select 3D Part --</option>'];
        Object.keys(productsDB).sort((a,b) => {
            return a.localeCompare(b);
        }).forEach(k => {
            if (productsDB[k] && productsDB[k].is_3d_print) {
                manualPrintHtml.push(`<option value="RECIPE:::${String(k).replace(/"/g, '&quot;')}">🖨️ ${k}</option>`);
            }
        });
        sel.innerHTML = window.safeHTML(manualPrintHtml.join(''));
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


// ====== GLOBAL BINDINGS ======

    
    
    
    
    
    
    
    async function togglePrintTimerPause() {
        if (!currentPrintJob) return;
        let w = currentPrintJob.wip_state || {};
        let stageKey = currentPrintJob.status === 'Printing' ? 'elapsed_printing' : 'elapsed_cleaned';
        
        if (!w.is_paused) {
            // Pausing
            if (w.stage_start_time) {
                w[stageKey] = (w[stageKey] || 0) + (Date.now() - w.stage_start_time);
            }
            w.stage_start_time = null;
            w.is_paused = true;
        } else {
            // Resuming
            w.stage_start_time = Date.now();
            w.is_paused = false;
        }
        
        const { error } = await supabaseClient.from('print_queue').update({ wip_state: w }).eq('id', currentPrintJob.id);
        if (error) sysLog("Timer Toggle Error: " + error.message, true);
        else renderActivePrintJob(currentPrintJob.id);
    };

    // --- Sub-Run Manager Bindings ---
    async function startLayerzRun() {
        if (!currentPrintJob) return;
        let qty = parseFloat(document.getElementById('layerzNewRunQty')?.value) || 0;
        if (qty <= 0) return alert("Must specify a run quantity greater than 0.");
        
        let w = currentPrintJob.wip_state || {};
        if (!w.runs) w.runs = [];
        w.active_run = {
            run_id: 'r_' + Date.now(),
            run_qty: qty,
            start_time: Date.now(),
            is_paused: false,
            elapsed: 0
        };
        
        const { error } = await supabaseClient.from('print_queue').update({ wip_state: w }).eq('id', currentPrintJob.id);
        if (error) sysLog("Start Run Error: " + error.message, true);
        else renderActivePrintJob(currentPrintJob.id);
    };

    async function toggleLayerzRunPause() {
        if (!currentPrintJob || !currentPrintJob.wip_state || !currentPrintJob.wip_state.active_run) return;
        let w = currentPrintJob.wip_state;
        let r = w.active_run;
        
        if (!r.is_paused) {
            if (r.start_time) r.elapsed = (r.elapsed || 0) + (Date.now() - r.start_time);
            r.start_time = null;
            r.is_paused = true;
        } else {
            r.start_time = Date.now();
            r.is_paused = false;
        }
        
        const { error } = await supabaseClient.from('print_queue').update({ wip_state: w }).eq('id', currentPrintJob.id);
        if (error) sysLog("Pause Run Error: " + error.message, true);
        else renderActivePrintJob(currentPrintJob.id);
    };

    function closeLayerzRunCompleteModal() {
        document.getElementById('layerzRunCompleteModal').style.display = 'none';
    };

    function openLayerzRunCompleteModal() {
        if (!currentPrintJob || !currentPrintJob.wip_state || !currentPrintJob.wip_state.active_run) return;
        let r = currentPrintJob.wip_state.active_run;
        document.getElementById('layerzRunPartName').value = currentPrintJob.part_name;
        document.getElementById('layerzRunSuccessQty').value = r.run_qty;
        document.getElementById('layerzRunScrapQty').value = 0;
        
        document.getElementById('layerzRunSuccessQty').oninput = function() {
            let v = parseFloat(this.value)||0;
            document.getElementById('layerzRunScrapQty').value = Math.max(0, r.run_qty - v);
        };
        document.getElementById('layerzRunScrapQty').oninput = function() {
            let v = parseFloat(this.value)||0;
            document.getElementById('layerzRunSuccessQty').value = Math.max(0, r.run_qty - v);
        };
        
        document.getElementById('layerzRunCompleteModal').style.display = 'flex';
    };

    async function submitLayerzRun() {
        if (!currentPrintJob || !currentPrintJob.wip_state || !currentPrintJob.wip_state.active_run) return;
        let success = parseFloat(document.getElementById('layerzRunSuccessQty').value) || 0;
        let scrap = parseFloat(document.getElementById('layerzRunScrapQty').value) || 0;
        
        document.getElementById('layerzRunCompleteModal').style.display = 'none';
        setMasterStatus("Recording Yield...", "mod-working");
        
        let w = currentPrintJob.wip_state;
        let r = w.active_run;
        
        if (!r.is_paused && r.start_time) r.elapsed = (r.elapsed || 0) + (Date.now() - r.start_time);
        r.success_qty = success;
        r.scrap_qty = scrap;
        r.is_paused = true;
        r.start_time = null;
        
        try {
            let isScrapTicket = currentPrintJob.label && currentPrintJob.label.includes('[SCRAP REBUILD]');
            await executePrintInventoryMath(currentPrintJob.part_name, success, scrap, isScrapTicket, currentPrintJob.wo_id, currentPrintJob.label, true);
            
            w.completed_by_email = window.currentUser ? window.currentUser.email : 'guest_operator';
            w.completed_by_id = window.currentUser ? window.currentUser.id : null;
            w.runs.push(r);
            w.active_run = null;
            
            const { error } = await supabaseClient.from('print_queue').update({ wip_state: w }).eq('id', currentPrintJob.id);
            if (error) throw error;
            
            if (typeof window.teSyncTask === 'function') {
                let runNum = w.runs.length;
                await window.teSyncTask('layerz', currentPrintJob.id, 'comment', {
                    content: `⚙️ Print Run #${runNum} Completed: ${success} parts successful, ${scrap} parts scrapped.`
                });
                if (currentPrintJob.wo_id && currentPrintJob.wo_id.startsWith('WO-')) {
                    let cleanPart = currentPrintJob.part_name.startsWith('RECIPE:::') ? currentPrintJob.part_name.replace('RECIPE:::', '') : currentPrintJob.part_name.split(':::')[0];
                    await window.teSyncTask('batchez', currentPrintJob.wo_id, 'comment', {
                        content: `⚙️ Print Run #${runNum} Completed (Part: ${cleanPart}): ${success} parts successful, ${scrap} parts scrapped.`
                    });
                }
            }
            
            setMasterStatus("Yield Recorded!", "mod-success");
            setTimeout(() => setMasterStatus("Ready.", "status-idle"), 2000);
            renderActivePrintJob(currentPrintJob.id);
            
        } catch(e) {
            sysLog("Submit Run Error: " + e.message, true);
        }
    };


function initPrintTimers() {
    if (window._printTimerInterval) clearInterval(window._printTimerInterval);
    window._printTimerInterval = setInterval(() => {
        let pSpan = document.getElementById('printPipelineTimerSpan');
        if (pSpan && pSpan.getAttribute('data-running') === 'true') {
            let start = parseInt(pSpan.getAttribute('data-start'));
            let baseline = parseInt(pSpan.getAttribute('data-baseline'));
            if (!isNaN(start) && !isNaN(baseline)) {
                let elapsed = baseline + (Date.now() - start);
                let h = Math.floor(elapsed / 3600000);
                let m = Math.floor((elapsed % 3600000) / 60000);
                let s = Math.floor((elapsed % 60000) / 1000);
                pSpan.innerText = `Running (${h > 0 ? `${h}h ${m}m ${s}s` : `${m}m ${s}s`})`;
            }
        }
        let rSpan = document.getElementById('layerzActiveRunTimerSpan');
        if (rSpan && rSpan.getAttribute('data-running') === 'true') {
            let start = parseInt(rSpan.getAttribute('data-start'));
            let baseline = parseInt(rSpan.getAttribute('data-baseline'));
            if (!isNaN(start) && !isNaN(baseline)) {
                let elapsed = baseline + (Date.now() - start);
                let h = Math.floor(elapsed / 3600000);
                let m = Math.floor((elapsed % 3600000) / 60000);
                let s = Math.floor((elapsed % 60000) / 1000);
                rSpan.innerText = `${h > 0 ? `${h}h ${m}m ${s}s` : `${m}m ${s}s`}`;
            }
        }
        let cSpan = document.getElementById('layerzCleanedTimerSpan');
        if (cSpan && cSpan.getAttribute('data-running') === 'true') {
            let start = parseInt(cSpan.getAttribute('data-start'));
            let baseline = parseInt(cSpan.getAttribute('data-baseline'));
            if (!isNaN(start) && !isNaN(baseline)) {
                let elapsed = baseline + (Date.now() - start);
                let h = Math.floor(elapsed / 3600000);
                let m = Math.floor((elapsed % 3600000) / 60000);
                let s = Math.floor((elapsed % 60000) / 1000);
                cSpan.innerText = `${h > 0 ? `${h}h ${m}m ${s}s` : `${m}m ${s}s`}`;
            }
        }
    }, 1000);
}
initPrintTimers();

if (typeof window !== 'undefined') {
    window.deletePrintJob = typeof deletePrintJob !== 'undefined' ? deletePrintJob : undefined;
    window.selectPrintJob = typeof selectPrintJob !== 'undefined' ? selectPrintJob : undefined;
    window.togglePrintTimerPause = typeof togglePrintTimerPause !== 'undefined' ? togglePrintTimerPause : undefined;
    window.startLayerzRun = typeof startLayerzRun !== 'undefined' ? startLayerzRun : undefined;
    window.toggleLayerzRunPause = typeof toggleLayerzRunPause !== 'undefined' ? toggleLayerzRunPause : undefined;
    window.openLayerzRunCompleteModal = typeof openLayerzRunCompleteModal !== 'undefined' ? openLayerzRunCompleteModal : undefined;
    window.closeLayerzRunCompleteModal = typeof closeLayerzRunCompleteModal !== 'undefined' ? closeLayerzRunCompleteModal : undefined;
    window.submitLayerzRun = typeof submitLayerzRun !== 'undefined' ? submitLayerzRun : undefined;
}
