// --- 6. BULK MODAL ---
function openBulkAddModal() {
    if(!currentProduct) return alert("Please select a product from the sidebar first."); document.getElementById('bulkAddTitle').innerText = currentProduct; bulkAddData = [];
    Object.keys(productsDB).sort().forEach(p => { if(p === currentProduct) return; bulkAddData.push({ k: `RECIPE:::${p}`, isSub: true, nn: (isSubassemblyDB[p] ? "⚙️ " : "📦 ") + p, np: "Sub-Assembly", n: "", sp: "(Nested Recipe)", uc: getEngineTrueCogs(p), q: "" }); });
    Object.keys(catalogCache).forEach(k => { let c = catalogCache[k]; bulkAddData.push({ k: k, isSub: false, nn: c.neoName||"", np: c.neoProd||"", n: c.itemName||"", sp: c.spec||"", uc: c.avgUnitCost, q: "" }); });
    document.getElementById('bulkSearch').value = ""; document.getElementById('bulkAddModal').style.display = 'flex'; renderBulkAddBody();
}
function sortBulk(c) { currentBulkSort = { column: c, direction: currentBulkSort.column===c && currentBulkSort.direction==='asc' ? 'desc' : 'asc' }; renderBulkAddBody(); }
function updateBulkQty(k, v) { let i = bulkAddData.find(x => x.k === k); if(i) i.q = v; }
function filterBulkList() { renderBulkAddBody(); }
function renderBulkAddBody() {
    let wrap = document.getElementById('bulkAddTableWrap'); if(!wrap) return;
    let ths = ` <th class="${currentBulkSort.column==='nn'?'sorted-'+currentBulkSort.direction:''}" onclick="sortBulk('nn')">Neogleamz Name</th> <th class="${currentBulkSort.column==='np'?'sorted-'+currentBulkSort.direction:''}" onclick="sortBulk('np')">Neogleamz Product</th> <th class="${currentBulkSort.column==='n'?'sorted-'+currentBulkSort.direction:''}" onclick="sortBulk('n')">Item Name</th> <th class="${currentBulkSort.column==='sp'?'sorted-'+currentBulkSort.direction:''}" onclick="sortBulk('sp')">Spec</th> <th class="${currentBulkSort.column==='uc'?'sorted-'+currentBulkSort.direction:''} text-right" onclick="sortBulk('uc')">Unit Cost</th> <th style="width:120px; text-align:center; background:#8b5cf6; color:white;">Qty to Add</th> `;
    let h = `<table style="width:100%;"><thead><tr>${ths}</tr></thead><tbody id="bulkAddBody">`; let qStr = document.getElementById('bulkSearch').value.toLowerCase(); let filtered = bulkAddData.filter(x => x.nn.toLowerCase().includes(qStr) || x.np.toLowerCase().includes(qStr) || x.n.toLowerCase().includes(qStr) || x.sp.toLowerCase().includes(qStr));
    filtered.sort((x,y) => { let u = x[currentBulkSort.column]; let v = y[currentBulkSort.column]; if (typeof u === 'number' && typeof v === 'number') return currentBulkSort.direction === 'asc' ? u - v : v - u; u = (u||"").toString().toLowerCase(); v = (v||"").toString().toLowerCase(); if(u<v) return currentBulkSort.direction==='asc'?-1:1; if(u>v) return currentBulkSort.direction==='asc'?1:-1; return 0; });
    filtered.forEach(x => { let sk = String(x.k).replace(/'/g, "\\'").replace(/"/g, '"'); let displaySpec = x.sp === "(Mixed Specs)" ? "⚙️ (Mixed Specs)" : x.sp; if(x.isSub) { h += `<tr><td tabindex="0" class="trunc-col" style="font-weight:bold;color:var(--text-heading);">${x.nn}</td><td tabindex="0" class="trunc-col" style="color:var(--text-muted);">Sub-Assembly</td><td tabindex="0" class="trunc-col">${x.n}</td><td tabindex="0" class="trunc-col">(Nested Recipe)</td><td class="text-right">$${x.uc.toFixed(4)}</td><td style="text-align:center;"><input type="number" class="bulk-qty-input" value="${x.q}" oninput="updateBulkQty('${sk}', this.value)" min="0" step="any" placeholder="0" style="width:80px;text-align:center;"></td></tr>`; } else { h += `<tr><td tabindex="0" class="trunc-col" style="font-weight:bold;color:var(--text-heading);">${x.nn}</td><td tabindex="0" class="trunc-col" style="color:var(--text-muted);">${x.np}</td><td tabindex="0" class="trunc-col">${x.n}</td><td tabindex="0" class="trunc-col">${displaySpec}</td><td class="text-right">$${x.uc.toFixed(4)}</td><td style="text-align:center;"><input type="number" class="bulk-qty-input" value="${x.q}" oninput="updateBulkQty('${sk}', this.value)" min="0" step="any" placeholder="0" style="width:80px;text-align:center;"></td></tr>`; } });
    wrap.innerHTML = h + `</tbody></table>`; applyTableInteractivity('bulkAddTableWrap');
}
async function saveBulkAdd() { let addedCount = 0; bulkAddData.forEach(i => { let v = parseFloat(i.q); if(v > 0) { let k = i.k; let ex = productsDB[currentProduct].find(p => String(p.item_key || p.di_item_id || p.name) === k); if(ex) { ex.quantity = (parseFloat(ex.quantity)||0) + v; ex.qty = ex.quantity; } else { productsDB[currentProduct].push({item_key: k, quantity: v}); } addedCount++; } }); if(addedCount > 0) { document.getElementById('bulkAddModal').style.display = 'none'; sysLog(`Bulk added ${addedCount} items.`); setMasterStatus("Saving...", "mod-working"); await syncRecipe(currentProduct); renderProductBOM(); renderProductList(); setMasterStatus("Saved!", "mod-success"); setTimeout(()=>setMasterStatus("Ready.", "status-idle"), 2000); } else { alert("No quantities greater than 0 were entered."); } }

// --- 7. PRODUCT BUILDER & LABOR LOGIC ---
async function updateLaborCosts() {
    try {
        if(!currentProduct) return;
        let t = parseFloat(document.getElementById('laborTimeInput').value) || 0;
        let r = parseFloat(document.getElementById('laborRateInput').value) || 0;
        let m = parseFloat(document.getElementById('msrpInput').value) || 0;
        let w = parseFloat(document.getElementById('wholesaleInput').value) || 0;
        let isSub = document.getElementById('isSubassemblyInput').checked;
        
        laborDB[currentProduct] = { time: t, rate: r };
        pricingDB[currentProduct] = { msrp: m, wholesale: w };
        isSubassemblyDB[currentProduct] = isSub;

        sysLog(`Updating profile for ${currentProduct}`); setMasterStatus("Saving...", "mod-working");
        const { error } = await supabaseClient.from('product_recipes').update({ 
            labor_time_mins: t, 
            labor_rate_hr: r,
            msrp: m,
            wholesale_price: w,
            is_subassembly: isSub
        }).eq('product_name', currentProduct);
        
        if (error) throw new Error(error.message);
        setMasterStatus("Saved!", "mod-success"); setTimeout(()=>setMasterStatus("Ready.", "status-idle"), 2000);
        if(typeof populateDropdowns === 'function') populateDropdowns(); 
        renderProductList(); renderProductBOM(); 
        if(typeof renderFgiTable === 'function') renderFgiTable(); 
        let aTab = document.getElementById('analytics-tab');
        if(typeof renderAnalyticsDashboard === 'function' && aTab && aTab.classList.contains('active')) renderAnalyticsDashboard(); 
    } catch(e) { sysLog(e.message, true); setMasterStatus("Error", "mod-error"); }
}

async function renameCurrentProduct() { if(!currentProduct) return; let n = prompt("Enter new name:", currentProduct); if(!n || !n.trim() || n.trim() === currentProduct) return; n = n.trim(); if(productsDB[n]) return alert("A product with this name already exists."); sysLog(`Renaming ${currentProduct} to ${n}...`); setMasterStatus("Renaming...", "mod-working"); let o = currentProduct; let c = productsDB[o]; let l = laborDB[o] || {time:0, rate:0}; let pR = pricingDB[o] || {msrp:0, wholesale:0}; let isSub = isSubassemblyDB[o] || false; let is3D = c.is_3d_print || false; let pt = c.print_time_mins || 0; productsDB[n] = c; laborDB[n] = l; pricingDB[n] = pR; isSubassemblyDB[n] = isSub; await supabaseClient.from('product_recipes').upsert({product_name: n, components: c, labor_time_mins: l.time, labor_rate_hr: l.rate, msrp: pR.msrp, wholesale_price: pR.wholesale, is_subassembly: isSub, is_3d_print: is3D, print_time_mins: pt}); await supabaseClient.from('product_recipes').delete().eq('product_name', o); delete productsDB[o]; delete laborDB[o]; delete pricingDB[o]; delete isSubassemblyDB[o]; let ups = []; Object.keys(productsDB).forEach(k => { let changed = false; productsDB[k].forEach(p => { if(String(p.item_key || p.di_item_id || p.name) === 'RECIPE:::' + o) { p.item_key = 'RECIPE:::' + n; changed = true; } }); if(changed) ups.push(supabaseClient.from('product_recipes').update({components: productsDB[k]}).eq('product_name', k)); }); if(ups.length > 0) await Promise.all(ups); currentProduct = n; if(typeof populateDropdowns === 'function') populateDropdowns(); renderProductList(); setMasterStatus("Renamed!", "mod-success"); setTimeout(()=>setMasterStatus("Ready.", "status-idle"), 3000); }
async function syncRecipe(name) { try { sysLog(`Syncing recipe: ${name}`); const {error} = await supabaseClient.from('product_recipes').update({components: productsDB[name]}).eq('product_name', name); if(error) throw new Error(error.message); if(typeof populateDropdowns === 'function') populateDropdowns(); } catch(e) { sysLog(e.message, true); } }

let productDraggedName = null;

function renderProductList() { 
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
    if(!currentProduct && allProds.length > 0) currentProduct = allProds[0]; 
    
    let retailProds = allProds.filter(p => !isSubassemblyDB[p]);
    let subProds = allProds.filter(p => isSubassemblyDB[p]);

    function buildItem(n) {
        let sel = n === currentProduct ? 'selected' : ''; let safeName = String(n).replace(/'/g, "\\'"); let icon = isSubassemblyDB[n] ? '⚙️' : '📦';
        return `<li class="${sel}" 
            draggable="true" 
            ondragstart="productDragStart(event, '${safeName}')" 
            ondragover="productDragOver(event)" 
            ondrop="productDrop(event, '${safeName}')" 
            ondragend="productDragEnd(event)"
            onclick="selectProduct('${safeName}')" 
            style="font-weight:bold; font-size:14px; cursor:grab; padding: 10px; border-bottom: 1px solid var(--border-color); margin-bottom: 5px; border-radius: 4px; display:flex; justify-content:space-between; align-items:center;">
            <span>☰ ${icon} ${n}</span><span class="prod-cost">$${calculateProductTotal(n).toFixed(2)}</span>
        </li>`;
    }

    let html = "";
    if(retailProds.length > 0) {
        html += `<li style="cursor:default; background:transparent; border:none; padding:4px 0; margin-bottom:5px; border-bottom:1px solid var(--border-color); color:var(--text-muted); font-size:11px; font-weight:bold;">RETAIL PRODUCTS</li>`;
        retailProds.forEach(p => html += buildItem(p));
    }
    if(subProds.length > 0) {
        html += `<li style="cursor:default; background:transparent; border:none; padding:4px 0; margin-bottom:5px; margin-top:10px; border-bottom:1px solid var(--border-color); color:var(--text-muted); font-size:11px; font-weight:bold;">SUB-ASSEMBLIES</li>`;
        subProds.forEach(p => html += buildItem(p));
    }

    ui.innerHTML = html;
    if(currentProduct) renderProductBOM(); 
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
            renderProductList();
            if (typeof saveCloudPrefs === 'function') saveCloudPrefs();
        }
    }
}
function selectProduct(n) { currentProduct = n; renderProductList(); renderProductBOM(); }
function sortBOM(c) { currentBOMSort = { column: c, direction: currentBOMSort.column===c && currentBOMSort.direction==='asc' ? 'desc' : 'asc' }; renderProductBOM(); }

function renderProductBOM() {
    if(!currentProduct) return; document.getElementById('bomMainArea').style.display='block'; document.getElementById('bomTitle').innerText=currentProduct;
    
    let lData = laborDB[currentProduct] || {time:0, rate:0};
    let pData = pricingDB[currentProduct] || {msrp:0, wholesale:0};
    document.getElementById('laborTimeInput').value = lData.time;
    document.getElementById('laborRateInput').value = lData.rate;
    document.getElementById('msrpInput').value = pData.msrp;
    document.getElementById('wholesaleInput').value = pData.wholesale;
    document.getElementById('isSubassemblyInput').checked = !!isSubassemblyDB[currentProduct];

    let p = productsDB[currentProduct]||[]; let gt = 0; let wrap = document.getElementById('bomTableWrap');
    let ths = ` <th class="${currentBOMSort.column==='nn'?'sorted-'+currentBOMSort.direction:''}" onclick="sortBOM('nn')">Neogleamz Name</th> <th class="${currentBOMSort.column==='np'?'sorted-'+currentBOMSort.direction:''}" onclick="sortBOM('np')">Neogleamz Product</th> <th class="${currentBOMSort.column==='n'?'sorted-'+currentBOMSort.direction:''}" onclick="sortBOM('n')">Item Name</th> <th class="${currentBOMSort.column==='sp'?'sorted-'+currentBOMSort.direction:''}" onclick="sortBOM('sp')">Spec</th> <th class="${currentBOMSort.column==='q'?'sorted-'+currentBOMSort.direction:''} text-right" onclick="sortBOM('q')">Qty</th> <th class="${currentBOMSort.column==='uc'?'sorted-'+currentBOMSort.direction:''} text-right" onclick="sortBOM('uc')">Unit Cost</th> <th class="${currentBOMSort.column==='ec'?'sorted-'+currentBOMSort.direction:''} text-right" onclick="sortBOM('ec')">Total Ext. Cost</th> <th style="width: 40px; text-align:center;">Action</th> `;
    let h = `<table style="width:100%;"><thead><tr>${ths}</tr></thead><tbody id="bomTableBody">`;
    if(p.length===0){ h += "<tr><td colspan='8' style='text-align:center;'>No components.</td></tr>"; }
    else {
        let a = [];
        p.forEach(x => { let k = String(x.item_key||x.di_item_id||x.name); let q = parseFloat(x.quantity||x.qty)||1; let nn="", np="", n="", sp="", uc=0; if(k.startsWith('RECIPE:::')) { let s = k.replace('RECIPE:::', ''); nn= (isSubassemblyDB[s] ? "⚙️ " : "📦 ") + s; np="Sub-Assembly"; n=""; sp=""; uc=getEngineTrueCogs(s); } else { let c = catalogCache[k]; if(c){ nn=c.neoName; np=c.neoProd; n=c.itemName; sp=c.spec; uc=c.avgUnitCost; } else { n="Unknown Item"; sp="N/A"; } } let ec = uc*q; gt+=ec; a.push({rawKey: k, nn: nn, np: np, n: n, sp: sp, q: q, uc: uc, ec: ec}); });
        a.sort((x,y) => { let u = x[currentBOMSort.column]; let v = y[currentBOMSort.column]; if (typeof u === 'number' && typeof v === 'number') return currentBOMSort.direction === 'asc' ? u - v : v - u; u = (u||"").toString().toLowerCase(); v = (v||"").toString().toLowerCase(); if(u<v) return currentBOMSort.direction==='asc'?-1:1; if(u>v) return currentBOMSort.direction==='asc'?1:-1; return 0; });
        a.forEach(x => { let sk = String(x.rawKey).replace(/'/g, "\\'").replace(/"/g, '"'); let displaySpec = x.sp === "(Mixed Specs)" ? "⚙️ (Mixed Specs)" : x.sp; if(x.rawKey.startsWith('RECIPE:::')) { h += `<tr><td tabindex="0" class="trunc-col" style="font-weight:bold; color:var(--text-heading);">${x.nn}</td><td tabindex="0" class="trunc-col" style="color:var(--text-muted);">Sub-Assembly</td><td tabindex="0" class="trunc-col">${x.n}</td><td tabindex="0" class="trunc-col">${displaySpec}</td><td class="text-right editable" style="font-weight:bold; color:#0ea5e9;" contenteditable="true" data-key="${sk}" onfocus="storeOldVal(this)" onblur="updateBOMQty(this)">${x.q}</td><td class="text-right">$${x.uc.toFixed(4)}</td><td class="text-right" style="font-weight:bold;">$${x.ec.toFixed(4)}</td><td style="text-align:center;"><button style="background:#ef4444; padding:4px 8px; font-size:12px; width:auto;" data-key="${sk}" onclick="removePart(this)">X</button></td></tr>`; } else { h += `<tr><td tabindex="0" class="trunc-col" style="font-weight:bold; color:var(--text-heading);">${x.nn}</td><td tabindex="0" class="trunc-col" style="color:var(--text-muted);">${x.np}</td><td tabindex="0" class="trunc-col">${x.n}</td><td tabindex="0" class="trunc-col">${displaySpec}</td><td class="text-right editable" style="font-weight:bold; color:#0ea5e9;" contenteditable="true" data-key="${sk}" onfocus="storeOldVal(this)" onblur="updateBOMQty(this)">${x.q}</td><td class="text-right">$${x.uc.toFixed(4)}</td><td class="text-right" style="font-weight:bold;">$${x.ec.toFixed(4)}</td><td style="text-align:center;"><button style="background:#ef4444; padding:4px 8px; font-size:12px; width:auto;" data-key="${sk}" onclick="removePart(this)">X</button></td></tr>`; } });
    }
    wrap.innerHTML = h + `</tbody></table>`; document.getElementById('bomTotalCost').innerText = `$${getEngineTrueCogs(currentProduct).toFixed(2)}`; applyTableInteractivity('bomTableWrap');
}
async function updateBOMQty(cell) { try { let v = parseFloat(cell.innerText.replace(/[^0-9.-]+/g,"")); if(isNaN(v) || v<=0) { cell.innerText=oldValTemp; return; } if(v.toString()===oldValTemp) return; let k = cell.getAttribute('data-key').replace(/"/g, '"').replace(/\\'/g, "'"); let p = productsDB[currentProduct].find(x => String(x.item_key || x.di_item_id || x.name) === k); if(p) { p.quantity = v; p.qty = v; cell.classList.add('edited-success'); setTimeout(()=>cell.classList.remove('edited-success'),1000); await syncRecipe(currentProduct); renderProductList(); } } catch(e) { sysLog(e.message, true); } }
async function removePart(btn) { try { if(!currentProduct) return; let k = btn.getAttribute('data-key').replace(/"/g, '"').replace(/\\'/g, "'"); productsDB[currentProduct] = productsDB[currentProduct].filter(p => String(p.item_key || p.di_item_id || p.name) !== k); await syncRecipe(currentProduct); renderProductBOM(); renderProductList(); } catch(e) { sysLog(e.message, true); } }
async function addPartToProduct() { try { if(!currentProduct) return alert("Select product."); let k = document.getElementById('partSelector').value; let q = parseFloat(document.getElementById('partQty').value) || 0; if(q<=0 || !k) return alert("Invalid inputs."); if(k === 'RECIPE:::' + currentProduct) return alert("No self nesting."); let ex = productsDB[currentProduct].find(p => String(p.item_key || p.di_item_id || p.name) === k); if(ex) { ex.quantity = (parseFloat(ex.quantity)||0) + q; ex.qty = ex.quantity; } else productsDB[currentProduct].push({item_key: k, quantity: q}); await syncRecipe(currentProduct); renderProductBOM(); renderProductList(); } catch(e) { sysLog(e.message, true); } }
async function createNewProduct() { try { let n = prompt("Recipe Name:"); if(!n || !n.trim() || productsDB[n.trim()]) return; n = n.trim(); productsDB[n] = []; laborDB[n] = {time:0, rate:0}; pricingDB[n] = {msrp:0, wholesale:0}; isSubassemblyDB[n] = false; await supabaseClient.from('product_recipes').insert({product_name: n, components: [], labor_time_mins: 0, labor_rate_hr: 0, msrp: 0, wholesale_price: 0, is_subassembly: false, is_3d_print: false, print_time_mins: 0}); currentProduct = n; renderProductList(); renderProductBOM(); if(typeof populateDropdowns === 'function') populateDropdowns(); } catch(e) { sysLog(e.message, true); } }
async function deleteCurrentProduct() { try { if(!currentProduct) return; if(confirm(`Delete ${currentProduct}?`)){ sysLog(`Deleting ${currentProduct}`); const {error} = await supabaseClient.from('product_recipes').delete().eq('product_name', currentProduct);
            if(error) throw new Error(error.message); delete productsDB[currentProduct]; delete laborDB[currentProduct]; delete pricingDB[currentProduct]; delete isSubassemblyDB[currentProduct]; let ups = []; Object.keys(productsDB).forEach(n => { let oL = productsDB[n].length; productsDB[n] = productsDB[n].filter(x => String(x.item_key || x.di_item_id || x.name) !== 'RECIPE:::'+currentProduct); if(productsDB[n].length !== oL) ups.push(supabaseClient.from('product_recipes').update({components: productsDB[n]}).eq('product_name', n)); }); if(ups.length>0) await Promise.all(ups); currentProduct = Object.keys(productsDB)[0]||null; if(typeof populateDropdowns === 'function') populateDropdowns(); renderProductList(); } } catch(e) { sysLog(e.message, true); } }

