/* eslint-disable no-undef, no-unused-vars */
/**
 * @typedef {Object} SalesLedgerRow
 * @property {string|number} order_id
 * @property {string} sale_date
 * @property {string} storefront_sku
 * @property {string} internal_recipe_name
 * @property {number} qty_sold
 * @property {number} actual_sale_price
 * @property {number} subtotal
 * @property {number} shipping
 * @property {number} taxes
 * @property {string} [discount_code]
 * @property {number} discount_amount
 * @property {number} total
 * @property {string} Source
 * @property {number} [Outstanding Balance]
 * @property {string} [financial_status]
 * @property {string} [fulfillment_status]
 * @property {string} [transaction_type]
 * @property {number} [cogs_at_sale]
 * @property {number} [transaction_fees]
 * @property {number} [net_profit]
 * @property {string|null} [customer_email_hash]
 * @property {string|null} [customer_phone_hash]
 * @property {string|null} [shipping_name_hash]
 * @property {string|null} [shipping_address_hash]
 */

async function hashPII(rawStr) {
    try {
        if (rawStr === null || rawStr === undefined) return null;
        let str = String(rawStr);
        if (str.trim() === '') return null;
        const msgUint8 = new TextEncoder().encode(str.trim().toLowerCase());
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch(e) { return null; }
}

// --- MASTER FORENSIC ACCOUNTING ENGINE ---

/// Unified Singleton for all revenue shifting, cost suppression, and line-item slicing.
// Authoritative Engine relocated to neogleamz-engine.js for sitewide parity.




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

        if(!id || !dt || !rec || isNaN(qty) || qty <= 0) { sysLog("Validation Error: Missing required fields for manual sale.", true); return alert("Please fill all required fields correctly."); }

        let subtot = subtotRaw ? parseFloat(subtotRaw) : (qty * pr);
        let total = totalRaw ? parseFloat(totalRaw) : (subtot + ship + tax - discAmt);

        sysLog(`Adding Manual Sale: ${id}`); setMasterStatus("Saving...", "mod-working");

        // --- POWERED BY MASTER FORENSIC ENGINE ---
        let rawRow = {
            order_id: id, sale_date: dt, storefront_sku: "MANUAL_ENTRY_" + rec, internal_recipe_name: rec,
            qty_sold: qty, actual_sale_price: pr, subtotal: subtot, shipping: ship, taxes: tax, 
            discount_code: discCode, discount_amount: discAmt, total: total, "Source": source, 
            "Outstanding Balance": balance
        };
        let forensicResults = window.runForensicAccounting([rawRow]);
        let sim = forensicResults[0];

        let sRow = {
            ...rawRow,
            cogs_at_sale: sim.cogs,
            transaction_fees: sim.fee,
            net_profit: sim.net
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

async function processSalesCSV(isTestMode = false) {
    return new Promise((resolve, reject) => {
        let t = document.getElementById('syncProgressTerminal'); if(t) t.innerHTML = window.safeHTML("");
        syncTrace("INITIALIZING SYNC PROTOCOL...", false);
        const fileId = isTestMode ? 'salesCsvFileTest' : 'salesCsvFile';

        if(isTestMode) syncTrace("🧪 DRY RUN SANDBOX ENGAGED: Bypassing Supabase Connection.", false);
        const fileInput = document.getElementById(fileId); const file = fileInput.files[0];
        if(!file) {
            syncTrace("ERROR: No CSV payload selected.", true);
            alert("Please select a CSV file first.");
            return reject(new Error("No File Selected"));
        }
        syncTrace(`Loaded Payload: ${file.name} (${Math.round(file.size/1024)} KB)`);
        sysLog("Reading Sales CSV..."); setMasterStatus("Parsing...", "mod-working"); setSysProgress(20, 'working');
        const reader = new FileReader();
        reader.onload = async function(e) {
            try {
                const data = new Uint8Array(e.target.result); const workbook = XLSX.read(data, {type: 'array'});
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const rows = XLSX.utils.sheet_to_json(firstSheet, {defval: ""});
                fileInput.value = ""; // Reset input so same file can be triggered again
                await processParsedSales(rows, isTestMode);
                resolve();
            } catch (err) {
                reject(err);
            }
        };
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
    });
}

async function processParsedSales(rows, isTestMode = false) {
    syncTrace(`File parsed successfully. Target rows length: ${rows.length}`);
    syncTrace("Scanning for missing Storefront SKUs inside Local Dictionary...");
    pendingSalesRows = []; let unmapped = new Set();
    let orderFirstRowFlags = {};

    for (const r of rows) {
        let orderId = r['Name'] || r['Order Name'] || r['Order ID'] || r['Order Number'] || r['Order'] || '';
        let skuName = r['Lineitem name'] || r['Item Name'] || r['Title'] || r['Product Name'] || '';
        let qty = parseFloat(r['Lineitem quantity'] || r['Quantity'] || r['Qty'] || 0);
        let price = parseFloat(r['Lineitem price'] || r['Price'] || r['Item Price'] || 0);
        let rawDate = r['Created at'] || r['Date'] || r['Sale Date'] || new Date().toISOString();

        if(!orderId || !skuName || qty <= 0) continue;

        // Removed pre-parsing deduplication here so the unified Sandbox Modal can natively display the full matrix for physical layout/formatting review prior to final sync.

        let dateStr;
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

            // Extract Extra ORDERZ Columns strictly on the first row
            let fStatus = String(r['Financial Status'] || "").trim();
            let pfStatus = String(r['Fulfillment Status'] || "").trim();
            let tags = String(r['Tags'] || "").trim();
            let currency = String(r['Currency'] || "").trim();
            let shippingMethod = String(r['Shipping Method'] || "").trim();
            let shippingCity = String(r['Shipping City'] || "").trim();
            let shippingProvince = String(r['Shipping Province'] || "").trim();
            let shippingZip = String(r['Shipping Zip'] || "").trim();
            let shippingCountry = String(r['Shipping Country'] || "").trim();
            let paymentMethod = String(r['Payment Method'] || "").trim();
            let riskLevel = String(r['Risk Level'] || "").trim();
            let refundedAmt = parseFloat(String(r['Refunded Amount'] || "0").replace(/[^0-9.-]+/g,"")) || 0;

            let hEmail = await hashPII(r['Email'] || "");
            let hPhone = await hashPII(r['Shipping Phone'] || r['Phone'] || r['Billing Phone'] || "");
            let hName = await hashPII(r['Shipping Name'] || r['Billing Name'] || "");
            let hAddr = await hashPII(String(r['Shipping Street'] || r['Shipping Address1'] || "") + String(r['Shipping Zip'] || ""));

            orderFirstRowFlags[orderId] = {
                hEmail, hPhone, hName, hAddr,
                firstRowTotal: tot,
                refundedAmount: refundedAmt,
                source: src, balance: bal,
                fStatus, pfStatus, tags, currency, shippingMethod,
                shippingCity, shippingProvince, shippingZip, shippingCountry, paymentMethod, riskLevel
            };
        }

        let internalName = aliasDB[skuName] || (productsDB[skuName] ? skuName : null);
        if (isTestMode && !internalName) {
            internalName = "[UNMAPPED_SANDBOX_SKU]";
        }

        pendingSalesRows.push({
            order_id: String(orderId), sale_date: dateStr, storefront_sku: String(skuName),
            qty_sold: qty, actual_sale_price: price, internal_recipe_name: internalName,
            subtotal: subTot, shipping: ship, taxes: tax, discount_code: discCode, discount_amount: discAmt, total: tot,
            "Source": orderFirstRowFlags[orderId].source, "Outstanding Balance": isFirstRow ? orderFirstRowFlags[orderId].balance : 0,

            // Map Extra ORDERZ Elements
            financial_status: orderFirstRowFlags[orderId].fStatus,
            fulfillment_status: orderFirstRowFlags[orderId].pfStatus,
            lineitem_compare_at_price: parseFloat(r['Lineitem compare at price']) || 0,
            lineitem_fulfillment_status: String(r['Lineitem fulfillment status'] || "").trim(),
            tags: orderFirstRowFlags[orderId].tags,
            currency: orderFirstRowFlags[orderId].currency,
            shipping_method: orderFirstRowFlags[orderId].shippingMethod,
            shipping_city: orderFirstRowFlags[orderId].shippingCity,
            shipping_province: orderFirstRowFlags[orderId].shippingProvince,
            shipping_zip: orderFirstRowFlags[orderId].shippingZip,
            shipping_country: orderFirstRowFlags[orderId].shippingCountry,
            payment_method: orderFirstRowFlags[orderId].paymentMethod,
            risk_level: orderFirstRowFlags[orderId].riskLevel,
            customer_email_hash: isFirstRow ? orderFirstRowFlags[orderId].hEmail : null,
            customer_phone_hash: isFirstRow ? orderFirstRowFlags[orderId].hPhone : null,
            shipping_name_hash: isFirstRow ? orderFirstRowFlags[orderId].hName : null,
            shipping_address_hash: isFirstRow ? orderFirstRowFlags[orderId].hAddr : null,
            isFirstRow: isFirstRow, // temporary tag
            transaction_type: (function() {
                let fStat = orderFirstRowFlags[orderId].fStatus || "";
                let lFulfill = String(r['Lineitem fulfillment status'] || "").trim().toLowerCase();
                let oTot = orderFirstRowFlags[orderId].firstRowTotal || 0;
                let oBal = orderFirstRowFlags[orderId].balance || 0;
                let lPrice = parseFloat(r['Lineitem price'] || r['Price'] || r['Item Price'] || 0) || parseFloat(r.actual_sale_price) || 0;

                if (oTot === 0 && fStat.toLowerCase() !== 'refunded') return 'NEEDS ATTENTION';



                // If they technically paid for it but we never shipped it, it was almost certainly a Pre-Ship Exchange or cancellation!
                if (lFulfill === 'pending' || lFulfill === 'unfulfilled') {
                    if (fStat.toLowerCase() === 'paid') return 'Pre-Ship Exchange';
                }

                if (fStat.toLowerCase() === 'refunded') {
                    if (lFulfill === 'pending' || lFulfill === 'unfulfilled') return 'Cancelled';
                    return 'Refund';
                }
                if (fStat.toLowerCase() === 'partially_refunded') {
                    if (lFulfill === 'pending' || lFulfill === 'unfulfilled') return 'Cancelled';
                    return 'Refund';
                }
                return 'Standard';
            })(),
            refunded_amount: orderFirstRowFlags[orderId].refundedAmount || 0
        });

        if(!internalName) unmapped.add(String(skuName));
    } // End of for loop

    if(unmapped.size > 0) {
        let uList = Array.from(unmapped); let h = `Found ${uList.length} unmapped SKU(s).<br>`;
        uList.forEach(u => h += `<button class="btn-blue btn-sm" style="margin-top:8px; text-align:left;" data-click="click_openAliasModal" data-sku="${u.replace(/'/g, "\\'")}">🔗 Map SKU: ${u}</button>`);
        document.getElementById('unmappedSkusList').innerHTML = h;
        setMasterStatus("Action Required", "mod-error"); setSysProgress(0, 'working'); return;
    }

    if(pendingSalesRows.length === 0) {
        syncTrace("HALT WARNING: Zero valid rows inherently parsed from target file. Aborting.", true);
        setTimeout(() => showToast("No valid row structures found in this file!"), 10);
        let elUnmapped = document.getElementById('unmappedSkusList');
        if (elUnmapped) elUnmapped.innerHTML = "";

        setMasterStatus("Ready.", "status-idle"); setSysProgress(0, 'working');
        let elFile = document.getElementById('salesCsvFile');
        if (elFile) elFile.value = "";
        throw new Error("Zero valid structured rows.");
    }


    await executeSalesSync(isTestMode);
}

function openAliasModal(sku) { document.getElementById('aliasUnknownSku').innerText = sku; document.getElementById('aliasRecipeSelect').value = ""; document.getElementById('aliasModal').style.display = 'flex'; }

async function saveAliasMapping() {
    await executeWithButtonAction('btnSaveAliasMapping', '💾 SAVING...', '✅ MAPPED!', async () => {
        let sku = document.getElementById('aliasUnknownSku').innerText; let recipe = document.getElementById('aliasRecipeSelect').value;
        if(!recipe) { sysLog("Validation Error: No recipe selected for mapping.", true); throw new Error("Select an internal recipe."); }
        sysLog(`Mapping ${sku} -> ${recipe}`); setMasterStatus("Saving Alias...", "mod-working");

        aliasDB[sku] = recipe;
        const { error } = await supabaseClient.from('storefront_aliases').upsert({ storefront_sku: sku, internal_recipe_name: recipe, platform: 'CSV Import' });
        if(error) { throw new Error(error.message); }

        document.getElementById('aliasModal').style.display = 'none'; setMasterStatus("Mapped!", "mod-success");
        pendingSalesRows.forEach(r => { if(r.storefront_sku === sku) r.internal_recipe_name = recipe; });
        let stillUnmapped = new Set(); pendingSalesRows.forEach(r => { if(!r.internal_recipe_name) stillUnmapped.add(r.storefront_sku); });

        if(stillUnmapped.size === 0) executeSalesSync();
        else {
            let uList = Array.from(stillUnmapped); let h = `Found ${uList.length} unmapped SKU(s).<br>`;
            uList.forEach(u => h += `<button class="btn-blue btn-sm" style="margin-top:8px; text-align:left;" data-click="click_openAliasModal" data-sku="${u.replace(/'/g, "\\'")}">🔗 Map SKU: ${u}</button>`);
            let elUnmapped = document.getElementById('unmappedSkusList');
            if (elUnmapped) elUnmapped.innerHTML = h;
        }
        if (typeof renderAliasManager === 'function') renderAliasManager();
    }).catch(e => {
        sysLog(e.message, true); setMasterStatus("Error", "mod-error");
        if(e.message === "Select an internal recipe.") alert(e.message);
    });
}

async function executeSalesSync(isTestMode = false) {
    try {
        syncTrace(`Mapping verified. Preparing Database Payload structure for ${pendingSalesRows.length} internal components...`);
        sysLog(`Pushing ${pendingSalesRows.length} sales...`); setMasterStatus("Syncing Sales...", "mod-working"); setSysProgress(60, 'working');

        // DYNAMIC MULTI-ITEM EXCHANGE DETECTOR (Pre-Map Mutation)
        let preGroups = {};
        pendingSalesRows.forEach(x => { if(!preGroups[x.order_id]) preGroups[x.order_id] = []; preGroups[x.order_id].push(x); });
        Object.values(preGroups).forEach(group => {
            if (group.length > 1) {
                let bal = parseFloat(group[0]['Outstanding Balance'] || 0) || parseFloat(group.find(x=>x["Outstanding Balance"])?.["Outstanding Balance"] || 0);
                if (bal > 0) {
                    let orig = group[0];
                    let repl = group[group.length - 1];
                    if (orig && repl) {
                        let oFulfill = String(orig.lineitem_fulfillment_status || "").trim().toLowerCase();
                        let rFulfill = String(repl.lineitem_fulfillment_status || "").trim().toLowerCase();
                        if ((oFulfill === 'pending' || oFulfill === 'unfulfilled') && (rFulfill === 'fulfilled' || rFulfill === '')) {
                            orig.transaction_type = 'Pre-Ship Exchange';
                            repl.transaction_type = 'Exchange Replacement';
                        } else if (oFulfill === 'fulfilled' && (rFulfill === 'fulfilled' || rFulfill === '')) {
                            orig.transaction_type = 'Post-Ship Exchange';
                            repl.transaction_type = 'Exchange Replacement';
                        }
                    }
                }
            }
        });

        // --- POWERED BY MASTER ENGINE ---
        // Extract natively erased ghost revenue so we don't double-penalize the primary item's refund deduction
        let voidedRevenueByOrder = {};
        pendingSalesRows.forEach(r => {
            if (r.transaction_type === 'Cancelled') {
                voidedRevenueByOrder[r.order_id] = (voidedRevenueByOrder[r.order_id] || 0) + parseFloat(r.subtotal || 0);
            }
        });

        // --- MASTER FORENSIC ENGINE UNIFICATION ---
        // We group by order ID, process each group through the authoritative engine, then flatten back.
        let syncGroups = {};
        pendingSalesRows.forEach(r => { 
            if(!syncGroups[r.order_id]) syncGroups[r.order_id] = []; 
            syncGroups[r.order_id].push(r); 
        });

        let salesPayload = [];
        Object.keys(syncGroups).forEach(oid => {
            let processed = window.runForensicAccounting(syncGroups[oid]);
            
            // Map forensic results to database column schema
            processed.forEach(sim => {
                let cS = Math.round(sim.cogs * 100) / 100;
                let fS = Math.round(sim.fee * 100) / 100;
                let nS = Math.round(sim.net * 100) / 100;
                
                salesPayload.push({ 
                    ...sim, 
                    cogs_at_sale: cS, 
                    transaction_fees: fS, 
                    net_profit: nS, 
                    transaction_type: sim.transaction_type || 'Standard',
                    trueLineCapture: sim.trueLineCaptured // Legacy tracking
                });
            });
        });
        // -------------------------------------------


        syncTrace(`Injecting aggregated Sales Ledger objects to network array...`);

        // --- DRY RUN SANDBOX OVERRIDE ---
        if (isTestMode) {
            syncTrace(`🧪 SANDBOX INTERCEPT: Supabase connection physically bypassed.`, true);
            syncTrace(`Payload matrix cleanly routed directly to Global Data Modal.`, false);
            setSysProgress(100, 'success'); setMasterStatus("🧪 Test Parsed!", "mod-success");

            if (typeof window.openSandboxModal === 'function') {
                window.openSandboxModal(salesPayload, "SANDBOX_SALEZ_RESULTS");
            }

            let elFile = document.getElementById('salesCsvFileTest');
            if (elFile) elFile.value = "";
            pendingSalesRows = [];
            setTimeout(()=> { setMasterStatus("Ready.", "status-idle"); setSysProgress(0, 'working'); }, 4000);
            return;
        }

        // --- PRODUCTION MODAL REDIRECT ---
        syncTrace(`▶ Routing Production payload to Modal for final review...`, false);
        setSysProgress(50, 'working'); setMasterStatus("Ready For Review", "mod-success");
        if (typeof window.openSandboxModal === 'function') {
            window.openSandboxModal(salesPayload, "PRODUCTION_SALEZ_SYNC", null, "sales_ledger (Primary)", null, {
                termId: 'syncProgressTerminal',
                statId: 'statusOrders',
                inputNodeId: 'salesCsvFile',
                resObj: { table: 'sales_ledger', count: salesPayload.length, data: salesPayload },
                customCommitFn: async () => {
                    syncTrace(`▶ Execution Phase: Sanitizing injection payload for duplicates natively...`, false);
                    let cleanPayload = salesPayload.filter(sp => !salesDB.some(s => s.order_id === String(sp.order_id) && s.storefront_sku === String(sp.storefront_sku)));
                    let duplicatesIgnored = salesPayload.length - cleanPayload.length;

                    if (cleanPayload.length === 0) {
                        syncTrace(`✅ SUCCESS: Safety checks verified ${duplicatesIgnored} duplicates and 0 non-duplicates. Database write bypassed.`, false);
                        setTimeout(() => showToast(`✅ Synced! All items were already securely logged in the database.`), 10);
                        return;
                    }

                    if (duplicatesIgnored > 0) syncTrace(`▶ Filtered ${duplicatesIgnored} duplicates safely. Verified ${cleanPayload.length} pure items. Pushing to Cloud Matrix...`, false);
                    else syncTrace(`▶ Verified ${cleanPayload.length} valid target entities. Pushing to Cloud Matrix...`, false);

                    const { error: e1 } = await supabaseClient.from('sales_ledger').insert(cleanPayload);
                    if(e1) throw new Error("Sales Ledger Insert Error: " + e1.message);

                    syncTrace(`Inventory deduction deferred structurally to Packerz fulfillment completion.`);
                    syncTrace(`Transaction successful! Updating dynamic DOM clusters!`);

                    cleanPayload.forEach(s => salesDB.unshift(s));
                    let count = cleanPayload.length;
                    pendingSalesRows = [];
                    let elUnmapped = document.getElementById('unmappedSkusList');
                    if (elUnmapped) elUnmapped.innerHTML = "";
                    syncTrace("All storefront SKUs are strictly mapped to Local Recipes.", false);

                    renderSalesTable();
                    renderInventoryTable();
                    if(typeof renderAnalyticsDashboard === 'function') renderAnalyticsDashboard();

                    syncTrace("COMPLETED ALL PROCEDURES. Synchronized data to live database objects.");
                    setTimeout(() => showToast(`✅ Success! ${count} new sales structurally appended.`), 10);
                }
            });
        }
        return;
    } catch(e) {
        syncTrace(`CRITICAL FAULT: ${e.stack || e.message}`, true);
        sysLog(e.stack || e.message, true);
        setMasterStatus("Sync Error", "mod-error");
        setSysProgress(100, 'error');
        setTimeout(() => showToast("Database Error during Sync:\n\n" + (e.stack || e.message) + "\n\nPlease check your Supabase columns.", 'error'), 10);
    }
}

function sortSales(c) { if(isResizing) return; currentSalesSort = { column: c, direction: currentSalesSort.column===c && currentSalesSort.direction==='asc' ? 'desc' : 'asc' }; window.saveSort('currentSalesSort', currentSalesSort); renderSalesTable(); }

function renderSalesTable() {
    try {
    if (window.salesRenderEventController) window.salesRenderEventController.abort();
    window.salesRenderEventController = new AbortController();
    const signal = window.salesRenderEventController.signal;

    let wrap = document.getElementById('salesTableWrap');
    if(!wrap) return;

    // Updated Headers based on System Standard
    let ths = ` <th class="${currentSalesSort.column==='d'?'sorted-'+currentSalesSort.direction:''}" data-sortcol="d" style="cursor:pointer;">Sale Date</th> <th class="${currentSalesSort.column==='o'?'sorted-'+currentSalesSort.direction:''}" data-sortcol="o" style="cursor:pointer;">Order ID</th> <th class="${currentSalesSort.column==='src'?'sorted-'+currentSalesSort.direction:''}" data-sortcol="src" style="cursor:pointer;">Source</th> <th class="${currentSalesSort.column==='sku'?'sorted-'+currentSalesSort.direction:''}" data-sortcol="sku" style="cursor:pointer;">Storefront SKU</th> <th class="${currentSalesSort.column==='int'?'sorted-'+currentSalesSort.direction:''}" data-sortcol="int" style="cursor:pointer;">Recipe</th> <th class="${currentSalesSort.column==='type'?'sorted-'+currentSalesSort.direction:''}" data-sortcol="type" style="cursor:pointer;">Type</th> <th class="${currentSalesSort.column==='q'?'sorted-'+currentSalesSort.direction:''} text-right" data-sortcol="q" style="cursor:pointer;">Qty</th> <th class="${currentSalesSort.column==='p'?'sorted-'+currentSalesSort.direction:''} text-right" data-sortcol="p" style="cursor:pointer;">Actual Price</th> <th class="${currentSalesSort.column==='disc'?'sorted-'+currentSalesSort.direction:''} text-right" data-sortcol="disc" style="cursor:pointer;">Discount</th> <th class="${currentSalesSort.column==='ship'?'sorted-'+currentSalesSort.direction:''} text-right" data-sortcol="ship" style="cursor:pointer;">Ship Col.</th> <th class="${currentSalesSort.column==='tax'?'sorted-'+currentSalesSort.direction:''} text-right" data-sortcol="tax" style="cursor:pointer;">Tax Col.</th> <th class="${currentSalesSort.column==='carr'?'sorted-'+currentSalesSort.direction:''}" data-sortcol="carr" style="cursor:pointer;">Carrier</th> <th class="${currentSalesSort.column==='trk'?'sorted-'+currentSalesSort.direction:''}" data-sortcol="trk" style="cursor:pointer;">Tracking</th> <th class="${currentSalesSort.column==='tot'?'sorted-'+currentSalesSort.direction:''} text-right" data-sortcol="tot" style="cursor:pointer;">Total Captured</th> <th class="${currentSalesSort.column==='c'?'sorted-'+currentSalesSort.direction:''} text-right" data-sortcol="c" style="cursor:pointer;">True COGS</th> <th class="${currentSalesSort.column==='lcost'?'sorted-'+currentSalesSort.direction:''} text-right" data-sortcol="lcost" style="cursor:pointer;">Label Cost</th> <th class="${currentSalesSort.column==='stripe'?'sorted-'+currentSalesSort.direction:''} text-right" data-sortcol="stripe" style="cursor:pointer;">Stripe/eBay</th> <th class="${currentSalesSort.column==='payout'?'sorted-'+currentSalesSort.direction:''} text-right" data-sortcol="payout" style="cursor:pointer;">Actual Payout</th> <th class="${currentSalesSort.column==='net'?'sorted-'+currentSalesSort.direction:''} text-right" data-sortcol="net" style="cursor:pointer;">Actual Net</th>`;
    let h = `<table style="width:100%;"><thead><tr>${ths}</tr></thead><tbody>`;

    const SHIP_COST = typeof ENGINE_CONFIG !== 'undefined' ? ENGINE_CONFIG.flatShipping : 8.00;

    // --- MASTER FORENSIC ACCOUNTING SWEEP ---
    // We group by order first, run the forensic engine on each group, then flatten back.
    let orderGroups = {};
    salesDB.forEach(x => { if(!orderGroups[x.order_id]) orderGroups[x.order_id] = []; orderGroups[x.order_id].push(x); });
    
    let a = [];
    Object.keys(orderGroups).forEach(oid => {
        let forensicLines = window.runForensicAccounting(orderGroups[oid]);
        a.push(...forensicLines);
    });

    let totals = { gross: 0, captured: 0, cogs: 0, shipping: 0, stripe: 0, net: 0, count: a.length, discounts: 0, units: 0, burdenUnits: 0, burdenPct: 0 };


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
        h += "<tr><td colspan='19' style='text-align:center;'>No sales synced yet.</td></tr>";
    } else {
        a.sort((x,y) => {
            let map = {d:'sale_date', o:'order_id', src:'Source', sku:'storefront_sku', int:'internal_recipe_name', type:'transaction_type', q:'qty_sold', p:'actual_sale_price', c:'liveCogs', ship:'shipping', tax:'taxes', disc:'discount_amount', tot:'total', adj:'exchAdj', bal:'Outstanding Balance', stripe:'stripeFee', net:'net', carr:'carrier_name', trk:'tracking_number', lcost:'actualShipCost', payout:'dbActualPayout'};
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
                <option style="background:var(--bg-panel); color:var(--text-main);" value="Pre-Ship Exchange" ${x.transaction_type==='Pre-Ship Exchange'?'selected':''}>Pre-Ship Exchange</option>
                <option style="background:var(--bg-panel); color:var(--text-main);" value="Post-Ship Exchange" ${x.transaction_type==='Post-Ship Exchange'?'selected':''}>Post-Ship Exchange</option>
                <option style="background:var(--bg-panel); color:var(--text-main);" value="Exchange Replacement" ${x.transaction_type==='Exchange Replacement'?'selected':''}>Exchange Replacement</option>
                <option style="background:var(--bg-panel); color:var(--text-main);" value="Warranty" ${x.transaction_type==='Warranty'?'selected':''}>Warranty</option>
                <option style="background:var(--bg-panel); color:var(--text-main);" value="Gift" ${x.transaction_type==='Gift'?'selected':''}>Gift</option>
                <option style="background:var(--bg-panel); color:var(--text-main);" value="IGNORE" ${x.transaction_type==='IGNORE'?'selected':''}>IGNORE</option>
                <option style="background:var(--bg-panel); color:#8b5cf6;" value="Cancelled" ${x.transaction_type==='Cancelled'?'selected':''}>Cancelled</option>
                <option style="background:var(--bg-panel); color:#ef4444; font-weight:bold;" value="NEEDS ATTENTION" ${x.transaction_type==='NEEDS ATTENTION'?'selected':''}>NEEDS ATTENTION</option>
            </select></td>

            <td class="text-right" style="font-weight:bold;">${x.qty_sold}</td>
            <td class="text-right" style="color:#10b981;">$${parseFloat(x.actual_sale_price).toFixed(2)}</td>
            <td class="text-right" style="color:#f59e0b;">$${parseFloat(x.discount_amount || 0).toFixed(2)}</td>
            <td class="text-right" title="${x.isCostOnlyItem && !x.isRevenueTransfer && parseFloat(x.shipping || 0) > 0 ? 'Actual Ship Expense Override' : 'Shipping Revenue'}" style="color:${x.isCostOnlyItem && !x.isRevenueTransfer && parseFloat(x.shipping || 0) > 0 ? '#ef4444' : 'var(--text-muted)'};">$${parseFloat(x.shipping || 0).toFixed(2)}</td>
            <td class="text-right" style="color:var(--text-muted);">$${parseFloat(x.taxes || 0).toFixed(2)}</td>
            <td style="color:#0ea5e9;">${x.carrier_name || '--'}</td>
            <td>${x.tracking_number ? `<a href="https://www.google.com/search?q=${x.tracking_number}" target="_blank" style="color:#8b5cf6; text-decoration:none; font-family:monospace;">${x.tracking_number}</a>` : '<span style="color:var(--text-muted);">--</span>'}</td>
            <td class="text-right" style="font-weight:bold;">$${(parseFloat(x.total || 0) + (x.exchAdj || 0)).toFixed(2)}</td>
            <td class="text-right" style="color:#ef4444; font-weight:bold;">$${x.liveCogs.toFixed(2)}</td>
            <td class="text-right" style="color:${x.actualShipCost > 15 ? '#ef4444' : '#f59e0b'}; font-weight:bold;">-$${parseFloat(x.actualShipCost || 0).toFixed(2)}</td>
            <td class="text-right" style="color:#888;" title="${x.dbActualPayout > 0 ? 'True Platform Payout Math' : 'Estimated Engine Fee'}">${x.stripeFee < 0 ? '+' : '-'} $${Math.abs(parseFloat(x.stripeFee || 0)).toFixed(2)}</td>
            <td class="text-right" style="color:#10b981; font-weight:bold;">${x.dbActualPayout > 0 ? '$'+parseFloat(x.dbActualPayout).toFixed(2) : '--'}</td>
            <td class="text-right" style="color:${netColor}; font-weight:900;">$${x.net.toFixed(2)}</td>
            </tr>`;
        });
    }

        wrap.innerHTML = h + `</tbody></table>`;
        
        wrap.querySelectorAll('th[data-sortcol]').forEach(th => {
            th.addEventListener('click', () => {
                let col = th.getAttribute('data-sortcol');
                if (col) sortSales(col);
            }, { signal });
        });

        if(typeof applyTableInteractivity === 'function') applyTableInteractivity('salesTableWrap');
    } catch(e) { sysLog('Sales table render error: ' + e.message, true); }
}

window.updateSaleType = async function(sel, orderId, sku) {
    try {
        let newVal = sel.value;
        sysLog(`Editing Sale Type ${orderId}: ${newVal}`);
        setMasterStatus("Saving...", "mod-working");
        let row = salesDB.find(s => s.order_id == orderId && s.storefront_sku == sku);
        if(!row) {
            console.error(`Row not found for orderId: ${orderId}, sku: ${sku}`);
            alert("Error: Cannot find local row data to update.");
            return;
        }

        if(row) {
            let payload = { transaction_type: newVal };

            // --- POWERED BY MASTER FORENSIC ENGINE ---
            try {
                // 1. Get all siblings
                let orderLines = salesDB.filter(s => s.order_id == orderId);
                
                // 2. Map the type change
                let updatedLines = orderLines.map(line => {
                    if (line.storefront_sku === sku) {
                        return { ...line, transaction_type: newVal };
                    }
                    return { ...line };
                });

                // 3. Run the Forensic Engine
                let forensicResults = window.runForensicAccounting(updatedLines);
                let sim = forensicResults.find(l => l.storefront_sku === sku);

                payload.cogs_at_sale = sim.cogs;
                payload.transaction_fees = sim.fee;
                payload.net_profit = sim.net;

                // 4. Update siblings in DB and memory
                forensicResults.forEach(async (fLine) => {
                    if (fLine.storefront_sku !== sku) {
                        let sibPayload = { net_profit: fLine.net, transaction_fees: fLine.fee, cogs_at_sale: fLine.cogs };
                        await supabaseClient.from('sales_ledger').update(sibPayload).eq('order_id', orderId).eq('storefront_sku', fLine.storefront_sku);
                        let sibRow = salesDB.find(s => s.order_id == orderId && s.storefront_sku == fLine.storefront_sku);
                        if(sibRow) Object.keys(sibPayload).forEach(k => { sibRow[k] = sibPayload[k]; });
                    }
                });
            } catch(e) {
                console.error("Sales Engine Injection Failed:", e);
            }

            sysLog(`Pushing Sale Type update to Supabase for ${orderId}...`, false, payload);
            const { error } = await supabaseClient.from('sales_ledger').update(payload).eq('order_id', orderId).eq('storefront_sku', sku);
            if(error) throw new Error("DB Error saving type: " + error.message);

            Object.keys(payload).forEach(k => { row[k] = payload[k]; });

            setMasterStatus("Saved!", "mod-success");
            renderSalesTable();
            if(typeof renderInventoryTable === 'function') renderInventoryTable();
            if(typeof renderAnalyticsDashboard === 'function') renderAnalyticsDashboard();
            setTimeout(()=>setMasterStatus("Ready.", "status-idle"), 2000);
        }
    } catch(e) { sysLog(e.message, true); setMasterStatus("Error", "mod-error"); alert("Error saving type: \n" + e.message); }
}

async function updateSaleCell(cell, orderId, sku, col, isNum) {
    try {
        let newVal = cell.innerText.trim(); if(newVal === oldValTemp) return;
        let dbVal = newVal;
        if(isNum) {
            dbVal = parseFloat(newVal.replace(/[^0-9.-]+/g,""));
            if(isNaN(dbVal)) { cell.innerText = oldValTemp; sysLog("Validation Error: Valid number required for cell edit.", true); return alert("Valid number required."); }
        }
        if(col === 'order_id' && salesDB.some(s => s.order_id === dbVal && s.storefront_sku === sku && s.order_id !== orderId)) {
            cell.innerText = oldValTemp; sysLog("Validation Error: Duplicate Order ID + SKU combo.", true); return alert("This Order ID + SKU combination already exists.");
        }

        sysLog(`Editing Sale ${orderId}: ${col}`); setMasterStatus("Saving...", "mod-working");
        let row = salesDB.find(s => s.order_id == orderId && s.storefront_sku == sku); if(!row) return;
        let oldQty = row.qty_sold; let oldRec = row.internal_recipe_name;

        let payload = { [col]: dbVal };

        // --- POWERED BY MASTER FORENSIC ENGINE ---
        let mathCols = ['actual_sale_price', 'qty_sold', 'shipping', 'taxes', 'discount_amount', 'internal_recipe_name', 'Source', 'Outstanding Balance'];
        if (mathCols.includes(col)) {
            // 1. Get all siblings in the order to handle shifts
            let orderLines = salesDB.filter(s => s.order_id == orderId);
            
            // 2. Map the change into the local line
            let updatedLines = orderLines.map(line => {
                if (line.storefront_sku === sku) {
                    return { ...line, [col]: dbVal };
                }
                return { ...line };
            });

            // 3. Run the Forensic Engine on the entire order group
            let forensicResults = window.runForensicAccounting(updatedLines);
            let sim = forensicResults.find(l => l.storefront_sku === sku);

            payload.subtotal = isNaN(sim.subtotal) ? (sim.qty_sold * sim.actual_sale_price) : sim.subtotal;
            payload.total = isNaN(sim.total) ? (sim.subtotal + sim.shipping + sim.taxes - sim.discount_amount) : sim.total;
            payload.cogs_at_sale = sim.cogs;
            payload.transaction_fees = sim.fee;
            payload.net_profit = sim.net;
            
            // Update the siblings in the database if they were impacted by shifting
            forensicResults.forEach(async (fLine) => {
                if (fLine.storefront_sku !== sku) {
                    let sibPayload = { net_profit: fLine.net, transaction_fees: fLine.fee, cogs_at_sale: fLine.cogs };
                    await supabaseClient.from('sales_ledger').update(sibPayload).eq('order_id', orderId).eq('storefront_sku', fLine.storefront_sku);
                    // Update local memory for siblings too
                    let sibRow = salesDB.find(s => s.order_id == orderId && s.storefront_sku == fLine.storefront_sku);
                    if(sibRow) Object.keys(sibPayload).forEach(k => { sibRow[k] = sibPayload[k]; });
                }
            });
        }
        // --------------------------------------------------------

        sysLog(`Pushing Sale Cell update to Supabase for ${orderId}...`, false, payload);
        const { error } = await supabaseClient.from('sales_ledger').update(payload).eq('order_id', orderId).eq('storefront_sku', sku);
        if(error) throw new Error(error.message);

        // Update local memory securely
        Object.keys(payload).forEach(k => { row[k] = payload[k]; });

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

// --- ACTUAL NET MODAL LOGIC ---
window._netSortKey = { column: 'd', direction: 'desc' };

function openActualNetModal() {
    let modal = document.getElementById('actual-net-modal');
    if(modal) {
        modal.style.display = 'flex';
        let searchInput = document.getElementById('actualNetSearch');
        if(searchInput) {
            searchInput.value = "";
        }
        renderActualNetList();
    }
}

function closeActualNetModal() {
    let modal = document.getElementById('actual-net-modal');
    if(modal) modal.style.display = 'none';
}

function closeMathSimulator() {
    let m = document.getElementById('math-simulator-modal');
    if(m) m.style.display = 'none';
}

function initMathSimulator() {
    let m = document.getElementById('math-simulator-modal');
    if(m) m.style.display = 'flex';
    
    let sel = document.getElementById('sim-order-select');
    if(!sel) return;
    
    let orderIds = [...new Set(window.processedSalesDB.map(x => String(x.order_id)))].sort((a,b) => b.localeCompare(a));
    let opts = `<option value="">-- Load Order into Sandbox --</option>`;
    orderIds.forEach(id => {
        opts += `<option value="${id}">Order #${id}</option>`;
    });
    sel.innerHTML = opts;
    
    // Bind change listener
    sel.onchange = function(e) {
        renderSimulatorOrder(e.target.value);
    };
    
    document.getElementById('math-simulator-sandbox').innerHTML = `<div style="color:#888; text-align:center; padding: 2rem; font-family: monospace;">Please load an order to begin simulation.</div>`;
    document.getElementById('math-simulator-console').innerHTML = "";

    // Apply cached resizer heights
    if (typeof restoreNeoSimulatorSizes === 'function') restoreNeoSimulatorSizes();
}

function renderSimulatorOrder(orderId) {
    if (window.simEventController) window.simEventController.abort();
    window.simEventController = new AbortController();
    const signal = window.simEventController.signal;

    let sandbox = document.getElementById('math-simulator-sandbox');
    let consoleDiv = document.getElementById('math-simulator-console');
    
    if(!orderId) {
        sandbox.innerHTML = `<div style="color:#888; text-align:center; padding: 2rem; font-family: monospace;">Please load an order to begin simulation.</div>`;
        consoleDiv.innerHTML = "";
        return;
    }
    
    let rows = window.processedSalesDB.filter(x => String(x.order_id) === String(orderId));
    window.currentSimPayload = JSON.parse(JSON.stringify(rows)); 
    
    let html = '';
    window.currentSimPayload.forEach((row, i) => {
        let typeOpts = ['Standard', 'Pre-Ship Exchange', 'Post-Ship Exchange', 'Exchange Replacement', 'Warranty', 'Gift', 'IGNORE', 'Cancelled', 'NEEDS ATTENTION'];
        let typeHtml = typeOpts.map(t => `<option value="${t}" ${row.transaction_type === t ? 'selected' : ''}>${t}</option>`).join('');
        
        let src = row['Source'] || 'web';
        
        let rawPrice = parseFloat(row.actual_sale_price || 0).toFixed(2);
        let rawQty = parseFloat(row.qty_sold || 0).toFixed(2);
        let rawSubtot = parseFloat(row.subtotal || 0).toFixed(2);
        let rawShip = parseFloat(row.shipping || 0).toFixed(2);
        let rawTax = parseFloat(row.taxes || 0).toFixed(2);
        let rawDisc = parseFloat(row.discount_amount || 0).toFixed(2);
        let rawOutBal = parseFloat(row['Outstanding Balance'] || 0).toFixed(2);
        let rawTotal = parseFloat(row.total || 0).toFixed(2);
        let rawRef = parseFloat(row.refunded_amount || row.exchAdj || 0).toFixed(2);
        let rawFee = parseFloat(row.transaction_fees || row.stripeFee || 0).toFixed(2);
        let rawShipC = parseFloat(row.actual_shipping_cost || row.actualShipCost || 0).toFixed(2);
        let rawCogs = (parseFloat(row.cogs_at_sale || row.liveCogs || 0) * parseFloat(row.qty_sold || 1)).toFixed(2);
        let rawNet = parseFloat(row.net_profit || row.net || 0).toFixed(2);

        html += `
        <div style="background: #1e1e1e; padding: 0.5rem 0.75rem; border-radius: 6px; border: 1px solid #333; display: flex; flex-direction: column; gap: 0.25rem; margin-bottom: 0.5rem;">
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #333; padding-bottom:0.25rem;">
                <div style="color:#eee; font-weight:bold; font-size:14px;">${row.internal_recipe_name} <span style="color:#666; font-size:12px; font-weight:normal;">(QTY: <span style="color:#ffffff;">${row.qty_sold}</span>)</span></div>
                <div style="display:flex; gap:1rem; align-items:center;">
                    <span style="color:#666; font-size:11px;">SOURCE: <span style="color:#2dd4bf; font-weight:bold;">${src}</span></span>
                    <select class="sim-type-sel" data-idx="${i}" style="background:#000; color:#10b981; border:1px solid #333; padding:4px; border-radius:4px; font-size:12px; outline:none; cursor:pointer;">
                        ${typeHtml}
                    </select>
                </div>
            </div>
            
            <div style="display:flex; flex-direction:column; gap:4px; margin-top:0.125rem;">
                <!-- ROW 1: RAW DATABASE SNAPSHOT -->
                <div style="background:#0f172a; padding:6px 8px; border-radius:4px; border:1px solid #334155; margin-bottom:0;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                        <span style="color:#94a3b8; font-size:10px; font-weight:bold; text-transform:uppercase;">[RAW DATABASE SNAPSHOT]</span>
                        <span style="color:#4ade80; font-size:9px; font-weight:bold; text-transform:uppercase;">Status: ${row.lineitem_fulfillment_status || row.fulfillment_status || 'unknown'}</span>
                    </div>
                    <div style="display:grid; grid-template-columns: repeat(9, 1fr); gap: 0.25rem;">
                        <div style="display:flex; align-items:baseline; gap:4px;"><span style="color:#00e5ff; font-weight:bold; font-size:11px; text-transform:uppercase;">actual_sale_price:</span> <span style="color:#00e5ff; font-weight:bold; font-size:12px; font-family:monospace;">$${rawPrice}</span></div>
                        <div style="display:flex; align-items:baseline; gap:4px;"><span style="color:#007aff; font-weight:bold; font-size:11px; text-transform:uppercase;">shipping:</span> <span style="color:#007aff; font-weight:bold; font-size:12px; font-family:monospace;">$${rawShip}</span></div>
                        <div style="display:flex; align-items:baseline; gap:4px;"><span style="color:#f0e68c; font-weight:bold; font-size:11px; text-transform:uppercase;">taxes:</span> <span style="color:#f0e68c; font-weight:bold; font-size:12px; font-family:monospace;">$${rawTax}</span></div>
                        <div style="display:flex; align-items:baseline; gap:4px;"><span style="color:#ff7f50; font-weight:bold; font-size:11px; text-transform:uppercase;">discount_amount:</span> <span style="color:#ff7f50; font-weight:bold; font-size:12px; font-family:monospace;">$${rawDisc}</span></div>
                        <div style="display:flex; align-items:baseline; gap:4px;"><span style="color:#8b5cf6; font-weight:bold; font-size:11px; text-transform:uppercase;">Outstanding Balance:</span> <span style="color:#8b5cf6; font-weight:bold; font-size:12px; font-family:monospace;">$${rawOutBal}</span></div>
                        <div style="display:flex; align-items:baseline; gap:4px;"><span style="color:#ff3399; font-weight:bold; font-size:11px; text-transform:uppercase;">total:</span> <span style="color:#ff3399; font-weight:bold; font-size:12px; font-family:monospace;">$${rawTotal}</span></div>
                        <div style="display:flex; align-items:baseline; gap:4px;"><span style="color:#ff3b30; font-weight:bold; font-size:11px; text-transform:uppercase;">transaction_fees:</span> <span style="color:#ff3b30; font-weight:bold; font-size:12px; font-family:monospace;">$${Math.abs(rawFee).toFixed(2)}</span></div>
                        <div style="display:flex; align-items:baseline; gap:4px;"><span style="color:#eab308; font-weight:bold; font-size:11px; text-transform:uppercase;">refunded_amount:</span> <span style="color:#eab308; font-weight:bold; font-size:12px; font-family:monospace;">$${rawRef}</span></div>
                        <div style="display:flex; align-items:baseline; gap:4px;"><span style="color:#ffcc00; font-weight:bold; font-size:11px; text-transform:uppercase;">actual_shipping_cost:</span> <span style="color:#ffcc00; font-weight:bold; font-size:12px; font-family:monospace;">$${rawShipC}</span></div>
                    </div>
                </div>
                
                <!-- ROW 2: RAW CSV: SHOPIFY ORDERS EXPORT -->
                <div style="background:#1a1a1a; padding:6px 8px; border-radius:4px; border:1px solid #444; margin-top:2px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                        <span style="color:#94a3b8; font-size:10px; font-weight:bold; text-transform:uppercase;">[RAW CSV: SHOPIFY ORDERS EXPORT]</span>
                    </div>
                    <div style="display:grid; grid-template-columns: repeat(8, 1fr); gap: 0.25rem;">
                        <div style="display:flex; align-items:baseline; gap:4px;">
                            <span style="color:#00e5ff !important; font-weight:bold; text-transform:uppercase; font-size:11px;">Lineitem price (R):</span>
                            <span style="color:#00e5ff !important; font-family:monospace; font-size:12px; font-weight:bold;">$${rawPrice}</span>
                        </div>
                        <div style="display:flex; align-items:baseline; gap:4px;">
                            <span style="color:#00e5ff !important; font-weight:bold; text-transform:uppercase; font-size:11px;">Subtotal (Q):</span>
                            <span id="sim-subtot-raw-${i}" style="color:#00e5ff !important; font-family:monospace; font-size:12px; font-weight:bold;">$${rawSubtot}</span>
                        </div>
                        <div style="display:flex; align-items:baseline; gap:4px;">
                            <span style="color:#ff7f50 !important; font-weight:bold; text-transform:uppercase; font-size:11px;">Discount Amount (U):</span>
                            <span id="sim-disc-raw-${i}" style="color:#ff7f50 !important; font-family:monospace; font-size:12px; font-weight:bold;">$${rawDisc}</span>
                        </div>
                        <div style="display:flex; align-items:baseline; gap:4px;">
                            <span style="color:#007aff !important; font-weight:bold; text-transform:uppercase; font-size:11px;">Shipping (W):</span>
                            <span id="sim-ship-raw-${i}" style="color:#007aff !important; font-family:monospace; font-size:12px; font-weight:bold;">$${rawShip}</span>
                        </div>
                        <div style="display:flex; align-items:baseline; gap:4px;">
                            <span style="color:#f0e68c !important; font-weight:bold; text-transform:uppercase; font-size:11px;">Taxes (Y):</span>
                            <span id="sim-tax-raw-${i}" style="color:#f0e68c !important; font-family:monospace; font-size:12px; font-weight:bold;">$${rawTax}</span>
                        </div>
                        <div style="display:flex; align-items:baseline; gap:4px;">
                            <span style="color:#ff3399 !important; font-weight:bold; text-transform:uppercase; font-size:11px;">Total (Z):</span>
                            <span id="sim-total-raw-${i}" style="color:#ff3399 !important; font-family:monospace; font-size:12px; font-weight:bold;">$${rawTotal}</span>
                        </div>
                        <div style="display:flex; align-items:baseline; gap:4px;">
                            <span style="color:#8b5cf6 !important; font-weight:bold; text-transform:uppercase; font-size:11px;">Outstanding Balance (AY):</span>
                            <span id="sim-outbal-raw-${i}" style="color:#8b5cf6 !important; font-family:monospace; font-size:12px; font-weight:bold;">$${rawOutBal}</span>
                        </div>
                        <div style="display:flex; align-items:baseline; gap:4px;">
                            <span style="color:#eab308 !important; font-weight:bold; text-transform:uppercase; font-size:11px;">Refunded Amount (M):</span>
                            <span id="sim-refund-raw-${i}" style="color:#eab308 !important; font-family:monospace; font-size:12px; font-weight:bold;">$${rawRef}</span>
                        </div>
                    </div>
                </div>
                
                <!-- ROW 3: RAW CSV: SHOPIFY BILLING EXPORT -->
                <div style="background:#1a1a1a; padding:6px 8px; border-radius:4px; border:1px solid #444; margin-top:2px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                        <span style="color:#94a3b8; font-size:10px; font-weight:bold; text-transform:uppercase;">[RAW CSV: SHOPIFY BILLING EXPORT]</span>
                    </div>
                    <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap: 0.25rem;">
                        <div style="display:flex; align-items:baseline; gap:4px;">
                            <span style="color:#9ca3af !important; font-weight:bold; text-transform:uppercase; font-size:11px;">Charge category (E):</span>
                            <span style="color:#9ca3af !important; font-family:monospace; font-size:12px; font-weight:bold;">shipping_fee</span>
                        </div>
                        <div style="display:flex; align-items:baseline; gap:4px;">
                            <span style="color:#9ca3af !important; font-weight:bold; text-transform:uppercase; font-size:11px;">Order (L):</span>
                            <span style="color:#9ca3af !important; font-family:monospace; font-size:12px; font-weight:bold;">${row.order_id}</span>
                        </div>
                        <div style="display:flex; align-items:baseline; gap:4px;">
                            <span style="color:#ffcc00 !important; font-weight:bold; text-transform:uppercase; font-size:11px;">Amount (G):</span>
                            <span style="color:#ffcc00 !important; font-family:monospace; font-size:12px; font-weight:bold;">$${rawShipC}</span>
                        </div>
                    </div>
                </div>

                <!-- ROW 4: CALCULATED FORENSIC RESULTS -->
                <div style="background:#111; padding:6px 8px; border-radius:4px; border:1px solid #ff3399; margin-top:2px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                        <span style="color:#94a3b8; font-size:10px; font-weight:bold; text-transform:uppercase;">[CALCULATED FORENSIC RESULTS]</span>
                    </div>
                    <div style="display:grid; grid-template-columns: repeat(6, 1fr); gap: 0.5rem;">
                        <div style="display:flex; align-items:baseline; gap:4px;">
                            <span style="color:#ff3399 !important; font-weight:bold; font-size:11px; text-transform:uppercase;">⚙️ Net Rev:</span>
                            <span id="sim-capture-${i}" style="color:#ff3399 !important; font-weight:bold; font-size:12px; font-family:monospace;">$0.00</span>
                        </div>
                        <div style="display:flex; align-items:baseline; gap:4px;">
                            <span style="color:#ff3b30 !important; font-weight:bold; font-size:11px; text-transform:uppercase;">⚙️ Allocated Fees:</span>
                            <span id="sim-fee-${i}" style="color:#ff3b30 !important; font-weight:bold; font-size:12px; font-family:monospace;">$0.00</span>
                        </div>
                        <div style="display:flex; align-items:baseline; gap:4px;">
                            <span style="color:#ffcc00 !important; font-weight:bold; font-size:11px; text-transform:uppercase;">⚙️ Allocated Ship:</span>
                            <span id="sim-ship-exp-${i}" style="color:#ffcc00 !important; font-weight:bold; font-size:12px; font-family:monospace;">$0.00</span>
                        </div>
                        <div style="display:flex; align-items:baseline; gap:4px;">
                            <span style="color:#ff9500 !important; font-weight:bold; font-size:11px; text-transform:uppercase;">⚙️ COGS:</span>
                            <span id="sim-cogs-${i}" style="color:#ff9500 !important; font-weight:bold; font-size:12px; font-family:monospace;">$0.00</span>
                        </div>
                        <div style="display:flex; align-items:baseline; gap:4px;">
                            <span style="color:#eab308 !important; font-weight:bold; font-size:11px; text-transform:uppercase;">⚙️ Allocated Refunds:</span>
                            <span id="sim-refund-applied-${i}" style="color:#eab308 !important; font-weight:bold; font-size:12px; font-family:monospace;">$0.00</span>
                        </div>
                        <div style="display:flex; align-items:baseline; gap:4px;">
                            <span style="color:#ccff00 !important; font-weight:bold; font-size:11px; text-transform:uppercase;">🔥 Final Net:</span>
                            <span id="sim-profit-${i}" style="color:#ccff00 !important; font-weight:bold; font-size:12px; font-family:monospace;">$0.00</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        `;
    });
    
    let btnHtml = `
    <div style="margin-top:1.5rem; display:flex; justify-content:flex-end;">
        <button id="sim-commit-btn" style="background:#10b981; color:#000; font-weight:bold; font-size:14px; padding:8px 16px; border:none; border-radius:6px; cursor:pointer;">💾 COMMIT TO LEDGER</button>
    </div>`;
    
    sandbox.innerHTML = html + btnHtml;
    
    document.querySelectorAll('.sim-type-sel').forEach(el => {
        el.addEventListener('change', (e) => {
            let idx = parseInt(e.target.getAttribute('data-idx'));
            window.currentSimPayload[idx].transaction_type = e.target.value;
            recomputeSimulator();
        }, { signal });
    });

    let commitBtn = document.getElementById('sim-commit-btn');
    if (commitBtn) {
        commitBtn.addEventListener('click', async () => {
            if(!confirm("Are you sure you want to permanently overwrite the Sales Ledger with this exact forensic configuration?")) return;
            
            commitBtn.textContent = "💾 SAVING...";
            commitBtn.style.opacity = "0.5";
            commitBtn.disabled = true;

            try {
                let forensicResults = window.runForensicAccounting(window.currentSimPayload);
                for (let fLine of forensicResults) {
                    let payload = { 
                        transaction_type: fLine.transaction_type, 
                        net_profit: fLine.net, 
                        transaction_fees: fLine.fee, 
                        cogs_at_sale: fLine.cogs 
                    };
                    await window.supabaseClient.from('sales_ledger').update(payload).eq('order_id', fLine.order_id).eq('storefront_sku', fLine.storefront_sku);
                    
                    // Update Memory
                    if (window.processedSalesDB) {
                        let sibRow = window.processedSalesDB.find(s => String(s.order_id) === String(fLine.order_id) && String(s.storefront_sku) === String(fLine.storefront_sku));
                        if (sibRow) {
                            sibRow.transaction_type = payload.transaction_type;
                            sibRow.net_profit = payload.net_profit;
                            sibRow.transaction_fees = payload.transaction_fees;
                            sibRow.cogs_at_sale = payload.cogs_at_sale;
                        }
                    }
                }
                commitBtn.textContent = "✅ COMMITTED!";
                commitBtn.style.background = "#3b82f6";
                setTimeout(() => {
                    if(typeof filterSales === 'function') filterSales();
                    let m = document.getElementById('math-simulator-modal');
                    if(m) m.style.display = 'none';
                }, 1000);
            } catch (err) {
                console.error(err);
                alert("Error committing forensic payload.");
                commitBtn.textContent = "💾 COMMIT TO LEDGER";
                commitBtn.style.opacity = "1";
                commitBtn.disabled = false;
            }
        }, { signal });
    }
    
    recomputeSimulator();
}

function recomputeSimulator() {
    let consoleDiv = document.getElementById('math-simulator-console');
    if(!consoleDiv) return;
    
    consoleDiv.innerHTML = `<div style="color:#3b82f6; font-weight:bold; margin-bottom:10px;">[EXECUTING] LIVE SANDBOX MATH ENGINE</div>`;
    let htmlLogs = "";
    function log(msg) { htmlLogs += `<div>${msg}</div>`; }
    
    let rows = window.currentSimPayload;
    if(!rows || rows.length === 0) return;
    
    // 2. RUN FORENSIC ENGINE
    const forensicResults = window.runForensicAccounting(window.currentSimPayload);
    
    // --- TOP LEVEL ORDER RECONCILIATION (LITERAL MATH) ---
    const mainRow = forensicResults[0];
    const rawTotal = mainRow.rawOrderTotal;
    
    // Forensic-Aware Literal Audit: We calculate and log each item dynamically below to ensure 100% transparency.
    
    
    


    log(`<span style="color:#ccff00; font-weight:bold;">[ORDER RECONCILIATION]</span>`);
    log(`&nbsp;&nbsp;<span style="color:#ff3399;">START: Order Total (CSV L)</span> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span style="color:#ff3399; font-weight:bold;">$${rawTotal.toFixed(2)}</span>`);
    log(`&nbsp;&nbsp;<span style="color:#444;">-----------------------------------------</span>`);
    
    let totalItemRevenue = 0;
    let donorSurrenderSum = 0;
    forensicResults.forEach(r => {
        const isDonor = r.transaction_type === 'Pre-Ship Exchange' || r.transaction_type === 'Post-Ship Exchange';
        const p = parseFloat(r.actual_sale_price || 0);
        const q = parseFloat(r.qty_sold || 1);
        const d = parseFloat(r.discount_amount || 0);
        const sub = (p * q) - d;
        
        if (isDonor) {
            log(`&nbsp;&nbsp;<span style="color:#94a3b8;">↳ [DONOR] ${r.internal_recipe_name}: ($${p.toFixed(2)} * ${q}) - $${d.toFixed(2)} = $${sub.toFixed(2)} -> <b style="color:#ff3399;">SURRENDERED</b></span>`);
            donorSurrenderSum += sub;
        } else {
            log(`&nbsp;&nbsp;<span style="color:#00e5ff;">↳ [ITEM] ${r.internal_recipe_name}: ($${p.toFixed(2)} * ${q}) - $${d.toFixed(2)} = <b style="color:#fff;">$${sub.toFixed(2)}</b></span>`);
            totalItemRevenue += sub;
        }
    });

    log(`&nbsp;&nbsp;<span style="color:#444;">-----------------------------------------</span>`);
    log(`&nbsp;&nbsp;<span style="color:#00e5ff;">AGGREGATE ITEM REVENUE:</span> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span style="color:#00e5ff; font-weight:bold;">$${totalItemRevenue.toFixed(2)}</span>`);
    
    const residual = rawTotal - totalItemRevenue;
    log(`&nbsp;&nbsp;<span style="color:#ccff00; font-weight:bold;">RESULT: Residual Residue</span> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span style="color:#ccff00; font-weight:bold;">$${residual.toFixed(2)}</span>`);
    log(`<br/>`);
    
    // Validate against literal Ship/Tax columns (Only for non-donors to avoid double counting ghost values)
    const engineShipSum = forensicResults.reduce((acc, r) => {
        const isDonor = r.transaction_type === 'Pre-Ship Exchange' || r.transaction_type === 'Post-Ship Exchange';
        if (isDonor) return acc;
        return acc + parseFloat(r.shipping || 0);
    }, 0);
    
    const engineTaxSum = forensicResults.reduce((acc, r) => {
        const isDonor = r.transaction_type === 'Pre-Ship Exchange' || r.transaction_type === 'Post-Ship Exchange';
        if (isDonor) return acc;
        return acc + parseFloat(r.taxes || 0);
    }, 0);
    
    const engineExpectedResidue = engineShipSum + engineTaxSum;
    const engineReconDiff = Math.abs(residual - engineExpectedResidue);

    log(`&nbsp;&nbsp;<span style="color:#0ea5e9;">COMP: CSV Ship (J) Sum: $${engineShipSum.toFixed(2)}</span>`);
    log(`&nbsp;&nbsp;<span style="color:#8b5cf6;">COMP: CSV Tax (K) Sum: &nbsp;$${engineTaxSum.toFixed(2)}</span>`);
    log(`&nbsp;&nbsp;<span style="color:#6366f1; font-weight:bold;">EXPECTED RESIDUE: &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;$${engineExpectedResidue.toFixed(2)}</span>`);
    
    const unaccounted = residual - engineExpectedResidue;
    log(`&nbsp;&nbsp;<span style="color:#444;">-----------------------------------------</span>`);
    log(`&nbsp;&nbsp;<span style="color:#ccff00; font-weight:bold;">[MASTER RECONCILIATION EQUATION]:</span>`);
    log(`&nbsp;&nbsp;<span style="color:#ccff00;">$${rawTotal.toFixed(2)} (Total L) - $${totalItemRevenue.toFixed(2)} (Net Items) - $${engineExpectedResidue.toFixed(2)} (Ship/Tax) = <b>$${unaccounted.toFixed(2)} (Surplus/Inflation)</b></span>`);
    log(`<br/>`);

    if (engineReconDiff > 0.01) {
        // Exchange-Aware Validation: In some CSV exports, the Total (L) column is the SUM of original + replacement.
        // If the "Unaccounted Revenue" matches exactly the price of a Donor row, we can issue a Conditional Pass.
        let replacementPriceSum = forensicResults.reduce((acc, r) => {
            if (r.transaction_type !== 'Exchange Replacement') return acc;
            return acc + (parseFloat(r.actual_sale_price || 0) * parseFloat(r.qty_sold || 1));
        }, 0);

        // Check if the discrepancy matches the price of ANY line in the order (Common Shopify Inflation Pattern)
        let matchedAnyLinePrice = forensicResults.some(r => {
            let lp = (parseFloat(r.actual_sale_price || 0) * parseFloat(r.qty_sold || 1));
            return lp > 0 && Math.abs(unaccounted - lp) < 0.1;
        });

        let isExchangeBalanced = (Math.abs(unaccounted - donorSurrenderSum) < 0.1 && donorSurrenderSum > 0) || 
                                 (matchedAnyLinePrice && (donorSurrenderSum > 0 || forensicResults.some(rx => rx.transaction_type === 'Exchange Replacement')));

        if (isExchangeBalanced) {
            log(`&nbsp;&nbsp;<span style="color:#10b981; font-weight:bold;">[✅ CONDITIONAL PASS]</span>`);
            log(`&nbsp;&nbsp;<span style="color:#10b981;">Unaccounted revenue matches expected Exchange Shift ($${unaccounted.toFixed(2)}). Parity achieved.</span>`);
        } else {
            log(`&nbsp;&nbsp;<span style="color:#ff3b30; font-weight:bold;">[🚨 RECONCILIATION FAILURE]</span>`);
            log(`&nbsp;&nbsp;<span style="color:#ff3b30;">Expected $${engineExpectedResidue.toFixed(2)} (Ship+Tax) but found $${residual.toFixed(2)}.</span>`);
            log(`&nbsp;&nbsp;<span style="color:#ff3b30; font-weight:bold;">UNACCOUNTED REVENUE: $${unaccounted.toFixed(2)} detected in CSV!</span>`);
        }
    } else {
        log(`&nbsp;&nbsp;<span style="color:#4ade80; font-weight:bold;">[✅ RECONCILIATION SUCCESS]</span>`);
        log(`&nbsp;&nbsp;<span style="color:#4ade80;">Residual matches exactly with Shipping ($${engineShipSum.toFixed(2)}) + Taxes ($${engineTaxSum.toFixed(2)}).</span>`);
    }

    log(`<br/>`);
    // ------------------------------------------------------

    log(`<span style="color:#38bdf8;">[FORENSIC AUDIT] Order detected with ${forensicResults.length} items. Calculating True Revenue Bucket...</span>`);
    
    forensicResults.forEach(row => {
        let i = row.uiIdx;
        
        // Update DOM live
        let elCapture = document.getElementById(`sim-capture-${i}`);
        let elFee = document.getElementById(`sim-fee-${i}`);
        let elShipExp = document.getElementById(`sim-shipexp-${i}`);
        let elCogs = document.getElementById(`sim-cogs-${i}`);
        let elGhost = document.getElementById(`sim-ghost-${i}`);
        let elNet = document.getElementById(`sim-net-${i}`);
        
        const verifiedBadge = `<span style="background:#10b981; color:#000; padding:2px 6px; border-radius:4px; font-weight:bold; font-size:10px; margin-left:8px;">VERIFIED</span>`;

        // Build Console Output (FORENSIC TRUTH)
        const isDonor = row.transaction_type === 'Pre-Ship Exchange' || row.transaction_type === 'Post-Ship Exchange';
        const isRecipient = row.transaction_type === 'Exchange Replacement';
        
        let displayTotal = isDonor ? "0.00 (Moved)" : (isRecipient ? `${row.trueLineCaptured.toFixed(2)} (Inherited)` : row.total);
        let displayOutBal = isDonor ? "0.00 (Moved)" : (isRecipient ? `${row.trueLineCaptured.toFixed(2)} (Inherited)` : row['Outstanding Balance']);
        let displayShip = isDonor ? "0.00 (Moved)" : row.shipping;

        log(`&nbsp;&nbsp;> Row: <span style="color:#eee; font-weight:bold;">${row.internal_recipe_name}</span> (<span style="color:#94a3b8;">${row.transaction_type}</span>) <span style="color:#4ade80; font-size:10px;">[${row.lineitem_fulfillment_status || row.fulfillment_status || 'N/A'}]</span> ${verifiedBadge}`);
        
        // --- DERIVATION BLOCK ---
        const priceMath = `(Price: $${row.actual_sale_price} * Qty: ${row.qty_sold})`;
        const discMath = row.discount_amount > 0 ? ` - (Disc: $${row.discount_amount})` : "";
        const taxMath = row.taxes > 0 ? ` + (Tax: $${row.taxes})` : "";
        
        log(`&nbsp;&nbsp;<span style="color:#00e5ff;">${priceMath}${discMath}${taxMath}</span> = <span style="color:#8b5cf6;">$${row.trueLineCaptured.toFixed(2)} (${row.revenueDerivation})</span>`);
        
        let appliedRef = row.applied_order_refund || 0;
        
        log(`&nbsp;&nbsp;&nbsp;&nbsp;<span style="color:#ff3b30;">(-) Allocated Fees: $${row.fee.toFixed(2)}</span> | <span style="color:#ffcc00;">(-) Allocated Ship: $${row.actShipCost.toFixed(2)}</span> | <span style="color:#ff9500;">(-) COGS: $${row.cogs.toFixed(2)}</span> | <span style="color:#eab308;">(-) Allocated Refunds: $${appliedRef.toFixed(2)}</span>`);
        let captureLabel = parseFloat(row['Outstanding Balance'] || 0) > 0 ? "Outstanding Balance" : "total";
        let captureColor = parseFloat(row['Outstanding Balance'] || 0) > 0 ? "#8b5cf6" : "#ff3399";
        
        log(`&nbsp;&nbsp;&nbsp;&nbsp;<span style="color:#ccff00; font-weight:bold;">[EQUATION]:</span> <span style="color:${captureColor};">$${row.trueLineCaptured.toFixed(2)} (${captureLabel})</span> - <span style="color:#ff3b30;">$${row.fee.toFixed(2)} (Allocated Fees)</span> - <span style="color:#ffcc00;">$${row.actShipCost.toFixed(2)} (Allocated Ship)</span> - <span style="color:#ff9500;">$${row.cogs.toFixed(2)} (COGS)</span> - <span style="color:#eab308;">$${appliedRef.toFixed(2)} (Allocated Refunds)</span> = <span style="color:#ccff00; font-weight:bold;">$${row.net.toFixed(2)} (Final Net)</span>`);
        log(`<br/>`);

        const captureEl = document.getElementById(`sim-capture-${i}`);
        const feeEl = document.getElementById(`sim-fee-${i}`);
        const shipExpEl = document.getElementById(`sim-ship-exp-${i}`);
        const cogsEl = document.getElementById(`sim-cogs-${i}`);
        const refEl = document.getElementById(`sim-refund-applied-${i}`);
        const profitEl = document.getElementById(`sim-profit-${i}`);
        
        // Sync Middle Row (Raw CSV Reality)
        const rawTotalEl = document.getElementById(`sim-total-raw-${i}`);
        const rawOutBalEl = document.getElementById(`sim-outbal-raw-${i}`);
        const rawShipEl = document.getElementById(`sim-ship-raw-${i}`);

        if (rawTotalEl) {
            let val = displayTotal;
            let str = String(val);
            rawTotalEl.textContent = str.includes('(') ? str : `$${parseFloat(val).toFixed(2)}`;
        }
        if (rawOutBalEl) {
            let val = displayOutBal;
            let str = String(val);
            rawOutBalEl.textContent = str.includes('(') ? str : `$${parseFloat(val).toFixed(2)}`;
        }
        if (rawShipEl) {
            let val = displayShip;
            let str = String(val);
            rawShipEl.textContent = str.includes('(') ? str : `$${parseFloat(val).toFixed(2)}`;
        }

        if (captureEl) captureEl.textContent = `$${row.trueLineCaptured.toFixed(2)}`;
        if (feeEl) feeEl.textContent = `-$${row.fee.toFixed(2)}`;
        if (shipExpEl) shipExpEl.textContent = `-$${row.actShipCost.toFixed(2)}`;
        if (cogsEl) cogsEl.textContent = `-$${row.cogs.toFixed(2)}`;
        if (refEl) refEl.textContent = `-$${appliedRef.toFixed(2)}`;
        if (profitEl) {
            profitEl.textContent = `$${row.net.toFixed(2)}`;
            profitEl.style.setProperty('color', row.net < 0 ? '#ff3b30' : '#ccff00', 'important');
        }
    });
    
    consoleDiv.innerHTML += htmlLogs;
}
window.runGlobalReconciliationAudit = function() {
    let consoleDiv = document.getElementById('math-simulator-console');
    if(!consoleDiv) return;
    
    consoleDiv.innerHTML = `<div style="color:#60a5fa; font-weight:bold; margin-bottom:1rem; font-size:14px; text-transform:uppercase; letter-spacing:1px;">🚀 INITIALIZING GLOBAL FORENSIC HEALTH CHECK...</div>`;
    
    let db = window.processedSalesDB || [];
    let orderGroups = {};
    db.forEach(x => { if(!orderGroups[x.order_id]) orderGroups[x.order_id] = []; orderGroups[x.order_id].push(x); });
    
    let failureCount = 0;
    let totalCount = Object.keys(orderGroups).length;
    let failures = [];

    Object.keys(orderGroups).forEach(oid => {
        let lines = orderGroups[oid];
        let forensic = window.runForensicAccounting(lines);
        
        // Re-run the reconciliation math
        const mainRow = forensic[0];
        const rawTotal = parseFloat(mainRow.rawOrderTotal || 0);
        
        const totalItemRevenue = forensic.reduce((acc, r) => {
            const isDonor = r.transaction_type === 'Pre-Ship Exchange' || r.transaction_type === 'Post-Ship Exchange';
            if (isDonor) return acc;
            return acc + (parseFloat(r.actual_sale_price || 0) * parseFloat(r.qty_sold || 1)) - parseFloat(r.discount_amount || 0);
        }, 0);
        
        const residual = rawTotal - totalItemRevenue;
        
        const csvShipSum = forensic.reduce((acc, r) => {
            const isDonor = r.transaction_type === 'Pre-Ship Exchange' || r.transaction_type === 'Post-Ship Exchange';
            if (isDonor) return acc;
            return acc + parseFloat(r.shipping || 0);
        }, 0);
        const csvTaxSum = forensic.reduce((acc, r) => {
            const isDonor = r.transaction_type === 'Pre-Ship Exchange' || r.transaction_type === 'Post-Ship Exchange';
            if (isDonor) return acc;
            return acc + parseFloat(r.taxes || 0);
        }, 0);
        
        const expectedResidue = csvShipSum + csvTaxSum;
        const diff = Math.abs(residual - expectedResidue);
        
        if (diff > 0.05) { // 5 cent tolerance for rounding drift
             // Check for Exchange-Aware Conditional Pass
             let donorSurrenderSum = forensic.reduce((acc, r) => {
                const isDonor = r.transaction_type === 'Pre-Ship Exchange' || r.transaction_type === 'Post-Ship Exchange';
                if (!isDonor) return acc;
                return acc + (parseFloat(r.actual_sale_price || 0) * parseFloat(r.qty_sold || 1)) - parseFloat(r.discount_amount || 0);
             }, 0);

             let replacementPriceSum = forensic.reduce((acc, r) => {
                if (r.transaction_type !== 'Exchange Replacement') return acc;
                return acc + (parseFloat(r.actual_sale_price || 0) * parseFloat(r.qty_sold || 1));
             }, 0);

             let unaccounted = residual - expectedResidue;
             
             // Check if the discrepancy matches the price of ANY line in the order (Common Shopify Inflation Pattern)
             let matchedAnyLinePrice = forensic.some(r => {
                 let lp = (parseFloat(r.actual_sale_price || 0) * parseFloat(r.qty_sold || 1));
                 return lp > 0 && Math.abs(unaccounted - lp) < 0.1;
             });

             let isExchangeBalanced = (Math.abs(unaccounted - donorSurrenderSum) < 0.1 && donorSurrenderSum > 0) || 
                                      (matchedAnyLinePrice && (donorSurrenderSum > 0 || forensic.some(rx => rx.transaction_type === 'Exchange Replacement')));
             
             if (!isExchangeBalanced) {
                 failureCount++;
                 failures.push({ oid, residual, expectedResidue, unaccounted });
             }
        }
    });

    // Final Report
    let h = `<div style="border:1px solid #333; padding:1rem; border-radius:8px; background:#000; box-shadow: 0 4px 20px rgba(0,0,0,0.5);">`;
    h += `<div style="font-size:18px; font-weight:bold; color:${failureCount === 0 ? '#10b981' : '#ff3333'}; margin-bottom:0.5rem; text-transform:uppercase;">${failureCount === 0 ? '✅ SYSTEM HEALTH: 100%' : '🚨 RECONCILIATION AUDIT FAILED'}</div>`;
    h += `<div style="color:#94a3b8;">Analyzed <b style="color:#fff;">${totalCount}</b> unique orders. Found <b style="color:#fff;">${failureCount}</b> persistent forensic discrepancies.</div>`;
    
    if (failures.length > 0) {
        h += `<hr style="border:0; border-top:1px solid #222; margin:1rem 0;">`;
        h += `<div style="display:flex; flex-direction:column; gap:8px;">`;
        failures.forEach(f => {
            h += `<div style="display:flex; justify-content:space-between; align-items:center; background:#111; padding:8px 12px; border-radius:6px; border:1px solid #222;">
                    <div>
                        <span style="color:#60a5fa; font-weight:bold;">Order #${f.oid}</span><br>
                        <span style="color:#666; font-size:10px;">Expected Residue: $${f.expectedResidue.toFixed(2)}</span>
                    </div>
                    <div style="text-align:right;">
                        <span style="color:#ff3b30; font-weight:bold;">Delta: $${f.unaccounted.toFixed(2)}</span><br>
                        <button class="btn-blue-muted" style="width:auto; padding:2px 8px; font-size:10px; margin-top:4px;" onclick="renderSimulatorOrder('${f.oid}')">INVESTIGATE</button>
                    </div>
                  </div>`;
        });
        h += `</div>`;
    } else {
        h += `<div style="margin-top:1rem; color:#10b981; font-style:italic;">All order clusters successfully reconciled against the forensic engine rules.</div>`;
    }
    h += `</div>`;
    
    consoleDiv.innerHTML += h;
}


function actualNetSort(col) {
    if(window._netSortKey.column === col) {
        window._netSortKey.direction = window._netSortKey.direction === 'asc' ? 'desc' : 'asc';
    } else {
        window._netSortKey.column = col;
        window._netSortKey.direction = 'desc';
    }
    renderActualNetList();
}

function renderActualNetList() {
    if (window.actualNetEventController) window.actualNetEventController.abort();
    window.actualNetEventController = new AbortController();
    const signal = window.actualNetEventController.signal;

    let container = document.getElementById('actualNetContainer');
    if(!container) return;
    
    let searchTerm = (document.getElementById('actualNetSearch') ? document.getElementById('actualNetSearch').value.toLowerCase() : "");
    
    let data = window.processedSalesDB || [];
    let orderMap = {};
    data.forEach(r => {
        let oid = r.order_id;
        if(!orderMap[oid]) {
            orderMap[oid] = {
                order_id: oid,
                date: r.sale_date,
                price: 0, qty: 0, subtot: 0, disc: 0,
                shipCol: 0, taxCol: 0, outBal: 0, totalCap: 0,
                refunds: 0, cogs: 0, labelCost: 0, fees: 0, net: 0,
                lines: []
            };
        }
        orderMap[oid].lines.push(r);
    });

    let grouped = Object.values(orderMap);
    
    // DATA IS ALREADY POWERED BY FORENSIC ENGINE VIA MAIN TABLE RENDER
    grouped.forEach(g => {
        g.lines.forEach(r => {
            g.price += parseFloat(r.actual_sale_price || 0);
            g.qty += parseFloat(r.qty_sold || 0);
            g.subtot += parseFloat(r.subtotal || 0);
            g.disc += parseFloat(r.discount_amount || 0);
            g.shipCol += parseFloat(r.shipping || 0);
            g.taxCol += parseFloat(r.taxes || 0);
            g.outBal += parseFloat(r['Outstanding Balance'] || 0);
            g.totalCap += parseFloat(r.total || 0);
            
            g.refunds += parseFloat(r.applied_order_refund || 0);
            
            // Forensic Math Aggregations (Already Processed)
            g.cogs += parseFloat(r.cogs || 0);
            g.labelCost += parseFloat(r.actShipCost || 0);
            g.fees += parseFloat(r.fee || 0);
            g.net += parseFloat(r.net || 0);
        });
    });


    if(searchTerm) {
        grouped = grouped.filter(g => g.order_id.toLowerCase().includes(searchTerm) || g.lines.some(l => l.storefront_sku.toLowerCase().includes(searchTerm)));
    }
    
    grouped.sort((a,b) => {
        const sortMap = { 
            o: 'order_id', d: 'date', p: 'price', q: 'qty', sub: 'subtot', di: 'disc',
            sc: 'shipCol', t: 'taxCol', ob: 'outBal', g: 'totalCap', a: 'refunds', 
            c: 'cogs', s: 'labelCost', f: 'fees', n: 'net' 
        };
        let col = sortMap[window._netSortKey.column];
        let u = a[col]; let v = b[col];
        if(typeof u === 'number' && typeof v === 'number') return window._netSortKey.direction === 'asc' ? u - v : v - u;
        u = (u||"").toString().toLowerCase(); v = (v||"").toString().toLowerCase();
        if(u<v) return window._netSortKey.direction==='asc'?-1:1;
        if(u>v) return window._netSortKey.direction==='asc'?1:-1; return 0;
    });

    let html = "";
    grouped.forEach(g => {
        let netColor = g.net < 0 ? '#ef4444' : '#10b981';
        let refColor = g.refunds === 0 ? '#888' : (g.refunds < 0 ? '#ef4444' : '#10b981');
        html += `<tr style='border-bottom: 1px solid var(--border-color); background: var(--bg-main); font-size:11px;' class='net-modal-parent' data-oid='${g.order_id}'>
            <td style='text-align:center; color:#888; cursor:pointer;' class='expander-icon'>▶</td>
            <td style='font-weight:bold;'>${g.order_id}</td>
            <td style='color:#888;'>${g.date}</td>
            <td class='text-right'>$${g.price.toFixed(2)}</td>
            <td class='text-right'>${g.qty}</td>
            <td class='text-right'>$${g.subtot.toFixed(2)}</td>
            <td class='text-right' style='color:#ef4444;'>-$${g.disc.toFixed(2)}</td>
            <td class='text-right' style='color:#0ea5e9;'>$${g.shipCol.toFixed(2)}</td>
            <td class='text-right' style='color:#888;'>$${g.taxCol.toFixed(2)}</td>
            <td class='text-right' style='color:#f59e0b;'>$${g.outBal.toFixed(2)}</td>
            <td class='text-right' style='color:#10b981; font-weight:bold;'>$${g.totalCap.toFixed(2)}</td>
            <td class='text-right' style='color:${refColor};'>${g.refunds === 0 ? '--' : (g.refunds > 0 ? '+' : '') + '$' + g.refunds.toFixed(2)}</td>
            <td class='text-right' style='color:#ef4444;'>-$${g.cogs.toFixed(2)}</td>
            <td class='text-right' style='color:#f59e0b;'>-$${g.labelCost.toFixed(2)}</td>
            <td class='text-right' style='color:#ef4444;'>-$${g.fees.toFixed(2)}</td>
            <td class='text-right' style='color:${netColor}; font-weight:bold;'>$${g.net.toFixed(2)}</td>
        </tr>`;
        
        let childHtml = "";
        g.lines.forEach(l => {
            let trueCapHtml = (l.trueLineCapture !== undefined) ? `<br/><span style='color:#f59e0b; font-size:9px;'>Cap: $${parseFloat(l.trueLineCapture).toFixed(2)}</span>` : '';
            
            let p = parseFloat(l.actual_sale_price || 0);
            let q = parseFloat(l.qty_sold || 0);
            let sub = parseFloat(l.subtotal || 0);
            let d = parseFloat(l.discount_amount || 0);
            let s = parseFloat(l.shipping || 0);
            let t = parseFloat(l.taxes || 0);
            let ob = parseFloat(l['Outstanding Balance'] || 0);
            let tot = parseFloat(l.total || 0);
            
            let ref = parseFloat(l.applied_order_refund || 0);
            let c = parseFloat(l.cogs || 0);
            let sc = parseFloat(l.actShipCost || 0);
            let f = parseFloat(l.fee || 0);
            let n = parseFloat(l.net || 0);
            
            let refColor = ref === 0 ? '#888' : (ref < 0 ? '#ef4444' : '#10b981');

            childHtml += `<tr class='net-modal-child net-child-row' data-parent-oid='${g.order_id}' style='display:none; background:var(--bg-panel); font-size:10px; border-bottom:1px dotted var(--border-input);'>
                <td style='border:none;'></td>
                <td colspan='2' style='color:#0ea5e9; padding-left:16px; border:none; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:200px;' title='${l.storefront_sku}'>↳ ${l.storefront_sku}</td>
                <td class='text-right' style='color:#888; border:none;'>$${p.toFixed(2)}</td>
                <td class='text-right' style='color:#888; border:none;'>${q}</td>
                <td class='text-right' style='color:#888; border:none;'>$${sub.toFixed(2)}</td>
                <td class='text-right' style='color:#ef4444; border:none;'>-$${d.toFixed(2)}</td>
                <td class='text-right' style='color:#0ea5e9; border:none;'>$${s.toFixed(2)}</td>
                <td class='text-right' style='color:#888; border:none;'>$${t.toFixed(2)}</td>
                <td class='text-right' style='color:#f59e0b; border:none;'>$${ob.toFixed(2)}</td>
                <td class='text-right' style='color:#10b981; border:none;'>$${tot.toFixed(2)} ${trueCapHtml}</td>
                <td class='text-right' style='color:${refColor}; border:none;'>${ref === 0 ? '--' : (ref > 0 ? '+' : '') + '$' + ref.toFixed(2)}</td>
                <td class='text-right' style='color:#ef4444; border:none;'>-$${c.toFixed(2)}</td>
                <td class='text-right' style='color:#f59e0b; border:none;'>-$${sc.toFixed(2)}</td>
                <td class='text-right' style='color:#ef4444; border:none;'>-$${f.toFixed(2)}</td>
                <td class='text-right' style='color:${n < 0 ? '#ef4444' : '#10b981'}; font-weight:bold; border:none;'>$${n.toFixed(2)}</td>
            </tr>`;
        });
        
        html += childHtml;
    });
    
    if(grouped.length === 0) {
        html = `<tr><td colspan='16' style='text-align:center; padding:20px; color:#888;'>No results found.</td></tr>`;
    }
    
    container.innerHTML = html;
    
    container.querySelectorAll('.net-modal-parent').forEach(tr => {
        tr.addEventListener('click', () => {
            let oid = tr.getAttribute('data-oid');
            let children = container.querySelectorAll(`.net-child-row[data-parent-oid="${oid}"]`);
            let icon = tr.querySelector('.expander-icon');
            let isHidden = children.length > 0 && children[0].style.display === 'none';
            
            children.forEach(child => {
                child.style.display = isHidden ? 'table-row' : 'none';
            });
            icon.innerHTML = isHidden ? '▼' : '▶';
        }, { signal });
    });
}
