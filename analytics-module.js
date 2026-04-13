/**
 * @typedef {Object} TrueNetWaterfallToken
 * @property {number} gross
 * @property {number} discounts
 * @property {number} captured
 * @property {number} cogs
 * @property {number} shipping
 * @property {number} stripe
 * @property {number} net
 */
// --- PROFITABILITY DASHBOARD MODULE ---
let waterfallChart = null;
let expenseDoughnut = null;
let trendsChart = null;

function sortAnalytics(c) { 
    if(isResizing) return; 
    currentAnalyticsSort = { column: c, direction: currentAnalyticsSort.column===c && currentAnalyticsSort.direction==='asc' ? 'desc' : 'asc' }; 
    window.saveSort('currentAnalyticsSort', currentAnalyticsSort);
    renderAnalyticsDashboard(); 
}

function renderAnalyticsDashboard() {
    try {
        // 1. Raw Material Value (Sunk Capital)
        let rawInvValue = 0;
        Object.keys(catalogCache).forEach(k => { 
            let s = catalogCache[k].totalQty - (inventoryDB[k]?.consumed_qty||0) - (inventoryDB[k]?.scrap_qty||0) + (inventoryDB[k]?.manual_adjustment||0); 
            rawInvValue += (s * catalogCache[k].avgUnitCost); 
        });
        
        // 2. Built Goods Value (Retail Products + Sub-Assemblies on shelf)
        let builtInvValue = 0;
        Object.keys(productsDB).forEach(p => { 
            let k = `RECIPE:::${p}`; let s = (inventoryDB[k]?.produced_qty||0) - (inventoryDB[k]?.sold_qty||0); 
            builtInvValue += (s * getEngineTrueCogs(p)); 
        });

        // 3. Aggregated Financials for Charts
        const SHIP_COST = typeof ENGINE_CONFIG !== 'undefined' ? ENGINE_CONFIG.flatShipping : 8.00;
        
        // --- INHERIT MASTER LEDGER PHYSICS ---
        // We inherit identical math from the sales-module instantly to perfectly support Warranty/Exchange logic offsets
        let totals = window.salesEngineTotals || { gross: 0, discounts: 0, captured: 0, cogs: 0, shipping: 0, stripe: 0, net: 0 };
        let processedSalesDB = window.processedSalesDB || salesDB;

        let trendData = {}; // { 'YYYY-MM-DD': { captured: 0, net: 0 } }

        processedSalesDB.forEach(s => { 
            let dt = s.sale_date || 'Unknown';
            // Trace exact "Captured" values (resolves discounts/shipping/tax) to match actual payouts
            let lineCaptured = (parseFloat(s.total) || 0) + (parseFloat(s.exchAdj) || 0);
            
            // Inherit the dynamically corrected net profit straight from the master ledger math
            let lineNet = parseFloat(s.net) || 0;

            if(!trendData[dt]) trendData[dt] = { captured: 0, net: 0 };
            trendData[dt].captured += lineCaptured;
            trendData[dt].net += lineNet;
        });

        // Update KPI Cards
        let elRaw = document.getElementById('kpiRawInv');
        if (elRaw) elRaw.innerText = `$${rawInvValue.toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2})}`;
        
        let elBuilt = document.getElementById('kpiBuiltInv');
        if (elBuilt) elBuilt.innerText = `$${builtInvValue.toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2})}`;
        
        let elRev = document.getElementById('kpiTotalRev');
        if (elRev) elRev.innerText = `$${totals.captured.toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2})}`;
        
        let elProfit = document.getElementById('kpiTotalProfit');
        if (elProfit) elProfit.innerText = `$${totals.net.toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2})}`;

        // --- CHART 1: WATERFALL (PROFIT DERIVATION) ---
        renderWaterfallChart(totals);

        // --- CHART 2: DOUGHNUT (EXPENSE DISTRIBUTION) ---
        renderExpenseDoughnut(totals);

        // --- CHART 3: TRENDS (REVENUE VS PROFIT) ---
        renderTrendsChart(trendData);

        // 4. Matrix (FILTERED to hide Sub-Assemblies)
        renderProfitabilityMatrix(SHIP_COST);

    } catch(e) { console.error("Analytics Error:", e); sysLog(e.message, true); }
}

function renderWaterfallChart(t) {
    try {
        const ctx = document.getElementById('waterfallChart');
        if (!ctx) return;
        if (waterfallChart) waterfallChart.destroy();

        const netSales = t.gross - t.discounts;

        const data = [
            [0, t.gross],                       // Gross Sales
            [t.gross, netSales],                // Discounts
            [netSales, netSales - t.cogs],      // COGS
            [netSales - t.cogs, netSales - t.cogs - t.shipping], // Shipping
            [netSales - t.cogs - t.shipping, netSales - t.cogs - t.shipping - t.stripe], // Stripe Fees
            [0, t.net]                          // Net Profit (Final)
        ];

        waterfallChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Gross Sales', 'Discounts', 'True COGS', 'Shipping', 'Fees', 'NET PROFIT'],
                datasets: [{
                    label: 'Financial Flow',
                    data: data,
                    backgroundColor: [
                        '#6366f1', // Indigo
                        '#fb7185', // Rose (Loss)
                        '#f43f5e', // Red (Loss)
                        '#fbbf24', // Amber (Loss)
                        '#94a3b8', // Blue Gray (Loss)
                        '#10b981'  // Emerald (Profit)
                    ],
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const val = context.raw;
                                const diff = Math.abs(val[1] - val[0]);
                                return `$${diff.toLocaleString(undefined, {minimumFractionDigits:2})}`;
                            }
                        }
                    }
                },
                scales: {
                    y: { beginAtZero: true, ticks: { font: { size: 9 }, callback: v => '$' + v.toLocaleString() } },
                    x: { ticks: { font: { size: 9 } } }
                }
            }
        });
    } catch(e) { sysLog('Waterfall chart render error: ' + e.message, true); }
}

function renderExpenseDoughnut(t) {
    try {
        const ctx = document.getElementById('expenseDoughnut');
        if (!ctx) return;
        if (expenseDoughnut) expenseDoughnut.destroy();

        expenseDoughnut = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['COGS', 'Shipping', 'Fees', 'Net Profit'],
                datasets: [{
                    data: [t.cogs, t.shipping, t.stripe, Math.max(0, t.net)],
                    backgroundColor: ['#f43f5e', '#fbbf24', '#94a3b8', '#10b981'],
                    borderWidth: 0,
                    hoverOffset: 10
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: {
                    legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 9 }, color: '#94a3b8', padding: 10 } }
                }
            }
        });
    } catch(e) { sysLog('Expense doughnut render error: ' + e.message, true); }
}

function renderTrendsChart(trendData) {
    try {
        const ctx = document.getElementById('trendsChart');
        if (!ctx) return;
        if (trendsChart) trendsChart.destroy();

        const sortedDates = Object.keys(trendData).sort();
        const capturedVals = sortedDates.map(d => trendData[d].captured);
        const netVals = sortedDates.map(d => trendData[d].net);

        trendsChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: sortedDates,
                datasets: [
                    {
                        label: 'Captured Revenue',
                        data: capturedVals,
                        borderColor: '#6366f1',
                        backgroundColor: 'rgba(99, 102, 241, 0.1)',
                        fill: true,
                        tension: 0.4
                    },
                    {
                        label: 'Net Profit',
                        data: netVals,
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        fill: true,
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: { position: 'top', align: 'end', labels: { boxWidth: 12, font: { size: 10 }, padding: 8 } }
                },
                scales: {
                    x: { grid: { display: false }, ticks: { font: { size: 9 } } },
                    y: { beginAtZero: true, ticks: { font: { size: 9 }, callback: v => '$' + v.toLocaleString() } }
                }
            }
        });
    } catch(e) { sysLog('Trends chart render error: ' + e.message, true); }
}

function renderProfitabilityMatrix(SHIP_COST) {
    try {
    let wrap = document.getElementById('analyticsTableWrap'); if(!wrap) return;
    let ths = ` <th class="${currentAnalyticsSort.column==='n'?'sorted-'+currentAnalyticsSort.direction:''}" onclick="sortAnalytics('n')">Retail Product</th> <th class="${currentAnalyticsSort.column==='tc'?'sorted-'+currentAnalyticsSort.direction:''} text-right" onclick="sortAnalytics('tc')">True COGS</th> <th class="${currentAnalyticsSort.column==='ms'?'sorted-'+currentAnalyticsSort.direction:''} text-right" onclick="sortAnalytics('ms')">Live MSRP</th> <th class="${currentAnalyticsSort.column==='mg'?'sorted-'+currentAnalyticsSort.direction:''} text-right" onclick="sortAnalytics('mg')">Gross Margin %</th> <th class="${currentAnalyticsSort.column==='ts'?'sorted-'+currentAnalyticsSort.direction:''} text-right" onclick="sortAnalytics('ts')">Total Units Sold</th> <th class="${currentAnalyticsSort.column==='tp'?'sorted-'+currentAnalyticsSort.direction:''} text-right" onclick="sortAnalytics('tp')">Actual Net Profit</th> `;
    let h = `<table style="width:100%;"><thead><tr>${ths}</tr></thead><tbody>`;

    let a = Object.keys(productsDB).filter(p => !isSubassemblyDB[p] && !(productsDB[p] && productsDB[p].is_3d_print) && !(productsDB[p] && productsDB[p].is_label)).map(p => {
        let tc = getEngineTrueCogs(p); 
        let ms = getEngineLiveMsrp(p); 
        let mg = ms > 0 ? ((ms - tc) / ms) * 100 : 0;
        let ts = 0; let tp = 0;
        
        let pArray = window.processedSalesDB || salesDB;
        pArray.filter(s => s.internal_recipe_name === p).forEach(s => { 
            let qty = parseFloat(s.qty_sold) || 0;
            // Simply inherit the fully corrected net from the master matrix
            let net = parseFloat(s.net) || 0;
            tp += net;
            ts += qty; 
        });
        return { n: p, tc: tc, ms: ms, mg: mg, ts: ts, tp: tp };
    });

    if(a.length===0){ h += "<tr><td colspan='6' style='text-align:center;'>No retail products defined yet.</td></tr>"; }
    else {
        a.sort((x,y) => { let u = x[currentAnalyticsSort.column]; let v = y[currentAnalyticsSort.column]; if (typeof u === 'number' && typeof v === 'number') return currentAnalyticsSort.direction === 'asc' ? u - v : v - u; u = (u||"").toString().toLowerCase(); v = (v||"").toString().toLowerCase(); if(u<v) return currentAnalyticsSort.direction==='asc'?-1:1; if(u>v) return currentAnalyticsSort.direction==='asc'?1:-1; return 0; });
        a.forEach(x => { 
            let badgeClass = x.mg >= 50 ? 'margin-good' : (x.mg >= 25 ? 'margin-ok' : 'margin-bad');
            let profitColor = x.tp < 0 ? '#ef4444' : '#10b981';
            h += `<tr><td tabindex="0" class="trunc-col" style="font-weight:bold; color:var(--text-heading);">📦 ${x.n}</td><td class="text-right" style="color:#ef4444;">$${x.tc.toFixed(2)}</td><td class="text-right" style="color:#0ea5e9;">$${x.ms.toFixed(2)}</td><td class="text-right"><span class="margin-badge ${badgeClass}">${x.mg.toFixed(1)}%</span></td><td class="text-right" style="font-weight:bold;">${x.ts.toFixed(0)}</td><td class="text-right" style="font-weight:bold; color:${profitColor};">$${x.tp.toFixed(2)}</td></tr>`; 
        });
    }
        wrap.innerHTML = h + `</tbody></table>`; applyTableInteractivity('analyticsTableWrap');
    } catch(e) { sysLog('Profitability matrix render error: ' + e.message, true); }
}

async function backfillFinancials() {
    if(!confirm("This will recalculate fees and profit for ALL historical sales based on CURRENT engine rules and sync them to the database. Continue?")) return;
    
    let t = document.getElementById('syncProgressTerminal'); if(t) t.innerHTML = "";
    if (typeof syncTrace === 'function') syncTrace("INITIALIZING RAPID FINANCIAL BACKFILL...", false);
    setMasterStatus("Backfilling Financials...", "mod-working");
    setSysProgress(10, 'working');
    sysLog("Starting financial backfill for all existing sales...");
    if (typeof syncTrace === 'function') syncTrace(`Engaging Master Engine ruleset for ${salesDB.length} historical ledger rows...`);
    
    try {
        const SHIP_COST = typeof ENGINE_CONFIG !== 'undefined' ? ENGINE_CONFIG.flatShipping : 8.00;
        let count = 0;
        
        // Loop through local cache and push updates row-by-row
        // Note: For very large datasets, a batch approach is better, but this is safest for now.
        for(let s of salesDB) {
            let qty = parseFloat(s.qty_sold) || 0;
            let p = parseFloat(s.actual_sale_price || 0);
            let d = parseFloat(s.discount_amount || 0);
            
            let trueLineCaptured = (p * qty) + parseFloat(s.shipping || 0) + parseFloat(s.taxes || 0) - d;
            
            let lineGross = p * qty;
            let stripeFee = getEngineStripeFee(trueLineCaptured, s["Source"]);
            let actualShipCost = SHIP_COST * qty;
            let lineNet = getHistoricalNetProfit(lineGross, parseFloat(s.shipping || 0), parseFloat(s.taxes || 0), d, actualShipCost, s.internal_recipe_name, qty, s["Source"]);
            
            let roundedFee = Math.round(stripeFee * 100) / 100;
            let roundedNet = Math.round(lineNet * 100) / 100;
            
            const { error } = await supabaseClient.from('sales_ledger')
                .update({ transaction_fees: roundedFee, net_profit: roundedNet })
                .eq('order_id', s.order_id)
                .eq('internal_recipe_name', s.internal_recipe_name);
            
            if(error) {
                // 🧹 Boy Scout: promoted console.error to sysLog for consistent error telemetry
                sysLog(`Backfill row error [${s.order_id}]: ${error.message}`, true);
            } else {
                count++;
            }
            
            // Trace every record to give granular feedback
            if (typeof syncTrace === 'function') {
                syncTrace(`Analyzed ${s.order_id} (${s.Source || 'Unknown'}): Base $${trueLineCaptured.toFixed(2)} -> Fee: $${roundedFee.toFixed(2)} | Net: $${roundedNet.toFixed(2)}`);
            }
            
            // UI Status Update feedback
            if(count % 5 === 0 || count === salesDB.length) {
                setSysProgress(10 + (count / salesDB.length) * 85);
                setMasterStatus(`Backfilling: ${count}/${salesDB.length}`, "mod-working");
            }
        }
        
        sysLog(`Successfully backfilled ${count} sales records with updated financials.`);
        if (typeof syncTrace === 'function') syncTrace(`PROCESS COMPLETE. ${count} transactions finalized under current Engine Parameters.`, false);
        setMasterStatus("Backfill Complete!", "mod-success");
        setSysProgress(100, 'success');
        
        // Refresh local data to reflect the newly persisted IDs/values
        if(typeof loadData === 'function') await loadData();
        renderAnalyticsDashboard();
        
    } catch(e) {
        sysLog("Backfill Error: " + e.message, true);
        if (typeof syncTrace === 'function') syncTrace(`CRITICAL FAULT: ${e.message}`, true);
        setMasterStatus("Backfill Failed", "mod-error");
    }
}
