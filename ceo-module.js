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
// --- CEO TERMINAL: OPERATION APEX 2.1 ---

let ceoWaterfallChart, ceoExpenseChart, ceoProfitChart, ceoUnitChart, ceoEfficiencyChart, ceoCurEfficiencyChart, ceoLineChart;
const ceoFmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

// Global Drag & Drop + Sorting State
let ceoDraggedIndex = null;
let ceoSortKey = null;
let ceoSortAsc = true;

function ceoDragStart(e, idx) { ceoDraggedIndex = idx; e.dataTransfer.effectAllowed = 'move'; setTimeout(() => e.target.style.opacity = '0.4', 0); }
function ceoDragOver(e) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }
function ceoDrop(e, targetIdx) {
    e.preventDefault(); e.currentTarget.style.opacity = '1';
    if(ceoDraggedIndex === null || ceoDraggedIndex === targetIdx) return;
    const moved = ceoActiveProducts.splice(ceoDraggedIndex, 1)[0];
    ceoActiveProducts.splice(targetIdx, 0, moved);
    renderCeoTerminal();
}
function ceoDragEnd(e) { e.target.style.opacity = '1'; ceoDraggedIndex = null; }

function sortCeoTable(key) {
    if(ceoSortKey === key) ceoSortAsc = !ceoSortAsc;
    else { ceoSortKey = key; ceoSortAsc = true; }
    updateCeoEngine();
}

// State Management
if (typeof ceoActiveProducts === 'undefined') window.ceoActiveProducts = [];
window.ceoSessionTestItems = []; // Temporary items created in the builder modal

function saveCeoBoard() { if (typeof saveCloudPrefs === 'function') saveCloudPrefs(); }

function get30DayVolume(productName) {
    try {
        if(typeof salesDB === 'undefined' || !salesDB || !Array.isArray(salesDB)) return 0;
        let thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        let vol = 0;
        let searchName = productName.toUpperCase().trim();
        salesDB.forEach(sale => {
            if (new Date(sale.sale_date) >= thirtyDaysAgo) {
                if(sale.internal_recipe_name && sale.internal_recipe_name.toUpperCase() === searchName) {
                    vol += (parseFloat(sale.qty_sold) || 0);
                }
            }
        });
        return vol;
    } catch (e) { return 0; }
}

/**
 * Automatically populates the CEO simulation board with recent 30-day top-selling retail SKUs.
 * Skips 3D prints, labels, and subassemblies to ensure only valid customer-facing volume is simulated.
 */
function autoPopulateCeoBoard() {
    if (ceoActiveProducts.length > 0) return;
    let prods = Object.keys(productsDB).filter(p => !isSubassemblyDB[p] && !(productsDB[p] && productsDB[p].is_3d_print) && !(productsDB[p] && productsDB[p].is_label));
    prods.forEach(pName => {
        let vol = get30DayVolume(pName);
        if (vol > 0) {
            let liveMsrp = getEngineLiveMsrp(pName);
            ceoActiveProducts.push({
                name: pName, isBundle: false, applyCac: false, applyAff: false, applyWarr: false,
                currentMsrp: liveMsrp, testMsrp: liveMsrp, vol: vol
            });
        }
    });
}

function initCeoCharts() {
    Chart.defaults.color = '#e0e0e0'; Chart.defaults.font.family = "'JetBrains Mono', monospace";
    if(ceoExpenseChart) ceoExpenseChart.destroy();
    if(ceoUnitChart) ceoUnitChart.destroy(); if(ceoEfficiencyChart) ceoEfficiencyChart.destroy(); if(ceoCurEfficiencyChart) ceoCurEfficiencyChart.destroy();
    if(ceoWaterfallChart) ceoWaterfallChart.destroy();

    let elWaterfall = document.getElementById('ceoWaterfallChart');
    if (elWaterfall) {
        try {
            ceoWaterfallChart = new Chart(elWaterfall.getContext('2d'), {
                type: 'bar', plugins: [ChartDataLabels],
                data: {
                    labels: ['Gross Sales', 'COGS', 'Stripe', 'Shipping', 'Warranty', 'Affiliate', 'Ads (CAC)', 'Net Profit'],
                    datasets: [{
                        label: 'Financial Flow',
                        data: [
                            {x: 'Gross Sales', y: 0, base: 0},
                            {x: 'COGS', y: 0, base: 0},
                            {x: 'Stripe', y: 0, base: 0},
                            {x: 'Shipping', y: 0, base: 0},
                            {x: 'Warranty', y: 0, base: 0},
                            {x: 'Affiliate', y: 0, base: 0},
                            {x: 'Ads (CAC)', y: 0, base: 0},
                            {x: 'Net Profit', y: 0, base: 0}
                        ],
                        backgroundColor: ['#10b981', '#8b5cf6', '#06b6d4', '#3b82f6', '#f59e0b', '#facc15', '#ef4444', '#00ff66'],
                        borderRadius: 4, barPercentage: 0.8
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false, layout: { padding: { top: 30 } },
                    plugins: {
                        legend: { display: false },
                        datalabels: {
                            color: '#fff',
                            align: 'center',
                            anchor: 'center',
                            font: { weight: 'bold' },
                            formatter: (v) => {
                                if (!v || typeof v.y === 'undefined' || typeof v.base === 'undefined') return '';
                                let diff = Math.abs(v.y - v.base);
                                return diff > 0.49 ? ceoFmt.format(diff).split('.')[0] : '';
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: function(ctx) {
                                    let v = ctx.raw;
                                    if (!v || typeof v.y === 'undefined' || typeof v.base === 'undefined') return '';
                                    return ceoFmt.format(Math.abs(v.y - v.base));
                                }
                            }
                        }
                    },
                    scales: {
                        y: { grid: {color:'#222'} },
                        x: { grid: { display: false } }
                    }
                }
            });
        } catch (e) {
            sysLog("Waterfall Init Fault: " + (e.message || e), true);
        }
    }

    let elExpense = document.getElementById('expenseChart');
    if (elExpense) {
        ceoExpenseChart = new Chart(elExpense.getContext('2d'), {
            type: 'bar', plugins: [ChartDataLabels],
            data: {
                labels: ['True COGS', 'Ads (CAC)', 'Affil', 'Warr', 'Shipping', 'Stripe', 'Net Profit'],
                datasets: [
                    { label: 'Current MSRP', data: [0,0,0,0,0,0,0], backgroundColor: ['rgba(139,92,246,0.3)', 'rgba(239,68,68,0.3)', 'rgba(250,204,21,0.3)', 'rgba(245,158,11,0.3)', 'rgba(59,130,246,0.3)', 'rgba(6,182,212,0.3)', 'rgba(0,255,102,0.3)'], borderRadius: 4 },
                    { label: 'Test MSRP', data: [0,0,0,0,0,0,0], backgroundColor: ['#8b5cf6', '#ef4444', '#facc15', '#f59e0b', '#3b82f6', '#06b6d4', '#00ff66'], borderRadius: 4 }
                ]
            },
            options: { responsive: true, maintainAspectRatio: false, layout: { padding: { top: 25 } }, plugins: { legend: { position: 'bottom' }, datalabels: { color: '#fff', anchor: 'end', align: 'top', font: { weight: 'bold' }, formatter: (v) => v > 0.49 ? ceoFmt.format(v).split('.')[0] : '' } }, scales: { y: { grid: {color:'#222'} }, x: { grid: { display: false } } } }
        });
    }

    let elUnit = document.getElementById('unitChart');
    if (elUnit) {
        ceoUnitChart = new Chart(elUnit.getContext('2d'), { type: 'bar', data: { labels: [], datasets: [{label: 'Current Net', backgroundColor: 'rgba(0,255,102,0.3)', data: []}, {label: 'Test Net', backgroundColor: '#00ff66', data: []}] }, options: { responsive: true, maintainAspectRatio: false, scales: { y: { grid: {color:'#222'} } }, plugins: { legend: { position: 'bottom' } } } });
    }
    const efficiencyOptions = (isCurrent) => ({
        indexAxis: 'y', responsive: true, maintainAspectRatio: false,
        scales: {
            x: { stacked: true, max: 100, ticks: { callback: v => v+'%' }, grid: {color: '#222'} },
            y: { stacked: true, grid: {display: false} }
        },
        plugins: {
            legend: { position: 'bottom' },
            tooltip: {
                callbacks: {
                    label: function(ctx) {
                        let pc = ctx.raw;
                        let activeP = ceoActiveProducts[ctx.dataIndex];
                        if(!activeP) return `${ctx.dataset.label}: ${pc.toFixed(1)}%`;
                        let bs = isCurrent ? (activeP.currentMsrp || 1) : (activeP.testMsrp || 1);
                        let dol = (pc / 100) * bs;
                        return `${ctx.dataset.label}: ${ceoFmt.format(dol)} (${pc.toFixed(1)}%)`;
                    }
                }
            },
            datalabels: {
                display: 'auto',
                color: '#fff',
                textStrokeColor: '#000',
                textStrokeWidth: 2,
                font: { weight: 'bold', size: 10, family: "'JetBrains Mono', monospace" },
                formatter: function(value, ctx) {
                    if (value < 0.49) return '';
                    let activeP = ceoActiveProducts[ctx.dataIndex];
                    if(!activeP) return `${value.toFixed(1)}%`;
                    let isCurrent = ctx.chart.canvas.id === 'curEfficiencyChart';
                    let bs = isCurrent ? (activeP.currentMsrp || 1) : (activeP.testMsrp || 1);
                    let dol = (value / 100) * bs;
                    return `${ceoFmt.format(dol)}\n(${value.toFixed(1)}%)`;
                },
                align: 'center',
                anchor: 'center',
                textAlign: 'center'
            }
        }
    });

    let elEff = document.getElementById('efficiencyChart');
    if (elEff) ceoEfficiencyChart = new Chart(elEff.getContext('2d'), { type: 'bar', plugins: [ChartDataLabels], data: { labels: [], datasets: [] }, options: efficiencyOptions(false) });

    let elCurEff = document.getElementById('curEfficiencyChart');
    if (elCurEff) ceoCurEfficiencyChart = new Chart(elCurEff.getContext('2d'), { type: 'bar', plugins: [ChartDataLabels], data: { labels: [], datasets: [] }, options: efficiencyOptions(true) });
}

function renderCeoTerminal() {
    sysLog("Booting CEO Terminal...");
    autoPopulateCeoBoard();

    let availableRetail = Object.keys(productsDB).filter(k => !isSubassemblyDB[k]);

    let slidersHtml = '';
    ceoActiveProducts.forEach((p, index) => {
        const toggleStyle = (active, color) => `cursor:pointer; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 800; border: 1px solid ${active ? color : '#444'}; background: ${active ? color+'22' : '#222'}; color: ${active ? color : '#666'}; margin-right: 4px;`;

        slidersHtml += `
        <div class="ceo-slider-group" style="border-bottom: 1px solid var(--border-color); padding-bottom: 8px; margin-bottom:8px; cursor:grab; display:flex; flex-direction:column; gap:6px;" draggable="true" ondragstart="ceoDragStart(event, ${index})" ondragover="ceoDragOver(event)" ondrop="ceoDrop(event, ${index})" ondragend="ceoDragEnd(event)">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px;">
                <span title="Drag to reorder" style="line-height:1.2; font-size: 0.8rem; font-weight:bold;">☰ ${p.name}</span>
                <button class="ceo-remove-btn btn-red-muted" data-remove-idx="${index}" style="flex: 0 0 auto; width: max-content !important; padding: 2px 8px; font-size:10px; font-weight:800; border-radius:4px; border:1px solid #fca5a5; cursor:pointer;" title="Remove Product">REMOVE</button>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <div style="display:flex; gap:4px;">
                    <span style="${toggleStyle(p.applyCac, '#ef4444')}" onclick="toggleCeoBtn(${index}, 'applyCac')">ADS</span>
                    <span style="${toggleStyle(p.applyAff, '#facc15')}" onclick="toggleCeoBtn(${index}, 'applyAff')">AFF</span>
                    <span style="${toggleStyle(p.applyWarr, '#f59e0b')}" onclick="toggleCeoBtn(${index}, 'applyWarr')">WAR</span>
                </div>
                <input type="number" id="ceo-vol-${index}-num" class="ceo-sync-input" value="${p.vol}" oninput="document.getElementById('ceo-vol-${index}').value=this.value; updateCeoEngine();" style="width: 50px; text-align:center; padding: 2px; font-size: 11px;">
            </div>
        </div>`;
    });

    let elSliders = document.getElementById('ceo-dynamic-sliders');
    if (elSliders) elSliders.innerHTML = slidersHtml;
    if(!ceoExpenseChart) initCeoCharts();
    updateCeoEngine();
}

function toggleCeoBtn(idx, key) {
    ceoActiveProducts[idx][key] = !ceoActiveProducts[idx][key];
    renderCeoTerminal();
}

function updateCeoEngine() {
    try {
        let metricsData = _calculateCeoMetrics();
        _buildCeoTable(metricsData);
        _syncCeoKPIs(metricsData);
        _updateCeoCharts(metricsData);
        saveCeoBoard();
    } catch (e) { sysLog("Engine Fault: " + (e.message || e), true); }
}

function _calculateCeoMetrics() {
    const SHIP_COST = typeof ENGINE_CONFIG !== 'undefined' ? ENGINE_CONFIG.flatShipping : 8.00;
    let cacEl = document.getElementById('globalCacNum');
    let gCac = cacEl ? parseFloat(cacEl.value) || 0 : 0;
    let affEl = document.getElementById('globalAffNum');
    let gAff = affEl ? parseFloat(affEl.value) || 0 : 0;
    let warrEl = document.getElementById('globalWarrNum');
    let gWarr = warrEl ? parseFloat(warrEl.value) || 0 : 0;

    let totals = { gross:0, curNet:0, testNet:0, cogs:0, stripe:0, curStripe:0, aff:0, curAff:0, warr:0, curWarr:0, ship:0, cac:0 };
    let charts = { labels:[], curNetData:[], testNetData:[], eff:[], curEff:[] };

    let tableRows = [];
    ceoActiveProducts.forEach((p, index) => {
        let volMatch = document.getElementById(`ceo-vol-${index}-num`);
        p.vol = volMatch ? parseInt(volMatch.value) || 0 : p.vol || 0;
        let testMsrpMatch = document.getElementById(`ceo-testmsrp-${index}`);
        p.testMsrp = testMsrpMatch ? parseFloat(testMsrpMatch.value) || p.testMsrp : p.testMsrp;

        let effCac = p.applyCac ? gCac : 0;
        let effAff = p.applyAff ? gAff : 0;
        let effWarr = p.applyWarr ? gWarr : 0;

        let liveCogs = (p.isBundle || p.name.startsWith('🧪')) ? (p.cogs || 0) : getEngineTrueCogs(p.name);
        let fsThreshEl = document.getElementById('ceo-fs-threshold');
        let fsThreshold = fsThreshEl ? parseFloat(fsThreshEl.value) || 50 : 50;

        let curMetrics = getEnginePredictiveMetrics(p.currentMsrp, liveCogs, 999999, effCac, effAff, effWarr);
        let testMetrics = getEnginePredictiveMetrics(p.testMsrp, liveCogs, fsThreshold, effCac, effAff, effWarr);

        totals.gross += (p.testMsrp * p.vol);
        totals.curNet += (curMetrics.net * p.vol);
        totals.testNet += (testMetrics.net * p.vol);
        totals.cogs += (liveCogs * p.vol);
        totals.stripe += (testMetrics.stripe * p.vol);
        totals.curStripe += (curMetrics.stripe * p.vol);
        totals.aff += (testMetrics.aff * p.vol);
        totals.curAff += (curMetrics.aff * p.vol);
        totals.warr += (testMetrics.warr * p.vol);
        totals.curWarr += (curMetrics.warr * p.vol);
        totals.ship += (testMetrics.ship * p.vol);
        totals.cac += (effCac * p.vol);

        charts.labels.push(p.name);
        charts.curNetData.push(curMetrics.net);
        charts.testNetData.push(testMetrics.net);

        let b = p.testMsrp || 1;
        charts.eff.push([(liveCogs/b)*100, (effCac/b)*100, (testMetrics.aff/b)*100, (testMetrics.warr/b)*100, (testMetrics.merchantShipMargin/b)*100, (testMetrics.stripe/b)*100, (Math.max(0,testMetrics.net)/b)*100]);

        let curB = p.currentMsrp || 1;
        charts.curEff.push([(liveCogs/curB)*100, (effCac/curB)*100, (curMetrics.aff/curB)*100, (curMetrics.warr/curB)*100, (curMetrics.merchantShipMargin/curB)*100, (curMetrics.stripe/curB)*100, (Math.max(0,curMetrics.net)/curB)*100]);

        tableRows.push({
            index: index, name: p.name, cogs: liveCogs, currentMsrp: p.currentMsrp, curShip: curMetrics.ship, curStripe: curMetrics.stripe, curOOP: curMetrics.oop, curNet: curMetrics.net, testMsrp: p.testMsrp, testShip: testMetrics.ship, testStripe: testMetrics.stripe, testOOP: testMetrics.oop, testNet: testMetrics.net
        });
    });

    if(ceoSortKey) {
        tableRows.sort((a,b) => {
            let valA = a[ceoSortKey]; let valB = b[ceoSortKey];
            if(typeof valA === 'string') return ceoSortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
            return ceoSortAsc ? valA - valB : valB - valA;
        });
    }
    return { totals, charts, tableRows };
}

function _buildCeoTable({ tableRows }) {
    const getThClass = (key) => (ceoSortKey === key ? `sorted-${ceoSortAsc ? 'asc' : 'desc'}` : '');

    let tableHtml = `
        <!-- removed header to save vertical space -->
        <table>
            <thead>
                <tr>
                    <th class="${getThClass('name')}" data-ceosort="name" tabindex="0" style="text-align:left; cursor:pointer;">Product Name</th>
                    <th class="${getThClass('cogs')}" data-ceosort="cogs" tabindex="0" style="font-weight:900; cursor:pointer;">True COGS</th>
                    <th class="${getThClass('currentMsrp')}" data-ceosort="currentMsrp" tabindex="0" style="color:#888; cursor:pointer;">Current MSRP</th>
                    <th class="${getThClass('curShip')}" data-ceosort="curShip" tabindex="0" style="color:#888; cursor:pointer;">Cur. Ship</th>
                    <th class="${getThClass('curStripe')}" data-ceosort="curStripe" tabindex="0" style="color:#888; cursor:pointer;">Cur. Stripe</th>
                    <th class="${getThClass('curOOP')}" data-ceosort="curOOP" tabindex="0" style="color:#888; cursor:pointer;">Cust OOP</th>
                    <th class="${getThClass('curNet')}" data-ceosort="curNet" tabindex="0" style="color:#ccc; cursor:pointer;">Current Net</th>
                    <th class="${getThClass('testMsrp')}" data-ceosort="testMsrp" tabindex="0" style="color:var(--neon-cyan); border-left:2px solid #444; padding-left:15px; cursor:pointer;">Test MSRP ✏️</th>
                    <th class="${getThClass('testShip')}" data-ceosort="testShip" tabindex="0" style="color:var(--neon-cyan); cursor:pointer;">Test Ship</th>
                    <th class="${getThClass('testStripe')}" data-ceosort="testStripe" tabindex="0" style="color:var(--neon-cyan); cursor:pointer;">Test Stripe</th>
                    <th class="${getThClass('testOOP')}" data-ceosort="testOOP" tabindex="0" style="color:var(--neon-cyan); cursor:pointer;">Cust OOP</th>
                    <th class="${getThClass('testNet')} val-green" data-ceosort="testNet" tabindex="0" style="font-weight:900; cursor:pointer;">Test Net</th>
                </tr>
            </thead>
            <tbody>`;

    if (tableRows.length === 0) {
        tableHtml += '<tr><td colspan="12" style="text-align:center;">No products active.</td></tr>';
    } else {
        tableRows.forEach(r => {
            tableHtml += `
            <tr>
                <td style="text-align:left; font-weight:700;">${r.name}</td>
                <td style="font-weight:700;">${ceoFmt.format(r.cogs)}</td>
                <td style="color:#888;">${ceoFmt.format(r.currentMsrp)}</td>
                <td style="color:#888;">${ceoFmt.format(r.curShip)}</td>
                <td style="color:#888;">${ceoFmt.format(r.curStripe)}</td>
                <td style="color:#888;">${ceoFmt.format(r.curOOP)}</td>
                <td style="color:#ccc;">${ceoFmt.format(r.curNet)}</td>
                <td style="border-left:2px solid #444; padding-left:15px;"><input type="number" id="ceo-testmsrp-${r.index}" data-msrp-idx="${r.index}" class="ceo-table-input ceo-test-msrp-listen" value="${r.testMsrp.toFixed(2)}"></td>
                <td style="color:var(--neon-cyan);">${ceoFmt.format(r.testShip)}</td>
                <td style="color:var(--neon-cyan);">${ceoFmt.format(r.testStripe)}</td>
                <td style="color:var(--neon-cyan); font-weight:bold;">${ceoFmt.format(r.testOOP)}</td>
                <td class="${r.testNet < 0 ? 'val-red' : 'val-green'}" style="font-weight:900;">${ceoFmt.format(r.testNet)}</td>
            </tr>`;
        });
    }
    tableHtml += '</tbody></table>';

    const wrap = document.getElementById('ceoTableWrap');
    if (wrap) {
        wrap.innerHTML = tableHtml;
        if (typeof applyTableInteractivity === 'function') applyTableInteractivity('ceoTableWrap');
    }
}

function _syncCeoKPIs({ totals }) {
    let elKpiGross = document.getElementById('kpiGross');
    if (elKpiGross) elKpiGross.innerText = ceoFmt.format(totals.gross).split('.')[0];

    let elKpiOldNet = document.getElementById('kpiOldNet');
    if (elKpiOldNet) elKpiOldNet.innerText = ceoFmt.format(totals.curNet).split('.')[0];

    let elKpiNewNet = document.getElementById('kpiNewNet');
    if (elKpiNewNet) elKpiNewNet.innerText = ceoFmt.format(totals.testNet).split('.')[0];

    let elKpiSaved = document.getElementById('kpiSaved');
    if (elKpiSaved) elKpiSaved.innerText = (totals.testNet - totals.curNet >= 0 ? "+" : "") + ceoFmt.format(totals.testNet - totals.curNet).split('.')[0];

    if (typeof window._ltvCacheLength === 'undefined') window._ltvCacheLength = -1;
    if (typeof window._ltvCachedRepeatRate === 'undefined') window._ltvCachedRepeatRate = 0;
    if (typeof window._ltvCachedAvg === 'undefined') window._ltvCachedAvg = 0;

    if (typeof salesDB !== 'undefined' && Array.isArray(salesDB) && salesDB.length !== window._ltvCacheLength) {
        let ltvNetSum = 0;
        window._ltvCustomerMap = {};

        salesDB.forEach(s => {
            let qty = parseFloat(s.qty_sold) || 1;
            let cogs = (typeof getEngineTrueCogs === 'function') ? getEngineTrueCogs(s.internal_recipe_name || s.item_name) * qty : 0;
            let rev = parseFloat(s.total_received) || 0;
            let shp = parseFloat(s.shipping_paid) || 0;
            let stf = (rev * 0.029) + 0.30;
            let net = rev - (cogs + shp + stf);
            ltvNetSum += net;

            let h = s.customer_email_hash || s.customer_phone_hash;
            if (h && h.trim() !== '') {
                if (!window._ltvCustomerMap[h]) {
                    window._ltvCustomerMap[h] = { orders: 0, orderIds: new Set(), totalNet: 0, transactions: [] };
                }
                if (s.order_id) {
                    if (!window._ltvCustomerMap[h].orderIds.has(s.order_id)) {
                        window._ltvCustomerMap[h].orders += 1;
                        window._ltvCustomerMap[h].orderIds.add(s.order_id);
                    }
                } else {
                    window._ltvCustomerMap[h].orders += 1;
                }
                window._ltvCustomerMap[h].totalNet += net;
                window._ltvCustomerMap[h].transactions.push({
                    order_id: s.order_id || 'N/A',
                    date: s.sale_date || s.date || 'Unknown',
                    item: s.internal_recipe_name || s.item_name || 'Item',
                    total: rev,
                    net: net
                });
            }
        });

        let totalUniqueHashes = Object.keys(window._ltvCustomerMap).length;
        let repeatBuyers = Object.values(window._ltvCustomerMap).filter(c => c.orders > 1).length;

        window._ltvCachedRepeatRate = totalUniqueHashes > 0 ? (repeatBuyers / totalUniqueHashes) * 100 : 0;
        window._ltvCachedAvg = totalUniqueHashes > 0 ? (ltvNetSum / totalUniqueHashes) : 0;
        window._ltvCacheLength = salesDB.length;
    }

    let elKpiRepeat = document.getElementById('kpiRepeatRate');
    if(elKpiRepeat) elKpiRepeat.innerText = window._ltvCachedRepeatRate.toFixed(1) + "%";

    let elKpiLTV = document.getElementById('kpiAvgLTV');
    if(elKpiLTV) elKpiLTV.innerText = ceoFmt.format(window._ltvCachedAvg).split('.')[0];
}

function _updateCeoCharts({ totals, charts }) {
    let rem1 = totals.gross - totals.cogs;
    let rem2 = rem1 - totals.stripe;
    let rem3 = rem2 - totals.ship;
    let remWarr = rem3 - totals.warr;
    let remAff = remWarr - totals.aff;
    let rem4 = remAff - totals.cac;

    if(ceoWaterfallChart) {
        ceoWaterfallChart.data.datasets[0].data = [
            { x: 'Gross Sales', y: totals.gross, base: 0 },
            { x: 'COGS', y: totals.gross, base: rem1 },
            { x: 'Stripe', y: rem1, base: rem2 },
            { x: 'Shipping', y: rem2, base: rem3 },
            { x: 'Warranty', y: rem3, base: remWarr },
            { x: 'Affiliate', y: remWarr, base: remAff },
            { x: 'Ads (CAC)', y: remAff, base: rem4 },
            { x: 'Net Profit', y: Math.max(0, totals.testNet), base: 0 }
        ];
        ceoWaterfallChart.update();
    }

    if(ceoExpenseChart) {
        ceoExpenseChart.data.datasets[0].data = [totals.cogs, totals.cac, totals.curAff, totals.curWarr, totals.ship, totals.curStripe, Math.max(0, totals.curNet)];
        ceoExpenseChart.data.datasets[1].data = [totals.cogs, totals.cac, totals.aff, totals.warr, totals.ship, totals.stripe, Math.max(0, totals.testNet)];
        ceoExpenseChart.update();
    }

    if(ceoUnitChart) {
        ceoUnitChart.data.labels = charts.labels;
        ceoUnitChart.data.datasets[0].data = charts.curNetData;
        ceoUnitChart.data.datasets[1].data = charts.testNetData;
        ceoUnitChart.update();
    }

    const colors = ['#8b5cf6', '#ef4444', '#facc15', '#f59e0b', '#3b82f6', '#06b6d4', '#00ff66'];
    const labels = ['COGS', 'CAC', 'Affil', 'Warr', 'Ship', 'Stripe', 'Net'];
    if(ceoEfficiencyChart) {
        ceoEfficiencyChart.data.labels = charts.labels;
        ceoEfficiencyChart.data.datasets = labels.map((l, i) => ({ label: l, data: charts.eff.map(row => row[i]), backgroundColor: colors[i] }));
        ceoEfficiencyChart.update();
    }

    if(ceoCurEfficiencyChart) {
        ceoCurEfficiencyChart.data.labels = charts.labels;
        ceoCurEfficiencyChart.data.datasets = labels.map((l, i) => ({ label: l, data: charts.curEff.map(row => row[i]), backgroundColor: colors[i] }));
        ceoCurEfficiencyChart.update();
    }
}
document.addEventListener('DOMContentLoaded', () => {
    ['globalCac', 'globalAff', 'globalWarr'].forEach(id => {
        const s = document.getElementById(id + 'Slider');
        const n = document.getElementById(id + 'Num');
        if(s && n) {
            s.value = 0; n.value = 0;
            s.addEventListener('input', () => { n.value = s.value; updateCeoEngine(); });
            n.addEventListener('input', () => { s.value = n.value; updateCeoEngine(); });
        }
    });
});

function removeCeoProduct(idx) { ceoActiveProducts.splice(idx, 1); renderCeoTerminal(); }

// --- UNIFIED ANALYSIS BUILDER MODAL ---
function openCeoAddModal() {
    // Clear inputs
    document.getElementById('ceo-u-custom-name').value = '';
    document.getElementById('ceo-u-custom-cogs').value = '';
    document.getElementById('ceo-u-custom-msrp').value = '';
    document.getElementById('ceo-u-bundle-name').value = '';
    document.getElementById('ceo-u-search').value = '';

    renderUnifiedBuilderTable();
    document.getElementById('ceoAddModal').style.display = 'flex';
}

function renderUnifiedBuilderTable() {
    let availableRetail = Object.keys(productsDB).filter(k => !isSubassemblyDB[k] && !(productsDB[k] && productsDB[k].is_3d_print) && !(productsDB[k] && productsDB[k].is_label)).sort();
    let html = `<table id="ceoUnifiedBuilderTable" style="width:100%; border-collapse:collapse; font-size:13px;">
        <thead style="position:sticky; top:0; background:var(--bg-panel); z-index:10; box-shadow:0 2px 5px rgba(0,0,0,0.5);">
            <tr>
                <th style="padding:10px; text-align:left; border-bottom:1px solid var(--border-color);">QTY</th>
                <th style="padding:10px; text-align:left; border-bottom:1px solid var(--border-color);">PRODUCT NAME</th>
                <th style="padding:10px; text-align:left; border-bottom:1px solid var(--border-color);">BASE COGS</th>
                <th style="padding:10px; text-align:left; border-bottom:1px solid var(--border-color);">LIVE MSRP</th>
            </tr>
        </thead>
        <tbody>`;

    // 1. Session Test Items (Highest priority)
    window.ceoSessionTestItems.forEach((p, idx) => {
        html += `<tr class="u-builder-row" style="border-bottom:1px solid var(--border-color); background:rgba(139, 92, 246, 0.05);">
            <td style="padding:8px;"><input type="number" class="u-qty" data-name="${p.name}" data-cogs="${p.cogs}" data-msrp="${p.msrp}" min="0" step="1" value="0" style="width:50px; padding:4px;"></td>
            <td class="u-name" style="padding:8px; color:#a78bfa; font-weight:bold;">${p.name}</td>
            <td style="padding:8px;">${ceoFmt.format(p.cogs)}</td>
            <td style="padding:8px;">${ceoFmt.format(p.msrp)}</td>
        </tr>`;
    });

    // 2. Catalog Products
    availableRetail.forEach(k => {
        let c = getEngineTrueCogs(k); let m = getEngineLiveMsrp(k);
        html += `<tr class="u-builder-row" style="border-bottom:1px solid var(--border-color);">
            <td style="padding:8px;"><input type="number" class="u-qty" data-name="${k}" data-cogs="${c}" data-msrp="${m}" min="0" step="1" value="0" style="width:50px; padding:4px;"></td>
            <td class="u-name" style="padding:8px;">${k}</td>
            <td style="padding:8px;">${ceoFmt.format(c)}</td>
            <td style="padding:8px;">${ceoFmt.format(m)}</td>
        </tr>`;
    });

    html += `</tbody></table>`;
    document.getElementById('ceoUnifiedTableWrap').innerHTML = html;
}

function addCeoSessionTestItem() {
    let raw = document.getElementById('ceo-u-custom-name').value.trim();
    if(!raw) return alert("Enter item name.");
    let iName = "🧪 " + raw;
    if(window.ceoSessionTestItems.some(p => p.name === iName)) return alert("Test item name taken.");

    let c = parseFloat(document.getElementById('ceo-u-custom-cogs').value) || 0;
    let m = parseFloat(document.getElementById('ceo-u-custom-msrp').value) || 0;

    window.ceoSessionTestItems.unshift({ name: iName, cogs: c, msrp: m });
    renderUnifiedBuilderTable();

    // Clear custom inputs
    document.getElementById('ceo-u-custom-name').value = '';
    document.getElementById('ceo-u-custom-cogs').value = '';
    document.getElementById('ceo-u-custom-msrp').value = '';
}

function filterUnifiedBuilderList() {
    let f = document.getElementById('ceo-u-search').value.toLowerCase();
    document.querySelectorAll('.u-builder-row').forEach(r => {
        let n = r.querySelector('.u-name').innerText.toLowerCase();
        r.style.display = n.includes(f) ? '' : 'none';
    });
}

function addCeoUnifiedSelection() {
    let selections = [];
    document.querySelectorAll('.u-qty').forEach(btn => {
        let q = parseInt(btn.value) || 0;
        if(q > 0) {
            selections.push({ name: btn.dataset.name, qty: q, cogs: parseFloat(btn.dataset.cogs), msrp: parseFloat(btn.dataset.msrp) });
        }
    });

    if(selections.length === 0) return alert("Please select quantities for at least one item.");

    let bNameRaw = document.getElementById('ceo-u-bundle-name').value.trim();

    if(bNameRaw) {
        // Create as BUNDLE
        let finalName = "📦 " + bNameRaw;
        let tCogs = 0; let tMsrp = 0;
        selections.forEach(s => { tCogs += s.qty * s.cogs; tMsrp += s.qty * s.msrp; });

        ceoActiveProducts.push({ name: finalName, isBundle:true, applyCac:false, applyAff:false, applyWarr:false, currentMsrp: tMsrp, testMsrp: tMsrp, cogs: tCogs, vol: 0 });
    } else {
        // Add INDIVIDUALLY
        selections.forEach(s => {
            // If already on board, maybe skip or alert? I'll allow duplicates for now or use unique naming
            let baseName = s.name;
            if(ceoActiveProducts.some(p => p.name === baseName)) {
                alert(`Note: ${baseName} is already on the board. Skipping duplicate add.`);
                return;
            }
            ceoActiveProducts.push({ name: baseName, isBundle:false, applyCac:false, applyAff:false, applyWarr:false, currentMsrp: s.msrp, testMsrp: s.msrp, cogs: s.cogs, vol: 0 });
        });
    }

    document.getElementById('ceoAddModal').style.display = 'none';
    renderCeoTerminal();
}

// --- LTV MODAL LOGIC ---
window._ltvSortKey = window._ltvSortKey || 'net';
window._ltvSortAsc = window._ltvSortAsc !== undefined ? window._ltvSortAsc : false;

function sortLtvModal(key) {
    if (window._ltvSortKey === key) {
        window._ltvSortAsc = !window._ltvSortAsc;
    } else {
        window._ltvSortKey = key;
        window._ltvSortAsc = false;
    }
    renderLtvWhalesTable();
}

function renderLtvWhalesTable() {
    let tBody = document.getElementById('ltv-whales-tbody');
    if (!tBody || !window._ltvCachedWhales) return;

    window._ltvCachedWhales.sort((a,b) => {
        let valA = a[window._ltvSortKey];
        let valB = b[window._ltvSortKey];
        if (typeof valA === 'string' && typeof valB === 'string') {
            return window._ltvSortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        if (valA < valB) return window._ltvSortAsc ? -1 : 1;
        if (valA > valB) return window._ltvSortAsc ? 1 : -1;
        return 0;
    });

    let html = '';
    
    if (window._ltvCachedWhales.length === 0) {
        html = '<tr><td colspan="5" style="text-align:center; padding:20px; color:#666;">No historical repeat transactions found.</td></tr>';
    } else {
        window._ltvCachedWhales.forEach(w => {
            html += `
            <tr class="group" style="border-bottom:1px solid var(--border-color); background:rgba(139, 92, 246, 0.05); transition:background 0.2s;">
                <td style="padding:12px 15px; font-family:'JetBrains Mono', monospace; font-size:12px; color:#a78bfa;">${w.order_id}</td>
                <td style="padding:12px 15px; color:#cbd5e1; font-size:12px;">${new Date(w.date).toLocaleDateString()}</td>
                <td style="padding:12px 15px; color:white; font-size:12px; font-weight:bold;">${w.item}</td>
                <td style="padding:12px 15px; color:white; font-weight:bold; text-align:right;">${ceoFmt.format(w.total)}</td>
                <td style="padding:12px 15px; font-weight:bold; color:${w.net < 0 ? '#ef4444' : 'var(--neon-green)'}; text-align:right;">${ceoFmt.format(w.net)}</td>
            </tr>`;
        });
    }
    tBody.innerHTML = html;
}

function openLtvModal() {
    let map = window._ltvCustomerMap || {};
    let hashes = Object.keys(map);

    // Distribution
    let distribution = { 1: 0, 2: 0, 3: 0 };
    window._ltvCachedWhales = [];

    hashes.forEach(h => {
        let orderCount = map[h].orders;
        if (orderCount === 1) distribution[1]++;
        else if (orderCount === 2) distribution[2]++;
        else distribution[3]++;

        // Unroll individual repeat-purchaser transactions
        if (orderCount > 1 && map[h].transactions) {
            map[h].transactions.forEach(t => {
                window._ltvCachedWhales.push({
                    order_id: t.order_id,
                    date: t.date,
                    item: t.item,
                    total: t.total,
                    net: t.net
                });
            });
        }
    });

    // Update UI DOM Elements
    let elTotal = document.getElementById('ltv-dist-total');
    let elOne = document.getElementById('ltv-dist-1');
    let elTwo = document.getElementById('ltv-dist-2');
    let elPlus = document.getElementById('ltv-dist-plus');

    if(elTotal) elTotal.innerText = hashes.length;
    if(elOne) elOne.innerText = distribution[1];
    if(elTwo) elTwo.innerText = distribution[2];
    if(elPlus) elPlus.innerText = distribution[3];

    renderLtvWhalesTable();

    let modal = document.getElementById('ltv-metrics-modal');
    if (modal) modal.style.display = 'flex';
}

function closeLtvModal() {
    let modal = document.getElementById('ltv-metrics-modal');
    if (modal) modal.style.display = 'none';
}

// --- CEO Terminal Global Event Delegation ---
document.addEventListener('click', (e) => {
    try {
        if (e.target.closest('#btn-open-ceo-add-modal')) openCeoAddModal();
        
        const toggleBtn = e.target.closest('.ceo-toggle-btn');
        if (toggleBtn) {
            let idx = toggleBtn.getAttribute('data-toggle-idx');
            let prop = toggleBtn.getAttribute('data-toggle-prop');
            if (idx !== null && prop) toggleCeoBtn(parseInt(idx), prop);
        }
        
        const removeBtn = e.target.closest('.ceo-remove-btn');
        if (removeBtn) {
            let idx = removeBtn.getAttribute('data-remove-idx');
            if (idx !== null) removeCeoProduct(parseInt(idx));
        }
        
        const sortTh = e.target.closest('th[data-ceosort]');
        if (sortTh) {
            let key = sortTh.getAttribute('data-ceosort');
            if (key) sortCeoTable(key);
        }
        
        const ltvTh = e.target.closest('th[data-ltvsort]');
        if (ltvTh) {
            let key = ltvTh.getAttribute('data-ltvsort');
            if (key) sortLtvModal(key);
        }
    } catch (err) { }
});

document.addEventListener('change', (e) => {
    try {
        const testMsrpInput = e.target.closest('.ceo-test-msrp-listen');
        if (testMsrpInput) updateCeoEngine();
    } catch (err) { }
});

document.addEventListener('input', (e) => {
    try {
        const volInput = e.target.closest('.ceo-vol-listen');
        if (volInput) {
            let idx = volInput.getAttribute('data-vol-idx');
            let dup = document.getElementById(`ceo-vol-${idx}`);
            if(dup) dup.value = volInput.value;
            updateCeoEngine();
        }
    } catch (err) { }
});

document.addEventListener('dragstart', (e) => {
    const sliderGroup = e.target.closest('.ceo-slider-group');
    if (sliderGroup) {
        let idx = sliderGroup.getAttribute('data-slider-idx');
        if (idx !== null) ceoDragStart(e, parseInt(idx));
    }
});
document.addEventListener('dragover', (e) => {
    const sliderGroup = e.target.closest('.ceo-slider-group');
    if (sliderGroup) ceoDragOver(e);
});
document.addEventListener('drop', (e) => {
    const sliderGroup = e.target.closest('.ceo-slider-group');
    if (sliderGroup) {
        let idx = sliderGroup.getAttribute('data-slider-idx');
        if (idx !== null) ceoDrop(e, parseInt(idx));
    }
});
document.addEventListener('dragend', (e) => {
    const sliderGroup = e.target.closest('.ceo-slider-group');
    if (sliderGroup) ceoDragEnd(e);
});
