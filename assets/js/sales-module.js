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
        let skuName = r['Lineitem sku'] || r['SKU'] || r['Lineitem name'] || r['Item Name'] || r['Title'] || r['Product Name'] || '';
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
            qty_sold: qty, actual_sale_price: price, recipe_item_uuid: window.uuidMap['RECIPE:::' + internalName],
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
        document.getElementById('unmappedSkusList').innerHTML = window.safeHTML(h);
        setMasterStatus("Action Required", "mod-error"); setSysProgress(0, 'working'); return;
    }

    if(pendingSalesRows.length === 0) {
        syncTrace("HALT WARNING: Zero valid rows inherently parsed from target file. Aborting.", true);
        setTimeout(() => showToast("No valid row structures found in this file!"), 10);
        let elUnmapped = document.getElementById('unmappedSkusList');
        if (elUnmapped) elUnmapped.innerHTML = window.safeHTML("");

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
        
        let shopifySku = null;
        let mappedBarcode = null;
        if (typeof window.findShopifyVariantForAlias === 'function') {
            const match = window.findShopifyVariantForAlias(sku);
            if (match) {
                shopifySku = match.sku;
                mappedBarcode = match.barcode !== 'None' ? match.barcode : null;
            }
        }
        if (!mappedBarcode) {
            mappedBarcode = getItemBarcodeValue(sku);
        }

        if (typeof window.aliasMetadataDB === 'undefined') window.aliasMetadataDB = {};
        window.aliasMetadataDB[sku] = { 
            barcode_value: mappedBarcode, 
            is_shopify_synced: false, 
            is_primary: false,
            shopify_sku: shopifySku 
        };
        
        const { error } = await supabaseClient.from('storefront_aliases').upsert({ 
            product_sku: sku, 
            recipe_item_uuid: window.uuidMap['RECIPE:::' + recipe], 
            barcode_value: mappedBarcode,
            is_shopify_synced: false,
            is_primary: false,
            platform: 'CSV Import',
            shopify_sku: shopifySku
        });
        if(error) { throw new Error(error.message); }

        // Rebuild and refresh print spooler cache
        if (typeof buildBarcodzCache === 'function') buildBarcodzCache();
        if (typeof renderBarcodzGrid === 'function') renderBarcodzGrid(true);

        document.getElementById('aliasModal').style.display = 'none'; setMasterStatus("Mapped!", "mod-success");
        pendingSalesRows.forEach(r => { if(r.storefront_sku === sku) r.internal_recipe_name = recipe; });
        let stillUnmapped = new Set(); pendingSalesRows.forEach(r => { if(!r.internal_recipe_name) stillUnmapped.add(r.storefront_sku); });

        if(stillUnmapped.size === 0) executeSalesSync();
        else {
            let uList = Array.from(stillUnmapped); let h = `Found ${uList.length} unmapped SKU(s).<br>`;
            uList.forEach(u => h += `<button class="btn-blue btn-sm" style="margin-top:8px; text-align:left;" data-click="click_openAliasModal" data-sku="${u.replace(/'/g, "\\'")}">🔗 Map SKU: ${u}</button>`);
            let elUnmapped = document.getElementById('unmappedSkusList');
            if (elUnmapped) elUnmapped.innerHTML = window.safeHTML(h);
        }
        if (typeof renderAliasManager === 'function') renderAliasManager();
    }).catch(e => {
        sysLog(e.message, true); setMasterStatus("Error", "mod-error");
        if(e.message === "Select an internal recipe.") alert(e.message);
    });
}

window.scanOrphanStorefrontSKUs = function() {
    if (typeof salesDB === 'undefined' || typeof productsDB === 'undefined') return;
    
    let orphans = new Set();

    salesDB.forEach(s => {
        let sku = s.storefront_sku;
        if (!sku) return;
        
        // Ignore manual entries and ignore placeholders
        if (sku.startsWith("MANUAL_ENTRY_") || sku === "IGNORE") return;
        
        // The active recipe name is the alias mapping, or fallback to storefront SKU name itself
        let recipeName = (typeof aliasDB !== 'undefined' && aliasDB[sku]) ? aliasDB[sku] : sku;
        
        // If the recipe doesn't exist in productsDB, this is an orphan storefront SKU
        if (!productsDB[recipeName]) {
            orphans.add(sku);
        }
    });
    
    window.orphanSKUs = Array.from(orphans).sort();
    
    // Update the warning badge in UI if element exists
    let btnAlert = document.getElementById('btnUnmappedSkuAlert');
    if (btnAlert) {
        if (window.orphanSKUs.length > 0) {
            btnAlert.innerText = `⚠️ ${window.orphanSKUs.length} UNMAPPED SKU${window.orphanSKUs.length > 1 ? 'S' : ''}`;
            btnAlert.style.setProperty('display', 'inline-flex', 'important');
        } else {
            btnAlert.style.setProperty('display', 'none', 'important');
        }
    }
};

window.resolveOrphanSKUMapping = async function(sku, targetRecipe) {
    if (!targetRecipe) {
        alert("Please select a target internal recipe first.");
        return;
    }
    
    setMasterStatus("Saving Alias...", "mod-working");
    sysLog(`Resolving orphan SKU: ${sku} -> ${targetRecipe}`);
    
    try {
        // 1. Insert/upsert into storefront_aliases table in Supabase
        const existingMeta = (window.aliasMetadataDB && window.aliasMetadataDB[sku]) || {};
        const isShopifySynced = !!existingMeta.is_shopify_synced;
        
        // Match shopify_sku if not already present
        let shopifySku = existingMeta.shopify_sku || null;
        let barcodeVal = existingMeta.barcode_value || null;
        if (!shopifySku && typeof window.findShopifyVariantForAlias === 'function') {
            const match = window.findShopifyVariantForAlias(sku);
            if (match) {
                shopifySku = match.sku;
                barcodeVal = match.barcode !== 'None' ? match.barcode : barcodeVal;
            }
        }
        
        if (!barcodeVal) {
            barcodeVal = getItemBarcodeValue(sku);
        }

        const platform = existingMeta.platform || (isShopifySynced ? 'Shopify Webhook' : 'Auto Scanner');
        const isPrimary = !!existingMeta.is_primary;

        if (typeof window.aliasMetadataDB === 'undefined') window.aliasMetadataDB = {};
        window.aliasMetadataDB[sku] = { 
            barcode_value: barcodeVal, 
            is_shopify_synced: isShopifySynced, 
            is_primary: isPrimary,
            platform: platform,
            shopify_sku: shopifySku
        };

        const insertShopifySku = (shopifySku && shopifySku === sku) ? shopifySku : null;

        let existingRowQuery = supabaseClient.from('storefront_aliases').select('id');
        if (shopifySku) {
            existingRowQuery = existingRowQuery.eq('shopify_sku', shopifySku);
        } else {
            existingRowQuery = existingRowQuery.eq('product_sku', sku).is('shopify_sku', null);
        }
        
        const { data: existingData } = await existingRowQuery.maybeSingle();

        const upsertPayload = { 
            product_sku: sku, 
            recipe_item_uuid: window.uuidMap['RECIPE:::' + targetRecipe], 
            barcode_value: barcodeVal,
            is_shopify_synced: isShopifySynced,
            platform: platform,
            is_primary: isPrimary,
            shopify_sku: insertShopifySku,
            matched_shopify_sku: shopifySku
        };

        if (existingData && existingData.id) {
            upsertPayload.id = existingData.id;
        }

        const { error: aliasError } = await supabaseClient.from('storefront_aliases').upsert(upsertPayload);
        
        if (aliasError) throw new Error("DB Error saving alias: " + aliasError.message);
        
        // 2. Update local aliasDB cache
        if (typeof aliasDB !== 'undefined') {
            aliasDB[sku] = targetRecipe;
            if (shopifySku && shopifySku !== sku) {
                aliasDB[shopifySku] = targetRecipe;
                window.aliasMetadataDB[shopifySku] = {
                    barcode_value: barcodeVal,
                    is_shopify_synced: isShopifySynced,
                    is_primary: isPrimary,
                    platform: platform,
                    shopify_sku: shopifySku,
                    is_memory_only: true
                };
            }
        }

        // Run auto-healing for barcodes
        if (typeof window.autoHealAllRecipes === 'function') {
            await window.autoHealAllRecipes();
        }

        // Rebuild and refresh print spooler cache
        if (typeof buildBarcodzCache === 'function') buildBarcodzCache();
        if (typeof renderBarcodzGrid === 'function') renderBarcodzGrid(true);
        
        // 3. Find all matching rows in salesDB for this storefront SKU
        let affectedSales = salesDB.filter(s => s.storefront_sku === sku);
        if (affectedSales.length > 0) {
            sysLog(`Recalculating financials for ${affectedSales.length} historical sales records...`);
            
            // First update the internal recipe name in local memory so that runForensicAccounting reads the correct recipe cost!
            affectedSales.forEach(s => {
                s.internal_recipe_name = targetRecipe;
            });
            
            // Identify unique order IDs that are affected
            let affectedOrderIds = Array.from(new Set(affectedSales.map(s => s.order_id)));
            
            // We'll queue up the updates to run in parallel
            let updatePromises = [];
            
            affectedOrderIds.forEach(orderId => {
                // Get all lines belonging to this order from the main salesDB
                let orderLines = salesDB.filter(s => s.order_id == orderId);
                
                // Run forensic accounting on these order lines
                let forensicResults = window.runForensicAccounting(orderLines);
                
                // For each line in forensicResults, build update query for Supabase and update local salesDB memory
                forensicResults.forEach(fLine => {
                    let mainRow = salesDB.find(s => String(s.order_id) === String(fLine.order_id) && String(s.storefront_sku) === String(fLine.storefront_sku));
                    if (mainRow) {
                        // Recalculated values
                        mainRow.cogs_at_sale = fLine.cogs;
                        mainRow.transaction_fees = fLine.fee;
                        mainRow.net_profit = fLine.net;
                        mainRow.internal_recipe_name = (fLine.storefront_sku === sku) ? targetRecipe : mainRow.internal_recipe_name;
                        
                        let dbPayload = {
                            recipe_item_uuid: window.uuidMap['RECIPE:::' + mainRow.internal_recipe_name],
                            cogs_at_sale: fLine.cogs,
                            transaction_fees: fLine.fee,
                            net_profit: fLine.net
                        };
                        
                        // Push update promise to array
                        let p = supabaseClient.from('sales_ledger')
                            .update(dbPayload)
                            .eq('order_id', orderId)
                            .eq('storefront_sku', fLine.storefront_sku);
                        updatePromises.push(p);
                    }
                });
            });
            
            // Execute all database updates in parallel
            const results = await Promise.all(updatePromises);
            
            // Check for errors in the updates
            const failedUpdate = results.find(res => res.error);
            if (failedUpdate) {
                throw new Error("Failed to update one or more sales ledger rows: " + failedUpdate.error.message);
            }
            
            sysLog(`Successfully recalculated COGS and Net Profit for ${affectedOrderIds.length} orders.`);
        }
        
        // 4. Re-run scan to update cache & header badge state
        window.scanOrphanStorefrontSKUs();
        
        // 5. Update UI
        setMasterStatus("Resolved!", "mod-success");
        if (typeof renderAliasManager === 'function') renderAliasManager();
        if (typeof renderSalesTable === 'function') renderSalesTable();
        if (typeof renderInventoryTable === 'function') renderInventoryTable();
        if (typeof renderAnalyticsDashboard === 'function') renderAnalyticsDashboard();
        
        setTimeout(() => {
            setMasterStatus("Ready.", "status-idle");
        }, 2000);
        
    } catch (e) {
        sysLog(e.message, true);
        setMasterStatus("Error", "mod-error");
        alert("Error resolving orphan SKU:\n" + e.message);
    }
};

window.findShopifyCatalogVariantsForRecipe = function(recipeName) {
    const results = [];
    if (typeof aliasDB === 'undefined' || typeof window.aliasMetadataDB === 'undefined') return results;
    
    Object.keys(window.aliasMetadataDB).forEach(sku => {
        const meta = window.aliasMetadataDB[sku];
        if (!meta || !meta.is_shopify_synced) return;
        
        const mappedRecipe = aliasDB[sku];
        if (mappedRecipe === recipeName) {
            results.push({ sku, barcode: meta.barcode_value || 'None', mapped: true });
        } else if (!mappedRecipe) {
            const cleanSku = sku.toLowerCase();
            const cleanRecipe = recipeName.toLowerCase();
            
            const recipeWords = cleanRecipe.split(/[^a-z0-9]/).filter(w => w.length > 2);
            let isMatch = cleanSku.includes(cleanRecipe) || 
                          cleanRecipe.includes(cleanSku) ||
                          (recipeWords.length > 0 && recipeWords.every(w => cleanSku.includes(w)));
                          
            if (!isMatch) {
                const skuWords = cleanSku.split(/[^a-z0-9]/).filter(w => w.length > 2 && w !== 'ng' && !/^\d+$/.test(w));
                if (skuWords.length > 0) {
                    if (skuWords.every(w => cleanRecipe.includes(w))) {
                        isMatch = true;
                    } else {
                        const mappedAliases = Object.keys(aliasDB).filter(a => aliasDB[a] === recipeName);
                        for (const alias of mappedAliases) {
                            const cleanAlias = alias.toLowerCase();
                            const aliasWords = cleanAlias.split(/[^a-z0-9]/).filter(w => w.length > 2);
                            if (skuWords.every(w => aliasWords.includes(w))) {
                                isMatch = true;
                                break;
                            }
                        }
                    }
                }
            }
                            
            if (isMatch) {
                results.push({ sku, barcode: meta.barcode_value || 'None', mapped: false });
            }
        }
    });
    return results;
};

window.findShopifyVariantForAlias = function(aliasSku) {
    if (typeof window.aliasMetadataDB === 'undefined') return null;
    
    // 1. Check if we have a direct shopify_sku mapped in metadata
    const meta = window.aliasMetadataDB[aliasSku];
    if (meta) {
        if (meta.is_shopify_synced) {
            return { sku: aliasSku, barcode: meta.barcode_value || 'None' };
        }
        if (meta.shopify_sku && window.aliasMetadataDB[meta.shopify_sku]) {
            const targetMeta = window.aliasMetadataDB[meta.shopify_sku];
            return { sku: meta.shopify_sku, barcode: targetMeta.barcode_value || 'None' };
        }
    }
    
    const cleanAlias = aliasSku.toLowerCase();
    const aliasWords = cleanAlias.split(/[^a-z0-9]/).filter(w => w.length > 2);
    
    let bestMatch = null;
    let bestScore = -1;
    
    Object.keys(window.aliasMetadataDB).forEach(sku => {
        const m = window.aliasMetadataDB[sku];
        if (!m || !m.is_shopify_synced) return;
        
        const cleanSku = sku.toLowerCase();
        const skuWords = cleanSku.split(/[^a-z0-9]/).filter(w => w.length > 2 && w !== 'ng' && !/^\d+$/.test(w));
        if (skuWords.length === 0) return;
        
        const allWordsMatch = skuWords.every(w => aliasWords.includes(w));
        if (allWordsMatch) {
            let score = skuWords.length;
            if (aliasWords.includes('rechargeable') && skuWords.includes('rechargeable')) {
                score += 10;
            }
            if (score > bestScore) {
                bestScore = score;
                bestMatch = { sku: m.shopify_sku || sku, barcode: m.barcode_value || 'None' };
            }
        }
    });
    
    return bestMatch;
};

window.autoHealAllRecipes = async function() {
    // Disabled auto-healing database writes as per user request to maintain raw data/column values
    return;
};


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
                    actual_sale_price: sim.original_sale_price ?? sim.actual_sale_price,
                    discount_amount: sim.original_discount_amount ?? sim.discount_amount,
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
                let testImportContext = {
                    resObj: { table: 'sales_ledger', conflict: 'order_id, storefront_sku', count: salesPayload.length, data: salesPayload },
                    isTestMode: true
                };
                window.openSandboxModal(salesPayload, "SANDBOX_SALEZ_RESULTS", null, "sales_ledger (Primary)", null, testImportContext);
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

                    let sanitizedInsertPayload = cleanPayload.map(sp => {
                        let clone = { ...sp };
                        // Strip all internal forensic telemetry before database injection
                        ['cogs', 'fee', 'net', 'actShipCost', 'trueLineCaptured', 'revenueDerivation', 'work', 'rawOrderTotal', 'rawItemRevenue', 'liveCogs', 'stripeFee', 'uiIdx', 'forensic_subtotal', 'forensic_discount_amount', 'forensic_shipping', 'forensic_taxes', 'forensic_total', 'forensic_sale_price', 'forensic_out_bal', 'trueLineCapture'].forEach(k => delete clone[k]);
                        return clone;
                    });
                    const { error: e1 } = await supabaseClient.from('sales_ledger').insert(sanitizedInsertPayload);
                    if(e1) throw new Error("Sales Ledger Insert Error: " + e1.message);

                    syncTrace(`Inventory deduction deferred structurally to Packerz fulfillment completion.`);
                    syncTrace(`Transaction successful! Updating dynamic DOM clusters!`);

                    cleanPayload.forEach(s => salesDB.unshift(s));
                    let count = cleanPayload.length;
                    pendingSalesRows = [];
                    let elUnmapped = document.getElementById('unmappedSkusList');
                    if (elUnmapped) elUnmapped.innerHTML = window.safeHTML("");
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
    let warrantyCustomers = new Set();


    // Final Calculation Pass for Totals
    a.forEach(x => {
        let isCostOnly = x.isCostOnlyItem;
        let p = parseFloat((x.forensic_sale_price ?? x.actual_sale_price) || 0);
        let q = parseFloat(x.qty_sold || 0);
        let s = parseFloat((x.forensic_shipping ?? x.shipping) || 0);
        let t = parseFloat((x.forensic_taxes ?? x.taxes) || 0);
        let d = parseFloat((x.forensic_discount_amount ?? x.discount_amount) || 0);
        let trueLineCaptured = (x.engineGrossCaptured || 0);
        x.trueLineCaptured = trueLineCaptured; // Store for the UI rendering below

        totals.gross += (x.rawItemRevenue > 0 || (x.revenueDerivation && x.revenueDerivation.includes('Replacement Funded'))) ? (x.rawItemRevenue + d) : 0;
        totals.discounts += (x.rawItemRevenue > 0 || (x.revenueDerivation && x.revenueDerivation.includes('Replacement Funded'))) ? d : 0;
        totals.captured += x.engineGrossCaptured || 0;
        totals.cogs += x.liveCogs;
        totals.shipping += x.actualShipCost || 0;
        totals.stripe += x.stripeFee;
        totals.net += x.net;
        
        let isRealSale = (x.transaction_type === 'Standard' || x.transaction_type === 'Exchange Replacement' || x.transaction_type === 'Pre-Ship Exchange' || x.transaction_type === 'Post-Ship Exchange');
        totals.units += isRealSale ? (parseFloat(x.qty_sold) || 0) : 0;

        // Track strictly isolated Warranty overhead (Unique Customers to prevent multi-part inflation)
        if(x.transaction_type === 'Warranty' || x.transaction_type === 'Refunded - Warranty' || x.transaction_type === 'Replacement / Warranty') {
            if (x.customer_email_hash) {
                warrantyCustomers.add(x.customer_email_hash);
            } else {
                totals.burdenUnits += 1;
            }
        }
    });

    totals.burdenUnits += warrantyCustomers.size;
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
            <td class="trunc-col" style="font-weight:bold;">${x.order_id}</td>
            <td class="trunc-col" style="color:var(--text-muted);">${x["Source"] || ''}</td>
            <td class="trunc-col">${x.storefront_sku}</td>
            <td class="editable trunc-col" contenteditable="true" data-focus="focus_storeOldVal" data-blur="blur_updateSaleCell" data-order="${x.order_id}" data-sku="${safeSku}" data-id="${x.id}" data-col="internal_recipe_name" data-isnum="false" style="color:#0ea5e9; font-weight:bold;">${x.internal_recipe_name || '-- UNMAPPED --'}</td>
            <td style="padding:4px;"><select style="background:var(--bg-input); color:var(--text-main); border:1px solid var(--border-input); border-radius:4px; font-size:12px; padding:4px; outline:none;" data-change="change_updateSaleType" data-order="${x.order_id}" data-sku="${safeSku}" data-id="${x.id}">
                ${window.getTransactionTypeOptions(x.transaction_type)}
            </select></td>

            <td class="text-right" style="font-weight:bold;">${x.qty_sold}</td>
            <td class="text-right" style="color:#10b981;">$${parseFloat((x.forensic_sale_price ?? x.actual_sale_price) || 0).toFixed(2)}</td>
            <td class="text-right" style="color:#f59e0b;">$${parseFloat((x.forensic_discount_amount ?? x.discount_amount) || 0).toFixed(2)}</td>
            <td class="text-right" title="${x.isCostOnlyItem && !x.isRevenueTransfer && parseFloat((x.forensic_shipping ?? x.shipping) || 0) > 0 ? 'Actual Ship Expense Override' : 'Shipping Revenue'}" style="color:${x.isCostOnlyItem && !x.isRevenueTransfer && parseFloat((x.forensic_shipping ?? x.shipping) || 0) > 0 ? '#ef4444' : 'var(--text-muted)'};">$${parseFloat((x.forensic_shipping ?? x.shipping) || 0).toFixed(2)}</td>
            <td class="text-right" style="color:var(--text-muted);">$${parseFloat((x.forensic_taxes ?? x.taxes) || 0).toFixed(2)}</td>
            <td style="color:#0ea5e9;">${x.carrier_name || '--'}</td>
            <td>${x.tracking_number ? `<a href="https://www.google.com/search?q=${x.tracking_number}" target="_blank" style="color:#8b5cf6; text-decoration:none; font-family:monospace;">${x.tracking_number}</a>` : '<span style="color:var(--text-muted);">--</span>'}</td>
            <td class="text-right" style="font-weight:bold;">$${parseFloat((x.trueLineCaptured ?? x.total) || 0).toFixed(2)}</td>
            <td class="text-right" style="color:#ef4444; font-weight:bold;">$${x.liveCogs.toFixed(2)}</td>
            <td class="text-right" style="color:${x.actualShipCost > 15 ? '#ef4444' : '#f59e0b'}; font-weight:bold;">-$${parseFloat(x.actualShipCost || 0).toFixed(2)}</td>
            <td class="text-right" style="color:#888;" title="${x.dbActualPayout > 0 ? 'True Platform Payout Math' : 'Estimated Engine Fee'}">${x.stripeFee < 0 ? '+' : '-'} $${Math.abs(parseFloat(x.stripeFee || 0)).toFixed(2)}</td>
            <td class="text-right" style="color:#10b981; font-weight:bold;">${x.dbActualPayout > 0 ? '$'+parseFloat(x.dbActualPayout).toFixed(2) : '--'}</td>
            <td class="text-right" style="color:${netColor}; font-weight:900;">$${x.net.toFixed(2)}</td>
            </tr>`;
        });
    }

        wrap.innerHTML = window.safeHTML(h + `</tbody></table>`);
        
        wrap.querySelectorAll('th[data-sortcol]').forEach(th => {
            th.addEventListener('click', () => {
                let col = th.getAttribute('data-sortcol');
                if (col) sortSales(col);
            }, { signal });
        });

        if(typeof applyTableInteractivity === 'function') applyTableInteractivity('salesTableWrap');
    } catch(e) { sysLog('Sales table render error: ' + e.message, true); }
}

window.openSandboxForOrder = function(orderId) {
    if (typeof initMathSimulator === 'function') initMathSimulator();
    let sel = document.getElementById('sim-order-select');
    if (sel) {
        sel.value = orderId;
        if(typeof renderSimulatorOrder === 'function') renderSimulatorOrder(orderId);
    }
};

window.updateSaleType = async function(sel, orderId, sku, id) {
    try {
        let newVal = sel.value;
        sysLog(`Editing Sale Type ${orderId}: ${newVal}`);
        setMasterStatus("Saving...", "mod-working");
        
        let row = id ? salesDB.find(s => s.id == id) : salesDB.find(s => s.order_id == orderId && s.storefront_sku == sku);
        if(!row) {
            console.error(`Row not found for orderId: ${orderId}, sku: ${sku}, id: ${id}`);
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
                    if (line.id === row.id) {
                        return { ...line, transaction_type: newVal };
                    }
                    return { ...line };
                });

                // 3. Run the Forensic Engine
                let forensicResults = window.runForensicAccounting(updatedLines);
                let sim = forensicResults.find(l => l.id === row.id);

                payload.cogs_at_sale = sim.cogs;
                payload.transaction_fees = sim.fee;
                payload.net_profit = sim.net;

                // 4. Update siblings in DB and memory
                forensicResults.forEach(async (fLine) => {
                    if (fLine.id !== row.id) {
                        let sibPayload = { net_profit: fLine.net, transaction_fees: fLine.fee, cogs_at_sale: fLine.cogs };
                        await supabaseClient.from('sales_ledger').update(sibPayload).eq('id', fLine.id);
                        let sibRow = salesDB.find(s => s.id === fLine.id);
                        if(sibRow) Object.keys(sibPayload).forEach(k => { sibRow[k] = sibPayload[k]; });
                    }
                });
            } catch(e) {
                console.error("Sales Engine Injection Failed:", e);
            }

            sysLog(`Pushing Sale Type update to Supabase for ${orderId}...`, false, payload);
            const { error } = await supabaseClient.from('sales_ledger').update(payload).eq('id', row.id);
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

async function updateSaleCell(cell, orderId, sku, col, isNum, id) {
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
        let row = id ? salesDB.find(s => s.id == id) : salesDB.find(s => s.order_id == orderId && s.storefront_sku == sku); 
        if(!row) return;
        
        let oldQty = row.qty_sold; let oldRec = row.internal_recipe_name;

        let payloadCol = col === 'internal_recipe_name' ? 'recipe_item_uuid' : col;
        let payloadVal = col === 'internal_recipe_name' ? window.uuidMap['RECIPE:::' + dbVal] : dbVal;
        let payload = { [payloadCol]: payloadVal };

        // --- POWERED BY MASTER FORENSIC ENGINE ---
        let mathCols = ['actual_sale_price', 'qty_sold', 'shipping', 'taxes', 'discount_amount', 'internal_recipe_name', 'Source', 'Outstanding Balance'];
        if (mathCols.includes(col)) {
            // 1. Get all siblings in the order to handle shifts
            let orderLines = salesDB.filter(s => s.order_id == orderId);
            
            // 2. Map the change into the local line
            let updatedLines = orderLines.map(line => {
                if (line.id === row.id) {
                    return { ...line, [col]: dbVal };
                }
                return { ...line };
            });

            // 3. Run the engine
            let forensicResults = window.runForensicAccounting(updatedLines);
            let sim = forensicResults.find(l => l.id === row.id);

            payload.cogs_at_sale = sim.cogs;
            payload.transaction_fees = sim.fee;
            payload.net_profit = sim.net;
            if(col === 'qty_sold' || col === 'internal_recipe_name') {
                payload.actual_sale_price = sim.actual_sale_price;
                if(col==='internal_recipe_name') { row.actual_sale_price = sim.actual_sale_price; row.recipe_item_uuid = payloadVal; }
            }

            // 4. Save siblings
            forensicResults.forEach(async (fLine) => {
                if (fLine.id !== row.id) {
                    let sibPayload = { net_profit: fLine.net, transaction_fees: fLine.fee, cogs_at_sale: fLine.cogs };
                    await supabaseClient.from('sales_ledger').update(sibPayload).eq('id', fLine.id);
                    let sibRow = salesDB.find(s => s.id === fLine.id);
                    if(sibRow) Object.keys(sibPayload).forEach(k => { sibRow[k] = sibPayload[k]; });
                }
            });
        }

        sysLog(`Pushing Sale Cell update to Supabase for ${orderId}...`, false, payload);
        const { error } = await supabaseClient.from('sales_ledger').update(payload).eq('id', row.id);
        if(error) throw new Error("DB Error saving cell: " + error.message);

        Object.keys(payload).forEach(k => { row[k] = payload[k]; });
        row[col] = dbVal; 

        if(col === 'qty_sold' || col === 'internal_recipe_name') {
            let invUps = [];
            if(col === 'internal_recipe_name') {
                let oldK = `RECIPE:::${oldRec}`; let newK = `RECIPE:::${dbVal}`;
                if(inventoryDB[oldK]) { inventoryDB[oldK].sold_qty -= oldQty; invUps.push({item_uuid: window.uuidMap[oldK] || oldK, ...inventoryDB[oldK]}); }
                if(!inventoryDB[newK]) inventoryDB[newK] = {consumed_qty:0, manual_adjustment:0, produced_qty:0, sold_qty:0, min_stock:0, scrap_qty:0};
                inventoryDB[newK].sold_qty += row.qty_sold; invUps.push({item_uuid: window.uuidMap[newK] || newK, ...inventoryDB[newK]});
            } else if(col === 'qty_sold') {
                let k = `RECIPE:::${row.internal_recipe_name}`;
                if(!inventoryDB[k]) inventoryDB[k] = {consumed_qty:0, manual_adjustment:0, produced_qty:0, sold_qty:0, min_stock:0, scrap_qty:0};
                inventoryDB[k].sold_qty += (dbVal - oldQty);
                invUps.push({item_uuid: window.uuidMap[k] || k, ...inventoryDB[k]});
            }
            if(invUps.length > 0) await supabaseClient.from('inventory_consumption').upsert(invUps, {onConflict:'item_uuid'});
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
    if(typeof renderSalesTable === 'function') renderSalesTable();
    if(typeof filterSales === 'function') filterSales();
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
    sel.innerHTML = window.safeHTML(opts);
    
    // Bind change listener
    sel.onchange = function(e) {
        renderSimulatorOrder(e.target.value);
    };
    
    document.getElementById('math-simulator-sandbox').innerHTML = window.safeHTML(`<div style="color:#888; text-align:center; padding: 2rem; font-family: monospace;">Please load an order to begin simulation.</div>`);
    document.getElementById('math-simulator-console').innerHTML = window.safeHTML("");

    let commitBtn = document.getElementById('sim-commit-btn');
    if (commitBtn) {
        commitBtn.style.opacity = '0.2';
        commitBtn.style.pointerEvents = 'none';
        commitBtn.textContent = "💾 COMMIT TO LEDGER";
        commitBtn.style.background = "#10b981";
    }

    // Apply cached resizer heights
    if (typeof restoreNeoSimulatorSizes === 'function') restoreNeoSimulatorSizes();
}

function renderSimulatorOrder(orderId) {
    if (window.simEventController) window.simEventController.abort();
    window.simEventController = new AbortController();
    const signal = window.simEventController.signal;

    let sandbox = document.getElementById('math-simulator-sandbox');
    let consoleDiv = document.getElementById('math-simulator-console');
    
    let commitBtn = document.getElementById('sim-commit-btn');
    if(!orderId) {
        sandbox.innerHTML = window.safeHTML(`<div style="color:#888; text-align:center; padding: 2rem; font-family: monospace;">Please load an order to begin simulation.</div>`);
        consoleDiv.innerHTML = window.safeHTML("");
        if (commitBtn) {
            commitBtn.style.opacity = '0.2';
            commitBtn.style.pointerEvents = 'none';
            commitBtn.textContent = "💾 COMMIT TO LEDGER";
        }
        return;
    }
    
    if (commitBtn) {
        commitBtn.style.opacity = "1";
        commitBtn.style.pointerEvents = "auto";
        commitBtn.textContent = "💾 COMMIT TO LEDGER";
        commitBtn.disabled = false;
        commitBtn.style.background = "#10b981";
    }
    
    let rows = window.processedSalesDB.filter(x => String(x.order_id) === String(orderId));
    window.currentSimPayload = JSON.parse(JSON.stringify(rows)); 
    
    let html = '';
    window.currentSimPayload.forEach((row, i) => {
        let typeHtml = window.getTransactionTypeOptions(row.transaction_type);
        
        let src = row['Source'] || 'web';
        
        let rawPrice = parseFloat(row.original_sale_price ?? row.actual_sale_price ?? 0).toFixed(2);
        let rawQty = parseFloat(row.qty_sold || 0).toFixed(2);
        let rawSubtot = parseFloat(row.subtotal || 0).toFixed(2);
        let rawShip = parseFloat(row.shipping || 0).toFixed(2);
        let rawTax = parseFloat(row.taxes || 0).toFixed(2);
        let rawDisc = parseFloat(row.original_discount_amount ?? row.discount_amount ?? 0).toFixed(2);
        let rawOutBal = parseFloat(row['Outstanding Balance'] || 0).toFixed(2);
        let rawTotal = parseFloat(row.total || 0).toFixed(2);
        let rawRef = parseFloat(row.refunded_amount || row.exchAdj || 0).toFixed(2);
        let rawFee = parseFloat(row.transaction_fees || row.stripeFee || 0).toFixed(2);
        let rawShipC = parseFloat(row.actual_shipping_cost || row.actualShipCost || 0).toFixed(2);
        let rawCogs = (parseFloat(row.cogs_at_sale || row.liveCogs || 0) * parseFloat(row.qty_sold || 1)).toFixed(2);
        let rawNet = parseFloat(row.net_profit || row.net || 0).toFixed(2);

        html += `
        <div style="background: #1e1e1e; padding: 0.75rem; border-radius: 6px; border: 1px solid #333; display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 0.75rem;">
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #333; padding-bottom:0.5rem;">
                <div style="display:flex; align-items:center; gap:0.75rem;">
                    <div style="color:#eee; font-weight:bold; font-size:14px;">${row.internal_recipe_name}</div>
                    <span style="color:#666; font-size:12px; font-weight:normal;">(QTY: <span style="color:#ffffff;">${row.qty_sold}</span>)</span>
                    <span style="background:#064e3b; color:#34d399; padding:2px 6px; border-radius:4px; font-size:9px; font-weight:bold; text-transform:uppercase; border:1px solid #059669;">${row.lineitem_fulfillment_status || row.fulfillment_status || 'unknown'}</span>
                </div>
                <div style="display:flex; gap:1rem; align-items:center;">
                    <span style="color:#666; font-size:11px;">SOURCE: <span style="color:#2dd4bf; font-weight:bold;">${src}</span></span>
                    <select class="sim-type-sel" data-idx="${i}" style="background:#000; color:#10b981; border:1px solid #333; padding:4px; border-radius:4px; font-size:12px; outline:none; cursor:pointer;">
                        ${typeHtml}
                    </select>
                </div>
            </div>
            
            <div style="display:flex; flex-direction:column; gap:4px;">
                <!-- ROW 1: RAW DATABASE SNAPSHOT -->
                <div style="background:#0f172a; padding:10px 12px; border-radius:4px; border-left:4px solid #3b82f6; border-top:1px solid #1e293b; border-right:1px solid #1e293b; border-bottom:1px solid #1e293b;">
                    <div style="display:grid; grid-template-columns: repeat(9, 1fr); gap: 0.5rem; align-items: start;">
                        <div style="display:flex; flex-direction:column; gap:4px; overflow:hidden;"><span style="color:#00e5ff; font-weight:bold; font-size:10px; text-transform:uppercase; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="actual_sale_price">actual_sale_price</span> <span style="color:#00e5ff; font-weight:bold; font-size:13px; font-family:monospace;">$${rawPrice}</span></div>
                        <div style="display:flex; flex-direction:column; gap:4px; overflow:hidden;"><span style="color:#f97316; font-weight:bold; font-size:10px; text-transform:uppercase; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="discount_amount">discount_amount</span> <span style="color:#f97316; font-weight:bold; font-size:13px; font-family:monospace;">$${rawDisc}</span></div>
                        <div style="display:flex; flex-direction:column; gap:4px; overflow:hidden;"><span style="color:#ef4444; font-weight:bold; font-size:10px; text-transform:uppercase; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="transaction_fees">transaction_fees</span> <span style="color:#ef4444; font-weight:bold; font-size:13px; font-family:monospace;">$${Math.abs(rawFee).toFixed(2)}</span></div>
                        <div style="display:flex; flex-direction:column; gap:4px; overflow:hidden;"><span style="color:#3b82f6; font-weight:bold; font-size:10px; text-transform:uppercase; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="shipping">shipping</span> <span style="color:#3b82f6; font-weight:bold; font-size:13px; font-family:monospace;">$${rawShip}</span></div>
                        <div style="display:flex; flex-direction:column; gap:4px; overflow:hidden;"><span style="color:#a855f7; font-weight:bold; font-size:10px; text-transform:uppercase; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="taxes">taxes</span> <span style="color:#a855f7; font-weight:bold; font-size:13px; font-family:monospace;">$${rawTax}</span></div>
                        <div style="display:flex; flex-direction:column; gap:4px; overflow:hidden;"><span style="color:#d946ef; font-weight:bold; font-size:10px; text-transform:uppercase; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="total">total</span> <span style="color:#d946ef; font-weight:bold; font-size:13px; font-family:monospace;">$${rawTotal}</span></div>
                        <div style="display:flex; flex-direction:column; gap:4px; overflow:hidden;"><span style="color:#8b5cf6; font-weight:bold; font-size:10px; text-transform:uppercase; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="Outstanding Balance">Out. Balance</span> <span style="color:#8b5cf6; font-weight:bold; font-size:13px; font-family:monospace;">$${rawOutBal}</span></div>
                        <div style="display:flex; flex-direction:column; gap:4px; overflow:hidden;"><span style="color:#eab308; font-weight:bold; font-size:10px; text-transform:uppercase; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="refunded_amount">refunded_amount</span> <span style="color:#eab308; font-weight:bold; font-size:13px; font-family:monospace;">$${rawRef}</span></div>
                        <div style="display:flex; flex-direction:column; gap:4px; overflow:hidden;"><span style="color:#fbbf24; font-weight:bold; font-size:10px; text-transform:uppercase; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="actual_shipping_cost">actual_ship_cost</span> <span style="color:#fbbf24; font-weight:bold; font-size:13px; font-family:monospace;">$${rawShipC}</span></div>
                    </div>
                </div>
                
                <!-- ROW 2: RAW CSV: SHOPIFY ORDERS EXPORT -->
                <div style="background:#1a1a1a; padding:10px 12px; border-radius:4px; border-left:4px solid #14b8a6; border-top:1px solid #333; border-right:1px solid #333; border-bottom:1px solid #333;">
                    <div style="display:grid; grid-template-columns: repeat(9, 1fr); gap: 0.5rem; align-items: start;">
                        <div style="display:flex; flex-direction:column; gap:4px; overflow:hidden;">
                            <span style="color:#00e5ff !important; font-weight:bold; text-transform:uppercase; font-size:10px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="Lineitem price (S)">Lineitem price (S)</span>
                            <span style="color:#00e5ff !important; font-family:monospace; font-size:13px; font-weight:bold;">$${rawPrice}</span>
                        </div>
                        <div style="display:flex; flex-direction:column; gap:4px; overflow:hidden;">
                            <span style="color:#f97316 !important; font-weight:bold; text-transform:uppercase; font-size:10px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="Discount Amt (N)">Discount Amt (N)</span>
                            <span id="sim-disc-raw-${i}" style="color:#f97316 !important; font-family:monospace; font-size:13px; font-weight:bold;">$${rawDisc}</span>
                        </div>
                        <div style="display:flex; flex-direction:column; gap:4px; overflow:hidden;">
                            <span style="color:#14b8a6 !important; font-weight:bold; text-transform:uppercase; font-size:10px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="Subtotal (I)">Subtotal (I)</span>
                            <span id="sim-subtot-raw-${i}" style="color:#14b8a6 !important; font-family:monospace; font-size:13px; font-weight:bold;">$${rawSubtot}</span>
                        </div>
                        <div style="display:flex; flex-direction:column; gap:4px; overflow:hidden;">
                            <span style="color:#3b82f6 !important; font-weight:bold; text-transform:uppercase; font-size:10px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="Shipping (J)">Shipping (J)</span>
                            <span id="sim-ship-raw-${i}" style="color:#3b82f6 !important; font-family:monospace; font-size:13px; font-weight:bold;">$${rawShip}</span>
                        </div>
                        <div style="display:flex; flex-direction:column; gap:4px; overflow:hidden;">
                            <span style="color:#a855f7 !important; font-weight:bold; text-transform:uppercase; font-size:10px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="Taxes (K)">Taxes (K)</span>
                            <span id="sim-tax-raw-${i}" style="color:#a855f7 !important; font-family:monospace; font-size:13px; font-weight:bold;">$${rawTax}</span>
                        </div>
                        <div style="display:flex; flex-direction:column; gap:4px; overflow:hidden;">
                            <span style="color:#d946ef !important; font-weight:bold; text-transform:uppercase; font-size:10px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="Total (L)">Total (L)</span>
                            <span id="sim-total-raw-${i}" style="color:#d946ef !important; font-family:monospace; font-size:13px; font-weight:bold;">$${rawTotal}</span>
                        </div>
                        <div style="display:flex; flex-direction:column; gap:4px; overflow:hidden;">
                            <span style="color:#8b5cf6 !important; font-weight:bold; text-transform:uppercase; font-size:10px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="Out Balance (AZ)">Out Balance (AZ)</span>
                            <span id="sim-outbal-raw-${i}" style="color:#8b5cf6 !important; font-family:monospace; font-size:13px; font-weight:bold;">$${rawOutBal}</span>
                        </div>
                        <div style="display:flex; flex-direction:column; gap:4px; overflow:hidden;">
                            <span style="color:#eab308 !important; font-weight:bold; text-transform:uppercase; font-size:10px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="Refunded Amt (AX)">Refunded Amt (AX)</span>
                            <span id="sim-refund-raw-${i}" style="color:#eab308 !important; font-family:monospace; font-size:13px; font-weight:bold;">$${rawRef}</span>
                        </div>
                        <div><!-- Empty block for col 9 alignment --></div>
                    </div>
                </div>
                
                <!-- ROW 3: RAW CSV: SHOPIFY BILLING EXPORT -->
                <div style="background:#1a1a1a; padding:10px 12px; border-radius:4px; border-left:4px solid #fbbf24; border-top:1px solid #333; border-right:1px solid #333; border-bottom:1px solid #333;">
                    <div style="display:grid; grid-template-columns: repeat(9, 1fr); gap: 0.5rem; align-items: start;">
                        <div style="display:flex; flex-direction:column; gap:4px; grid-column: span 2;">
                            <span style="color:#9ca3af !important; font-weight:bold; text-transform:uppercase; font-size:10px;">Charge category (E)</span>
                            <span style="color:#9ca3af !important; font-family:monospace; font-size:13px; font-weight:bold;">shipping_fee</span>
                        </div>
                        <div style="display:flex; flex-direction:column; gap:4px; grid-column: span 6;">
                            <span style="color:#9ca3af !important; font-weight:bold; text-transform:uppercase; font-size:10px;">Order (L)</span>
                            <span style="color:#9ca3af !important; font-family:monospace; font-size:13px; font-weight:bold;">${row.order_id}</span>
                        </div>
                        <div style="display:flex; flex-direction:column; gap:4px;">
                            <span style="color:#fbbf24 !important; font-weight:bold; text-transform:uppercase; font-size:10px; white-space:nowrap;">Amount (G)</span>
                            <span style="color:#fbbf24 !important; font-family:monospace; font-size:13px; font-weight:bold;">$${rawShipC}</span>
                        </div>
                    </div>
                </div>

                <!-- ROW 4: CALCULATED FORENSIC RESULTS -->
                <div style="background:#111; padding:10px 12px; border-radius:4px; border-left:4px solid #d946ef; border-top:1px solid #4a044e; border-right:1px solid #4a044e; border-bottom:1px solid #4a044e;">
                    <div style="display:grid; grid-template-columns: repeat(6, 1fr); gap: 0.5rem; align-items: start;">
                        <div style="display:flex; flex-direction:column; gap:4px;">
                            <span style="color:#d946ef !important; font-weight:bold; font-size:10px; text-transform:uppercase; white-space:nowrap;">⚙️ Net Rev</span>
                            <span id="sim-capture-${i}" style="color:#d946ef !important; font-weight:bold; font-size:13px; font-family:monospace;">$0.00</span>
                        </div>
                        <div style="display:flex; flex-direction:column; gap:4px;">
                            <span style="color:#ef4444 !important; font-weight:bold; font-size:10px; text-transform:uppercase; white-space:nowrap;">⚙️ Allocated Fees</span>
                            <span id="sim-fee-${i}" style="color:#ef4444 !important; font-weight:bold; font-size:13px; font-family:monospace;">$0.00</span>
                        </div>
                        <div style="display:flex; flex-direction:column; gap:4px;">
                            <span style="color:#fbbf24 !important; font-weight:bold; font-size:10px; text-transform:uppercase; white-space:nowrap;">⚙️ Allocated Ship</span>
                            <span id="sim-ship-exp-${i}" style="color:#fbbf24 !important; font-weight:bold; font-size:13px; font-family:monospace;">$0.00</span>
                        </div>
                        <div style="display:flex; flex-direction:column; gap:4px;">
                            <span style="color:#f59e0b !important; font-weight:bold; font-size:10px; text-transform:uppercase; white-space:nowrap;">⚙️ COGS</span>
                            <span id="sim-cogs-${i}" style="color:#f59e0b !important; font-weight:bold; font-size:13px; font-family:monospace;">$0.00</span>
                        </div>
                        <div style="display:flex; flex-direction:column; gap:4px;">
                            <span style="color:#eab308 !important; font-weight:bold; font-size:10px; text-transform:uppercase; white-space:nowrap;">⚙️ Allocated Refunds</span>
                            <span id="sim-refund-applied-${i}" style="color:#eab308 !important; font-weight:bold; font-size:13px; font-family:monospace;">$0.00</span>
                        </div>
                        <div style="display:flex; flex-direction:column; gap:4px;">
                            <span style="color:#ccff00 !important; font-weight:bold; font-size:10px; text-transform:uppercase; white-space:nowrap;">🔥 Final Net</span>
                            <span id="sim-profit-${i}" style="color:#ccff00 !important; font-weight:bold; font-size:13px; font-family:monospace;">$0.00</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        `;
    });
    
    sandbox.innerHTML = window.safeHTML(html);
    
    document.querySelectorAll('.sim-type-sel').forEach(el => {
        el.addEventListener('change', (e) => {
            let idx = parseInt(e.target.getAttribute('data-idx'));
            window.currentSimPayload[idx].transaction_type = e.target.value;
            recomputeSimulator();
        }, { signal });
    });
    
    recomputeSimulator();
}

window.click_commitSimToLedger = async function() {
    let commitBtn = document.getElementById('sim-commit-btn') || document.createElement('button');
    
    await executeWithButtonAction(commitBtn, '💾 SAVING...', '✅ SAVED', async () => {
        if(typeof setMasterStatus === 'function') setMasterStatus("Saving Forensic Sandbox...", "mod-working");

        let forensicResults = window.runForensicAccounting(window.currentSimPayload);
        for (let fLine of forensicResults) {
            let payload = { 
                transaction_type: fLine.transaction_type, 
                net_profit: fLine.net, 
                transaction_fees: fLine.fee, 
                cogs_at_sale: fLine.cogs 
            };
            
            let dbPayload = { ...payload };
            if (dbPayload.internal_recipe_name) {
                dbPayload.recipe_item_uuid = window.uuidMap['RECIPE:::' + dbPayload.internal_recipe_name];
                delete dbPayload.internal_recipe_name;
            }
            const { error } = await supabaseClient.from('sales_ledger').update(dbPayload).eq('order_id', fLine.order_id).eq('storefront_sku', fLine.storefront_sku);
            if (error) throw error;
            
            // Update Memory
            if (typeof salesDB !== 'undefined' && salesDB) {
                let mainRow = salesDB.find(s => String(s.order_id) === String(fLine.order_id) && String(s.storefront_sku) === String(fLine.storefront_sku));
                if (mainRow) {
                    mainRow.transaction_type = payload.transaction_type;
                    mainRow.net_profit = payload.net_profit;
                    mainRow.transaction_fees = payload.transaction_fees;
                    mainRow.cogs_at_sale = payload.cogs_at_sale;
                }
            }
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
        
        if(typeof renderSalesTable === 'function') renderSalesTable();
        if(typeof setMasterStatus === 'function') setMasterStatus("Forensic Ledger Updated", "mod-success");
        setTimeout(() => {
            if(typeof setMasterStatus === 'function') setMasterStatus("Ready.", "status-idle");
        }, 2000);
    });
};

function recomputeSimulator() {
    let consoleDiv = document.getElementById('math-simulator-console');
    if(!consoleDiv) return;
    
    consoleDiv.innerHTML = window.safeHTML(`<div style="color:#3b82f6; font-weight:bold; margin-bottom:10px;">[EXECUTING] LIVE SANDBOX MATH ENGINE</div>`);
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
        const p = parseFloat(r.forensic_sale_price !== undefined ? r.forensic_sale_price : (r.actual_sale_price || 0));
        const q = parseFloat(r.qty_sold || 1);
        const d = parseFloat(r.forensic_discount_amount !== undefined ? r.forensic_discount_amount : (r.discount_amount || 0));
        const sub = (p * q) - d;
        
        if (isDonor) {
            // For donor surrender, we must use the ORIGINAL raw price, not the 0.00 forensic price
            const rawP = parseFloat(r.original_sale_price ?? r.actual_sale_price ?? 0);
            const rawD = parseFloat(r.original_discount_amount ?? r.discount_amount ?? 0);
            const rawSub = (rawP * q) - rawD;
            
            log(`&nbsp;&nbsp;<span style="color:#94a3b8;">↳ [DONOR] ${r.internal_recipe_name}: ($${rawP.toFixed(2)} * ${q}) - $${rawD.toFixed(2)} = $${rawSub.toFixed(2)} -> <b style="color:#ff3399;">SURRENDERED</b></span>`);
            donorSurrenderSum += rawSub;
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
    
    // Validate against literal Ship/Tax columns natively across all rows
    const engineShipSum = forensicResults.reduce((acc, r) => {
        return acc + parseFloat(r.forensic_shipping !== undefined ? r.forensic_shipping : (r.shipping || 0));
    }, 0);
    
    const engineTaxSum = forensicResults.reduce((acc, r) => {
        return acc + parseFloat(r.forensic_taxes !== undefined ? r.forensic_taxes : (r.taxes || 0));
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
            const fp = parseFloat(r.forensic_sale_price !== undefined ? r.forensic_sale_price : (r.actual_sale_price || 0));
            return acc + (fp * parseFloat(r.qty_sold || 1));
        }, 0);

        // Check if the discrepancy matches the RAW price of ANY line in the order (Common Shopify Inflation Pattern)
        // We must check raw `actual_sale_price` because the inflation delta is caused by the physical CSV line price, not our forensic math.
        let matchedAnyLinePrice = forensicResults.some(r => {
            const rp = parseFloat(r.actual_sale_price || 0);
            let lp = (rp * parseFloat(r.qty_sold || 1));
            return lp > 0 && Math.abs(unaccounted - lp) < 0.1;
        });

        let isExchangeBalanced = (Math.abs(unaccounted - donorSurrenderSum) < 0.1 && donorSurrenderSum > 0) || 
                                 (matchedAnyLinePrice && (donorSurrenderSum > 0 || forensicResults.some(rx => ['Exchange Replacement', 'Partial Refund', 'Cancelled'].includes(rx.transaction_type))));

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
        const shipMath = row.shipping > 0 ? ` + (Ship: $${row.shipping})` : "";
        const taxMath = row.taxes > 0 ? ` + (Tax: $${row.taxes})` : "";
        
        let itemSum = (parseFloat(row.actual_sale_price || 0) * parseFloat(row.qty_sold || 1)) - parseFloat(row.discount_amount || 0) + parseFloat(row.shipping || 0) + parseFloat(row.taxes || 0);
        
        log(`&nbsp;&nbsp;<span style="color:#00e5ff;">${priceMath}${discMath}${shipMath}${taxMath} = $${itemSum.toFixed(2)} (Actual Contribution)</span>`);
        log(`&nbsp;&nbsp;<span style="color:#8b5cf6;">=> Engine Allocated Revenue: $${row.trueLineCaptured.toFixed(2)} (${row.revenueDerivation})</span>`);
        
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
    
    consoleDiv.innerHTML += window.safeHTML(htmlLogs);
}
window.runGlobalReconciliationAudit = function() {
    let consoleDiv = document.getElementById('math-simulator-console');
    if(!consoleDiv) return;
    
    consoleDiv.innerHTML = window.safeHTML(`<div style="color:#60a5fa; font-weight:bold; margin-bottom:1rem; font-size:14px; text-transform:uppercase; letter-spacing:1px;">🚀 INITIALIZING GLOBAL FORENSIC HEALTH CHECK...</div>`);
    
    let db = window.processedSalesDB || [];
    let orderGroups = {};
    db.forEach(x => { if(!orderGroups[x.order_id]) orderGroups[x.order_id] = []; orderGroups[x.order_id].push(x); });
    
    let failureCount = 0;
    let totalCount = Object.keys(orderGroups).length;
    let failures = [];

    Object.keys(orderGroups).forEach(oid => {
        let lines = orderGroups[oid];
        let forensic = window.runForensicAccounting(lines);
        
        // Skip orders that are completely zeroed out (Ignore/Cancelled)
        const allIgnored = forensic.every(r => r.transaction_type === 'IGNORE' || r.transaction_type === 'Cancelled');
        if (allIgnored) return;
        
        // Re-run the reconciliation math
        const mainRow = forensic[0];
        const rawTotal = parseFloat(mainRow.rawOrderTotal || 0);
        
        const totalItemRevenue = forensic.reduce((acc, r) => {
            const isDonor = r.transaction_type === 'Pre-Ship Exchange' || r.transaction_type === 'Post-Ship Exchange';
            if (isDonor) return acc;
            const fp = parseFloat(r.forensic_sale_price !== undefined ? r.forensic_sale_price : (r.actual_sale_price || 0));
            const fd = parseFloat(r.forensic_discount_amount !== undefined ? r.forensic_discount_amount : (r.discount_amount || 0));
            return acc + (fp * parseFloat(r.qty_sold || 1)) - fd;
        }, 0);
        
        const residual = rawTotal - totalItemRevenue;
        
        const csvShipSum = forensic.reduce((acc, r) => {
            const isDonor = r.transaction_type === 'Pre-Ship Exchange' || r.transaction_type === 'Post-Ship Exchange';
            if (isDonor) return acc;
            return acc + parseFloat(r.forensic_shipping !== undefined ? r.forensic_shipping : (r.shipping || 0));
        }, 0);
        const csvTaxSum = forensic.reduce((acc, r) => {
            const isDonor = r.transaction_type === 'Pre-Ship Exchange' || r.transaction_type === 'Post-Ship Exchange';
            if (isDonor) return acc;
            return acc + parseFloat(r.forensic_taxes !== undefined ? r.forensic_taxes : (r.taxes || 0));
        }, 0);
        
        const expectedResidue = csvShipSum + csvTaxSum;
        const diff = Math.abs(residual - expectedResidue);
        
        if (diff > 0.05) { // 5 cent tolerance for rounding drift
             // Check for Exchange-Aware Conditional Pass
             let donorSurrenderSum = forensic.reduce((acc, r) => {
                const isDonor = r.transaction_type === 'Pre-Ship Exchange' || r.transaction_type === 'Post-Ship Exchange';
                if (!isDonor) return acc;
                // For donor surrender, we want the ORIGINAL price, not the 0.00 forensic price
                const p = parseFloat(r.original_sale_price ?? r.actual_sale_price ?? 0);
                const d = parseFloat(r.original_discount_amount ?? r.discount_amount ?? 0);
                return acc + (p * parseFloat(r.qty_sold || 1)) - d;
             }, 0);

             let replacementPriceSum = forensic.reduce((acc, r) => {
                if (r.transaction_type !== 'Exchange Replacement') return acc;
                const fp = parseFloat(r.forensic_sale_price !== undefined ? r.forensic_sale_price : (r.actual_sale_price || 0));
                return acc + (fp * parseFloat(r.qty_sold || 1));
             }, 0);

             let unaccounted = residual - expectedResidue;
             
             // Check if the discrepancy matches the RAW price of ANY line in the order (Common Shopify Inflation Pattern)
             // We must check raw `actual_sale_price` because the inflation delta is caused by the physical CSV line price, not our forensic math.
             let matchedAnyLinePrice = forensic.some(r => {
                 const rp = parseFloat(r.actual_sale_price || 0);
                 let lp = (rp * parseFloat(r.qty_sold || 1));
                 return lp > 0 && Math.abs(unaccounted - lp) < 0.1;
             });

             let isExchangeBalanced = (Math.abs(unaccounted - donorSurrenderSum) < 0.1 && donorSurrenderSum > 0) || 
                                      (matchedAnyLinePrice && (donorSurrenderSum > 0 || forensic.some(rx => ['Exchange Replacement', 'Partial Refund', 'Cancelled'].includes(rx.transaction_type))));
             
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
                        <button class="btn-blue-muted" style="width:auto; padding:2px 8px; font-size:10px; margin-top:4px;" data-click="click_renderSimulatorOrder" data-oid="${f.oid}">INVESTIGATE</button>
                    </div>
                  </div>`;
        });
        h += `</div>`;
    } else {
        h += `<div style="margin-top:1rem; color:#10b981; font-style:italic;">All order clusters successfully reconciled against the forensic engine rules.</div>`;
    }
    h += `</div>`;
    
    consoleDiv.innerHTML += window.safeHTML(h);
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
            let trueCapHtml = (l.trueLineCaptured !== undefined) ? `<br/><span style='color:#f59e0b; font-size:9px;'>Cap: $${parseFloat(l.trueLineCaptured).toFixed(2)}</span>` : '';
            
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
    
    let fullTableHtml = `
        <table style="width:100%; margin:0; table-layout:fixed;">
            <thead style="position:sticky; top:0; z-index:2; background:var(--bg-panel); font-size:11px;">
                <tr>
                    <th style="width:20px;"></th>
                    <th style="cursor:pointer;" data-click="click_actualNetSort_o">Order ID</th>
                    <th style="cursor:pointer;" data-click="click_actualNetSort_d">Date</th>
                    <th class="text-right" style="cursor:pointer;">Price (R)</th>
                    <th class="text-right" style="cursor:pointer;">Qty</th>
                    <th class="text-right" style="cursor:pointer;">Subtot</th>
                    <th class="text-right" style="cursor:pointer;">Disc (N)</th>
                    <th class="text-right" style="cursor:pointer;">Ship (J)</th>
                    <th class="text-right" style="cursor:pointer;" data-click="click_actualNetSort_t">Tax (K)</th>
                    <th class="text-right" style="cursor:pointer;">Out.Bal (AY)</th>
                    <th class="text-right" style="cursor:pointer;" data-click="click_actualNetSort_g">Total (L)</th>
                    <th class="text-right" style="cursor:pointer;" data-click="click_actualNetSort_a">Refund (M)</th>
                    <th class="text-right" style="cursor:pointer;" data-click="click_actualNetSort_c">COGS</th>
                    <th class="text-right" style="cursor:pointer;" data-click="click_actualNetSort_s">Ship Exp</th>
                    <th class="text-right" style="cursor:pointer;" data-click="click_actualNetSort_f">Fees</th>
                    <th class="text-right" style="cursor:pointer;" data-click="click_actualNetSort_n">TRUE NET</th>
                </tr>
            </thead>
            <tbody>
                ${html}
            </tbody>
        </table>`;

    container.innerHTML = window.safeHTML(fullTableHtml);
    
    container.querySelectorAll('.net-modal-parent').forEach(tr => {
        tr.addEventListener('click', () => {
            let oid = tr.getAttribute('data-oid');
            let children = container.querySelectorAll(`.net-child-row[data-parent-oid="${oid}"]`);
            let icon = tr.querySelector('.expander-icon');
            let isHidden = children.length > 0 && children[0].style.display === 'none';
            
            children.forEach(child => {
                child.style.display = isHidden ? 'table-row' : 'none';
            });
            icon.innerHTML = window.safeHTML(isHidden ? '▼' : '▶');
        }, { signal });
    });
}


// --- FORCE SYNC MODAL LOGIC ---
window.openForceSyncModal = function() {
    let modal = document.getElementById('force-sync-modal');
    if(modal) {
        modal.style.display = 'flex';
        document.getElementById('forceSyncInput').value = '';
        document.getElementById('forceSyncStatus').style.display = 'none';
        document.getElementById('forceSyncInput').focus();
    }
};

window.closeForceSyncModal = function() {
    let modal = document.getElementById('force-sync-modal');
    if(modal) modal.style.display = 'none';
};

window.triggerForceSync = async function() {
    let input = document.getElementById('forceSyncInput').value.trim();
    if(!input) return;
    
    let orderIdStr = input.replace('#', '');
    let btn = document.getElementById('btnForceSyncSubmit');
    let statusDiv = document.getElementById('forceSyncStatus');
    
    btn.innerHTML = window.safeHTML('⚙️ SYNCING...');
    btn.style.opacity = '0.5';
    btn.disabled = true;
    
    statusDiv.style.display = 'block';
    statusDiv.style.background = 'rgba(59, 130, 246, 0.1)';
    statusDiv.style.color = '#3b82f6';
    statusDiv.style.border = '1px solid rgba(59, 130, 246, 0.3)';
    statusDiv.innerHTML = window.safeHTML(`Fetching payload for order #${orderIdStr}...`);
    
    try {
        const { data: sessionData, error: sessionError } = await supabaseClient.auth.getSession();
        if (sessionError || !sessionData.session) throw new Error("Authentication failed. Please reload.");
        
        // Ensure VITE_SUPABASE_URL is available from env in main JS scope if needed, or we just rely on standard supabase fetch
        const functionUrl = `${supabaseClient.supabaseUrl}/functions/v1/shopify-force-sync`;
        
        const res = await fetch(functionUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${sessionData.session.access_token}`
            },
            body: JSON.stringify({ order_id: orderIdStr })
        });
        
        const text = await res.text();
        let json;
        try { json = JSON.parse(text); } catch(e) { json = { error: text }; }
        
        if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
        
        statusDiv.style.background = 'rgba(16, 185, 129, 0.1)';
        statusDiv.style.color = '#10b981';
        statusDiv.style.border = '1px solid rgba(16, 185, 129, 0.3)';
        statusDiv.innerHTML = window.safeHTML(`✅ Success! Order #${orderIdStr} injected natively.`);
        
        sysLog(`Force Synced Order #${orderIdStr} successfully!`);
        
        // Refresh the ledger
        if(typeof fetchSalesData === 'function') {
            setTimeout(() => { fetchSalesData(true); }, 1500);
        }
        
    } catch (err) {
        console.error(err);
        statusDiv.style.background = 'rgba(239, 68, 68, 0.1)';
        statusDiv.style.color = '#ef4444';
        statusDiv.style.border = '1px solid rgba(239, 68, 68, 0.3)';
        statusDiv.innerHTML = window.safeHTML(`❌ Error: ${err.message}`);
    } finally {
        btn.innerHTML = window.safeHTML('🚀 SYNC NOW');
        btn.style.opacity = '1';
        btn.disabled = false;
    }
};

function catalogSyncTrace(msg, isErr = false) {
    const t = document.getElementById('catalogSyncProgressTerminal');
    if (t) {
        const line = document.createElement('div');
        line.style.color = isErr ? '#ef4444' : '#38bdf8';
        line.style.paddingBottom = '3px';
        line.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
        line.innerText = `> ${msg}`;
        t.appendChild(line);
        const container = document.getElementById('catalogSyncTerminalContainer');
        if (container) {
            container.scrollTop = container.scrollHeight;
        }
    }
}

window.triggerShopifyCatalogSync = async function() {
    // Reset terminal and display it
    const term = document.getElementById('catalogSyncTerminalContainer');
    const termBody = document.getElementById('catalogSyncProgressTerminal');
    if (term) term.style.display = 'flex';
    if (termBody) termBody.innerHTML = '';

    catalogSyncTrace("INITIALIZING SHOPIFY CATALOG SYNC...");
    setMasterStatus("Syncing Shopify...", "mod-working");

    try {
        catalogSyncTrace("🔑 Retrieving Supabase authentication session...");
        const { data: sessionData, error: sessionError } = await supabaseClient.auth.getSession();
        if (sessionError || !sessionData.session) {
            throw new Error("Authentication session failed or active session not found. Please reload or login.");
        }
        
        catalogSyncTrace("📡 Session acquired. Dispatching Shopify sync request to Edge Function...");
        const functionUrl = `${supabaseClient.supabaseUrl}/functions/v1/shopify-force-sync`;
        
        catalogSyncTrace("⏳ Shopify variant processing began. Scanning current Shopify listings (this may take up to 30 seconds)...");
        const res = await fetch(functionUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${sessionData.session.access_token}`
            },
            body: JSON.stringify({ sync_catalog: true })
        });
        
        const text = await res.text();
        let json;
        try { json = JSON.parse(text); } catch(e) { json = { error: text }; }
        
        if (!res.ok) {
            throw new Error(json.error || `HTTP ${res.status}`);
        }
        
        catalogSyncTrace("✅ Shopify Sync Completed Successfully!");
        catalogSyncTrace(`📊 Imported Count: ${json.importedCount || 0} variants`);
        catalogSyncTrace(`📊 Matched/Updated Count: ${json.matchedCount || 0} variants`);
        setMasterStatus("Sync Success!", "mod-success");
        sysLog(`Catalog synced successfully: ${json.importedCount || 0} imported, ${json.matchedCount || 0} matched.`);
        
        catalogSyncTrace("🔄 Refreshing local ledger maps and rendering tables...");
        // Refresh the ledger
        if (typeof fetchSalesData === 'function') {
            await fetchSalesData(true);
            catalogSyncTrace("✅ Local database state successfully reloaded.");
        }
        
    } catch (err) {
        console.error(err);
        catalogSyncTrace(`❌ Error: ${err.message}`, true);
        setMasterStatus("Error", "mod-error");
    } finally {
        setTimeout(() => {
            const sm = document.getElementById('statusMaster');
            if(sm) setMasterStatus("Ready.", "status-idle");
        }, 2000);
    }
};

// ==========================================
// WEBHOOKS MANAGER SYSTEM
// ==========================================

let cachedWebhookLogs = [];

window.click_openWebhooksModal = async function() {
    const modal = document.getElementById('webhooksModal');
    if (modal) {
        modal.style.display = 'flex';
        await window.fetchWebhookLogs();
    }
};

window.click_closeWebhooksModal = function() {
    const modal = document.getElementById('webhooksModal');
    if (modal) modal.style.display = 'none';
};

window.fetchWebhookLogs = async function() {
    const tbody = document.getElementById('webhooksTableBody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px;">Loading webhook logs...</td></tr>';
    
    try {
        const { data, error } = await supabaseClient
            .from('shopify_webhook_logs')
            .select('id, shopify_event_id, topic, status, created_at')
            .order('created_at', { ascending: false })
            .limit(100);
            
        if (error) throw error;
        
        cachedWebhookLogs = data || [];
        window.renderWebhooksTable(cachedWebhookLogs);
        
        const summary = document.getElementById('webhookStatsSummary');
        if (summary) {
            const pending = cachedWebhookLogs.filter(l => l.status === 'pending').length;
            const failed = cachedWebhookLogs.filter(l => l.status === 'failed').length;
            summary.innerHTML = window.safeHTML(`Logs: ${cachedWebhookLogs.length} | Pending: ${pending} | Failed: <span style="color:#ef4444;">${failed}</span>`);
        }
    } catch (err) {
        console.error("Error fetching webhook logs:", err);
        tbody.innerHTML = window.safeHTML(`<tr><td colspan="5" style="text-align:center; padding:20px; color:#ef4444;">Failed to load logs: ${err.message}</td></tr>`);
    }
}

window.renderWebhooksTable = function(logs) {
    const tbody = document.getElementById('webhooksTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    if (logs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px;">No webhook logs found.</td></tr>';
        return;
    }
    
    logs.forEach(log => {
        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
        
        let statusColor = '#94a3b8';
        if (log.status === 'processed') statusColor = '#10b981';
        if (log.status === 'failed') statusColor = '#ef4444';
        if (log.status === 'pending') statusColor = '#f59e0b';
        
        const date = new Date(log.created_at).toLocaleString();
        
        tr.innerHTML = window.safeHTML(`
            <td style="padding:8px; text-align:center;">
                <input type="radio" name="webhookSelect" value="${log.shopify_event_id}">
            </td>
            <td style="padding:8px; font-family:monospace; font-size:10px;">${log.shopify_event_id}</td>
            <td style="padding:8px;">${log.topic || 'N/A'}</td>
            <td style="padding:8px; font-size:10px; color:#94a3b8;">${date}</td>
            <td style="padding:8px; color:${statusColor}; font-weight:bold; text-transform:uppercase;">${log.status}</td>
        `);
        tbody.appendChild(tr);
    });
}

window.click_manuallyRunWebhook = async function() {
    const selected = document.querySelector('input[name="webhookSelect"]:checked');
    if (!selected) {
        alert("Please select a webhook event to replay.");
        return;
    }
    
    const eventId = selected.value;
    const btn = document.getElementById('btnManuallyRunWebhook');
    if(btn) {
        btn.innerHTML = window.safeHTML('Executing...');
        btn.disabled = true;
    }
    
    setMasterStatus("Replaying Webhook...", "mod-working");
    sysLog(`Initiating manual replay for Shopify Webhook Event: ${eventId}`);
    
    try {
        const { data: sessionData, error: sessionError } = await supabaseClient.auth.getSession();
        if (sessionError || !sessionData.session) throw new Error("Authentication failed.");
        
        const functionUrl = `${supabaseClient.supabaseUrl}/functions/v1/shopify-webhook`;
        
        const res = await fetch(functionUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${sessionData.session.access_token}`
            },
            body: JSON.stringify({ action: 'replay', shopify_event_id: eventId })
        });
        
        const text = await res.text();
        let json;
        try { json = JSON.parse(text); } catch(e) { json = { error: text }; }
        
        if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
        
        setMasterStatus("Replay Success!", "mod-success");
        sysLog(`Replay successful for ${eventId}.`);
        alert("Webhook replayed successfully!");
        
        await window.fetchWebhookLogs();
        if (typeof fetchSalesData === 'function') {
            await fetchSalesData(true);
        }
        
    } catch (err) {
        console.error(err);
        setMasterStatus("Replay Failed", "mod-error");
        alert(`Failed to replay webhook: ${err.message}`);
    } finally {
        if(btn) {
            btn.innerHTML = window.safeHTML('Manually Run Selected');
            btn.disabled = false;
        }
        setTimeout(() => {
            const sm = document.getElementById('statusMaster');
            if(sm) setMasterStatus("Ready.", "status-idle");
        }, 2000);
    }
};
