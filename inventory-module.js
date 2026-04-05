// --- 8. INVENTORY MANAGERS & REORDER LOGIC ---
const savedFgiState = JSON.parse(localStorage.getItem('fgiCategoryState') || "null");
window.fgiCategoryState = savedFgiState || { 'cat-retail': true, 'cat-sub': true, 'cat-print': true, 'cat-label': true };
window.toggleFgiCategory = function(cat) { 
    window.fgiCategoryState[cat] = !window.fgiCategoryState[cat]; 
    localStorage.setItem('fgiCategoryState', JSON.stringify(window.fgiCategoryState));
    renderFgiTable(); 
};
function sortFGI(c) { if(isResizing) return; currentFgiSort = { column: c, direction: currentFgiSort.column===c && currentFgiSort.direction==='asc' ? 'desc' : 'asc' }; renderFgiTable(); }
function sortInventory(c) { if(isResizing) return; currentInvSort = { column: c, direction: currentInvSort.column===c && currentInvSort.direction==='asc' ? 'desc' : 'asc' }; renderInventoryTable(); }

function renderFgiTable() {
    const wrap = document.getElementById('fgiTableWrap'); if(!wrap) return;
    let ths = ` <th class="${currentFgiSort.column==='n'?'sorted-'+currentFgiSort.direction:''}" onclick="sortFGI('n')">Product Name</th> <th class="${currentFgiSort.column==='b'?'sorted-'+currentFgiSort.direction:''} text-right" onclick="sortFGI('b')" style="border-bottom:2px solid #3b82f6;">PROD</th> <th class="${currentFgiSort.column==='pb'?'sorted-'+currentFgiSort.direction:''} text-right" onclick="sortFGI('pb')" style="border-bottom:2px solid #8b5cf6;">PROTO</th> <th class="${currentFgiSort.column==='sold'?'sorted-'+currentFgiSort.direction:''} text-right" onclick="sortFGI('sold')" style="border-bottom:2px solid #ef4444;">Sold</th> <th class="${currentFgiSort.column==='s'?'sorted-'+currentFgiSort.direction:''} text-right" onclick="sortFGI('s')" style="border-bottom:2px solid #10b981;">Stock</th> <th class="${currentFgiSort.column==='ms'?'sorted-'+currentFgiSort.direction:''} text-right" onclick="sortFGI('ms')" style="border-bottom:2px solid #f97316;">MIN</th> <th class="${currentFgiSort.column==='net'?'sorted-'+currentFgiSort.direction:''} text-right" onclick="sortFGI('net')">NET</th> <th class="${currentFgiSort.column==='msrpv'?'sorted-'+currentFgiSort.direction:''} text-right" onclick="sortFGI('msrpv')">MSRP</th> <th class="${currentFgiSort.column==='tv'?'sorted-'+currentFgiSort.direction:''} text-right" onclick="sortFGI('tv')">Assets</th> `;
    let h = `<table style="width:100%;"><thead><tr>${ths}</tr></thead><tbody>`;
    let a = Object.keys(productsDB).map(p => { 
        let k = `RECIPE:::${p}`; let i = inventoryDB[k] || {produced_qty: 0, sold_qty: 0, consumed_qty: 0, prototype_produced_qty: 0, scrap_qty: 0, manual_adjustment: 0}; 
        let b = parseFloat(i.produced_qty) || 0; let pb = parseFloat(i.prototype_produced_qty) || 0; let sold = parseFloat(i.sold_qty) || 0; 
        let c_prod = parseFloat(i.production_consumed_qty) || 0; let c_proto = parseFloat(i.prototype_consumed_qty) || 0; let scrap = parseFloat(i.scrap_qty) || 0; let adj = parseFloat(i.manual_adjustment) || 0;
        let s = b - sold - c_prod - scrap + adj - Math.max(0, c_proto - pb); 
        let breakdown = calculateProductBreakdown(p);
        let tv = s * breakdown.total;
        let is3D = !!(productsDB[p] && productsDB[p].is_3d_print);
        let ms = parseFloat(i.min_stock) || 0;
        let unit_msrp = (typeof getEngineLiveMsrp === 'function') ? getEngineLiveMsrp(p) : 0;
        let msrpv = s * unit_msrp;
        let total_net = unit_msrp > 0 ? (unit_msrp - breakdown.total) * s : 0;
        let isLabel = !!(productsDB[p] && productsDB[p].is_label);
        return { k: k, n: p, b: b, pb: pb, sold: sold, s: s, ms: ms, tc: breakdown.total, msrpv: msrpv, tv: tv, net: total_net, isSub: !!isSubassemblyDB[p], is3D: is3D, isLabel: isLabel }; 
    });
    if(a.length===0){ h += "<tr><td colspan='10' style='text-align:center;'>No finished goods.</td></tr>"; }
    else {
        let sortFn = (x,y) => { let u = x[currentFgiSort.column]; let v = y[currentFgiSort.column]; if (typeof u === 'number' && typeof v === 'number') return currentFgiSort.direction === 'asc' ? u - v : v - u; u = (u||"").toString().toLowerCase(); v = (v||"").toString().toLowerCase(); if(u<v) return currentFgiSort.direction==='asc'?-1:1; if(u>v) return currentFgiSort.direction==='asc'?1:-1; return 0; };
        let groups = [
            { id: 'cat-retail', name: 'Retail Products', icn: '📦', items: a.filter(x => !x.is3D && !x.isSub && !x.isLabel).sort(sortFn) },
            { id: 'cat-sub',    name: 'Sub-Assemblies',  icn: '⚙️',  items: a.filter(x => x.isSub && !x.is3D).sort(sortFn) },
            { id: 'cat-print',  name: '3D Prints',       icn: '🖨️',  items: a.filter(x => x.is3D).sort(sortFn) },
            { id: 'cat-label',  name: 'Custom Labels',   icn: '🏷️',  items: a.filter(x => x.isLabel).sort(sortFn) }
        ];

        groups.forEach(g => {
            if(g.items.length === 0) return;
            let isExp = window.fgiCategoryState[g.id] !== false;
            let chevron = isExp ? '▼' : '▶';
            h += `<tr class="category-header" onclick="window.toggleFgiCategory('${g.id}')" style="cursor:pointer; background:rgba(255,255,255,0.03); transition: background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.06)'" onmouseout="this.style.background='rgba(255,255,255,0.03)'"><td colspan="9" style="font-weight:900; color:var(--primary-color); padding:10px 15px; font-size:13px; text-transform:uppercase; letter-spacing:1px; border-bottom:1px solid rgba(255,255,255,0.1);"><span style="display:inline-block; width:20px; color:var(--text-muted);">${chevron}</span> ${g.icn} ${g.name} <span style="color:var(--text-muted); font-size:11px; margin-left:8px;">(${g.items.length})</span></td></tr>`;
            
            g.items.forEach(x => { 
                let sk = String(x.k).replace(/'/g, "\\'").replace(/"/g, '"'); 
                let netColor = x.net > 0 ? '#10b981' : (x.net < 0 ? '#ef4444' : 'var(--text-muted)');
                let isLow = x.ms > 0 && x.s < x.ms; 
                let sc = x.s < 0 ? 'negative-stock' : (isLow ? 'low-stock' : 'highlight-calc');
                h += `<tr class="${g.id}" style="display:${isExp?'table-row':'none'};"><td tabindex="0" class="trunc-col" style="font-weight:bold; color:var(--text-main); padding-left:25px;">${x.n}</td><td class="text-right editable" style="color:#3b82f6;" contenteditable="true" onfocus="storeOldVal(this)" onblur="handleInvEdit(this,'${sk}',0,0,0,0,'produced_qty')">${x.b.toFixed(2).replace(/\.?0+$/,'')}</td><td class="text-right editable" style="color:#8b5cf6;" contenteditable="true" onfocus="storeOldVal(this)" onblur="handleInvEdit(this,'${sk}',0,0,0,0,'prototype_produced_qty')">${x.pb.toFixed(2).replace(/\.?0+$/,'')}</td><td class="text-right editable" style="color:#ef4444;" contenteditable="true" onfocus="storeOldVal(this)" onblur="handleInvEdit(this,'${sk}',0,0,0,0,'sold_qty')">${x.sold.toFixed(2).replace(/\.?0+$/,'')}</td><td class="text-right editable ${sc}" style="font-weight:bold;" contenteditable="true" onfocus="storeOldVal(this)" onblur="handleInvEdit(this,'${sk}',0,0,0,0,'fgi_stock')">${x.s.toFixed(2).replace(/\.?0+$/,'')}</td><td class="text-right editable" style="color:#f97316; font-weight:bold;" contenteditable="true" onfocus="storeOldVal(this)" onblur="handleInvEdit(this,'${sk}',0,0,0,0,'min_stock')">${x.ms.toFixed(2).replace(/\.?0+$/,'')}</td><td class="text-right" style="font-weight:bold; color:${netColor};">$${x.net.toFixed(2)}</td><td class="text-right" style="font-weight:bold; color:var(--text-main);">$${(x.msrpv||0).toFixed(2)}</td><td class="text-right" style="font-weight:bold; color:#10b981;">$${x.tv.toFixed(2)}</td></tr>`; 
            });
        });
    }
    wrap.innerHTML = h + `</tbody></table>`; applyTableInteractivity('fgiTableWrap');
}

function renderInventoryTable() {
    const wrap = document.getElementById('invTableWrap'); if(!wrap) return;
    renderFgiTable();
    let ths = ` <th class="${currentInvSort.column==='nn'?'sorted-'+currentInvSort.direction:''}" onclick="sortInventory('nn')">Neogleamz Name</th> <th class="${currentInvSort.column==='n'?'sorted-'+currentInvSort.direction:''}" onclick="sortInventory('n')">Item Name</th> <th class="${currentInvSort.column==='p'?'sorted-'+currentInvSort.direction:''} text-right" onclick="sortInventory('p')">Purchased</th> <th class="${currentInvSort.column==='c'?'sorted-'+currentInvSort.direction:''} text-right" onclick="sortInventory('c')" style="border-bottom:2px solid #ef4444;">CONSUMED</th> <th class="${currentInvSort.column==='pc'?'sorted-'+currentInvSort.direction:''} text-right" onclick="sortInventory('pc')" style="border-bottom:2px solid #8b5cf6;">PROTO</th> <th class="${currentInvSort.column==='prc'?'sorted-'+currentInvSort.direction:''} text-right" onclick="sortInventory('prc')" style="border-bottom:2px solid #3b82f6;">PROD</th> <th class="${currentInvSort.column==='sq'?'sorted-'+currentInvSort.direction:''} text-right" onclick="sortInventory('sq')" style="border-bottom:2px solid #b91c1c;">LOSS</th> <th class="${currentInvSort.column==='a'?'sorted-'+currentInvSort.direction:''} text-right" onclick="sortInventory('a')" style="border-bottom:2px solid #0ea5e9;">ADJMT</th> <th class="${currentInvSort.column==='ms'?'sorted-'+currentInvSort.direction:''} text-right" onclick="sortInventory('ms')" style="border-bottom:2px solid #f97316;">MIN</th> <th class="${currentInvSort.column==='s'?'sorted-'+currentInvSort.direction:''} text-right" onclick="sortInventory('s')" style="border-bottom:2px solid #f59e0b;">Current Stock</th> <th class="${currentInvSort.column==='tp'?'sorted-'+currentInvSort.direction:''} text-right" onclick="sortInventory('tp')">Total Value</th> `;
    let h = `<table style="width:100%;"><thead><tr>${ths}</tr></thead><tbody>`;
    let a = Object.keys(catalogCache).map(k => { let c = catalogCache[k], f = fmtKey(k), i = inventoryDB[k]||{consumed_qty:0, manual_adjustment:0, min_stock:0, scrap_qty:0, prototype_consumed_qty:0, assembly_consumed_qty:0, production_consumed_qty:0, prototype_produced_qty:0}; let s=c.totalQty-i.consumed_qty-i.scrap_qty+i.manual_adjustment; let up=c.avgUnitCost||0; let tp=s*up; return { k:k, nn:c.neoName, n:c.itemName, p:c.totalQty, c:i.consumed_qty, sq:i.scrap_qty, a:i.manual_adjustment, ms:i.min_stock, s:s, up:up, tp:tp, pc: (i.prototype_consumed_qty||0), prc: (i.production_consumed_qty||0) }; });
    if(a.length===0){ h += "<tr><td colspan='12' style='text-align:center;'>No raw inventory.</td></tr>"; }
    else {
        a.sort((x,y) => { let u = x[currentInvSort.column]; let v = y[currentInvSort.column]; if (typeof u === 'number' && typeof v === 'number') return currentInvSort.direction === 'asc' ? u - v : v - u; u = (u||"").toString().toLowerCase(); v = (v||"").toString().toLowerCase(); if(u<v) return currentInvSort.direction==='asc'?-1:1; if(u>v) return currentInvSort.direction==='asc'?1:-1; return 0; });
        a.forEach(x => { let isLow = x.ms > 0 && x.s < x.ms; let sc = x.s<0 ? 'negative-stock' : (isLow ? 'low-stock' : 'highlight-calc'); let sk = String(x.k).replace(/'/g, "\\'").replace(/"/g, '"'); h += `<tr><td tabindex="0" class="trunc-col" style="font-weight:bold; color:var(--text-heading);">${x.nn}</td><td tabindex="0" class="trunc-col" style="font-weight:bold; color:#64748b;">${x.n}</td><td class="text-right">${x.p.toFixed(2).replace(/\.?0+$/,'')}</td><td class="text-right editable" style="color:#ef4444;" contenteditable="true" onfocus="storeOldVal(this)" onblur="handleInvEdit(this,'${sk}',${x.p},${x.c},${x.a},${x.sq},'consumed_qty')">${x.c.toFixed(2).replace(/\.?0+$/,'')}</td><td class="text-right editable" style="color:#8b5cf6;" contenteditable="true" onfocus="storeOldVal(this)" onblur="handleInvEdit(this,'${sk}',${x.p},${x.c},${x.a},${x.sq},'prototype_consumed_qty')">${x.pc.toFixed(2).replace(/\.?0+$/,'')}</td><td class="text-right editable" style="color:#3b82f6;" contenteditable="true" onfocus="storeOldVal(this)" onblur="handleInvEdit(this,'${sk}',${x.p},${x.c},${x.a},${x.sq},'production_consumed_qty')">${x.prc.toFixed(2).replace(/\.?0+$/,'')}</td><td class="text-right editable" style="color:#b91c1c;" contenteditable="true" onfocus="storeOldVal(this)" onblur="handleInvEdit(this,'${sk}',${x.p},${x.c},${x.a},${x.sq},'scrap_qty')">${x.sq.toFixed(2).replace(/\.?0+$/,'')}</td><td class="text-right editable" style="color:#0ea5e9;" contenteditable="true" onfocus="storeOldVal(this)" onblur="handleInvEdit(this,'${sk}',${x.p},${x.c},${x.a},${x.sq},'manual_adjustment')">${x.a!==0?(x.a>0?'+':'')+x.a.toFixed(2).replace(/\.?0+$/,''):'0'}</td><td class="text-right editable" style="color:#f97316;" contenteditable="true" onfocus="storeOldVal(this)" onblur="handleInvEdit(this,'${sk}',${x.p},${x.c},${x.a},${x.sq},'min_stock')">${x.ms.toFixed(2).replace(/\.?0+$/,'')}</td><td class="text-right editable ${sc}" contenteditable="true" onfocus="storeOldVal(this)" onblur="handleInvEdit(this,'${sk}',${x.p},${x.c},${x.a},${x.sq},'stock')">${x.s.toFixed(2).replace(/\.?0+$/,'')}</td><td class="text-right" style="font-weight:bold; color:#10b981;">$${x.tp.toFixed(2)}</td></tr>`; });
    }
    wrap.innerHTML = h + `</tbody></table>`; applyTableInteractivity('invTableWrap');
}

async function handleInvEdit(cell, key, p, c, a, sq, mode) {
    try { 
        let rKey = key.replace(/"/g, '"').replace(/\\'/g, "'"); let v = parseFloat(cell.innerText.replace(/[^0-9.-]+/g,"")); 
        if(isNaN(v)) { cell.innerText = oldValTemp; return alert("Valid number required."); } 
        
        if(!inventoryDB[rKey]) inventoryDB[rKey] = {consumed_qty:0, manual_adjustment:0, produced_qty:0, sold_qty:0, min_stock:0, scrap_qty:0, prototype_consumed_qty:0, assembly_consumed_qty:0, production_consumed_qty:0, prototype_produced_qty:0};
        let payload = { item_key: rKey, consumed_qty: inventoryDB[rKey].consumed_qty, manual_adjustment: inventoryDB[rKey].manual_adjustment, produced_qty: inventoryDB[rKey].produced_qty, sold_qty: inventoryDB[rKey].sold_qty, min_stock: inventoryDB[rKey].min_stock, scrap_qty: inventoryDB[rKey].scrap_qty, prototype_consumed_qty: inventoryDB[rKey].prototype_consumed_qty||0, assembly_consumed_qty: inventoryDB[rKey].assembly_consumed_qty||0, production_consumed_qty: inventoryDB[rKey].production_consumed_qty||0, prototype_produced_qty: inventoryDB[rKey].prototype_produced_qty||0 };
        
        if(mode === 'produced_qty') { payload.produced_qty = Math.abs(v); if(payload.produced_qty === inventoryDB[rKey].produced_qty) return; }
        else if(mode === 'prototype_produced_qty') { payload.prototype_produced_qty = Math.abs(v); if(payload.prototype_produced_qty === (inventoryDB[rKey].prototype_produced_qty||0)) return; }
        else if(mode === 'sold_qty') { payload.sold_qty = Math.abs(v); if(payload.sold_qty === inventoryDB[rKey].sold_qty) return; }
        else if(mode === 'fgi_stock') { 
            let p = parseFloat(inventoryDB[rKey].produced_qty) || 0;
            let pb = parseFloat(inventoryDB[rKey].prototype_produced_qty) || 0;
            let sold = parseFloat(inventoryDB[rKey].sold_qty) || 0;
            let c_prod = parseFloat(inventoryDB[rKey].production_consumed_qty) || 0;
            let c_proto = parseFloat(inventoryDB[rKey].prototype_consumed_qty) || 0;
            let sq = parseFloat(inventoryDB[rKey].scrap_qty) || 0;
            let a = parseFloat(inventoryDB[rKey].manual_adjustment) || 0;
            payload.manual_adjustment = v - (p - sold - c_prod - sq - Math.max(0, c_proto - pb)); 
            if(payload.manual_adjustment === a) return; 
        }
        else if(mode === 'consumed_qty') { payload.consumed_qty = Math.abs(v); if(payload.consumed_qty === c) return; } 
        else if(mode === 'prototype_consumed_qty') { 
            payload.prototype_consumed_qty = Math.abs(v); let old = parseFloat(inventoryDB[rKey].prototype_consumed_qty)||0;
            if(payload.prototype_consumed_qty === old) return; 
            payload.consumed_qty = (parseFloat(inventoryDB[rKey].consumed_qty)||0) + (payload.prototype_consumed_qty - old);
        } 
        else if(mode === 'assembly_consumed_qty') { payload.assembly_consumed_qty = Math.abs(v); if(payload.assembly_consumed_qty === (inventoryDB[rKey].assembly_consumed_qty||0)) return; } 
        else if(mode === 'production_consumed_qty') { 
            payload.production_consumed_qty = Math.abs(v); let old = parseFloat(inventoryDB[rKey].production_consumed_qty)||0;
            if(payload.production_consumed_qty === old) return; 
            payload.consumed_qty = (parseFloat(inventoryDB[rKey].consumed_qty)||0) + (payload.production_consumed_qty - old);
        } 
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
        renderInventoryTable(); if(typeof renderAnalyticsDashboard === 'function' && document.getElementById('paneSalezAnalyticz')?.style.display === 'flex') renderAnalyticsDashboard();
    } catch(e) { sysLog(e.message, true); setMasterStatus("Error", "mod-error"); cell.innerText = oldValTemp; }
}

async function runProductionBatch() {
    try { 
        const n = document.getElementById('batchProductSelect').value; const q = parseFloat(document.getElementById('batchQty').value); 
        let batchType = "Production";
        if(document.getElementById('batchTypeSelect')) batchType = document.getElementById('batchTypeSelect').value;
        if(!n || isNaN(q) || q<=0) return alert("Select product & valid Qty."); 
        sysLog(`Batch Run [${batchType}]: ${q}x ${n}`); setSysProgress(20, 'working'); 
        
        let raw = getRawMaterials(n, q); let keys = Object.keys(raw); 
        if(keys.length===0){ setSysProgress(0,'working'); return alert("Recipe empty."); } 
        
        let ups = keys.map(k => { 
            if(!inventoryDB[k]) inventoryDB[k] = {consumed_qty:0, manual_adjustment:0, produced_qty:0, sold_qty:0, min_stock:0, scrap_qty:0, prototype_consumed_qty:0, assembly_consumed_qty:0, production_consumed_qty:0, prototype_produced_qty:0};
            inventoryDB[k].consumed_qty += raw[k];
            if(batchType === 'Prototype') inventoryDB[k].prototype_consumed_qty = (inventoryDB[k].prototype_consumed_qty||0) + raw[k];
            else inventoryDB[k].production_consumed_qty = (inventoryDB[k].production_consumed_qty||0) + raw[k];
            return {item_key: k, consumed_qty: inventoryDB[k].consumed_qty, manual_adjustment: inventoryDB[k].manual_adjustment, produced_qty: inventoryDB[k].produced_qty, sold_qty: inventoryDB[k].sold_qty, min_stock: inventoryDB[k].min_stock, scrap_qty: inventoryDB[k].scrap_qty, prototype_consumed_qty: inventoryDB[k].prototype_consumed_qty||0, assembly_consumed_qty: inventoryDB[k].assembly_consumed_qty||0, production_consumed_qty: inventoryDB[k].production_consumed_qty||0, prototype_produced_qty: inventoryDB[k].prototype_produced_qty||0}; 
        }); 
        
        let fgiKey = `RECIPE:::${n}`;
        if(!inventoryDB[fgiKey]) inventoryDB[fgiKey] = {consumed_qty:0, manual_adjustment:0, produced_qty:0, sold_qty:0, min_stock:0, scrap_qty:0, prototype_consumed_qty:0, assembly_consumed_qty:0, production_consumed_qty:0, prototype_produced_qty:0};
        
        if(batchType === 'Prototype') {
            inventoryDB[fgiKey].prototype_produced_qty = (inventoryDB[fgiKey].prototype_produced_qty||0) + q;
        } else {
            inventoryDB[fgiKey].produced_qty += q;
        }
        ups.push({item_key: fgiKey, consumed_qty: inventoryDB[fgiKey].consumed_qty, manual_adjustment: inventoryDB[fgiKey].manual_adjustment, produced_qty: inventoryDB[fgiKey].produced_qty, sold_qty: inventoryDB[fgiKey].sold_qty, min_stock: inventoryDB[fgiKey].min_stock, scrap_qty: inventoryDB[fgiKey].scrap_qty, prototype_consumed_qty: inventoryDB[fgiKey].prototype_consumed_qty||0, assembly_consumed_qty: inventoryDB[fgiKey].assembly_consumed_qty||0, production_consumed_qty: inventoryDB[fgiKey].production_consumed_qty||0, prototype_produced_qty: inventoryDB[fgiKey].prototype_produced_qty||0});

        setSysProgress(60, 'working'); 
        const {error} = await supabaseClient.from('inventory_consumption').upsert(ups, {onConflict:'item_key'}); 
        if(error) throw new Error(error.message); 
        
        setSysProgress(100, 'success'); sysLog(`${batchType} Batch Complete.`); showToast(`✅ Built ${q}x ${n} (${batchType}) and deducted materials.`); 
        document.getElementById('batchQty').value=1; renderInventoryTable(); setTimeout(()=>setSysProgress(0,'working'),3000); 
    } catch(e) { setSysProgress(100, 'error'); sysLog(e.message, true); showToast("Batch Error: " + e.message, 'error'); }
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
        
        let items = [];
        
        let onHand = {};
        let dependentDemand = {};
        let buildTargets = {};
        let purchaseTargets = {};

        // Helper to evaluate physical stock
        function getStock(k, isProduct) {
            let i = inventoryDB[k] || {};
            if (isProduct) {
                let b = parseFloat(i.produced_qty) || 0; let pb = parseFloat(i.prototype_produced_qty) || 0; 
                let sold = parseFloat(i.sold_qty) || 0; let c_prod = parseFloat(i.production_consumed_qty) || 0; 
                let c_proto = parseFloat(i.prototype_consumed_qty) || 0; let scrap = parseFloat(i.scrap_qty) || 0; 
                let adj = parseFloat(i.manual_adjustment) || 0;
                return b - sold - c_prod - scrap + adj - Math.max(0, c_proto - pb); 
            } else {
                let c = catalogCache[k] || {totalQty:0};
                return c.totalQty - (parseFloat(i.consumed_qty) || 0) - (parseFloat(i.scrap_qty) || 0) + (parseFloat(i.manual_adjustment) || 0);
            }
        }

        // Initialize Physical Stocks
        Object.keys(productsDB).forEach(p => onHand[`RECIPE:::${p}`] = getStock(`RECIPE:::${p}`, true));
        Object.keys(catalogCache).forEach(k => onHand[k] = getStock(k, false));

        // Get effectively available stock considering downstream demand
        function getNet(k) { return (onHand[k] || 0) + (buildTargets[k.replace('RECIPE:::', '')] || 0) + (purchaseTargets[k] || 0) - (dependentDemand[k] || 0); }

        // Iterative MRP Resolution Algorithm
        let changed = true;
        let iter = 0;
        while(changed && iter < 100) {
            changed = false; iter++;
            
            // Re-evaluate FGIs & Sub-Assemblies
            Object.keys(productsDB).forEach(p => {
                let k = `RECIPE:::${p}`;
                let ms = parseFloat((inventoryDB[k]||{}).min_stock) || 0;
                let net = getNet(k);
                let deficit = ms - net; 
                if (deficit > 0.0001) {
                    buildTargets[p] = (buildTargets[p] || 0) + deficit;
                    changed = true; 
                    
                    (productsDB[p] || []).forEach(comp => {
                        let subK = comp.item_key || comp.di_item_id || comp.name;
                        let qPer = parseFloat(comp.quantity || comp.qty) || 1;
                        dependentDemand[subK] = (dependentDemand[subK] || 0) + (qPer * deficit);
                    });
                }
            });

            // Re-evaluate Raw Supply Chain (End of the line)
            Object.keys(catalogCache).forEach(k => {
                let ms = parseFloat((inventoryDB[k]||{}).min_stock) || 0;
                let net = getNet(k);
                let deficit = ms - net;
                if (deficit > 0.0001) {
                    purchaseTargets[k] = (purchaseTargets[k] || 0) + deficit;
                    changed = true;
                }
            });
        }

        // --- Production Targets Build List (Tree View) ---
        html += `<h3>🏭 Production Targets Build List</h3><div style="margin-bottom:20px; padding:15px; background:#fffbdd; border:1px solid #fde047; border-radius:5px; font-size:12px;"><strong>Note:</strong> "On Hand" indicates physical stock at the time of report generation. It does not dynamically deplete for shared components across multiple builds. Refer to the Low Inventory Supply Chain Report below for aggregate raw material ordering deficits.</div>`;

        let deficits = [];
        Object.keys(productsDB).forEach(p => {
            let k = `RECIPE:::${p}`;
            let ms = parseFloat((inventoryDB[k]||{}).min_stock) || 0;
            if (ms <= 0) return;
            let i = inventoryDB[k] || {};
            let b = parseFloat(i.produced_qty) || 0; let pb = parseFloat(i.prototype_produced_qty) || 0; 
            let sold = parseFloat(i.sold_qty) || 0; let c_prod = parseFloat(i.production_consumed_qty) || 0; 
            let c_proto = parseFloat(i.prototype_consumed_qty) || 0; let scrap = parseFloat(i.scrap_qty) || 0; 
            let adj = parseFloat(i.manual_adjustment) || 0;
            let s = b - sold - c_prod - scrap + adj - Math.max(0, c_proto - pb); 
            
            if (s < ms) deficits.push({ n: p, ms: ms, s: s, short: ms - s });
        });

        if (deficits.length === 0) {
            html += `<p style="padding:20px; font-weight:bold; color:#10b981; border:1px solid #cbd5e1; border-radius:5px; background:#f8fafc;">✅ All production products are at or above optimal stock levels.</p>`;
        } else {
            function getStockLocal(k, isProd) {
                let i = inventoryDB[k] || {};
                if (isProd) {
                    let b = parseFloat(i.produced_qty) || 0; let pb = parseFloat(i.prototype_produced_qty) || 0; 
                    let sold = parseFloat(i.sold_qty) || 0; let c_prod = parseFloat(i.production_consumed_qty) || 0; 
                    let c_proto = parseFloat(i.prototype_consumed_qty) || 0; let scrap = parseFloat(i.scrap_qty) || 0; 
                    let adj = parseFloat(i.manual_adjustment) || 0;
                    return b - sold - c_prod - scrap + adj - Math.max(0, c_proto - pb); 
                } else {
                    let c = catalogCache[k] || {totalQty:0};
                    return c.totalQty - (parseFloat(i.consumed_qty) || 0) - (parseFloat(i.scrap_qty) || 0) + (parseFloat(i.manual_adjustment) || 0);
                }
            }

            function buildTree(pName, reqQty) {
                let recipe = productsDB[pName] || [];
                if (recipe.length === 0) return "";
                let thtml = "<ul style='list-style-type:none; padding-left:20px;'>";
                recipe.forEach(comp => {
                    let subK = comp.item_key || comp.di_item_id || comp.name;
                    let qPer = parseFloat(comp.quantity || comp.qty) || 1;
                    let totalReq = qPer * reqQty;
                    let isProd = subK.startsWith('RECIPE:::');
                    let stock = getStockLocal(subK, isProd);
                    let ok = stock >= totalReq;
                    let statStr = ok ? `<span class="stock-badge" style="background:#d1fae5; color:#065f46; display:inline-block; padding:2px 6px; border-radius:4px; font-size:11px; font-weight:bold; margin-left:8px;">✅ OK</span>` : `<span class="stock-badge" style="background:#fee2e2; color:#991b1b; display:inline-block; padding:2px 6px; border-radius:4px; font-size:11px; font-weight:bold; margin-left:8px;">🔴 SHORT ${ (totalReq - stock).toFixed(2).replace(/\.?0+$/,'') }</span>`;
                    
                    let displayName = subK;
                    if (isProd) {
                        let s = subK.replace('RECIPE:::', '');
                        let is3D = !!(productsDB[s] && productsDB[s].is_3d_print);
                        let isSub = !!isSubassemblyDB[s];
                        let icn = is3D ? "🖨️ " : (isSub ? "⚙️ " : "📦 ");
                        displayName = icn + s;
                        thtml += `<li style='margin:5px 0; font-size:14px; padding-left:25px; position:relative;'><span style='position:absolute; left:0; top:-5px; font-size:18px; color:#cbd5e1;'>⌞</span><strong>${displayName}</strong> <span style="color:#64748b; font-size:12px;">(Req: ${totalReq.toFixed(2).replace(/\.?0+$/,'')} | On Hand: ${stock.toFixed(2).replace(/\.?0+$/,'')})</span> ${statStr}`;
                        if (!ok) thtml += buildTree(s, totalReq - stock);
                        thtml += `</li>`;
                    } else {
                        let c = catalogCache[subK];
                        displayName = c ? (c.neoName || c.itemName) : subK;
                        thtml += `<li style='margin:5px 0; font-size:14px; padding-left:25px; position:relative;'><span style='position:absolute; left:0; top:-5px; font-size:18px; color:#cbd5e1;'>⌞</span>🧵 <strong>${displayName}</strong> <span style="color:#64748b; font-size:12px;">(Req: ${totalReq.toFixed(2).replace(/\.?0+$/,'')} | On Hand: ${stock.toFixed(2).replace(/\.?0+$/,'')})</span> ${statStr}</li>`;
                    }
                });
                thtml += "</ul>";
                return thtml;
            }

            deficits.sort((a,b) => b.short - a.short).forEach(d => {
                let is3D = !!(productsDB[d.n] && productsDB[d.n].is_3d_print);
                let isSub = !!isSubassemblyDB[d.n];
                let icn = is3D ? "🖨️ " : (isSub ? "⚙️ " : "📦 ");
                html += `<div style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:5px; padding:15px; margin-bottom:15px;">`;
                html += `<div style="font-size:16px; font-weight:bold; color:#0f172a;">${icn} ${d.n} <span style="font-size:13px; font-weight:normal; color:#64748b; margin-left:10px;">(Target: ${d.ms.toFixed(2).replace(/\.?0+$/,'')} | Current: ${d.s.toFixed(2).replace(/\.?0+$/,'')} | Must Build: <span style="color:#f97316; font-weight:bold;">${d.short.toFixed(2).replace(/\.?0+$/,'')}</span>)</span></div>`;
                html += buildTree(d.n, d.short);
                html += `</div>`;
            });
        }
        
        html += `<br><hr style="border:none; border-top:1px solid #cbd5e1; margin:20px 0;">`;

        html += `<h3>📦 Supply Chain Deficits (Order These)</h3>`;
        
        Object.keys(purchaseTargets).forEach(k => {
            let c = catalogCache[k] || {}; let f = fmtKey(k); let i = inventoryDB[k] || {};
            let currentStock = onHand[k] || 0;
            let ms = parseFloat(i.min_stock) || 0;
            let depDemand = dependentDemand[k] || 0;
            let short = purchaseTargets[k];
            items.push({nn: c.neoName, n: c.itemName, sp: c.spec, s: currentStock, ms: ms, short: short, depDemand: depDemand, cost: short * (c.avgUnitCost || 0)}); 
        });

        if(items.length === 0) { 
            html += `<p style="padding:20px; font-weight:bold; color:#10b981; border:1px solid #cbd5e1; border-radius:5px; background:#f8fafc;">✅ All monitored raw stock levels are optimal.</p>`; 
        } 
        else {
            html += `<table><thead><tr><th>Neogleamz Name</th><th>Item Name</th><th>Spec</th><th>Current Stock</th><th>Dep. Req</th><th>Min Target</th><th>Shortfall</th><th>Est. Cost to Restock</th></tr></thead><tbody>`;
            let grandTotal = 0;
            items.sort((a,b) => b.cost - a.cost).forEach(x => { grandTotal += x.cost; let displaySpec = x.sp === '(Mixed Specs)' ? '' : x.sp; html += `<tr><td>${x.nn || ''}</td><td>${x.n}</td><td>${displaySpec}</td><td style="color:#ef4444; font-weight:bold;">${x.s.toFixed(2).replace(/\.?0+$/,'')}</td><td style="color:#64748b;">${x.depDemand > 0 ? x.depDemand.toFixed(2).replace(/\.?0+$/,'') : '-'}</td><td>${x.ms.toFixed(2).replace(/\.?0+$/,'')}</td><td style="font-weight:bold;">${x.short.toFixed(2).replace(/\.?0+$/,'')}</td><td>$${x.cost.toFixed(2)}</td></tr>`; });
            html += `<tr><td colspan="7" style="text-align:right; font-weight:bold; padding-top: 15px;">Total Capital Required:</td><td style="font-weight:bold; padding-top: 15px;">$${grandTotal.toFixed(2)}</td></tr>`;
            html += `</tbody></table>`;
        }
        html += `</body></html>`; let win = window.open('', '', 'width=900,height=700'); win.document.write(html); win.document.close(); setTimeout(() => win.print(), 250);
    } catch (e) { sysLog(e.message, true); }
}
