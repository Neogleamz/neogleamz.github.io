// --- 8. INVENTORY MANAGERS & REORDER LOGIC ---
function sortFGI(c) { if(isResizing) return; currentFgiSort = { column: c, direction: currentFgiSort.column===c && currentFgiSort.direction==='asc' ? 'desc' : 'asc' }; renderFgiTable(); }
function sortInventory(c) { if(isResizing) return; currentInvSort = { column: c, direction: currentInvSort.column===c && currentInvSort.direction==='asc' ? 'desc' : 'asc' }; renderInventoryTable(); }

function renderFgiTable() {
    const wrap = document.getElementById('fgiTableWrap'); if(!wrap) return;
    let ths = ` <th class="${currentFgiSort.column==='n'?'sorted-'+currentFgiSort.direction:''}" onclick="sortFGI('n')">Product Name</th> <th class="${currentFgiSort.column==='b'?'sorted-'+currentFgiSort.direction:''} text-right" onclick="sortFGI('b')" style="border-bottom:2px solid #3b82f6;">Total Built</th> <th class="${currentFgiSort.column==='sold'?'sorted-'+currentFgiSort.direction:''} text-right" onclick="sortFGI('sold')" style="border-bottom:2px solid #ef4444;">Total Sold</th> <th class="${currentFgiSort.column==='s'?'sorted-'+currentFgiSort.direction:''} text-right" onclick="sortFGI('s')" style="border-bottom:2px solid #10b981;">Current Stock</th> <th class="${currentFgiSort.column==='rc'?'sorted-'+currentFgiSort.direction:''} text-right" onclick="sortFGI('rc')">Raw COGS</th> <th class="${currentFgiSort.column==='lc'?'sorted-'+currentFgiSort.direction:''} text-right" onclick="sortFGI('lc')">Labor Cost</th> <th class="${currentFgiSort.column==='tc'?'sorted-'+currentFgiSort.direction:''} text-right" onclick="sortFGI('tc')">True COGS</th> <th class="${currentFgiSort.column==='tv'?'sorted-'+currentFgiSort.direction:''} text-right" onclick="sortFGI('tv')">Total Asset Value</th> `;
    let h = `<table style="width:100%;"><thead><tr>${ths}</tr></thead><tbody>`;
    let a = Object.keys(productsDB).map(p => { 
        let k = `RECIPE:::${p}`; let i = inventoryDB[k] || {produced_qty: 0, sold_qty: 0}; 
        let b = parseFloat(i.produced_qty) || 0; let sold = parseFloat(i.sold_qty) || 0; 
        let s = b - sold; 
        let breakdown = calculateProductBreakdown(p);
        let tv = s * breakdown.total;
        return { k: k, n: p, b: b, sold: sold, s: s, rc: breakdown.raw, lc: breakdown.labor, tc: breakdown.total, tv: tv, isSub: !!isSubassemblyDB[p] }; 
    });
    if(a.length===0){ h += "<tr><td colspan='8' style='text-align:center;'>No finished goods.</td></tr>"; }
    else {
        a.sort((x,y) => { let u = x[currentFgiSort.column]; let v = y[currentFgiSort.column]; if (typeof u === 'number' && typeof v === 'number') return currentFgiSort.direction === 'asc' ? u - v : v - u; u = (u||"").toString().toLowerCase(); v = (v||"").toString().toLowerCase(); if(u<v) return currentFgiSort.direction==='asc'?-1:1; if(u>v) return currentFgiSort.direction==='asc'?1:-1; return 0; });
        a.forEach(x => { 
            let sk = String(x.k).replace(/'/g, "\\'").replace(/"/g, '"'); 
            let icon = x.isSub ? "⚙️" : "📦";
            h += `<tr><td tabindex="0" class="trunc-col" style="font-weight:bold; color:#0ea5e9;">${icon} ${x.n}</td><td class="text-right editable" style="color:#3b82f6;" contenteditable="true" onfocus="storeOldVal(this)" onblur="handleInvEdit(this,'${sk}',0,0,0,0,'produced_qty')">${x.b.toFixed(2).replace(/\.?0+$/,'')}</td><td class="text-right editable" style="color:#ef4444;" contenteditable="true" onfocus="storeOldVal(this)" onblur="handleInvEdit(this,'${sk}',0,0,0,0,'sold_qty')">${x.sold.toFixed(2).replace(/\.?0+$/,'')}</td><td class="text-right editable" style="font-weight:bold; color:#10b981;" contenteditable="true" onfocus="storeOldVal(this)" onblur="handleInvEdit(this,'${sk}',0,0,0,0,'fgi_stock')">${x.s.toFixed(2).replace(/\.?0+$/,'')}</td><td class="text-right" style="color:var(--text-muted);">$${x.rc.toFixed(2)}</td><td class="text-right" style="color:var(--text-muted);">$${x.lc.toFixed(2)}</td><td class="text-right" style="font-weight:bold;">$${x.tc.toFixed(2)}</td><td class="text-right" style="font-weight:bold; color:#10b981;">$${x.tv.toFixed(2)}</td></tr>`; 
        });
    }
    wrap.innerHTML = h + `</tbody></table>`; applyTableInteractivity('fgiTableWrap');
}

function renderInventoryTable() {
    const wrap = document.getElementById('invTableWrap'); if(!wrap) return;
    renderFgiTable();
    let ths = ` <th class="${currentInvSort.column==='nn'?'sorted-'+currentInvSort.direction:''}" onclick="sortInventory('nn')">Neogleamz Name</th> <th class="${currentInvSort.column==='n'?'sorted-'+currentInvSort.direction:''}" onclick="sortInventory('n')">Item Name</th> <th class="${currentInvSort.column==='p'?'sorted-'+currentInvSort.direction:''} text-right" onclick="sortInventory('p')">Purchased</th> <th class="${currentInvSort.column==='c'?'sorted-'+currentInvSort.direction:''} text-right" onclick="sortInventory('c')" style="border-bottom:2px solid #ef4444;">Consumed</th> <th class="${currentInvSort.column==='sq'?'sorted-'+currentInvSort.direction:''} text-right" onclick="sortInventory('sq')" style="border-bottom:2px solid #b91c1c;">Scrap Loss</th> <th class="${currentInvSort.column==='a'?'sorted-'+currentInvSort.direction:''} text-right" onclick="sortInventory('a')" style="border-bottom:2px solid #0ea5e9;">Adjustment</th> <th class="${currentInvSort.column==='ms'?'sorted-'+currentInvSort.direction:''} text-right" onclick="sortInventory('ms')" style="border-bottom:2px solid #f97316;">Min Stock</th> <th class="${currentInvSort.column==='s'?'sorted-'+currentInvSort.direction:''} text-right" onclick="sortInventory('s')" style="border-bottom:2px solid #f59e0b;">Current Stock</th> <th class="${currentInvSort.column==='tp'?'sorted-'+currentInvSort.direction:''} text-right" onclick="sortInventory('tp')">Total Value</th> `;
    let h = `<table style="width:100%;"><thead><tr>${ths}</tr></thead><tbody>`;
    let a = Object.keys(catalogCache).map(k => { let c = catalogCache[k], f = fmtKey(k), i = inventoryDB[k]||{consumed_qty:0, manual_adjustment:0, min_stock:0, scrap_qty:0}; let s=c.totalQty-i.consumed_qty-i.scrap_qty+i.manual_adjustment; let up=c.avgUnitCost||0; let tp=s*up; return { k:k, nn:c.neoName, n:c.itemName, p:c.totalQty, c:i.consumed_qty, sq:i.scrap_qty, a:i.manual_adjustment, ms:i.min_stock, s:s, up:up, tp:tp }; });
    if(a.length===0){ h += "<tr><td colspan='9' style='text-align:center;'>No raw inventory.</td></tr>"; }
    else {
        a.sort((x,y) => { let u = x[currentInvSort.column]; let v = y[currentInvSort.column]; if (typeof u === 'number' && typeof v === 'number') return currentInvSort.direction === 'asc' ? u - v : v - u; u = (u||"").toString().toLowerCase(); v = (v||"").toString().toLowerCase(); if(u<v) return currentInvSort.direction==='asc'?-1:1; if(u>v) return currentInvSort.direction==='asc'?1:-1; return 0; });
        a.forEach(x => { let isLow = x.ms > 0 && x.s < x.ms; let sc = x.s<0 ? 'negative-stock' : (isLow ? 'low-stock' : 'highlight-calc'); let sk = String(x.k).replace(/'/g, "\\'").replace(/"/g, '"'); h += `<tr><td tabindex="0" class="trunc-col" style="font-weight:bold; color:var(--text-heading);">${x.nn}</td><td tabindex="0" class="trunc-col" style="font-weight:bold; color:#64748b;">${x.n}</td><td class="text-right">${x.p.toFixed(2).replace(/\.?0+$/,'')}</td><td class="text-right editable" style="color:#ef4444;" contenteditable="true" onfocus="storeOldVal(this)" onblur="handleInvEdit(this,'${sk}',${x.p},${x.c},${x.a},${x.sq},'consumed_qty')">${x.c.toFixed(2).replace(/\.?0+$/,'')}</td><td class="text-right editable" style="color:#b91c1c;" contenteditable="true" onfocus="storeOldVal(this)" onblur="handleInvEdit(this,'${sk}',${x.p},${x.c},${x.a},${x.sq},'scrap_qty')">${x.sq.toFixed(2).replace(/\.?0+$/,'')}</td><td class="text-right editable" style="color:#0ea5e9;" contenteditable="true" onfocus="storeOldVal(this)" onblur="handleInvEdit(this,'${sk}',${x.p},${x.c},${x.a},${x.sq},'manual_adjustment')">${x.a!==0?(x.a>0?'+':'')+x.a.toFixed(2).replace(/\.?0+$/,''):'0'}</td><td class="text-right editable" style="color:#f97316;" contenteditable="true" onfocus="storeOldVal(this)" onblur="handleInvEdit(this,'${sk}',${x.p},${x.c},${x.a},${x.sq},'min_stock')">${x.ms.toFixed(2).replace(/\.?0+$/,'')}</td><td class="text-right editable ${sc}" contenteditable="true" onfocus="storeOldVal(this)" onblur="handleInvEdit(this,'${sk}',${x.p},${x.c},${x.a},${x.sq},'stock')">${x.s.toFixed(2).replace(/\.?0+$/,'')}</td><td class="text-right" style="font-weight:bold; color:#10b981;">$${x.tp.toFixed(2)}</td></tr>`; });
    }
    wrap.innerHTML = h + `</tbody></table>`; applyTableInteractivity('invTableWrap');
}

async function handleInvEdit(cell, key, p, c, a, sq, mode) {
    try { 
        let rKey = key.replace(/"/g, '"').replace(/\\'/g, "'"); let v = parseFloat(cell.innerText.replace(/[^0-9.-]+/g,"")); 
        if(isNaN(v)) { cell.innerText = oldValTemp; return alert("Valid number required."); } 
        
        if(!inventoryDB[rKey]) inventoryDB[rKey] = {consumed_qty:0, manual_adjustment:0, produced_qty:0, sold_qty:0, min_stock:0, scrap_qty:0};
        let payload = { item_key: rKey, consumed_qty: inventoryDB[rKey].consumed_qty, manual_adjustment: inventoryDB[rKey].manual_adjustment, produced_qty: inventoryDB[rKey].produced_qty, sold_qty: inventoryDB[rKey].sold_qty, min_stock: inventoryDB[rKey].min_stock, scrap_qty: inventoryDB[rKey].scrap_qty };
        
        if(mode === 'produced_qty') { payload.produced_qty = Math.abs(v); if(payload.produced_qty === inventoryDB[rKey].produced_qty) return; }
        else if(mode === 'sold_qty') { payload.sold_qty = Math.abs(v); if(payload.sold_qty === inventoryDB[rKey].sold_qty) return; }
        else if(mode === 'fgi_stock') { payload.produced_qty = v + inventoryDB[rKey].sold_qty; if(payload.produced_qty === inventoryDB[rKey].produced_qty) return; }
        else if(mode === 'consumed_qty') { payload.consumed_qty = Math.abs(v); if(payload.consumed_qty === c) return; } 
        else if(mode === 'stock') { payload.manual_adjustment = v - (p - c - sq); if(payload.manual_adjustment === a) return; }
        else if(mode === 'manual_adjustment') { payload.manual_adjustment = v; if(payload.manual_adjustment === a) return; }
        else if(mode === 'min_stock') { payload.min_stock = Math.abs(v); if(payload.min_stock === inventoryDB[rKey].min_stock) return; }
        else if(mode === 'scrap_qty') { payload.scrap_qty = Math.abs(v); if(payload.scrap_qty === sq) return; }

        sysLog(`Inv Edit: [${rKey}] ${mode} to ${v}`); setMasterStatus("Updating...", "mod-working"); 
        const { error } = await supabaseClient.from('inventory_consumption').upsert(payload, {onConflict:'item_key'}); 
        if(error) throw new Error(error.message); 
        
        inventoryDB[rKey] = payload;
        setMasterStatus("Adjusted!", "mod-success"); cell.classList.add('edited-success'); 
        setTimeout(()=>cell.classList.remove('edited-success'),1000); setTimeout(()=>setMasterStatus("Ready.", "status-idle"),2000); 
        renderInventoryTable(); if(typeof renderAnalyticsDashboard === 'function' && document.getElementById('analytics-tab').classList.contains('active')) renderAnalyticsDashboard();
    } catch(e) { sysLog(e.message, true); setMasterStatus("Error", "mod-error"); cell.innerText = oldValTemp; }
}

async function runProductionBatch() {
    try { 
        const n = document.getElementById('batchProductSelect').value; const q = parseFloat(document.getElementById('batchQty').value); 
        if(!n || isNaN(q) || q<=0) return alert("Select product & valid Qty."); 
        sysLog(`Batch Run: ${q}x ${n}`); setSysProgress(20, 'working'); 
        
        let raw = getRawMaterials(n, q); let keys = Object.keys(raw); 
        if(keys.length===0){ setSysProgress(0,'working'); return alert("Recipe empty."); } 
        
        let ups = keys.map(k => { 
            if(!inventoryDB[k]) inventoryDB[k] = {consumed_qty:0, manual_adjustment:0, produced_qty:0, sold_qty:0, min_stock:0, scrap_qty:0};
            inventoryDB[k].consumed_qty += raw[k];
            return {item_key: k, consumed_qty: inventoryDB[k].consumed_qty, manual_adjustment: inventoryDB[k].manual_adjustment, produced_qty: inventoryDB[k].produced_qty, sold_qty: inventoryDB[k].sold_qty, min_stock: inventoryDB[k].min_stock, scrap_qty: inventoryDB[k].scrap_qty}; 
        }); 
        
        let fgiKey = `RECIPE:::${n}`;
        if(!inventoryDB[fgiKey]) inventoryDB[fgiKey] = {consumed_qty:0, manual_adjustment:0, produced_qty:0, sold_qty:0, min_stock:0, scrap_qty:0};
        inventoryDB[fgiKey].produced_qty += q;
        ups.push({item_key: fgiKey, consumed_qty: inventoryDB[fgiKey].consumed_qty, manual_adjustment: inventoryDB[fgiKey].manual_adjustment, produced_qty: inventoryDB[fgiKey].produced_qty, sold_qty: inventoryDB[fgiKey].sold_qty, min_stock: inventoryDB[fgiKey].min_stock, scrap_qty: inventoryDB[fgiKey].scrap_qty});

        setSysProgress(60, 'working'); 
        const {error} = await supabaseClient.from('inventory_consumption').upsert(ups, {onConflict:'item_key'}); 
        if(error) throw new Error(error.message); 
        
        setSysProgress(100, 'success'); sysLog("Batch Complete."); alert(`Built ${q}x ${n} and deducted materials.`); 
        document.getElementById('batchQty').value=1; renderInventoryTable(); setTimeout(()=>setSysProgress(0,'working'),3000); 
    } catch(e) { setSysProgress(100, 'error'); sysLog(e.message, true); alert("Batch Error."); }
}

async function resetInventoryConsumption() {
    try { 
        if(!confirm("⚠️ DANGER: Reset ALL consumption, adjustments, min stocks, scrap, built, and sold quantities to zero?")) return; 
        sysLog("Resetting Inventory..."); setSysProgress(50, 'working'); 
        const {error} = await supabaseClient.from('inventory_consumption').delete().neq('item_key', 'fake'); 
        if(error) throw new Error(error.message); 
        inventoryDB={}; renderInventoryTable(); setSysProgress(100, 'success'); sysLog("Reset."); setTimeout(()=>setSysProgress(0,'working'),3000); 
    } catch(e) { setSysProgress(100, 'error'); sysLog(e.message, true); }
}

function printReorderReport() {
    try {
        let html = `<html><head><title>Neogleamz Reorder Report</title><style>body{font-family:sans-serif; padding:20px;} table{width:100%; border-collapse:collapse; font-size:14px; margin-top: 15px;} th,td{border:1px solid #ccc; padding:8px; text-align:left;} th{background:#f1f5f9;}</style></head><body>`;
        html += `<h2>🚨 Low Stock Reorder Report</h2><p style="color:#64748b; font-size:14px;">Date: ${new Date().toLocaleDateString()}</p>`;
        html += `<table><thead><tr><th>Neogleamz Name</th><th>Item Name</th><th>Spec</th><th>Current Stock</th><th>Min Target</th><th>Shortfall</th><th>Est. Cost to Restock</th></tr></thead><tbody>`;
        
        let items = [];
        Object.keys(catalogCache).forEach(k => {
            let c = catalogCache[k], f = fmtKey(k), i = inventoryDB[k] || {};
            let s = c.totalQty - (i.consumed_qty || 0) - (i.scrap_qty || 0) + (i.manual_adjustment || 0);
            let ms = i.min_stock || 0;
            if(ms > 0 && s < ms) { let short = ms - s; items.push({nn: c.neoName, n: c.itemName, sp: c.spec, s: s, ms: ms, short: short, cost: short * (c.avgUnitCost || 0)}); }
        });

        if(items.length === 0) { html += `<tr><td colspan="7" style="text-align:center; padding: 20px;">All monitored stock levels are optimal.</td></tr>`; } 
        else {
            let grandTotal = 0;
            items.sort((a,b) => b.cost - a.cost).forEach(x => { grandTotal += x.cost; let displaySpec = x.sp === '(Mixed Specs)' ? '' : x.sp; html += `<tr><td>${x.nn || ''}</td><td>${x.n}</td><td>${displaySpec}</td><td style="color:#ef4444; font-weight:bold;">${x.s.toFixed(2).replace(/\.?0+$/,'')}</td><td>${x.ms.toFixed(2).replace(/\.?0+$/,'')}</td><td style="font-weight:bold;">${x.short.toFixed(2).replace(/\.?0+$/,'')}</td><td>$${x.cost.toFixed(2)}</td></tr>`; });
            html += `<tr><td colspan="6" style="text-align:right; font-weight:bold; padding-top: 15px;">Total Capital Required:</td><td style="font-weight:bold; padding-top: 15px;">$${grandTotal.toFixed(2)}</td></tr>`;
        }
        html += `</tbody></table></body></html>`; let win = window.open('', '', 'width=900,height=700'); win.document.write(html); win.document.close(); setTimeout(() => win.print(), 250);
    } catch (e) { sysLog(e.message, true); }
}