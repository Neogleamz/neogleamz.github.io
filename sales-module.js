// --- 9. SALES SYNC ENGINE ---
async function addManualSale() {
    try {
        let id = document.getElementById('manualSaleId').value.trim();
        let dt = document.getElementById('manualSaleDate').value;
        let rec = document.getElementById('manualSaleRecipe').value;
        let qty = parseFloat(document.getElementById('manualSaleQty').value);
        let pr = parseFloat(document.getElementById('manualSalePrice').value) || 0;
        
        let subtotRaw = document.getElementById('manualSaleSubtot').value;
        let ship = parseFloat(document.getElementById('manualSaleShip').value) || 0;
        let tax = parseFloat(document.getElementById('manualSaleTax').value) || 0;
        let discCode = document.getElementById('manualSaleDiscCode').value.trim();
        let discAmt = parseFloat(document.getElementById('manualSaleDisc').value) || 0;
        let totalRaw = document.getElementById('manualSaleTotal').value;
        
        if(!id || !dt || !rec || isNaN(qty) || qty <= 0) return alert("Please fill all required fields correctly.");
        
        let subtot = subtotRaw ? parseFloat(subtotRaw) : (qty * pr);
        let total = totalRaw ? parseFloat(totalRaw) : (subtot + ship + tax - discAmt);
        
        sysLog(`Adding Manual Sale: ${id}`); setMasterStatus("Saving...", "mod-working");
        
        // --- POWERED BY MASTER ENGINE ---
        let cogs = getEngineTrueCogs(rec);
        // --------------------------------
        
        let uniqueManualSku = "MANUAL_ENTRY_" + rec;
        
        let sRow = { 
            order_id: id, sale_date: dt, storefront_sku: uniqueManualSku, internal_recipe_name: rec, 
            qty_sold: qty, actual_sale_price: pr, cogs_at_sale: cogs, 
            subtotal: subtot, shipping: ship, taxes: tax, discount_code: discCode, discount_amount: discAmt, total: total 
        };
        
        let invK = `RECIPE:::${rec}`;
        if(!inventoryDB[invK]) inventoryDB[invK] = {consumed_qty:0, manual_adjustment:0, produced_qty:0, sold_qty:0, min_stock:0, scrap_qty:0};
        inventoryDB[invK].sold_qty += qty;
        let invPayload = { item_key: invK, ...inventoryDB[invK] };
        
        const {error: e1} = await supabaseClient.from('sales_ledger').insert([sRow]); if(e1) throw new Error("Insert Error: " + e1.message);
        const {error: e2} = await supabaseClient.from('inventory_consumption').upsert([invPayload], {onConflict:'item_key'}); if(e2) throw new Error("Inventory Error: " + e2.message);
        
        salesDB.unshift(sRow);
        ['manualSaleId', 'manualSalePrice', 'manualSaleSubtot', 'manualSaleShip', 'manualSaleTax', 'manualSaleDiscCode', 'manualSaleDisc', 'manualSaleTotal'].forEach(el => document.getElementById(el).value = "");
        setMasterStatus("Sale Added!", "mod-success"); 
        
        renderSalesTable(); renderInventoryTable(); if(typeof renderAnalyticsDashboard === 'function' && document.getElementById('analytics-tab').classList.contains('active')) renderAnalyticsDashboard();
        setTimeout(()=>setMasterStatus("Ready.", "status-idle"), 2000);
    } catch(e) { sysLog(e.message, true); setMasterStatus("Error", "mod-error"); alert("Error adding manual sale: \n" + e.message); }
}

async function processSalesCSV() {
    const fileInput = document.getElementById('salesCsvFile'); const file = fileInput.files[0];
    if(!file) return alert("Please select a CSV file first.");
    sysLog("Reading Sales CSV..."); setMasterStatus("Parsing...", "mod-working"); setSysProgress(20, 'working');
    const reader = new FileReader();
    reader.onload = function(e) {
        const data = new Uint8Array(e.target.result); const workbook = XLSX.read(data, {type: 'array'});
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(firstSheet, {defval: ""});
        processParsedSales(rows);
    };
    reader.readAsArrayBuffer(file);
}

function processParsedSales(rows) {
    pendingSalesRows = []; let unmapped = new Set();
    let orderFirstRowFlags = {};

    rows.forEach(r => {
        let orderId = r['Name'] || r['Order Name'] || r['Order ID'] || r['Order Number'] || r['Order'] || '';
        let skuName = r['Lineitem name'] || r['Item Name'] || r['Title'] || r['Product Name'] || '';
        let qty = parseFloat(r['Lineitem quantity'] || r['Quantity'] || r['Qty'] || 0);
        let price = parseFloat(r['Lineitem price'] || r['Price'] || r['Item Price'] || 0);
        let rawDate = r['Created at'] || r['Date'] || r['Sale Date'] || new Date().toISOString();
        
        if(!orderId || !skuName || qty <= 0) return;
        if(salesDB.some(s => s.order_id === String(orderId) && s.storefront_sku === String(skuName))) return;

        let dateStr = "";
        if (typeof rawDate === 'number') {
            let excelEpoch = new Date(1899, 11, 30);
            let jsDate = new Date(excelEpoch.getTime() + rawDate * 86400000);
            dateStr = jsDate.toISOString().split('T')[0];
        } else {
            dateStr = String(rawDate).split('T')[0].split(' ')[0];
        }

        let subTot = 0, ship = 0, tax = 0, discCode = "", discAmt = 0, tot = 0;
        if (!orderFirstRowFlags[orderId]) {
            subTot = parseFloat(String(r['Subtotal'] || "0").replace(/[^0-9.-]+/g,"")) || 0;
            ship = parseFloat(String(r['Shipping'] || "0").replace(/[^0-9.-]+/g,"")) || 0;
            tax = parseFloat(String(r['Taxes'] || "0").replace(/[^0-9.-]+/g,"")) || 0;
            discCode = String(r['Discount Code'] || "").trim();
            discAmt = parseFloat(String(r['Discount Amount'] || "0").replace(/[^0-9.-]+/g,"")) || 0;
            tot = parseFloat(String(r['Total'] || "0").replace(/[^0-9.-]+/g,"")) || 0;
            orderFirstRowFlags[orderId] = true; 
        }

        let internalName = aliasDB[skuName] || (productsDB[skuName] ? skuName : null);
        pendingSalesRows.push({ 
            order_id: String(orderId), sale_date: dateStr, storefront_sku: String(skuName), 
            qty_sold: qty, actual_sale_price: price, internal_recipe_name: internalName, 
            subtotal: subTot, shipping: ship, taxes: tax, discount_code: discCode, discount_amount: discAmt, total: tot 
        });
        
        if(!internalName) unmapped.add(String(skuName));
    });

    if(unmapped.size > 0) {
        let uList = Array.from(unmapped); let h = `Found ${uList.length} unmapped SKU(s).<br>`;
        uList.forEach(u => h += `<button class="btn-blue" style="padding:6px 10px; font-size:12px; width:100%; margin-top:8px; text-align:left;" onclick="openAliasModal('${u.replace(/'/g, "\\'")}')">🔗 Map SKU: ${u}</button>`);
        document.getElementById('unmappedSkusList').innerHTML = h;
        setMasterStatus("Action Required", "mod-error"); setSysProgress(0, 'working'); return; 
    }

    if(pendingSalesRows.length === 0) {
        alert("No new sales found in this file! All orders are already in the ledger or the file contained invalid rows.");
        document.getElementById('unmappedSkusList').innerHTML = "All storefront SKUs are currently mapped and recognized.";
        setMasterStatus("Ready.", "status-idle"); setSysProgress(0, 'working'); document.getElementById('salesCsvFile').value = ""; return;
    }

    executeSalesSync();
}

function openAliasModal(sku) { document.getElementById('aliasUnknownSku').innerText = sku; document.getElementById('aliasRecipeSelect').value = ""; document.getElementById('aliasModal').style.display = 'flex'; }

async function saveAliasMapping() {
    let sku = document.getElementById('aliasUnknownSku').innerText; let recipe = document.getElementById('aliasRecipeSelect').value;
    if(!recipe) return alert("Select an internal recipe.");
    sysLog(`Mapping ${sku} -> ${recipe}`); setMasterStatus("Saving Alias...", "mod-working");
    
    aliasDB[sku] = recipe;
    const { error } = await supabaseClient.from('storefront_aliases').upsert({ storefront_sku: sku, internal_recipe_name: recipe, platform: 'CSV Import' });
    if(error) { sysLog(error.message, true); setMasterStatus("Error", "mod-error"); return; }
    
    document.getElementById('aliasModal').style.display = 'none'; setMasterStatus("Mapped!", "mod-success");
    pendingSalesRows.forEach(r => { if(r.storefront_sku === sku) r.internal_recipe_name = recipe; });
    let stillUnmapped = new Set(); pendingSalesRows.forEach(r => { if(!r.internal_recipe_name) stillUnmapped.add(r.storefront_sku); });
    
    if(stillUnmapped.size === 0) executeSalesSync();
    else {
        let uList = Array.from(stillUnmapped); let h = `Found ${uList.length} unmapped SKU(s).<br>`;
        uList.forEach(u => h += `<button class="btn-blue" style="padding:6px 10px; font-size:12px; width:100%; margin-top:8px; text-align:left;" onclick="openAliasModal('${u.replace(/'/g, "\\'")}')">🔗 Map SKU: ${u}</button>`);
        document.getElementById('unmappedSkusList').innerHTML = h;
    }
}

async function executeSalesSync() {
    try {
        sysLog(`Pushing ${pendingSalesRows.length} sales...`); setMasterStatus("Syncing Sales...", "mod-working"); setSysProgress(60, 'working');

        // --- POWERED BY MASTER ENGINE ---
        let salesPayload = pendingSalesRows.map(r => { return { ...r, cogs_at_sale: getEngineTrueCogs(r.internal_recipe_name) }; });
        // --------------------------------

        let invMap = {};
        pendingSalesRows.forEach(r => { let k = `RECIPE:::${r.internal_recipe_name}`; if(!invMap[k]) invMap[k] = (inventoryDB[k] ? inventoryDB[k].sold_qty : 0); invMap[k] += r.qty_sold; });
        let invPayload = Object.keys(invMap).map(k => {
            if(!inventoryDB[k]) inventoryDB[k] = {consumed_qty:0, manual_adjustment:0, produced_qty:0, sold_qty:0, min_stock:0, scrap_qty:0};
            inventoryDB[k].sold_qty = invMap[k];
            return { item_key: k, consumed_qty: inventoryDB[k].consumed_qty, manual_adjustment: inventoryDB[k].manual_adjustment, produced_qty: inventoryDB[k].produced_qty, sold_qty: inventoryDB[k].sold_qty, min_stock: inventoryDB[k].min_stock, scrap_qty: inventoryDB[k].scrap_qty };
        });

        const { error: e1 } = await supabaseClient.from('sales_ledger').insert(salesPayload); 
        if(e1) throw new Error("Sales Ledger Insert Error: " + e1.message);
        
        const { error: e2 } = await supabaseClient.from('inventory_consumption').upsert(invPayload, {onConflict:'item_key'}); 
        if(e2) throw new Error("Inventory Deduction Error: " + e2.message);

        salesPayload.forEach(s => salesDB.unshift(s)); 
        let count = pendingSalesRows.length;
        pendingSalesRows = [];
        document.getElementById('unmappedSkusList').innerHTML = "All storefront SKUs are currently mapped and recognized.";
        document.getElementById('salesCsvFile').value = "";

        setSysProgress(100, 'success'); setMasterStatus("Sales Synced!", "mod-success");
        renderSalesTable(); renderInventoryTable(); if(typeof renderAnalyticsDashboard === 'function' && document.getElementById('analytics-tab').classList.contains('active')) renderAnalyticsDashboard();
        
        alert(`Success! ${count} sales were synced and inventory was updated.`);
        setTimeout(()=> { setMasterStatus("Ready.", "status-idle"); setSysProgress(0, 'working'); }, 3000);
    } catch(e) { 
        sysLog(e.message, true); 
        setMasterStatus("Sync Error", "mod-error"); 
        setSysProgress(100, 'error'); 
        alert("Database Error during Sync:\n\n" + e.message + "\n\nPlease check your Supabase columns.");
    }
}

function sortSales(c) { if(isResizing) return; currentSalesSort = { column: c, direction: currentSalesSort.column===c && currentSalesSort.direction==='asc' ? 'desc' : 'asc' }; renderSalesTable(); }

function renderSalesTable() {
    let wrap = document.getElementById('salesTableWrap'); if(!wrap) return;
    
    // Updated Headers based on CFO Blueprint
    let ths = ` <th class="${currentSalesSort.column==='d'?'sorted-'+currentSalesSort.direction:''}" onclick="sortSales('d')">Sale Date</th> <th class="${currentSalesSort.column==='o'?'sorted-'+currentSalesSort.direction:''}" onclick="sortSales('o')">Order ID</th> <th class="${currentSalesSort.column==='sku'?'sorted-'+currentSalesSort.direction:''}" onclick="sortSales('sku')">Storefront SKU</th> <th class="${currentSalesSort.column==='int'?'sorted-'+currentSalesSort.direction:''}" onclick="sortSales('int')">Recipe</th> <th class="${currentSalesSort.column==='q'?'sorted-'+currentSalesSort.direction:''} text-right" onclick="sortSales('q')">Qty</th> <th class="${currentSalesSort.column==='p'?'sorted-'+currentSalesSort.direction:''} text-right" onclick="sortSales('p')">Actual Price</th> <th class="${currentSalesSort.column==='disc'?'sorted-'+currentSalesSort.direction:''} text-right" onclick="sortSales('disc')">Discount</th> <th class="${currentSalesSort.column==='ship'?'sorted-'+currentSalesSort.direction:''} text-right" onclick="sortSales('ship')">Ship Col.</th> <th class="${currentSalesSort.column==='tax'?'sorted-'+currentSalesSort.direction:''} text-right" onclick="sortSales('tax')">Tax Col.</th> <th class="${currentSalesSort.column==='tot'?'sorted-'+currentSalesSort.direction:''} text-right" onclick="sortSales('tot')">Total Captured</th> <th class="${currentSalesSort.column==='c'?'sorted-'+currentSalesSort.direction:''} text-right" onclick="sortSales('c')">True COGS (Live)</th> <th class="${currentSalesSort.column==='stripe'?'sorted-'+currentSalesSort.direction:''} text-right" onclick="sortSales('stripe')">Stripe Fee</th> <th class="${currentSalesSort.column==='net'?'sorted-'+currentSalesSort.direction:''} text-right" onclick="sortSales('net')">Actual Net</th>`;
    let h = `<table style="width:100%;"><thead><tr>${ths}</tr></thead><tbody>`;
    
    const SHIP_COST = typeof ENGINE_CONFIG !== 'undefined' ? ENGINE_CONFIG.flatShipping : 8.00;

    // Pre-calculate Engine stats for sorting and rendering
    let a = salesDB.map(x => {
        let qty = parseFloat(x.qty_sold) || 0;
        let captured = parseFloat(x.total) || 0;
        let tax = parseFloat(x.taxes) || 0;
        
        let liveCogs = getEngineTrueCogs(x.internal_recipe_name);
        let stripeFee = getEngineStripeFee(captured);
        let actualShipCost = SHIP_COST * qty;
        let cogsTotal = liveCogs * qty;
        
        let net = captured - tax - stripeFee - actualShipCost - cogsTotal;
        
        return { ...x, liveCogs, stripeFee, net };
    });
    
    if(a.length===0){ 
        h += "<tr><td colspan='13' style='text-align:center;'>No sales synced yet.</td></tr>"; 
    } else {
        a.sort((x,y) => { 
            let map = {d:'sale_date', o:'order_id', sku:'storefront_sku', int:'internal_recipe_name', q:'qty_sold', p:'actual_sale_price', c:'liveCogs', ship:'shipping', tax:'taxes', disc:'discount_amount', tot:'total', stripe:'stripeFee', net:'net'}; 
            let col = map[currentSalesSort.column]; 
            let u = x[col]; let v = y[col]; 
            if (typeof u === 'number' && typeof v === 'number') return currentSalesSort.direction === 'asc' ? u - v : v - u; 
            u = (u||"").toString().toLowerCase(); v = (v||"").toString().toLowerCase(); 
            if(u<v) return currentSalesSort.direction==='asc'?-1:1; 
            if(u>v) return currentSalesSort.direction==='asc'?1:-1; return 0; 
        });
        
        a.forEach(x => { 
            let safeSku = String(x.storefront_sku).replace(/'/g, "\\'");
            let netColor = x.net < 0 ? '#ef4444' : '#10b981';

            h += `<tr>
            <td class="editable" contenteditable="true" onfocus="storeOldVal(this)" onblur="updateSaleCell(this, '${x.order_id}', '${safeSku}', 'sale_date', false)" style="color:var(--text-muted);">${x.sale_date}</td>
            <td class="editable" contenteditable="true" onfocus="storeOldVal(this)" onblur="updateSaleCell(this, '${x.order_id}', '${safeSku}', 'order_id', false)" style="font-weight:bold;">${x.order_id}</td>
            <td class="editable trunc-col" contenteditable="true" onfocus="storeOldVal(this)" onblur="updateSaleCell(this, '${x.order_id}', '${safeSku}', 'storefront_sku', false)">${x.storefront_sku}</td>
            <td class="editable trunc-col" contenteditable="true" onfocus="storeOldVal(this)" onblur="updateSaleCell(this, '${x.order_id}', '${safeSku}', 'internal_recipe_name', false)" style="color:#0ea5e9; font-weight:bold;">${x.internal_recipe_name}</td>
            <td class="text-right editable" contenteditable="true" onfocus="storeOldVal(this)" onblur="updateSaleCell(this, '${x.order_id}', '${safeSku}', 'qty_sold', true)" style="font-weight:bold;">${x.qty_sold}</td>
            <td class="text-right editable" contenteditable="true" onfocus="storeOldVal(this)" onblur="updateSaleCell(this, '${x.order_id}', '${safeSku}', 'actual_sale_price', true)" style="color:#10b981;">$${parseFloat(x.actual_sale_price).toFixed(2)}</td>
            <td class="text-right editable" contenteditable="true" onfocus="storeOldVal(this)" onblur="updateSaleCell(this, '${x.order_id}', '${safeSku}', 'discount_amount', true)" style="color:#f59e0b;">$${parseFloat(x.discount_amount || 0).toFixed(2)}</td>
            <td class="text-right editable" contenteditable="true" onfocus="storeOldVal(this)" onblur="updateSaleCell(this, '${x.order_id}', '${safeSku}', 'shipping', true)" style="color:var(--text-muted);">$${parseFloat(x.shipping || 0).toFixed(2)}</td>
            <td class="text-right editable" contenteditable="true" onfocus="storeOldVal(this)" onblur="updateSaleCell(this, '${x.order_id}', '${safeSku}', 'taxes', true)" style="color:var(--text-muted);">$${parseFloat(x.taxes || 0).toFixed(2)}</td>
            <td class="text-right editable" contenteditable="true" onfocus="storeOldVal(this)" onblur="updateSaleCell(this, '${x.order_id}', '${safeSku}', 'total', true)" style="font-weight:bold;">$${parseFloat(x.total || 0).toFixed(2)}</td>
            <td class="text-right" style="color:#ef4444; font-weight:bold;">$${x.liveCogs.toFixed(2)}</td>
            <td class="text-right" style="color:#888;">-$${x.stripeFee.toFixed(2)}</td>
            <td class="text-right" style="color:${netColor}; font-weight:900;">$${x.net.toFixed(2)}</td>
            </tr>`; 
        });
    }
    
    wrap.innerHTML = h + `</tbody></table>`; 
    if(typeof applyTableInteractivity === 'function') applyTableInteractivity('salesTableWrap');
}

async function updateSaleCell(cell, orderId, sku, col, isNum) {
    try {
        let newVal = cell.innerText.trim(); if(newVal === oldValTemp) return;
        let dbVal = newVal;
        if(isNum) {
            dbVal = parseFloat(newVal.replace(/[^0-9.-]+/g,""));
            if(isNaN(dbVal)) { cell.innerText = oldValTemp; return alert("Valid number required."); }
        }
        if(col === 'order_id' && salesDB.some(s => s.order_id === dbVal && s.storefront_sku === sku && s.order_id !== orderId)) { 
            cell.innerText = oldValTemp; return alert("This Order ID + SKU combination already exists."); 
        }
        
        sysLog(`Editing Sale ${orderId}: ${col}`); setMasterStatus("Saving...", "mod-working");
        let row = salesDB.find(s => s.order_id === orderId && s.storefront_sku === sku); if(!row) return;
        let oldQty = row.qty_sold; let oldRec = row.internal_recipe_name;
        
        let payload = { [col]: dbVal };
        
        const { error } = await supabaseClient.from('sales_ledger').update(payload).eq('order_id', orderId).eq('storefront_sku', sku); 
        if(error) throw new Error(error.message);
        
        row[col] = dbVal;
        
        if(col === 'qty_sold' || col === 'internal_recipe_name') {
            let invUps = [];
            if(col === 'internal_recipe_name') {
                let oldK = `RECIPE:::${oldRec}`; let newK = `RECIPE:::${dbVal}`;
                if(inventoryDB[oldK]) { inventoryDB[oldK].sold_qty -= oldQty; invUps.push({item_key:oldK, ...inventoryDB[oldK]}); }
                if(!inventoryDB[newK]) inventoryDB[newK] = {consumed_qty:0, manual_adjustment:0, produced_qty:0, sold_qty:0, min_stock:0, scrap_qty:0};
                inventoryDB[newK].sold_qty += row.qty_sold; invUps.push({item_key:newK, ...inventoryDB[newK]});
            } else if(col === 'qty_sold') {
                let k = `RECIPE:::${row.internal_recipe_name}`;
                if(!inventoryDB[k]) inventoryDB[k] = {consumed_qty:0, manual_adjustment:0, produced_qty:0, sold_qty:0, min_stock:0, scrap_qty:0};
                inventoryDB[k].sold_qty += (dbVal - oldQty);
                invUps.push({item_key:k, ...inventoryDB[k]});
            }
            if(invUps.length > 0) await supabaseClient.from('inventory_consumption').upsert(invUps, {onConflict:'item_key'});
        }
        
        setMasterStatus("Saved!", "mod-success"); cell.classList.add('edited-success'); setTimeout(()=>cell.classList.remove('edited-success'),1000);
        renderSalesTable(); renderInventoryTable(); if(typeof renderAnalyticsDashboard === 'function' && document.getElementById('analytics-tab').classList.contains('active')) renderAnalyticsDashboard();
        setTimeout(()=>setMasterStatus("Ready.", "status-idle"), 2000);
    } catch(e) { sysLog(e.message, true); setMasterStatus("Error", "mod-error"); cell.innerText = oldValTemp; alert("Error updating cell: \n" + e.message); }
}
