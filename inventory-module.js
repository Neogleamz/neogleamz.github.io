// --- 8. INVENTORY MANAGERS & REORDER LOGIC ---
const savedFgiState = JSON.parse(localStorage.getItem('fgiCategoryState') || "null");
window.fgiCategoryState = savedFgiState || { 'cat-retail': true, 'cat-sub': true, 'cat-print': true, 'cat-label': true };
window.toggleFgiCategory = function(cat) { 
    window.fgiCategoryState[cat] = !window.fgiCategoryState[cat]; 
    localStorage.setItem('fgiCategoryState', JSON.stringify(window.fgiCategoryState));
    renderFgiTable(); 
};
function sortFGI(cat, c) { if(isResizing) return; let base=currentFgiSort[cat]||{column:'n',direction:'asc'}; currentFgiSort[cat] = { column: c, direction: base.column===c && base.direction==='asc' ? 'desc' : 'asc' }; window.saveSort('currentFgiSort', currentFgiSort); renderFgiTable(); }
function sortInventory(c) { if(isResizing) return; currentInvSort = { column: c, direction: currentInvSort.column===c && currentInvSort.direction==='asc' ? 'desc' : 'asc' }; window.saveSort('currentInvSort', currentInvSort); window.renderInventoryTable(); window.updateCcMngrStock(); }

function renderFgiTable() {
    const wrap = document.getElementById('fgiTableWrap'); if(!wrap) return;
    if (!currentFgiSort || typeof currentFgiSort.column !== 'undefined') {
        currentFgiSort = {
            'cat-retail': { column: 'n', direction: 'asc' },
            'cat-sub': { column: 'n', direction: 'asc' },
            'cat-print': { column: 'n', direction: 'asc' },
            'cat-label': { column: 'n', direction: 'asc' }
        };
    }

    const getTh = (cat, col, label, color) => `<th class="${currentFgiSort[cat].column===col?'sorted-'+currentFgiSort[cat].direction:''} text-right" onclick="sortFGI('${cat}', '${col}')" style="${color ? 'border-bottom:2px solid '+color+';' : ''}">${label}</th>`;
    const getNameTh = (cat) => `<th class="${currentFgiSort[cat].column==='n'?'sorted-'+currentFgiSort[cat].direction:''}" onclick="sortFGI('${cat}', 'n')">Product Name</th>`;

    const schemas = {
        'cat-retail': `<tr>${getNameTh('cat-retail')} ${getTh('cat-retail','b','PROD','#3b82f6')} ${getTh('cat-retail','pb','PROTO','#8b5cf6')} ${getTh('cat-retail','sold','SOLD','#ef4444')} ${getTh('cat-retail','warranty','WRTY','#fbbf24')} ${getTh('cat-retail','s','STOCK','#10b981')} ${getTh('cat-retail','ms','MIN','#f97316')} ${getTh('cat-retail','tv','ASSETS')} ${getTh('cat-retail','net','NET')} ${getTh('cat-retail','msrpv','MSRP')}</tr>`,
        'cat-sub': `<tr>${getNameTh('cat-sub')} ${getTh('cat-sub','b','PROD','#3b82f6')} ${getTh('cat-sub','pb','PROTO','#8b5cf6')} ${getTh('cat-sub','c_prod','CONS','#ef4444')} ${getTh('cat-sub','yld','YLD %','#ec4899')} ${getTh('cat-sub','scrap','SCRAP','#ef4444')} ${getTh('cat-sub','warranty','WRTY','#fbbf24')} ${getTh('cat-sub','s','STOCK','#10b981')} ${getTh('cat-sub','ms','MIN','#f97316')} ${getTh('cat-sub','tv','ASSETS')}</tr>`,
        'cat-print': `<tr>${getNameTh('cat-print')} ${getTh('cat-print','b','PROD','#3b82f6')} ${getTh('cat-print','pb','PROTO','#8b5cf6')} ${getTh('cat-print','yld','YLD %','#ec4899')} ${getTh('cat-print','scrap','SCRAP','#ef4444')} ${getTh('cat-print','s','STOCK','#10b981')} ${getTh('cat-print','ms','MIN','#f97316')} ${getTh('cat-print','tv','ASSETS')}</tr>`,
        'cat-label': `<tr>${getNameTh('cat-label')} ${getTh('cat-label','b','PROD','#3b82f6')} ${getTh('cat-label','c_prod','CONS','#ef4444')} ${getTh('cat-label','s','STOCK','#10b981')} ${getTh('cat-label','ms','MIN','#f97316')} ${getTh('cat-label','tv','ASSETS')}</tr>`
    };

    let h = ``;
    let a = Object.keys(productsDB).map(p => { 
        let k = `RECIPE:::${p}`; let i = inventoryDB[k] || {produced_qty: 0, sold_qty: 0, consumed_qty: 0, prototype_produced_qty: 0, scrap_qty: 0, manual_adjustment: 0}; 
        let b = parseFloat(i.produced_qty) || 0; let pb = parseFloat(i.prototype_produced_qty) || 0; let sold = parseFloat(i.sold_qty) || 0; 
        let c_prod = parseFloat(i.production_consumed_qty) || 0; let c_proto = parseFloat(i.prototype_consumed_qty) || 0; let scrap = parseFloat(i.scrap_qty) || 0; let adj = parseFloat(i.manual_adjustment) || 0;
        let warranty = 0; if (typeof salesDB !== 'undefined') { warranty = salesDB.filter(s => s.internal_recipe_name === p && (s.transaction_type === 'Replacement / Warranty' || s.transaction_type === 'Warranty' || s.transaction_type === 'Post-Ship Exchange')).reduce((sum, s) => sum + (parseFloat(s.qty_sold) || 0), 0); }
        let s = b - sold - c_prod - scrap + adj - Math.max(0, c_proto - pb);
        let breakdown = calculateProductBreakdown(p);
        let tv = s * breakdown.total;
        let is3D = !!(productsDB[p] && productsDB[p].is_3d_print);
        let ms = parseFloat(i.min_stock) || 0;
        let unit_msrp = (typeof getEngineLiveMsrp === 'function') ? getEngineLiveMsrp(p) : 0;
        let msrpv = s * unit_msrp;
        let total_net = unit_msrp > 0 ? (unit_msrp - breakdown.total) * s : 0;
        let isLabel = !!(productsDB[p] && productsDB[p].is_label);
        let yld = 100; let total_attempt = b + pb; let good_qty = total_attempt - scrap; if (total_attempt > 0) yld = (good_qty / total_attempt) * 100;
        return { k: k, n: p, b: b, pb: pb, yld: yld, scrap: scrap, warranty: warranty, sold: sold, c_prod: c_prod, s: s, ms: ms, tc: breakdown.total, msrpv: msrpv, tv: tv, net: total_net, isSub: !!isSubassemblyDB[p], is3D: is3D, isLabel: isLabel }; 
    });
    if(a.length===0){ h += "<div style='text-align:center; padding: 20px; color:var(--text-muted);'>No finished goods.</div>"; }
    else {
        let sortFn = (cat) => (x,y) => { let cfg = currentFgiSort[cat] || {column:'n', direction:'asc'}; let u = x[cfg.column]; let v = y[cfg.column]; if (typeof u === 'number' && typeof v === 'number') return cfg.direction === 'asc' ? u - v : v - u; u = (u||"").toString().toLowerCase(); v = (v||"").toString().toLowerCase(); if(u<v) return cfg.direction==='asc'?-1:1; if(u>v) return cfg.direction==='asc'?1:-1; return 0; };
        let groups = [
            { id: 'cat-retail', name: 'Retail Products', icn: '📦', items: a.filter(x => !x.is3D && !x.isSub && !x.isLabel).sort(sortFn('cat-retail')) },
            { id: 'cat-sub',    name: 'Sub-Assemblies',  icn: '⚙️',  items: a.filter(x => x.isSub && !x.is3D).sort(sortFn('cat-sub')) },
            { id: 'cat-print',  name: '3D Prints',       icn: '🖨️',  items: a.filter(x => x.is3D).sort(sortFn('cat-print')) },
            { id: 'cat-label',  name: 'Custom Labels',   icn: '🏷️',  items: a.filter(x => x.isLabel).sort(sortFn('cat-label')) }
        ];

        let isFirstGroup = true;
        groups.forEach(g => {
            if(g.items.length === 0) return;
            let isExp = window.fgiCategoryState[g.id] !== false;
            let chevron = isExp ? '▼' : '▶';
            
            let mt = isFirstGroup ? '0px' : '20px';
            h += `<div class="category-header" onclick="window.toggleFgiCategory('${g.id}')" style="cursor:pointer; background:rgba(255,255,255,0.03); transition: background 0.2s; padding:10px 15px; border-bottom:1px solid rgba(255,255,255,0.1); margin-top:${mt}; border-radius: 6px 6px 0 0;" onmouseover="this.style.background='rgba(255,255,255,0.06)'" onmouseout="this.style.background='rgba(255,255,255,0.03)'"><span style="font-weight:900; color:var(--primary-color); font-size:13px; text-transform:uppercase; letter-spacing:1px;"><span style="display:inline-block; width:20px; color:var(--text-muted);">${chevron}</span> ${g.icn} ${g.name} <span style="color:var(--text-muted); font-size:11px; margin-left:8px;">(${g.items.length})</span></span></div>`;
            isFirstGroup = false;
            
            if(isExp) {
                h += `<table class="neo-table" style="width:100%; margin-bottom:0; background:rgba(0,0,0,0.1); border-top:none; border-radius: 0 0 6px 6px;">`;
                h += `<thead>${schemas[g.id]}</thead><tbody>`;
                
                g.items.forEach(x => { 
                    let sk = String(x.k).replace(/'/g, "\\'").replace(/"/g, '&quot;'); 
                    let netColor = x.net > 0 ? '#10b981' : (x.net < 0 ? '#ef4444' : 'var(--text-muted)');
                    let isLow = x.ms > 0 && x.s < x.ms; 
                    let sc = x.s < 0 ? 'negative-stock' : (isLow ? 'low-stock' : 'highlight-calc');
                    let yldColor = x.yld >= 90 ? '#10b981' : (x.yld >= 75 ? '#f59e0b' : '#ef4444');
                    
                    let trHtml = `<tr class="${g.id}">`;
                    trHtml += `<td tabindex="0" class="trunc-col" style="font-weight:bold; color:var(--text-main); padding-left:25px;">${x.n}</td>`;
                    
                    if (g.id === 'cat-retail') {
                        trHtml += `<td class="text-right editable" style="color:#3b82f6;" contenteditable="true" onfocus="storeOldVal(this)" onblur="handleInvEdit(this,'${sk}',0,0,0,0,'produced_qty')">${x.b.toFixed(2).replace(/\.?0+$/,'')}</td>`;
                        trHtml += `<td class="text-right editable" style="color:#8b5cf6;" contenteditable="true" onfocus="storeOldVal(this)" onblur="handleInvEdit(this,'${sk}',0,0,0,0,'prototype_produced_qty')">${x.pb.toFixed(2).replace(/\.?0+$/,'')}</td>`;
                        trHtml += `<td class="text-right editable" style="color:#ef4444;" contenteditable="true" onfocus="storeOldVal(this)" onblur="handleInvEdit(this,'${sk}',0,0,0,0,'sold_qty')">${x.sold.toFixed(2).replace(/\.?0+$/,'')}</td>`;
                        trHtml += `<td class="text-right" style="color:#fbbf24; font-weight:bold;">${x.warranty.toFixed(2).replace(/\.?0+$/,'')}</td>`;
                        trHtml += `<td class="text-right editable ${sc}" style="font-weight:bold;" contenteditable="true" onfocus="storeOldVal(this)" onblur="handleInvEdit(this,'${sk}',0,0,0,0,'fgi_stock')">${x.s.toFixed(2).replace(/\.?0+$/,'')}</td>`;
                        trHtml += `<td class="text-right editable" style="color:#f97316; font-weight:bold;" contenteditable="true" onfocus="storeOldVal(this)" onblur="handleInvEdit(this,'${sk}',0,0,0,0,'min_stock')">${x.ms.toFixed(2).replace(/\.?0+$/,'')}</td>`;
                        trHtml += `<td class="text-right" style="font-weight:bold; color:#10b981;">$${x.tv.toFixed(2)}</td>`;
                        trHtml += `<td class="text-right" style="font-weight:bold; color:${netColor};">$${x.net.toFixed(2)}</td>`;
                        trHtml += `<td class="text-right" style="font-weight:bold; color:var(--text-main);">$${(x.msrpv||0).toFixed(2)}</td>`;
                    }
                    else if (g.id === 'cat-sub') {
                        trHtml += `<td class="text-right editable" style="color:#3b82f6;" contenteditable="true" onfocus="storeOldVal(this)" onblur="handleInvEdit(this,'${sk}',0,0,0,0,'produced_qty')">${x.b.toFixed(2).replace(/\.?0+$/,'')}</td>`;
                        trHtml += `<td class="text-right editable" style="color:#8b5cf6;" contenteditable="true" onfocus="storeOldVal(this)" onblur="handleInvEdit(this,'${sk}',0,0,0,0,'prototype_produced_qty')">${x.pb.toFixed(2).replace(/\.?0+$/,'')}</td>`;
                        trHtml += `<td class="text-right editable" style="color:#ef4444;" contenteditable="true" onfocus="storeOldVal(this)" onblur="handleInvEdit(this,'${sk}',0,0,0,0,'production_consumed_qty')">${x.c_prod.toFixed(2).replace(/\.?0+$/,'')}</td>`;
                        trHtml += `<td class="text-right" style="color:${yldColor}; font-weight:bold;">${x.yld.toFixed(1)}%</td>`;
                        trHtml += `<td class="text-right editable" style="color:#ef4444; font-weight:bold;" contenteditable="true" onfocus="storeOldVal(this)" onblur="handleInvEdit(this,'${sk}',0,0,0,0,'scrap_qty')">${x.scrap.toFixed(2).replace(/\.?0+$/,'')}</td>`;
                        trHtml += `<td class="text-right" style="color:#fbbf24; font-weight:bold;">${x.warranty.toFixed(2).replace(/\.?0+$/,'')}</td>`;
                        trHtml += `<td class="text-right editable ${sc}" style="font-weight:bold;" contenteditable="true" onfocus="storeOldVal(this)" onblur="handleInvEdit(this,'${sk}',0,0,0,0,'fgi_stock')">${x.s.toFixed(2).replace(/\.?0+$/,'')}</td>`;
                        trHtml += `<td class="text-right editable" style="color:#f97316; font-weight:bold;" contenteditable="true" onfocus="storeOldVal(this)" onblur="handleInvEdit(this,'${sk}',0,0,0,0,'min_stock')">${x.ms.toFixed(2).replace(/\.?0+$/,'')}</td>`;
                        trHtml += `<td class="text-right" style="font-weight:bold; color:#10b981;">$${x.tv.toFixed(2)}</td>`;
                    }
                    else if (g.id === 'cat-print') {
                        trHtml += `<td class="text-right editable" style="color:#3b82f6;" contenteditable="true" onfocus="storeOldVal(this)" onblur="handleInvEdit(this,'${sk}',0,0,0,0,'produced_qty')">${x.b.toFixed(2).replace(/\.?0+$/,'')}</td>`;
                        trHtml += `<td class="text-right editable" style="color:#8b5cf6;" contenteditable="true" onfocus="storeOldVal(this)" onblur="handleInvEdit(this,'${sk}',0,0,0,0,'prototype_produced_qty')">${x.pb.toFixed(2).replace(/\.?0+$/,'')}</td>`;
                        trHtml += `<td class="text-right" style="color:${yldColor}; font-weight:bold;">${x.yld.toFixed(1)}%</td>`;
                        trHtml += `<td class="text-right editable" style="color:#ef4444; font-weight:bold;" contenteditable="true" onfocus="storeOldVal(this)" onblur="handleInvEdit(this,'${sk}',0,0,0,0,'scrap_qty')">${x.scrap.toFixed(2).replace(/\.?0+$/,'')}</td>`;
                        trHtml += `<td class="text-right editable ${sc}" style="font-weight:bold;" contenteditable="true" onfocus="storeOldVal(this)" onblur="handleInvEdit(this,'${sk}',0,0,0,0,'fgi_stock')">${x.s.toFixed(2).replace(/\.?0+$/,'')}</td>`;
                        trHtml += `<td class="text-right editable" style="color:#f97316; font-weight:bold;" contenteditable="true" onfocus="storeOldVal(this)" onblur="handleInvEdit(this,'${sk}',0,0,0,0,'min_stock')">${x.ms.toFixed(2).replace(/\.?0+$/,'')}</td>`;
                        trHtml += `<td class="text-right" style="font-weight:bold; color:#10b981;">$${x.tv.toFixed(2)}</td>`;
                    }
                    else if (g.id === 'cat-label') {
                        trHtml += `<td class="text-right editable" style="color:#3b82f6;" contenteditable="true" onfocus="storeOldVal(this)" onblur="handleInvEdit(this,'${sk}',0,0,0,0,'produced_qty')">${x.b.toFixed(2).replace(/\.?0+$/,'')}</td>`;
                        trHtml += `<td class="text-right editable" style="color:#ef4444;" contenteditable="true" onfocus="storeOldVal(this)" onblur="handleInvEdit(this,'${sk}',0,0,0,0,'production_consumed_qty')">${x.c_prod.toFixed(2).replace(/\.?0+$/,'')}</td>`;
                        trHtml += `<td class="text-right editable ${sc}" style="font-weight:bold;" contenteditable="true" onfocus="storeOldVal(this)" onblur="handleInvEdit(this,'${sk}',0,0,0,0,'fgi_stock')">${x.s.toFixed(2).replace(/\.?0+$/,'')}</td>`;
                        trHtml += `<td class="text-right editable" style="color:#f97316; font-weight:bold;" contenteditable="true" onfocus="storeOldVal(this)" onblur="handleInvEdit(this,'${sk}',0,0,0,0,'min_stock')">${x.ms.toFixed(2).replace(/\.?0+$/,'')}</td>`;
                        trHtml += `<td class="text-right" style="font-weight:bold; color:#10b981;">$${x.tv.toFixed(2)}</td>`;
                    }
                    
                    trHtml += `</tr>`;
                    h += trHtml;
                });
                h += `</tbody></table>`;
            }
        });
    }
    wrap.innerHTML = h; applyTableInteractivity('fgiTableWrap');
}

const SUPPLIER_LEAD_TIME_DAYS = 5;
const SAFETY_STOCK_MULTIPLIER = 1.10;

window.calculateTrailingVelocity = function(item_key, days=30) {
    if (typeof salesDB === 'undefined' || salesDB.length === 0) return 0;
    let cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    
    let totalQty = 0;
    salesDB.forEach(s => {
        let rawDate = s.sale_date || s['Created at'] || s['Date'] || new Date().toISOString();
        let sDate = new Date(rawDate);
        if (isNaN(sDate.getTime())) return;
        
        let type = s.transaction_type;
        if (sDate >= cutoff && type !== 'Refund' && type !== 'Return') {
            let pName = s.internal_recipe_name;
            let qty = parseFloat(s.qty_sold) || parseFloat(s['Lineitem quantity']) || 1;
            
            if (pName && productsDB[pName]) {
                if (item_key === `RECIPE:::${pName}`) {
                    totalQty += qty;
                } else if (typeof getRawMaterials === 'function') {
                    let required = getRawMaterials(pName, qty);
                    if (required[item_key]) {
                        totalQty += required[item_key];
                    }
                }
            }
        }
    });

    return totalQty / days;
};

function renderInventoryTable() {
    const wrap = document.getElementById('invTableWrap'); if(!wrap) return;
    renderFgiTable();
    let ths = ` <th class="${currentInvSort.column==='nn'?'sorted-'+currentInvSort.direction:''}" onclick="sortInventory('nn')">Neogleamz Name</th> <th class="${currentInvSort.column==='n'?'sorted-'+currentInvSort.direction:''}" onclick="sortInventory('n')">Item Name</th> <th class="${currentInvSort.column==='p'?'sorted-'+currentInvSort.direction:''} text-right" onclick="sortInventory('p')">Purchased</th> <th class="${currentInvSort.column==='c'?'sorted-'+currentInvSort.direction:''} text-right" onclick="sortInventory('c')" style="border-bottom:2px solid #ef4444;">CONS</th> <th class="${currentInvSort.column==='pc'?'sorted-'+currentInvSort.direction:''} text-right" onclick="sortInventory('pc')" style="border-bottom:2px solid #8b5cf6;">PROTO</th> <th class="${currentInvSort.column==='prc'?'sorted-'+currentInvSort.direction:''} text-right" onclick="sortInventory('prc')" style="border-bottom:2px solid #3b82f6;">PROD</th> <th class="${currentInvSort.column==='sq'?'sorted-'+currentInvSort.direction:''} text-right" onclick="sortInventory('sq')" style="border-bottom:2px solid #b91c1c;">SCRAP</th> <th class="${currentInvSort.column==='a'?'sorted-'+currentInvSort.direction:''} text-right" onclick="sortInventory('a')" style="border-bottom:2px solid #0ea5e9;">ADJMT</th> <th class="${currentInvSort.column==='ms'?'sorted-'+currentInvSort.direction:''} text-right" onclick="sortInventory('ms')" style="border-bottom:2px solid #f97316;">MIN</th> <th class="${currentInvSort.column==='s'?'sorted-'+currentInvSort.direction:''} text-right" onclick="sortInventory('s')" style="border-bottom:2px solid #f59e0b;">STOCK</th> <th class="${currentInvSort.column==='tp'?'sorted-'+currentInvSort.direction:''} text-right" onclick="sortInventory('tp')">ASSETS</th> `;
    let h = `<table style="width:100%;"><thead><tr>${ths}</tr></thead><tbody>`;
    let a = Object.keys(catalogCache).map(k => { let c = catalogCache[k], f = fmtKey(k), i = inventoryDB[k]||{consumed_qty:0, manual_adjustment:0, min_stock:0, scrap_qty:0, prototype_consumed_qty:0, assembly_consumed_qty:0, production_consumed_qty:0, prototype_produced_qty:0}; let s=c.totalQty-i.consumed_qty-i.scrap_qty+i.manual_adjustment; let up=c.avgUnitCost||0; let tp=s*up; return { k:k, nn:c.neoName, n:c.itemName, p:c.totalQty, c:i.consumed_qty, sq:i.scrap_qty, a:i.manual_adjustment, ms:i.min_stock, s:s, up:up, tp:tp, pc: (i.prototype_consumed_qty||0), prc: (i.production_consumed_qty||0) }; });
    if(a.length===0){ h += "<tr><td colspan='12' style='text-align:center;'>No raw inventory.</td></tr>"; }
    else {
        a.sort((x,y) => { let u = x[currentInvSort.column]; let v = y[currentInvSort.column]; if (typeof u === 'number' && typeof v === 'number') return currentInvSort.direction === 'asc' ? u - v : v - u; u = (u||"").toString().toLowerCase(); v = (v||"").toString().toLowerCase(); if(u<v) return currentInvSort.direction==='asc'?-1:1; if(u>v) return currentInvSort.direction==='asc'?1:-1; return 0; });
        a.forEach(x => { 
            let vel = window.calculateTrailingVelocity(x.k, 30);
            let dynamicROP = vel > 0 ? (vel * SUPPLIER_LEAD_TIME_DAYS) * SAFETY_STOCK_MULTIPLIER : 0;
            // Use MS as fallback, but if ROP is higher, that is critical baseline
            let finalTarget = Math.max(x.ms, dynamicROP);
            
            let isLow = finalTarget > 0 && x.s <= finalTarget; 
            let sc = x.s<0 ? 'negative-stock' : (isLow ? 'low-stock' : 'highlight-calc'); 
            let sk = String(x.k).replace(/'/g, "\\'").replace(/"/g, '&quot;'); 
            
            let ropPill = (dynamicROP > 0 && isLow) ? `<span style="background:#ef4444; color:#fff; border-radius:12px; font-size:10px; padding:1px 6px; font-weight:bold; margin-left:8px; animation: ropPulse 1.5s infinite;">🚨 ROP: ${dynamicROP.toFixed(1).replace(/\.?0+$/,'')}</span>` : '';
            
            h += `<tr><td tabindex="0" class="trunc-col" style="font-weight:bold; color:var(--text-heading);">${x.nn} ${ropPill}</td><td tabindex="0" class="trunc-col" style="font-weight:bold; color:#64748b;">${x.n}</td><td class="text-right">${x.p.toFixed(2).replace(/\.?0+$/,'')}</td><td class="text-right editable" style="color:#ef4444;" contenteditable="true" onfocus="storeOldVal(this)" onblur="handleInvEdit(this,'${sk}',${x.p},${x.c},${x.a},${x.sq},'consumed_qty')">${x.c.toFixed(2).replace(/\.?0+$/,'')}</td><td class="text-right editable" style="color:#8b5cf6;" contenteditable="true" onfocus="storeOldVal(this)" onblur="handleInvEdit(this,'${sk}',${x.p},${x.c},${x.a},${x.sq},'prototype_consumed_qty')">${x.pc.toFixed(2).replace(/\.?0+$/,'')}</td><td class="text-right editable" style="color:#3b82f6;" contenteditable="true" onfocus="storeOldVal(this)" onblur="handleInvEdit(this,'${sk}',${x.p},${x.c},${x.a},${x.sq},'production_consumed_qty')">${x.prc.toFixed(2).replace(/\.?0+$/,'')}</td><td class="text-right editable" style="color:#b91c1c;" contenteditable="true" onfocus="storeOldVal(this)" onblur="handleInvEdit(this,'${sk}',${x.p},${x.c},${x.a},${x.sq},'scrap_qty')">${x.sq.toFixed(2).replace(/\.?0+$/,'')}</td><td class="text-right editable" style="color:#0ea5e9;" contenteditable="true" onfocus="storeOldVal(this)" onblur="handleInvEdit(this,'${sk}',${x.p},${x.c},${x.a},${x.sq},'manual_adjustment')">${x.a!==0?(x.a>0?'+':'')+x.a.toFixed(2).replace(/\.?0+$/,''):'0'}</td><td class="text-right editable" style="color:#f97316;" contenteditable="true" onfocus="storeOldVal(this)" onblur="handleInvEdit(this,'${sk}',${x.p},${x.c},${x.a},${x.sq},'min_stock')">${x.ms.toFixed(2).replace(/\.?0+$/,'')}</td><td class="text-right editable ${sc}" contenteditable="true" onfocus="storeOldVal(this)" onblur="handleInvEdit(this,'${sk}',${x.p},${x.c},${x.a},${x.sq},'stock')">${x.s.toFixed(2).replace(/\.?0+$/,'')}</td><td class="text-right" style="font-weight:bold; color:#10b981;">$${x.tp.toFixed(2)}</td></tr>`; 
        });
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
        else if(mode === 'scrap_qty') { payload.scrap_qty = Math.abs(v); if(payload.scrap_qty === (inventoryDB[rKey].scrap_qty||0)) return; }

        sysLog(`Inv Edit: [${rKey}] ${mode} to ${v}`); setMasterStatus("Updating...", "mod-working"); 
        const { error } = await supabaseClient.from('inventory_consumption').upsert(payload, {onConflict:'item_key'}); 
        if(error) throw new Error(error.message); 
        
        inventoryDB[rKey] = payload;
        setMasterStatus("Adjusted!", "mod-success"); cell.classList.add('edited-success'); 
        setTimeout(()=>cell.classList.remove('edited-success'),1000); setTimeout(()=>setMasterStatus("Ready.", "status-idle"),2000); 
        window.renderInventoryTable(); window.updateCcMngrStock(); if(typeof renderAnalyticsDashboard === 'function' && document.getElementById('paneSalezAnalyticz')?.style.display === 'flex') renderAnalyticsDashboard();
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
        document.getElementById('batchQty').value=1; window.renderInventoryTable(); window.updateCcMngrStock(); setTimeout(()=>setSysProgress(0,'working'),3000); 
    } catch(e) { setSysProgress(100, 'error'); sysLog(e.message, true); showToast("Batch Error: " + e.message, 'error'); }
}

async function resetInventoryConsumption() {
    try { 
        if(!confirm("⚠️ DANGER: Reset ALL consumption, adjustments, min stocks, scrap, built, and sold quantities to zero?")) return; 
        sysLog("Resetting Inventory..."); setSysProgress(50, 'working'); 
        const {error} = await supabaseClient.from('inventory_consumption').delete().neq('item_key', 'fake'); 
        if(error) throw new Error(error.message); 
        inventoryDB={}; window.renderInventoryTable(); window.updateCcMngrStock(); setSysProgress(100, 'success'); sysLog("Reset."); setTimeout(()=>setSysProgress(0,'working'),3000); 
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
            html += `<table><thead><tr><th>Neogleamz Name</th><th>Item Name</th><th>Spec</th><th>STOCK</th><th>Dep. Req</th><th>Min Target</th><th>Shortfall</th><th>Est. Cost to Restock</th></tr></thead><tbody>`;
            let grandTotal = 0;
            items.sort((a,b) => b.cost - a.cost).forEach(x => { grandTotal += x.cost; let displaySpec = x.sp === '(Mixed Specs)' ? '' : x.sp; html += `<tr><td>${x.nn || ''}</td><td>${x.n}</td><td>${displaySpec}</td><td style="color:#ef4444; font-weight:bold;">${x.s.toFixed(2).replace(/\.?0+$/,'')}</td><td style="color:#64748b;">${x.depDemand > 0 ? x.depDemand.toFixed(2).replace(/\.?0+$/,'') : '-'}</td><td>${x.ms.toFixed(2).replace(/\.?0+$/,'')}</td><td style="font-weight:bold;">${x.short.toFixed(2).replace(/\.?0+$/,'')}</td><td>$${x.cost.toFixed(2)}</td></tr>`; });
            html += `<tr><td colspan="7" style="text-align:right; font-weight:bold; padding-top: 15px;">Total Capital Required:</td><td style="font-weight:bold; padding-top: 15px;">$${grandTotal.toFixed(2)}</td></tr>`;
            html += `</tbody></table>`;
        }
        html += `</body></html>`; let win = window.open('', '', 'width=900,height=700'); win.document.write(html); win.document.close(); setTimeout(() => win.print(), 250);
    } catch (e) { sysLog(e.message, true); }
}

// ========================================================

// ========================================================
// ========================================================
// ========================================================
// ========================================================
// ========================================================
// VELOCITYZ FORECASTING & ROP MODAL LOGIC
// ========================================================
let velocityzState = {};
window.velocityzTreeState = window.velocityzTreeState || {};

window.openVelocityzModal = function() {
    let matrixInput = document.getElementById('velocityzMatrixDays');
    let multiInput = document.getElementById('velocityzMultiplier');
    if(matrixInput) matrixInput.value = 30;
    if(multiInput) multiInput.value = 1.0;
    
    window.recomputeVelocityzBaseline();
    document.getElementById('velocityzModal').style.display = 'flex';
};

window.recomputeVelocityzBaseline = function() {
    let matrixInput = document.getElementById('velocityzMatrixDays');
    let multiInput = document.getElementById('velocityzMultiplier');
    let matrixDays = matrixInput ? parseFloat(matrixInput.value) : 30;
    let multiplier = multiInput ? parseFloat(multiInput.value) : 1.0;
    
    if (isNaN(matrixDays) || matrixDays < 1) matrixDays = 30;
    if (isNaN(multiplier) || multiplier <= 0) multiplier = 1.0;

    velocityzState = {};

    if (typeof salesDB !== 'undefined' && salesDB.length > 0) {
        let baselineCutoff = new Date();
        baselineCutoff.setDate(baselineCutoff.getDate() - 30);
        
        let matrixCutoff = new Date();
        matrixCutoff.setDate(matrixCutoff.getDate() - matrixDays);
        
        salesDB.forEach(s => {
            let rawDate = s.sale_date || s['Created at'] || s['Date'] || new Date().toISOString();
            let saleDate = new Date(rawDate);
            if (isNaN(saleDate.getTime())) return;

            let type = s.transaction_type;
            if (type !== 'Refund' && type !== 'Return' && type !== 'IGNORE' && type !== 'Pre-Ship Exchange') {
                let pName = s.internal_recipe_name;
                let qtySold = parseFloat(s.qty_sold) || parseFloat(s['Lineitem quantity']) || 1;
                
                if (pName && productsDB[pName]) {
                    if (!velocityzState[pName]) {
                        velocityzState[pName] = { baselineDaily: 0, matrixDaily: 0, forecastQty: 0 };
                    }
                    
                    if (saleDate >= baselineCutoff) {
                        velocityzState[pName].baselineDaily += (qtySold / 30);
                    }
                    if (saleDate >= matrixCutoff) {
                        velocityzState[pName].matrixDaily += (qtySold / matrixDays);
                    }
                }
            }
        });
    }

    // Only compute forecasts for items that actually have valid FGI sales data
    Object.keys(velocityzState).forEach(pName => {
        let customTotal = velocityzState[pName].matrixDaily * matrixDays * multiplier;
        velocityzState[pName].forecastQty = Math.ceil(customTotal);
    });

    window.renderVelocityzFGI();
    window.runVelocityzExplosion();
};

window.closeVelocityzModal = function() {
    document.getElementById('velocityzModal').style.display = 'none';
};

window.resetVelocityzForecast = function() {
    let matrixInput = document.getElementById('velocityzMatrixDays');
    let multiInput = document.getElementById('velocityzMultiplier');
    if(matrixInput) matrixInput.value = 30;
    if(multiInput) multiInput.value = 1.0;

    window.velocityzTreeState = {}; // Fold everything back up
    window.recomputeVelocityzBaseline();
};

window.updateVelocityzForecast = function(pName, val) {
    let parsed = parseFloat(val);
    if (isNaN(parsed) || parsed < 0) parsed = 0;
    if (velocityzState[pName]) {
        velocityzState[pName].forecastQty = parsed;
        window.runVelocityzExplosion();
    }
};

window.renderVelocityzFGI = function() {
    let tbody = document.getElementById('velocityzFgiList');
    if (!tbody) return;
    
    let html = '';
    let keys = Object.keys(velocityzState).sort();
    
    if (keys.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 15px;">No FGI history found.</td></tr>';
        return;
    }

    let matrixInput = document.getElementById('velocityzMatrixDays');
    let multiInput = document.getElementById('velocityzMultiplier');
    let matrixDays = matrixInput ? parseFloat(matrixInput.value) || 30 : 30;
    let multiplier = multiInput ? parseFloat(multiInput.value) || 1.0 : 1.0;

    keys.forEach(pName => {
        let st = velocityzState[pName];
        let bDaily = st.baselineDaily;
        let mDaily = st.matrixDaily;
        let mTotal = mDaily * matrixDays * multiplier;
        
        let is3D = !!(productsDB[pName] && productsDB[pName].is_3d_print);
        let isLabel = !!(productsDB[pName] && productsDB[pName].is_label);
        let isSub = !!(typeof isSubassemblyDB !== 'undefined' && isSubassemblyDB[pName]);
        let icn = is3D ? "🖨️" : (isLabel ? "🏷️" : (isSub ? "⚙️" : "📦"));
        
        html += `<tr style="border-bottom: 1px solid var(--border-color);">
            <td style="font-weight: bold; color: var(--text-heading); display: flex; align-items: center; gap: 6px;">
                <span>${icn}</span> <span>${pName}</span>
            </td>
            <td class="text-right" style="color: var(--text-muted);">${bDaily.toFixed(2).replace(/\.?0+$/,'')}</td>
            <td class="text-right" style="color: #10b981; font-weight: bold;">${mDaily.toFixed(2).replace(/\.?0+$/,'')}</td>
            <td class="text-right" style="color: #8b5cf6; font-weight: bold;">${mTotal.toFixed(1).replace(/\.?0+$/,'')}</td>
            <td class="text-right">
                <input type="number" min="0" value="${st.forecastQty}" 
                       oninput="window.updateVelocityzForecast('${pName.replace(/'/g, "\\'")}', this.value)" 
                       style="width: 70px; text-align: right; background: var(--bg-input); border: 1px solid #f59e0b; color: #f59e0b; font-weight: bold; padding: 4px;">
            </td>
        </tr>`;
    });
    
    tbody.innerHTML = html;
};

window.buildVelocityzTreeHTML = function(pName, reqQty, isRoot = false, idPath = "") {
    let recipe = productsDB[pName] || [];
    if (recipe.length === 0) {
        if (isRoot) return `<div style="padding: 15px; color: #ef4444; font-size: 12px; font-weight: bold; background: rgba(239, 68, 68, 0.1); border-radius: 6px; margin-top: 10px;">⚠️ No Bill of Materials (Recipe) defined for this product in the catalog.</div>`;
        return "";
    }
    
    let html = `<ul style="list-style-type:none; padding-left: ${isRoot ? '0' : '20px'}; border-left: ${isRoot ? 'none' : '1px dashed var(--border-color)'}; margin: ${isRoot ? '0' : '5px 0 0 10px'};">`;
    
    recipe.forEach(comp => {
        let subK = comp.item_key || comp.di_item_id || comp.name;
        let qPer = parseFloat(comp.quantity || comp.qty) || 1;
        let totalReq = qPer * reqQty;
        
        let isProd = subK.startsWith('RECIPE:::');
        let displayName = subK;
        
        if (isProd) {
            let s = subK.replace('RECIPE:::', '');
            let is3D = !!(productsDB[s] && productsDB[s].is_3d_print);
            let isLabel = !!(productsDB[s] && productsDB[s].is_label);
            let isSub = !!(typeof isSubassemblyDB !== 'undefined' && isSubassemblyDB[s]);
            let icn = is3D ? "🖨️ " : (isLabel ? "🏷️ " : (isSub ? "⚙️ " : "📦 "));
            displayName = icn + s;
            
            let childId = idPath + '_' + s.replace(/\W/g, '_');
            let childHtml = window.buildVelocityzTreeHTML(s, totalReq, false, childId);
            
            if (childHtml) {
                let isOpen = window.velocityzTreeState && window.velocityzTreeState[childId] ? "open" : "";
                html += `<li style="margin-bottom: 8px;">
                    <details id="${childId}" ${isOpen}>
                        <summary style="cursor: pointer; display: inline-flex; align-items: center; user-select: none;">
                            <span style="font-weight: bold; color: var(--text-heading); font-size: 13px;">${displayName}</span>
                            <span style="background: var(--bg-panel); color: #f97316; font-size: 11px; font-weight: 900; padding: 2px 8px; border-radius: 12px; border: 1px solid #f97316; margin-left: 10px;">${totalReq.toFixed(2).replace(/\.?0+$/,'')}</span>
                        </summary>
                        ${childHtml}
                    </details>
                </li>`;
            } else {
                html += `<li style="margin-bottom: 5px; padding: 4px 0; display: flex; align-items: center;">
                    <span style="color: var(--text-heading); font-size: 13px;">${displayName}</span>
                    <span style="color: #f97316; font-size: 12px; font-weight: bold; margin-left: auto;">${totalReq.toFixed(2).replace(/\.?0+$/,'')}</span>
                </li>`;
            }
        } else {
            let c = typeof catalogCache !== 'undefined' ? catalogCache[subK] : null;
            if (c) displayName = '🧵 ' + (c.neoName || c.itemName);
            else displayName = '🧵 ' + subK;
            
            html += `<li style="margin-bottom: 5px; padding: 4px 0; display: flex; align-items: center;">
                <span style="color: var(--text-muted); font-size: 13px;">${displayName}</span>
                <span style="color: #0ea5e9; font-size: 12px; font-weight: bold; margin-left: auto;">${totalReq.toFixed(2).replace(/\.?0+$/,'')}</span>
            </li>`;
        }
    });
    
    html += `</ul>`;
    return html;
};

window.runVelocityzExplosion = function() {
    let outContainer = document.getElementById('velocityzBOMList');
    if (!outContainer) return;

    window.velocityzTreeState = window.velocityzTreeState || {};
    outContainer.querySelectorAll('details').forEach(det => {
        if (det.id) {
            window.velocityzTreeState[det.id] = det.hasAttribute('open');
        }
    });

    let html = '';
    let hasData = false;

    Object.keys(velocityzState).forEach(pName => {
        let fcast = velocityzState[pName].forecastQty;
        if (fcast > 0) {
            hasData = true;
            let rootId = 'vel_rt_' + pName.replace(/\W/g, '_');
            
            let is3D = !!(productsDB[pName] && productsDB[pName].is_3d_print);
            let isLabel = !!(productsDB[pName] && productsDB[pName].is_label);
            let isSub = !!(typeof isSubassemblyDB !== 'undefined' && isSubassemblyDB[pName]);
            let icn = is3D ? "🖨️ " : (isLabel ? "🏷️ " : (isSub ? "⚙️ " : "📦 "));
            let typeTag = is3D ? "3D PRINT" : (isLabel ? "CUSTOM LABEL" : (isSub ? "SUB-ASSEMBLY" : "RETAIL GOOD"));

            let treeHtml = window.buildVelocityzTreeHTML(pName, fcast, true, rootId);
            
            let isOpen = window.velocityzTreeState[rootId] ? "open" : "";
            
            html += `<div style="background: var(--bg-container); border: 1px solid var(--border-color); border-radius: 8px; padding: 15px; margin-bottom: 15px; box-shadow: 0 4px 6px var(--shadow-color);">
                <details id="${rootId}" ${isOpen}>
                    <summary style="cursor: pointer; display: flex; justify-content: space-between; align-items: center; user-select: none; border-bottom: 2px solid var(--border-color); padding-bottom: 10px; margin-bottom: 5px;">
                        <span style="font-weight: 900; color: #f97316; font-size: 16px; text-transform: uppercase; display: flex; align-items: center;">
                            ${icn} ${pName} 
                            <span style="font-size: 10px; margin-left: 10px; padding: 2px 6px; background: rgba(0,0,0,0.2); border-radius: 4px; border: 1px solid #f97316; color: #f97316;">${typeTag}</span>
                        </span>
                        <span style="background: rgba(249, 115, 22, 0.1); color: #f97316; font-size: 14px; font-weight: 900; padding: 4px 12px; border-radius: 20px; border: 1px solid #f97316;">${fcast} TARGET</span>
                    </summary>
                    ${treeHtml}
                </details>
            </div>`;
        }
    });

    if (!hasData) {
        html = '<div style="text-align: center; color: var(--text-muted); padding: 50px;">Input forecast targets to explode BOM</div>';
    }

    outContainer.innerHTML = html;
};

// ========================================================
// WEBRTC CYCLE SCANNER LOGIC
// ========================================================
let html5QrCode = null;
let currentScanKey = null;
let currentScanIsFgi = false;

window.startCycleCount = async function() {
    let card = document.getElementById('inlineCycleScannerCard');
    if(card) card.style.display = 'flex';
    
    // Pull context from the Cycle Count Manager dropdown
    let selectEl = document.getElementById('ccMngrItemSelect');
    let titleEl = document.getElementById('inlineScannerItemName');
    let subtitleEl = document.getElementById('inlineScannerExpected');
    
    if (selectEl && selectEl.value) {
        let selectedOption = selectEl.options[selectEl.selectedIndex];
        titleEl.innerText = "VERIFYING TARGET:";
        titleEl.style.color = "#10b981";
        subtitleEl.innerText = selectedOption.text;
    } else {
        titleEl.innerText = "Scan Any Item";
        titleEl.style.color = "white";
        subtitleEl.innerText = "No target filter applied";
    }
    
    // Completely destroy previous instance to prevent iOS Safari Promise locks
    if (html5QrCode) {
        try { await html5QrCode.stop(); } catch(e) {}
        html5QrCode = null;
    }
    const readerEl = document.getElementById("barcode-reader");
    if (readerEl) readerEl.innerHTML = '';

    try {
        html5QrCode = new Html5Qrcode("barcode-reader");
        await html5QrCode.start(
            { facingMode: "environment" },
            { fps: 12, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
            (decodedText, decodedResult) => {
                window.onScanSuccess(decodedText);
            },
            (errorMessage) => {
                // ignore per-frame scan errors
            }
        );
    } catch(err) {
        sysLog(`WebRTC Camera Error: ${err.message || err}`, true);
        alert("Camera error: " + (err.message || err));
        window.stopCycleCount();
    }
};

window.stopCycleCount = async function() {
    if(html5QrCode && html5QrCode.getState() !== 1) { // 1 = NOT_STARTED
        try {
            await html5QrCode.stop();
            html5QrCode.clear();
        } catch(err) {
            sysLog(`Scanner clear error: ${err.message || err}`, true);
            console.warn(err);
        }
        html5QrCode = null;
    }
    const readerEl = document.getElementById("barcode-reader");
    if (readerEl) readerEl.innerHTML = '';
    
    let card = document.getElementById('inlineCycleScannerCard');
    if(card) card.style.display = 'none';
};

window.onScanSuccess = function(decodedText) {
    if(html5QrCode && html5QrCode.getState() === 2) { // 2 = SCANNING
        html5QrCode.pause(true); // pause camera and scanning
    }
    
    let beep = document.getElementById('scanner-beep');
    if (beep) {
        beep.currentTime = 0;
        beep.play().catch((err)=>{ sysLog("Scanner beep audio playback blocked/failed: " + err); });
    }
    
    let flash = document.getElementById('scanner-success-flash');
    if (flash) {
        flash.style.display = 'block';
        setTimeout(() => flash.style.display = 'none', 300);
    }

    let actualKey = "";
    let pName = decodedText.replace('RECIPE:::', '');
    
    // Validate barcode exists in system
    if(productsDB[pName]) {
        actualKey = `RECIPE:::${pName}`;
    } else if(catalogCache[decodedText] || (typeof isSubassemblyDB !== 'undefined' && isSubassemblyDB[pName])) {
        actualKey = decodedText;
    } else {
        sysLog(`Barcode Error: Not recognized - ${decodedText}`, true);
        alert("Barcode not recognized in system: " + decodedText);
        if(html5QrCode) html5QrCode.resume();
        return;
    }
    
    // Auto-select the item in the Cycle Count Manager dropdown
    let selectEl = document.getElementById('ccMngrItemSelect');
    if (selectEl) {
        selectEl.value = actualKey;
        
        // If the value wasn't in the options (unlikely if the DBs match, but possible if unfiltered), try to inject it
        if(selectEl.value !== actualKey) {
            let n = pName;
            if(catalogCache[actualKey]) n = catalogCache[actualKey].neoName || catalogCache[actualKey].itemName;
            sysLog(`Scanner parsed valid key ${actualKey} but it was not in select list natively. Forcing injection.`);
            let opt = document.createElement("option");
            opt.value = actualKey;
            opt.text = n;
            selectEl.appendChild(opt);
            selectEl.value = actualKey;
        }
    }
    
    // Trigger the stock update logic natively as if the user clicked the dropdown
    window.updateCcMngrStock();
    
    // Shutdown the camera to save battery now that we have loaded the form
    window.stopCycleCount();
    
    // Focus the actual manager quantity input field
    setTimeout(() => {
        let input = document.getElementById('ccMngrQtyInput');
        if(input) {
            input.focus();
            // scroll manager to view just in case
            input.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, 100);
};

window.resumeCycleCount = function() {
    // Deprecated for Dual-Card layout, left for compatibility stub
    if(html5QrCode && html5QrCode.getState() === 3) {
        html5QrCode.resume();
    }
};

// ========================================================
// CYCLE COUNT MANAGER MODAL LOGIC
// ========================================================

window.filterCcMngrItems = function() {
    let term = document.getElementById('ccMngrSearch').value.toLowerCase().trim();
    let dropdown = document.getElementById('ccMngrDropdown');
    
    if(!window.cachedCcMngrOptions) return;
    
    if(term === '') {
        dropdown.innerHTML = window.cachedCcMngrOptions;
        dropdown.style.display = 'none';
        return;
    }
    
    dropdown.innerHTML = window.cachedCcMngrOptions;
    
    let items = dropdown.querySelectorAll('.cc-dropdown-item');
    items.forEach(o => {
        if(!o.innerText.toLowerCase().includes(term)) {
            o.remove();
        }
    });
    
    if(dropdown.querySelectorAll('.cc-dropdown-item').length > 0) {
        dropdown.style.display = 'block';
    } else {
        dropdown.innerHTML = '<div style="padding:10px; color:var(--text-muted); text-align:center;">No items found.</div>';
        dropdown.style.display = 'block';
    }
};

window.selectCcMngrItem = function(val, text) {
    document.getElementById('ccMngrItemSelect').value = val;
    document.getElementById('ccMngrSearch').value = text;
    document.getElementById('ccMngrDropdown').style.display = 'none';
    window.updateCcMngrStock();
};

/**
 * Opens the Cycle Count Manager modal and heavily initializes both 
 * the custom search dropdown overlay and the native fallback select.
 */
window.openCycleCountManager = function() {
    let select = document.getElementById('ccMngrItemSelect');
    // Seed the empty default option
    let baseSelectHtml = '<option value="">-- Choose Item Natively --</option>';
    
    let allProds = Object.keys(productsDB).sort();
    let printProds = allProds.filter(p => productsDB[p] && productsDB[p].is_3d_print);
    let labelProds = allProds.filter(p => productsDB[p] && productsDB[p].is_label);
    
    let retailProds = allProds.filter(p => !isSubassemblyDB[p] && !printProds.includes(p) && !labelProds.includes(p));
    let subProds = allProds.filter(p => isSubassemblyDB[p] && !printProds.includes(p) && !labelProds.includes(p));
    let realPrintProds = printProds.filter(p => !labelProds.includes(p));
    
    let optGroups = {
        retail: '<div class="cc-dropdown-header" style="padding:6px 10px; font-weight:bold; background:var(--bg-body); font-size:11px; color:#FF8C00;">📦 RETAIL PRODUCTS</div>',
        sub: '<div class="cc-dropdown-header" style="padding:6px 10px; font-weight:bold; background:var(--bg-body); font-size:11px; color:#FF8C00;">⚙️ SUB-ASSEMBLIES</div>',
        print: '<div class="cc-dropdown-header" style="padding:6px 10px; font-weight:bold; background:var(--bg-body); font-size:11px; color:#FF8C00;">🖨️ 3D PRINTS</div>',
        label: '<div class="cc-dropdown-header" style="padding:6px 10px; font-weight:bold; background:var(--bg-body); font-size:11px; color:#FF8C00;">🏷️ CUSTOM LABELZ</div>',
        raw: '<div class="cc-dropdown-header" style="padding:6px 10px; font-weight:bold; background:var(--bg-body); font-size:11px; color:#FF8C00;">🔩 RAW MATERIALS</div>'
    };

    let nativeGroups = {
        retail: '<optgroup label="📦 RETAIL PRODUCTS">',
        sub: '<optgroup label="⚙️ SUB-ASSEMBLIES">',
        print: '<optgroup label="🖨️ 3D PRINTS">',
        label: '<optgroup label="🏷️ CUSTOM LABELZ">',
        raw: '<optgroup label="🔩 RAW MATERIALS">'
    };
    
    let mkItem = (val, txt) => {
        let safeVal = String(val).replace(/'/g, "\\'").replace(/"/g, '&quot;');
        let safeTxt = String(txt).replace(/'/g, "\\'").replace(/"/g, '&quot;');
        return `<div class="cc-dropdown-item" style="padding:8px 10px; cursor:pointer; font-size:13px; border-bottom:1px solid var(--border-color);" onclick="window.selectCcMngrItem('${safeVal}', '${safeTxt}')" onmouseover="this.style.background='var(--brand-dark)'" onmouseout="this.style.background='transparent'">${txt}</div>`;
    };

    let mkOpt = (val, txt) => {
        let safeVal = String(val).replace(/'/g, "\\'").replace(/"/g, '&quot;');
        return `<option value="${safeVal}">${txt}</option>`;
    };
    
    retailProds.forEach(k => { optGroups.retail += mkItem(`RECIPE:::${k}`, `📦 ${k}`); nativeGroups.retail += mkOpt(`RECIPE:::${k}`, `📦 ${k}`); });
    subProds.forEach(k => { optGroups.sub += mkItem(`RECIPE:::${k}`, `⚙️ ${k}`); nativeGroups.sub += mkOpt(`RECIPE:::${k}`, `⚙️ ${k}`); });
    realPrintProds.forEach(k => { optGroups.print += mkItem(`RECIPE:::${k}`, `🖨️ ${k}`); nativeGroups.print += mkOpt(`RECIPE:::${k}`, `🖨️ ${k}`); });
    labelProds.forEach(k => { optGroups.label += mkItem(`RECIPE:::${k}`, `🏷️ ${k}`); nativeGroups.label += mkOpt(`RECIPE:::${k}`, `🏷️ ${k}`); });
    
    // sort raw
    let rawArr = Object.entries(catalogCache).sort((a,b) => {
        let na = a[1].neoName || a[1].itemName || '';
        let nb = b[1].neoName || b[1].itemName || '';
        return na.localeCompare(nb);
    });
    rawArr.forEach(([itemKey, r]) => {
        let n = r.neoName || r.itemName;
        optGroups.raw += mkItem(itemKey, `🔩 ${n}`);
        nativeGroups.raw += mkOpt(itemKey, `🔩 ${n}`);
    });

    if (retailProds.length > 0) nativeGroups.retail += '</optgroup>';
    if (subProds.length > 0) nativeGroups.sub += '</optgroup>';
    if (realPrintProds.length > 0) nativeGroups.print += '</optgroup>';
    if (labelProds.length > 0) nativeGroups.label += '</optgroup>';
    if (rawArr.length > 0) nativeGroups.raw += '</optgroup>';
    
    let finalHtml = '';
    let finalNativeHtml = baseSelectHtml;

    if (retailProds.length > 0) { finalHtml += optGroups.retail; finalNativeHtml += nativeGroups.retail; }
    if (subProds.length > 0) { finalHtml += optGroups.sub; finalNativeHtml += nativeGroups.sub; }
    if (realPrintProds.length > 0) { finalHtml += optGroups.print; finalNativeHtml += nativeGroups.print; }
    if (labelProds.length > 0) { finalHtml += optGroups.label; finalNativeHtml += nativeGroups.label; }
    if (rawArr.length > 0) { finalHtml += optGroups.raw; finalNativeHtml += nativeGroups.raw; }
    
    document.getElementById('ccMngrDropdown').innerHTML = finalHtml;
    select.innerHTML = finalNativeHtml;
    window.cachedCcMngrOptions = finalHtml;
    
    let searchEl = document.getElementById('ccMngrSearch');
    if(searchEl) searchEl.value = '';
    
    document.getElementById('ccMngrQtyInput').value = '';
    document.getElementById('cycleCountManagerModal').style.display = 'flex';
};

window.closeCycleCountManager = function() {
    document.getElementById('cycleCountManagerModal').style.display = 'none';
};

window.updateCcMngrStock = function() {
    let key = document.getElementById('ccMngrItemSelect').value;
    
    // Sync the search input if changing from native select natively
    let searchEl = document.getElementById('ccMngrSearch');
    if (searchEl && key) {
        let opt = document.querySelector(`#ccMngrItemSelect option[value="${key.replace(/"/g, '\\"')}"]`);
        if (opt) searchEl.value = opt.text;
    } else if (!key && searchEl) {
        searchEl.value = '';
    }
    
    let display = document.getElementById('ccMngrStockDisplay');
    let valEl = document.getElementById('ccMngrStockVal');
    
    if (!key) { display.style.display = 'none'; return; }
    
    let rKey = key.replace(/"/g, '"').replace(/\\'/g, "'");
    let inv = inventoryDB[rKey] || {};
    let stock = 0;
    
    let elL1 = document.getElementById('ccMngrL1'); let elV1 = document.getElementById('ccMngrV1');
    let elL2 = document.getElementById('ccMngrL2'); let elV2 = document.getElementById('ccMngrV2');
    let elL3 = document.getElementById('ccMngrL3'); let elV3 = document.getElementById('ccMngrV3');
    let elV4 = document.getElementById('ccMngrV4'); let elV5 = document.getElementById('ccMngrV5');
    
    if (rKey.startsWith('RECIPE:::')) {
        let p    = parseFloat(inv.produced_qty) || 0;
        let pb   = parseFloat(inv.prototype_produced_qty) || 0;
        let sold = parseFloat(inv.sold_qty) || 0;
        let cp   = parseFloat(inv.production_consumed_qty) || 0;
        let cpr  = parseFloat(inv.prototype_consumed_qty) || 0;
        let sq   = parseFloat(inv.scrap_qty) || 0;
        let adj  = parseFloat(inv.manual_adjustment) || 0;
        stock = p - sold - cp - sq - Math.max(0, cpr - pb) + adj;
        
        elL1.innerText = "PROD";
        elV1.innerText = Math.round(p * 100) / 100;
        elV1.contentEditable = "true"; elV1.className = "editable";
        
        elL2.innerText = "PROTO";
        elV2.innerText = Math.round(pb * 100) / 100;
        elV2.parentElement.style.visibility = "visible";
        
        elL3.innerText = "CONS";
        elV3.innerText = Math.round(cp * 100) / 100;
        elV3.contentEditable = "false"; elV3.className = "";
        
        elV4.innerText = Math.round(sq * 100) / 100;
        elV5.innerText = Math.round(adj * 100) / 100;
    } else {
        let c    = catalogCache[rKey] ? catalogCache[rKey].totalQty : 0;
        let cq   = parseFloat(inv.consumed_qty) || 0;
        let sq   = parseFloat(inv.scrap_qty) || 0;
        let adj  = parseFloat(inv.manual_adjustment) || 0;
        stock = c - cq - sq + adj;
        
        elL1.innerText = "PURCH";
        elV1.innerText = Math.round(c * 100) / 100;
        elV1.contentEditable = "false"; elV1.className = "";
        
        elL2.innerText = "-";
        elV2.innerText = "-";
        elV2.parentElement.style.visibility = "hidden";
        
        elL3.innerText = "CONS";
        elV3.innerText = Math.round(cq * 100) / 100;
        elV3.contentEditable = "true"; elV3.className = "editable";
        
        elV4.innerText = Math.round(sq * 100) / 100;
        elV5.innerText = Math.round(adj * 100) / 100;
    }
    
    let rounded = Math.round(stock * 100) / 100;
    valEl.innerText = rounded;
    valEl.style.color = rounded <= 0 ? '#ef4444' : '#f97316';
    display.style.display = 'flex';
};

window.handleCcMngrTelemetryEdit = async function(el, colIndex) {
    let key = document.getElementById('ccMngrItemSelect').value;
    if (!key) return;
    
    let rKey = key.replace(/"/g, '"').replace(/\\'/g, "'");
    let isFgi = rKey.startsWith('RECIPE:::');
    
    let oldValStr = el.dataset.oldVal || "0";
    let newValStr = el.innerText.trim() || "0";
    let newVal = parseFloat(newValStr) || 0;
    
    if (newVal.toString() === oldValStr) return; // Unchanged
    if (isNaN(newVal)) { el.innerText = oldValStr; return; }
    
    if (!inventoryDB[rKey]) inventoryDB[rKey] = {consumed_qty:0, manual_adjustment:0, produced_qty:0, sold_qty:0, min_stock:0, scrap_qty:0, prototype_consumed_qty:0, assembly_consumed_qty:0, production_consumed_qty:0, prototype_produced_qty:0};
    
    let field = "";
    if (isFgi) {
        if (colIndex === 1) field = "produced_qty";
        if (colIndex === 2) field = "prototype_produced_qty";
        if (colIndex === 4) field = "scrap_qty";
        if (colIndex === 5) field = "manual_adjustment";
    } else {
        if (colIndex === 3) field = "consumed_qty";
        if (colIndex === 4) field = "scrap_qty";
        if (colIndex === 5) field = "manual_adjustment";
    }
    
    if (!field) return;
    
    let oldDbVal = inventoryDB[rKey][field];
    inventoryDB[rKey][field] = newVal;
    
    let payload = { item_key: rKey, consumed_qty: inventoryDB[rKey].consumed_qty, manual_adjustment: inventoryDB[rKey].manual_adjustment, produced_qty: inventoryDB[rKey].produced_qty, sold_qty: inventoryDB[rKey].sold_qty, min_stock: inventoryDB[rKey].min_stock, scrap_qty: inventoryDB[rKey].scrap_qty, prototype_consumed_qty: inventoryDB[rKey].prototype_consumed_qty||0, assembly_consumed_qty: inventoryDB[rKey].assembly_consumed_qty||0, production_consumed_qty: inventoryDB[rKey].production_consumed_qty||0, prototype_produced_qty: inventoryDB[rKey].prototype_produced_qty||0 };
    
    el.style.background = "rgba(16, 185, 129, 0.2)";
    const { error } = await supabaseClient.from('inventory_consumption').upsert(payload, {onConflict:'item_key'});
    if(error) { 
        sysLog("DB Error: " + error.message, true);
        alert("DB Error: " + error.message); 
        inventoryDB[rKey][field] = oldDbVal; 
        el.innerText = oldDbVal;
        el.style.background = "rgba(239, 68, 68, 0.2)";
        return; 
    }
    
    setTimeout(() => { el.style.background = ""; }, 500);
    window.updateCcMngrStock(); 
    window.renderInventoryTable();
};

window.saveManualCycleCount = async function(event) {
    let key = document.getElementById('ccMngrItemSelect').value;
    if(!key) { sysLog("Validation Error: No item selected for count.", true); return alert("Please select an item first."); }
    
    let valInput = document.getElementById('ccMngrQtyInput').value;
    if(valInput === "") { sysLog("Validation Error: Empty quantity entered.", true); return alert("Please enter the physical quantity."); }
    let val = parseFloat(valInput);
    if(isNaN(val)) { sysLog("Validation Error: Invalid number entered.", true); return alert("Please enter a valid number."); }
    
    let rKey = key.replace(/"/g, '"').replace(/\\'/g, "'"); 
    let isFgi = rKey.startsWith('RECIPE:::');
    
    if(!inventoryDB[rKey]) inventoryDB[rKey] = {consumed_qty:0, manual_adjustment:0, produced_qty:0, sold_qty:0, min_stock:0, scrap_qty:0, prototype_consumed_qty:0, assembly_consumed_qty:0, production_consumed_qty:0, prototype_produced_qty:0};
    
    let payload = { item_key: rKey, consumed_qty: inventoryDB[rKey].consumed_qty, manual_adjustment: inventoryDB[rKey].manual_adjustment, produced_qty: inventoryDB[rKey].produced_qty, sold_qty: inventoryDB[rKey].sold_qty, min_stock: inventoryDB[rKey].min_stock, scrap_qty: inventoryDB[rKey].scrap_qty, prototype_consumed_qty: inventoryDB[rKey].prototype_consumed_qty||0, assembly_consumed_qty: inventoryDB[rKey].assembly_consumed_qty||0, production_consumed_qty: inventoryDB[rKey].production_consumed_qty||0, prototype_produced_qty: inventoryDB[rKey].prototype_produced_qty||0 };
    
    if(isFgi) {
        let p = parseFloat(inventoryDB[rKey].produced_qty) || 0;
        let pb = parseFloat(inventoryDB[rKey].prototype_produced_qty) || 0;
        let sold = parseFloat(inventoryDB[rKey].sold_qty) || 0;
        let c_prod = parseFloat(inventoryDB[rKey].production_consumed_qty) || 0;
        let c_proto = parseFloat(inventoryDB[rKey].prototype_consumed_qty) || 0;
        let sq = parseFloat(inventoryDB[rKey].scrap_qty) || 0;
        payload.manual_adjustment = val - (p - sold - c_prod - sq - Math.max(0, c_proto - pb));
    } else {
        let c = catalogCache[rKey] ? catalogCache[rKey].totalQty : 0;
        let cq = parseFloat(inventoryDB[rKey].consumed_qty) || 0;
        let sq = parseFloat(inventoryDB[rKey].scrap_qty) || 0;
        payload.manual_adjustment = val - (c - cq - sq);    
    }
    
    let btn = event ? event.target : document.querySelector('#cycleCountManagerModal .btn-green');
    let oldTxt = "💾 Save Manual Count";
    if(btn) {
        oldTxt = btn.innerText;
        btn.innerText = "⏳ Saving...";
        btn.disabled = true;
    }
    
    const { error } = await supabaseClient.from('inventory_consumption').upsert(payload, {onConflict:'item_key'}); 
    
    if(btn) {
        btn.innerText = oldTxt;
        btn.disabled = false;
    }
    
    if(error) { sysLog("DB Error: " + error.message, true); alert("DB Error: " + error.message); return; }
    
    inventoryDB[rKey] = payload;
    window.renderInventoryTable();
    window.updateCcMngrStock();
    
    if(btn) {
        btn.innerText = "✅ Count Saved!";
        btn.style.background = "#059669";
        setTimeout(() => { btn.innerText = "💾 Save Manual Count"; btn.style.background = ""; btn.disabled = false; }, 2500);
    }
    document.getElementById('ccMngrQtyInput').value = ''; // clear for next entry
};

window.saveCycleCount = async function() {
    let valInput = document.getElementById('scanner-physical-count').value;
    if(valInput === "") { window.resumeCycleCount(); return; } // just hit cancel effectively or enter empty
    let val = parseFloat(valInput);
    if(isNaN(val)) { sysLog("Validation Error: Invalid scanner number entered.", true); return alert("Please enter a valid number"); }
    
    let key = currentScanKey;
    let rKey = key.replace(/"/g, '"').replace(/\\'/g, "'"); 
    
    if(!inventoryDB[rKey]) inventoryDB[rKey] = {consumed_qty:0, manual_adjustment:0, produced_qty:0, sold_qty:0, min_stock:0, scrap_qty:0, prototype_consumed_qty:0, assembly_consumed_qty:0, production_consumed_qty:0, prototype_produced_qty:0};
    
    let payload = { item_key: rKey, consumed_qty: inventoryDB[rKey].consumed_qty, manual_adjustment: inventoryDB[rKey].manual_adjustment, produced_qty: inventoryDB[rKey].produced_qty, sold_qty: inventoryDB[rKey].sold_qty, min_stock: inventoryDB[rKey].min_stock, scrap_qty: inventoryDB[rKey].scrap_qty, prototype_consumed_qty: inventoryDB[rKey].prototype_consumed_qty||0, assembly_consumed_qty: inventoryDB[rKey].assembly_consumed_qty||0, production_consumed_qty: inventoryDB[rKey].production_consumed_qty||0, prototype_produced_qty: inventoryDB[rKey].prototype_produced_qty||0 };
    
    if(currentScanIsFgi) {
        let p = parseFloat(inventoryDB[rKey].produced_qty) || 0;
        let pb = parseFloat(inventoryDB[rKey].prototype_produced_qty) || 0;
        let sold = parseFloat(inventoryDB[rKey].sold_qty) || 0;
        let c_prod = parseFloat(inventoryDB[rKey].production_consumed_qty) || 0;
        let c_proto = parseFloat(inventoryDB[rKey].prototype_consumed_qty) || 0;
        let sq = parseFloat(inventoryDB[rKey].scrap_qty) || 0;
        payload.manual_adjustment = val - (p - sold - c_prod - sq - Math.max(0, c_proto - pb));
    } else {
        let c = catalogCache[rKey] ? catalogCache[rKey].totalQty : 0;
        let cq = parseFloat(inventoryDB[rKey].consumed_qty) || 0;
        let sq = parseFloat(inventoryDB[rKey].scrap_qty) || 0;
        payload.manual_adjustment = val - (c - cq - sq);    
    }
    
    document.getElementById('scanner-prompt-title').innerText = "Saving...";
    
    const { error } = await supabaseClient.from('inventory_consumption').upsert(payload, {onConflict:'item_key'}); 
    if(error) { sysLog("DB Error: " + error.message, true); alert("DB Error: " + error.message); document.getElementById('scanner-prompt-title').innerText = currentScanKey; return; }
    
    inventoryDB[rKey] = payload;
    window.renderInventoryTable(); window.updateCcMngrStock();
    
    window.resumeCycleCount();
};

// ====== GLOBAL BINDINGS ======
if (typeof window !== 'undefined') {
    window.resetInventoryConsumption = typeof resetInventoryConsumption !== 'undefined' ? resetInventoryConsumption : undefined;
    window.renderInventoryTable = typeof renderInventoryTable !== 'undefined' ? renderInventoryTable : undefined;
    window.renderFgiTable = typeof renderFgiTable !== 'undefined' ? renderFgiTable : undefined;
    window.sortInventory = typeof sortInventory !== 'undefined' ? sortInventory : undefined;
    window.sortFGI = typeof sortFGI !== 'undefined' ? sortFGI : undefined;
    window.runProductionBatch = typeof runProductionBatch !== 'undefined' ? runProductionBatch : undefined;
}
