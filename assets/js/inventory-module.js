/**
 * @typedef {Object} InventoryConsumptionRow
 * @property {string} item_key
 * @property {number} consumed_qty
 * @property {number} manual_adjustment
 * @property {number} produced_qty
 * @property {number} sold_qty
 * @property {number} min_stock
 * @property {number} scrap_qty
 * @property {number} [prototype_consumed_qty]
 * @property {number} [assembly_consumed_qty]
 * @property {number} [production_consumed_qty]
 * @property {number} [prototype_produced_qty]
 * @property {number} [rop_lead_time_days]
 */
// --- 8. INVENTORY MANAGERS & REORDER LOGIC ---
const invStyles = document.createElement('style');
invStyles.innerHTML = window.safeHTML(`
.inv-cat-header { background: rgba(255,255,255,0.03); transition: background 0.2s; cursor: pointer; padding:10px 15px; border-bottom:1px solid rgba(255,255,255,0.1); border-radius: 6px 6px 0 0; }
.inv-cat-header:hover { background: rgba(255,255,255,0.06); }
.cc-dropdown-item { padding:8px 10px; cursor:pointer; font-size:13px; border-bottom:1px solid var(--border-color); background: transparent; }
.cc-dropdown-item:hover { background: var(--brand-dark); }
`);
document.head.appendChild(invStyles);

let savedFgiState = null;
try { savedFgiState = JSON.parse(localStorage.getItem('fgiCategoryState')); } catch(_e) { console.warn('Invalid FGI State cache cleared.'); localStorage.removeItem('fgiCategoryState'); }
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

    const getTh = (cat, col, label, color) => `<th class="${currentFgiSort[cat].column===col?'sorted-'+currentFgiSort[cat].direction:''} text-right" data-app-click="sortFgi" data-cat="${cat}" data-col="${col}" style="${color ? 'border-bottom:2px solid '+color+';' : ''}">${label}</th>`;
    const getNameTh = (cat) => `<th class="${currentFgiSort[cat].column==='n'?'sorted-'+currentFgiSort[cat].direction:''}" data-app-click="sortFgi" data-cat="${cat}" data-col="n">Product Name</th>`;

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


        groups.forEach(g => {
            if(g.items.length === 0) return;
            let isExp = window.fgiCategoryState[g.id] !== false;
            let chevron = isExp ? '▼' : '▶';
            
            h += `<div class="neo-category-row" data-app-click="toggleFgiCat" data-cat="${g.id}">
                <span style="font-weight:900; color:var(--text-heading); font-size:12px; text-transform:uppercase; letter-spacing:1px; display:flex; align-items:center; gap:8px;">
                    <span class="cat-arrow" style="color:var(--text-muted); width:20px; text-align:center;">${chevron}</span> 
                    <span>${g.icn} ${g.name}</span>
                </span>
                <span style="color:var(--text-muted); font-size:12px; font-weight:bold;">(${g.items.length})</span>
            </div>`;

            
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
                        trHtml += `<td class="text-right editable" style="color:#3b82f6;" contenteditable="true" data-app-focus="storeOldValInv" data-app-blur="handleInvEdit" data-key="${sk}" data-p="0" data-c="0" data-a="0" data-sq="0" data-mode="produced_qty">${x.b.toFixed(2).replace(/\.?0+$/,'')}</td>`;
                        trHtml += `<td class="text-right editable" style="color:#8b5cf6;" contenteditable="true" data-app-focus="storeOldValInv" data-app-blur="handleInvEdit" data-key="${sk}" data-p="0" data-c="0" data-a="0" data-sq="0" data-mode="prototype_produced_qty">${x.pb.toFixed(2).replace(/\.?0+$/,'')}</td>`;
                        trHtml += `<td class="text-right editable" style="color:#ef4444;" contenteditable="true" data-app-focus="storeOldValInv" data-app-blur="handleInvEdit" data-key="${sk}" data-p="0" data-c="0" data-a="0" data-sq="0" data-mode="sold_qty">${x.sold.toFixed(2).replace(/\.?0+$/,'')}</td>`;
                        trHtml += `<td class="text-right" style="color:#fbbf24; font-weight:bold;">${x.warranty.toFixed(2).replace(/\.?0+$/,'')}</td>`;
                        trHtml += `<td class="text-right editable ${sc}" style="font-weight:bold;" contenteditable="true" data-app-focus="storeOldValInv" data-app-blur="handleInvEdit" data-key="${sk}" data-p="0" data-c="0" data-a="0" data-sq="0" data-mode="fgi_stock">${x.s.toFixed(2).replace(/\.?0+$/,'')}</td>`;
                        trHtml += `<td class="text-right editable" style="color:#f97316; font-weight:bold;" contenteditable="true" data-app-focus="storeOldValInv" data-app-blur="handleInvEdit" data-key="${sk}" data-p="0" data-c="0" data-a="0" data-sq="0" data-mode="min_stock">${x.ms.toFixed(2).replace(/\.?0+$/,'')}</td>`;
                        trHtml += `<td class="text-right" style="font-weight:bold; color:#10b981;">$${x.tv.toFixed(2)}</td>`;
                        trHtml += `<td class="text-right" style="font-weight:bold; color:${netColor};">$${x.net.toFixed(2)}</td>`;
                        trHtml += `<td class="text-right" style="font-weight:bold; color:var(--text-main);">$${(x.msrpv||0).toFixed(2)}</td>`;
                    }
                    else if (g.id === 'cat-sub') {
                        trHtml += `<td class="text-right editable" style="color:#3b82f6;" contenteditable="true" data-app-focus="storeOldValInv" data-app-blur="handleInvEdit" data-key="${sk}" data-p="0" data-c="0" data-a="0" data-sq="0" data-mode="produced_qty">${x.b.toFixed(2).replace(/\.?0+$/,'')}</td>`;
                        trHtml += `<td class="text-right editable" style="color:#8b5cf6;" contenteditable="true" data-app-focus="storeOldValInv" data-app-blur="handleInvEdit" data-key="${sk}" data-p="0" data-c="0" data-a="0" data-sq="0" data-mode="prototype_produced_qty">${x.pb.toFixed(2).replace(/\.?0+$/,'')}</td>`;
                        trHtml += `<td class="text-right editable" style="color:#ef4444;" contenteditable="true" data-app-focus="storeOldValInv" data-app-blur="handleInvEdit" data-key="${sk}" data-p="0" data-c="0" data-a="0" data-sq="0" data-mode="production_consumed_qty">${x.c_prod.toFixed(2).replace(/\.?0+$/,'')}</td>`;
                        trHtml += `<td class="text-right" style="color:${yldColor}; font-weight:bold;">${x.yld.toFixed(1)}%</td>`;
                        trHtml += `<td class="text-right editable" style="color:#ef4444; font-weight:bold;" contenteditable="true" data-app-focus="storeOldValInv" data-app-blur="handleInvEdit" data-key="${sk}" data-p="0" data-c="0" data-a="0" data-sq="0" data-mode="scrap_qty">${x.scrap.toFixed(2).replace(/\.?0+$/,'')}</td>`;
                        trHtml += `<td class="text-right" style="color:#fbbf24; font-weight:bold;">${x.warranty.toFixed(2).replace(/\.?0+$/,'')}</td>`;
                        trHtml += `<td class="text-right editable ${sc}" style="font-weight:bold;" contenteditable="true" data-app-focus="storeOldValInv" data-app-blur="handleInvEdit" data-key="${sk}" data-p="0" data-c="0" data-a="0" data-sq="0" data-mode="fgi_stock">${x.s.toFixed(2).replace(/\.?0+$/,'')}</td>`;
                        trHtml += `<td class="text-right editable" style="color:#f97316; font-weight:bold;" contenteditable="true" data-app-focus="storeOldValInv" data-app-blur="handleInvEdit" data-key="${sk}" data-p="0" data-c="0" data-a="0" data-sq="0" data-mode="min_stock">${x.ms.toFixed(2).replace(/\.?0+$/,'')}</td>`;
                        trHtml += `<td class="text-right" style="font-weight:bold; color:#10b981;">$${x.tv.toFixed(2)}</td>`;
                    }
                    else if (g.id === 'cat-print') {
                        trHtml += `<td class="text-right editable" style="color:#3b82f6;" contenteditable="true" data-app-focus="storeOldValInv" data-app-blur="handleInvEdit" data-key="${sk}" data-p="0" data-c="0" data-a="0" data-sq="0" data-mode="produced_qty">${x.b.toFixed(2).replace(/\.?0+$/,'')}</td>`;
                        trHtml += `<td class="text-right editable" style="color:#8b5cf6;" contenteditable="true" data-app-focus="storeOldValInv" data-app-blur="handleInvEdit" data-key="${sk}" data-p="0" data-c="0" data-a="0" data-sq="0" data-mode="prototype_produced_qty">${x.pb.toFixed(2).replace(/\.?0+$/,'')}</td>`;
                        trHtml += `<td class="text-right" style="color:${yldColor}; font-weight:bold;">${x.yld.toFixed(1)}%</td>`;
                        trHtml += `<td class="text-right editable" style="color:#ef4444; font-weight:bold;" contenteditable="true" data-app-focus="storeOldValInv" data-app-blur="handleInvEdit" data-key="${sk}" data-p="0" data-c="0" data-a="0" data-sq="0" data-mode="scrap_qty">${x.scrap.toFixed(2).replace(/\.?0+$/,'')}</td>`;
                        trHtml += `<td class="text-right editable ${sc}" style="font-weight:bold;" contenteditable="true" data-app-focus="storeOldValInv" data-app-blur="handleInvEdit" data-key="${sk}" data-p="0" data-c="0" data-a="0" data-sq="0" data-mode="fgi_stock">${x.s.toFixed(2).replace(/\.?0+$/,'')}</td>`;
                        trHtml += `<td class="text-right editable" style="color:#f97316; font-weight:bold;" contenteditable="true" data-app-focus="storeOldValInv" data-app-blur="handleInvEdit" data-key="${sk}" data-p="0" data-c="0" data-a="0" data-sq="0" data-mode="min_stock">${x.ms.toFixed(2).replace(/\.?0+$/,'')}</td>`;
                        trHtml += `<td class="text-right" style="font-weight:bold; color:#10b981;">$${x.tv.toFixed(2)}</td>`;
                    }
                    else if (g.id === 'cat-label') {
                        trHtml += `<td class="text-right editable" style="color:#3b82f6;" contenteditable="true" data-app-focus="storeOldValInv" data-app-blur="handleInvEdit" data-key="${sk}" data-p="0" data-c="0" data-a="0" data-sq="0" data-mode="produced_qty">${x.b.toFixed(2).replace(/\.?0+$/,'')}</td>`;
                        trHtml += `<td class="text-right editable" style="color:#ef4444;" contenteditable="true" data-app-focus="storeOldValInv" data-app-blur="handleInvEdit" data-key="${sk}" data-p="0" data-c="0" data-a="0" data-sq="0" data-mode="production_consumed_qty">${x.c_prod.toFixed(2).replace(/\.?0+$/,'')}</td>`;
                        trHtml += `<td class="text-right editable ${sc}" style="font-weight:bold;" contenteditable="true" data-app-focus="storeOldValInv" data-app-blur="handleInvEdit" data-key="${sk}" data-p="0" data-c="0" data-a="0" data-sq="0" data-mode="fgi_stock">${x.s.toFixed(2).replace(/\.?0+$/,'')}</td>`;
                        trHtml += `<td class="text-right editable" style="color:#f97316; font-weight:bold;" contenteditable="true" data-app-focus="storeOldValInv" data-app-blur="handleInvEdit" data-key="${sk}" data-p="0" data-c="0" data-a="0" data-sq="0" data-mode="min_stock">${x.ms.toFixed(2).replace(/\.?0+$/,'')}</td>`;
                        trHtml += `<td class="text-right" style="font-weight:bold; color:#10b981;">$${x.tv.toFixed(2)}</td>`;
                    }
                    
                    trHtml += `</tr>`;
                    h += trHtml;
                });
                h += `</tbody></table>`;
            }
        });
    }
    wrap.innerHTML = window.safeHTML(h); applyTableInteractivity('fgiTableWrap');
}

let SUPPLIER_LEAD_TIME_DAYS = parseFloat(localStorage.getItem('neogleamz_default_lead_time')) || 5;

window.editGlobalLeadTime = function() {
    let current = SUPPLIER_LEAD_TIME_DAYS;
    let fallback = prompt("Enter the Global Fallback Lead Time (in days) to use when an item has no specific lead time set:", current);
    if(fallback !== null) {
        let val = parseFloat(fallback);
        if(!isNaN(val) && val >= 0) {
            SUPPLIER_LEAD_TIME_DAYS = val;
            localStorage.setItem('neogleamz_default_lead_time', val);
            if(typeof renderInventoryTable === 'function') renderInventoryTable();
            alert(`Global fallback lead time seamlessly updated to ${val} days.`);
        } else {
            alert("Invalid number. Must be a positive numerical value.");
        }
    }
};

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

window.calculateDynamicROP = function(velocity, leadTimeDays) {
    if (velocity <= 0 || leadTimeDays <= 0) return 0;
    return (velocity * leadTimeDays) * SAFETY_STOCK_MULTIPLIER;
};

let invColumnFilters = {};
window.updateInvColumnFilter = function(col, val) {
    invColumnFilters[col] = val;
    renderInventoryTable();
};

function renderInventoryTable() {
    const wrap = document.getElementById('invTableWrap'); if(!wrap) return;
    renderFgiTable();
    let focusCol = document.activeElement ? document.activeElement.getAttribute('data-col') : null;
    let qStr = "";
    let searchEl = document.getElementById('rawInvSearch');
    if (searchEl) qStr = searchEl.value.toLowerCase().trim();

    const getTh = (col, label, isRight = false, borderBottom = "") => {
        let sCls = (currentInvSort.column === col ? 'sorted-' + currentInvSort.direction : '');
        if (isRight) sCls += " text-right";
        let style = borderBottom ? `border-bottom: 2px solid ${borderBottom};` : '';
        return `<th class="${sCls}" data-app-click="sortInv" data-col="${col}" style="${style}">${label}</th>`;
    };

    let ths = getTh('np', 'Neogleamz Product') +
              getTh('nn', 'Neogleamz Name') +
              getTh('n', 'Item Name') +
              getTh('p', 'Purchased', true) +
              getTh('c', 'CONS', true, '#ef4444') +
              getTh('pc', 'PROTO', true, '#8b5cf6') +
              getTh('prc', 'PROD', true, '#3b82f6') +
              getTh('sq', 'SCRAP', true, '#b91c1c') +
              getTh('a', 'ADJMT', true, '#0ea5e9') +
              getTh('ms', 'MIN', true, '#f97316') +
              getTh('ld', 'LEAD', true, '#14b8a6') +
              getTh('s', 'STOCK', true, '#f59e0b') +
              getTh('tp', 'ASSETS', true);

    let keys = ['np', 'nn', 'n', 'p', 'c', 'pc', 'prc', 'sq', 'a', 'ms', 'ld', 's', 'tp'];
    let filterRow = `<tr style="background: rgba(0,0,0,0.1);">` + keys.map(k => {
        let val = invColumnFilters[k] || "";
        return `<th style="position: sticky; z-index: 19; background: var(--bg-panel); box-shadow: inset 0 -1px 0 var(--border-color), inset -1px 0 0 var(--border-color); border: none;">
            <input type="text" data-col="${k}" value="${val.replace(/"/g, '&quot;')}" placeholder="Filter..." data-keyup="keyup_window_updateInvColumnFilter" data-colkey="${k}" data-click="click_stopProp" style="width: 100%; padding: 4px; font-size: 11px; background: var(--bg-card); border: 1px solid var(--border-color); color: var(--text-color); border-radius: 4px;">
        </th>`;
    }).join('') + `</tr>`;

    let h = `<table style="width:100%;"><thead><tr>${ths}</tr>${filterRow}</thead><tbody>`;
    let a = Object.keys(catalogCache).map(k => {
        let c = catalogCache[k], _f = fmtKey(k), i = inventoryDB[k]||{consumed_qty:0, manual_adjustment:0, min_stock:0, scrap_qty:0, prototype_consumed_qty:0, assembly_consumed_qty:0, production_consumed_qty:0, prototype_produced_qty:0, rop_lead_time_days:5};
        let s=c.totalQty-i.consumed_qty-i.scrap_qty+i.manual_adjustment;
        let up=c.avgUnitCost||0;
        let tp=s*up;
        return {
            k:k,
            np:c.neoProd || "",
            nn:c.neoName || "",
            n:c.itemName || "",
            p:c.totalQty,
            c:i.consumed_qty,
            sq:i.scrap_qty,
            a:i.manual_adjustment,
            ms:i.min_stock,
            ld:parseFloat(i.rop_lead_time_days)||SUPPLIER_LEAD_TIME_DAYS,
            s:s,
            up:up,
            tp:tp,
            pc: (i.prototype_consumed_qty||0),
            prc: (i.production_consumed_qty||0)
        };
    });

    if (qStr !== "") {
        a = a.filter(x => 
            String(x.np).toLowerCase().includes(qStr) ||
            String(x.nn).toLowerCase().includes(qStr) ||
            String(x.n).toLowerCase().includes(qStr)
        );
    }

    Object.keys(invColumnFilters).forEach(col => {
        let fStr = (invColumnFilters[col] || "").toLowerCase().trim();
        if (fStr !== "") {
            a = a.filter(x => String(x[col] ?? "").toLowerCase().includes(fStr));
        }
    });

    if(a.length===0){ h += "<tr><td colspan='13' style='text-align:center;'>No matching inventory.</td></tr>"; }
    else {
        a.sort((x,y) => {
            let u = x[currentInvSort.column]; let v = y[currentInvSort.column];
            if (typeof u === 'number' && typeof v === 'number') return currentInvSort.direction === 'asc' ? u - v : v - u;
            u = (u||"").toString().toLowerCase(); v = (v||"").toString().toLowerCase();
            if(u<v) return currentInvSort.direction==='asc'?-1:1;
            if(u>v) return currentInvSort.direction==='asc'?1:-1;
            return 0;
        });
        a.forEach(x => { 
            let vel = window.calculateTrailingVelocity(x.k, 30);
            let dynamicROP = window.calculateDynamicROP(vel, x.ld);
            let finalTarget = Math.max(x.ms, dynamicROP);
            
            let isLow = finalTarget > 0 && x.s <= finalTarget; 
            let sc = x.s<0 ? 'negative-stock' : (isLow ? 'low-stock' : 'highlight-calc'); 
            let sk = String(x.k).replace(/'/g, "\\'").replace(/"/g, '&quot;'); 
            
            let ropPill = (dynamicROP > 0 && isLow) ? `<span style="background:#ef4444; color:#fff; border-radius:12px; font-size:10px; padding:1px 6px; font-weight:bold; margin-left:8px; animation: ropPulse 1.5s infinite;">🚨 ROP: ${dynamicROP.toFixed(1).replace(/\.?0+$/,'')} (Lead: ${x.ld}d)</span>` : '';
            
            h += `<tr>
                <td tabindex="0" class="trunc-col" style="font-weight:bold; color:#0ea5e9;">${x.np}</td>
                <td tabindex="0" class="trunc-col" style="font-weight:bold; color:var(--text-heading);">${x.nn} ${ropPill}</td>
                <td tabindex="0" class="trunc-col" style="font-weight:bold; color:#64748b;">${x.n}</td>
                <td class="text-right">${x.p.toFixed(2).replace(/\.?0+$/,'')}</td>
                <td class="text-right editable" style="color:#ef4444;" contenteditable="true" data-app-focus="storeOldValInv" data-app-blur="handleInvEdit" data-key="${sk}" data-p="${x.p}" data-c="${x.c}" data-a="${x.a}" data-sq="${x.sq}" data-mode="consumed_qty">${x.c.toFixed(2).replace(/\.?0+$/,'')}</td>
                <td class="text-right editable" style="color:#8b5cf6;" contenteditable="true" data-app-focus="storeOldValInv" data-app-blur="handleInvEdit" data-key="${sk}" data-p="${x.p}" data-c="${x.c}" data-a="${x.a}" data-sq="${x.sq}" data-mode="prototype_consumed_qty">${x.pc.toFixed(2).replace(/\.?0+$/,'')}</td>
                <td class="text-right editable" style="color:#3b82f6;" contenteditable="true" data-app-focus="storeOldValInv" data-app-blur="handleInvEdit" data-key="${sk}" data-p="${x.p}" data-c="${x.c}" data-a="${x.a}" data-sq="${x.sq}" data-mode="production_consumed_qty">${x.prc.toFixed(2).replace(/\.?0+$/,'')}</td>
                <td class="text-right editable" style="color:#b91c1c;" contenteditable="true" data-app-focus="storeOldValInv" data-app-blur="handleInvEdit" data-key="${sk}" data-p="${x.p}" data-c="${x.c}" data-a="${x.a}" data-sq="${x.sq}" data-mode="scrap_qty">${x.sq.toFixed(2).replace(/\.?0+$/,'')}</td>
                <td class="text-right editable" style="color:#0ea5e9;" contenteditable="true" data-app-focus="storeOldValInv" data-app-blur="handleInvEdit" data-key="${sk}" data-p="${x.p}" data-c="${x.c}" data-a="${x.a}" data-sq="${x.sq}" data-mode="manual_adjustment">${x.a!==0?(x.a>0?'+':'')+x.a.toFixed(2).replace(/\.?0+$/,''):'0'}</td>
                <td class="text-right editable" style="color:#f97316;" contenteditable="true" data-app-focus="storeOldValInv" data-app-blur="handleInvEdit" data-key="${sk}" data-p="${x.p}" data-c="${x.c}" data-a="${x.a}" data-sq="${x.sq}" data-mode="min_stock">${x.ms.toFixed(2).replace(/\.?0+$/,'')}</td>
                <td class="text-right editable" style="color:#14b8a6;" contenteditable="true" data-app-focus="storeOldValInv" data-app-blur="handleInvEdit" data-key="${sk}" data-p="${x.p}" data-c="${x.c}" data-a="${x.a}" data-sq="${x.sq}" data-mode="rop_lead_time_days">${x.ld}</td>
                <td class="text-right editable ${sc}" contenteditable="true" data-app-focus="storeOldValInv" data-app-blur="handleInvEdit" data-key="${sk}" data-p="${x.p}" data-c="${x.c}" data-a="${x.a}" data-sq="${x.sq}" data-mode="stock">${x.s.toFixed(2).replace(/\.?0+$/,'')}</td>
                <td class="text-right" style="font-weight:bold; color:#10b981;">$${x.tp.toFixed(2)}</td>
            </tr>`;
        });
    }
    wrap.innerHTML = window.safeHTML(h + `</tbody></table>`);
    applyTableInteractivity('invTableWrap');
    if (focusCol) {
        let inp = wrap.querySelector(`input[data-col="${focusCol}"]`);
        if (inp) {
            inp.focus();
            inp.setSelectionRange(inp.value.length, inp.value.length);
        }
    }
}

async function handleInvEdit(cell, key, p, c, a, sq, mode) {
    try { 
        let rKey = key.replace(/"/g, '"').replace(/\\'/g, "'"); let v = parseFloat(cell.innerText.replace(/[^0-9.-]+/g,"")); 
        if(isNaN(v)) { cell.innerText = oldValTemp; return alert("Valid number required."); } 
        
        if(!inventoryDB[rKey]) inventoryDB[rKey] = {consumed_qty:0, manual_adjustment:0, produced_qty:0, sold_qty:0, min_stock:0, scrap_qty:0, prototype_consumed_qty:0, assembly_consumed_qty:0, production_consumed_qty:0, prototype_produced_qty:0, rop_lead_time_days:5};
        let payload = { item_key: rKey, consumed_qty: inventoryDB[rKey].consumed_qty, manual_adjustment: inventoryDB[rKey].manual_adjustment, produced_qty: inventoryDB[rKey].produced_qty, sold_qty: inventoryDB[rKey].sold_qty, min_stock: inventoryDB[rKey].min_stock, scrap_qty: inventoryDB[rKey].scrap_qty, prototype_consumed_qty: inventoryDB[rKey].prototype_consumed_qty||0, assembly_consumed_qty: inventoryDB[rKey].assembly_consumed_qty||0, production_consumed_qty: inventoryDB[rKey].production_consumed_qty||0, prototype_produced_qty: inventoryDB[rKey].prototype_produced_qty||0, rop_lead_time_days: parseFloat(inventoryDB[rKey].rop_lead_time_days)||5 };
        
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
        else if(mode === 'rop_lead_time_days') { payload.rop_lead_time_days = Math.abs(v); if(payload.rop_lead_time_days === (parseFloat(inventoryDB[rKey].rop_lead_time_days)||5)) return; }

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

window.resetInventoryConsumptionLocally = async function() {
    inventoryDB = {};
    if (typeof window.renderInventoryTable === 'function') window.renderInventoryTable();
    if (typeof window.updateCcMngrStock === 'function') window.updateCcMngrStock();
};

window.resetInventoryConsumption = async function() {
    if (!confirm("⚠️ WARNING: This will completely WIPE all inventory and FGI quantities to 0. Are you absolutely sure?")) return;
    try {
        setSysProgress(30, 'working');
        sysLog("Resetting all inventory consumption to zero...");
        
        const { error: delErr } = await supabaseClient
            .from('inventory_consumption')
            .delete()
            .neq('item_key', 'system_lock_preventer'); // "delete all" hack
            
        if (delErr) throw delErr;
        
        await window.resetInventoryConsumptionLocally();
        
        setSysProgress(100, 'success');
        sysLog("Inventory completely reset.");
        showToast("✅ All stock levels have been wiped.");
        setTimeout(() => setSysProgress(0, 'working'), 3000);
    } catch(e) {
        setSysProgress(100, 'error');
        sysLog("Reset error: " + e.message, true);
        showToast("Reset Error: " + e.message, 'error');
    }
};

/**
 * Creates a global snapshot of the entire inventory_consumption table.
 * @param {string} name - User-provided name for the snapshot.
 */
window.createInventorySnapshot = async function(name) {
    try {
        if (!name) name = "Manual Snapshot " + new Date().toLocaleString();
        sysLog(`Creating Snapshot: ${name}...`);
        setSysProgress(20, 'working');

        // 1. Fetch current live state
        const { data, error: fetchErr } = await supabaseClient
            .from('inventory_consumption')
            .select('*');
        
        if (fetchErr) throw fetchErr;
        setSysProgress(50, 'working');

        // 2. Insert into snapshots table
        const { error: insertErr } = await supabaseClient
            .from('inventory_snapshots')
            .insert([{
                name: name,
                snapshot_data: data,
                created_by: 'user' // Could be updated with auth context
            }]);

        if (insertErr) throw insertErr;

        setSysProgress(100, 'success');
        sysLog(`Snapshot "${name}" saved.`);
        showToast(`Snapshot "${name}" saved successfully.`, 'success');
        setTimeout(() => setSysProgress(0, 'working'), 3000);
        
        if (window.fetchInventorySnapshots) window.fetchInventorySnapshots(); // Refresh list
    } catch (e) {
        setSysProgress(100, 'error');
        sysLog(`Snapshot Error: ${e.message}`, true);
        showToast(`Snapshot Error: ${e.message}`, 'error');
    }
};

/**
 * Restores the entire inventory state from a specific snapshot.
 * WARNING: This is destructive to current live data.
 * @param {string} snapshotId - The UUID of the snapshot to restore.
 */
window.restoreInventorySnapshot = async function(snapshotId) {
    try {
        if (!confirm("🚨 WARNING: This will DELETE all current stock levels and REVERT to this snapshot. Proceed?")) return;
        
        sysLog("Restoring Inventory Snapshot...");
        setSysProgress(10, 'working');

        // 1. Fetch the snapshot data
        const { data: snapshot, error: fetchErr } = await supabaseClient
            .from('inventory_snapshots')
            .select('snapshot_data, name')
            .eq('id', snapshotId)
            .single();
        
        if (fetchErr) throw fetchErr;
        if (!snapshot || !snapshot.snapshot_data) throw new Error("Snapshot data missing.");
        setSysProgress(30, 'working');

        // 2. Delete current live state
        const { error: delErr } = await supabaseClient
            .from('inventory_consumption')
            .delete()
            .neq('item_key', 'system_lock_preventer'); // Standard "delete all" hack
        
        if (delErr) throw delErr;
        setSysProgress(60, 'working');

        // 3. Re-inject snapshot rows
        // Note: inventory_consumption has item_key as PK, so we use upsert to be safe, 
        // though we just deleted everything.
        const { error: insertErr } = await supabaseClient
            .from('inventory_consumption')
            .insert(snapshot.snapshot_data);

        if (insertErr) throw insertErr;
        setSysProgress(90, 'working');

        // 4. Update Local State & UI
        // Refresh the global inventoryDB object from Supabase
        if (window.resetInventoryConsumptionLocally) {
            await window.resetInventoryConsumptionLocally(); 
        } else {
            // Fallback: manually fetch if local reset helper is missing
            const { data: freshData } = await supabaseClient.from('inventory_consumption').select('*');
            inventoryDB = freshData.reduce((acc, row) => ({ ...acc, [row.item_key]: row }), {});
        }

        window.renderInventoryTable();
        window.updateCcMngrStock();
        
        setSysProgress(100, 'success');
        sysLog(`Restored to: ${snapshot.name}`);
        showToast(`Successfully restored to "${snapshot.name}"`, 'success');
        setTimeout(() => setSysProgress(0, 'working'), 3000);
        
        // Reset Preview Area
        const previewArea = document.getElementById('snapshotPreviewArea');
        const previewActions = document.getElementById('snapshotPreviewActions');
        if (previewArea) previewArea.innerHTML = window.safeHTML('<div style="height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; color:var(--text-muted); opacity:0.5;"><span style="font-size:48px;">✅</span><p>Restore Complete.</p></div>');
        if (previewActions) previewActions.style.display = 'none';

        // Close modal if open
        let modal = document.getElementById('snapshotManagerModal');
        if (modal) modal.style.display = 'none';

    } catch (e) {
        setSysProgress(100, 'error');
        sysLog(`Restore Error: ${e.message}`, true);
        showToast(`Restore Error: ${e.message}`, 'error');
    }
};

/**
 * Calculates and displays a visual diff between a snapshot and the current live state.
 * @param {string} snapshotId - UUID of the snapshot.
 */
window.previewInventorySnapshot = async function(snapshotId) {
    const previewArea = document.getElementById('snapshotPreviewArea');
    const previewActions = document.getElementById('snapshotPreviewActions');
    if (!previewArea) return;

    try {
        previewArea.innerHTML = window.safeHTML('<div style="padding:40px; text-align:center; color:var(--text-muted);">Analyzing stock impact...</div>');
        previewActions.style.display = 'none';

        // 1. Fetch Snapshot & Current Live Data in parallel
        const [snapshotRes, currentRes] = await Promise.all([
            supabaseClient.from('inventory_snapshots').select('id, snapshot_data, name').eq('id', snapshotId).single(),
            supabaseClient.from('inventory_consumption').select('*')
        ]);

        if (snapshotRes.error) throw snapshotRes.error;
        if (currentRes.error) throw currentRes.error;

        const snapData = snapshotRes.data.snapshot_data || [];
        const liveData = currentRes.data || [];
        
        // 2. Index live data for fast lookup
        const liveMap = {};
        liveData.forEach(row => { liveMap[row.item_key] = row; });

        const calculateNet = (r) => {
            if (!r) return 0;
            const pos = (parseFloat(r.produced_qty) || 0) + (parseFloat(r.prototype_produced_qty) || 0) + (parseFloat(r.manual_adjustment) || 0);
            const neg = (parseFloat(r.sold_qty) || 0) + (parseFloat(r.consumed_qty) || 0) + (parseFloat(r.scrap_qty) || 0) + (parseFloat(r.assembly_consumed_qty) || 0) + (parseFloat(r.production_consumed_qty) || 0) + (parseFloat(r.prototype_consumed_qty) || 0);
            return pos - neg;
        };

        // 3. Compare and build delta list
        const deltas = [];
        const allKeys = new Set([...snapData.map(r => r.item_key), ...Object.keys(liveMap)]);

        allKeys.forEach(key => {
            const s = snapData.find(r => r.item_key === key);
            const l = liveMap[key];

            const sNet = calculateNet(s);
            const lNet = calculateNet(l);

            if (sNet !== lNet || !s || !l) {
                deltas.push({
                    key,
                    name: s ? s.item_key : l.item_key,
                    current: lNet,
                    target: sNet,
                    diff: sNet - lNet,
                    status: !l ? 'NEW' : (!s ? 'REMOVED' : 'CHANGED')
                });
            }
        });

        // 4. Render Delta Table
        if (deltas.length === 0) {
            previewArea.innerHTML = window.safeHTML(`
                <div style="height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; color:#10b981; gap:10px;">
                    <span style="font-size:32px;">🎯</span>
                    <p>Current stock matches snapshot exactly. No changes required.</p>
                </div>`);
            return;
        }

        let html = `
            <div style="padding-bottom:15px; border-bottom:1px solid rgba(255,255,255,0.05); margin-bottom:15px; display:flex; align-items:center; justify-content:space-between;">
                <span style="font-size:12px; font-weight:bold; color:#f59e0b;">📦 ${deltas.length} Items Impacted</span>
                <span style="font-size:10px; color:var(--text-muted);">Visualizing Delta for: <strong>${snapshotRes.data.name}</strong></span>
            </div>
            <table style="width:100%; border-collapse:collapse; font-family:'JetBrains Mono', monospace; font-size:12px;">
                <thead>
                    <tr style="text-align:left; color:var(--text-muted); border-bottom:1px solid rgba(255,255,255,0.1);">
                        <th style="padding:10px;">ITEM IDENTITY</th>
                        <th style="padding:10px; text-align:right;">LIVE STOCK</th>
                        <th style="padding:10px; text-align:right;">SNAPSHOT</th>
                        <th style="padding:10px; text-align:right;">IMPACT</th>
                    </tr>
                </thead>
                <tbody>`;

        deltas.forEach(d => {
            const diffColor = d.diff > 0 ? '#10b981' : (d.diff < 0 ? '#ef4444' : 'var(--text-muted)');
            const diffPrefix = d.diff > 0 ? '+' : '';
            html += `
                <tr style="border-bottom:1px solid rgba(255,255,255,0.02); background:${d.status === 'CHANGED' ? 'transparent' : (d.status === 'NEW' ? 'rgba(16,185,129,0.05)' : 'rgba(239,68,68,0.05)')}">
                    <td style="padding:12px 10px; color:var(--text-main); font-weight:bold;">${d.name}</td>
                    <td style="padding:12px 10px; color:var(--text-muted); text-align:right;">${d.current}</td>
                    <td style="padding:12px 10px; color:#f59e0b; font-weight:bold; text-align:right;">${d.target}</td>
                    <td style="padding:12px 10px; color:${diffColor}; font-weight:bold; text-align:right;">${diffPrefix}${d.diff}</td>
                </tr>`;
        });

        html += `</tbody></table>`;
        previewArea.innerHTML = window.safeHTML(html);

        // 5. Setup Action Buttons
        previewActions.style.display = 'flex';
        const commitBtn = document.getElementById('snapshotConfirmRestoreBtn');
        if (commitBtn) {
            commitBtn.onclick = () => window.restoreInventorySnapshot(snapshotId);
        }

    } catch (e) {
        previewArea.innerHTML = window.safeHTML(`<div style="padding:40px; text-align:center; color:#ef4444;">Preview Error: ${e.message}</div>`);
    }
};

/**
 * Fetches the list of available snapshots for the UI.
 */
window.fetchInventorySnapshots = async function() {
    try {
        const { data, error } = await supabaseClient
            .from('inventory_snapshots')
            .select('id, created_at, name')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        const listWrap = document.getElementById('snapshotListItems');
        if (!listWrap) return;

        if (!data || data.length === 0) {
            listWrap.innerHTML = window.safeHTML('<div style="padding:20px; color:var(--text-muted); text-align:center;">No snapshots found.</div>');
            return;
        }

        listWrap.innerHTML = window.safeHTML(data.map(s => `
            <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.1); border-radius:8px; padding:12px 15px; display:flex; justify-content:space-between; align-items:center; transition:0.2s hover; margin-bottom:8px; min-width: 0;">
                <div style="display:flex; flex-direction:column; gap:2px; flex:1; min-width: 0; margin-right: 15px;">
                    <span style="font-weight:bold; color:var(--text-main); font-size:13px; line-height:1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${s.name}">${s.name}</span>
                    <span style="font-size:10px; color:var(--text-muted);">${new Date(s.created_at).toLocaleString()}</span>
                </div>
                <div style="display:flex; gap:6px; flex-shrink: 0;">
                    <button class="btn-amber" style="padding:4px 10px; font-size:10px; height:28px; line-height:1; display:flex; align-items:center;" data-app-click="previewSnapshot" data-id="${s.id}">🔬 PREVIEW</button>
                    <button class="btn-red" style="padding:4px 8px; font-size:10px; background:rgba(239,68,68,0.1); border:1px solid rgba(239,68,68,0.3); height:28px;" data-app-click="deleteSnapshot" data-id="${s.id}">✕</button>
                </div>
            </div>
        `).join(''));

    } catch (e) {
        console.error("Snapshot Fetch Error:", e);
    }
};

/**
 * Deletes a specific snapshot.
 */
window.deleteInventorySnapshot = async function(id) {
    try {
        if (!confirm("Are you sure you want to permanently delete this snapshot?")) return;
        const { error } = await supabaseClient.from('inventory_snapshots').delete().eq('id', id);
        if (error) throw error;
        showToast("Snapshot deleted.", 'success');
        window.fetchInventorySnapshots();
    } catch (e) {
        showToast("Delete failed: " + e.message, 'error');
    }
};

window.openSnapshotManager = function() {
    const modal = document.getElementById('snapshotManagerModal');
    if (modal) {
        modal.style.display = 'flex';
        const leftPane = document.getElementById('snapshotLeftPane');
        const savedWidth = localStorage.getItem('neoSnapshotLeftWidth');
        if (leftPane && savedWidth) leftPane.style.width = savedWidth;
        window.fetchInventorySnapshots();
    }
};

window.closeSnapshotManager = function() {
    const modal = document.getElementById('snapshotManagerModal');
    if (modal) modal.style.display = 'none';
};

/**
 * Standard Neogleamz Resizer Logic for the Dashboard.
 */
window.initSnapshotDashboardResize = function(e) {
    const resizer = document.getElementById('snapshotDashboardResizer');
    const leftPane = document.getElementById('snapshotLeftPane');
    if (!resizer || !leftPane) return;

    let startX = e.clientX;
    let startWidth = leftPane.getBoundingClientRect().width;
    document.body.style.cursor = 'col-resize';
    resizer.classList.add('dragging');

    function onSnapshotMouseMove(e) {
        const delta = e.clientX - startX;
        let newWidth = startWidth + delta;
        
        // Boundaries
        if (newWidth < 300) newWidth = 300;
        if (newWidth > window.innerWidth - 400) newWidth = window.innerWidth - 400;

        leftPane.style.width = newWidth + 'px';
    }

    function onSnapshotMouseUp() {
        document.body.style.cursor = '';
        resizer.classList.remove('dragging');
        localStorage.setItem('neoSnapshotLeftWidth', leftPane.style.width);
        document.removeEventListener('mousemove', onSnapshotMouseMove);
        document.removeEventListener('mouseup', onSnapshotMouseUp);
    }

    document.addEventListener('mousemove', onSnapshotMouseMove);
    document.addEventListener('mouseup', onSnapshotMouseUp);
};

window.handleCreateSnapshot = function() {
    const input = document.getElementById('snapshotNameInput');
    const name = input ? input.value.trim() : "";
    if (!name) {
        showToast("Please enter a name for the snapshot.", 'error');
        return;
    }
    window.createInventorySnapshot(name);
    if (input) input.value = "";
};

window.printReorderReport = function() {
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
                    
                    // unused
                    if (isProd) {
                        let s = subK.replace('RECIPE:::', '');
                        let is3D = !!(productsDB[s] && productsDB[s].is_3d_print);
                        let isSub = !!isSubassemblyDB[s];
                        let icn = is3D ? "🖨️ " : (isSub ? "⚙️ " : "📦 ");
                        displayName = icn + s;
                        thtml += `<li style='margin:5px 0; font-size:14px; display:flex; align-items:flex-start; gap:8px;'><span style='width:12px; flex-shrink:0; font-size:18px; color:#cbd5e1; line-height:1; margin-top:-2px;'>⌞</span><div style="flex:1;"><strong>${displayName}</strong> <span style="color:#64748b; font-size:12px;">(Req: ${totalReq.toFixed(2).replace(/\.?0+$/,'')} | On Hand: ${stock.toFixed(2).replace(/\.?0+$/,'')})</span> ${statStr}`;
                        if (!ok) thtml += buildTree(s, totalReq - stock);
                        thtml += `</li>`;
                    } else {
                        let c = catalogCache[subK];
                        displayName = c ? (c.neoName || c.itemName) : subK;
                        thtml += `<li style='margin:5px 0; font-size:14px; display:flex; align-items:flex-start; gap:8px;'><span style='width:12px; flex-shrink:0; font-size:18px; color:#cbd5e1; line-height:1; margin-top:-2px;'>⌞</span><div style="flex:1;">🧵 <strong>${displayName}</strong> <span style="color:#64748b; font-size:12px;">(Req: ${totalReq.toFixed(2).replace(/\.?0+$/,'')} | On Hand: ${stock.toFixed(2).replace(/\.?0+$/,'')})</span> ${statStr}</div></li>`;
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
            let c = catalogCache[k] || {}; let _f = fmtKey(k); let i = inventoryDB[k] || {};
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
        tbody.innerHTML = window.safeHTML(
            '<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 15px;">No FGI history found.</td></tr>');
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
                       data-app-input="forecast" data-item="${pName.replace(/'/g, "&apos;")}" 
                       style="width: 70px; text-align: right; background: var(--bg-input); border: 1px solid #f59e0b; color: #f59e0b; font-weight: bold; padding: 4px;">
            </td>
        </tr>`;
    });
    
    tbody.innerHTML = window.safeHTML(html);
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
        // unused
        
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

    outContainer.innerHTML = window.safeHTML(html);
};

// ========================================================
// REMOTE MOBILE BARCODE SCANNER BRIDGE
// ========================================================
window.ccSyncChannel = null;
window.ccSessionId = null;
let currentPreviewMode = 'phone'; // phone | pc | both
let currentScanKey = null;
let currentScanIsFgi = false;

window.initializeCcSyncChannel = function() {
    if (!window.ccSessionId) {
        window.ccSessionId = (window.currentUser ? window.currentUser.id : 'guest') + '-cc-' + Math.random().toString(36).substring(2, 6);
    }
    
    if (window.ccSyncChannel) return;

    const channelName = `neogleamz-cc-sync-${window.ccSessionId}`;
    sysLog(`[Realtime Scanner] Spawning channel sync on: ${channelName}`);
    
    if (typeof supabaseClient === 'undefined') {
        sysLog(`[Realtime Scanner] Error: Supabase client is not initialized yet.`, true);
        return;
    }

    window.ccSyncChannel = supabaseClient.channel(channelName);

    // Listen for mobile scanner connecting
    window.ccSyncChannel.on('broadcast', { event: 'MOBILE_CONNECT' }, () => {
        sysLog(`[Realtime Scanner] Mobile client handshake ping received. Transmitting auth tokens...`);
        
        // Retrieve dynamic session token for secure phone storage RLS authorization
        let sessionToken = '';
        let refreshToken = '';
        try {
            const session = supabaseClient.auth.session ? supabaseClient.auth.session() : null;
            if (session) {
                sessionToken = session.access_token;
                refreshToken = session.refresh_token;
            } else {
                supabaseClient.auth.getSession().then(({ data }) => {
                    if (data && data.session) {
                        window.ccSyncChannel.send({
                            type: 'broadcast',
                            event: 'SESSION_TRANSFER',
                            payload: {
                                accessToken: data.session.access_token,
                                refreshToken: data.session.refresh_token || ''
                            }
                        }).catch(() => {});
                    }
                });
            }
        } catch (e) { console.warn(e); }

        if (sessionToken) {
            window.ccSyncChannel.send({
                type: 'broadcast',
                event: 'SESSION_TRANSFER',
                payload: {
                    accessToken: sessionToken,
                    refreshToken: refreshToken
                }
            }).catch(err => {
                sysLog(`[Realtime Scanner] SESSION_TRANSFER send failed: ${err.message}`, true);
            });
        }

        // Update UI states to connected
        const statusCheck = document.getElementById('ccMobileBridgeStatus');
        const statusIndicator = document.getElementById('ccScannerStatusIndicator');
        const qrContainer = document.getElementById('ccScannerQRContainer');
        const screenContainer = document.getElementById('ccRemotePreviewScreenContainer');
        const routeBar = document.getElementById('pcRouteBar');
        
        if (statusCheck) statusCheck.innerHTML = '🟢 📱 Phone Connected | Stream Active';
        if (statusIndicator) {
            statusIndicator.style.background = '#10b981';
            statusIndicator.style.boxShadow = '0 0 10px #10b981';
        }
        if (qrContainer) qrContainer.style.display = 'none';
        if (screenContainer) screenContainer.style.display = 'flex';
        if (routeBar) routeBar.style.display = 'flex';
        
        window.updateCCRouteUI(currentPreviewMode);
        
        // Broadcast the serialized grouped item dropdown directory list to the phone cockpit
        const select = document.getElementById('ccMngrItemSelect');
        const items = [];
        if (select) {
            for (let i = 0; i < select.options.length; i++) {
                const opt = select.options[i];
                if (opt.value) {
                    items.push({ value: opt.value, text: opt.text });
                }
            }
        }
        window.ccSyncChannel.send({
            type: 'broadcast',
            event: 'ITEM_DIRECTORY',
            payload: { items: items }
        }).catch(() => {});
        
        // Push initial stock balances in case an item is already selected
        window.updateCcMngrStock();
    });

    // Listen for phone-side frame stream broadcasts
    window.ccSyncChannel.on('broadcast', { event: 'REMOTE_FRAME_STREAM' }, (envelope) => {
        const payload = envelope.payload;
        if (payload && payload.frame) {
            const screen = document.getElementById('ccRemotePreviewScreen');
            if (screen) screen.src = payload.frame;
        }
    });

    // Listen for phone-side mode switcher updates
    window.ccSyncChannel.on('broadcast', { event: 'MOBILE_PREVIEW_MODE_CHANGED' }, (envelope) => {
        const payload = envelope.payload;
        if (payload && payload.mode) {
            currentPreviewMode = payload.mode;
            window.updateCCRouteUI(currentPreviewMode);
        }
    });

    // Listen for instantaneous phone barcode scan decodes
    window.ccSyncChannel.on('broadcast', { event: 'REMOTE_BARCODE_SCAN' }, (envelope) => {
        const payload = envelope.payload;
        if (payload && payload.barcode) {
            sysLog(`[Realtime Scanner] Received remote scan lock: ${payload.barcode}`);
            window.onScanSuccess(payload.barcode);
        }
    });

    // Listen for phone discard trigger
    window.ccSyncChannel.on('broadcast', { event: 'MOBILE_DISCARD_AND_BACK' }, () => {
        sysLog(`[Realtime Scanner] Mobile shutter clicked Discard`);
        window.stopCycleCount();
        window.closeCycleCountManager();
    });

    // Listen for phone-side item dropdown selection changes
    window.ccSyncChannel.on('broadcast', { event: 'MOBILE_ITEM_SELECTED' }, (envelope) => {
        const payload = envelope.payload;
        if (payload && typeof payload.value !== 'undefined') {
            const select = document.getElementById('ccMngrItemSelect');
            if (select) {
                select.value = payload.value;
                window.updateCcMngrStock();
            }
        }
    });

    // Listen for mobile cockpit counts saving (supporting both Next and Close)
    window.ccSyncChannel.on('broadcast', { event: 'MOBILE_SAVE_COUNT' }, async (envelope) => {
        const payload = envelope.payload;
        if (payload && typeof payload.value !== 'undefined' && typeof payload.qty !== 'undefined') {
            const select = document.getElementById('ccMngrItemSelect');
            const qtyInput = document.getElementById('ccMngrQtyInput');
            if (select && qtyInput) {
                select.value = payload.value;
                qtyInput.value = payload.qty;
                
                // Execute the native PC save manual cycle count logic!
                await window.saveManualCycleCount();
                
                if (payload.close) {
                    window.closeCycleCountManager();
                }
            }
        }
    });

    window.ccSyncChannel.subscribe((status) => {
        sysLog(`[Realtime Scanner] Channel subscription: ${status}`);
    });
};

let ccLocalQrScanner = null;

window.startLocalCycleCount = async function() {
    // 1. Stop any active cycle counts cleanly (both local webcam and remote socket)
    await window.stopCycleCount();
    
    // 2. Open inlineCycleScannerCard
    let card = document.getElementById('inlineCycleScannerCard');
    if (card) card.style.display = 'flex';
    
    // 3. Set header title
    const headerTitle = document.getElementById('ccScannerHeaderTitle');
    if (headerTitle) headerTitle.innerText = "📷 LOCAL CYCLE SCANNER";
    
    // 4. Toggle visibility of local vs remote areas
    const localArea = document.getElementById('ccLocalScannerArea');
    const remoteArea = document.getElementById('ccRemoteScannerArea');
    if (localArea) localArea.style.display = 'flex';
    if (remoteArea) remoteArea.style.display = 'none';
    
    // 5. Pull context from the Cycle Count Manager dropdown
    let selectEl = document.getElementById('ccMngrItemSelect');
    let titleEl = document.getElementById('inlineScannerItemName');
    let subtitleEl = document.getElementById('inlineScannerExpected');
    
    if (selectEl && selectEl.value) {
        let selectedOption = selectEl.options[selectEl.selectedIndex];
        titleEl.innerText = "VERIFYING TARGET:";
        titleEl.style.color = "#f59e0b"; // Orange matching the PC webcam style
        subtitleEl.innerText = selectedOption.text;
    } else {
        titleEl.innerText = "Scan Any Item";
        titleEl.style.color = "white";
        subtitleEl.innerText = "No target filter applied";
    }

    // 6. Initialize local HTML5-QRCode instance
    const readerEl = document.getElementById("barcode-reader");
    if (readerEl) readerEl.innerHTML = window.safeHTML('');
    
    try {
        if (typeof Html5Qrcode === 'undefined') {
            throw new Error("Html5Qrcode engine is not loaded in window.");
        }
        
        ccLocalQrScanner = new Html5Qrcode("barcode-reader");
        
        // Fetch available camera devices to populate dropdown
        const devices = await Html5Qrcode.getCameras();
        const selectContainer = document.getElementById('ccLocalDeviceSelectContainer');
        const selectBox = document.getElementById('ccLocalDeviceSelect');
        
        if (devices && devices.length > 0 && selectBox && selectContainer) {
            selectBox.innerHTML = '';
            devices.forEach(device => {
                const opt = document.createElement('option');
                opt.value = device.id;
                opt.text = device.label || `Camera ${selectBox.options.length + 1}`;
                selectBox.appendChild(opt);
            });
            selectContainer.style.display = 'flex';
            
            // Start streaming with the first listed device
            await window.startLocalScannerWithDevice(devices[0].id);
        } else {
            // Fallback starting with default environment constraint
            if (selectContainer) selectContainer.style.display = 'none';
            await ccLocalQrScanner.start(
                { facingMode: "environment" },
                { fps: 12, qrbox: { width: 220, height: 220 }, aspectRatio: 1.0 },
                (decodedText) => {
                    window.onScanSuccess(decodedText);
                },
                () => {}
            );
        }
        
        // Update connection pulse indicator to active orange for local webcam
        const statusIndicator = document.getElementById('ccScannerStatusIndicator');
        if (statusIndicator) {
            statusIndicator.style.background = '#f59e0b';
            statusIndicator.style.boxShadow = '0 0 10px #f59e0b';
        }
    } catch(err) {
        sysLog(`Local Webcam initialization error: ${err.message || err}`, true);
        alert("Webcam error: " + (err.message || err));
        await window.stopCycleCount();
    }
};

window.startLocalScannerWithDevice = async function(deviceId) {
    if (!ccLocalQrScanner) return;
    try {
        if (ccLocalQrScanner.getState() === 2) { // 2 = SCANNING
            await ccLocalQrScanner.stop();
        }
        await ccLocalQrScanner.start(
            deviceId,
            { fps: 12, qrbox: { width: 220, height: 220 }, aspectRatio: 1.0 },
            (decodedText) => {
                window.onScanSuccess(decodedText);
            },
            () => {}
        );
    } catch(err) {
        sysLog(`Local Webcam device start error: ${err.message || err}`, true);
    }
};

window.change_handleCCLocalDeviceChange = function(event) {
    if (event && event.target && event.target.value) {
        window.startLocalScannerWithDevice(event.target.value);
    }
};

window.startRemoteCycleCount = async function() {
    // 1. Stop any active cycle counts cleanly
    await window.stopCycleCount();
    
    // 2. Open inlineCycleScannerCard
    let card = document.getElementById('inlineCycleScannerCard');
    if(card) card.style.display = 'flex';
    
    // 3. Set header title
    const headerTitle = document.getElementById('ccScannerHeaderTitle');
    if (headerTitle) headerTitle.innerText = "📱 REMOTE CYCLE SCANNER";
    
    // 4. Toggle visibility of local vs remote areas
    const localArea = document.getElementById('ccLocalScannerArea');
    const remoteArea = document.getElementById('ccRemoteScannerArea');
    if (localArea) localArea.style.display = 'none';
    if (remoteArea) remoteArea.style.display = 'flex';
    
    // Toggle localhost IP override helper based on development environment
    const ipHelper = document.getElementById('ccLocalIPOverrideContainer');
    if (ipHelper) {
        const isLocalDev = window.location.hostname === 'localhost' || 
                           window.location.hostname === '127.0.0.1' || 
                           window.location.hostname.startsWith('192.168.') ||
                           window.location.hostname.startsWith('10.');
        ipHelper.style.display = isLocalDev ? 'flex' : 'none';
    }
    
    // 5. Pull context from the Cycle Count Manager dropdown
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

    // 6. Reset remote UI elements
    const statusCheck = document.getElementById('ccMobileBridgeStatus');
    const statusIndicator = document.getElementById('ccScannerStatusIndicator');
    const qrContainer = document.getElementById('ccScannerQRContainer');
    const screenContainer = document.getElementById('ccRemotePreviewScreenContainer');
    const routeBar = document.getElementById('pcRouteBar');
    
    if (statusCheck) statusCheck.innerHTML = '🔴 Waiting for Phone Connection...';
    if (statusIndicator) {
        statusIndicator.style.background = '#ef4444';
        statusIndicator.style.boxShadow = '0 0 10px #ef4444';
    }
    if (qrContainer) qrContainer.style.display = 'flex';
    if (screenContainer) screenContainer.style.display = 'none';
    if (routeBar) routeBar.style.display = 'none';

    // 7. Build unique Realtime sync bridge session
    window.initializeCcSyncChannel();

    // 8. Construct URL for remote phone portal
    const savedIP = localStorage.getItem('neogleamz_pc_local_ip');
    
    // Pre-populate Local IP input for CC
    const ipInput = document.getElementById('pcLocalIPInput_cc');
    if (ipInput) {
        ipInput.value = savedIP || '';
    }

    let host = window.location.host;
    if (savedIP) {
        const port = window.location.port ? `:${window.location.port}` : '';
        host = `${savedIP}${port}`;
    }
    const remoteUrl = `${window.location.protocol}//${host}/remote-scanner.html?session=${window.ccSessionId}`;
    sysLog(`[Realtime Scanner] Dynamic remote portal link: ${remoteUrl}`);

    // 9. Update the image source dynamically powered by api.qrserver.com to prevent canvas sizing race
    const qrImg = document.getElementById('ccScannerQRCodeImg');
    if (qrImg) {
        qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(remoteUrl)}`;
    }

    // 10. Broadcast wake-up event
    if (window.ccSyncChannel) {
        window.ccSyncChannel.httpSend('LAUNCH_MOBILE_SCANNER', {
            timestamp: Date.now()
        }).catch(() => {});
    }
};

window.click_updateLocalIPQRCode_cc = function() {
    const input = document.getElementById('pcLocalIPInput_cc');
    if (!input) return;
    
    let ip = input.value.trim();
    if (!ip) {
        localStorage.removeItem('neogleamz_pc_local_ip');
    } else {
        // Strip out protocol or port mapping to get clean IP/hostname
        ip = ip.replace(/^https?:\/\//i, '').split(':')[0].split('/')[0];
        localStorage.setItem('neogleamz_pc_local_ip', ip);
    }
    
    // Re-trigger Remote Mode logic to regenerate the QR code
    window.startRemoteCycleCount();
};

// Aliasing startCycleCount for backward compatibility
window.startCycleCount = window.startRemoteCycleCount;

window.stopCycleCount = async function() {
    // 1. Cleanly shutdown local HTML5-QRCode instance if active
    if (ccLocalQrScanner) {
        try {
            if (ccLocalQrScanner.getState() === 2) {
                await ccLocalQrScanner.stop();
            }
            ccLocalQrScanner.clear();
        } catch(err) {
            sysLog(`Local scanner shutdown warning: ${err.message || err}`, true);
        }
        ccLocalQrScanner = null;
    }
    const readerEl = document.getElementById("barcode-reader");
    if (readerEl) readerEl.innerHTML = window.safeHTML('');

    // 2. Unsubscribe cleanly from Supabase Realtime channel
    if (window.ccSyncChannel) {
        try {
            window.ccSyncChannel.send({
                type: 'broadcast',
                event: 'PC_DISCARD_AND_BACK',
                payload: { timestamp: Date.now() }
            }).catch(() => {});
            
            supabaseClient.removeChannel(window.ccSyncChannel);
        } catch (err) { console.warn(err); }
        window.ccSyncChannel = null;
    }
    window.ccSessionId = null;

    let card = document.getElementById('inlineCycleScannerCard');
    if(card) card.style.display = 'none';
};

window.onScanSuccess = function(decodedText) {
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

    let actualKey;
    let pName = decodedText.replace('RECIPE:::', '');
    
    // Validate barcode exists in system
    if(productsDB[pName]) {
        actualKey = `RECIPE:::${pName}`;
    } else if(catalogCache[decodedText] || (typeof isSubassemblyDB !== 'undefined' && isSubassemblyDB[pName])) {
        actualKey = decodedText;
    } else {
        sysLog(`Barcode Error: Not recognized - ${decodedText}`, true);
        alert("Barcode not recognized in system: " + decodedText);
        return;
    }
    
    // Auto-select the item in the Cycle Count Manager dropdown
    let selectEl = document.getElementById('ccMngrItemSelect');
    if (selectEl) {
        selectEl.value = actualKey;
        
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
    
    // Focus the actual manager quantity input field
    setTimeout(() => {
        let input = document.getElementById('ccMngrQtyInput');
        if(input) {
            input.focus();
            input.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, 100);
};

// Bidirectional Swapping route logic
window.updateCCRouteUI = function(mode) {
    const btnPhone = document.getElementById('pcRoutePhone');
    const btnPC = document.getElementById('pcRoutePC');
    const btnBoth = document.getElementById('pcRouteBoth');
    const screen = document.getElementById('ccRemotePreviewScreen');
    const placeholder = document.getElementById('ccPhoneOnlyPlaceholder');
    const statusCheck = document.getElementById('ccMobileBridgeStatus');

    if (!btnPhone) return;

    // Reset styles
    [btnPhone, btnPC, btnBoth].forEach(btn => {
        if (btn) {
            btn.style.background = 'none';
            btn.style.color = 'var(--text-muted)';
            btn.style.boxShadow = 'none';
        }
    });

    let activeBtn;
    let sub;
    if (mode === 'phone') {
        activeBtn = btnPhone;
        sub = 'Stream rendering on Phone only';
        if (screen) screen.style.display = 'none';
        if (placeholder) placeholder.style.display = 'flex';
    } else if (mode === 'pc') {
        activeBtn = btnPC;
        sub = 'Stream rendering on PC only';
        if (screen) screen.style.display = 'block';
        if (placeholder) placeholder.style.display = 'none';
    } else {
        activeBtn = btnBoth;
        sub = 'Stream rendering on Both screens';
        if (screen) screen.style.display = 'block';
        if (placeholder) placeholder.style.display = 'none';
    }

    if (activeBtn) {
        activeBtn.style.background = '#10b981';
        activeBtn.style.color = '#fff';
        activeBtn.style.boxShadow = '0 0 10px rgba(16,185,129,0.3)';
    }

    if (statusCheck) statusCheck.innerHTML = `🟢 📱 Phone Connected | ${sub}`;
};

window.click_setCCRoutePhone = function() {
    currentPreviewMode = 'phone';
    window.updateCCRouteUI(currentPreviewMode);
    if (window.ccSyncChannel) {
        window.ccSyncChannel.send({
            type: 'broadcast',
            event: 'PC_PREVIEW_MODE_CHANGED',
            payload: { mode: currentPreviewMode }
        }).catch(() => {});
    }
};

window.click_setCCRoutePC = function() {
    currentPreviewMode = 'pc';
    window.updateCCRouteUI(currentPreviewMode);
    if (window.ccSyncChannel) {
        window.ccSyncChannel.send({
            type: 'broadcast',
            event: 'PC_PREVIEW_MODE_CHANGED',
            payload: { mode: currentPreviewMode }
        }).catch(() => {});
    }
};

window.click_setCCRouteBoth = function() {
    currentPreviewMode = 'both';
    window.updateCCRouteUI(currentPreviewMode);
    if (window.ccSyncChannel) {
        window.ccSyncChannel.send({
            type: 'broadcast',
            event: 'PC_PREVIEW_MODE_CHANGED',
            payload: { mode: currentPreviewMode }
        }).catch(() => {});
    }
};

window.resumeCycleCount = function() {
    // compatibility stub
};

// ========================================================
// CYCLE COUNT MANAGER MODAL LOGIC
// ========================================================

window.filterCcMngrItems = function() {
    let term = document.getElementById('ccMngrSearch').value.toLowerCase().trim();
    let dropdown = document.getElementById('ccMngrDropdown');
    
    if(!window.cachedCcMngrOptions) return;
    
    if(term === '') {
        dropdown.innerHTML = window.safeHTML(window.cachedCcMngrOptions);
        dropdown.style.display = 'none';
        return;
    }
    
    dropdown.innerHTML = window.safeHTML(window.cachedCcMngrOptions);
    
    let items = dropdown.querySelectorAll('.cc-dropdown-item');
    items.forEach(o => {
        if(!o.innerText.toLowerCase().includes(term)) {
            o.remove();
        }
    });
    
    if(dropdown.querySelectorAll('.cc-dropdown-item').length > 0) {
        dropdown.style.display = 'block';
    } else {
        dropdown.innerHTML = window.safeHTML(
            '<div style="padding:10px; color:var(--text-muted); text-align:center;">No items found.</div>');
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
    
    let safeProductsDB = (typeof productsDB !== 'undefined') ? productsDB : (window.productsDB || {});
    let safeIsSubassemblyDB = (typeof isSubassemblyDB !== 'undefined') ? isSubassemblyDB : (window.isSubassemblyDB || {});
    let safeCatalogCache = (typeof catalogCache !== 'undefined') ? catalogCache : (window.catalogCache || {});

    let allProds = Object.keys(safeProductsDB).sort();
    let printProds = allProds.filter(p => safeProductsDB[p] && safeProductsDB[p].is_3d_print);
    let labelProds = allProds.filter(p => safeProductsDB[p] && safeProductsDB[p].is_label);
    
    let retailProds = allProds.filter(p => !safeIsSubassemblyDB[p] && !printProds.includes(p) && !labelProds.includes(p));
    let subProds = allProds.filter(p => safeIsSubassemblyDB[p] && !printProds.includes(p) && !labelProds.includes(p));
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
        return `<div class="cc-dropdown-item" style="padding:8px 10px; cursor:pointer; font-size:13px; border-bottom:1px solid var(--border-color);" class="cc-dropdown-item" data-app-click="selectCcItem" data-val="${safeVal}" data-txt="${safeTxt}">${txt}</div>`;
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
    let rawArr = Object.entries(safeCatalogCache).sort((a,b) => {
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
    
    document.getElementById('ccMngrDropdown').innerHTML = window.safeHTML(finalHtml);
    select.innerHTML = window.safeHTML(finalNativeHtml);
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
    
    let elL1 = document.getElementById('ccMngrL1'); let elV1 = document.getElementById('ccMngrV1');
    let elL2 = document.getElementById('ccMngrL2'); let elV2 = document.getElementById('ccMngrV2');
    let elL3 = document.getElementById('ccMngrL3'); let elV3 = document.getElementById('ccMngrV3');
    let elV4 = document.getElementById('ccMngrV4'); let elV5 = document.getElementById('ccMngrV5');
    
    if (!key) { 
        elL1.innerText = "PROD"; elV1.innerText = "—"; elV1.contentEditable = "false"; elV1.className = "";
        elL2.innerText = "PROTO"; elV2.innerText = "—"; elV2.parentElement.style.visibility = "visible";
        elL3.innerText = "CONS"; elV3.innerText = "—"; elV3.contentEditable = "false"; elV3.className = "";
        elV4.innerText = "—"; elV5.innerText = "—";
        valEl.innerText = "—"; valEl.style.color = '#f97316';
        display.style.display = 'flex';
        return; 
    }
    
    let rKey = key.replace(/"/g, '"').replace(/\\'/g, "'");
    let inv = inventoryDB[rKey] || {};
    let stock;
    
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
    
    // Realtime channel broadcast of the current stock balances back to the phone cockpit
    if (window.ccSyncChannel) {
        window.ccSyncChannel.send({
            type: 'broadcast',
            event: 'PC_STOCK_UPDATE',
            payload: {
                itemKey: key,
                netStock: key ? valEl.innerText : '—',
                prod: key ? elV1.innerText : '—',
                proto: key ? elV2.innerText : '—',
                cons: key ? elV3.innerText : '—',
                scrap: key ? elV4.innerText : '—',
                adj: key ? elV5.innerText : '—'
            }
        }).catch(() => {});
    }
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


// --- INVENTORY EVENT DELEGATION ---
document.addEventListener('focusin', (e) => {
    if (e.target.dataset.appFocus === 'storeOldValInv') {
        if(typeof storeOldVal === 'function') storeOldVal(e.target);
    }
});
document.addEventListener('focusout', (e) => {
    if (e.target.dataset.appBlur === 'handleInvEdit') {
        let d = e.target.dataset;
        if(typeof handleInvEdit === 'function') handleInvEdit(e.target, d.key, parseFloat(d.p)||0, parseFloat(d.c)||0, parseFloat(d.a)||0, parseFloat(d.sq)||0, d.mode);
    }
});
document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-app-click]');
    if (!btn) return;
    const action = btn.dataset.appClick;
    if (action === 'sortFgi') { if(typeof sortFGI === 'function') sortFGI(btn.dataset.cat, btn.dataset.col); }
    if (action === 'sortInv') { if(typeof sortInventory === 'function') sortInventory(btn.dataset.col); }
    if (action === 'toggleFgiCat') { if(typeof toggleFgiCategory === 'function') toggleFgiCategory(btn.dataset.cat); }
    if (action === 'selectCcItem') { if(typeof selectCcMngrItem === 'function') selectCcMngrItem(btn.dataset.val, btn.dataset.txt); }
    if (action === 'previewSnapshot') { if(typeof window.previewInventorySnapshot === 'function') window.previewInventorySnapshot(btn.dataset.id); }
    if (action === 'deleteSnapshot') { if(typeof window.deleteInventorySnapshot === 'function') window.deleteInventorySnapshot(btn.dataset.id); }
});
document.addEventListener('input', (e) => {
    if (e.target.dataset.appInput === 'forecast') {
        if(typeof window.updateVelocityzForecast === 'function') window.updateVelocityzForecast(e.target.dataset.item, e.target.value);
    }
});
