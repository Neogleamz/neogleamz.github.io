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
                <div style="display:flex; align-items:center; gap:8px;">
                    <span style="font-size:14px; font-weight:700;">☰ ${dot} ${displayID}: ${displayName}${timeStr}</span>
                </div>
                <span style="font-weight:900; font-family:monospace;">x${job.qty}</span>
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
        const steps = sopsDB[cleanPartName] || [];
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
    pName = pName.split(':::')[0];
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
    document.getElementById('manualPrintModal').style.display = 'flex';
}

function closeManualPrintModal() {
    document.getElementById('manualPrintModal').style.display = 'none';
}

async function submitManualPrint() {
    const k = document.getElementById('manualPrintSelect').value;
    const q = parseInt(document.getElementById('manualPrintQty').value);
    if (!k || isNaN(q) || q <= 0) return alert("Please select a valid 3D part and quantity.");
    
    closeManualPrintModal();
    setMasterStatus("Queuing Manual Print...", "mod-working");
    
    await addPrintJob(k, q, "Manual Entry");
    
    setMasterStatus("Job Queued!", "mod-success");
    setTimeout(() => setMasterStatus("Ready.", "status-idle"), 2000);
}
