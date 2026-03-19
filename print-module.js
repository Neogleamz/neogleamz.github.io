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
        
        // Auto-select first job if none selected
        if (!currentPrintJob && printQueueDB.length > 0) {
            selectPrintJob(printQueueDB[0].id);
        } else if (currentPrintJob) {
            // Refresh the active job data
            const updated = printQueueDB.find(j => j.id === currentPrintJob.id);
            if (updated) {
                currentPrintJob = updated;
                renderActivePrintJob(updated.id);
            }
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

    if (printQueueDB.length === 0) {
        ui.innerHTML = "<li style='cursor:default; background:transparent; border:none;'>No 3D print jobs in queue.</li>";
        document.getElementById('printMainArea').style.display = 'none';
    } else {
        printQueueDB.forEach((job, index) => {
            const catalogItem = catalogByName[job.part_name];
            const printTimePer = catalogItem ? (parseFloat(catalogItem.print_time_mins) || 0) : 0;
            const totalTime = printTimePer * job.qty;
            const isActive = job.status !== 'Completed';
            
            if (isActive) {
                totalTasks++;
                totalWaitTime += totalTime;
            }

            let sel = (currentPrintJob && currentPrintJob.id === job.id) ? 'selected' : '';
            let dot = job.status === 'Queued' ? '🟡' : (job.status === 'Completed' ? '🟢' : (job.status === 'Printing' ? '🖨️' : '🧹'));
            
            // Format: "Neogleamz Name - amount to print - time"
            const displayName = catalogItem ? (catalogItem.neoName || catalogItem.itemName) : job.part_name;
            const timeStr = totalTime > 0 ? ` - ${formatPrintTime(totalTime)}` : "";

            ui.innerHTML += `<li class="${sel}" 
                draggable="true"
                ondragstart="printDragStart(event, ${index})" 
                ondragover="printDragOver(event)" 
                ondrop="printDrop(event, ${index})" 
                ondragend="printDragEnd(event)"
                onclick="selectPrintJob('${job.id}')" 
                style="display:flex; justify-content:space-between; align-items:center; cursor:grab; padding: 10px; border-bottom: 1px solid var(--border-color); margin-bottom: 5px; border-radius: 4px;">
                <div style="display:flex; align-items:center; gap:8px;">
                    <span style="font-size:14px; font-weight:700;">☰ ${dot} ${displayName} - ${job.qty}${timeStr}</span>
                </div>
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
    const catalogItem = catalogByName[job.part_name];
    const displayName = catalogItem ? (catalogItem.neoName || catalogItem.itemName) : job.part_name;
    document.getElementById('printJobTitle').innerText = displayName;

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
        const steps = sopsDB[job.part_name] || [];
        if (steps.length === 0) {
            sopList.innerHTML = `<div style="padding:15px; color:var(--text-muted); border:1px dashed var(--border-color); border-radius:6px;">No specific 3D Print SOP found for this item.</div>`;
        } else {
            let html = "";
            let stepCounter = 1;
            steps.forEach((s, idx) => {
                if (typeof s === 'string') s = { text: s };
                html += `<div class="checklist-item" style="background:var(--bg-container); border:1px solid var(--border-color); margin-bottom:8px;">
                    <div class="chk-text" style="width:100%;">
                        <strong style="color:#8b5cf6;">Step ${stepCounter++}:</strong> ${s.text}
                    </div>
                </div>`;
            });
            sopList.innerHTML = html;
        }
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
            
            // 📦 INVENTORY INTEGRATION: Add the finished raw material to shelf
            // We increment produced_qty for this raw material. 
            // The item_key is the part_name.
            const k = currentPrintJob.part_name;
            if (!inventoryDB[k]) inventoryDB[k] = { consumed_qty: 0, manual_adjustment: 0, produced_qty: 0, sold_qty: 0, min_stock: 0, scrap_qty: 0 };
            
            inventoryDB[k].produced_qty += (parseFloat(currentPrintJob.qty) || 0);
            
            const { error: invErr } = await supabaseClient.from('inventory_consumption').upsert({
                item_key: k,
                ...inventoryDB[k]
            }, { onConflict: 'item_key' });
            
            if (invErr) throw new Error("Inventory update failed: " + invErr.message);

            // 🔄 REFRESH UI: Make sure inventory tab reflects the new stock
            if (typeof renderInventoryTable === 'function') renderInventoryTable();
            if (typeof renderAnalyticsDashboard === 'function') renderAnalyticsDashboard();
        }

        const { error } = await supabaseClient.from('print_queue').update(updatePayload).eq('id', currentPrintJob.id);
        if (error) throw error;

        setMasterStatus("Job Updated!", "mod-success");
        await refreshPrintQueue();
    } catch (e) {
        sysLog(e.message, true);
        setMasterStatus("Update Error", "mod-error");
    }
}

async function deletePrintJob() {
    if (!currentPrintJob) return;
    if (!confirm(`Permanently remove this print job for ${currentPrintJob.part_name}?`)) return;
    try {
        setMasterStatus("Deleting...", "mod-working");
        const { error } = await supabaseClient.from('print_queue').delete().eq('id', currentPrintJob.id);
        if (error) throw error;
        
        currentPrintJob = null;
        await refreshPrintQueue();
        setMasterStatus("Deleted", "mod-success");
    } catch (e) {
        sysLog(e.message, true);
    }
}

function getPrintTime(partName) {
    const catalogItem = catalogByName[partName];
    if (catalogItem) return parseFloat(catalogItem.print_time_mins) || 0;
    return 0;
}

function openPrintSOP(pName) {
    if (typeof openSOPMasterModal === 'function') {
        openSOPMasterModal('3d');
        const select = document.getElementById('sopMasterProductSelect');
        if (select) {
            select.value = pName;
            renderMasterSOP();
        }
    }
}

async function addPrintJob(partName, qty, woId = null) {
    const payload = {
        part_name: partName,
        qty: qty,
        status: 'Queued',
        wo_id: woId,
        created_at: new Date().toISOString()
    };
    const { error } = await supabaseClient.from('print_queue').insert([payload]);
    if (error) sysLog("Add Print Job Error: " + error.message, true);
    else refreshPrintQueue();
}
