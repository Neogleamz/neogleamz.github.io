/**
 * KPI Reports Module
 * Handles drilldown logic for Karban Dashboard KPIs
 */

window.openKPIReport = function(el) {
    const kpiId = el.getAttribute('data-kpi-id');
    const title = el.querySelector('span') ? el.querySelector('span').innerText : 'KPI Report';
    
    const modal = document.getElementById('kpiReportModal');
    const titleEl = document.getElementById('kpiReportTitle');
    const contentEl = document.getElementById('kpiReportContent');
    
    if (!modal || !titleEl || !contentEl) return;
    
    titleEl.innerText = title;
    contentEl.innerHTML = '<div style="text-align:center; padding: 40px; color: var(--text-muted);">Generating report...</div>';
    
    modal.style.display = 'flex';
    
    // Defer generation slightly to allow UI to render the modal
    setTimeout(() => {
        let html;
        try {
            switch(kpiId) {
                case 'statDatazRecords': html = window.generateReport_statDatazRecords(); break;
                case 'statDatazParcels': html = window.generateReport_statDatazParcels(); break;
                case 'statDatazPaid': html = window.generateReport_statDatazPaid(); break;
                case 'statDatazWt': html = window.generateReport_statDatazWt(); break;
                case 'statDatazTotalCost': html = window.generateReport_statDatazTotalCost(); break;
                
                case 'statEditzRetail': html = window.generateReport_statEditzRetail(); break;
                case 'statEditzPrints': html = window.generateReport_statEditzPrints(); break;
                case 'statEditzSubAssy': html = window.generateReport_statEditzSubAssy(); break;
                case 'statEditzRaw': html = window.generateReport_statEditzRaw(); break;
                case 'statEditzOrphan': html = window.generateReport_statEditzOrphan(); break;
                
                case 'statStockzUnits': html = window.generateReport_statStockzUnits(); break;
                case 'statStockzAlerts': html = window.generateReport_statStockzAlerts(); break;
                case 'statStockzFgiVal': html = window.generateReport_statStockzFgiVal(); break;
                case 'statStockzMaxYield': html = window.generateReport_statStockzMaxYield(); break;
                case 'statStockzRawCount': html = window.generateReport_statStockzRawCount(); break;

                case 'statRevenuezGross': html = window.generateReport_statRevenuezGross(); break;
                case 'statRevenuezNet': html = window.generateReport_statRevenuezNet(); break;
                case 'statRevenuezRaw': html = window.generateReport_statRevenuezRaw(); break;
                case 'statRevenuezBuilt': html = window.generateReport_statRevenuezBuilt(); break;

                default: html = `<div style="text-align:center; padding: 40px; color: var(--text-muted);">Report drilldown for <strong>${title}</strong> is currently under construction.</div>`;
            }
        } catch(e) {
            html = `<div style="color: #ef4444; padding: 20px;">Error generating report: ${e.message}</div>`;
        }
        contentEl.innerHTML = window.safeHTML(html);
        
        // Initialize interactivity
        if (typeof window.initInteractiveKpiTable === 'function') window.initInteractiveKpiTable();
    }, 50);
};

window.initInteractiveKpiTable = function() {
    const container = document.getElementById('kpiReportContent');
    const table = container.querySelector('table');
    if (!table) return;

    // 1. Setup Resizable Columns via pure CSS injection if not present
    if (!document.getElementById('kpiTableStyles')) {
        const style = document.createElement('style');
        style.id = 'kpiTableStyles';
        style.innerHTML = `
            #kpiReportContent table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 13px; table-layout: fixed; }
            #kpiReportContent th { background: var(--bg-panel); color: var(--text-heading); font-weight: bold; text-align: left; padding: 8px; border: 1px solid var(--border-color); cursor: pointer; position: relative; user-select: none; resize: horizontal; overflow: hidden; }
            #kpiReportContent th:hover { background: var(--bg-input); }
            #kpiReportContent td { padding: 8px; border: 1px solid var(--border-color); color: var(--text-main); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
            #kpiReportContent tr:hover td { background: var(--bg-panel); }
            .kpi-search-box { width: 100%; padding: 10px 15px; margin-bottom: 15px; background: var(--bg-input); border: 1px solid var(--border-input); border-radius: 6px; color: var(--text-main); font-size: 14px; }
            .kpi-search-box:focus { border-color: var(--brand); outline: none; box-shadow: 0 0 0 2px rgba(168,85,247,0.2); }
        `;
        document.head.appendChild(style);
    }

    // 2. Setup Search Box
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.className = 'kpi-search-box';
    searchInput.placeholder = '🔍 Search this report...';
    container.insertBefore(searchInput, table);

    const tbody = table.querySelector('tbody');
    const rows = Array.from(tbody.querySelectorAll('tr'));
    
    searchInput.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        rows.forEach(row => {
            const text = row.innerText.toLowerCase();
            row.style.display = text.includes(term) ? '' : 'none';
        });
    });

    // 3. Setup Sorting
    const headers = table.querySelectorAll('th');
    headers.forEach((th, index) => {
        th.addEventListener('click', () => {
            const isAscending = th.classList.contains('sort-asc');
            headers.forEach(h => { h.classList.remove('sort-asc', 'sort-desc'); h.innerText = h.innerText.replace(/ [▼▲]$/, ''); });
            
            th.classList.toggle('sort-asc', !isAscending);
            th.classList.toggle('sort-desc', isAscending);
            th.innerText += isAscending ? ' ▼' : ' ▲';

            const sortedRows = rows.sort((a, b) => {
                const aCol = a.children[index].innerText.trim();
                const bCol = b.children[index].innerText.trim();
                
                // Try numeric sort
                const aNum = parseFloat(aCol.replace(/[^0-9.-]+/g,""));
                const bNum = parseFloat(bCol.replace(/[^0-9.-]+/g,""));
                
                if (!isNaN(aNum) && !isNaN(bNum) && aCol.match(/[0-9]/) && bCol.match(/[0-9]/)) {
                    return isAscending ? bNum - aNum : aNum - bNum;
                }
                return isAscending ? bCol.localeCompare(aCol) : aCol.localeCompare(bCol);
            });

            tbody.append(...sortedRows);
        });
    });
};

window.printKPIReport = function() {
    const titleEl = document.getElementById('kpiReportTitle');
    const contentEl = document.getElementById('kpiReportContent');
    const title = titleEl ? titleEl.innerText : 'KPI Report';
    const content = contentEl ? contentEl.innerHTML : '';
    
    const printWin = window.open('', '', 'width=900,height=700');
    const html = `
        <html>
            <head>
                <title>${title} - Report</title>
                <style>
                    body { font-family: 'Inter', sans-serif; padding: 20px; color: #0f172a; }
                    h2 { border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; margin-bottom: 20px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
                    th, td { padding: 8px; border: 1px solid #cbd5e1; text-align: left; }
                    th { background: #f8fafc; font-weight: bold; }
                    .text-right { text-align: right; }
                    .report-meta { font-size: 11px; color: #64748b; margin-bottom: 20px; }
                </style>
            </head>
            <body>
                <h2>${title} Report</h2>
                <div class="report-meta">Generated: ${new Date().toLocaleString()}</div>
                ${content}
            </body>
        </html>
    `;
    const safe = DOMPurify.sanitize(html);
    printWin.document.write(safe);
    printWin.document.close();
    setTimeout(() => {
        printWin.print();
    }, 250);
};

// ==========================================
// DATAZ GENERATORS
// ==========================================
window.generateReport_statDatazRecords = function() {
    if (typeof finalResults === 'undefined') return `<p>System not loaded.</p>`;
    let html = `<p>Total Log Records: <strong>${finalResults.length}</strong></p>
    <table><thead><tr><th>Order No</th><th>Date</th><th>Item Name</th><th>Qty</th><th>Landed Cost ($)</th></tr></thead><tbody>`;
    let sorted = [...finalResults].sort((a,b)=> new Date(b['Order Date'] || 0) - new Date(a['Order Date'] || 0));
    sorted.forEach(r => {
        let cost = parseFloat(r['Total Landed Cost ($)'] || 0).toFixed(2);
        html += `<tr><td>${r['Order No'] || ''}</td><td>${r['Order Date'] || ''}</td><td>${r['Item Name'] || ''}</td><td>${r['Quantity'] || ''}</td><td class="text-right">$${cost}</td></tr>`;
    });
    html += `</tbody></table>`;
    return html;
};

function getUniqueParcels() {
    let pMap = new Map();
    if (typeof finalResults !== 'undefined') {
        finalResults.forEach(r => {
            let pno = r['Parcel No'];
            if (pno && String(pno).trim().toUpperCase() !== 'MANUAL') {
                if (!pMap.has(pno)) {
                    pMap.set(pno, {
                        pno: pno,
                        orderNo: r['Order No'],
                        date: r['Order Date'],
                        weight: parseFloat(r['Actual Chargeable Weight (g)'] || r['Total Dist Weight (g)'] || 0),
                        shippingFee: parseFloat(r['Actual Paid (Parcel)'] || r['actual_paid'] || r['Actual Shipping Fee'] || r['Order Postage'] || 0)
                    });
                }
            }
        });
    }
    return Array.from(pMap.values());
}

window.generateReport_statDatazParcels = function() { 
    if (typeof finalResults === 'undefined') return `<p>System not loaded.</p>`;
    let parcels = getUniqueParcels();
    let html = `<p>Total Logged Parcels: <strong>${parcels.length}</strong></p>
    <table><thead><tr><th>Parcel No</th><th>Order No</th><th>Date</th><th>Recorded Weight (g)</th></tr></thead><tbody>`;
    parcels.sort((a,b)=> new Date(b.date || 0) - new Date(a.date || 0)).forEach(p => {
        html += `<tr><td>${p.pno}</td><td>${p.orderNo || ''}</td><td>${p.date || ''}</td><td class="text-right">${p.weight.toFixed(2)}g</td></tr>`;
    });
    html += `</tbody></table>`;
    return html;
};

window.generateReport_statDatazPaid = function() { 
    if (typeof finalResults === 'undefined') return `<p>System not loaded.</p>`;
    let parcels = getUniqueParcels();
    let total = parcels.reduce((sum, p) => sum + p.shippingFee, 0);
    let html = `<p>Identified Parcel Shipping Fees: <strong style="color:var(--text-main); font-size:16px;">$${total.toFixed(2)}</strong> across ${parcels.length} parcels.</p>
    <table><thead><tr><th>Parcel No</th><th>Order No</th><th>Date</th><th>Shipping Fee</th></tr></thead><tbody>`;
    parcels.sort((a,b)=> new Date(b.date || 0) - new Date(a.date || 0)).forEach(p => {
        html += `<tr><td>${p.pno}</td><td>${p.orderNo || ''}</td><td>${p.date || ''}</td><td class="text-right">$${p.shippingFee.toFixed(2)}</td></tr>`;
    });
    html += `</tbody></table>`;
    return html;
};

window.generateReport_statDatazWt = function() { 
    if (typeof finalResults === 'undefined') return `<p>System not loaded.</p>`;
    let parcels = getUniqueParcels();
    let totalWt = parcels.reduce((sum, p) => sum + p.weight, 0);
    let html = `<p>Total Shipped Volume: <strong style="color:var(--text-main); font-size:16px;">${totalWt.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}g</strong></p>
    <table><thead><tr><th>Parcel No</th><th>Order No</th><th>Date</th><th>Chargeable Weight (g)</th></tr></thead><tbody>`;
    parcels.sort((a,b)=> new Date(b.date || 0) - new Date(a.date || 0)).forEach(p => {
        html += `<tr><td>${p.pno}</td><td>${p.orderNo || ''}</td><td>${p.date || ''}</td><td class="text-right">${p.weight.toFixed(2)}g</td></tr>`;
    });
    html += `</tbody></table>`;
    return html;
};

window.generateReport_statDatazTotalCost = function() { 
    if (typeof catalogCache === 'undefined') return `<p>System not loaded.</p>`;
    let items = Object.values(catalogCache).filter(c => c.avgUnitCost && c.totalQty && c.avgUnitCost > 0 && c.totalQty > 0);
    let total = items.reduce((sum, c) => sum + (c.avgUnitCost * c.totalQty), 0);
    let html = `<p>Total Absolute Raw Goods Value: <strong style="color:var(--text-main); font-size:16px;">$${total.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</strong></p>
    <table><thead><tr><th>Component</th><th>Unit Cost</th><th>Qty Purchased</th><th>Total Value</th></tr></thead><tbody>`;
    items.sort((a,b) => (b.avgUnitCost * b.totalQty) - (a.avgUnitCost * a.totalQty)).forEach(c => {
        let val = c.avgUnitCost * c.totalQty;
        html += `<tr><td>${c.neoName || c.itemName}</td><td class="text-right">$${c.avgUnitCost.toFixed(4)}</td><td class="text-right">${c.totalQty.toFixed(2)}</td><td class="text-right"><strong>$${val.toFixed(2)}</strong></td></tr>`;
    });
    html += `</tbody></table>`;
    return html;
};

// ==========================================
// EDITZ GENERATORS
// ==========================================
function getEditzCategorizedLists() {
    let usedSet = new Set(), assigned = [];
    let subAssys = [], retail = [], prints = [], labels = [];
    let orphans = [], rawMaterials = [];
    
    if(typeof productsDB !== 'undefined'){
        Object.keys(productsDB).forEach(pName => {
            let pArr = productsDB[pName];
            pArr.forEach(c => usedSet.add(c.item_key || c.di_item_id || c.name));
            
            let isSub = typeof isSubassemblyDB !== 'undefined' && isSubassemblyDB[pName];
            let isPrint = !!(pArr.is_3d_print);
            let isLabel = !!(pArr.is_label);
            
            if (isLabel) labels.push(pName);
            else if (isSub) subAssys.push(pName);
            else if (isPrint) prints.push(pName);
            else retail.push(pName);
        });
    }
    
    if (typeof catalogCache !== 'undefined') {
        Object.keys(catalogCache).forEach(k => {
            let c = catalogCache[k];
            let row = { key: k, neoName: c.neoName || '', neoProd: c.neoProd || '', itemName: c.itemName || '', spec: c.spec || '' };
            rawMaterials.push(row);
            if (usedSet.has(k)) assigned.push(row);
            else orphans.push(row);
        });
    }
    return { retail, prints, subAssys, labels, rawMaterials, orphans, assigned };
}

window.generateReport_statEditzRetail = function() { 
    const lists = getEditzCategorizedLists();
    let html = `<table><thead><tr><th>Recipe Name</th><th>Classification</th></tr></thead><tbody>`;
    if(lists.retail.length===0) html += `<tr><td colspan="2">No Retail Products found.</td></tr>`;
    lists.retail.sort().forEach(r => { html += `<tr><td><strong>📦 ${r}</strong></td><td>Retail Product</td></tr>`; });
    html += `</tbody></table>`;
    return html;
};
window.generateReport_statEditzLabels = function() { 
    const lists = getEditzCategorizedLists();
    let html = `<table><thead><tr><th>Recipe Name</th><th>Classification</th></tr></thead><tbody>`;
    if(lists.labels.length===0) html += `<tr><td colspan="2">No Custom Labelz found.</td></tr>`;
    lists.labels.sort().forEach(r => { 
        let pArr = productsDB[r] || [];
        let emoji = pArr.label_emoji || '🏷️';
        html += `<tr><td><strong>${emoji} ${r}</strong></td><td>Custom Label</td></tr>`; 
    });
    html += `</tbody></table>`;
    return html;
};
window.generateReport_statEditzPrints = function() { 
    const lists = getEditzCategorizedLists();
    let html = `<table><thead><tr><th>Recipe Name</th><th>Classification</th></tr></thead><tbody>`;
    if(lists.prints.length===0) html += `<tr><td colspan="2">No 3D Printed Parts found.</td></tr>`;
    lists.prints.sort().forEach(r => { html += `<tr><td><strong>🖨️ ${r}</strong></td><td>3D Print</td></tr>`; });
    html += `</tbody></table>`;
    return html;
};
window.generateReport_statEditzSubAssy = function() { 
    const lists = getEditzCategorizedLists();
    let html = `<table><thead><tr><th>Recipe Name</th><th>Classification</th></tr></thead><tbody>`;
    if(lists.subAssys.length===0) html += `<tr><td colspan="2">No Sub-Assemblies found.</td></tr>`;
    lists.subAssys.sort().forEach(r => { html += `<tr><td><strong>⚙️ ${r}</strong></td><td>Sub-Assembly</td></tr>`; });
    html += `</tbody></table>`;
    return html;
};
window.generateReport_statEditzRaw = function() { 
    const lists = getEditzCategorizedLists();
    let html = `<p>Total Raw Materials: <strong>${lists.rawMaterials.length}</strong></p>`;
    html += `<table><thead><tr><th>Component Key</th><th>Neogleamz Name</th><th>Neogleamz Product</th><th>Item Name</th><th>Specification</th></tr></thead><tbody>`;
    if(lists.rawMaterials.length===0) html += `<tr><td colspan="5">No Raw Materials found.</td></tr>`;
    lists.rawMaterials.sort((a,b)=>a.key.localeCompare(b.key)).forEach(r => { 
        html += `<tr><td style="font-family:monospace; color:#64748b;">${r.key}</td><td><strong>${r.neoName}</strong></td><td>${r.neoProd}</td><td>${r.itemName}</td><td>${r.spec}</td></tr>`; 
    });
    html += `</tbody></table>`;
    return html;
};
window.generateReport_statEditzOrphan = function() { 
    const lists = getEditzCategorizedLists();
    let html = `<div style="background:#fef2f2; border:1px solid #fca5a5; color:#991b1b; padding:10px; margin-bottom:15px; border-radius:6px; font-weight:bold;">⚠️ These ${lists.orphans.length} raw materials exist in your catalog but are NOT assigned to any Recipe or Sub-Assembly!</div>`;
    html += `<table><thead><tr><th>Orphaned Component Key</th><th>Neogleamz Name</th><th>Neogleamz Product</th><th>Item Name</th><th>Specification</th></tr></thead><tbody>`;
    if(lists.orphans.length===0) html += `<tr><td colspan="5">No Orphan Components found. All items are actively used in recipes!</td></tr>`;
    lists.orphans.sort((a,b)=>a.key.localeCompare(b.key)).forEach(r => { 
        html += `<tr><td style="font-family:monospace; color:#64748b;">${r.key}</td><td><strong>${r.neoName}</strong></td><td>${r.neoProd}</td><td>${r.itemName}</td><td>${r.spec}</td></tr>`; 
    });
    html += `</tbody></table>`;
    return html;
};

// ==========================================
// REVENUEZ / STATZ GENERATORS
// ==========================================
window.generateReport_statRevenuezRaw = function() {
    if (typeof catalogCache === 'undefined') return `<p>System not loaded.</p>`;
    let rawItems = [];
    Object.keys(catalogCache).forEach(k => { 
        let c = catalogCache[k];
        let s = c.totalQty - (inventoryDB[k]?.consumed_qty||0) - (inventoryDB[k]?.scrap_qty||0) + (inventoryDB[k]?.manual_adjustment||0); 
        let val = s * c.avgUnitCost;
        if (val > 0) {
            rawItems.push({ key: k, name: c.neoName || c.itemName || k, qty: s, cost: c.avgUnitCost, val: val });
        }
    });
    let total = rawItems.reduce((sum, item) => sum + item.val, 0);
    let html = `<p>Total Raw Component Value (Sunk Capital): <strong style="color:var(--text-main); font-size:16px;">$${total.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</strong></p>
    <table><thead><tr><th>Component Key</th><th>Display Name</th><th>Qty on Hand</th><th>Avg Unit Cost</th><th>Total Asset Value</th></tr></thead><tbody>`;
    if(rawItems.length===0) html += `<tr><td colspan="5">No Raw Components on hand.</td></tr>`;
    rawItems.sort((a,b)=>b.val - a.val).forEach(r => { 
        html += `<tr><td style="font-family:monospace; color:#64748b;">${r.key}</td><td><strong>${r.name}</strong></td><td class="text-right">${r.qty.toFixed(2)}</td><td class="text-right">$${r.cost.toFixed(4)}</td><td class="text-right" style="font-weight:bold; color:var(--text-highlight);">$${r.val.toFixed(2)}</td></tr>`; 
    });
    html += `</tbody></table>`;
    return html;
};

window.generateReport_statRevenuezBuilt = function() {
    if (typeof productsDB === 'undefined' || typeof inventoryDB === 'undefined') return `<p>System not loaded.</p>`;
    let builtItems = [];
    Object.keys(productsDB).forEach(p => { 
        let k = `RECIPE:::${p}`; 
        let s = (inventoryDB[k]?.produced_qty||0) - (inventoryDB[k]?.sold_qty||0); 
        let cogs = typeof getEngineTrueCogs === 'function' ? getEngineTrueCogs(p) : 0;
        let val = s * cogs;
        if (s > 0) {
            builtItems.push({ name: p, qty: s, cogs: cogs, val: val });
        }
    });
    let total = builtItems.reduce((sum, item) => sum + item.val, 0);
    let html = `<p>Total Built Product Value (On Shelf): <strong style="color:var(--text-main); font-size:16px;">$${total.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</strong></p>
    <table><thead><tr><th>Recipe Name</th><th>Qty on Shelf</th><th>True COGS (Per Unit)</th><th>Total Asset Value</th></tr></thead><tbody>`;
    if(builtItems.length===0) html += `<tr><td colspan="4">No Built Products on shelf.</td></tr>`;
    builtItems.sort((a,b)=>b.val - a.val).forEach(r => { 
        html += `<tr><td><strong>📦 ${r.name}</strong></td><td class="text-right">${r.qty}</td><td class="text-right">$${r.cogs.toFixed(2)}</td><td class="text-right" style="font-weight:bold; color:var(--text-highlight);">$${r.val.toFixed(2)}</td></tr>`; 
    });
    html += `</tbody></table>`;
    return html;
};

window.generateReport_statRevenuezGross = function() {
    let pArray = window.processedSalesDB || window.salesDB;
    if (typeof pArray === 'undefined') return `<p>System not loaded.</p>`;
    let capturedSales = [];
    pArray.forEach(s => {
        let lineCaptured = s.engineGrossCaptured !== undefined ? parseFloat(s.engineGrossCaptured) : (parseFloat(s.total) || 0);
        if (lineCaptured !== 0) {
            capturedSales.push({ date: s.sale_date, order: s.order_id, sku: s.storefront_sku, qty: s.qty_sold, captured: lineCaptured });
        }
    });
    let total = capturedSales.reduce((sum, item) => sum + item.captured, 0);
    let html = `<p>Total All-Time Captured (Gross): <strong style="color:var(--text-main); font-size:16px;">$${total.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</strong></p>
    <table><thead><tr><th>Date</th><th>Order ID</th><th>Storefront SKU</th><th>Qty Sold</th><th>Captured Value</th></tr></thead><tbody>`;
    if(capturedSales.length===0) html += `<tr><td colspan="5">No sales found.</td></tr>`;
    capturedSales.sort((a,b)=> new Date(b.date || 0) - new Date(a.date || 0)).forEach(r => { 
        html += `<tr><td>${r.date || ''}</td><td style="font-family:monospace;">${r.order || ''}</td><td>${r.sku || ''}</td><td class="text-right">${r.qty || 1}</td><td class="text-right" style="font-weight:bold;">$${r.captured.toFixed(2)}</td></tr>`; 
    });
    html += `</tbody></table>`;
    return html;
};

window.generateReport_statRevenuezNet = function() {
    let pArray = window.processedSalesDB || window.salesDB;
    if (typeof pArray === 'undefined') return `<p>System not loaded.</p>`;
    let netSales = [];
    pArray.forEach(s => {
        let lineCaptured = s.engineGrossCaptured !== undefined ? parseFloat(s.engineGrossCaptured) : (parseFloat(s.total) || 0);
        let lineNet = parseFloat(s.net) || 0;
        if (lineCaptured !== 0 || lineNet !== 0) {
            netSales.push({ date: s.sale_date, order: s.order_id, sku: s.storefront_sku, recipe: s.internal_recipe_name, qty: s.qty_sold, captured: lineCaptured, net: lineNet });
        }
    });
    let total = netSales.reduce((sum, item) => sum + item.net, 0);
    let html = `<p>Total Estimated Profit (Net): <strong style="color:var(--text-main); font-size:16px;">$${total.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</strong></p>
    <table><thead><tr><th>Date</th><th>Order ID</th><th>Storefront SKU</th><th>Internal Recipe</th><th>Qty</th><th>Captured</th><th>Net Profit</th></tr></thead><tbody>`;
    if(netSales.length===0) html += `<tr><td colspan="7">No sales found.</td></tr>`;
    netSales.sort((a,b)=> new Date(b.date || 0) - new Date(a.date || 0)).forEach(r => { 
        let netColor = r.net < 0 ? '#ef4444' : '#10b981';
        html += `<tr><td>${r.date || ''}</td><td style="font-family:monospace;">${r.order || ''}</td><td>${r.sku || ''}</td><td>${r.recipe || 'Unlinked'}</td><td class="text-right">${r.qty || 1}</td><td class="text-right">$${r.captured.toFixed(2)}</td><td class="text-right" style="font-weight:bold; color:${netColor};">$${r.net.toFixed(2)}</td></tr>`; 
    });
    html += `</tbody></table>`;
    return html;
};

// ==========================================
// STOCKZ GENERATORS
// ==========================================
window.generateReport_statStockzUnits = function() {
    if (typeof productsDB === 'undefined' || typeof inventoryDB === 'undefined') return `<p>System not loaded.</p>`;
    const hasSubassemblyDB = typeof isSubassemblyDB !== 'undefined';
    let total = 0;
    let html = `<table><thead><tr><th>Retail Product</th><th>Produced</th><th>Sold</th><th>Physical FGI</th></tr></thead><tbody>`;
    let items = [];
    Object.keys(productsDB).forEach(p => {
        if (hasSubassemblyDB && isSubassemblyDB[p]) return;
        let k = `RECIPE:::` + p;
        let i = inventoryDB[k] || {produced_qty:0, sold_qty:0};
        let s = (i.produced_qty || 0) - (i.sold_qty || 0);
        let onHand = Math.max(0, s);
        total += onHand;
        items.push({name: p, prod: i.produced_qty || 0, sold: i.sold_qty || 0, onHand: onHand});
    });
    items.sort((a,b) => b.onHand - a.onHand).forEach(item => {
        html += `<tr><td>${item.name}</td><td class="text-right">${item.prod}</td><td class="text-right">${item.sold}</td><td class="text-right"><strong>${item.onHand}</strong></td></tr>`;
    });
    html += `</tbody></table>`;
    return `<p>Total Physical FGI (Retail Units): <strong style="color:var(--text-main); font-size:16px;">${total}</strong></p>` + html;
};

window.generateReport_statStockzAlerts = function() {
    // Under construction
    return `<div style="text-align:center; padding: 40px; color: var(--text-muted);">Alerts reporting is currently under construction.</div>`;
};

window.generateReport_statStockzFgiVal = function() {
    if (typeof productsDB === 'undefined' || typeof inventoryDB === 'undefined' || typeof window.getEngineTrueCogs !== 'function') return `<p>System not loaded.</p>`;
    let totalVal = 0;
    let html = `<table><thead><tr><th>Product Asset</th><th>Physical FGI</th><th>True COGS</th><th>Asset Value</th></tr></thead><tbody>`;
    let items = [];
    Object.keys(productsDB).forEach(p => {
        let k = `RECIPE:::` + p;
        let i = inventoryDB[k] || {produced_qty:0, sold_qty:0};
        let s = (i.produced_qty || 0) - (i.sold_qty || 0);
        let onHand = Math.max(0, s);
        let cogs = window.getEngineTrueCogs(p);
        let val = onHand * cogs;
        totalVal += val;
        items.push({name: p, onHand: onHand, cogs: cogs, val: val});
    });
    items.sort((a,b) => b.val - a.val).forEach(item => {
        html += `<tr><td>${item.name}</td><td class="text-right">${item.onHand}</td><td class="text-right">$${item.cogs.toFixed(2)}</td><td class="text-right"><strong>$${item.val.toFixed(2)}</strong></td></tr>`;
    });
    html += `</tbody></table>`;
    return `<p>Total Built Product Asset Value: <strong style="color:var(--text-main); font-size:16px;">$${totalVal.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</strong></p>` + html;
};

window.generateReport_statStockzMaxYield = function() {
    if (typeof productsDB === 'undefined' || typeof catalogCache === 'undefined') return `<p>System not loaded.</p>`;
    let html = `<table><thead><tr><th>Retail Product</th><th>Max Independent Yield</th><th>Limiting Component</th></tr></thead><tbody>`;
    
    // Setup base physical stock for simulation
    let baseStock = {};
    Object.keys(catalogCache).forEach(k => {
        let i = inventoryDB[k] || {consumed_qty:0, manual_adjustment:0, min_stock:0, scrap_qty:0};
        baseStock[k] = (catalogCache[k].totalQty || 0) - (i.consumed_qty || 0) - (i.scrap_qty || 0) + (i.manual_adjustment || 0);
    });
    const hasSubassemblyDB = typeof isSubassemblyDB !== 'undefined';
    Object.keys(productsDB).filter(p => hasSubassemblyDB && isSubassemblyDB[p]).forEach(p => {
        let k = `RECIPE:::` + p;
        let i = inventoryDB[k] || {produced_qty:0, sold_qty:0};
        baseStock[k] = (i.produced_qty || 0) - (i.sold_qty || 0);
    });

    let items = [];
    Object.keys(productsDB).forEach(p => {
        if (hasSubassemblyDB && isSubassemblyDB[p]) return;
        let recipe = productsDB[p];
        if (!recipe || recipe.length === 0) return;
        
        let maxCanBuild = Infinity;
        let bottleneck = "None";
        
        recipe.forEach(comp => {
            let compKey = comp.item_key || comp.di_item_id || comp.name;
            let reqQty = parseFloat(comp.quantity) || 1;
            let available = baseStock[compKey] || 0;
            
            // Note: This is a simplified bottleneck calculation that doesn't recursively drill subassemblies for max yield precision,
            // but rather checks direct available stock. 
            let possible = Math.floor(Math.max(0, available) / reqQty);
            if (possible < maxCanBuild) {
                maxCanBuild = possible;
                bottleneck = comp.name || compKey;
            }
        });
        
        if (maxCanBuild === Infinity) maxCanBuild = 0;
        items.push({name: p, yield: maxCanBuild, bottleneck: bottleneck});
    });

    items.sort((a,b) => b.yield - a.yield).forEach(item => {
        html += `<tr><td>${item.name}</td><td class="text-right"><strong>${item.yield}</strong></td><td class="text-right" style="color:var(--text-muted);">${item.bottleneck}</td></tr>`;
    });
    html += `</tbody></table>`;
    return `<p>Theoretical Maximum Yield per Product (If all raw materials dedicated to a single product):</p>` + html;
};

window.generateReport_statStockzRawCount = function() {
    if (typeof catalogCache === 'undefined' || typeof inventoryDB === 'undefined') return `<p>System not loaded.</p>`;
    let totalCount = 0;
    let html = `<table><thead><tr><th>Component</th><th>Total Purchased</th><th>Consumed</th><th>Qty On Hand</th></tr></thead><tbody>`;
    let items = [];
    Object.keys(catalogCache).forEach(k => {
        let c = catalogCache[k];
        let i = inventoryDB[k] || {consumed_qty:0, manual_adjustment:0, min_stock:0, scrap_qty:0};
        let purchased = c.totalQty || 0;
        let consumed = (i.consumed_qty || 0) + (i.scrap_qty || 0) - (i.manual_adjustment || 0);
        let s = purchased - consumed;
        let onHand = Math.max(0, s);
        totalCount += onHand;
        items.push({name: c.neoName || c.itemName, purchased: purchased, consumed: consumed, onHand: onHand});
    });
    items.sort((a,b) => b.onHand - a.onHand).forEach(item => {
        html += `<tr><td>${item.name}</td><td class="text-right">${item.purchased.toFixed(2)}</td><td class="text-right">${item.consumed.toFixed(2)}</td><td class="text-right"><strong>${item.onHand.toFixed(2)}</strong></td></tr>`;
    });
    html += `</tbody></table>`;
    return `<p>Total Physical Raw Units Remaining: <strong style="color:var(--text-main); font-size:16px;">${totalCount.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</strong></p>` + html;
};
