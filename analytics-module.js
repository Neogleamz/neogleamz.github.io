// --- PROFITABILITY DASHBOARD MODULE ---

function sortAnalytics(c) { 
    if(isResizing) return; 
    currentAnalyticsSort = { column: c, direction: currentAnalyticsSort.column===c && currentAnalyticsSort.direction==='asc' ? 'desc' : 'asc' }; 
    renderAnalyticsDashboard(); 
}

function renderAnalyticsDashboard() {
    // 1. Raw Material Value
    let rawInvValue = 0;
    Object.keys(catalogCache).forEach(k => { 
        let s = catalogCache[k].totalQty - (inventoryDB[k]?.consumed_qty||0) - (inventoryDB[k]?.scrap_qty||0) + (inventoryDB[k]?.manual_adjustment||0); 
        rawInvValue += (s * catalogCache[k].avgUnitCost); 
    });
    
    // 2. Built Goods Value (Retail Products + Sub-Assemblies on shelf)
    let builtInvValue = 0;
    Object.keys(productsDB).forEach(p => { 
        let k = `RECIPE:::${p}`; let s = (inventoryDB[k]?.produced_qty||0) - (inventoryDB[k]?.sold_qty||0); 
        builtInvValue += (s * calculateProductTotal(p)); 
    });

    // 3 & 4. Revenue and Gross Profit
    let totalRev = 0; let totalCogs = 0;
    salesDB.forEach(s => { 
        totalRev += (parseFloat(s.actual_sale_price) * parseFloat(s.qty_sold)); 
        totalCogs += (parseFloat(s.cogs_at_sale) * parseFloat(s.qty_sold)); 
    });
    let totalProfit = totalRev - totalCogs;

    document.getElementById('kpiRawInv').innerText = `$${rawInvValue.toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2})}`;
    document.getElementById('kpiBuiltInv').innerText = `$${builtInvValue.toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2})}`;
    document.getElementById('kpiTotalRev').innerText = `$${totalRev.toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2})}`;
    document.getElementById('kpiTotalProfit').innerText = `$${totalProfit.toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2})}`;

    // Matrix (FILTERED to hide Sub-Assemblies)
    let wrap = document.getElementById('analyticsTableWrap'); if(!wrap) return;
    let ths = ` <th class="${currentAnalyticsSort.column==='n'?'sorted-'+currentAnalyticsSort.direction:''}" onclick="sortAnalytics('n')">Retail Product</th> <th class="${currentAnalyticsSort.column==='tc'?'sorted-'+currentAnalyticsSort.direction:''} text-right" onclick="sortAnalytics('tc')">True COGS</th> <th class="${currentAnalyticsSort.column==='ms'?'sorted-'+currentAnalyticsSort.direction:''} text-right" onclick="sortAnalytics('ms')">MSRP</th> <th class="${currentAnalyticsSort.column==='mg'?'sorted-'+currentAnalyticsSort.direction:''} text-right" onclick="sortAnalytics('mg')">Gross Margin %</th> <th class="${currentAnalyticsSort.column==='ts'?'sorted-'+currentAnalyticsSort.direction:''} text-right" onclick="sortAnalytics('ts')">Total Units Sold</th> <th class="${currentAnalyticsSort.column==='tp'?'sorted-'+currentAnalyticsSort.direction:''} text-right" onclick="sortAnalytics('tp')">Total Profit Generated</th> `;
    let h = `<table style="width:100%;"><thead><tr>${ths}</tr></thead><tbody>`;

    let a = Object.keys(productsDB).filter(p => !isSubassemblyDB[p]).map(p => {
        let tc = calculateProductTotal(p); let ms = pricingDB[p]?.msrp || 0; let mg = ms > 0 ? ((ms - tc) / ms) * 100 : 0;
        let ts = 0; let tp = 0;
        salesDB.filter(s => s.internal_recipe_name === p).forEach(s => { ts += parseFloat(s.qty_sold); tp += (parseFloat(s.actual_sale_price) - parseFloat(s.cogs_at_sale)) * parseFloat(s.qty_sold); });
        return { n: p, tc: tc, ms: ms, mg: mg, ts: ts, tp: tp };
    });

    if(a.length===0){ h += "<tr><td colspan='6' style='text-align:center;'>No retail products defined yet.</td></tr>"; }
    else {
        a.sort((x,y) => { let u = x[currentAnalyticsSort.column]; let v = y[currentAnalyticsSort.column]; if (typeof u === 'number' && typeof v === 'number') return currentAnalyticsSort.direction === 'asc' ? u - v : v - u; u = (u||"").toString().toLowerCase(); v = (v||"").toString().toLowerCase(); if(u<v) return currentAnalyticsSort.direction==='asc'?-1:1; if(u>v) return currentAnalyticsSort.direction==='asc'?1:-1; return 0; });
        a.forEach(x => { 
            let badgeClass = x.mg >= 50 ? 'margin-good' : (x.mg >= 25 ? 'margin-ok' : 'margin-bad');
            h += `<tr><td tabindex="0" class="trunc-col" style="font-weight:bold; color:var(--text-heading);">📦 ${x.n}</td><td class="text-right" style="color:#ef4444;">$${x.tc.toFixed(2)}</td><td class="text-right" style="color:#0ea5e9;">$${x.ms.toFixed(2)}</td><td class="text-right"><span class="margin-badge ${badgeClass}">${x.mg.toFixed(1)}%</span></td><td class="text-right" style="font-weight:bold;">${x.ts.toFixed(0)}</td><td class="text-right" style="font-weight:bold; color:#10b981;">$${x.tp.toFixed(2)}</td></tr>`; 
        });
    }
    wrap.innerHTML = h + `</tbody></table>`; applyTableInteractivity('analyticsTableWrap');
}