// --- CEO TERMINAL: OPERATION APEX ---

let ceoExpenseChart, ceoProfitChart, ceoUnitChart, ceoEfficiencyChart, ceoLineChart;
const ceoFmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

const ceoBaseMatrix = [
    { id: 'soulz', name: "SOULZ", oldPrice: 129.99, newPrice: 149.99, aff: 0, warranty: 0, wePayShipOld: false, wePayShipNew: true, applyCac: true },
    { id: 'railz', name: "RAILZ", oldPrice: 99.99, newPrice: 119.99, aff: 0, warranty: 0, wePayShipOld: false, wePayShipNew: true, applyCac: true },
    { id: 'haloz', name: "HALOZ", oldPrice: 79.99, newPrice: 89.99, aff: 0, warranty: 0, wePayShipOld: false, wePayShipNew: true, applyCac: true },
    { id: 'beamz', name: "BEAMZ Only", oldPrice: 29.99, newPrice: 34.99, aff: 0, warranty: 0, wePayShipOld: false, wePayShipNew: false, applyCac: false },
    { id: 'clipz', name: "CLIPZ Only", oldPrice: 11.99, newPrice: 15.99, aff: 0, warranty: 0, wePayShipOld: false, wePayShipNew: false, applyCac: false },
    { id: 'trap', name: "98¢ TRAP", oldPrice: 41.98, newPrice: 50.98, aff: 0, warranty: 0, wePayShipOld: false, wePayShipNew: true, applyCac: true }
];

let ceoActiveProducts = [];

function get30DayVolume(productName) {
    try {
        if(typeof salesDB === 'undefined' || !salesDB || !Array.isArray(salesDB)) return 30; 
        let thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        let vol = 0;
        salesDB.forEach(sale => {
            let saleDate = new Date(sale.sale_date);
            if (saleDate >= thirtyDaysAgo) {
                if(sale.internal_recipe_name && sale.internal_recipe_name.toUpperCase().includes(productName.toUpperCase().replace(" ONLY", ""))) {
                    vol += (parseFloat(sale.qty_sold) || 0);
                }
            }
        });
        return vol > 0 ? vol : 30; 
    } catch (e) { return 30; }
}

function initCeoCharts() {
    Chart.defaults.color = '#e0e0e0'; Chart.defaults.font.family = "'JetBrains Mono', monospace"; Chart.defaults.font.size = 11; 
    if(ceoExpenseChart) ceoExpenseChart.destroy(); if(ceoProfitChart) ceoProfitChart.destroy();
    if(ceoUnitChart) ceoUnitChart.destroy(); if(ceoEfficiencyChart) ceoEfficiencyChart.destroy(); if(ceoLineChart) ceoLineChart.destroy();

    ceoExpenseChart = new Chart(document.getElementById('expenseChart'), {
        type: 'bar', plugins: [ChartDataLabels],
        data: { labels: ['True COGS', 'Market', 'Affil', 'Warr', 'Logis', 'Fees', 'Net'], datasets: [{ data: [0,0,0,0,0,0,0], backgroundColor: ['#333', '#ff0033', '#ffcc00', '#ff9900', '#00e5ff', '#aaaaaa', '#00ff66'], borderRadius: 4 }] },
        options: { responsive: true, maintainAspectRatio: false, layout: { padding: { top: 25 } }, plugins: { legend: { display: false }, datalabels: { color: '#fff', anchor: 'end', align: 'top', font: { weight: 'bold' }, formatter: function(v, c) { let t = c.chart.data.totalGross || 1; if (v <= 0) return ''; return ceoFmt.format(v).split('.')[0] + '\n(' + ((v/t)*100).toFixed(1) + '%)'; }, textAlign: 'center' } }, scales: { x: { grid: { display: false } }, y: { display: false } } }
    });

    ceoProfitChart = new Chart(document.getElementById('profitChart'), { type: 'doughnut', data: { labels: [], datasets: [{ data: [], backgroundColor: ['#00ff66', '#00e5ff', '#ffcc00', '#ff0033', '#ffffff'], borderWidth: 0 }] }, options: { responsive: true, maintainAspectRatio: false, cutout: '65%', plugins: { legend: { position: 'right' } } } });
    ceoUnitChart = new Chart(document.getElementById('unitChart'), { type: 'bar', data: { labels: [], datasets: [{label: 'Old Net', backgroundColor: '#ff0033', data: []}, {label: 'Final Net', backgroundColor: '#00ff66', data: []}] }, options: { responsive: true, maintainAspectRatio: false, scales: { y: { grid: {color:'#222'} } }, plugins: { legend: { position: 'bottom' } } } });
    ceoEfficiencyChart = new Chart(document.getElementById('efficiencyChart'), { type: 'bar', data: { labels: [], datasets: [] }, options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, scales: { x: { stacked: true, max: 100, ticks: { callback: v => v+'%' }, grid: {color: '#222'} }, y: { stacked: true, grid: {display: false} } }, plugins: { legend: { position: 'bottom' }, tooltip: { callbacks: { label: c => c.dataset.label + ': ' + c.raw.toFixed(1) + '%' } } } } });
    ceoLineChart = new Chart(document.getElementById('lineChart'), { type: 'line', data: { labels: ['Current Vol', '2x Scale', '5x Scale', '10x Scale'], datasets: [] }, options: { responsive: true, maintainAspectRatio: false, scales: { y: { grid: {color:'#222'} } }, plugins: { legend: { position: 'bottom' } } } });
}

function renderCeoTerminal() {
    sysLog("Booting CEO Terminal...");
    try {
        ceoActiveProducts = ceoBaseMatrix.map(base => {
            let searchName = base.name.replace(" Only", "").toUpperCase();
            let liveCogs = 0; let liveMsrp = base.newPrice;
            
            if (typeof productsDB !== 'undefined' && productsDB) {
                let matchedKey = Object.keys(productsDB).find(k => k.toUpperCase().includes(searchName));
                
                if (matchedKey) {
                    // Pull Live MSRP directly from Database
                    if (productsDB[matchedKey].msrp) liveMsrp = parseFloat(productsDB[matchedKey].msrp) || liveMsrp;
                    
                    // Pull TRUE COGS from Database
                    if (productsDB[matchedKey].cogs) {
                        liveCogs = parseFloat(productsDB[matchedKey].cogs);
                    } else if (typeof calculateProductTotal === 'function') {
                        liveCogs = calculateProductTotal(matchedKey);
                    }
                } else if (base.id === 'trap') {
                    // Logic for the Trap
                    let bKey = Object.keys(productsDB).find(k => k.toUpperCase().includes("BEAMZ"));
                    let cKey = Object.keys(productsDB).find(k => k.toUpperCase().includes("CLIPZ"));
                    
                    if(bKey && productsDB[bKey].msrp && cKey && productsDB[cKey].msrp) {
                        liveMsrp = parseFloat(productsDB[bKey].msrp) + parseFloat(productsDB[cKey].msrp);
                    }
                    if(bKey && productsDB[bKey].cogs) liveCogs += parseFloat(productsDB[bKey].cogs);
                    if(cKey && productsDB[cKey].cogs) liveCogs += parseFloat(productsDB[cKey].cogs);
                } else {
                    liveCogs = base.cogs || 10;
                }
            }
            return { ...base, newPrice: liveMsrp, cogs: liveCogs, vol: get30DayVolume(base.name) };
        });

        let slidersHtml = '';
        ceoActiveProducts.forEach(p => {
            let isTrap = p.id === 'trap';
            let bgStyle = isTrap ? 'padding: 10px; border-radius: 4px; border: 1px solid rgba(0,229,255,0.3); background: rgba(0, 229, 255, 0.05);' : '';
            let titleColor = isTrap ? 'color: var(--neon-cyan);' : '';
            
            slidersHtml += `
            <div class="ceo-slider-group" style="${bgStyle}">
                <div class="ceo-slider-label">
                    <span style="display:flex; align-items:center; ${titleColor}">${p.name} <label class="ceo-cac-toggle"><input type="checkbox" id="ceo-cb-${p.id}" ${p.applyCac ? 'checked' : ''} onchange="updateCeoEngine()"> Ads</label></span>
                    <input type="number" id="ceo-vol-${p.id}-num" class="ceo-sync-input" value="${p.vol}" oninput="document.getElementById('ceo-vol-${p.id}').value=this.value; updateCeoEngine();">
                </div>
                <input type="range" id="ceo-vol-${p.id}" min="0" max="2000" step="1" value="${p.vol}" oninput="document.getElementById('ceo-vol-${p.id}-num').value=this.value; updateCeoEngine();">
            </div>`;
        });
        
        document.getElementById('ceo-dynamic-sliders').innerHTML = slidersHtml;

        initCeoCharts();
        updateCeoEngine();
        sysLog("CEO Terminal Active.");
    } catch (error) { sysLog("CEO ERROR: " + error.message, true); }
}

function updateCeoEngine() {
    try {
        const CC_RATE = 0.029, CC_FLAT = 0.30, SHIP_COST = 8.00;
        let globalCac = parseFloat(document.getElementById('cacNum').value) || 0;
        
        let totalGross = 0, totalOldNet = 0, totalNewNet = 0;
        let aggCogs = 0, aggStripe = 0, aggAff = 0, aggWarranty = 0, aggShip = 0, aggCac = 0;
        
        let pLabels = [], pData = [], uLabels = [], uOld = [], uNew = [];
        let effLabels=[], effCogs=[], effCac=[], effAff=[], effWarr=[], effLog=[], effStripe=[], effNet=[];

        let tableHtml = '';

        ceoActiveProducts.forEach(p => {
            let volInput = document.getElementById(`ceo-vol-${p.id}-num`); let vol = volInput ? (parseInt(volInput.value) || 0) : 0;
            let cb = document.getElementById(`ceo-cb-${p.id}`); p.applyCac = cb ? cb.checked : p.applyCac;
            let oldPriceInput = document.getElementById(`ceo-oldmsrp-${p.id}`); p.oldPrice = oldPriceInput ? parseFloat(oldPriceInput.value) || 0 : p.oldPrice;
            let msrpInput = document.getElementById(`ceo-msrp-${p.id}`); p.newPrice = msrpInput ? parseFloat(msrpInput.value) || 0 : p.newPrice;
            let affInput = document.getElementById(`ceo-aff-${p.id}`); p.aff = affInput ? parseFloat(affInput.value) || 0 : p.aff;
            let warrInput = document.getElementById(`ceo-warr-${p.id}`); p.warranty = warrInput ? parseFloat(warrInput.value) || 0 : p.warranty;

            let effectiveCac = p.applyCac ? globalCac : 0; 
            let oldCustPays = p.oldPrice + (p.wePayShipOld ? 0 : SHIP_COST);
            let newCustPays = p.newPrice + (p.wePayShipNew ? 0 : SHIP_COST);

            let ccBaseNew = p.wePayShipNew ? p.newPrice : p.newPrice + SHIP_COST;
            let ccFeeNew = (ccBaseNew * CC_RATE) + CC_FLAT;
            let affFeeNew = p.newPrice * (p.aff / 100);
            let shipFeeNew = p.wePayShipNew ? SHIP_COST : 0;
            let warrantyNew = p.newPrice * (p.warranty / 100);
            
            // Labor completely removed from math
            let newNet = p.newPrice - p.cogs - ccFeeNew - affFeeNew - shipFeeNew - warrantyNew - effectiveCac;

            let ccBaseOld = p.wePayShipOld ? p.oldPrice : p.oldPrice + SHIP_COST;
            let ccFeeOld = (ccBaseOld * CC_RATE) + CC_FLAT;
            let affFeeOld = p.oldPrice * (p.aff / 100);
            let shipFeeOld = p.wePayShipOld ? SHIP_COST : 0;
            let warrantyOld = p.oldPrice * (p.warranty / 100);
            let oldNet = p.oldPrice - p.cogs - ccFeeOld - affFeeOld - shipFeeOld - warrantyOld - effectiveCac;

            totalGross += (p.newPrice * vol);
            totalOldNet += (oldNet * vol);
            totalNewNet += (newNet * vol);
            aggCogs += (p.cogs * vol); aggStripe += (ccFeeNew * vol); aggAff += (affFeeNew * vol); 
            aggWarranty += (warrantyNew * vol); aggShip += (shipFeeNew * vol); aggCac += (effectiveCac * vol);

            if(vol > 0 && newNet > 0) { pLabels.push(p.name); pData.push(newNet * vol); }
            uLabels.push(p.name.split(' ')[0]); uOld.push(oldNet); uNew.push(newNet);

            effLabels.push(p.name); let base = p.newPrice || 1; 
            effCogs.push((p.cogs / base) * 100); effCac.push((effectiveCac / base) * 100); effAff.push((affFeeNew / base) * 100);
            effWarr.push((warrantyNew / base) * 100); effLog.push((shipFeeNew / base) * 100);
            effStripe.push((ccFeeNew / base) * 100); effNet.push((Math.max(0, newNet) / base) * 100);

            let isTrap = p.id === 'trap';
            let rowStyle = isTrap ? 'background: rgba(0, 229, 255, 0.05);' : (newNet < oldNet ? 'background: rgba(255, 0, 51, 0.1);' : '');
            let oldNetCls = oldNet < 0 ? 'val-red' : ''; let newNetCls = newNet < 0 ? 'val-red' : 'val-green';
            
            // Labor column completely deleted
            tableHtml += `
            <tr style="${rowStyle}">
                <td style="font-weight:bold;">${p.name}</td>
                <td><input type="number" id="ceo-msrp-${p.id}" class="ceo-table-input" value="${p.newPrice.toFixed(2)}" step="0.01" onchange="updateCeoEngine()"></td>
                <td><input type="number" id="ceo-oldmsrp-${p.id}" class="ceo-table-input" style="color:var(--neon-red); border-color:var(--neon-red);" value="${p.oldPrice.toFixed(2)}" step="0.01" onchange="updateCeoEngine()"></td>
                <td class="val-green">${ceoFmt.format(newCustPays)}</td>
                <td style="font-weight:700;">${ceoFmt.format(p.cogs)}</td>
                <td><input type="number" id="ceo-aff-${p.id}" class="ceo-table-input" value="${p.aff}" step="1" title="Affiliate %" onchange="updateCeoEngine()"></td>
                <td><input type="number" id="ceo-warr-${p.id}" class="ceo-table-input" value="${p.warranty}" step="0.5" title="Warranty Reserve %" onchange="updateCeoEngine()"></td>
                <td class="${oldNetCls}">${ceoFmt.format(oldNet)}</td>
                <td class="${newNetCls}" style="font-weight:900; font-size:0.9rem;">${ceoFmt.format(newNet)}</td>
            </tr>`;
        });

        document.getElementById('ceo-dynamic-table').innerHTML = tableHtml;

        document.getElementById('kpiGross').innerText = ceoFmt.format(totalGross).split('.')[0];
        document.getElementById('kpiOldNet').innerText = ceoFmt.format(totalOldNet).split('.')[0];
        document.getElementById('kpiOldNet').className = totalOldNet < 0 ? "ceo-kpi-value val-red" : "ceo-kpi-value val-green";
        document.getElementById('kpiNewNet').innerText = ceoFmt.format(totalNewNet).split('.')[0];
        document.getElementById('kpiNewNet').className = totalNewNet < 0 ? "ceo-kpi-value val-red" : "ceo-kpi-value val-green";

        let totalSaved = totalNewNet - totalOldNet;
        document.getElementById('kpiSaved').innerText = (totalSaved >= 0 ? "+" : "") + ceoFmt.format(totalSaved).split('.')[0];
        document.getElementById('kpiSaved').className = totalSaved < 0 ? "ceo-kpi-value val-red" : "ceo-kpi-value val-green";

        let oldMargin = totalGross > 0 ? (totalOldNet / totalGross) * 100 : 0;
        let newMargin = totalGross > 0 ? (totalNewNet / totalGross) * 100 : 0;
        let savedPct = totalOldNet !== 0 ? (totalSaved / Math.abs(totalOldNet)) * 100 : (totalSaved > 0 ? Infinity : 0);

        document.getElementById('kpiOldNetPct').innerText = oldMargin.toFixed(1) + "% Margin";
        document.getElementById('kpiOldNetPct').style.color = oldMargin < 0 ? 'var(--neon-red)' : 'var(--neon-yellow)';
        document.getElementById('kpiNewNetPct').innerText = newMargin.toFixed(1) + "% Margin";
        document.getElementById('kpiNewNetPct').style.color = newMargin < 0 ? 'var(--neon-red)' : 'var(--neon-green)';
        document.getElementById('kpiSavedPct').innerText = (savedPct > 0 ? '+' : '') + (savedPct === Infinity ? '∞' : savedPct.toFixed(1)) + "% vs Old";
        document.getElementById('kpiSavedPct').style.color = savedPct >= 0 ? 'var(--neon-green)' : 'var(--neon-red)';

        let expData = [aggCogs, aggCac, aggAff, aggWarranty, aggShip, aggStripe, Math.max(0, totalNewNet)];
        ceoExpenseChart.data.datasets[0].data = expData;
        ceoExpenseChart.data.totalGross = totalGross > 0 ? totalGross : 1;
        ceoExpenseChart.options.scales.y.suggestedMax = Math.max(...expData) * 1.30; 
        ceoExpenseChart.update();

        ceoProfitChart.data.labels = pLabels; ceoProfitChart.data.datasets[0].data = pData; ceoProfitChart.update();
        ceoUnitChart.data.labels = uLabels; ceoUnitChart.data.datasets[0].data = uOld; ceoUnitChart.data.datasets[1].data = uNew; ceoUnitChart.update();
        
        ceoEfficiencyChart.data.labels = effLabels;
        ceoEfficiencyChart.data.datasets = [
            { label: 'True COGS', data: effCogs, backgroundColor: '#333' }, { label: 'Market', data: effCac, backgroundColor: '#ff0033' },
            { label: 'Affil', data: effAff, backgroundColor: '#ffcc00' }, { label: 'Warr', data: effWarr, backgroundColor: '#ff9900' }, 
            { label: 'Logis', data: effLog, backgroundColor: '#00e5ff' }, { label: 'Fees', data: effStripe, backgroundColor: '#aaaaaa' }, 
            { label: 'Net Profit', data: effNet, backgroundColor: '#00ff66' }
        ];
        ceoEfficiencyChart.update();

        ceoLineChart.data.datasets = [
            { label: 'Old Trajectory', borderColor: '#ff0033', data: [totalOldNet, totalOldNet*2, totalOldNet*5, totalOldNet*10], tension: 0.3 },
            { label: 'New Trajectory', borderColor: '#00ff66', data: [totalNewNet, totalNewNet*2, totalNewNet*5, totalNewNet*10], tension: 0.3 }
        ];
        ceoLineChart.update();
    } catch (e) { sysLog("Engine Update Error: " + e.message, true); }
}

document.addEventListener('DOMContentLoaded', () => {
    const cacSlider = document.getElementById('cacSlider');
    const cacNum = document.getElementById('cacNum');
    if(cacSlider && cacNum) {
        cacSlider.addEventListener('input', () => { cacNum.value = cacSlider.value; updateCeoEngine(); });
        cacNum.addEventListener('input', () => { cacSlider.value = cacNum.value; updateCeoEngine(); });
    }
});
