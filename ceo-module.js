// --- CEO TERMINAL: OPERATION APEX (CURRENT VS TEST) ---

let ceoExpenseChart, ceoProfitChart, ceoUnitChart, ceoEfficiencyChart, ceoLineChart;
const ceoFmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

const ceoBaseMatrix = [
    { id: 'soulz', name: "SOULZ", applyCac: true },
    { id: 'railz', name: "RAILZ", applyCac: true },
    { id: 'haloz', name: "HALOZ", applyCac: true },
    { id: 'beamz', name: "BEAMZ Only", applyCac: false },
    { id: 'clipz', name: "CLIPZ Only", applyCac: false },
    { id: 'trap', name: "98¢ TRAP", applyCac: true }
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
        data: { labels: ['True COGS', 'Ads (CAC)', 'Affil', 'Warr', 'Shipping', 'Stripe', 'Test Net'], datasets: [{ data: [0,0,0,0,0,0,0], backgroundColor: ['#333', '#ff0033', '#ffcc00', '#ff9900', '#00e5ff', '#aaaaaa', '#00ff66'], borderRadius: 4 }] },
        options: { responsive: true, maintainAspectRatio: false, layout: { padding: { top: 25 } }, plugins: { legend: { display: false }, datalabels: { color: '#fff', anchor: 'end', align: 'top', font: { weight: 'bold' }, formatter: function(v, c) { let t = c.chart.data.totalGross || 1; if (v <= 0) return ''; return ceoFmt.format(v).split('.')[0] + '\n(' + ((v/t)*100).toFixed(1) + '%)'; }, textAlign: 'center' } }, scales: { x: { grid: { display: false } }, y: { display: false } } }
    });

    ceoProfitChart = new Chart(document.getElementById('profitChart'), { type: 'doughnut', data: { labels: [], datasets: [{ data: [], backgroundColor: ['#00ff66', '#00e5ff', '#ffcc00', '#b000ff', '#ff0033', '#ffffff'], borderWidth: 0 }] }, options: { responsive: true, maintainAspectRatio: false, cutout: '65%', plugins: { legend: { position: 'right' } } } });
    ceoUnitChart = new Chart(document.getElementById('unitChart'), { type: 'bar', data: { labels: [], datasets: [{label: 'Current Net', backgroundColor: '#aaaaaa', data: []}, {label: 'Test Net', backgroundColor: '#00ff66', data: []}] }, options: { responsive: true, maintainAspectRatio: false, scales: { y: { grid: {color:'#222'} } }, plugins: { legend: { position: 'bottom' } } } });
    ceoEfficiencyChart = new Chart(document.getElementById('efficiencyChart'), { type: 'bar', data: { labels: [], datasets: [] }, options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, scales: { x: { stacked: true, max: 100, ticks: { callback: v => v+'%' }, grid: {color: '#222'} }, y: { stacked: true, grid: {display: false} } }, plugins: { legend: { position: 'bottom' }, tooltip: { callbacks: { label: c => c.dataset.label + ': ' + c.raw.toFixed(1) + '%' } } } } });
    ceoLineChart = new Chart(document.getElementById('lineChart'), { type: 'line', data: { labels: ['Current Vol', '2x Scale', '5x Scale', '10x Scale'], datasets: [] }, options: { responsive: true, maintainAspectRatio: false, scales: { y: { grid: {color:'#222'} } }, plugins: { legend: { position: 'bottom' } } } });
}

function renderCeoTerminal() {
    sysLog("Booting CEO Terminal...");
    try {
        ceoActiveProducts = ceoBaseMatrix.map(base => {
            let liveCogs = 0; 
            let liveMsrp = 0; 

            // --- POWERED BY THE MASTER ENGINE ---
            if (base.id === 'trap') {
                liveMsrp = getEngineLiveMsrp("BEAMZ") + getEngineLiveMsrp("CLIPZ");
                liveCogs = getEngineTrueCogs("BEAMZ") + getEngineTrueCogs("CLIPZ");
            } else {
                liveMsrp = getEngineLiveMsrp(base.name);
                liveCogs = getEngineTrueCogs(base.name);
            }
            // ------------------------------------
            
            return { ...base, currentMsrp: liveMsrp, testMsrp: liveMsrp, cogs: liveCogs, vol: get30DayVolume(base.name), aff: 0, warr: 0 };
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
        // Asks the Master Engine for your global shipping cost!
        const SHIP_COST = typeof ENGINE_CONFIG !== 'undefined' ? ENGINE_CONFIG.flatShipping : 8.00; 
        
        let globalCac = parseFloat(document.getElementById('globalCacNum').value) || 0;
        
        let totalGross = 0, totalCurrentNet = 0, totalTestNet = 0;
        let aggCogs = 0, aggStripe = 0, aggAff = 0, aggWarranty = 0, aggShip = 0, aggCac = 0;
        
        let pLabels = [], pData = [], uLabels = [], uOld = [], uNew = [];
        let effLabels=[], effCogs=[], effCac=[], effAff=[], effWarr=[], effLog=[], effStripe=[], effNet=[];

        let tableHtml = '';

        ceoActiveProducts.forEach(p => {
            let volInput = document.getElementById(`ceo-vol-${p.id}-num`); let vol = volInput ? (parseInt(volInput.value) || 0) : 0;
            let cb = document.getElementById(`ceo-cb-${p.id}`); p.applyCac = cb ? cb.checked : p.applyCac;
            let testMsrpInput = document.getElementById(`ceo-testmsrp-${p.id}`); p.testMsrp = testMsrpInput ? parseFloat(testMsrpInput.value) || 0 : p.testMsrp;
            let affInput = document.getElementById(`ceo-aff-${p.id}`); p.aff = affInput ? parseFloat(affInput.value) || 0 : p.aff;
            let warrInput = document.getElementById(`ceo-warr-${p.id}`); p.warr = warrInput ? parseFloat(warrInput.value) || 0 : p.warr;

            let effectiveCac = p.applyCac ? globalCac : 0; 

            // --- CURRENT REALITY MATH (Powered by Engine) ---
            let curCustPays = p.currentMsrp + SHIP_COST; 
            let curStripeFee = getEngineStripeFee(curCustPays); 
            let curNet = p.currentMsrp - p.cogs - curStripeFee;

            // --- TEST SCENARIO MATH (Powered by Engine) ---
            let testCustPays = p.testMsrp + SHIP_COST; 
            let testStripeFee = getEngineStripeFee(testCustPays); 
            let testAffFee = p.testMsrp * (p.aff / 100);
            let testWarrFee = p.testMsrp * (p.warr / 100);
            let testNet = p.testMsrp - p.cogs - testStripeFee - SHIP_COST - testAffFee - testWarrFee - effectiveCac;

            let profitDelta = testNet - curNet;

            totalGross += (p.testMsrp * vol);
            totalCurrentNet += (curNet * vol);
            totalTestNet += (testNet * vol);
            
            aggCogs += (p.cogs * vol); 
            aggStripe += (testStripeFee * vol); 
            aggAff += (testAffFee * vol); 
            aggWarranty += (testWarrFee * vol); 
            aggShip += (SHIP_COST * vol); 
            aggCac += (effectiveCac * vol);

            if(vol > 0 && testNet > 0) { pLabels.push(p.name); pData.push(testNet * vol); }
            uLabels.push(p.name.split(' ')[0]); uOld.push(curNet); uNew.push(testNet);

            effLabels.push(p.name); let base = p.testMsrp || 1; 
            effCogs.push((p.cogs / base) * 100); effCac.push((effectiveCac / base) * 100); effAff.push((testAffFee / base) * 100);
            effWarr.push((testWarrFee / base) * 100); effLog.push((SHIP_COST / base) * 100);
            effStripe.push((testStripeFee / base) * 100); effNet.push((Math.max(0, testNet) / base) * 100);

            let isTrap = p.id === 'trap';
            let rowStyle = isTrap ? 'background: rgba(0, 229, 255, 0.05);' : (testNet < curNet ? 'background: rgba(255, 0, 51, 0.1);' : '');
            let deltaCls = profitDelta < 0 ? 'val-red' : 'val-green';
            let testNetCls = testNet < 0 ? 'val-red' : 'val-green';
            
            tableHtml += `
            <tr style="${rowStyle}">
                <td style="font-weight:bold;">${p.name}</td>
                <td style="font-weight:700;">${ceoFmt.format(p.cogs)}</td>
                <td style="color:#888;">${ceoFmt.format(p.currentMsrp)}</td>
                <td style="color:#888;">-${ceoFmt.format(curStripeFee)}</td>
                <td style="color:#ccc;">${ceoFmt.format(curNet)}</td>
                
                <td style="border-left:2px solid #444; padding-left:15px;"><input type="number" id="ceo-testmsrp-${p.id}" class="ceo-table-input" style="color:var(--neon-cyan); border-color:var(--neon-cyan);" value="${p.testMsrp.toFixed(2)}" step="0.01" onchange="updateCeoEngine()"></td>
                <td style="color:#888;">-${ceoFmt.format(testStripeFee)}</td>
                <td style="color:#888;">-${ceoFmt.format(SHIP_COST)}</td>
                <td><input type="number" id="ceo-aff-${p.id}" class="ceo-table-input" style="width:50px;" value="${p.aff}" step="1" onchange="updateCeoEngine()"></td>
                <td><input type="number" id="ceo-warr-${p.id}" class="ceo-table-input" style="width:50px;" value="${p.warr}" step="0.5" onchange="updateCeoEngine()"></td>
                <td class="${testNetCls}" style="font-weight:900; font-size:0.9rem;">${ceoFmt.format(testNet)}</td>
                <td class="${deltaCls}" style="font-weight:bold;">${profitDelta > 0 ? '+' : ''}${ceoFmt.format(profitDelta)}</td>
            </tr>`;
        });

        document.getElementById('ceo-dynamic-table').innerHTML = tableHtml;

        document.getElementById('kpiGross').innerText = ceoFmt.format(totalGross).split('.')[0];
        document.getElementById('kpiOldNet').innerText = ceoFmt.format(totalCurrentNet).split('.')[0];
        document.getElementById('kpiOldNet').className = totalCurrentNet < 0 ? "ceo-kpi-value val-red" : "ceo-kpi-value val-yellow";
        document.getElementById('kpiNewNet').innerText = ceoFmt.format(totalTestNet).split('.')[0];
        document.getElementById('kpiNewNet').className = totalTestNet < 0 ? "ceo-kpi-value val-red" : "ceo-kpi-value val-green";

        let totalSaved = totalTestNet - totalCurrentNet;
        document.getElementById('kpiSaved').innerText = (totalSaved >= 0 ? "+" : "") + ceoFmt.format(totalSaved).split('.')[0];
        document.getElementById('kpiSaved').className = totalSaved < 0 ? "ceo-kpi-value val-red" : "ceo-kpi-value val-green";

        let oldMargin = totalGross > 0 ? (totalCurrentNet / totalGross) * 100 : 0;
        let newMargin = totalGross > 0 ? (totalTestNet / totalGross) * 100 : 0;
        
        document.getElementById('kpiOldNetPct').innerText = oldMargin.toFixed(1) + "% Margin";
        document.getElementById('kpiNewNetPct').innerText = newMargin.toFixed(1) + "% Margin";
        document.getElementById('kpiNewNetPct').style.color = newMargin < 0 ? 'var(--neon-red)' : 'var(--neon-green)';

        let expData = [aggCogs, aggCac, aggAff, aggWarranty, aggShip, aggStripe, Math.max(0, totalTestNet)];
        ceoExpenseChart.data.datasets[0].data = expData;
        ceoExpenseChart.data.totalGross = totalGross > 0 ? totalGross : 1;
        ceoExpenseChart.options.scales.y.suggestedMax = Math.max(...expData) * 1.30; 
        ceoExpenseChart.update();

        ceoProfitChart.data.labels = pLabels; ceoProfitChart.data.datasets[0].data = pData; ceoProfitChart.update();
        ceoUnitChart.data.labels = uLabels; ceoUnitChart.data.datasets[0].data = uOld; ceoUnitChart.data.datasets[1].data = uNew; ceoUnitChart.update();
        
        ceoEfficiencyChart.data.labels = effLabels;
        ceoEfficiencyChart.data.datasets = [
            { label: 'True COGS', data: effCogs, backgroundColor: '#333' }, { label: 'Ads (CAC)', data: effCac, backgroundColor: '#ff0033' },
            { label: 'Affil', data: effAff, backgroundColor: '#ffcc00' }, { label: 'Warr', data: effWarr, backgroundColor: '#ff9900' }, 
            { label: 'Shipping', data: effLog, backgroundColor: '#00e5ff' }, { label: 'Stripe', data: effStripe, backgroundColor: '#aaaaaa' }, 
            { label: 'Test Net', data: effNet, backgroundColor: '#00ff66' }
        ];
        ceoEfficiencyChart.update();

        ceoLineChart.data.datasets = [
            { label: 'Current Trajectory', borderColor: '#aaaaaa', data: [totalCurrentNet, totalCurrentNet*2, totalCurrentNet*5, totalCurrentNet*10], tension: 0.3 },
            { label: 'Test Trajectory', borderColor: '#00ff66', data: [totalTestNet, totalTestNet*2, totalTestNet*5, totalTestNet*10], tension: 0.3 }
        ];
        ceoLineChart.update();
    } catch (e) { sysLog("Engine Update Error: " + e.message, true); }
}

document.addEventListener('DOMContentLoaded', () => {
    const bindSync = (sliderId, numId, callback) => {
        const slider = document.getElementById(sliderId);
        const num = document.getElementById(numId);
        if(slider && num) {
            slider.addEventListener('input', () => { num.value = slider.value; callback(); });
            num.addEventListener('input', () => { slider.value = num.value; callback(); });
        }
    };

    bindSync('globalCacSlider', 'globalCacNum', updateCeoEngine);
    
    bindSync('globalAffSlider', 'globalAffNum', () => {
        let val = document.getElementById('globalAffNum').value;
        ceoActiveProducts.forEach(p => { let el = document.getElementById(`ceo-aff-${p.id}`); if(el) el.value = val; });
        updateCeoEngine();
    });

    bindSync('globalWarrSlider', 'globalWarrNum', () => {
        let val = document.getElementById('globalWarrNum').value;
        ceoActiveProducts.forEach(p => { let el = document.getElementById(`ceo-warr-${p.id}`); if(el) el.value = val; });
        updateCeoEngine();
    });
});
