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
        let stripeFee = getEngineStripeFee(total, source);
        let actualShipCost = (typeof ENGINE_CONFIG !== 'undefined' ? ENGINE_CONFIG.flatShipping : 8.00) * qty;
        let lineNet = getHistoricalNetProfit(pr * qty, ship, tax, discAmt, actualShipCost, rec, qty, source);
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
        let isFirstRow = false;
        if (!orderFirstRowFlags[orderId]) {
            isFirstRow = true;
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
            "Source": orderFirstRowFlags[orderId].source, "Outstanding Balance": isFirstRow ? orderFirstRowFlags[orderId].balance : 0
        });
        
        if(!internalName) unmapped.add(String(skuName));
    });

    if(unmapped.size > 0) {
        let uList = Array.from(unmapped); let h = `Found ${uList.length} unmapped SKU(s).<br>`;
        uList.forEach(u => h += `<button class="btn-blue btn-sm" style="margin-top:8px; text-align:left;" onclick="openAliasModal('${u.replace(/'/g, "\\'")}')">🔗 Map SKU: ${u}</button>`);
        document.getElementById('unmappedSkusList').innerHTML = h;
        setMasterStatus("Action Required", "mod-error"); setSysProgress(0, 'working'); return; 
    }

    if(pendingSalesRows.length === 0) {
        syncTrace("HALT WARNING: Zero valid rows detected or Ledger matched existing instances 100%. Aborting.", true);
        setTimeout(() => showToast("No new sales found in this file! All orders already exist in the ledger or file contained invalid rows."), 10);
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
        uList.forEach(u => h += `<button class="btn-blue btn-sm" style="margin-top:8px; text-align:left;" onclick="openAliasModal('${u.replace(/'/g, "\\'")}')">🔗 Map SKU: ${u}</button>`);
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
            let trueLineCaptured = (r.actual_sale_price * r.qty_sold) + parseFloat(r.shipping || 0) + parseFloat(r.taxes || 0) - parseFloat(r.discount_amount || 0);
            let fee = getEngineStripeFee(trueLineCaptured, r["Source"]);
            const SHIP_COST = typeof ENGINE_CONFIG !== 'undefined' ? ENGINE_CONFIG.flatShipping : 8.00;
            let actualShipCost = SHIP_COST * r.qty_sold;
            let net = getHistoricalNetProfit(r.actual_sale_price * r.qty_sold, r.shipping, r.taxes, r.discount_amount, actualShipCost, r.internal_recipe_name, r.qty_sold, r["Source"]);
            
            let cS = Math.round(cogs * 100) / 100;
            let fS = Math.round(fee * 100) / 100;
            let nS = Math.round(net * 100) / 100;
            
            return { ...r, cogs_at_sale: cS, transaction_fees: fS, net_profit: nS }; 
        });
        // --------------------------------

        syncTrace(`Injecting aggregated Sales Ledger objects to network array...`);
        const { error: e1 } = await supabaseClient.from('sales_ledger').insert(salesPayload); 
        if(e1) throw new Error("Sales Ledger Insert Error: " + e1.message);

        syncTrace(`Inventory deduction deferred structurally to Packerz fulfillment completion.`);

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
        setTimeout(() => showToast(`✅ Success! ${count} sales synced. Inventory deduction deferred until Packerz Assembly Completion.`), 10);
        setTimeout(()=> { setMasterStatus("Ready.", "status-idle"); setSysProgress(0, 'working'); }, 3000);
    } catch(e) { 
        syncTrace(`CRITICAL FAULT: ${e.message}`, true);
        sysLog(e.message, true); 
        setMasterStatus("Sync Error", "mod-error"); 
        setSysProgress(100, 'error'); 
        setTimeout(() => showToast("Database Error during Sync:\n\n" + e.message + "\n\nPlease check your Supabase columns.", 'error'), 10);
    }
}

function sortSales(c) { if(isResizing) return; currentSalesSort = { column: c, direction: currentSalesSort.column===c && currentSalesSort.direction==='asc' ? 'desc' : 'asc' }; window.saveSort('currentSalesSort', currentSalesSort); renderSalesTable(); }

function renderSalesTable() {
    let wrap = document.getElementById('salesTableWrap'); 
    if(!wrap) return;
    
    // Updated Headers based on System Standard
    let ths = ` <th class="${currentSalesSort.column==='d'?'sorted-'+currentSalesSort.direction:''}" onclick="sortSales('d')">Sale Date</th> <th class="${currentSalesSort.column==='o'?'sorted-'+currentSalesSort.direction:''}" onclick="sortSales('o')">Order ID</th> <th class="${currentSalesSort.column==='src'?'sorted-'+currentSalesSort.direction:''}" onclick="sortSales('src')">Source</th> <th class="${currentSalesSort.column==='sku'?'sorted-'+currentSalesSort.direction:''}" onclick="sortSales('sku')">Storefront SKU</th> <th class="${currentSalesSort.column==='int'?'sorted-'+currentSalesSort.direction:''}" onclick="sortSales('int')">Recipe</th> <th class="${currentSalesSort.column==='type'?'sorted-'+currentSalesSort.direction:''}" onclick="sortSales('type')">Type</th> <th class="${currentSalesSort.column==='q'?'sorted-'+currentSalesSort.direction:''} text-right" onclick="sortSales('q')">Qty</th> <th class="${currentSalesSort.column==='p'?'sorted-'+currentSalesSort.direction:''} text-right" onclick="sortSales('p')">Actual Price</th> <th class="${currentSalesSort.column==='disc'?'sorted-'+currentSalesSort.direction:''} text-right" onclick="sortSales('disc')">Discount</th> <th class="${currentSalesSort.column==='ship'?'sorted-'+currentSalesSort.direction:''} text-right" onclick="sortSales('ship')">Ship Col.</th> <th class="${currentSalesSort.column==='tax'?'sorted-'+currentSalesSort.direction:''} text-right" onclick="sortSales('tax')">Tax Col.</th> <th class="${currentSalesSort.column==='tot'?'sorted-'+currentSalesSort.direction:''} text-right" onclick="sortSales('tot')">Total Captured</th> <th class="${currentSalesSort.column==='c'?'sorted-'+currentSalesSort.direction:''} text-right" onclick="sortSales('c')">True COGS</th> <th class="${currentSalesSort.column==='stripe'?'sorted-'+currentSalesSort.direction:''} text-right" onclick="sortSales('stripe')">Stripe/eBay</th> <th class="${currentSalesSort.column==='net'?'sorted-'+currentSalesSort.direction:''} text-right" onclick="sortSales('net')">Actual Net</th>`;
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
        
        let liveCogs = getEngineTrueCogs(x.internal_recipe_name) * qty;
        let isCostOnlyItem = (type === 'Replacement / Warranty' || type === 'Warranty' || type === 'Gift' || type === 'IGNORE');
        
        // --- CUSTOM EXCEPTION OVERRIDES ---
        if (type === 'Pre-Ship Exchange' || type === 'IGNORE') {
            liveCogs = 0;
        }
        if (isCostOnlyItem) {
            p = 0; s = 0; t = 0; d = 0;
        }
        
        // BUGFIX: Base Stripe Fee on True Line Capture, avoiding Shopify's merged Total inflation
        let trueLineCaptured = (p * qty) + s + t - d;
        let stripeFee = isCostOnlyItem ? 0 : getEngineStripeFee(trueLineCaptured, x['Source']);
        
        // --- POWERED BY MASTER ENGINE ---
        let actualShipCost = type === 'Pre-Ship Exchange' ? 0 : 
                             type === 'IGNORE' ? 0 :
                             (s > 0 ? s : SHIP_COST); // All valid items cleanly map actual ship cost to what the customer paid, OR default to flat-rate if Free Shipping
        let net = getHistoricalNetProfit(p*qty, s, t, d, actualShipCost, x.internal_recipe_name, qty, x['Source']);
        
        if (type === 'IGNORE') {
            net = 0;
        } else if (type === 'Pre-Ship Exchange') {
            net += liveCogs; // refund the dynamic COGS that engine deducted
        } else if (isCostOnlyItem) {
            net = 0 - actualShipCost - liveCogs;
        }
        // --------------------------------
        
        return { ...x, transaction_type: type, liveCogs, stripeFee, net: net, exchAdj: 0, isExchanged: false, isCostOnlyItem, actualShipCost };
    });

    // --- AUTOMATED EXCHANGE LOGIC & AGGREGATION ---
    let orderGroups = {};
    a.forEach(x => { if(!orderGroups[x.order_id]) orderGroups[x.order_id] = []; orderGroups[x.order_id].push(x); });

    // DEDUPLICATE OUTBOUND SHIPPING OVERHEAD FOR MULTI-ITEM ORDERS
    Object.values(orderGroups).forEach(group => {
        let primaryFound = false;
        group.forEach(r => {
            if (r.transaction_type !== 'Pre-Ship Exchange' && r.transaction_type !== 'Gift') {
                if (!primaryFound) {
                    primaryFound = true;
                } else {
                    // Refund the redundant standalone SHIP_COST from secondary items sharing the box ONLY if it was forced by the algorithm
                    if (r.actualShipCost === (typeof ENGINE_CONFIG !== 'undefined' ? ENGINE_CONFIG.flatShipping : 8.00)) {
                        r.net += r.actualShipCost;
                        r.actualShipCost = 0;
                    }
                }
            }
        });
    });

    // 100% PAYLOAD TRANSFER: Shift all Shopify Captured Cash from Unshipped -> Replacement
    Object.values(orderGroups).forEach(group => {
        let unshipped = group.filter(x => x.transaction_type === 'Pre-Ship Exchange');
        let replacements = group.filter(x => x.transaction_type === 'Replacement / Warranty');
        
        if (unshipped.length > 0 && replacements.length > 0) {
            let u = unshipped[0];
            let r = replacements[0];

            // Transfer Revenue metrics
            r.actual_sale_price = u.actual_sale_price;
            r.shipping = parseFloat(u.shipping || 0);
            r.taxes = parseFloat(u.taxes || 0);
            r.total = parseFloat(u.total || 0);
            r.stripeFee = u.stripeFee;
            r.discount_amount = parseFloat(u.discount_amount || 0);
            r.isRevenueTransfer = true; // Protects UI from treating the transferred shipping as a warranty expense override

            // Re-calculate the Replacement's Net using pure physical attributes and true revenue, bypassing Shopify's merged 'total' string
            let rawRev = (parseFloat(r.actual_sale_price || 0) * (parseFloat(r.qty_sold) || 0)) + parseFloat(r.shipping || 0) - parseFloat(r.discount_amount || 0);
            r.net = rawRev - r.liveCogs - r.actualShipCost - r.stripeFee;

            // Zero out all metrics on the Unshipped row entirely (so it doesn't keep Revenue)
            u.actual_sale_price = 0;
            u.shipping = 0;
            u.taxes = 0;
            u.total = 0;
            u.stripeFee = 0;
            u.discount_amount = 0;
            u.liveCogs = 0; // Ensure 0
            u.net = 0;
            u.exchAdj = 0; // Clear any visual adjustments
        }
    });

    let totals = { gross: 0, captured: 0, cogs: 0, shipping: 0, stripe: 0, net: 0, count: a.length, discounts: 0, units: 0, burdenUnits: 0, burdenPct: 0 };

    Object.keys(orderGroups).forEach(oid => {
        let group = orderGroups[oid];
        if(group.length > 1) {
            let zeroTotal = group.find(r => (parseFloat(r.total) || 0) === 0);
            let nonZeroTotal = group.find(r => (parseFloat(r.total) || 0) > 0);
            
            // Fix: We only want to trigger Automated Exchange Logic if an item with $0 line-item price exists, OR it's been manually flagged
            let hasTrueExchangeIndication = group.some(r => r.transaction_type !== 'Standard') || group.some(r => parseFloat(r.actual_sale_price || 0) === 0);

            if(zeroTotal && nonZeroTotal && hasTrueExchangeIndication) {
                // If it's an exchange, offset the visual total by whatever outstanding balance generated
                let orderBalance = group.reduce((sum, r) => sum + (parseFloat(r["Outstanding Balance"]) || 0), 0);
                if(orderBalance > 0) {
                    nonZeroTotal.exchAdj = -orderBalance;
                    zeroTotal.isExchanged = true;
                    nonZeroTotal.isExchanged = true;
                    
                    if (zeroTotal.transaction_type === 'Standard' && nonZeroTotal.transaction_type === 'Standard') {
                        nonZeroTotal.net += nonZeroTotal.liveCogs;
                        nonZeroTotal.net += (SHIP_COST * parseFloat(nonZeroTotal.qty_sold || 0));
                        nonZeroTotal.liveCogs = 0; 
                    }
                }
            }
        }
    });

    // Final Calculation Pass for Totals
    a.forEach(x => {
        let isCostOnly = x.isCostOnlyItem;
        let p = parseFloat(x.actual_sale_price || 0);
        let q = parseFloat(x.qty_sold || 0);
        let s = parseFloat(x.shipping || 0);
        let t = parseFloat(x.taxes || 0);
        let d = parseFloat(x.discount_amount || 0);
        let trueLineCaptured = (p * q) + s + t - d;
        x.localDerivedTotal = trueLineCaptured; // Store for the UI rendering below
        
        totals.gross += isCostOnly ? 0 : (p * q);
        totals.discounts += isCostOnly ? 0 : d;
        totals.captured += isCostOnly ? 0 : (trueLineCaptured + (x.exchAdj || 0));
        totals.cogs += x.liveCogs;
        totals.shipping += x.actualShipCost || 0;
        totals.stripe += x.stripeFee;
        totals.net += x.net;
        totals.units += (x.transaction_type === 'IGNORE') ? 0 : (parseFloat(x.qty_sold) || 0);
        
        // Track strictly isolated Warranty overhead
        if(x.transaction_type === 'Warranty') {
            totals.burdenUnits += (parseFloat(x.qty_sold) || 0);
        }
    });

    totals.burdenPct = totals.units > 0 ? (totals.burdenUnits / totals.units) * 100 : 0;

    // --- EXPORT TO ANALYTICS MODULE ---
    window.salesEngineTotals = totals;
    window.processedSalesDB = a;
    // ----------------------------------
    
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
            <td style="color:var(--text-muted);">${x.sale_date}</td>
            <td style="font-weight:bold;">${x.order_id}</td>
            <td style="color:var(--text-muted);">${x["Source"] || ''}</td>
            <td class="trunc-col">${x.storefront_sku}</td>
            <td class="editable trunc-col" contenteditable="true" onfocus="storeOldVal(this)" onblur="updateSaleCell(this, '${x.order_id}', '${safeSku}', 'internal_recipe_name', false)" style="color:#0ea5e9; font-weight:bold;">${x.internal_recipe_name}</td>
            <td style="padding:4px;"><select style="background:var(--bg-input); color:var(--text-main); border:1px solid var(--border-input); border-radius:4px; font-size:12px; padding:4px; outline:none;" onchange="updateSaleType(this, '${x.order_id}', '${safeSku}')">
                <option style="background:var(--bg-panel); color:var(--text-main);" value="Standard" ${x.transaction_type==='Standard'?'selected':''}>Standard</option>
                <option style="background:var(--bg-panel); color:var(--text-main);" value="Pre-Ship Exchange" ${x.transaction_type==='Pre-Ship Exchange'?'selected':''}>Unshipped (Keep Rev)</option>
                <option style="background:var(--bg-panel); color:var(--text-main);" value="Post-Ship Exchange" ${x.transaction_type==='Post-Ship Exchange'?'selected':''}>Post-Ship Exchange</option>
                <option style="background:var(--bg-panel); color:var(--text-main);" value="Replacement / Warranty" ${x.transaction_type==='Replacement / Warranty'?'selected':''}>Exchange Replacement</option>
                <option style="background:var(--bg-panel); color:var(--text-main);" value="Warranty" ${x.transaction_type==='Warranty'?'selected':''}>Warranty</option>
                <option style="background:var(--bg-panel); color:var(--text-main);" value="Gift" ${x.transaction_type==='Gift'?'selected':''}>Gift</option>
                <option style="background:var(--bg-panel); color:var(--text-main);" value="IGNORE" ${x.transaction_type==='IGNORE'?'selected':''}>IGNORE</option>
            </select></td>

            <td class="text-right" style="font-weight:bold;">${x.qty_sold}</td>
            <td class="text-right" style="color:#10b981;">$${parseFloat(x.actual_sale_price).toFixed(2)}</td>
            <td class="text-right" style="color:#f59e0b;">$${parseFloat(x.discount_amount || 0).toFixed(2)}</td>
            <td class="text-right" title="${x.isCostOnlyItem && !x.isRevenueTransfer && parseFloat(x.shipping || 0) > 0 ? 'Actual Ship Expense Override' : 'Shipping Revenue'}" style="color:${x.isCostOnlyItem && !x.isRevenueTransfer && parseFloat(x.shipping || 0) > 0 ? '#ef4444' : 'var(--text-muted)'};">$${parseFloat(x.shipping || 0).toFixed(2)}</td>
            <td class="text-right" style="color:var(--text-muted);">$${parseFloat(x.taxes || 0).toFixed(2)}</td>
            <td class="text-right" style="font-weight:bold;">$${(parseFloat(x.total || 0) + (x.exchAdj || 0)).toFixed(2)}</td>
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
        let oldVal = row.transaction_type || 'Standard';
        row.transaction_type = newVal;
        const { error } = await supabaseClient.from('sales_ledger').update({transaction_type: newVal}).eq('order_id', orderId).eq('storefront_sku', sku);
        if(error) { alert("Error saving type: " + error.message); return; }
        
        setMasterStatus("Saved!", "mod-success"); 
        renderSalesTable(); 
        if(typeof renderInventoryTable === 'function') renderInventoryTable();
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
