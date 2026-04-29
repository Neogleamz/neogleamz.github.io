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
    } catch(e) {
        // SubtleCrypto unavailable (non-HTTPS context) or encoding failure — degrade gracefully
        sysLog('hashPII error: ' + e.message, true);
        return null;
    }
}

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

        // --- POWERED BY MASTER ENGINE ---
        let cogs = getEngineTrueCogs(rec);
        let stripeFee = getEngineStripeFee(total, source);
        let actualShipCost = 0; // Manual sales start with 0 shipping cost until backfilled by CSV
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
        uList.forEach(u => h += `<button class="btn-blue btn-sm" style="margin-top:8px; text-align:left;" onclick="openAliasModal('${u.replace(/'/g, "\\'")}')">🔗 Map SKU: ${u}</button>`);
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
            uList.forEach(u => h += `<button class="btn-blue btn-sm" style="margin-top:8px; text-align:left;" onclick="openAliasModal('${u.replace(/'/g, "\\'")}')">🔗 Map SKU: ${u}</button>`);
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
                voidedRevenueByOrder[r.order_id] = (voidedRevenueByOrder[r.order_id] || 0) + (parseFloat(r.actual_sale_price || 0) * parseFloat(r.qty_sold || 1));
            }
        });

        // Clear execution deduplicator hash per import batch
        window._refundDeductedDB = {};
        let salesPayload = pendingSalesRows.map(r => {
            let type = r.transaction_type || 'Standard';
            let cogs = getEngineTrueCogs(r.internal_recipe_name);
            let isCostOnlyItem = (type === 'Exchange Replacement' || type === 'Warranty' || type === 'Gift' || type === 'NEEDS ATTENTION' || type === 'IGNORE' || type === 'Cancelled');

            if (type === 'Cancelled') { cogs = 0; }
            if (type === 'Pre-Ship Exchange' || type === 'IGNORE' || type === 'NEEDS ATTENTION') { cogs = 0; }

            let trueLineCaptured = isCostOnlyItem ? 0 : (r.actual_sale_price * r.qty_sold) + parseFloat(r.shipping || 0) + parseFloat(r.taxes || 0) - parseFloat(r.discount_amount || 0);
            let outBal = parseFloat(r['Outstanding Balance']) || 0;
            let stripeCaptureTarget = trueLineCaptured - outBal;

            let fee = (isCostOnlyItem || type === 'Cancelled') ? 0 : getEngineStripeFee(stripeCaptureTarget, r["Source"]);

            let actualShipCost = (type === 'Cancelled' || type === 'Pre-Ship Exchange' || type === 'IGNORE' || type === 'NEEDS ATTENTION') ? 0 : parseFloat(r.actual_shipping_cost || 0);

            // Calculate true net strictly honoring the rules.
            let gross = isCostOnlyItem ? 0 : r.actual_sale_price * r.qty_sold;
            let shipRev = isCostOnlyItem ? 0 : parseFloat(r.shipping || 0);
            let taxRev = isCostOnlyItem ? 0 : parseFloat(r.taxes || 0);
            let disc = isCostOnlyItem ? 0 : parseFloat(r.discount_amount || 0);

            let rawNet = getHistoricalNetProfit(gross, shipRev, taxRev, disc, actualShipCost, r.internal_recipe_name, r.qty_sold, r["Source"]);
            let refAmt = parseFloat(r.refunded_amount) || 0;
            // Erase the cancelled line-item values from the global refund penalty to prevent double-dipping ghost loops
            let voidedRev = voidedRevenueByOrder[r.order_id] || 0;
            let actualDeductibleRefund = Math.max(0, refAmt - voidedRev);

            let net = rawNet;

            if (type === 'IGNORE' || type === 'NEEDS ATTENTION' || type === 'Cancelled') net = 0;
            if (type === 'Pre-Ship Exchange') net += getEngineTrueCogs(r.internal_recipe_name); // Re-add the true COGS (engine deducted it, but we didn't physically ship this)
            if (isCostOnlyItem && type !== 'IGNORE' && type !== 'NEEDS ATTENTION' && type !== 'Cancelled') net = 0 - actualShipCost - cogs; // Complete loss

            // DEDUPLICATE DATABASE REFUNDS
            if (!window._refundDeductedDB) window._refundDeductedDB = {};
            if (actualDeductibleRefund > 0 && type !== 'Cancelled' && type !== 'IGNORE' && !window._refundDeductedDB[r.order_id]) {
                net -= actualDeductibleRefund;
                window._refundDeductedDB[r.order_id] = true;
            }

            let cS = Math.round(cogs * 100) / 100;
            let fS = Math.round(fee * 100) / 100;
            let nS = Math.round(net * 100) / 100;

            return { ...r, cogs_at_sale: cS, transaction_fees: fS, net_profit: nS, transaction_type: type };
        });

        // REVENUE TRANSFER BATCH
        let pg = {};
        // DEFENSIVE SHIP COST RESOLVER (Deprecated Legacy Assumption)

        salesPayload.forEach(x => { if(!pg[x.order_id]) pg[x.order_id] = []; pg[x.order_id].push(x); });
        Object.values(pg).forEach(group => {
            let primes = group.filter(x => x.transaction_type === 'Pre-Ship Exchange' || x.transaction_type === 'Post-Ship Exchange');
            let replacements = group.filter(x => x.transaction_type === 'Exchange Replacement');
            if (primes.length > 0 && replacements.length > 0) {
                let u = primes[0]; let r = replacements[0];

                // DECOUPLED PHYSICAL REALITY ACCOUNTING
                if (u.transaction_type === 'Post-Ship Exchange') {
                    // 1. Shift the purely positive raw revenue component onto the replacement.
                    let uRawRev = (parseFloat(u.actual_sale_price || 0) * parseFloat(u.qty_sold || 0)) + parseFloat(u.shipping || 0) - parseFloat(u.discount_amount || 0);
                    r.net_profit += uRawRev; // Replacement absorbs the pure revenue

                    // 2. Original row loses the revenue (shipped to r), and loses its COGS (restocked), leaving ONLY the pure logistical losses:
                    let activeShipValue = parseFloat(u.actual_shipping_cost || 0);
                    let uStripeValue = parseFloat(u.transaction_fees || 0);

                    let secureNet = 0 - activeShipValue - uStripeValue;
                    u.net_profit = isNaN(secureNet) ? 0 : secureNet;
                } else {
                    // Ghost Transfer for Unshipped
                    r.net_profit += (parseFloat(u.net_profit) || 0);
                    u.net_profit = 0;
                }

                r.net_profit = Math.round((parseFloat(r.net_profit) || 0) * 100) / 100;
                u.net_profit = Math.round((parseFloat(u.net_profit) || 0) * 100) / 100;
            }
        });

        // --------------------------------

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
    let wrap = document.getElementById('salesTableWrap');
    if(!wrap) return;

    // Updated Headers based on System Standard
    let ths = ` <th class="${currentSalesSort.column==='d'?'sorted-'+currentSalesSort.direction:''}" data-sortcol="d" style="cursor:pointer;">Sale Date</th> <th class="${currentSalesSort.column==='o'?'sorted-'+currentSalesSort.direction:''}" data-sortcol="o" style="cursor:pointer;">Order ID</th> <th class="${currentSalesSort.column==='src'?'sorted-'+currentSalesSort.direction:''}" data-sortcol="src" style="cursor:pointer;">Source</th> <th class="${currentSalesSort.column==='sku'?'sorted-'+currentSalesSort.direction:''}" data-sortcol="sku" style="cursor:pointer;">Storefront SKU</th> <th class="${currentSalesSort.column==='int'?'sorted-'+currentSalesSort.direction:''}" data-sortcol="int" style="cursor:pointer;">Recipe</th> <th class="${currentSalesSort.column==='type'?'sorted-'+currentSalesSort.direction:''}" data-sortcol="type" style="cursor:pointer;">Type</th> <th class="${currentSalesSort.column==='q'?'sorted-'+currentSalesSort.direction:''} text-right" data-sortcol="q" style="cursor:pointer;">Qty</th> <th class="${currentSalesSort.column==='p'?'sorted-'+currentSalesSort.direction:''} text-right" data-sortcol="p" style="cursor:pointer;">Actual Price</th> <th class="${currentSalesSort.column==='disc'?'sorted-'+currentSalesSort.direction:''} text-right" data-sortcol="disc" style="cursor:pointer;">Discount</th> <th class="${currentSalesSort.column==='ship'?'sorted-'+currentSalesSort.direction:''} text-right" data-sortcol="ship" style="cursor:pointer;">Ship Col.</th> <th class="${currentSalesSort.column==='tax'?'sorted-'+currentSalesSort.direction:''} text-right" data-sortcol="tax" style="cursor:pointer;">Tax Col.</th> <th class="${currentSalesSort.column==='carr'?'sorted-'+currentSalesSort.direction:''}" data-sortcol="carr" style="cursor:pointer;">Carrier</th> <th class="${currentSalesSort.column==='trk'?'sorted-'+currentSalesSort.direction:''}" data-sortcol="trk" style="cursor:pointer;">Tracking</th> <th class="${currentSalesSort.column==='tot'?'sorted-'+currentSalesSort.direction:''} text-right" data-sortcol="tot" style="cursor:pointer;">Total Captured</th> <th class="${currentSalesSort.column==='c'?'sorted-'+currentSalesSort.direction:''} text-right" data-sortcol="c" style="cursor:pointer;">True COGS</th> <th class="${currentSalesSort.column==='lcost'?'sorted-'+currentSalesSort.direction:''} text-right" data-sortcol="lcost" style="cursor:pointer;">Label Cost</th> <th class="${currentSalesSort.column==='stripe'?'sorted-'+currentSalesSort.direction:''} text-right" data-sortcol="stripe" style="cursor:pointer;">Stripe/eBay</th> <th class="${currentSalesSort.column==='payout'?'sorted-'+currentSalesSort.direction:''} text-right" data-sortcol="payout" style="cursor:pointer;">Actual Payout</th> <th class="${currentSalesSort.column==='net'?'sorted-'+currentSalesSort.direction:''} text-right" data-sortcol="net" style="cursor:pointer;">Actual Net</th>`;
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
        let isCostOnlyItem = (type === 'Exchange Replacement' || type === 'Warranty' || type === 'Gift' || type === 'NEEDS ATTENTION' || type === 'IGNORE' || type === 'Cancelled');

        // --- CUSTOM EXCEPTION OVERRIDES ---
        if (type === 'Pre-Ship Exchange' || type === 'IGNORE' || type === 'NEEDS ATTENTION' || type === 'Cancelled') {
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
                             type === 'NEEDS ATTENTION' ? 0 :
                             (s > 0 ? s : SHIP_COST); // All valid items cleanly map actual ship cost to what the customer paid, OR default to flat-rate if Free Shipping
        let net = getHistoricalNetProfit(p*qty, s, t, d, actualShipCost, x.internal_recipe_name, qty, x['Source']);

        if (type === 'IGNORE' || type === 'NEEDS ATTENTION' || type === 'Cancelled') {
            net = 0;
        } else if (type === 'Pre-Ship Exchange') {
            net += liveCogs; // refund the dynamic COGS that engine deducted
        } else if (isCostOnlyItem) {
            net = 0 - actualShipCost - liveCogs;
        }
        // --------------------------------

        let dbActualPayout = parseFloat(x.actual_payout) || 0;
        let dbActualShipCost = parseFloat(x.actual_shipping_cost) || 0;
        let carr = x.carrier_name || '';
        let trk = x.tracking_number || '';

        return { ...x, transaction_type: type, liveCogs, stripeFee, net: net, exchAdj: 0, isExchanged: false, isCostOnlyItem, actualShipCost, dbActualPayout, dbActualShipCost, carrier_name: carr, tracking_number: trk };
    });

    // --- AUTOMATED EXCHANGE LOGIC & AGGREGATION ---
    let orderGroups = {};
    a.forEach(x => { if(!orderGroups[x.order_id]) orderGroups[x.order_id] = []; orderGroups[x.order_id].push(x); });

    // --- OPERATIONAL FIDELITY TRUE-UP ---
    Object.values(orderGroups).forEach(group => {
        let orderHasExactPayout = false;
        let exactPayout = 0;
        let orderHasExactShip = false;
        let exactShipCost = 0;
        
        group.forEach(r => {
            if (parseFloat(r.dbActualPayout) > 0) { orderHasExactPayout = true; exactPayout += parseFloat(r.dbActualPayout); }
            if (parseFloat(r.dbActualShipCost) > 0) { orderHasExactShip = true; exactShipCost += parseFloat(r.dbActualShipCost); }
        });

        if (orderHasExactShip || orderHasExactPayout) {
            let appliedShip = false;
            let appliedFee = false;
            
            let orderCaptured = group.reduce((sum, r) => sum + (r.isCostOnlyItem ? 0 : (parseFloat(r.actual_sale_price||0)*parseFloat(r.qty_sold||0) + parseFloat(r.shipping||0) + parseFloat(r.taxes||0) - parseFloat(r.discount_amount||0))), 0);
            let trueOrderFee = orderHasExactPayout ? (orderCaptured - exactPayout) : 0;
            
            group.forEach(r => {
                if (orderHasExactShip) {
                    if (!appliedShip && r.transaction_type !== 'Cancelled') {
                        r.actualShipCost = exactShipCost;
                        appliedShip = true;
                    } else {
                        r.actualShipCost = 0;
                    }
                }
                
                if (orderHasExactPayout) {
                    if (!appliedFee && !r.isCostOnlyItem && r.transaction_type !== 'Cancelled') {
                        r.stripeFee = trueOrderFee;
                        appliedFee = true;
                    } else {
                        if (!r.isCostOnlyItem) r.stripeFee = 0;
                    }
                }
                
                // Recalculate net if overriding default engine estimates
                let p = parseFloat(r.actual_sale_price || 0);
                let q = parseFloat(r.qty_sold || 0);
                let s = parseFloat(r.shipping || 0);
                let d = parseFloat(r.discount_amount || 0);
                
                if (r.transaction_type === 'IGNORE' || r.transaction_type === 'NEEDS ATTENTION' || r.transaction_type === 'Cancelled') {
                    r.net = 0;
                } else if (r.transaction_type === 'Pre-Ship Exchange') {
                    r.net = r.liveCogs;
                } else if (r.isCostOnlyItem) {
                    r.net = 0 - r.actualShipCost - r.liveCogs;
                } else {
                    r.net = (p*q) + s - d - r.stripeFee - r.actualShipCost - r.liveCogs;
                }
            });
        }
    });

    // CALCULATE GHOST REVENUE
    let voidedRevenueByOrder = {};
    Object.values(orderGroups).forEach(group => {
        let voidRev = 0;
        group.forEach(r => {
            if (r.transaction_type === 'Cancelled') {
                let qty = parseFloat(r.qty_sold || 1);
                let price = parseFloat(r.actual_sale_price || 0);
                voidRev += (price * qty);
            }
        });
        voidedRevenueByOrder[group[0].order_id] = voidRev;
    });

    // DEDUPLICATE OUTBOUND SHIPPING OVERHEAD FOR MULTI-ITEM ORDERS
    Object.values(orderGroups).forEach(group => {
        let refundDeducted = false;
        group.forEach(r => {
            let refAmt = parseFloat(r.refunded_amount) || 0;
            let voidedRev = voidedRevenueByOrder[r.order_id] || 0;
            let actualDeductibleRefund = Math.max(0, refAmt - voidedRev);

            if (actualDeductibleRefund > 0 && r.transaction_type !== 'Cancelled' && r.transaction_type !== 'IGNORE' && !refundDeducted) {
                r.net -= actualDeductibleRefund;
                r.exchAdj = (r.exchAdj || 0) - actualDeductibleRefund;
                refundDeducted = true;
            }

        });
    });

    // DECOUPLED LOGISTICS TRANSFER: Accurately map true financial footprints natively in UI
    Object.values(orderGroups).forEach(group => {
        let primes = group.filter(x => x.transaction_type === 'Pre-Ship Exchange' || x.transaction_type === 'Post-Ship Exchange');
        let replacements = group.filter(x => x.transaction_type === 'Exchange Replacement');
        if (primes.length > 0 && replacements.length > 0) {
            let u = primes[0]; let r = replacements[0];


            if (u.transaction_type === 'Post-Ship Exchange') {
                // Physical Reality Decoupling
                let uRawRev = (parseFloat(u.actual_sale_price || 0) * (parseFloat(u.qty_sold) || 0)) + parseFloat(u.shipping || 0) - parseFloat(u.discount_amount || 0);

                // 1. Shift Customer Payment Revenue to Replacement
                r.net += (parseFloat(uRawRev) || 0);
                r.actual_sale_price = u.actual_sale_price;
                r.discount_amount = u.discount_amount;
                r.shipping = u.shipping;
                r.taxes = u.taxes;

                // 2. Original Item is left isolated as a pure loss string (burns ship cost + stripe fee)
                u.actual_sale_price = 0;
                u.shipping = 0;
                u.discount_amount = 0;
                u.taxes = 0;
                u.liveCogs = 0; // Restocked

                let secureNetLoss = 0 - (parseFloat(u.actualShipCost) || 0) - (parseFloat(u.stripeFee) || 0);
                u.net = isNaN(secureNetLoss) ? 0 : secureNetLoss;
            } else {
                // Ghost Transfer for Unshipped (Pre-Ship)
                r.net += (parseFloat(u.net) || 0);
                r.stripeFee += (parseFloat(u.stripeFee) || 0);
                r.actual_sale_price = u.actual_sale_price;
                r.discount_amount = u.discount_amount;
                r.shipping = u.shipping;

                u.actual_sale_price = 0;
                u.stripeFee = 0;
                u.net = 0;
                u.discount_amount = 0;
                u.shipping = 0;
                u.taxes = 0;
                u.actualShipCost = 0;
                u.liveCogs = 0;
            }

            u.isExchanged = true;
        }

        // Failsafe Net Cast for All Unprocessed Rows
        group.forEach(it => { if(isNaN(it.net)) it.net = 0; });
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
                <option style="background:var(--bg-panel); color:var(--text-main); font-weight:bold; color:#ef4444;" value="NEEDS ATTENTION" ${x.transaction_type==='NEEDS ATTENTION'?'selected':''}>⚠️ NEEDS ATTENTION</option>
                <option style="background:var(--bg-panel); color:var(--text-main);" value="Standard" ${x.transaction_type==='Standard'?'selected':''}>Standard</option>
                <option style="background:var(--bg-panel); color:var(--text-main);" value="Refund" ${x.transaction_type==='Refund'?'selected':''}>Refund</option>
                <option style="background:var(--bg-panel); color:var(--text-main); color:#8b5cf6;" value="Cancelled" ${x.transaction_type==='Cancelled'?'selected':''}>Cancelled (Void)</option>
                <option style="background:var(--bg-panel); color:var(--text-main);" value="Partial Refund" ${x.transaction_type==='Partial Refund'?'selected':''}>Partial Refund</option>
                <option style="background:var(--bg-panel); color:var(--text-main);" value="Pre-Ship Exchange" ${x.transaction_type==='Pre-Ship Exchange'?'selected':''}>Unshipped (Keep Rev)</option>
                <option style="background:var(--bg-panel); color:var(--text-main);" value="Post-Ship Exchange" ${x.transaction_type==='Post-Ship Exchange'?'selected':''}>Post-Ship Exchange</option>
                <option style="background:var(--bg-panel); color:var(--text-main);" value="Exchange Replacement" ${x.transaction_type==='Exchange Replacement'?'selected':''}>Exchange Replacement</option>
                <option style="background:var(--bg-panel); color:var(--text-main);" value="Warranty" ${x.transaction_type==='Warranty'?'selected':''}>Warranty</option>
                <option style="background:var(--bg-panel); color:var(--text-main);" value="Gift" ${x.transaction_type==='Gift'?'selected':''}>Gift</option>
                <option style="background:var(--bg-panel); color:var(--text-main);" value="IGNORE" ${x.transaction_type==='IGNORE'?'selected':''}>IGNORE</option>
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
            <td class="text-right" style="color:${x.actualShipCost > 15 ? '#ef4444' : '#f59e0b'}; font-weight:bold;">-$${x.actualShipCost.toFixed(2)}</td>
            <td class="text-right" style="color:#888;" title="${x.dbActualPayout > 0 ? 'True Platform Payout Math' : 'Estimated Engine Fee'}">-$${x.stripeFee.toFixed(2)}</td>
            <td class="text-right" style="color:#10b981; font-weight:bold;">${x.dbActualPayout > 0 ? '$'+x.dbActualPayout.toFixed(2) : '--'}</td>
            <td class="text-right" style="color:${netColor}; font-weight:900;">$${x.net.toFixed(2)}</td>
            </tr>`;
        });
    }

        wrap.innerHTML = h + `</tbody></table>`;
        
        wrap.querySelectorAll('th[data-sortcol]').forEach(th => {
            th.addEventListener('click', () => {
                let col = th.getAttribute('data-sortcol');
                if (col) sortSales(col);
            });
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

            // INJECT MASTER CALCULATION ENGINE
            try {
                if (typeof window.getEngineTrueCogs === 'function') {
                    payload.cogs_at_sale = window.getEngineTrueCogs(row.internal_recipe_name, row.qty_sold);
                }
                if (typeof window.getEngineStripeFee === 'function') {
                    payload.transaction_fees = window.getEngineStripeFee(
                        row.total, row.shipping, row.taxes, newVal, row.exchAdj || 0
                    );
                }
                
                let rev = (parseFloat(row.total) + parseFloat(row.exchAdj || 0)) || 0;
                let cost = payload.cogs_at_sale !== undefined ? payload.cogs_at_sale : (row.liveCogs || 0);
                let ship = parseFloat(row.shipping) || 0;
                let fee = payload.transaction_fees !== undefined ? payload.transaction_fees : (row.stripeFee || 0);
                
                // Pure Waterfall
                let net = rev - cost - ship - fee;
                
                if (newVal === 'Cancelled' || newVal === 'Refund') net = -cost;
                else if (newVal === 'Warranty' || newVal === 'Exchange Replacement') net = -(cost + ship);

                payload.net_profit = net;
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

        // --- POWERED BY MASTER ENGINE: Dynamic Recalculation ---
        let mathCols = ['actual_sale_price', 'qty_sold', 'shipping', 'taxes', 'discount_amount', 'internal_recipe_name', 'Source', 'Outstanding Balance'];
        if (mathCols.includes(col)) {
            // Create a simulated future row state
            let sim = { ...row, [col]: dbVal };
            let qty = parseFloat(sim.qty_sold) || 0;
            let pr = parseFloat(sim.actual_sale_price) || 0;
            let ship = parseFloat(sim.shipping) || 0;
            let tax = parseFloat(sim.taxes) || 0;
            let disc = parseFloat(sim.discount_amount) || 0;
            let bal = parseFloat(sim['Outstanding Balance']) || 0;
            let src = sim['Source'] || "web";
            let rec = sim.internal_recipe_name;
            let type = sim.transaction_type || 'Standard';

            sim.subtotal = qty * pr;
            sim.total = sim.subtotal + ship + tax - disc;
            
            let isCostOnlyItem = (type === 'Exchange Replacement' || type === 'Warranty' || type === 'Gift' || type === 'NEEDS ATTENTION' || type === 'IGNORE' || type === 'Cancelled');
            sim.cogs_at_sale = (type === 'Pre-Ship Exchange' || type === 'IGNORE' || type === 'NEEDS ATTENTION' || type === 'Cancelled') ? 0 : window.getEngineTrueCogs(rec);
            
            let trueLineCaptured = isCostOnlyItem ? 0 : sim.total;
            let stripeCaptureTarget = trueLineCaptured - bal;
            
            sim.transaction_fees = (isCostOnlyItem || type === 'Cancelled') ? 0 : window.getEngineStripeFee(stripeCaptureTarget, src);
            
            let actualShipCost = (type === 'Cancelled' || type === 'Pre-Ship Exchange' || type === 'IGNORE' || type === 'NEEDS ATTENTION') ? 0 : parseFloat(sim.actual_shipping_cost || 0);
            
            let gross = isCostOnlyItem ? 0 : pr * qty;
            let shipRev = isCostOnlyItem ? 0 : ship;
            let taxRev = isCostOnlyItem ? 0 : tax;
            let discRev = isCostOnlyItem ? 0 : disc;
            
            let rawNet = window.getHistoricalNetProfit(gross, shipRev, taxRev, discRev, actualShipCost, rec, qty, src);
            sim.net_profit = rawNet;
            
            if (type === 'IGNORE' || type === 'NEEDS ATTENTION' || type === 'Cancelled') sim.net_profit = 0;
            if (type === 'Pre-Ship Exchange') sim.net_profit += window.getEngineTrueCogs(rec);
            if (isCostOnlyItem && type !== 'IGNORE' && type !== 'NEEDS ATTENTION' && type !== 'Cancelled') sim.net_profit = 0 - actualShipCost - sim.cogs_at_sale;

            payload.subtotal = isNaN(sim.subtotal) ? null : sim.subtotal;
            payload.total = isNaN(sim.total) ? null : sim.total;
            payload.cogs_at_sale = isNaN(sim.cogs_at_sale) ? null : sim.cogs_at_sale;
            payload.transaction_fees = isNaN(sim.transaction_fees) ? null : sim.transaction_fees;
            payload.net_profit = isNaN(sim.net_profit) ? null : sim.net_profit;
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

function runMathSimulator() {
    let m = document.getElementById('math-simulator-modal');
    if(m) m.style.display = 'flex';
    let consoleDiv = document.getElementById('math-simulator-console');
    if(!consoleDiv) return;
    
    consoleDiv.innerHTML = `<div style="color:#3b82f6; font-weight:bold; margin-bottom:10px;">[EXECUTING] NEOGLEAMZ ACTUAL NET SIMULATION ENGINE v1.0</div>`;
    
    let htmlLogs = "";
    function log(msg) { htmlLogs += `<div>${msg}</div>`; }
    
    function execSim(testName, rows) {
        log(`<div style="color:#fcd34d; font-weight:bold; margin-top:15px;">--- ${testName} ---</div>`);
        
        let salesPayload = rows.map(r => {
            let type = r.transaction_type || 'Standard';
            let cogs = window.getEngineTrueCogs(r.internal_recipe_name);
            let isCostOnlyItem = (type === 'Exchange Replacement' || type === 'Warranty' || type === 'Gift' || type === 'IGNORE' || type === 'Cancelled');
            
            if (type === 'Pre-Ship Exchange' || type === 'IGNORE' || type === 'Cancelled' || type === 'NEEDS ATTENTION') { cogs = 0; }
            
            let actShipCost = (type === 'Cancelled' || type === 'Pre-Ship Exchange' || type === 'IGNORE' || type === 'NEEDS ATTENTION') ? 0 : (r.actual_ship_cost || 8.00);
            
            let gross = isCostOnlyItem ? 0 : r.actual_sale_price * r.qty_sold;
            let shipRev = isCostOnlyItem ? 0 : parseFloat(r.shipping || 0);
            let taxRev = isCostOnlyItem ? 0 : parseFloat(r.taxes || 0);
            let disc = isCostOnlyItem ? 0 : parseFloat(r.discount_amount || 0);
            
            let rawNet = window.getHistoricalNetProfit(gross, shipRev, taxRev, disc, actShipCost, r.internal_recipe_name, r.qty_sold, 'web');
            
            let net = rawNet;
            if (type === 'IGNORE') net = 0;
            if (type === 'Pre-Ship Exchange') net += window.getEngineTrueCogs(r.internal_recipe_name); // Keep revenue but didn't ship
            if (isCostOnlyItem && type !== 'Cancelled') net = 0 - actShipCost - cogs;
            if (type === 'Cancelled') net = 0;
            
            let trueLineCaptured = isCostOnlyItem ? 0 : gross + shipRev + taxRev - disc;
            let fee = isCostOnlyItem ? 0 : window.getEngineStripeFee(trueLineCaptured, 'web');

            return { ...r, cogs, fee, net };
        });
        
        let primes = salesPayload.filter(x => x.transaction_type === 'Pre-Ship Exchange' || x.transaction_type === 'Post-Ship Exchange');
        let replacements = salesPayload.filter(x => x.transaction_type === 'Exchange Replacement');
        
        if (primes.length > 0 && replacements.length > 0) {
            let u = primes[0]; let rp = replacements[0];
            if (u.transaction_type === 'Post-Ship Exchange') {
                rp.net += rp.cogs; // We restocked the return physically
                log(`<span style="color:#93c5fd;">[REVENUE SHIFT] Post-Ship Exchange detected. Restocking returned physical unit (+$${rp.cogs.toFixed(2)} COGS back to Net).</span>`);
            } else if (u.transaction_type === 'Pre-Ship Exchange') {
                log(`<span style="color:#93c5fd;">[REVENUE SHIFT] Pre-Ship Exchange detected. Original never shipped. Absorbing captured revenue.</span>`);
            }
            rp.net += u.net;
            rp.net = Math.round(rp.net * 100) / 100;
            let tempNet = u.net;
            u.net = 0;
            log(`<span style="color:#10b981;">[MATH TRANSFER] Transferred $${tempNet.toFixed(2)} ghost-revenue to physical replacement line.</span>`);
        }
        
        salesPayload.forEach(row => {
            log(`&nbsp;&nbsp;> Row: <span style="color:#fff;">${row.internal_recipe_name}</span> (<span style="color:#cbd5e1;">${row.transaction_type}</span>)`);
            log(`&nbsp;&nbsp;&nbsp;&nbsp;COGS applied: <span style="color:#ef4444;">-$${row.cogs.toFixed(2)}</span> | Stripe Fee: <span style="color:#ef4444;">-$${row.fee.toFixed(2)}</span>`);
            let nc = row.net < 0 ? '#ef4444' : '#10b981';
            log(`&nbsp;&nbsp;&nbsp;&nbsp;FINAL NET PROFIT: <span style="color:${nc}; font-weight:bold;">$${row.net.toFixed(2)}</span>`);
        });
    }

    execSim("Order 1017: Post-Ship Exchange (Returned item to warehouse)", [
        { qty_sold: 1, actual_sale_price: 139.99, shipping: 10.09, taxes: 0, discount_amount: 17.98, internal_recipe_name: 'White Dual-Stripe', transaction_type: 'Post-Ship Exchange', actual_ship_cost: 8.00 },
        { qty_sold: 1, actual_sale_price: 129.99, shipping: 0, taxes: 0, discount_amount: 0, internal_recipe_name: 'Black', transaction_type: 'Exchange Replacement', actual_ship_cost: 8.00 }
    ]);
    
    execSim("Order 1019: Pre-Ship Exchange (Never Shipped Original)", [
        { qty_sold: 1, actual_sale_price: 129.99, shipping: 7.30, taxes: 0, discount_amount: 12.99, internal_recipe_name: 'White Dual-Stripe', transaction_type: 'Pre-Ship Exchange', actual_ship_cost: 8.00 },
        { qty_sold: 1, actual_sale_price: 129.99, shipping: 0, taxes: 0, discount_amount: 0, internal_recipe_name: 'Black', transaction_type: 'Exchange Replacement', actual_ship_cost: 8.00 }
    ]);
    
    execSim("Order 1050: Exchange Replacement ONLY (Original kept by customer)", [
        { qty_sold: 1, actual_sale_price: 129.99, shipping: 0, taxes: 0, discount_amount: 0, internal_recipe_name: 'Black', transaction_type: 'Exchange Replacement', actual_ship_cost: 8.00 }
    ]);

    execSim("Order 1060: Standard Warranty (Free Zero Revenue)", [
        { qty_sold: 1, actual_sale_price: 129.99, shipping: 0, taxes: 0, discount_amount: 0, internal_recipe_name: 'Black', transaction_type: 'Warranty', actual_ship_cost: 8.00 }
    ]);
    
    consoleDiv.innerHTML += htmlLogs;
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
                gross: 0,
                cogs: 0,
                shipping: 0,
                taxes: 0,
                fees: 0,
                net: 0,
                lines: []
            };
        }
        orderMap[oid].lines.push(r);
        
        let p = parseFloat(r.actual_sale_price || 0);
        let q = parseFloat(r.qty_sold || 0);
        let s = parseFloat(r.shipping || 0);
        let t = parseFloat(r.taxes || 0);
        let d = parseFloat(r.discount_amount || 0);
        
        let isCostOnly = r.isCostOnlyItem;
        orderMap[oid].gross += isCostOnly ? 0 : (p * q) + s + t - d + (r.exchAdj || 0); 
        orderMap[oid].cogs += (r.liveCogs || 0);
        orderMap[oid].shipping += (r.actualShipCost || 0);
        orderMap[oid].taxes += isCostOnly ? 0 : t;
        orderMap[oid].fees += (r.stripeFee || 0);
        orderMap[oid].net += (r.net || 0);
    });

    let grouped = Object.values(orderMap);
    
    if(searchTerm) {
        grouped = grouped.filter(g => g.order_id.toLowerCase().includes(searchTerm) || g.lines.some(l => l.storefront_sku.toLowerCase().includes(searchTerm)));
    }
    
    grouped.sort((a,b) => {
        let map = { o: 'order_id', d: 'date', g: 'gross', c: 'cogs', s: 'shipping', t: 'taxes', f: 'fees', n: 'net' };
        let col = map[window._netSortKey.column];
        let u = a[col]; let v = b[col];
        if(typeof u === 'number' && typeof v === 'number') return window._netSortKey.direction === 'asc' ? u - v : v - u;
        u = (u||"").toString().toLowerCase(); v = (v||"").toString().toLowerCase();
        if(u<v) return window._netSortKey.direction==='asc'?-1:1;
        if(u>v) return window._netSortKey.direction==='asc'?1:-1; return 0;
    });

    let html = "";
    grouped.forEach(g => {
        let netColor = g.net < 0 ? '#ef4444' : '#10b981';
        html += `<tr style='border-bottom: 1px solid var(--border-color); background: var(--bg-main);' class='net-modal-parent' data-oid='${g.order_id}'>
            <td style='text-align:center; color:#888; cursor:pointer;' class='expander-icon'>▶</td>
            <td style='font-weight:bold;'>${g.order_id}</td>
            <td style='color:#888;'>${g.date}</td>
            <td class='text-right' style='color:#10b981;'>$${g.gross.toFixed(2)}</td>
            <td class='text-right' style='color:#ef4444;'>$${g.cogs.toFixed(2)}</td>
            <td class='text-right' style='color:#f59e0b;'>-$${g.shipping.toFixed(2)}</td>
            <td class='text-right' style='color:#888;'>$${g.taxes.toFixed(2)}</td>
            <td class='text-right' style='color:#888;'>-$${g.fees.toFixed(2)}</td>
            <td class='text-right' style='color:${netColor}; font-weight:900;'>$${g.net.toFixed(2)}</td>
        </tr>`;
        
        let childHtml = "";
        g.lines.forEach(l => {
            childHtml += `<div style='display:flex; justify-content:space-between; padding:4px 0; border-bottom:1px dotted var(--border-input); font-size:11px;'>
                <span style='flex:2; color:#0ea5e9;'>${l.storefront_sku} (Qty: ${l.qty_sold})</span>
                <span style='flex:1; text-align:right;'>Gross: $${((parseFloat(l.actual_sale_price||0)*parseFloat(l.qty_sold||0))+parseFloat(l.shipping||0)+parseFloat(l.taxes||0)-parseFloat(l.discount_amount||0)).toFixed(2)}</span>
                <span style='flex:1; text-align:right;'>COGS: -$${(l.liveCogs||0).toFixed(2)}</span>
                <span style='flex:1; text-align:right;'>Ship: -$${(l.actualShipCost||0).toFixed(2)}</span>
                <span style='flex:1; text-align:right;'>Fee: -$${(l.stripeFee||0).toFixed(2)}</span>
                <span style='flex:1; text-align:right; font-weight:bold; color:${l.net < 0 ? '#ef4444' : '#10b981'};'>Net: $${(l.net||0).toFixed(2)}</span>
            </div>`;
        });
        
        html += `<tr class='net-modal-child' id='net-child-${g.order_id}' style='display:none; background:var(--bg-panel);'>
            <td></td>
            <td colspan='8' style='padding:10px;'>${childHtml}</td>
        </tr>`;
    });
    
    if(grouped.length === 0) {
        html = `<tr><td colspan='9' style='text-align:center; padding:20px; color:#888;'>No results found.</td></tr>`;
    }
    
    container.innerHTML = html;
    
    container.querySelectorAll('.net-modal-parent').forEach(tr => {
        tr.addEventListener('click', () => {
            let oid = tr.getAttribute('data-oid');
            let child = document.getElementById(`net-child-${oid}`);
            let icon = tr.querySelector('.expander-icon');
            if(child.style.display === 'none') {
                child.style.display = 'table-row';
                icon.innerHTML = '▼';
            } else {
                child.style.display = 'none';
                icon.innerHTML = '▶';
            }
        });
    });
}
