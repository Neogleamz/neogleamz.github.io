// --- 10. 3D PRINT QUEUE MODULE ---

async function refreshPrintQueue() {
    try {
        sysLog("Refreshing 3D Print Queue...");
        setMasterStatus("Fetching Queue...", "mod-working");
        const { data, error } = await supabaseClient.from('print_queue').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        printQueueDB = data;
        renderPrintQueue();
        setMasterStatus("Queue Updated", "mod-success");
        setTimeout(() => setMasterStatus("Ready.", "status-idle"), 2000);
    } catch (e) {
        sysLog("Print Queue Error: " + e.message, true);
        setMasterStatus("Sync Error", "mod-error");
    }
}

function renderPrintQueue() {
    const wrap = document.getElementById('printQueueWrap');
    if (!wrap) return;

    let h = `<table style="width:100%;">
        <thead>
            <tr>
                <th>Date</th>
                <th>3D Printed Component</th>
                <th class="text-right">Qty</th>
                <th class="text-right">Total Print Time</th>
                <th>Source WO</th>
                <th>Status</th>
                <th style="text-align:center;">Queue Control</th>
            </tr>
        </thead>
        <tbody>`;

    let totalWaitTime = 0;
    let totalTasks = 0;

    if (printQueueDB.length === 0) {
        h += "<tr><td colspan='7' style='text-align:center; padding:30px; color:var(--text-muted);'>No 3D print jobs currently in the pipeline.</td></tr>";
    } else {
        printQueueDB.forEach(job => {
            // Use Master Engine for recursive print time check
            const breakdown = typeof calculateProductBreakdown === 'function' ? calculateProductBreakdown(job.part_name) : {print:0};
            const printTimePer = breakdown.print;
            const totalTime = printTimePer * job.qty;
            const isActive = job.status !== 'Completed';
            
            if (isActive) {
                totalTasks++;
                totalWaitTime += totalTime;
            }

            const statusMap = {
                'Queued': { label: '⏳ Queued', class: 'badge-queued', next: 'Printing', btn: '▶ Start Print', btnClass: 'btn-blue' },
                'Printing': { label: '🖨️ Printing', class: 'badge-printing', next: 'Cleaned', btn: '🧹 Mark Cleaned', btnClass: 'btn-orange' },
                'Cleaned': { label: '✨ Cleaned', class: 'badge-cleaned', next: 'Completed', btn: '✅ Complete', btnClass: 'btn-green' },
                'Completed': { label: '🏁 Completed', class: 'badge-completed', next: null, btn: null }
            };

            const sInfo = statusMap[job.status] || { label: job.status, class: '', next: null, btn: null };
            const rowOpacity = job.status === 'Completed' ? 'opacity: 0.5;' : '';

            h += `<tr style="${rowOpacity}">
                <td style="color:var(--text-muted); font-size:11px;">${new Date(job.created_at).toLocaleDateString()}</td>
                <td>
                    <div style="display:flex; align-items:center; gap:8px;">
                        <span style="font-weight:bold; color:#8b5cf6; cursor:pointer;" onclick="openPrintSOP('${job.part_name.replace(/'/g, "\\'")}')">🖨️ ${job.part_name}</span>
                        <button class="icon-btn" style="width:20px; height:20px; font-size:10px;" onclick="openPrintSOP('${job.part_name.replace(/'/g, "\\'")}')">📖</button>
                    </div>
                </td>
                <td class="text-right" style="font-weight:bold;">${job.qty}</td>
                <td class="text-right" style="color:var(--text-muted);">${totalTime.toFixed(0)} min <span style="font-size:10px;">(${printTimePer}m ea)</span></td>
                <td style="font-family:monospace; font-size:12px;">${job.wo_id || 'Manual'}</td>
                <td><span class="status-badge ${sInfo.class}">${sInfo.label}</span></td>
                <td style="text-align:center;">
                    ${sInfo.btn ? `<button class="${sInfo.btnClass}" style="padding:5px 12px; font-size:11px; width:auto;" onclick="updatePrintStatus('${job.id}', '${sInfo.next}')">${sInfo.btn}</button>` : '<span style="color:#10b981; font-weight:bold;">COMPLETED</span>'}
                </td>
            </tr>`;
        });
    }

    wrap.innerHTML = h + "</tbody></table>";
    document.getElementById('totalPrintTasks').innerText = totalTasks;
    document.getElementById('totalPrintingTime').innerText = totalWaitTime.toFixed(0);
}

function getPrintTime(partName) {
    const matchedKey = findMasterRecipeKey(partName);
    if (matchedKey && productsDB[matchedKey]) {
        return parseFloat(productsDB[matchedKey].print_time_mins) || 0;
    }
    return 0;
}

async function updatePrintStatus(id, newStatus) {
    try {
        setMasterStatus("Updating Print Job...", "mod-working");
        const updatePayload = { status: newStatus };
        if (newStatus === 'Printing') updatePayload.started_at = new Date().toISOString();
        if (newStatus === 'Completed') updatePayload.completed_at = new Date().toISOString();

        const { error } = await supabaseClient.from('print_queue').update(updatePayload).eq('id', id);
        if (error) throw error;

        setMasterStatus("Job Updated", "mod-success");
        refreshPrintQueue();
    } catch (e) {
        sysLog("Update Status Error: " + e.message, true);
        setMasterStatus("Error", "mod-error");
    }
}

function openPrintSOP(pName) {
    // Reuse the Master SOP Editor but filter/focus on the product
    const modal = document.getElementById('sopMasterModal');
    const select = document.getElementById('sopMasterProductSelect');
    if (modal && select) {
        select.value = pName;
        modal.style.display = 'flex';
        renderMasterSOP();
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
}
