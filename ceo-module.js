// --- CEO TERMINAL: OPERATION APEX (DYNAMIC CONTROL BOARD) ---

let ceoExpenseChart, ceoProfitChart, ceoUnitChart, ceoEfficiencyChart, ceoLineChart;
const ceoFmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

// Note: ceoActiveProducts is initialized as empty, but index.html's loadCloudPrefs will populate it on boot.
if (typeof ceoActiveProducts === 'undefined') {
    window.ceoActiveProducts = [];
}

// We just call the global saveCloudPrefs() from index.html!
function saveCeoBoard() {
    if (typeof saveCloudPrefs === 'function') {
        saveCloudPrefs();
    }
}

function get30DayVolume(productName) {
    try {
        if(typeof salesDB === 'undefined' || !salesDB || !Array.isArray(salesDB)) return 30; 
        let thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        let vol = 0;
        let searchName = productName.toUpperCase().replace(" ONLY", "");
        salesDB.forEach(sale => {
            let saleDate = new Date(sale.sale_date);
            if (saleDate >= thirtyDaysAgo) {
                if(sale.internal_recipe_name && sale.internal_recipe_name.toUpperCase().includes(searchName)) {
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
    sysLog("Booting Dynamic CEO Terminal...");
    try {
        // 1. Build the Control Bar (Dropdown to add products)
        let availableRetail = [];
        let allKeys = Object.keys(productsDB || {});
        
        allKeys.forEach(k => {
            let p = productsDB[k];
            // Filter out sub-assemblies based on your database column
            let isSub = p.is_subassembly === true || String(p.is_subassembly).toLowerCase() === "true";
            if (!isSub) {
                availableRetail.push(k);
            }
        });

        let controlHtml = `
            <div style="background: var(--bg-surface-light); padding: 15px; border-radius: 8px; margin-bottom: 20px; display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
                <select id="ceo-product-select" class="ceo-sync-input" style="flex-grow: 1; min-width: 200px; padding: 8px;">
                    <option value="">-- Select Retail Product to Add --</option>
                    ${availableRetail.sort().map(k => `<option value="${k}">${k}</option>`).join('')}
                </select>
                <button class="btn-blue" onclick="addCeoProductToBoard()" style="padding: 8px 15px;">+ Add to Board</button>
                <div style="border-left: 1px solid #444; margin: 0 10px; height: 30px;"></div>
                <button class="btn-yellow" onclick="addCustomBundleToBoard()" style="padding: 8px 15px;">+ Build Custom Bundle</button>
            </div>
        `;

        // 2. Build the Sliders for Active Products
        let slidersHtml = controlHtml;
        
        ceoActiveProducts.forEach((p, index) => {
            let bgStyle = p.isBundle ? 'padding: 10px; border-radius: 4px; border: 1px solid rgba(0,229,255,0.3); background: rgba(0, 229, 255, 0.05); position: relative;' : 'position: relative;';
            let titleColor = p.isBundle ? 'color: var(--neon-cyan);' : '';
            
            // Refresh live baseline stats constantly
            p.currentMsrp = p.isBundle ? p.currentMsrp : getEngineLiveMsrp(p.name);
            p.cogs = p.isBundle ? p.cogs : getEngineTrueCogs(p.name);

            slidersHtml += `
            <div class="ceo-slider-group" style="${bgStyle}">
                <button onclick="removeCeoProduct(${index})" style="position: absolute; top: 0px; right: 0px; background: none; border: none; color: #ff0033; cursor: pointer; font-size: 16px; font-weight: bold;" title="Remove from board">×</button>
                <div class="ceo-slider-label">
                    <span style="display:flex; align-items:center; ${titleColor}">${p.name} <label class="ceo-cac-toggle" style="margin-left: 10px;"><input type="checkbox" id="ceo-cb-${index}" ${p.applyCac ? 'checked' : ''} onchange="updateCeoEngine()"> Ads</label></span>
                    <input type="number" id="ceo-vol-${index}-num" class="ceo-sync-input" value="${p.vol}" oninput="document.getElementById('ceo-vol-${index}').value=this.value; updateCeoEngine();">
                </div>
                <input type="range" id="ceo-vol-${index}" min="0" max="2000" step="1" value="${p.vol}" oninput="document.getElementById('ceo-vol-${index}-num').value=this.value; updateCeoEngine();">
            </div>`;
        });
        
        document.getElementById('ceo-dynamic-sliders').innerHTML = slidersHtml;

        if(!ceoExpenseChart) initCeoCharts();
        updateCeoEngine();
        sysLog("CEO Terminal Active.");
    } catch (error) { sysLog("CEO ERROR: " + error.message, true); }
}

function addCeoProductToBoard() {
    let select = document.getElementById('ceo-product-select');
    let pName = select.value;
    if(!pName) return alert("Please select a product from the dropdown first.");
    
    if(ceoActiveProducts.some(p => p.name === pName && !p.isBundle)) return alert("This product is already on the board.");

    let liveMsrp = getEngineLiveMsrp(pName);
    let liveCogs = getEngineTrueCogs(pName);
    
    let pData = productsDB[pName] || {};
    let defAff = parseFloat(pData.affiliate_pct) || 0;
    let defWarr = parseFloat(pData.warranty_pct) || 0;

    ceoActiveProducts.push({
        name: pName,
        isBundle: false,
        applyCac: true,
        currentMsrp: liveMsrp,
        testMsrp: liveMsrp, 
        cogs: liveCogs,
        vol: get30DayVolume(pName),
        aff: defAff,
        warr: defWarr
    });
    
    saveCeoBoard();
    renderCeoTerminal();
}

function addCustomBundleToBoard() {
    let bundleName = prompt("Enter a name for this custom bundle (e.g., '98¢ Trap'):");
    if(!bundleName) return;
    
    let part1 = prompt("Enter the exact name of the first product in the bundle (e.g., 'Beamz'):");
    let part2 = prompt("Enter the exact name of the second product in the bundle (e.g., 'Clipz'):");
    
    if(!part1 || !part2) return alert("You must provide two product names to build a bundle.");

    let msrp1 = getEngineLiveMsrp(part1);
    let msrp2 = getEngineLiveMsrp(part2);
    let cogs1 = getEngineTrueCogs(part1);
    let cogs2 = getEngineTrueCogs(part2);

    ceoActiveProducts.push({
        name: bundleName,
        isBundle: true,
        applyCac: true,
        currentMsrp: msrp1 + msrp2,
        testMsrp: msrp1 + msrp2,
        cogs: cogs1 + cogs2,
        vol: 30, 
        aff: 0,
        warr: 0
    });
    
    saveCeoBoard();
    renderCeoTerminal();
}

function removeCeoProduct(index) {
    ceoActiveProducts.splice(index, 1);
    saveCeoBoard();
    renderCeoTerminal();
}

function updateCeoEngine() {
    try {
        const SHIP_COST = typeof ENGINE_CONFIG !== 'undefined' ? ENGINE_CONFIG.flatShipping : 8.00; 
        let globalCac = parseFloat(document.getElementById('globalCacNum').value) || 0;
        
        let totalGross = 0, totalCurrentNet = 0, totalTestNet = 0;
        let aggCogs = 0, aggStripe = 0, aggAff = 0, aggWarranty = 0, aggShip = 0, aggCac = 0;
        
        let pLabels = [], pData = [], uLabels = [], uOld = [], uNew = [];
        let effLabels=[], effCogs=[], effCac=[], effAff=[], effWarr=[], effLog=[], effStripe=[], effNet=[];

        let tableHtml = '';

        ceoActiveProducts.forEach((p, index) => {
            let volInput = document.getElementById(`ceo-vol-${index}-num`); let vol = volInput ? (parseInt(volInput.value) || 0) : p.vol;
            let cb = document.getElementById(`ceo-cb-${index}`); p.applyCac = cb ? cb.checked : p.applyCac;
            let testMsrpInput = document.getElementById(`ceo-testmsrp-${index}`); p.testMsrp = testMsrpInput ? parseFloat(testMsrpInput.value) || 0 : p.testMsrp;
            let affInput = document.getElementById(`ceo-aff-${index}`); p.aff = affInput ? parseFloat(affInput.value) || 0 : p.aff;
            let warrInput = document.getElementById(`ceo-warr-${index}`); p.warr = warrInput ? parseFloat(warrInput.value) || 0 : p.warr;
            
            p.vol = vol; 

            let effectiveCac = p.applyCac ? globalCac : 0; 

            // --- ENGINE POWERED MATH ---
            let curCustPays = p.currentMsrp + SHIP_COST; 
            let curStripeFee = getEngineStripeFee(curCustPays); 
            let curNet = p.currentMsrp - p.cogs - curStripeFee;

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

            let rowStyle = p.isBundle ? 'background: rgba(0, 229, 255, 0.05);' : (testNet < curNet ? 'background: rgba(255, 0, 51, 0.1);' : '');
            let deltaCls = profitDelta < 0 ? 'val-red' : 'val-green';
            let testNetCls = testNet < 0 ? 'val-red' : 'val-green';
            
            tableHtml += `
            <tr style="${rowStyle}">
                <td style="font-weight:bold;">${p.name}</td>
                <td style="font-weight:700;">${ceoFmt.format(p.cogs)}</td>
                <td style="color:#888;">${ceoFmt.format(p.currentMsrp)}</td>
                <td style="color:#888;">-${ceoFmt.format(curStripeFee)}</td>
                <td style="color:#ccc;">${ceoFmt.format(curNet)}</td>
                
                <td style="border-left:2px solid #444; padding-left:15px;"><input type="number" id="ceo-testmsrp-${index}" class="ceo-table-input" style="color:var(--neon-cyan); border-color:var(--neon-cyan);" value="${p.testMsrp.toFixed(2)}" step="0.01" onchange="updateCeoEngine()"></td>
                <td style="color:#888;">-${ceoFmt.format(testStripeFee)}</td>
                <td style="color:#888;">-${ceoFmt.format(SHIP_COST)}</td>
                <td><input type="number" id="ceo-aff-${index}" class="ceo-table-input" style="width:50px;" value="${p.aff}" step="1" onchange="updateCeoEngine()"></td>
                <td><input type="number" id="ceo-warr-${index}" class="ceo-table-input" style="width:50px;" value="${p.warr}" step="0.5" onchange="updateCeoEngine()"></td>
                <td class="${testNetCls}" style="font-weight:900; font-size:0.9rem;">${ceoFmt.format(testNet)}</td>
                <td class="${deltaCls}" style="font-weight:bold;">${profitDelta > 0 ? '+' : ''}${ceoFmt.format(profitDelta)}</td>
            </tr>`;
        });

        if (ceoActiveProducts.length === 0) {
            tableHtml = `<tr><td colspan="12" style="text-align:center; padding: 20px; color: #888;">No products on the board. Select a product from the dropdown to start simulating!</td></tr>`;
        }

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

        // Save state at the end of every update!
        saveCeoBoard();

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
        ceoActiveProducts.forEach((p, index) => { let el = document.getElementById(`ceo-aff-${index}`); if(el) el.value = val; });
        updateCeoEngine();
    });

    bindSync('globalWarrSlider', 'globalWarrNum', () => {
        let val = document.getElementById('globalWarrNum').value;
        ceoActiveProducts.forEach((p, index) => { let el = document.getElementById(`ceo-warr-${index}`); if(el) el.value = val; });
        updateCeoEngine();
    });
});
