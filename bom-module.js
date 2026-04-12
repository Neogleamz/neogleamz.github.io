window.openBulkAddModal = function() {
    if(!currentProduct) return alert("Please select a product from the sidebar first."); document.getElementById('bulkAddTitle').innerText = currentProduct; bulkAddData = [];
// --- 6. BULK MODAL ---
    Object.keys(productsDB).sort().forEach(p => { if(p === currentProduct) return; let pData = productsDB[p] || {}; let iconStr = pData.is_3d_print ? "🖨️ " : (isSubassemblyDB[p] ? "⚙️ " : "📦 "); bulkAddData.push({ k: `RECIPE:::${p}`, isSub: true, nn: iconStr + p, np: "Sub-Assembly", n: "", sp: "(Nested Recipe)", uc: getEngineTrueCogs(p), q: "" }); });
    Object.keys(catalogCache).forEach(k => { let c = catalogCache[k]; bulkAddData.push({ k: k, isSub: false, nn: c.neoName||"", np: c.neoProd||"", n: c.itemName||"", sp: c.spec||"", uc: c.avgUnitCost, q: "" }); });
    document.getElementById('bulkSearch').value = ""; document.getElementById('bulkAddModal').style.display = 'flex'; window.renderBulkAddBody();
}
window.sortBulk = function(c) { currentBulkSort = { column: c, direction: currentBulkSort.column===c && currentBulkSort.direction==='asc' ? 'desc' : 'asc' }; window.saveSort('currentBulkSort', currentBulkSort); window.renderBulkAddBody(); }
window.updateBulkQty = function(k, v) { let i = bulkAddData.find(x => x.k === k); if(i) i.q = v; }
window.filterBulkList = function() { window.renderBulkAddBody(); }
window.renderBulkAddBody = function() {
    let wrap = document.getElementById('bulkAddTableWrap'); if(!wrap) return;
    let ths = ` <th class="${currentBulkSort.column==='nn'?'sorted-'+currentBulkSort.direction:''}" data-app-click="sortBulk" data-col="nn">Neogleamz Name</th> <th class="${currentBulkSort.column==='np'?'sorted-'+currentBulkSort.direction:''}" data-app-click="sortBulk" data-col="np">Neogleamz Product</th> <th class="${currentBulkSort.column==='n'?'sorted-'+currentBulkSort.direction:''}" data-app-click="sortBulk" data-col="n">Item Name</th> <th class="${currentBulkSort.column==='sp'?'sorted-'+currentBulkSort.direction:''}" data-app-click="sortBulk" data-col="sp">Spec</th> <th class="${currentBulkSort.column==='uc'?'sorted-'+currentBulkSort.direction:''} text-right" data-app-click="sortBulk" data-col="uc">Unit Cost</th> <th style="width:120px; text-align:center; background:#8b5cf6; color:white;">Qty to Add</th> `;
    let h = `<table style="width:100%;"><thead><tr>${ths}</tr></thead><tbody id="bulkAddBody">`; let qStr = document.getElementById('bulkSearch').value.toLowerCase(); let filtered = bulkAddData.filter(x => x.nn.toLowerCase().includes(qStr) || x.np.toLowerCase().includes(qStr) || x.n.toLowerCase().includes(qStr) || x.sp.toLowerCase().includes(qStr));
    filtered.sort((x,y) => { let u = x[currentBulkSort.column]; let v = y[currentBulkSort.column]; if (typeof u === 'number' && typeof v === 'number') return currentBulkSort.direction === 'asc' ? u - v : v - u; u = (u||"").toString().toLowerCase(); v = (v||"").toString().toLowerCase(); if(u<v) return currentBulkSort.direction==='asc'?-1:1; if(u>v) return currentBulkSort.direction==='asc'?1:-1; return 0; });
    filtered.forEach(x => { let sk = String(x.k).replace(/'/g, "\\'").replace(/"/g, '&quot;'); let displaySpec = x.sp === "(Mixed Specs)" ? "⚙️ (Mixed Specs)" : x.sp; if(x.isSub) { h += `<tr><td tabindex="0" class="trunc-col" style="font-weight:bold;color:var(--text-heading);">${x.nn}</td><td tabindex="0" class="trunc-col" style="color:var(--text-muted);">Sub-Assembly</td><td tabindex="0" class="trunc-col">${x.n}</td><td tabindex="0" class="trunc-col">(Nested Recipe)</td><td class="text-right">$${x.uc.toFixed(4)}</td><td style="text-align:center;"><input type="number" class="bulk-qty-input" value="${x.q}" data-app-input="updateBulkQty" data-key="${sk}" min="0" step="any" placeholder="0" style="width:80px;text-align:center;"></td></tr>`; } else { h += `<tr><td tabindex="0" class="trunc-col" style="font-weight:bold;color:var(--text-heading);">${x.nn}</td><td tabindex="0" class="trunc-col" style="color:var(--text-muted);">${x.np}</td><td tabindex="0" class="trunc-col">${x.n}</td><td tabindex="0" class="trunc-col">${displaySpec}</td><td class="text-right">$${x.uc.toFixed(4)}</td><td style="text-align:center;"><input type="number" class="bulk-qty-input" value="${x.q}" data-app-input="updateBulkQty" data-key="${sk}" min="0" step="any" placeholder="0" style="width:80px;text-align:center;"></td></tr>`; } });
    wrap.innerHTML = h + `</tbody></table>`; applyTableInteractivity('bulkAddTableWrap');
}
window.saveBulkAdd = async function() { await executeWithButtonAction('btnSaveBulkAdd', '💾 SAVING...', '✅ SAVED!', async () => { let addedCount = 0; bulkAddData.forEach(i => { let v = parseFloat(i.q); if(v > 0) { let k = i.k; let ex = productsDB[currentProduct].find(p => String(p.item_key || p.di_item_id || p.name) === k); if(ex) { ex.quantity = (parseFloat(ex.quantity)||0) + v; ex.qty = ex.quantity; } else { productsDB[currentProduct].push({item_key: k, quantity: v}); } addedCount++; } }); if(addedCount > 0) { document.getElementById('bulkAddModal').style.display = 'none'; sysLog(`Bulk added ${addedCount} items.`); setMasterStatus("Saving...", "mod-working"); await window.syncRecipe(currentProduct); window.renderProductBOM(); window.renderProductList(); setMasterStatus("Saved!", "mod-success"); setTimeout(()=>setMasterStatus("Ready.", "status-idle"), 2000); } else { throw new Error("No quantities greater than 0 were entered."); } }).catch(e => { alert(e.message); }); }

// --- 7. PRODUCT BUILDER & LABOR LOGIC ---
window.updateLaborCosts = async function() {
    try {
        if(!currentProduct) return;
        let t = parseFloat(document.getElementById('laborTimeInput').value) || 0;
        let r = parseFloat(document.getElementById('laborRateInput').value) || 0;
        let m = parseFloat(document.getElementById('msrpInput').value) || 0;
        let w = parseFloat(document.getElementById('wholesaleInput').value) || 0;
        let isSub = document.getElementById('isSubassemblyInput').checked;
        let is3d = document.getElementById('is3dPrintInput').checked;
        let pt = parseFloat(document.getElementById('recipePrintTimeInput').value) || 0;

        laborDB[currentProduct] = { time: t, rate: r };
        pricingDB[currentProduct] = { msrp: m, wholesale: w };
        isSubassemblyDB[currentProduct] = isSub;
        const isLabel = document.getElementById('isLabelInput')?.checked || false;

        if (!productsDB[currentProduct]) productsDB[currentProduct] = [];
        productsDB[currentProduct].is_3d_print = is3d;
        productsDB[currentProduct].print_time_mins = pt;
        productsDB[currentProduct].is_label = isLabel;

        sysLog(`Updating profile for ${currentProduct}`); setMasterStatus("Saving...", "mod-working");
        const { error } = await supabaseClient.from('product_recipes').update({
            labor_time_mins: t,
            labor_rate_hr: r,
            msrp: m,
            wholesale_price: w,
            is_subassembly: isSub,
            is_3d_print: is3d,
            print_time_mins: pt,
            is_label: isLabel
        }).eq('product_name', currentProduct);

        if (error) throw new Error(error.message);
        setMasterStatus("Saved!", "mod-success"); setTimeout(()=>setMasterStatus("Ready.", "status-idle"), 2000);
        if(typeof populateDropdowns === 'function') populateDropdowns();
        window.renderProductList(); window.renderProductBOM();
        if(typeof renderFgiTable === 'function') renderFgiTable();
        let aTab = document.getElementById('analytics-tab');
        if(typeof renderAnalyticsDashboard === 'function' && aTab && aTab.classList.contains('active')) renderAnalyticsDashboard();
    } catch(e) { sysLog(e.message, true); setMasterStatus("Error", "mod-error"); }
}

window.renameCurrentProduct = async function() {
    if (!currentProduct) return;
    let newName = prompt("Enter new name:", currentProduct);
    if (!newName || !newName.trim() || newName.trim() === currentProduct) return;

    newName = newName.trim();
    if (productsDB[newName]) {
        return alert("A product with this name already exists.");
    }

    sysLog(`Renaming ${currentProduct} to ${newName}...`);
    setMasterStatus("Renaming...", "mod-working");

    let oldName = currentProduct;
    let c = productsDB[oldName] || [];
    let l = laborDB[oldName] || {time:0, rate:0};
    let pR = pricingDB[oldName] || {msrp:0, wholesale:0};
    let isSub = isSubassemblyDB[oldName] || false;
    let is3D = c.is_3d_print || false;
    let pt = c.print_time_mins || 0;

    productsDB[newName] = c;
    laborDB[newName] = l;
    pricingDB[newName] = pR;
    isSubassemblyDB[newName] = isSub;

    // API Call 1: Upsert the new duplicate product
    const { error: upsertErr } = await supabaseClient.from('product_recipes').upsert({
        product_name: newName,
        components: c,
        labor_time_mins: l.time,
        labor_rate_hr: l.rate,
        msrp: pR.msrp,
        wholesale_price: pR.wholesale,
        is_subassembly: isSub,
        is_3d_print: is3D,
        print_time_mins: pt
    });
    if (upsertErr) sysLog(`Upsert Rename Failed: ${upsertErr.message}`, true);

    // API Call 2: Delete the old artifact
    const { error: delErr } = await supabaseClient.from('product_recipes')
        .delete()
        .eq('product_name', oldName);
    if (delErr) sysLog(`Delete Old Artifact Failed: ${delErr.message}`, true);

    delete productsDB[oldName];
    delete laborDB[oldName];
    delete pricingDB[oldName];
    delete isSubassemblyDB[oldName];

    // Search and Replace internal components across the universe
    let upserts = [];
    Object.keys(productsDB).forEach(k => {
        let changed = false;
        productsDB[k].forEach(p => {
            if (String(p.item_key || p.di_item_id || p.name) === 'RECIPE:::' + oldName) {
                p.item_key = 'RECIPE:::' + newName;
                changed = true;
            }
        });
        if (changed) {
            upserts.push(supabaseClient.from('product_recipes').update({components: productsDB[k]}).eq('product_name', k));
        }
    });

    if (upserts.length > 0) {
        const results = await Promise.all(upserts);
        results.forEach(res => {
            if (res.error) sysLog(`Dependency Batch Sync Failed: ${res.error.message}`, true);
        });
    }

    currentProduct = newName;
    if (typeof populateDropdowns === 'function') populateDropdowns();
    window.renderProductList();

    setMasterStatus("Renamed!", "mod-success");
    setTimeout(() => setMasterStatus("Ready.", "status-idle"), 3000);
}

window.syncRecipe = async function(name) {
    try {
        sysLog(`Syncing recipe: ${name}`);
        const {error} = await supabaseClient.from('product_recipes').update({components: productsDB[name]}).eq('product_name', name);
        if (error) throw new Error(error.message);
        if (typeof populateDropdowns === 'function') populateDropdowns();
    } catch(e) {
        sysLog(`Recipe Sync Fault: ${e.message}`, true);
    }
}

let productDraggedName = null;

window.renderProductList = function() {
    try {
        const labelsToClean = window.activePaperProfiles ? window.activePaperProfiles.map(p => p.n) : [];
        labelsToClean.forEach(lbl => {
            if (productsDB[lbl]) {
                delete productsDB[lbl];
                supabaseClient.from('product_recipes').delete().eq('product_name', lbl).then(()=>{});
                sysLog("Purged temp Retail Product: " + lbl);
            }
        });
    } catch(e) { sysLog(`Error in product list cleanup: ${e.message}`, true); }

    const ui = document.getElementById('productListUI'); ui.innerHTML = "";
    let allProds = Object.keys(productsDB);

    // Sort based on saved preference if available
    if (window.cloudTablePrefs && window.cloudTablePrefs.productOrder) {
        allProds.sort((a,b) => {
            let iA = window.cloudTablePrefs.productOrder.indexOf(a);
            let iB = window.cloudTablePrefs.productOrder.indexOf(b);
            if(iA===-1) iA=9999; if(iB===-1) iB=9999;
            return iA - iB;
        });
    } else {
        allProds.sort();
    }

    if(allProds.length===0){ ui.innerHTML = "<li style='cursor:default; background:transparent; border:none; color:var(--text-main);'>No products.</li>"; document.getElementById('bomMainArea').style.display='none'; return; }
    let printProds = allProds.filter(p => productsDB[p] && productsDB[p].is_3d_print);
    let labelProds = allProds.filter(p => productsDB[p] && productsDB[p].is_label);

    if(!currentProduct && allProds.length > 0) currentProduct = allProds[0];

    let retailProds = allProds.filter(p => !isSubassemblyDB[p] && !printProds.includes(p) && !labelProds.includes(p));
    let subProds = allProds.filter(p => isSubassemblyDB[p] && !printProds.includes(p) && !labelProds.includes(p));
    let realPrintProds = printProds.filter(p => !labelProds.includes(p));

    function buildItem(n) {
        let sel = n === currentProduct ? 'selected' : ''; let safeName = String(n).replace(/'/g, "\\'");
        return `<li class="${sel}"
            draggable="true"
            data-app-dragstart="prodDragStart" data-name="${safeName}"
            data-app-dragover="prodDragOver"
            data-app-drop="prodDrop"
            data-app-dragend="prodDragEnd"
            data-app-click="selectProd"
            style="font-weight:bold; font-size:14px; cursor:grab; padding: 10px; border-bottom: 1px solid var(--border-color); margin-bottom: 5px; border-radius: 4px; display:flex; justify-content:space-between; align-items:center;">
            <span>☰ ${n}</span><span class="prod-cost">$${calculateProductTotal(n).toFixed(2)}</span>
        </li>`;
    }

    let savedRecipeState = null;
    try { savedRecipeState = JSON.parse(localStorage.getItem('recipeGroupState') || "null"); } catch(e) { console.warn('Invalid Recipe Group State cache cleared.'); localStorage.removeItem('recipeGroupState'); }
    window.recipeGroupState = window.recipeGroupState || savedRecipeState || {
        'cat-retail': true,
        'cat-sub': true,
        'cat-print': true,
        'cat-raw': false,
        'cat-label': true
    };

    window.toggleRecipeCategory = function(catId, btn) {
        const el = document.getElementById(catId);
        if (!el) return;
        if (el.style.display === 'none') {
            el.style.display = 'block';
            btn.innerHTML = '▼';
            window.recipeGroupState[catId] = true;
        } else {
            el.style.display = 'none';
            btn.innerHTML = '▶';
            window.recipeGroupState[catId] = false;
        }
        localStorage.setItem('recipeGroupState', JSON.stringify(window.recipeGroupState));
    };

    function getCatState(id, prodArr) {
        if (window.recipeGroupState[id] === undefined && prodArr.includes(currentProduct)) {
            window.recipeGroupState[id] = true;
        }
        return {
            disp: window.recipeGroupState[id] ? 'block' : 'none',
            arr: window.recipeGroupState[id] ? '▼' : '▶'
        };
    }

    let html = "";
    if(retailProds.length > 0) {
        let st = getCatState('cat-retail', retailProds);
        html += `<li style="cursor:pointer; background:transparent; border:none; padding:4px 0; margin-bottom:5px; border-bottom:1px solid var(--border-color); color:var(--text-muted); font-size:11px; font-weight:bold; display:flex; justify-content:space-between; align-items:center;" data-app-click="toggleRecipeCat" data-cat="cat-retail">📦 RETAIL PRODUCTS <span>${st.arr}</span></li>`;
        html += `<div id="cat-retail" style="display:${st.disp};">`;
        retailProds.forEach(p => html += buildItem(p));
        html += `</div>`;
    }
    if(subProds.length > 0) {
        let st = getCatState('cat-sub', subProds);
        html += `<li style="cursor:pointer; background:transparent; border:none; padding:4px 0; margin-bottom:5px; margin-top:10px; border-bottom:1px solid var(--border-color); color:var(--text-muted); font-size:11px; font-weight:bold; display:flex; justify-content:space-between; align-items:center;" data-app-click="toggleRecipeCat" data-cat="cat-sub">⚙️ SUB-ASSEMBLIES <span>${st.arr}</span></li>`;
        html += `<div id="cat-sub" style="display:${st.disp};">`;
        subProds.forEach(p => html += buildItem(p));
        html += `</div>`;
    }
    if(realPrintProds.length > 0) {
        let st = getCatState('cat-3d', realPrintProds);
        html += `<li style="cursor:pointer; background:transparent; border:none; padding:4px 0; margin-bottom:5px; margin-top:10px; border-bottom:1px solid var(--border-color); color:var(--text-muted); font-size:11px; font-weight:bold; display:flex; justify-content:space-between; align-items:center;" data-app-click="toggleRecipeCat" data-cat="cat-3d">🖨️ 3D PRINTS <span>${st.arr}</span></li>`;
        html += `<div id="cat-3d" style="display:${st.disp};">`;
        realPrintProds.forEach(p => html += buildItem(p));
        html += `</div>`;
    }
    if(labelProds.length > 0) {
        let st = getCatState('cat-labels', labelProds);
        html += `<li style="cursor:pointer; background:transparent; border:none; padding:4px 0; margin-bottom:5px; margin-top:10px; border-bottom:1px solid var(--border-color); color:var(--text-muted); font-size:11px; font-weight:bold; display:flex; justify-content:space-between; align-items:center;" data-app-click="toggleRecipeCat" data-cat="cat-labels">🏷️ CUSTOM LABELZ <span>${st.arr}</span></li>`;
        html += `<div id="cat-labels" style="display:${st.disp};">`;
        labelProds.forEach(p => html += buildItem(p));
        html += `</div>`;
    }

    ui.innerHTML = html;
    if(currentProduct) window.renderProductBOM();
}

function productDragStart(e, name) {
    productDraggedName = name;
    e.target.style.opacity = '0.5';
    e.dataTransfer.effectAllowed = 'move';
}
function productDragOver(e) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }
function productDragEnd(e) { e.target.style.opacity = '1'; }
function productDrop(e, targetName) {
    e.preventDefault();
    if (productDraggedName && productDraggedName !== targetName) {
        // We reorder the preference list
        let currentOrder = window.cloudTablePrefs.productOrder || Object.keys(productsDB).sort();
        let srcIdx = currentOrder.indexOf(productDraggedName);
        let tgtIdx = currentOrder.indexOf(targetName);

        if (srcIdx !== -1 && tgtIdx !== -1) {
            currentOrder.splice(srcIdx, 1);
            currentOrder.splice(tgtIdx, 0, productDraggedName);
            window.cloudTablePrefs.productOrder = currentOrder;
            window.renderProductList();
            if (typeof saveCloudPrefs === 'function') saveCloudPrefs();
        }
    }
}
window.selectProduct = function(n) { currentProduct = n; window.renderProductList(); window.renderProductBOM(); }
window.sortBOM = function(c) { currentBOMSort = { column: c, direction: currentBOMSort.column===c && currentBOMSort.direction==='asc' ? 'desc' : 'asc' }; window.saveSort('currentBOMSort', currentBOMSort); window.renderProductBOM(); }

window.renderProductBOM = function() {
    if(!currentProduct) return; document.getElementById('bomMainArea').style.display='block'; document.getElementById('bomTitle').innerText=currentProduct;

    let lData = laborDB[currentProduct] || {time:0, rate:0};
    let pData = pricingDB[currentProduct] || {msrp:0, wholesale:0};
    document.getElementById('laborTimeInput').value = lData.time;
    document.getElementById('laborRateInput').value = lData.rate;
    document.getElementById('msrpInput').value = pData.msrp;
    document.getElementById('wholesaleInput').value = pData.wholesale;
    document.getElementById('isSubassemblyInput').checked = !!isSubassemblyDB[currentProduct];

    let p = productsDB[currentProduct]||[];
    document.getElementById('is3dPrintInput').checked = !!p.is_3d_print;
    document.getElementById('recipePrintTimeInput').value = p.print_time_mins || 0;
    if (document.getElementById('isLabelInput')) document.getElementById('isLabelInput').checked = !!p.is_label;

    let gt = 0; let wrap = document.getElementById('bomTableWrap');

    let ths = ` <th class="${currentBOMSort.column==='nn'?'sorted-'+currentBOMSort.direction:''}" data-app-click="sortBOM" data-col="nn">Neogleamz Name</th> <th class="${currentBOMSort.column==='np'?'sorted-'+currentBOMSort.direction:''}" data-app-click="sortBOM" data-col="np">Neogleamz Product</th> <th class="${currentBOMSort.column==='n'?'sorted-'+currentBOMSort.direction:''}" data-app-click="sortBOM" data-col="n">Item Name</th> <th class="${currentBOMSort.column==='sp'?'sorted-'+currentBOMSort.direction:''}" data-app-click="sortBOM" data-col="sp">Spec</th> <th class="${currentBOMSort.column==='q'?'sorted-'+currentBOMSort.direction:''} text-right" data-app-click="sortBOM" data-col="q">Qty</th> <th class="${currentBOMSort.column==='uc'?'sorted-'+currentBOMSort.direction:''} text-right" data-app-click="sortBOM" data-col="uc">Unit Cost</th> <th class="${currentBOMSort.column==='ec'?'sorted-'+currentBOMSort.direction:''} text-right" data-app-click="sortBOM" data-col="ec">Total Ext. Cost</th> <th style="width: 40px; text-align:center;">Action</th> `;
    let h = `<table style="width:100%;"><thead><tr>${ths}</tr></thead><tbody id="bomTableBody">`;
    if(p.length===0){ h += "<tr><td colspan='8' style='text-align:center;'>No components.</td></tr>"; }
    else {
        let a = [];
        p.forEach(x => { let k = String(x.item_key||x.di_item_id||x.name); let q = parseFloat(x.quantity||x.qty)||1; let nn="", np="", n="", sp="", uc=0; if(k.startsWith('RECIPE:::')) { let s = k.replace('RECIPE:::', ''); let pData = productsDB[s] || {}; nn= (pData.is_3d_print ? "🖨️ " : (isSubassemblyDB[s] ? "⚙️ " : "📦 ")) + s; np="Sub-Assembly"; n=""; sp=""; uc=getEngineTrueCogs(s); } else { let c = catalogCache[k]; if(c){ nn=c.neoName; np=c.neoProd; n=c.itemName; sp=c.spec; uc=c.avgUnitCost; } else { n="Unknown Item"; sp="N/A"; } } let ec = uc*q; gt+=ec; a.push({rawKey: k, nn: nn, np: np, n: n, sp: sp, q: q, uc: uc, ec: ec}); });
        a.sort((x,y) => { let u = x[currentBOMSort.column]; let v = y[currentBOMSort.column]; if (typeof u === 'number' && typeof v === 'number') return currentBOMSort.direction === 'asc' ? u - v : v - u; u = (u||"").toString().toLowerCase(); v = (v||"").toString().toLowerCase(); if(u<v) return currentBOMSort.direction==='asc'?-1:1; if(u>v) return currentBOMSort.direction==='asc'?1:-1; return 0; });
        a.forEach(x => { let sk = String(x.rawKey).replace(/'/g, "\\'").replace(/"/g, '&quot;'); let displaySpec = x.sp === "(Mixed Specs)" ? "⚙️ (Mixed Specs)" : x.sp; if(x.rawKey.startsWith('RECIPE:::')) { h += `<tr><td tabindex="0" class="trunc-col" style="font-weight:bold; color:var(--text-heading);">${x.nn}</td><td tabindex="0" class="trunc-col" style="color:var(--text-muted);">Sub-Assembly</td><td tabindex="0" class="trunc-col">${x.n}</td><td tabindex="0" class="trunc-col">${displaySpec}</td><td class="text-right editable" style="font-weight:bold; color:#0ea5e9;" contenteditable="true" data-key="${sk}" data-app-focus="bomStoreOldVal" data-app-blur="updateBOMQty">${x.q}</td><td class="text-right">$${x.uc.toFixed(4)}</td><td class="text-right" style="font-weight:bold;">$${x.ec.toFixed(4)}</td><td style="text-align:center;"><button style="background:#ef4444; padding:4px 8px; font-size:12px; width:auto;" data-key="${sk}" data-app-click="removeBOMPart">X</button></td></tr>`; } else { h += `<tr><td tabindex="0" class="trunc-col" style="font-weight:bold; color:var(--text-heading);">${x.nn}</td><td tabindex="0" class="trunc-col" style="color:var(--text-muted);">${x.np}</td><td tabindex="0" class="trunc-col">${x.n}</td><td tabindex="0" class="trunc-col">${displaySpec}</td><td class="text-right editable" style="font-weight:bold; color:#0ea5e9;" contenteditable="true" data-key="${sk}" data-app-focus="bomStoreOldVal" data-app-blur="updateBOMQty">${x.q}</td><td class="text-right">$${x.uc.toFixed(4)}</td><td class="text-right" style="font-weight:bold;">$${x.ec.toFixed(4)}</td><td style="text-align:center;"><button style="background:#ef4444; padding:4px 8px; font-size:12px; width:auto;" data-key="${sk}" data-app-click="removeBOMPart">X</button></td></tr>`; } });
    }
    wrap.innerHTML = h + `</tbody></table>`; document.getElementById('bomTotalCost').innerText = `$${getEngineTrueCogs(currentProduct).toFixed(2)}`; applyTableInteractivity('bomTableWrap');
}
window.updateBOMQty = async function(cell) { try { let v = parseFloat(cell.innerText.replace(/[^0-9.-]+/g,"")); if(isNaN(v) || v<=0) { cell.innerText=oldValTemp; return; } if(v.toString()===oldValTemp) return; let k = cell.getAttribute('data-key').replace(/\\'/g, "'"); let p = productsDB[currentProduct].find(x => String(x.item_key || x.di_item_id || x.name) === k); if(p) { p.quantity = v; p.qty = v; cell.classList.add('edited-success'); setTimeout(()=>cell.classList.remove('edited-success'),1000); await window.syncRecipe(currentProduct); window.renderProductList(); } } catch(e) { sysLog(e.message, true); } }
window.removePart = async function(btn) { try { if(!currentProduct) return; let k = btn.getAttribute('data-key').replace(/\\'/g, "'"); let arr = productsDB[currentProduct]; for(let i=arr.length-1; i>=0; i--) { if(String(arr[i].item_key || arr[i].di_item_id || arr[i].name) === k) { arr.splice(i, 1); } } await window.syncRecipe(currentProduct); window.renderProductBOM(); window.renderProductList(); } catch(e) { sysLog(e.message, true); } }
window.addPartToProduct = async function() { try { if(!currentProduct) return alert("Select product."); let k = document.getElementById('partSelector').value; let q = parseFloat(document.getElementById('partQty').value) || 0; if(q<=0 || !k) return alert("Invalid inputs."); if(k === 'RECIPE:::' + currentProduct) return alert("No self nesting."); let ex = productsDB[currentProduct].find(p => String(p.item_key || p.di_item_id || p.name) === k); if(ex) { ex.quantity = (parseFloat(ex.quantity)||0) + q; ex.qty = ex.quantity; } else productsDB[currentProduct].push({item_key: k, quantity: q}); await window.syncRecipe(currentProduct); window.renderProductBOM(); window.renderProductList(); } catch(e) { sysLog(e.message, true); } }
let recipeModalMode = '';
window.showRecipeModal = function(mode) {
    recipeModalMode = mode;
    const m = document.getElementById('recipeActionModal');
    const t = document.getElementById('recipeModalTitle');
    const p = document.getElementById('recipeModalText');
    const i = document.getElementById('recipeModalInput');
    const b = document.getElementById('recipeModalConfirmBtn');

    if(mode === 'create') {
        t.innerText = "Create New Recipe";
        p.innerText = "Enter a unique name for the new product or sub-assembly:";
        i.style.display = "block";
        i.value = "";
        b.innerText = "Create";
        b.className = "btn-green";
        m.style.display = "flex";
        setTimeout(() => i.focus(), 100);
    } else if(mode === 'delete') {
        if(!currentProduct) return;
        t.innerText = "Delete Recipe";
        p.innerText = "Are you absolutely sure you want to delete '" + currentProduct + "' forever?";
        i.style.display = "none";
        b.innerText = "Delete";
        b.className = "btn-red";
        m.style.display = "flex";
    }
}
window.submitRecipeModal = async function() {
    await executeWithButtonAction('recipeModalConfirmBtn', 'PROCESSING...', '✅ DONE!', async () => {
        if(recipeModalMode === 'create') {
            let val = document.getElementById('recipeModalInput').value;
            if(val) await window.executeCreateNewProduct(val);
        } else if(recipeModalMode === 'delete') {
            await window.executeDeleteCurrentProduct();
        }
        document.getElementById('recipeActionModal').style.display='none';
    });
}

window.executeCreateNewProduct = async function(n) { try { if(!n || !n.trim() || productsDB[n.trim()]) return; n = n.trim(); productsDB[n] = []; laborDB[n] = {time:0, rate:0}; pricingDB[n] = {msrp:0, wholesale:0}; isSubassemblyDB[n] = false; await supabaseClient.from('product_recipes').insert({product_name: n, components: [], labor_time_mins: 0, labor_rate_hr: 0, msrp: 0, wholesale_price: 0, is_subassembly: false, is_3d_print: false, print_time_mins: 0}); currentProduct = n; window.renderProductList(); window.renderProductBOM(); if(typeof populateDropdowns === 'function') populateDropdowns(); } catch(e) { sysLog(e.message, true); } }
window.executeDeleteCurrentProduct = async function() { try { if(!currentProduct) return; sysLog(`Deleting ${currentProduct}`); const {error} = await supabaseClient.from('product_recipes').delete().eq('product_name', currentProduct);
            if(error) throw new Error(error.message); delete productsDB[currentProduct]; delete laborDB[currentProduct]; delete pricingDB[currentProduct]; delete isSubassemblyDB[currentProduct]; let ups = []; Object.keys(productsDB).forEach(n => { let arr = productsDB[n]; let oL = arr.length; for(let i=arr.length-1; i>=0; i--) { if(String(arr[i].item_key || arr[i].di_item_id || arr[i].name) === 'RECIPE:::'+currentProduct) { arr.splice(i, 1); } } if(arr.length !== oL) ups.push(supabaseClient.from('product_recipes').update({components: arr}).eq('product_name', n)); }); if(ups.length>0) await Promise.all(ups); currentProduct = Object.keys(productsDB)[0]||null; if(typeof populateDropdowns === 'function') populateDropdowns(); window.renderProductList(); } catch(e) { sysLog(e.message, true); } }

// --- BOM EVENT DELEGATION ---
document.addEventListener('focusin', (e) => {
    if (e.target.dataset.appFocus === 'bomStoreOldVal') { if(typeof storeOldVal === 'function') storeOldVal(e.target); }
});
document.addEventListener('focusout', (e) => {
    if (e.target.dataset.appBlur === 'updateBOMQty') { if(typeof updateBOMQty === 'function') updateBOMQty(e.target); }
});
document.addEventListener('input', (e) => {
    if (e.target.dataset.appInput === 'updateBulkQty') { if(typeof updateBulkQty === 'function') updateBulkQty(e.target.dataset.key, e.target.value); }
});
document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-app-click]');
    if (!btn) return;
    const action = btn.dataset.appClick;
    if (action === 'sortBulk') { if(typeof sortBulk === 'function') sortBulk(btn.dataset.col); }
    if (action === 'selectProd') { if(typeof window.selectProduct === 'function') window.selectProduct(btn.dataset.name); }
    if (action === 'toggleRecipeCat') { if(typeof window.toggleRecipeCategory === 'function') window.toggleRecipeCategory(btn.dataset.cat, btn.querySelector('span') || btn); }
    if (action === 'sortBOM') { if(typeof sortBOM === 'function') sortBOM(btn.dataset.col); }
    if (action === 'removeBOMPart') { if(typeof removePart === 'function') removePart(btn); }
});
document.addEventListener('dragstart', (e) => {
    let el = e.target.closest('[data-app-dragstart]');
    if(el && el.dataset.appDragstart === 'prodDragStart') { if(typeof productDragStart === 'function') productDragStart(e, el.dataset.name); }
});
document.addEventListener('dragover', (e) => {
    let el = e.target.closest('[data-app-dragover]');
    if(el && el.dataset.appDragover === 'prodDragOver') { if(typeof productDragOver === 'function') productDragOver(e); }
});
document.addEventListener('drop', (e) => {
    let el = e.target.closest('[data-app-drop]');
    if(el && el.dataset.appDrop === 'prodDrop') { if(typeof productDrop === 'function') productDrop(e, el.dataset.name); }
});
document.addEventListener('dragend', (e) => {
    let el = e.target.closest('[data-app-dragend]');
    if(el && el.dataset.appDragend === 'prodDragEnd') { if(typeof productDragEnd === 'function') productDragEnd(e); }
});
