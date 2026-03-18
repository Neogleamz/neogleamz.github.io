// --- CEO TERMINAL: OPERATION APEX 2.1 ---

let ceoExpenseChart, ceoProfitChart, ceoUnitChart, ceoEfficiencyChart, ceoCurEfficiencyChart, ceoLineChart;
const ceoFmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

// State Management
if (typeof ceoActiveProducts === 'undefined') window.ceoActiveProducts = [];

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

function autoPopulateCeoBoard() {
    if (ceoActiveProducts.length > 0) return; 
    let prods = Object.keys(productsDB).filter(p => !isSubassemblyDB[p]);
    prods.forEach(pName => {
        let vol = get30DayVolume(pName);
        if (vol > 0) {
            let liveMsrp = getEngineLiveMsrp(pName);
            ceoActiveProducts.push({
                name: pName, isBundle: false, applyCac: false, applyAff: false, applyWarr: false,
                currentMsrp: liveMsrp, testMsrp: liveMsrp, cogs: getEngineTrueCogs(pName), vol: vol
            });
        }
    });
}

function initCeoCharts() {
    Chart.defaults.color = '#e0e0e0'; Chart.defaults.font.family = "'JetBrains Mono', monospace";
    if(ceoExpenseChart) ceoExpenseChart.destroy(); if(ceoProfitChart) ceoProfitChart.destroy();
    if(ceoUnitChart) ceoUnitChart.destroy(); if(ceoEfficiencyChart) ceoEfficiencyChart.destroy(); if(ceoCurEfficiencyChart) ceoCurEfficiencyChart.destroy(); if(ceoLineChart) ceoLineChart.destroy();

    ceoExpenseChart = new Chart(document.getElementById('expenseChart'), {
        type: 'bar', plugins: [ChartDataLabels],
        data: { labels: ['True COGS', 'Ads (CAC)', 'Affil', 'Warr', 'Shipping', 'Stripe', 'Test Net'], datasets: [{ data: [0,0,0,0,0,0,0], backgroundColor: ['#333', '#ff0033', '#ffcc00', '#ff9900', '#00e5ff', '#aaaaaa', '#00ff66'], borderRadius: 4 }] },
        options: { responsive: true, maintainAspectRatio: false, layout: { padding: { top: 25 } }, plugins: { legend: { display: false }, datalabels: { color: '#fff', anchor: 'end', align: 'top', font: { weight: 'bold' }, formatter: (v, c) => v > 0 ? ceoFmt.format(v).split('.')[0] : '' } }, scales: { x: { grid: { display: false } }, y: { display: false } } }
    });

    ceoProfitChart = new Chart(document.getElementById('profitChart'), { type: 'doughnut', data: { labels: [], datasets: [{ data: [], backgroundColor: ['#00ff66', '#00e5ff', '#ffcc00', '#b000ff', '#ff0033', '#ffffff'], borderWidth: 0 }] }, options: { responsive: true, maintainAspectRatio: false, cutout: '65%', plugins: { legend: { position: 'right' } } } });
    ceoUnitChart = new Chart(document.getElementById('unitChart'), { type: 'bar', data: { labels: [], datasets: [{label: 'Current Net', backgroundColor: '#aaaaaa', data: []}, {label: 'Test Net', backgroundColor: '#00ff66', data: []}] }, options: { responsive: true, maintainAspectRatio: false, scales: { y: { grid: {color:'#222'} } }, plugins: { legend: { position: 'bottom' } } } });
    ceoEfficiencyChart = new Chart(document.getElementById('efficiencyChart'), { type: 'bar', data: { labels: [], datasets: [] }, options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, scales: { x: { stacked: true, max: 100, ticks: { callback: v => v+'%' }, grid: {color: '#222'} }, y: { stacked: true, grid: {display: false} } }, plugins: { legend: { position: 'bottom' } } } });
    ceoCurEfficiencyChart = new Chart(document.getElementById('curEfficiencyChart'), { type: 'bar', data: { labels: [], datasets: [] }, options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, scales: { x: { stacked: true, max: 100, ticks: { callback: v => v+'%' }, grid: {color: '#222'} }, y: { stacked: true, grid: {display: false} } }, plugins: { legend: { position: 'bottom' } } } });
    ceoLineChart = new Chart(document.getElementById('lineChart'), { type: 'line', data: { labels: ['Current Vol', '2x Scale', '5x Scale', '10x Scale'], datasets: [] }, options: { responsive: true, maintainAspectRatio: false, scales: { y: { grid: {color:'#222'} } }, plugins: { legend: { position: 'bottom' } } } });
}

function renderCeoTerminal() {
    sysLog("Booting CEO Terminal...");
    autoPopulateCeoBoard();
    
    let availableRetail = Object.keys(productsDB).filter(k => !isSubassemblyDB[k]);
    
    let controlHtml = `
        <div style="background: var(--bg-surface-light); padding: 15px; border-radius: 8px; margin-bottom: 20px; display: flex; gap: 10px; align-items: center; flex-wrap: wrap; border: 1px solid var(--border-color);">
            <select id="ceo-product-select" style="flex-grow: 1; min-width: 200px; padding: 8px; background: var(--bg-input); color: var(--text-main); border: 1px solid var(--border-input); border-radius: 4px;">
                <option value="">-- Select Retail Product to Add --</option>
                ${availableRetail.sort().map(k => `<option value="${k}">${k}</option>`).join('')}
            </select>
            <button class="btn-blue" onclick="addCeoProductToBoard()" style="width:auto; padding: 8px 15px;">+ Add to Board</button>
            <button class="btn-orange" onclick="addCustomBundleToBoard()" style="width:auto; padding: 8px 15px;">+ Build Bundle</button>
        </div>
    `;

    let slidersHtml = controlHtml;
    ceoActiveProducts.forEach((p, index) => {
        const toggleStyle = (active) => `cursor:pointer; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 800; border: 1px solid ${active ? 'var(--neon-green)' : 'var(--neon-red)'}; background: ${active ? 'rgba(0,255,102,0.1)' : 'rgba(255,0,51,0.1)'}; color: ${active ? 'var(--neon-green)' : 'var(--neon-red)'}; margin-right: 4px;`;
        
        slidersHtml += `
        <div class="ceo-slider-group" style="position: relative; border-bottom: 1px solid var(--border-color); padding-bottom: 10px; margin-bottom:15px;">
            <button onclick="removeCeoProduct(${index})" style="position: absolute; top: -5px; right: 0px; background: none; border: none; color: #ff0033; cursor: pointer; font-weight: bold; font-size: 18px;">×</button>
            <div class="ceo-slider-label" style="padding-right:20px;">
                <span>${p.name}</span>
                <input type="number" id="ceo-vol-${index}-num" class="ceo-sync-input" value="${p.vol}" oninput="document.getElementById('ceo-vol-${index}').value=this.value; updateCeoEngine();">
            </div>
            <div style="display:flex; margin-bottom: 8px;">
                <span style="${toggleStyle(p.applyCac)}" onclick="toggleCeoBtn(${index}, 'applyCac')">ADS</span>
                <span style="${toggleStyle(p.applyAff)}" onclick="toggleCeoBtn(${index}, 'applyAff')">AFF</span>
                <span style="${toggleStyle(p.applyWarr)}" onclick="toggleCeoBtn(${index}, 'applyWarr')">WAR</span>
            </div>
            <input type="range" id="ceo-vol-${index}" min="0" max="2000" step="1" value="${p.vol}" oninput="document.getElementById('ceo-vol-${index}-num').value=this.value; updateCeoEngine();">
        </div>`;
    });
    
    document.getElementById('ceo-dynamic-sliders').innerHTML = slidersHtml;
    if(!ceoExpenseChart) initCeoCharts();
    updateCeoEngine();
}

function toggleCeoBtn(idx, key) {
    ceoActiveProducts[idx][key] = !ceoActiveProducts[idx][key];
    renderCeoTerminal();
}

function updateCeoEngine() {
    try {
        const SHIP_COST = typeof ENGINE_CONFIG !== 'undefined' ? ENGINE_CONFIG.flatShipping : 8.00; 
        let gCac = parseFloat(document.getElementById('globalCacNum').value) || 0;
        let gAff = parseFloat(document.getElementById('globalAffNum').value) || 0;
        let gWarr = parseFloat(document.getElementById('globalWarrNum').value) || 0;
        
        let totals = { gross:0, curNet:0, testNet:0, cogs:0, stripe:0, aff:0, warr:0, ship:0, cac:0 };
        let charts = { labels:[], pData:[], curNetData:[], testNetData:[], eff:[], curEff:[] };

        let tableHtml = '';
        ceoActiveProducts.forEach((p, index) => {
            p.vol = parseInt(document.getElementById(`ceo-vol-${index}-num`)?.value) || 0;
            p.testMsrp = parseFloat(document.getElementById(`ceo-testmsrp-${index}`)?.value) || p.testMsrp;
            
            let effCac = p.applyCac ? gCac : 0; 
            let effAff = p.applyAff ? gAff : 0;
            let effWarr = p.applyWarr ? gWarr : 0;

            // Math: Current
            let curOOP = p.currentMsrp + SHIP_COST;
            let curStripe = getEngineStripeFee(curOOP);
            let curNet = p.currentMsrp - p.cogs - curStripe;

            // Math: Test
            let testOOP = p.testMsrp + SHIP_COST;
            let testStripe = getEngineStripeFee(testOOP);
            let testAffAmt = p.testMsrp * (effAff / 100);
            let testWarrAmt = p.testMsrp * (effWarr / 100);
            let testNet = p.testMsrp - p.cogs - testStripe - SHIP_COST - testAffAmt - testWarrAmt - effCac;

            totals.gross += (p.testMsrp * p.vol); totals.curNet += (curNet * p.vol); totals.testNet += (testNet * p.vol);
            totals.cogs += (p.cogs * p.vol); totals.stripe += (testStripe * p.vol); totals.aff += (testAffAmt * p.vol);
            totals.warr += (testWarrAmt * p.vol); totals.ship += (SHIP_COST * p.vol); totals.cac += (effCac * p.vol);

            if(p.vol > 0 && testNet > 0) { charts.labels.push(p.name.split(' ')[0]); charts.pData.push(testNet * p.vol); }
            charts.curNetData.push(curNet); charts.testNetData.push(testNet);
            
            let b = p.testMsrp || 1;
            charts.eff.push([(p.cogs/b)*100, (effCac/b)*100, (testAffAmt/b)*100, (testWarrAmt/b)*100, (SHIP_COST/b)*100, (testStripe/b)*100, (Math.max(0,testNet)/b)*100]);

            let curB = p.currentMsrp || 1;
            charts.curEff.push([(p.cogs/curB)*100, 0, 0, 0, 0, (curStripe/curB)*100, (Math.max(0,curNet)/curB)*100]);

            tableHtml += `
            <tr>
                <td>${p.name}</td>
                <td style="font-weight:700;">${ceoFmt.format(p.cogs)}</td>
                <td style="color:#888;">${ceoFmt.format(p.currentMsrp)}</td>
                <td style="color:#888;">${ceoFmt.format(curStripe)}</td>
                <td style="color:#888;">${ceoFmt.format(curOOP)}</td>
                <td style="color:#ccc;">${ceoFmt.format(curNet)}</td>
                <td style="border-left:2px solid #444; padding-left:15px;"><input type="number" id="ceo-testmsrp-${index}" class="ceo-table-input" value="${p.testMsrp.toFixed(2)}" onchange="updateCeoEngine()"></td>
                <td style="color:var(--neon-cyan);">${ceoFmt.format(testStripe)}</td>
                <td style="color:var(--neon-cyan); font-weight:bold;">${ceoFmt.format(testOOP)}</td>
                <td class="${testNet < 0 ? 'val-red' : 'val-green'}" style="font-weight:900;">${ceoFmt.format(testNet)}</td>
            </tr>`;
        });

        document.getElementById('ceo-dynamic-table').innerHTML = tableHtml || '<tr><td colspan="10" style="text-align:center;">No products active.</td></tr>';
        
        // Update KPIs
        document.getElementById('kpiGross').innerText = ceoFmt.format(totals.gross).split('.')[0];
        document.getElementById('kpiOldNet').innerText = ceoFmt.format(totals.curNet).split('.')[0];
        document.getElementById('kpiNewNet').innerText = ceoFmt.format(totals.testNet).split('.')[0];
        document.getElementById('kpiSaved').innerText = (totals.testNet - totals.curNet >= 0 ? "+" : "") + ceoFmt.format(totals.testNet - totals.curNet).split('.')[0];
        
        // Update Charts
        ceoExpenseChart.data.datasets[0].data = [totals.cogs, totals.cac, totals.aff, totals.warr, totals.ship, totals.stripe, Math.max(0, totals.testNet)];
        ceoExpenseChart.update();

        ceoProfitChart.data.labels = charts.labels; ceoProfitChart.data.datasets[0].data = charts.pData; ceoProfitChart.update();
        ceoUnitChart.data.labels = charts.labels; ceoUnitChart.data.datasets[0].data = charts.curNetData; ceoUnitChart.data.datasets[1].data = charts.testNetData; ceoUnitChart.update();

        const colors = ['#333', '#ff0033', '#ffcc00', '#ff9900', '#00e5ff', '#aaaaaa', '#00ff66'];
        const labels = ['COGS', 'CAC', 'Affil', 'Warr', 'Ship', 'Stripe', 'Net'];
        ceoEfficiencyChart.data.labels = charts.labels;
        ceoEfficiencyChart.data.datasets = labels.map((l, i) => ({ label: l, data: charts.eff.map(row => row[i]), backgroundColor: colors[i] }));
        ceoEfficiencyChart.update();

        ceoCurEfficiencyChart.data.labels = charts.labels;
        ceoCurEfficiencyChart.data.datasets = labels.map((l, i) => ({ label: l, data: charts.curEff.map(row => row[i]), backgroundColor: colors[i] }));
        ceoCurEfficiencyChart.update();

        ceoLineChart.data.datasets = [
            { label: 'Current Trajectory', borderColor: '#aaaaaa', data: [totals.curNet, totals.curNet*2, totals.curNet*5, totals.curNet*10], tension: 0.3 },
            { label: 'Test Trajectory', borderColor: '#00ff66', data: [totals.testNet, totals.testNet*2, totals.testNet*5, totals.testNet*10], tension: 0.3 }
        ];
        ceoLineChart.update();

        saveCeoBoard();
    } catch (e) { console.error(e); }
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

function addCeoProductToBoard() {
    let pName = document.getElementById('ceo-product-select').value;
    if(!pName || ceoActiveProducts.some(p => p.name === pName)) return;
    ceoActiveProducts.push({ name:pName, isBundle:false, applyCac:false, applyAff:false, applyWarr:false, currentMsrp:getEngineLiveMsrp(pName), testMsrp:getEngineLiveMsrp(pName), cogs:getEngineTrueCogs(pName), vol:0 });
    renderCeoTerminal();
}

function removeCeoProduct(idx) { ceoActiveProducts.splice(idx, 1); renderCeoTerminal(); }
