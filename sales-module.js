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
        let source = document.getElementById('manualSaleSource').value.trim();
        let balance = parseFloat(document.getElementById('manualSaleBalance').value) || 0;
        
        if(!id || !dt || !rec || isNaN(qty) || qty <= 0) return alert("Please fill all required fields correctly.");
        
        let subtot = subtotRaw ? parseFloat(subtotRaw) : (qty * pr);
        let total = totalRaw ? parseFloat(totalRaw) : (subtot + ship + tax - discAmt);
        
        sysLog(`Adding Manual Sale: ${id}`); setMasterStatus("Saving...", "mod-working");
        
        // --- POWERED BY MASTER ENGINE ---
        let cogs = getEngineTrueCogs(rec);
        let stripeFee = getEngineStripeFee(total);
        let actualShipCost = (typeof ENGINE_CONFIG !== 'undefined' ? ENGINE_CONFIG.flatShipping : 8.00) * qty;
        let lineNet = getHistoricalNetProfit(pr * qty, ship, tax, discAmt, actualShipCost, rec);
        // --------------------------------
        
        let uniqueManualSku = "MANUAL_ENTRY_" + rec;
        
        let sRow = { 
            order_id: id, sale_date: dt, storefront_sku: uniqueManualSku, internal_recipe_name: rec, 
            qty_sold: qty, actual_sale_price: pr, cogs_at_sale: cogs, 
            subtotal: subtot, shipping: ship, taxes: tax, discount_code: discCode, discount_amount: discAmt, total: total,
            "Source": source, "Outstanding Balance": balance,
            transaction_fees: stripeFee, net_profit: lineNet
        };
        
        let invK = `RECIPE:::${rec}`;
        if(!inventoryDB[invK]) inventoryDB[invK] = {consumed_qty:0, manual_adjustment:0, produced_qty:0, sold_qty:0, min_stock:0, scrap_qty:0};
        inventoryDB[invK].sold_qty += qty;
        let invPayload = { item_key: invK, ...inventoryDB[invK] };
        
        const {error: e1} = await supabaseClient.from('sales_ledger').insert([sRow]); if(e1) throw new Error("Insert Error: " + e1.message);
        const {error: e2} = await supabaseClient.from('inventory_consumption').upsert([invPayload], {onConflict:'item_key'}); if(e2) throw new Error("Inventory Error: " + e2.message);
        
        salesDB.unshift(sRow);
        ['manualSaleId', 'manualSalePrice', 'manualSaleSubtot', 'manualSaleShip', 'manualSaleTax', 'manualSaleDiscCode', 'manualSaleDisc', 'manualSaleTotal', 'manualSaleSource', 'manualSaleBalance'].forEach(el => {
            let field = document.getElementById(el);
            if(field) field.value = "";
        });
        setMasterStatus("Sale Added!", "mod-success"); 
        
        renderSalesTable(); 
        renderInventoryTable(); 
        if(typeof renderAnalyticsDashboard === 'function') renderAnalyticsDashboard();
        setTimeout(()=> {
            let sm = document.getElementById('statusMaster');
            if (sm) setMasterStatus("Ready.", "status-idle");
        }, 2000);
    } catch(e) { sysLog(e.message, true); setMasterStatus("Error", "mod-error"); alert("Error adding manual sale: \n" + e.message); }
}

function syncTrace(msg, isErr=false) {
    let t = document.getElementById('syncProgressTerminal');
    if(t) {
        let line = document.createElement('div');
        line.style.color = isErr ? '#ef4444' : '#38bdf8';
        line.style.paddingBottom = '3px';
        line.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
        line.innerText = `> ${msg}`;
        t.appendChild(line);
        t.parentElement.scrollTop = t.parentElement.scrollHeight;
    }
}

async function processSalesCSV() {
    let t = document.getElementById('syncProgressTerminal'); if(t) t.innerHTML = "";
    syncTrace("INITIALIZING SYNC PROTOCOL...", false);
    const fileInput = document.getElementById('salesCsvFile'); const file = fileInput.files[0];
    if(!file) { syncTrace("ERROR: No CSV payload selected.", true); return alert("Please select a CSV file first."); }
    syncTrace(`Loaded Payload: ${file.name} (${Math.round(file.size/1024)} KB)`);
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
    syncTrace(`File parsed successfully. Target rows length: ${rows.length}`);
    syncTrace("Scanning for missing Storefront SKUs inside Local Dictionary...");
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
            let src = String(r['Source'] || "").trim();
            let bal = parseFloat(String(r['Outstanding Balance'] || r['Balance'] || "0").replace(/[^0-9.-]+/g,"")) || 0;
            orderFirstRowFlags[orderId] = { source: src, balance: bal }; 
        }

        let internalName = aliasDB[skuName] || (productsDB[skuName] ? skuName : null);
        pendingSalesRows.push({ 
            order_id: String(orderId), sale_date: dateStr, storefront_sku: String(skuName), 
            qty_sold: qty, actual_sale_price: price, internal_recipe_name: internalName, 
            subtotal: subTot, shipping: ship, taxes: tax, discount_code: discCode, discount_amount: discAmt, total: tot,
            "Source": orderFirstRowFlags[orderId].source, "Outstanding Balance": orderFirstRowFlags[orderId].balance
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
        syncTrace("HALT WARNING: Zero valid rows detected or Ledger matched existing instances 100%. Aborting.", true);
        setTimeout(() => alert("No new sales found in this file! All orders are already in the ledger or the file contained invalid rows."), 10);
        let elUnmapped = document.getElementById('unmappedSkusList');
        if (elUnmapped) elUnmapped.innerHTML = "";
        syncTrace("All storefront SKUs are strictly mapped to Local Recipes.", false);
        setMasterStatus("Ready.", "status-idle"); setSysProgress(0, 'working'); 
        let elFile = document.getElementById('salesCsvFile');
        if (elFile) elFile.value = ""; 
        return;
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
        let elUnmapped = document.getElementById('unmappedSkusList');
        if (elUnmapped) elUnmapped.innerHTML = h;
    }
    if (typeof renderAliasManager === 'function') renderAliasManager();
}

async function executeSalesSync() {
    try {
        syncTrace(`Mapping verified. Preparing Database Payload structure for ${pendingSalesRows.length} internal components...`);
        sysLog(`Pushing ${pendingSalesRows.length} sales...`); setMasterStatus("Syncing Sales...", "mod-working"); setSysProgress(60, 'working');

        // --- POWERED BY MASTER ENGINE ---
        let salesPayload = pendingSalesRows.map(r => { 
            let cogs = getEngineTrueCogs(r.internal_recipe_name);
            let fee = getEngineStripeFee(r.total);
            const SHIP_COST = typeof ENGINE_CONFIG !== 'undefined' ? ENGINE_CONFIG.flatShipping : 8.00;
            let actualShipCost = SHIP_COST * r.qty_sold;
            let net = getHistoricalNetProfit(r.actual_sale_price * r.qty_sold, r.shipping, r.taxes, r.discount_amount, actualShipCost, r.internal_recipe_name);
            
            let cS = Math.round(cogs * 100) / 100;
            let fS = Math.round(fee * 100) / 100;
            let nS = Math.round(net * 100) / 100;
            
            return { ...r, cogs_at_sale: cS, transaction_fees: fS, net_profit: nS }; 
        });
        // --------------------------------

        let invMap = {};
        pendingSalesRows.forEach(r => { let k = `RECIPE:::${r.internal_recipe_name}`; if(!invMap[k]) invMap[k] = (inventoryDB[k] ? inventoryDB[k].sold_qty : 0); invMap[k] += r.qty_sold; });
        let invPayload = Object.keys(invMap).map(k => {
            if(!inventoryDB[k]) inventoryDB[k] = {consumed_qty:0, manual_adjustment:0, produced_qty:0, sold_qty:0, min_stock:0, scrap_qty:0};
            inventoryDB[k].sold_qty = invMap[k];
            return { item_key: k, consumed_qty: inventoryDB[k].consumed_qty, manual_adjustment: inventoryDB[k].manual_adjustment, produced_qty: inventoryDB[k].produced_qty, sold_qty: inventoryDB[k].sold_qty, min_stock: inventoryDB[k].min_stock, scrap_qty: inventoryDB[k].scrap_qty };
        });

        syncTrace(`Injecting aggregated Sales Ledger objects to network array...`);
        const { error: e1 } = await supabaseClient.from('sales_ledger').insert(salesPayload); 
        if(e1) throw new Error("Sales Ledger Insert Error: " + e1.message);
        
        syncTrace(`Deducting ${invPayload.length} distinct BOM recipes from Live Inventory...`);
        const { error: e2 } = await supabaseClient.from('inventory_consumption').upsert(invPayload, {onConflict:'item_key'}); 
        if(e2) throw new Error("Inventory Deduction Error: " + e2.message);

        syncTrace(`Transaction successful! Updating dynamic DOM clusters!`);
        salesPayload.forEach(s => salesDB.unshift(s));  
        let count = pendingSalesRows.length;
        pendingSalesRows = [];
        let elUnmapped = document.getElementById('unmappedSkusList');
        if (elUnmapped) elUnmapped.innerHTML = "";
        syncTrace("All storefront SKUs are strictly mapped to Local Recipes.", false);
        
        let elFile = document.getElementById('salesCsvFile');
        if (elFile) elFile.value = "";

        setSysProgress(100, 'success'); setMasterStatus("Sales Synced!", "mod-success");
        renderSalesTable(); 
        renderInventoryTable(); 
        if(typeof renderAnalyticsDashboard === 'function') renderAnalyticsDashboard();
        
        syncTrace("COMPLETED ALL PROCEDURES. Synchronized data to live database objects.");
        setTimeout(() => alert(`Success! ${count} sales were synced and inventory was updated.`), 10);
        setTimeout(()=> { setMasterStatus("Ready.", "status-idle"); setSysProgress(0, 'working'); }, 3000);
    } catch(e) { 
        syncTrace(`CRITICAL FAULT: ${e.message}`, true);
        sysLog(e.message, true); 
        setMasterStatus("Sync Error", "mod-error"); 
        setSysProgress(100, 'error'); 
        setTimeout(() => alert("Database Error during Sync:\n\n" + e.message + "\n\nPlease check your Supabase columns."), 10);
    }
}

function sortSales(c) { if(isResizing) return; currentSalesSort = { column: c, direction: currentSalesSort.column===c && currentSalesSort.direction==='asc' ? 'desc' : 'asc' }; renderSalesTable(); }

function renderSalesTable() {
    let wrap = document.getElementById('salesTableWrap'); 
    if(!wrap) return;
    
    // Updated Headers based on System Standard
    let ths = ` <th class="${currentSalesSort.column==='d'?'sorted-'+currentSalesSort.direction:''}" onclick="sortSales('d')">Sale Date</th> <th class="${currentSalesSort.column==='o'?'sorted-'+currentSalesSort.direction:''}" onclick="sortSales('o')">Order ID</th> <th class="${currentSalesSort.column==='src'?'sorted-'+currentSalesSort.direction:''}" onclick="sortSales('src')">Source</th> <th class="${currentSalesSort.column==='sku'?'sorted-'+currentSalesSort.direction:''}" onclick="sortSales('sku')">Storefront SKU</th> <th class="${currentSalesSort.column==='int'?'sorted-'+currentSalesSort.direction:''}" onclick="sortSales('int')">Recipe</th> <th class="${currentSalesSort.column==='type'?'sorted-'+currentSalesSort.direction:''}" onclick="sortSales('type')">Type</th> <th class="${currentSalesSort.column==='q'?'sorted-'+currentSalesSort.direction:''} text-right" onclick="sortSales('q')">Qty</th> <th class="${currentSalesSort.column==='p'?'sorted-'+currentSalesSort.direction:''} text-right" onclick="sortSales('p')">Actual Price</th> <th class="${currentSalesSort.column==='disc'?'sorted-'+currentSalesSort.direction:''} text-right" onclick="sortSales('disc')">Discount</th> <th class="${currentSalesSort.column==='ship'?'sorted-'+currentSalesSort.direction:''} text-right" onclick="sortSales('ship')">Ship Col.</th> <th class="${currentSalesSort.column==='tax'?'sorted-'+currentSalesSort.direction:''} text-right" onclick="sortSales('tax')">Tax Col.</th> <th class="${currentSalesSort.column==='tot'?'sorted-'+currentSalesSort.direction:''} text-right" onclick="sortSales('tot')">Total Captured</th> <th class="${currentSalesSort.column==='adj'?'sorted-'+currentSalesSort.direction:''} text-right" onclick="sortSales('adj')">Exch. Adj.</th> <th class="${currentSalesSort.column==='bal'?'sorted-'+currentSalesSort.direction:''} text-right" onclick="sortSales('bal')">Balance</th> <th class="${currentSalesSort.column==='c'?'sorted-'+currentSalesSort.direction:''} text-right" onclick="sortSales('c')">True COGS</th> <th class="${currentSalesSort.column==='stripe'?'sorted-'+currentSalesSort.direction:''} text-right" onclick="sortSales('stripe')">Stripe Fee</th> <th class="${currentSalesSort.column==='net'?'sorted-'+currentSalesSort.direction:''} text-right" onclick="sortSales('net')">Actual Net</th>`;
    let h = `<table style="width:100%;"><thead><tr>${ths}</tr></thead><tbody>`;
    
    const SHIP_COST = typeof ENGINE_CONFIG !== 'undefined' ? ENGINE_CONFIG.flatShipping : 8.00;

    // Pre-calculate Engine stats for sorting and rendering
    let a = salesDB.map(x => {
        let type = x.transaction_type || 'Standard';
        let qty = parseFloat(x.qty_sold) || 0;
        let p = parseFloat(x.actual_sale_price) || 0;
        let s = parseFloat(x.shipping) || 0;
        let t = parseFloat(x.taxes) || 0;
        let d = parseFloat(x.discount_amount) || 0;
        
        let liveCogs = getEngineTrueCogs(x.internal_recipe_name);
        
        // --- CUSTOM EXCEPTION OVERRIDES ---
        if (type === 'Pre-Ship Exchange') {
            liveCogs = 0;
        } else if (type === 'Replacement / Warranty') {
            p = 0; s = 0; t = 0; d = 0;
        }
        
        // BUGFIX: Base Stripe Fee on True Line Capture, avoiding Shopify's merged Total inflation
        let trueLineCaptured = (p * qty) + s + t - d;
        let stripeFee = type === 'Replacement / Warranty' ? 0 : getEngineStripeFee(trueLineCaptured);
        
        // --- POWERED BY MASTER ENGINE ---
        let actualShipCost = type === 'Pre-Ship Exchange' ? 0 : (SHIP_COST * qty);
        let net = getHistoricalNetProfit(p*qty, s, t, d, actualShipCost, x.internal_recipe_name);
        
        if (type === 'Pre-Ship Exchange') {
            net += getEngineTrueCogs(x.internal_recipe_name); // refund the dynamic COGS that engine deducted
        } else if (type === 'Replacement / Warranty') {
            net = 0 - actualShipCost - liveCogs;
        }
        // --------------------------------
        
        return { ...x, transaction_type: type, liveCogs, stripeFee, net: net, exchAdj: 0, isExchanged: false };
    });

    // --- AUTOMATED EXCHANGE LOGIC & AGGREGATION ---
    let orderGroups = {};
    a.forEach(x => { if(!orderGroups[x.order_id]) orderGroups[x.order_id] = []; orderGroups[x.order_id].push(x); });
    
    let totals = { gross: 0, captured: 0, cogs: 0, shipping: 0, stripe: 0, net: 0, count: a.length, discounts: 0 };

    Object.keys(orderGroups).forEach(oid => {
        let group = orderGroups[oid];
        if(group.length > 1) {
            let balRows = group.filter(r => (parseFloat(r["Outstanding Balance"]) || 0) > 0);
            if(balRows.length >= 2) {
                let zeroTotal = group.find(r => (parseFloat(r.total) || 0) === 0);
                let nonZeroTotal = group.find(r => (parseFloat(r.total) || 0) > 0);
                // Only invoke algorithmic logic if NO manual exception type is declared on the components
                if(zeroTotal && nonZeroTotal && zeroTotal.transaction_type === 'Standard' && nonZeroTotal.transaction_type === 'Standard') {
                    let offset = parseFloat(zeroTotal["Outstanding Balance"]) || 0;
                    nonZeroTotal.exchAdj = -offset;
                    zeroTotal.isExchanged = true;
                    nonZeroTotal.isExchanged = true;
                    
                    // Fix double-fulfillment constraint: 
                    // The original item (nonZeroTotal) was never built or shipped due to the pre-shipment exchange.
                    // We must mathematically refund the ghost COGS and Ship Cost back to Net Profit.
                    nonZeroTotal.net += nonZeroTotal.liveCogs;
                    nonZeroTotal.net += (SHIP_COST * parseFloat(nonZeroTotal.qty_sold || 0));
                    nonZeroTotal.liveCogs = 0; 
                }
            }
        }
    });

    // Final Calculation Pass for Totals
    a.forEach(x => {
        totals.gross += (parseFloat(x.actual_sale_price || 0) * (parseFloat(x.qty_sold) || 0));
        totals.discounts += parseFloat(x.discount_amount || 0);
        totals.captured += (parseFloat(x.total || 0) + (x.exchAdj || 0));
        totals.cogs += x.liveCogs;
        totals.shipping += (SHIP_COST * (parseFloat(x.qty_sold) || 0));
        totals.stripe += x.stripeFee;
        totals.net += x.net;
    });

    // Totals logic removed - moving to Analytics tab
    // -----------------------------------------------
    
    if(a.length===0){ 
        h += "<tr><td colspan='16' style='text-align:center;'>No sales synced yet.</td></tr>"; 
    } else {
        a.sort((x,y) => { 
            let map = {d:'sale_date', o:'order_id', src:'Source', sku:'storefront_sku', int:'internal_recipe_name', type:'transaction_type', q:'qty_sold', p:'actual_sale_price', c:'liveCogs', ship:'shipping', tax:'taxes', disc:'discount_amount', tot:'total', adj:'exchAdj', bal:'Outstanding Balance', stripe:'stripeFee', net:'net'}; 
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
            <td class="editable" contenteditable="true" onfocus="storeOldVal(this)" onblur="updateSaleCell(this, '${x.order_id}', '${safeSku}', 'Source', false)" style="color:var(--text-muted);">${x["Source"] || ''}</td>
            <td class="editable trunc-col" contenteditable="true" onfocus="storeOldVal(this)" onblur="updateSaleCell(this, '${x.order_id}', '${safeSku}', 'storefront_sku', false)">${x.storefront_sku}</td>
            <td class="editable trunc-col" contenteditable="true" onfocus="storeOldVal(this)" onblur="updateSaleCell(this, '${x.order_id}', '${safeSku}', 'internal_recipe_name', false)" style="color:#0ea5e9; font-weight:bold;">${x.internal_recipe_name}</td>
            <td style="padding:4px;"><select style="background:var(--bg_secondary); color:#fff; border:1px solid #334155; border-radius:4px; font-size:12px; padding:4px; outline:none;" onchange="updateSaleType(this, '${x.order_id}', '${safeSku}')"><option style="background:#0f172a; color:#fff;" value="Standard" ${x.transaction_type==='Standard'?'selected':''}>Standard</option><option style="background:#0f172a; color:#fff;" value="Pre-Ship Exchange" ${x.transaction_type==='Pre-Ship Exchange'?'selected':''}>Pre-Ship Exchange</option><option style="background:#0f172a; color:#fff;" value="Post-Ship Exchange" ${x.transaction_type==='Post-Ship Exchange'?'selected':''}>Post-Ship Exchange</option><option style="background:#0f172a; color:#fff;" value="Replacement / Warranty" ${x.transaction_type==='Replacement / Warranty'?'selected':''}>Replacement / Warranty</option></select></td>

            <td class="text-right editable" contenteditable="true" onfocus="storeOldVal(this)" onblur="updateSaleCell(this, '${x.order_id}', '${safeSku}', 'qty_sold', true)" style="font-weight:bold;">${x.qty_sold}</td>
            <td class="text-right editable" contenteditable="true" onfocus="storeOldVal(this)" onblur="updateSaleCell(this, '${x.order_id}', '${safeSku}', 'actual_sale_price', true)" style="color:#10b981;">$${parseFloat(x.actual_sale_price).toFixed(2)}</td>
            <td class="text-right editable" contenteditable="true" onfocus="storeOldVal(this)" onblur="updateSaleCell(this, '${x.order_id}', '${safeSku}', 'discount_amount', true)" style="color:#f59e0b;">$${parseFloat(x.discount_amount || 0).toFixed(2)}</td>
            <td class="text-right editable" contenteditable="true" onfocus="storeOldVal(this)" onblur="updateSaleCell(this, '${x.order_id}', '${safeSku}', 'shipping', true)" style="color:var(--text-muted);">$${parseFloat(x.shipping || 0).toFixed(2)}</td>
            <td class="text-right editable" contenteditable="true" onfocus="storeOldVal(this)" onblur="updateSaleCell(this, '${x.order_id}', '${safeSku}', 'taxes', true)" style="color:var(--text-muted);">$${parseFloat(x.taxes || 0).toFixed(2)}</td>
            <td class="text-right editable" contenteditable="true" onfocus="storeOldVal(this)" onblur="updateSaleCell(this, '${x.order_id}', '${safeSku}', 'total', true)" style="font-weight:bold;">$${(parseFloat(x.total || 0) + (x.exchAdj || 0)).toFixed(2)}</td>
            <td class="text-right" style="color:#f59e0b; font-weight:bold;">${x.exchAdj !== 0 ? '-$' + Math.abs(x.exchAdj).toFixed(2) : '$0.00'}</td>
            <td class="text-right editable" contenteditable="true" onfocus="storeOldVal(this)" onblur="updateSaleCell(this, '${x.order_id}', '${safeSku}', 'Outstanding Balance', true)" style="color:#ef4444;">$${parseFloat(x["Outstanding Balance"] || 0).toFixed(2)}</td>
            <td class="text-right" style="color:#ef4444; font-weight:bold;">$${x.liveCogs.toFixed(2)}</td>
            <td class="text-right" style="color:#888;">-$${x.stripeFee.toFixed(2)}</td>
            <td class="text-right" style="color:${netColor}; font-weight:900;">$${x.net.toFixed(2)}</td>
            </tr>`; 
        });
    }
    
    wrap.innerHTML = h + `</tbody></table>`; 
    if(typeof applyTableInteractivity === 'function') applyTableInteractivity('salesTableWrap');
}

window.updateSaleType = async function(sel, orderId, sku) {
    let newVal = sel.value;
    sysLog(`Editing Sale Type ${orderId}: ${newVal}`);
    setMasterStatus("Saving...", "mod-working");
    let row = salesDB.find(s => s.order_id === orderId && s.storefront_sku === sku);
    if(row) {
        row.transaction_type = newVal;
        const { error } = await supabaseClient.from('sales_ledger').update({transaction_type: newVal}).eq('order_id', orderId).eq('storefront_sku', sku);
        if(error) { alert("Error saving type: " + error.message); return; }
        setMasterStatus("Saved!", "mod-success"); 
        renderSalesTable(); 
        if(typeof renderAnalyticsDashboard === 'function') renderAnalyticsDashboard();
        setTimeout(()=>setMasterStatus("Ready.", "status-idle"), 2000);
    }
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
        renderSalesTable(); 
        renderInventoryTable(); 
        if(typeof renderAnalyticsDashboard === 'function') renderAnalyticsDashboard();
        setTimeout(()=>setMasterStatus("Ready.", "status-idle"), 2000);
    } catch(e) { sysLog(e.message, true); setMasterStatus("Error", "mod-error"); cell.innerText = oldValTemp; alert("Error updating cell: \n" + e.message); }
}
