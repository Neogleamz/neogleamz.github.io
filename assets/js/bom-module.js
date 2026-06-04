/**
 * @typedef {Object} BomTreeNode
 * @property {string} [item_key]
 * @property {string} [di_item_id]
 * @property {string} [name]
 * @property {number|string} [quantity]
 * @property {number|string} [qty]
 */

window.openBulkAddModal = function() {
    if(!currentProduct) return alert("Please select a product from the sidebar first."); document.getElementById('bulkAddTitle').innerText = currentProduct; bulkAddData = [];
// --- 6. BULK MODAL ---
    Object.keys(productsDB).sort().forEach(p => { 
        if(p === currentProduct) return; 
        let pData = productsDB[p] || {}; 
        let iconStr = pData.is_3d_print ? "🖨️ " : (pData.is_label ? (pData.label_emoji ? pData.label_emoji + " " : "🏷️ ") : (isSubassemblyDB[p] ? "⚙️ " : "📦 ")); 
        let typeStr = pData.is_label ? "Custom Labelz" : (pData.is_3d_print ? "3D Print" : (isSubassemblyDB[p] ? "Sub-Assembly" : "Retail Product"));
        let grp = pData.is_label ? 4 : (pData.is_3d_print ? 2 : 1);
        bulkAddData.push({ k: `RECIPE:::${p}`, isSub: true, nn: iconStr + p, np: typeStr, n: "", sp: "(Nested Recipe)", uc: getEngineTrueCogs(p), q: "", g: grp }); 
        bulkAddData.push({ k: `BARCODE_LABEL:::${p}`, isSub: false, nn: "🏷️ [Barcode] " + p, np: "Product Barcode", n: p, sp: "Standard Thermal", uc: 0, q: "", g: 5 });
    });
    Object.keys(catalogCache).forEach(k => { let c = catalogCache[k]; if (c.is_anchor) return; bulkAddData.push({ k: k, isSub: false, nn: "🔩 " + (c.neoName || c.itemName || ""), np: c.neoProd||"", n: c.itemName||"", sp: c.spec||"", uc: c.avgUnitCost, q: "", g: 3 }); });
    document.getElementById('bulkSearch').value = ""; document.getElementById('bulkAddModal').style.display = 'flex'; window.renderBulkAddBody();
}
window.sortBulk = function(c) { currentBulkSort = { column: c, direction: currentBulkSort.column===c && currentBulkSort.direction==='asc' ? 'desc' : 'asc' }; window.saveSort('currentBulkSort_v2', currentBulkSort); window.renderBulkAddBody(); }
window.updateBulkQty = function(k, v) { let i = bulkAddData.find(x => x.k === k); if(i) i.q = v; }
window.filterBulkList = function() { window.renderBulkAddBody(); }
window.renderBulkAddBody = function() {
    let wrap = document.getElementById('bulkAddTableWrap'); if(!wrap) return;
    let ths = ` <th class="${currentBulkSort.column==='nn'?'sorted-'+currentBulkSort.direction:''}" data-app-click="sortBulk" data-col="nn">Neogleamz Name</th> <th class="${currentBulkSort.column==='np'?'sorted-'+currentBulkSort.direction:''}" data-app-click="sortBulk" data-col="np">Neogleamz Product</th> <th class="${currentBulkSort.column==='n'?'sorted-'+currentBulkSort.direction:''}" data-app-click="sortBulk" data-col="n">Item Name</th> <th class="${currentBulkSort.column==='sp'?'sorted-'+currentBulkSort.direction:''}" data-app-click="sortBulk" data-col="sp">Spec</th> <th class="${currentBulkSort.column==='uc'?'sorted-'+currentBulkSort.direction:''} text-right" data-app-click="sortBulk" data-col="uc">Unit Cost</th> <th style="width:120px; text-align:center; background:#8b5cf6; color:white;">Qty to Add</th> `;
    let h = `<table style="width:100%;"><thead><tr>${ths}</tr></thead><tbody id="bulkAddBody">`; let qStr = document.getElementById('bulkSearch').value.toLowerCase(); let filtered = bulkAddData.filter(x => x.nn.toLowerCase().includes(qStr) || x.np.toLowerCase().includes(qStr) || x.n.toLowerCase().includes(qStr) || x.sp.toLowerCase().includes(qStr));
    filtered.sort((x,y) => { 
        if (currentBulkSort.column === 'g') {
            if (x.g !== y.g) return currentBulkSort.direction === 'asc' ? x.g - y.g : y.g - x.g;
            return x.nn.localeCompare(y.nn);
        }
        let u = x[currentBulkSort.column]; let v = y[currentBulkSort.column]; if (typeof u === 'number' && typeof v === 'number') return currentBulkSort.direction === 'asc' ? u - v : v - u; u = (u||"").toString().toLowerCase(); v = (v||"").toString().toLowerCase(); if(u<v) return currentBulkSort.direction==='asc'?-1:1; if(u>v) return currentBulkSort.direction==='asc'?1:-1; return 0; 
    });
    filtered.forEach(x => { let sk = String(x.k).replace(/'/g, "\\'").replace(/"/g, '&quot;'); let displaySpec = x.sp === "(Mixed Specs)" ? "⚙️ (Mixed Specs)" : x.sp; if(x.isSub) { let safeSubName = String(x.k).replace('RECIPE:::', '').replace(/'/g, "\\'").replace(/"/g, '&quot;'); h += `<tr><td tabindex="0" class="trunc-col" style="font-weight:bold; color:var(--accent-color, #38bdf8); cursor:pointer; text-decoration:underline;" data-app-click="selectProd" data-name="${safeSubName}" onclick="document.getElementById('bulkAddModal').style.display='none';">${x.nn}</td><td tabindex="0" class="trunc-col" style="color:var(--text-muted);">${x.np}</td><td tabindex="0" class="trunc-col">${x.n}</td><td tabindex="0" class="trunc-col">(Nested Recipe)</td><td class="text-right">$${x.uc.toFixed(4)}</td><td style="text-align:center;"><input type="number" class="bulk-qty-input" value="${x.q}" data-app-input="updateBulkQty" data-key="${sk}" min="0" step="any" placeholder="0" style="width:80px;text-align:center;"></td></tr>`; } else { h += `<tr><td tabindex="0" class="trunc-col" style="font-weight:bold;color:var(--text-heading);">${x.nn}</td><td tabindex="0" class="trunc-col" style="color:var(--text-muted);">${x.np}</td><td tabindex="0" class="trunc-col">${x.n}</td><td tabindex="0" class="trunc-col">${displaySpec}</td><td class="text-right">$${x.uc.toFixed(4)}</td><td style="text-align:center;"><input type="number" class="bulk-qty-input" value="${x.q}" data-app-input="updateBulkQty" data-key="${sk}" min="0" step="any" placeholder="0" style="width:80px;text-align:center;"></td></tr>`; } });
    wrap.innerHTML = window.safeHTML ? window.safeHTML(h + `</tbody></table>`) : h + `</tbody></table>`; applyTableInteractivity('bulkAddTableWrap');
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
        
        let pUuid = window.uuidMap['RECIPE:::' + currentProduct];
        if (!pUuid) throw new Error("UUID mapping missing for product: " + currentProduct);

        const { error } = await supabaseClient.from('product_recipes').update({
            labor_time_mins: t,
            labor_rate_hr: r,
            msrp: m,
            wholesale_price: w,
            is_subassembly: isSub,
            is_3d_print: is3d,
            print_time_mins: pt,
            is_label: isLabel
        }).eq('product_item_uuid', pUuid);

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
    let pUuid = window.uuidMap['RECIPE:::' + oldName];
    if (!pUuid) return alert("Fatal Error: No UUID linked to recipe " + oldName);

    // With UUID architecture, renaming a recipe just means updating the master ledger string!
    const { error: renameErr } = await supabaseClient.from('full_landed_costs')
        .update({ neogleamz_product: newName, item_name: newName })
        .eq('item_uuid', pUuid);

    if (renameErr) {
        sysLog(`Rename Failed: ${renameErr.message}`, true);
        return alert("Error renaming recipe: " + renameErr.message);
    }

    // Refresh local mappings
    let c = productsDB[oldName] || [];
    let l = laborDB[oldName] || {time:0, rate:0};
    let pR = pricingDB[oldName] || {msrp:0, wholesale:0};
    let isSub = isSubassemblyDB[oldName] || false;

    productsDB[newName] = c;
    laborDB[newName] = l;
    pricingDB[newName] = pR;
    isSubassemblyDB[newName] = isSub;

    delete productsDB[oldName];
    delete laborDB[oldName];
    delete pricingDB[oldName];
    delete isSubassemblyDB[oldName];
    
    window.uuidMap['RECIPE:::' + newName] = pUuid;
    delete window.uuidMap['RECIPE:::' + oldName];
    window.uuidToNameMap[pUuid] = 'RECIPE:::' + newName;

    currentProduct = newName;
    if (typeof populateDropdowns === 'function') populateDropdowns();
    window.renderProductList();

    setMasterStatus("Renamed!", "mod-success");
    setTimeout(() => setMasterStatus("Ready.", "status-idle"), 3000);
}

    window.translateRecipeForDB = function(arr) {
        let dbPayload = [];
        (arr || []).forEach(c => {
            let p = { ...c };
            let k = p.item_key || p.di_item_id || p.name;
            if (k && k.startsWith('BARCODE_LABEL:::')) {
                dbPayload.push(p);
            } else if (k && window.uuidMap && window.uuidMap[k]) {
                p.item_uuid = window.uuidMap[k];
                // We deliberately keep p.item_key here so it saves to the database for human readability!
                dbPayload.push(p);
            } else {
                dbPayload.push(p);
            }
        });
        return dbPayload;
    };

    window.syncRecipe = async function(name) {
        try {
            sysLog(`Syncing recipe: ${name}`);
            let pUuid = window.uuidMap['RECIPE:::' + name];
            if (!pUuid) throw new Error("UUID mapping missing for recipe sync!");
            
            let dbPayload = window.translateRecipeForDB(productsDB[name]);
            const {error} = await supabaseClient.from('product_recipes').update({components: dbPayload}).eq('product_item_uuid', pUuid);
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
                let lUuid = window.uuidMap['RECIPE:::' + lbl];
                if (lUuid) supabaseClient.from('product_recipes').delete().eq('product_item_uuid', lUuid).then(()=>{});
                sysLog("Purged temp Retail Product: " + lbl);
            }
        });
    } catch(e) { sysLog(`Error in product list cleanup: ${e.message}`, true); }

    const ui = document.getElementById('productListUI'); ui.innerHTML = window.safeHTML ? window.safeHTML("") : "";
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

    if(allProds.length===0){ ui.innerHTML = window.safeHTML ? window.safeHTML(
        "<li style='cursor:default; background:transparent; border:none; color:var(--text-main);'>No products.</li>"
    ) : "<li style='cursor:default; background:transparent; border:none; color:var(--text-main);'>No products.</li>"; document.getElementById('bomMainArea').style.display='none'; return; }
    let printProds = allProds.filter(p => productsDB[p] && productsDB[p].is_3d_print);
    let labelProds = allProds.filter(p => productsDB[p] && productsDB[p].is_label);

    if(!currentProduct && allProds.length > 0) currentProduct = allProds[0];

    let retailProds = allProds.filter(p => !isSubassemblyDB[p] && !printProds.includes(p) && !labelProds.includes(p));
    let subProds = allProds.filter(p => isSubassemblyDB[p] && !printProds.includes(p) && !labelProds.includes(p));
    let realPrintProds = printProds.filter(p => !labelProds.includes(p));

    function buildItem(n) {
        let sel = n === currentProduct ? 'selected' : ''; let safeName = String(n).replace(/'/g, "\\'").replace(/"/g, '&quot;');
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
    try { savedRecipeState = JSON.parse(localStorage.getItem('recipeGroupState') || "null"); } catch(_e) { console.warn('Invalid Recipe Group State cache cleared.'); localStorage.removeItem('recipeGroupState'); }
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
            btn.innerHTML = window.safeHTML ? window.safeHTML('▼') : '▼';
            window.recipeGroupState[catId] = true;
        } else {
            el.style.display = 'none';
            btn.innerHTML = window.safeHTML ? window.safeHTML('▶') : '▶';
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
        html += `<li class="neo-category-row" data-app-click="toggleRecipeCat" data-cat="cat-retail">
            <span style="font-weight:900; color:var(--text-heading); font-size:12px; letter-spacing:1px; display:flex; align-items:center; gap:8px;">
                <span class="cat-arrow" style="color:var(--text-muted); width:20px; text-align:center;">${st.arr}</span> 
                <span>📦 RETAIL PRODUCTS</span>
            </span>
            <span style="color:var(--text-muted); font-size:12px; font-weight:bold;">(${retailProds.length})</span>
        </li>`;
        html += `<div id="cat-retail" style="display:${st.disp};">`;
        retailProds.forEach(p => html += buildItem(p));
        html += `</div>`;
    }
    if(subProds.length > 0) {
        let st = getCatState('cat-sub', subProds);
        html += `<li class="neo-category-row" data-app-click="toggleRecipeCat" data-cat="cat-sub">
            <span style="font-weight:900; color:var(--text-heading); font-size:12px; letter-spacing:1px; display:flex; align-items:center; gap:8px;">
                <span class="cat-arrow" style="color:var(--text-muted); width:20px; text-align:center;">${st.arr}</span> 
                <span>⚙️ SUB-ASSEMBLIES</span>
            </span>
            <span style="color:var(--text-muted); font-size:12px; font-weight:bold;">(${subProds.length})</span>
        </li>`;
        html += `<div id="cat-sub" style="display:${st.disp};">`;
        subProds.forEach(p => html += buildItem(p));
        html += `</div>`;
    }
    if(realPrintProds.length > 0) {
        let st = getCatState('cat-3d', realPrintProds);
        html += `<li class="neo-category-row" data-app-click="toggleRecipeCat" data-cat="cat-3d">
            <span style="font-weight:900; color:var(--text-heading); font-size:12px; letter-spacing:1px; display:flex; align-items:center; gap:8px;">
                <span class="cat-arrow" style="color:var(--text-muted); width:20px; text-align:center;">${st.arr}</span> 
                <span>🖨️ 3D PRINTS</span>
            </span>
            <span style="color:var(--text-muted); font-size:12px; font-weight:bold;">(${realPrintProds.length})</span>
        </li>`;
        html += `<div id="cat-3d" style="display:${st.disp};">`;
        realPrintProds.forEach(p => html += buildItem(p));
        html += `</div>`;
    }
    if(labelProds.length > 0) {
        let st = getCatState('cat-labels', labelProds);
        html += `<li class="neo-category-row" data-app-click="toggleRecipeCat" data-cat="cat-labels">
            <span style="font-weight:900; color:var(--text-heading); font-size:12px; letter-spacing:1px; display:flex; align-items:center; gap:8px;">
                <span class="cat-arrow" style="color:var(--text-muted); width:20px; text-align:center;">${st.arr}</span> 
                <span>🏷️ CUSTOM LABELZ</span>
            </span>
            <span style="color:var(--text-muted); font-size:12px; font-weight:bold;">(${labelProds.length})</span>
        </li>`;
        html += `<div id="cat-labels" style="display:${st.disp};">`;
        labelProds.forEach(p => html += buildItem(p));
        html += `</div>`;
    }

    ui.innerHTML = window.safeHTML ? window.safeHTML(html) : html;
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

    let _gt = 0; let wrap = document.getElementById('bomTableWrap');

    let ths = ` <th class="${currentBOMSort.column==='nn'?'sorted-'+currentBOMSort.direction:''}" data-app-click="sortBOM" data-col="nn">Neogleamz Name</th> <th class="${currentBOMSort.column==='np'?'sorted-'+currentBOMSort.direction:''}" data-app-click="sortBOM" data-col="np">Neogleamz Product</th> <th class="${currentBOMSort.column==='n'?'sorted-'+currentBOMSort.direction:''}" data-app-click="sortBOM" data-col="n">Item Name</th> <th class="${currentBOMSort.column==='sp'?'sorted-'+currentBOMSort.direction:''}" data-app-click="sortBOM" data-col="sp">Spec</th> <th class="${currentBOMSort.column==='q'?'sorted-'+currentBOMSort.direction:''} text-right" data-app-click="sortBOM" data-col="q">Qty</th> <th class="${currentBOMSort.column==='uc'?'sorted-'+currentBOMSort.direction:''} text-right" data-app-click="sortBOM" data-col="uc">Unit Cost</th> <th class="${currentBOMSort.column==='ec'?'sorted-'+currentBOMSort.direction:''} text-right" data-app-click="sortBOM" data-col="ec">Total Ext. Cost</th> <th style="width: 40px; text-align:center;">Action</th> `;
    let h = `<table style="width:100%;"><thead><tr>${ths}</tr></thead><tbody id="bomTableBody">`;
    if(p.length===0){ h += "<tr><td colspan='8' style='text-align:center;'>No components.</td></tr>"; }
    else {
        let a = [];
        p.forEach(x => { 
            let k = String(x.item_key||x.di_item_id||x.name); 
            let q = parseFloat(x.quantity||x.qty)||1; 
            let nn, np, n, sp, uc; 
            if(k.startsWith('RECIPE:::')) { 
                let s = k.replace('RECIPE:::', ''); 
                let pData = productsDB[s] || {}; 
                nn= (pData.is_3d_print ? "🖨️ " : (pData.is_label ? (pData.label_emoji ? pData.label_emoji + " " : "🏷️ ") : (isSubassemblyDB[s] ? "⚙️ " : "📦 "))) + s; 
                np= pData.is_label ? "Custom Labelz" : (pData.is_3d_print ? "3D Print" : (isSubassemblyDB[s] ? "Sub-Assembly" : "Retail Product")); 
                n=""; 
                sp=""; 
                uc=getEngineTrueCogs(s); 
            } else if (k.startsWith('BARCODE_LABEL:::')) {
                let s = k.replace('BARCODE_LABEL:::', '');
                nn = "🏷️ [Barcode] " + s;
                np = "Product Barcode";
                n = s;
                sp = "Standard Thermal";
                uc = 0;
            } else { 
                let c = catalogCache[k];

                if(c){ 
                    nn="🔩 " + (c.neoName || c.itemName || ""); 
                    np=c.neoProd; 
                    n=c.itemName; 
                    sp=c.spec; 
                    uc=c.avgUnitCost; 
                } else { 
                    nn="🔩 Unknown Item";
                    n="Unknown Item"; 
                    sp="N/A"; 
                    uc=0; 
                } 
            } 
            let ec = uc*q; 
            a.push({rawKey: k, nn: nn, np: np, n: n, sp: sp, q: q, uc: uc, ec: ec}); 
        });
        a.sort((x,y) => { let u = x[currentBOMSort.column]; let v = y[currentBOMSort.column]; if (typeof u === 'number' && typeof v === 'number') return currentBOMSort.direction === 'asc' ? u - v : v - u; u = (u||"").toString().toLowerCase(); v = (v||"").toString().toLowerCase(); if(u<v) return currentBOMSort.direction==='asc'?-1:1; if(u>v) return currentBOMSort.direction==='asc'?1:-1; return 0; });
        a.forEach(x => { let sk = String(x.rawKey).replace(/'/g, "\\'").replace(/"/g, '&quot;'); let displaySpec = x.sp === "(Mixed Specs)" ? "⚙️ (Mixed Specs)" : x.sp; if(x.rawKey.startsWith('RECIPE:::')) { let safeSubName = String(x.rawKey).replace('RECIPE:::', '').replace(/'/g, "\\'").replace(/"/g, '&quot;'); h += `<tr><td tabindex="0" class="trunc-col" style="font-weight:bold; color:var(--accent-color, #38bdf8); cursor:pointer; text-decoration:underline;" data-app-click="selectProd" data-name="${safeSubName}">${x.nn}</td><td tabindex="0" class="trunc-col" style="color:var(--text-muted);">${x.np}</td><td tabindex="0" class="trunc-col">${x.n}</td><td tabindex="0" class="trunc-col">${displaySpec}</td><td class="text-right editable" style="font-weight:bold; color:#0ea5e9;" contenteditable="true" data-key="${sk}" data-app-focus="bomStoreOldVal" data-app-blur="updateBOMQty">${x.q}</td><td class="text-right">$${x.uc.toFixed(4)}</td><td class="text-right" style="font-weight:bold;">$${x.ec.toFixed(4)}</td><td style="text-align:center;"><button style="background:#ef4444; padding:4px 8px; font-size:12px; width:auto;" data-key="${sk}" data-app-click="removeBOMPart">X</button></td></tr>`; } else { h += `<tr><td tabindex="0" class="trunc-col" style="font-weight:bold; color:var(--text-heading);">${x.nn}</td><td tabindex="0" class="trunc-col" style="color:var(--text-muted);">${x.np}</td><td tabindex="0" class="trunc-col">${x.n}</td><td tabindex="0" class="trunc-col">${displaySpec}</td><td class="text-right editable" style="font-weight:bold; color:#0ea5e9;" contenteditable="true" data-key="${sk}" data-app-focus="bomStoreOldVal" data-app-blur="updateBOMQty">${x.q}</td><td class="text-right">$${x.uc.toFixed(4)}</td><td class="text-right" style="font-weight:bold;">$${x.ec.toFixed(4)}</td><td style="text-align:center;"><button style="background:#ef4444; padding:4px 8px; font-size:12px; width:auto;" data-key="${sk}" data-app-click="removeBOMPart">X</button></td></tr>`; } });
    }
    wrap.innerHTML = window.safeHTML ? window.safeHTML(h + `</tbody></table>`) : h + `</tbody></table>`; document.getElementById('bomTotalCost').innerText = `$${getEngineTrueCogs(currentProduct).toFixed(2)}`; applyTableInteractivity('bomTableWrap');
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

window.executeCreateNewProduct = async function(n) { 
    try { 
        if(!n || !n.trim() || productsDB[n.trim()]) return; 
        n = n.trim(); 
        productsDB[n] = []; 
        laborDB[n] = {time:0, rate:0}; 
        pricingDB[n] = {msrp:0, wholesale:0}; 
        isSubassemblyDB[n] = false; 

        // 1. Insert master record into full_landed_costs
        const { data: flcData, error: flcError } = await supabaseClient.from('full_landed_costs').insert({
            parcel_no: 'RECIPE_AUTO',
            di_item_id: 'RECIPE-' + Date.now(),
            order_no: 'MANUAL',
            alibaba_order: 'MANUAL',
            item_name: n,
            neogleamz_product: n,
            quantity: 1,
            order_date: new Date().toISOString().split('T')[0]
        }).select('item_uuid').single();
        if (flcError) throw new Error(flcError.message);
        
        let newUuid = flcData.item_uuid;

        // Map the new UUID immediately
        window.uuidMap = window.uuidMap || {};
        window.uuidMap[`RECIPE:::${n}`] = newUuid;
        window.uuidToNameMap = window.uuidToNameMap || {};
        window.uuidToNameMap[newUuid] = `RECIPE:::${n}`;

        // 2. Insert into product_recipes using UUID
        await supabaseClient.from('product_recipes').insert({
            product_item_uuid: newUuid, 
            components: [], 
            labor_time_mins: 0, 
            labor_rate_hr: 0, 
            msrp: 0, 
            wholesale_price: 0, 
            is_subassembly: false, 
            is_3d_print: false, 
            print_time_mins: 0
        }); 
        currentProduct = n; 
        window.renderProductList(); 
        window.renderProductBOM(); 
        if(typeof populateDropdowns === 'function') populateDropdowns(); 
    } catch(e) { sysLog(e.message, true); } 
}

window.executeDeleteCurrentProduct = async function() { 
    try { 
        if(!currentProduct) return; 
        sysLog(`Deleting ${currentProduct}`); 
        let pUuid = window.uuidMap['RECIPE:::' + currentProduct];
        if(!pUuid) throw new Error("UUID missing for " + currentProduct);
        // Cascade delete via full_landed_costs!
        const {error} = await supabaseClient.from('full_landed_costs').delete().eq('item_uuid', pUuid);
        if(error) throw new Error(error.message); 
        
        delete productsDB[currentProduct]; delete laborDB[currentProduct]; delete pricingDB[currentProduct]; delete isSubassemblyDB[currentProduct]; 
        delete window.uuidMap['RECIPE:::' + currentProduct];
        delete window.uuidToNameMap[pUuid];
        
        let ups = []; Object.keys(productsDB).forEach(n => { let arr = productsDB[n]; let oL = arr.length; for(let i=arr.length-1; i>=0; i--) { if(String(arr[i].item_key || arr[i].di_item_id || arr[i].name) === 'RECIPE:::'+currentProduct) { arr.splice(i, 1); } } if(arr.length !== oL) { let tUuid = window.uuidMap['RECIPE:::'+n]; if(tUuid) ups.push(supabaseClient.from('product_recipes').update({components: window.translateRecipeForDB(arr)}).eq('product_item_uuid', tUuid)); } }); if(ups.length>0) await Promise.all(ups); currentProduct = Object.keys(productsDB)[0]||null; if(typeof populateDropdowns === 'function') populateDropdowns(); window.renderProductList(); 
    } catch(e) { sysLog(e.message, true); } 
}

// ==========================================
// RECIPE MANAGER (STAGING SANDBOX)
// ==========================================
window.recipeManagerStaging = [];
window.openRecipeManager = function() {
    let mode = document.getElementById('recipeManagerFilter') ? document.getElementById('recipeManagerFilter').value : 'orphans';
    window.recipeManagerStaging = [];
    
    if (typeof productsDB !== 'undefined' && typeof catalogCache !== 'undefined') {
        Object.keys(productsDB).forEach(pName => {
            let comps = productsDB[pName] || [];
            comps.forEach(x => {
                let k = String(x.item_key||x.di_item_id||x.name);
                let isRecipe = k.startsWith('RECIPE:::');
                let isOrphan = !isRecipe && !catalogCache[k];
                
                if (mode === 'orphans' && !isOrphan) return;
                
                window.recipeManagerStaging.push({
                    recipeName: pName,
                    originalKey: k,
                    newKey: k,
                    isOrphan: isOrphan,
                    isRecipe: isRecipe,
                    qty: x.quantity || x.qty || 1
                });
            });
        });
    }
    
    window.renderRecipeManager();
    document.getElementById('recipeManagerModal').style.display = 'flex';
};

window.renderRecipeManager = function() {
    let filterEl = document.getElementById('recipeManagerFilter');
    if(filterEl && filterEl.dataset.skipRender) return; // prevent loop
    
    const tbody = document.getElementById('recipeManagerModalBody');
    if (!tbody) return;
    
    let html = `<table style="width:100%; text-align:left; border-collapse:collapse;">
        <thead>
            <tr style="border-bottom:1px solid rgba(255,255,255,0.1); color:var(--text-muted);">
                <th style="padding:8px; width:20%;">Recipe Name</th>
                <th style="padding:8px; width:30%;">Component Key (Dissected)</th>
                <th style="padding:8px; width:10%;">Status</th>
                <th style="padding:8px; width:40%;">New Assigned Key (Edit or Search)</th>
            </tr>
        </thead>
        <tbody>`;
        
    if (window.recipeManagerStaging.length === 0) {
        html += `<tr><td colspan="4" style="text-align:center; padding:20px; color:#10b981;">No components match the current filter. 🚀</td></tr>`;
    } else {
        let datalistHtml = `<datalist id="rmCatalogDatalist">`;
        if (typeof catalogCache !== 'undefined') {
            Object.keys(catalogCache).forEach(k => {
                if (catalogCache[k].is_anchor) return;
                let prod = catalogCache[k].neoProduct || 'Unknown';
                let item = catalogCache[k].neoName || catalogCache[k].itemName || 'Unknown';
                let spec = (catalogCache[k].specification && catalogCache[k].specification !== 'null' && catalogCache[k].specification !== '(Mixed Specs)') ? ` - ${catalogCache[k].specification}` : '';
                let nameStr = `[${prod}] ${item}${spec}`;
                datalistHtml += `<option value="${k.replace(/"/g, '&quot;')}">${nameStr}</option>`;
            });
        }
        if (typeof productsDB !== 'undefined') {
            Object.keys(productsDB).forEach(p => {
                datalistHtml += `<option value="RECIPE:::${p.replace(/"/g, '&quot;')}">[Sub-Assembly] ${p}</option>`;
            });
        }
        datalistHtml += `</datalist>`;
        html += datalistHtml;

        window.recipeManagerStaging.forEach((r, idx) => {
            let isFixed = !r.isOrphan || (r.newKey && r.newKey !== r.originalKey && typeof catalogCache !== 'undefined' && catalogCache[r.newKey]);
            let statusBadge = isFixed ? `<span style="background:#10b981; padding:2px 6px; border-radius:4px; font-weight:bold; color:#fff;">Valid</span>` : `<span style="background:#ef4444; padding:2px 6px; border-radius:4px; font-weight:bold; color:#fff;">Orphaned</span>`;
            
            let suggestionHtml = '';
            let bestMatch = null;
            
            if (!isFixed && typeof catalogCache !== 'undefined') {
                let bLower = r.originalKey.toLowerCase();
                let bParts = r.originalKey.split(':::');
                let match = Object.keys(catalogCache).find(k => k.toLowerCase() === bLower);
                if (match) bestMatch = match;
                else if (bParts.length >= 3) {
                    let bPLower = bParts.map(s => s.toLowerCase().trim());
                    let bestScore = 0;
                    for (let k in catalogCache) {
                        let kParts = k.split(':::').map(s => s.toLowerCase().trim());
                        if (kParts.length >= 3) {
                            let score = 0;
                            for (let i=0; i<Math.max(bPLower.length, kParts.length); i++) {
                                if (bPLower[i] === kParts[i]) {
                                    if (i === 0) score += 10; // Name
                                    else if (i === 1) score += 5; // Product
                                    else if (i === 2) score += 2; // Raw
                                    else if (i === 3) score += 1; // Spec
                                    else score += 1;
                                }
                            }
                            if (score > bestScore && score >= 8) { bestScore = score; bestMatch = k; }
                        }
                    }
                }
                
                if (bestMatch) {
                    let escapedSugg = bestMatch.replace(/"/g, '&quot;').replace(/'/g, "\\'");
                    
                    let sParts = bestMatch.split(':::');
                    let oParts = r.originalKey.split(':::');
                    let changedSuggTokens = [];
                    let changedOrigTokens = [];
                    for(let i=0; i<Math.max(sParts.length, oParts.length); i++) {
                        if (sParts[i] !== oParts[i]) {
                            let oTokens = (oParts[i]||'').split(',').map(s=>s.trim());
                            let sTokens = (sParts[i]||'').split(',').map(s=>s.trim());
                            sTokens.forEach(st => { if (!oTokens.includes(st)) changedSuggTokens.push(st); });
                            oTokens.forEach(ot => { if (!sTokens.includes(ot)) changedOrigTokens.push(ot); });
                        }
                    }
                    let sStr = changedSuggTokens.join(', ');
                    let oStr = changedOrigTokens.join(', ');
                    let changeStr;
                    if (oStr && sStr) changeStr = `<span style="color:#fca5a5;">${oStr}</span> ➔ <span style="color:#6ee7b7;">${sStr}</span>`;
                    else if (sStr) changeStr = `<span style="color:#6ee7b7;">${sStr}</span>`;
                    else changeStr = "Apply Match";
                    
                    suggestionHtml = `<button data-app-click="applyRecipeSuggestion" data-idx="${idx}" data-sugg="${escapedSugg}" class="btn-blue" style="padding:6px 12px; border-radius:4px; font-size:11px; cursor:pointer; flex-shrink:0; white-space:nowrap; font-weight:bold; text-transform:none !important;">💡 Fix: ${changeStr}</button>`;
                }
            }
            
            let diffTarget = null;
            if (r.newKey && r.newKey !== r.originalKey) {
                diffTarget = r.newKey;
            } else if (!isFixed && bestMatch) {
                diffTarget = bestMatch;
            }
            
            let origKeyHTML = `<span style="font-family:monospace; font-size:10px;">${r.originalKey}</span>`;
            if (r.originalKey.includes(':::')) {
                let p = r.originalKey.split(':::');
                let bp = diffTarget ? diffTarget.split(':::') : null;
                
                let diffSegment = (origStr, suggStr) => {
                    if (!origStr) return 'N/A';
                    if (!suggStr || origStr === suggStr) return `<span style="color:var(--text-main);">${origStr}</span>`;
                    let oParts = origStr.split(',').map(s => s.trim());
                    let sParts = suggStr.split(',').map(s => s.trim());
                    return oParts.map(op => {
                        let isBroken = !sParts.includes(op);
                        if (isBroken) {
                            let newTokens = sParts.filter(sp => !oParts.includes(sp));
                            let replaceHtml = newTokens.length > 0 ? ` ➔ <span style="color:#10b981;">${newTokens.join(', ')}</span>` : '';
                            return `<span style="color:#ef4444; font-weight:bold;">${op}</span>${replaceHtml}`;
                        } else {
                            return `<span style="color:var(--text-main);">${op}</span>`;
                        }
                    }).join('<span style="color:var(--text-muted);">, </span>');
                };

                origKeyHTML = `<div style="font-family:monospace; font-size:11px; background:rgba(0,0,0,0.2); padding:6px; border-radius:4px; border:1px solid rgba(255,255,255,0.05);">
                    <div style="margin-bottom:2px;"><span style="color:var(--text-muted); display:inline-block; width:60px;">Name:</span> ${diffSegment(p[0], bp ? bp[0] : null)}</div>
                    <div style="margin-bottom:2px;"><span style="color:var(--text-muted); display:inline-block; width:60px;">Product:</span> ${diffSegment(p[1], bp ? bp[1] : null)}</div>
                    <div style="margin-bottom:2px;"><span style="color:var(--text-muted); display:inline-block; width:60px;">Raw:</span> ${diffSegment(p[2], bp ? bp[2] : null)}</div>
                    <div><span style="color:var(--text-muted); display:inline-block; width:60px;">Spec:</span> ${diffSegment(p[3], bp ? bp[3] : null)}</div>
                </div>`;
            }

            let getFormattedNewKey = (r, bMatch, isFxd) => {
                let keyParts = (r.newKey||'').split(':::');
                let refStr = isFxd ? r.originalKey : bMatch;
                if (!refStr) return r.newKey || '';
                
                let refParts = refStr.split(':::');
                let resParts = keyParts.map((kp, i) => {
                    let rp = refParts[i] || '';
                    let kTokens = kp.split(',').map(s=>s.trim());
                    let rTokens = rp.split(',').map(s=>s.trim());
                    let out = kTokens.map(kt => {
                        if (isFxd) {
                            if (!rTokens.includes(kt)) return `<span style="color:#10b981; font-weight:bold;">${kt}</span>`;
                        } else {
                            if (!rTokens.includes(kt)) return `<span style="color:#ef4444; font-weight:bold;">${kt}</span>`;
                        }
                        return kt;
                    });
                    return out.join(', ');
                });
                return resParts.join(':::');
            };

            let formattedNewKey = getFormattedNewKey(r, bestMatch, isFixed);
            let escapedVal = (r.newKey||'').replace(/"/g, '&quot;');
            let displayDiv = `<div data-app-click="editRecipeKey" data-idx="${idx}" style="flex-grow:1; max-width:400px; padding:8px; background:var(--bg-input); border:1px solid ${isFixed ? '#10b981' : 'var(--border-input)'}; border-radius:4px; font-family:monospace; font-size:11px; cursor:text; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:var(--text-color);" title="Click to Edit">${formattedNewKey}</div>`;

            let rowInput = `<div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap; width:100%;">
                ${displayDiv}
                <input type="text" id="rmInput_${idx}" list="rmCatalogDatalist" data-idx="${idx}" data-input="input_window_updateRecipeManagerStaging" data-change="change_window_updateRecipeManagerStaging" class="recipe-manager-input" value="${escapedVal}" style="display:none; flex-grow:1; max-width:400px; padding:8px; background:var(--bg-input); border:1px solid ${isFixed ? '#10b981' : 'var(--border-input)'}; color:var(--text-color); border-radius:4px; font-family:monospace; font-size:11px; transition:all 0.2s ease;" placeholder="Search or paste exact key...">
                ${suggestionHtml}
            </div>`;
            
            html += `<tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
                <td style="padding:12px 8px; font-weight:bold; color:var(--text-heading);">${r.recipeName}</td>
                <td style="padding:12px 8px;">${origKeyHTML}</td>
                <td class="rm-status-badge" style="padding:12px 8px; text-align:center;">${statusBadge}</td>
                <td style="padding:12px 8px;">${rowInput}</td>
            </tr>`;
        });
    }
    
    html += `</tbody></table>`;
    tbody.innerHTML = window.safeHTML ? window.safeHTML(html) : html;
    
    // Post-render bindings
    tbody.querySelectorAll('.recipe-manager-input').forEach(el => {
        el.addEventListener('blur', function() {
            if(typeof window.renderRecipeManager === 'function') window.renderRecipeManager();
        });
    });
};

window.updateRecipeManagerStaging = function(el) {
    let idx = parseInt(el.getAttribute('data-idx'));
    let newVal = el.value.trim();
    if (idx >= 0 && idx < window.recipeManagerStaging.length) {
        let r = window.recipeManagerStaging[idx];
        r.newKey = newVal;

        // Update DOM inline without re-rendering to prevent datalist collapse
        let isFixed = !r.isOrphan || (r.newKey && r.newKey !== r.originalKey && typeof catalogCache !== 'undefined' && catalogCache[r.newKey]);
        el.style.borderColor = isFixed ? '#10b981' : 'var(--border-input)';
        
        let tr = el.closest('tr');
        if (tr) {
            let statusTd = tr.querySelector('.rm-status-badge');
            if (statusTd) {
                let payload = isFixed ? `<span style="background:#10b981; padding:2px 6px; border-radius:4px; font-weight:bold; color:#fff;">Valid</span>` : `<span style="background:#ef4444; padding:2px 6px; border-radius:4px; font-weight:bold; color:#fff;">Orphaned</span>`;
            statusTd.innerHTML = window.safeHTML ? window.safeHTML(payload) : payload;
            }
        }
    }
};

window.applyRecipeSuggestion = function(idx, suggestion) {
    if (idx >= 0 && idx < window.recipeManagerStaging.length) {
        window.recipeManagerStaging[idx].newKey = suggestion;
        if (typeof window.renderRecipeManager === 'function') {
            window.renderRecipeManager();
        }
    }
};

window.applyAllRecipeSuggestions = function() {
    let anyFixed = false;
    window.recipeManagerStaging.forEach(r => {
        let isFixed = !r.isOrphan || (r.newKey && r.newKey !== r.originalKey && typeof catalogCache !== 'undefined' && catalogCache[r.newKey]);
        if (!isFixed && typeof catalogCache !== 'undefined' && r.originalKey.includes(':::')) {
            let p = r.originalKey.split(':::');
            let suggestions = Object.keys(catalogCache);
            let bestMatch = null;
            let bestScore = 0;
            
            suggestions.forEach(s => {
                let sParts = s.split(':::');
                if (sParts.length >= 4) {
                    let matches = 0;
                    if(sParts[0] === p[0]) matches += 2;
                    if(sParts[1] === p[1]) matches += 2;
                    if(sParts[2] === p[2]) matches += 1;
                    if(sParts[3] === p[3]) matches += 1;
                    if(matches > bestScore) {
                        bestScore = matches;
                        bestMatch = s;
                    }
                }
            });
            
            if (bestMatch && bestScore > 0) {
                r.newKey = bestMatch;
                anyFixed = true;
            }
        }
    });

    if (anyFixed && typeof window.renderRecipeManager === 'function') {
        window.renderRecipeManager();
    }
};

window.commitRecipeManager = async function() {
    await executeWithButtonAction('btnRecipeManagerSync', 'COMMITTING...', '✅ DONE!', async () => {
        let updatesByRecipe = {};
        window.recipeManagerStaging.forEach(r => {
            if (r.originalKey !== r.newKey && r.newKey !== "") {
                if (!updatesByRecipe[r.recipeName]) updatesByRecipe[r.recipeName] = [];
                updatesByRecipe[r.recipeName].push(r);
            }
        });
        
        let pNamesToSync = Object.keys(updatesByRecipe);
        if (pNamesToSync.length === 0) {
            document.getElementById('recipeManagerModal').style.display = 'none';
            return;
        }
        
        // Mutate local memory
        pNamesToSync.forEach(pName => {
            let comps = productsDB[pName] || [];
            updatesByRecipe[pName].forEach(update => {
                let target = comps.find(c => String(c.item_key||c.di_item_id||c.name) === update.originalKey);
                if (target) {
                    target.item_key = update.newKey;
                    target.di_item_id = undefined;
                    target.name = undefined;
                }
            });
        });
        
        // Push sequentially to avoid hammering Supabase
        for (let i = 0; i < pNamesToSync.length; i++) {
            await window.syncRecipe(pNamesToSync[i]);
        }
        
        if(typeof sysLog === 'function') sysLog(`Committed bulk fixes for ${pNamesToSync.length} recipes.`);
        document.getElementById('recipeManagerModal').style.display = 'none';
        
        window.hasRecipeOrphans = false;
        window.renderProductList();
        if (currentProduct) window.renderProductBOM();
    });
};

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
    if (action === 'toggleRecipeCat') { if(typeof window.toggleRecipeCategory === 'function') window.toggleRecipeCategory(btn.dataset.cat, btn.querySelector('.cat-arrow') || btn); }
    if (action === 'sortBOM') { if(typeof sortBOM === 'function') sortBOM(btn.dataset.col); }
    if (action === 'removeBOMPart') { if(typeof removePart === 'function') removePart(btn); }
    if (action === 'applyRecipeSuggestion') { if(typeof window.applyRecipeSuggestion === 'function') window.applyRecipeSuggestion(parseInt(btn.dataset.idx, 10), btn.dataset.sugg); }
    if (action === 'editRecipeKey') { 
        btn.style.display = 'none'; 
        let input = document.getElementById('rmInput_' + btn.dataset.idx); 
        if(input) { input.style.display='block'; input.focus(); } 
    }
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
