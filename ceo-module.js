// --- CEO TERMINAL: OPERATION APEX 2.1 ---

let ceoExpenseChart, ceoProfitChart, ceoUnitChart, ceoEfficiencyChart, ceoCurEfficiencyChart, ceoLineChart;
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
                currentMsrp: liveMsrp, testMsrp: liveMsrp, vol: vol
            });
        }
    });
}

function initCeoCharts() {
    Chart.defaults.color = '#e0e0e0'; Chart.defaults.font.family = "'JetBrains Mono', monospace";
    if(ceoExpenseChart) ceoExpenseChart.destroy();
    if(ceoUnitChart) ceoUnitChart.destroy(); if(ceoEfficiencyChart) ceoEfficiencyChart.destroy(); if(ceoCurEfficiencyChart) ceoCurEfficiencyChart.destroy();

    ceoExpenseChart = new Chart(document.getElementById('expenseChart'), {
        type: 'bar', plugins: [ChartDataLabels],
        data: { 
            labels: ['True COGS', 'Ads (CAC)', 'Affil', 'Warr', 'Shipping', 'Stripe', 'Net Profit'], 
            datasets: [
                { label: 'Current MSRP', data: [0,0,0,0,0,0,0], backgroundColor: '#555555', borderRadius: 4 },
                { label: 'Test MSRP', data: [0,0,0,0,0,0,0], backgroundColor: ['#333', '#ff0033', '#ffcc00', '#ff9900', '#00e5ff', '#aaaaaa', '#00ff66'], borderRadius: 4 }
            ] 
        },
        options: { responsive: true, maintainAspectRatio: false, layout: { padding: { top: 25 } }, plugins: { legend: { position: 'bottom' }, datalabels: { color: '#fff', anchor: 'end', align: 'top', font: { weight: 'bold' }, formatter: (v) => v > 0 ? ceoFmt.format(v).split('.')[0] : '' } }, scales: { y: { grid: {color:'#222'} }, x: { grid: { display: false } } } }
    });

    ceoUnitChart = new Chart(document.getElementById('unitChart'), { type: 'bar', data: { labels: [], datasets: [{label: 'Current Net', backgroundColor: '#aaaaaa', data: []}, {label: 'Test Net', backgroundColor: '#00ff66', data: []}] }, options: { responsive: true, maintainAspectRatio: false, scales: { y: { grid: {color:'#222'} } }, plugins: { legend: { position: 'bottom' } } } });
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
                    if (value < 5) return '';
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

    ceoEfficiencyChart = new Chart(document.getElementById('efficiencyChart'), { type: 'bar', plugins: [ChartDataLabels], data: { labels: [], datasets: [] }, options: efficiencyOptions(false) });
    ceoCurEfficiencyChart = new Chart(document.getElementById('curEfficiencyChart'), { type: 'bar', plugins: [ChartDataLabels], data: { labels: [], datasets: [] }, options: efficiencyOptions(true) });
}

function renderCeoTerminal() {
    sysLog("Booting CEO Terminal...");
    autoPopulateCeoBoard();
    
    let availableRetail = Object.keys(productsDB).filter(k => !isSubassemblyDB[k]);
    
    let controlHtml = `
        <div style="background: var(--bg-surface-light); padding: 10px; border-radius: 8px; margin-bottom: 12px; border: 1px solid var(--border-color);">
            <button class="btn-blue" onclick="openCeoAddModal()" style="width:100%; padding: 12px; font-size:14px; font-weight:bold; display:flex; align-items:center; justify-content:center; gap:8px;">
                🚀 Add Product to Analysis
            </button>
        </div>
    `;

    let slidersHtml = controlHtml;
    ceoActiveProducts.forEach((p, index) => {
        const toggleStyle = (active) => `cursor:pointer; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 800; border: 1px solid ${active ? 'var(--neon-green)' : 'var(--neon-red)'}; background: ${active ? 'rgba(0,255,102,0.1)' : 'rgba(255,0,51,0.1)'}; color: ${active ? 'var(--neon-green)' : 'var(--neon-red)'}; margin-right: 4px;`;
        
        slidersHtml += `
        <div class="ceo-slider-group" style="border-bottom: 1px solid var(--border-color); padding-bottom: 10px; margin-bottom:15px; cursor:grab;" draggable="true" ondragstart="ceoDragStart(event, ${index})" ondragover="ceoDragOver(event)" ondrop="ceoDrop(event, ${index})" ondragend="ceoDragEnd(event)">
            <div class="ceo-slider-label">
                <span title="Drag to reorder">☰ ${p.name}</span>
                <div style="display: flex; gap: 8px; align-items: center;">
                    <input type="number" id="ceo-vol-${index}-num" class="ceo-sync-input" value="${p.vol}" oninput="document.getElementById('ceo-vol-${index}').value=this.value; updateCeoEngine();">
                    <button onclick="removeCeoProduct(${index})" title="Remove Product" style="background: none; border: none; color: #ff0033; cursor: pointer; font-weight: bold; font-size: 20px; padding: 0; line-height: 1;">×</button>
                </div>
            </div>
            <div style="display:flex; margin-bottom: 8px;">
                <span style="${toggleStyle(p.applyCac)}" onclick="toggleCeoBtn(${index}, 'applyCac')">ADS</span>
                <span style="${toggleStyle(p.applyAff)}" onclick="toggleCeoBtn(${index}, 'applyAff')">AFF</span>
                <span style="${toggleStyle(p.applyWarr)}" onclick="toggleCeoBtn(${index}, 'applyWarr')">WAR</span>
            </div>
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
        
        let totals = { gross:0, curNet:0, testNet:0, cogs:0, stripe:0, curStripe:0, aff:0, curAff:0, warr:0, curWarr:0, ship:0, cac:0 };
        let charts = { labels:[], curNetData:[], testNetData:[], eff:[], curEff:[] };

        let tableRows = [];
        ceoActiveProducts.forEach((p, index) => {
            p.vol = parseInt(document.getElementById(`ceo-vol-${index}-num`)?.value) || 0;
            p.testMsrp = parseFloat(document.getElementById(`ceo-testmsrp-${index}`)?.value) || p.testMsrp;
            
            let effCac = p.applyCac ? gCac : 0; 
            let effAff = p.applyAff ? gAff : 0;
            let effWarr = p.applyWarr ? gWarr : 0;

            let liveCogs = (p.isBundle || p.name.startsWith('🧪')) ? (p.cogs || 0) : getEngineTrueCogs(p.name);
            let fsThreshold = parseFloat(document.getElementById('ceo-fs-threshold')?.value) || 50;

            // Math: Current (Customer ALWAYS pays shipping - infinite threshold)
            let curMetrics = getEnginePredictiveMetrics(p.currentMsrp, liveCogs, 999999, effCac, effAff, effWarr);

            // Math: Test (Free Shipping Threshold)
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

        let tableHtml = '';
        tableRows.forEach(r => {
            tableHtml += `
            <tr>
                <td>${r.name}</td>
                <td style="font-weight:700;">${ceoFmt.format(r.cogs)}</td>
                <td style="color:#888;">${ceoFmt.format(r.currentMsrp)}</td>
                <td style="color:#888;">${ceoFmt.format(r.curShip)}</td>
                <td style="color:#888;">${ceoFmt.format(r.curStripe)}</td>
                <td style="color:#888;">${ceoFmt.format(r.curOOP)}</td>
                <td style="color:#ccc;">${ceoFmt.format(r.curNet)}</td>
                <td style="border-left:2px solid #444; padding-left:15px;"><input type="number" id="ceo-testmsrp-${r.index}" class="ceo-table-input" value="${r.testMsrp.toFixed(2)}" onchange="updateCeoEngine()"></td>
                <td style="color:var(--neon-cyan);">${ceoFmt.format(r.testShip)}</td>
                <td style="color:var(--neon-cyan);">${ceoFmt.format(r.testStripe)}</td>
                <td style="color:var(--neon-cyan); font-weight:bold;">${ceoFmt.format(r.testOOP)}</td>
                <td class="${r.testNet < 0 ? 'val-red' : 'val-green'}" style="font-weight:900;">${ceoFmt.format(r.testNet)}</td>
            </tr>`;
        });

        document.getElementById('ceo-dynamic-table').innerHTML = tableHtml || '<tr><td colspan="10" style="text-align:center;">No products active.</td></tr>';
        
        // Update KPIs
        document.getElementById('kpiGross').innerText = ceoFmt.format(totals.gross).split('.')[0];
        document.getElementById('kpiOldNet').innerText = ceoFmt.format(totals.curNet).split('.')[0];
        document.getElementById('kpiNewNet').innerText = ceoFmt.format(totals.testNet).split('.')[0];
        document.getElementById('kpiSaved').innerText = (totals.testNet - totals.curNet >= 0 ? "+" : "") + ceoFmt.format(totals.testNet - totals.curNet).split('.')[0];
        
        // Update Charts
        ceoExpenseChart.data.datasets[0].data = [totals.cogs, totals.cac, totals.curAff, totals.curWarr, totals.ship, totals.curStripe, Math.max(0, totals.curNet)];
        ceoExpenseChart.data.datasets[1].data = [totals.cogs, totals.cac, totals.aff, totals.warr, totals.ship, totals.stripe, Math.max(0, totals.testNet)];
        ceoExpenseChart.update();

        ceoUnitChart.data.labels = charts.labels; 
        ceoUnitChart.data.datasets[0].data = charts.curNetData; 
        ceoUnitChart.data.datasets[1].data = charts.testNetData; 
        ceoUnitChart.update();

        const colors = ['#333', '#ff0033', '#ffcc00', '#ff9900', '#00e5ff', '#aaaaaa', '#00ff66'];
        const labels = ['COGS', 'CAC', 'Affil', 'Warr', 'Ship', 'Stripe', 'Net'];
        ceoEfficiencyChart.data.labels = charts.labels;
        ceoEfficiencyChart.data.datasets = labels.map((l, i) => ({ label: l, data: charts.eff.map(row => row[i]), backgroundColor: colors[i] }));
        ceoEfficiencyChart.update();

        ceoCurEfficiencyChart.data.labels = charts.labels;
        ceoCurEfficiencyChart.data.datasets = labels.map((l, i) => ({ label: l, data: charts.curEff.map(row => row[i]), backgroundColor: colors[i] }));
        ceoCurEfficiencyChart.update();

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
    ceoActiveProducts.push({ name:pName, isBundle:false, applyCac:false, applyAff:false, applyWarr:false, currentMsrp:getEngineLiveMsrp(pName), testMsrp:getEngineLiveMsrp(pName), vol:0 });
    renderCeoTerminal();
}

function openCeoBundleModal() {
    let availableRetail = Object.keys(productsDB).filter(k => !isSubassemblyDB[k]).sort();
    let html = `
    <table id="ceoBundleTable">
        <thead>
            <tr>
                <th style="width:70px; text-align:center;">Qty</th>
                <th>Retail Product Component</th>
                <th>True COGS</th>
                <th>Live MSRP</th>
            </tr>
        </thead>
        <tbody>
    `;
    availableRetail.forEach(k => {
        let cogs = getEngineTrueCogs(k);
        let msrp = getEngineLiveMsrp(k);
        html += `
            <tr class="ceo-bundle-row">
                <td style="text-align:center;"><input type="number" class="bundle-qty" data-name="${k}" data-cogs="${cogs}" data-msrp="${msrp}" min="0" step="1" value="0" style="width:60px; text-align:center; padding:5px; font-size:15px; border:1px solid #444; background:#111; color:#fff;"></td>
                <td class="bundle-name" style="font-weight:bold; color:var(--text-main);">${k}</td>
                <td style="color:#aaa;">${ceoFmt.format(cogs)}</td>
                <td style="color:var(--neon-green);">${ceoFmt.format(msrp)}</td>
            </tr>
        `;
    });
    html += `</tbody></table>`;
    
    document.getElementById('ceoBundleTableWrap').innerHTML = html;
    document.getElementById('ceoBundleName').value = '';
    document.getElementById('ceoBundleSearch').value = '';
    document.getElementById('ceoBundleModal').style.display = 'flex';
}

function filterCeoBundleList() {
    let filter = document.getElementById('ceoBundleSearch').value.toLowerCase();
    document.querySelectorAll('.ceo-bundle-row').forEach(r => {
        let name = r.querySelector('.bundle-name').innerText.toLowerCase();
        r.style.display = name.includes(filter) ? '' : 'none';
    });
}

function saveCeoBundle() {
    let nameRaw = document.getElementById('ceoBundleName').value.trim();
    if (!nameRaw) return alert("Please enter a Bundle Name.");
    let bName = "📦 " + nameRaw;
    
    if (ceoActiveProducts.some(p => p.name === bName)) return alert("A bundle with this name already exists on the board.");
    
    let totalCogs = 0; let totalMsrp = 0; let itemsAdded = 0;
    document.querySelectorAll('.bundle-qty').forEach(input => {
        let q = parseInt(input.value) || 0;
        if (q > 0) {
            totalCogs += q * parseFloat(input.dataset.cogs);
            totalMsrp += q * parseFloat(input.dataset.msrp);
            itemsAdded++;
        }
    });
    
    if (itemsAdded === 0) return alert("Please specify a quantity greater than 0 for at least one component.");
    
    ceoActiveProducts.push({
        name: bName, isBundle: true, applyCac: false, applyAff: false, applyWarr: false,
        currentMsrp: totalMsrp, testMsrp: totalMsrp, cogs: totalCogs, vol: 0
    });
    
    document.getElementById('ceoBundleModal').style.display = 'none';
    renderCeoTerminal();
}

function openCeoCustomModal() {
    document.getElementById('ceoCustomName').value = '';
    document.getElementById('ceoCustomCogs').value = '';
    document.getElementById('ceoCustomMsrp').value = '';
    document.getElementById('ceoCustomModal').style.display = 'flex';
}

function saveCeoCustomItem() {
    let nameRaw = document.getElementById('ceoCustomName').value.trim();
    if (!nameRaw) return alert("Please enter an Item Name.");
    let iName = "🧪 " + nameRaw;
    
    if (ceoActiveProducts.some(p => p.name === iName)) return alert("An item with this name already exists on the board.");
    
    let cogs = parseFloat(document.getElementById('ceoCustomCogs').value) || 0;
    let msrp = parseFloat(document.getElementById('ceoCustomMsrp').value) || 0;
    
    ceoActiveProducts.push({
        name: iName, isBundle: false, applyCac: false, applyAff: false, applyWarr: false,
        currentMsrp: msrp, testMsrp: msrp, cogs: cogs, vol: 0
    });
    
    document.getElementById('ceoCustomModal').style.display = 'none';
    renderCeoTerminal();
}

function removeCeoProduct(idx) { ceoActiveProducts.splice(idx, 1); renderCeoTerminal(); }

// --- UNIFIED MODAL HANDLERS ---
function openCeoAddModal() {
    let availableRetail = Object.keys(productsDB).filter(k => !isSubassemblyDB[k]).sort();
    let sel = document.getElementById('ceo-unified-select');
    sel.innerHTML = `<option value="">-- Choose Catalog Product --</option>` + availableRetail.map(k => `<option value="${k}">${k}</option>`).join('');
    
    document.getElementById('ceoUnifiedBundleBuilder').style.display = 'none';
    document.getElementById('ceoAddModal').style.display = 'flex';
}

function addCeoRealProduct() {
    let pName = document.getElementById('ceo-unified-select').value;
    if(!pName) return alert("Select a product.");
    if(ceoActiveProducts.some(p => p.name === pName)) return alert("Item already on board.");
    ceoActiveProducts.push({ name:pName, isBundle:false, applyCac:false, applyAff:false, applyWarr:false, currentMsrp:getEngineLiveMsrp(pName), testMsrp:getEngineLiveMsrp(pName), vol:0 });
    document.getElementById('ceoAddModal').style.display = 'none';
    renderCeoTerminal();
}

function addCeoCustomProduct() {
    let nameRaw = document.getElementById('ceo-unified-custom-name').value.trim();
    if(!nameRaw) return alert("Enter item name.");
    let iName = "🧪 " + nameRaw;
    if(ceoActiveProducts.some(p => p.name === iName)) return alert("Name exists.");
    let cogs = parseFloat(document.getElementById('ceo-unified-custom-cogs').value) || 0;
    let msrp = parseFloat(document.getElementById('ceo-unified-custom-msrp').value) || 0;
    ceoActiveProducts.push({ name:iName, isBundle:false, applyCac:false, applyAff:false, applyWarr:false, currentMsrp:msrp, testMsrp:msrp, cogs:cogs, vol:0 });
    document.getElementById('ceoAddModal').style.display = 'none';
    renderCeoTerminal();
}

function switchToBundleView() {
    let availableRetail = Object.keys(productsDB).filter(k => !isSubassemblyDB[k]).sort();
    let customs = ceoActiveProducts.filter(p => p.name.startsWith('🧪'));
    
    let html = `<table id="ceoUnifiedBundleTable"><thead><tr><th>Qty</th><th>Product / Test Item</th><th>COGS</th><th>MSRP</th></tr></thead><tbody>`;
    
    // Catalog Products
    availableRetail.forEach(k => {
        let c = getEngineTrueCogs(k); let m = getEngineLiveMsrp(k);
        html += `<tr class="unified-bundle-row"><td><input type="number" class="u-bundle-qty" data-name="${k}" data-cogs="${c}" data-msrp="${m}" min="0" step="1" value="0" style="width:50px;"></td><td class="u-bundle-name">${k}</td><td>${ceoFmt.format(c)}</td><td>${ceoFmt.format(m)}</td></tr>`;
    });
    
    // Active Custom Items
    customs.forEach(p => {
        html += `<tr class="unified-bundle-row"><td><input type="number" class="u-bundle-qty" data-name="${p.name}" data-cogs="${p.cogs || 0}" data-msrp="${p.currentMsrp || 0}" min="0" step="1" value="0" style="width:50px;"></td><td class="u-bundle-name" style="color:#8b5cf6;">${p.name}</td><td>${ceoFmt.format(p.cogs || 0)}</td><td>${ceoFmt.format(p.currentMsrp || 0)}</td></tr>`;
    });
    
    document.getElementById('ceoUnifiedBundleTableWrap').innerHTML = html + `</tbody></table>`;
    document.getElementById('ceoUnifiedBundleBuilder').style.display = 'block';
}

function filterUnifiedBundleList() {
    let f = document.getElementById('ceoUnifiedBundleSearch').value.toLowerCase();
    document.querySelectorAll('.unified-bundle-row').forEach(r => {
        let n = r.querySelector('.u-bundle-name').innerText.toLowerCase();
        r.style.display = n.includes(f) ? '' : 'none';
    });
}

function addCeoBundleProduct() {
    let n = document.getElementById('ceoUnifiedBundleName').value.trim();
    if(!n) return alert("Bundle Name required.");
    let bName = "📦 " + n;
    if(ceoActiveProducts.some(p => p.name === bName)) return alert("Bundle exists.");
    let tCogs = 0, tMsrp = 0, count = 0;
    document.querySelectorAll('.u-bundle-qty').forEach(i => {
        let q = parseInt(i.value) || 0; if(q > 0) { tCogs += q * parseFloat(i.dataset.cogs); tMsrp += q * parseFloat(i.dataset.msrp); count++; }
    });
    if(count === 0) return alert("Add items to bundle.");
    ceoActiveProducts.push({ name:bName, isBundle:true, applyCac:false, applyAff:false, applyWarr:false, currentMsrp:tMsrp, testMsrp:tMsrp, cogs:tCogs, vol:0 });
    document.getElementById('ceoAddModal').style.display = 'none';
    renderCeoTerminal();
}
