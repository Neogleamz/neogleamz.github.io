// ==========================================
// NEOGLEAMZ MASTER FINANCE ENGINE
// The Single Source of Truth for all math.
// ==========================================

const ENGINE_CONFIG = {
    stripePercent: 0.029,
    stripeFlat: 0.30,
    flatShipping: 8.00 // Company's standard cost for a label
};

/**
 * SMART SEARCH: Finds the Master Recipe in the database, 
 * explicitly ignoring sub-components like boxes and raw parts.
 */
function findMasterRecipeKey(searchName) {
    if (typeof productsDB === 'undefined' || !productsDB || !searchName) return null;
    
    let cleanSearch = String(searchName).toUpperCase().replace(" ONLY", "").trim();
    let allKeys = Object.keys(productsDB);
    
    // 1. Exact Match
    let matchedKey = allKeys.find(k => k.toUpperCase() === cleanSearch);
    
    // 2. Smart Match (Ignore raw parts)
    if (!matchedKey) {
        matchedKey = allKeys.find(k => {
            let upK = k.toUpperCase();
            return upK.includes(cleanSearch) && 
                   !upK.includes("BOX") && 
                   !upK.includes("ACCESSOR") && 
                   !upK.includes("BUNDLE") && 
                   !upK.includes("PART");
        });
    }
    
    // 3. Fallback
    if (!matchedKey) {
        matchedKey = allKeys.find(k => k.toUpperCase().includes(cleanSearch));
    }
    
    return matchedKey;
}

/**
 * 1. THE COST TO BUILD: TRUE COGS
 * Always returns Raw Materials + Labor. Never duplicated elsewhere.
 */
function getEngineTrueCogs(productName) {
    let matchedKey = findMasterRecipeKey(productName);
    if (!matchedKey) return 0.00;
    
    // Always calculate "Live" from the BOM + Labor
    let cogs = calculateProductTotal(matchedKey);
    return isNaN(cogs) ? 0.00 : cogs;
}

/**
 * CORE BOM MATH: Recursively calculates the raw and labor breakdown of any product or sub-assembly.
 */
function calculateProductBreakdown(pName, visited = new Set()) {
    if (!pName || visited.has(pName)) return { raw: 0, labor: 0, print: 0, total: 0 };
    visited.add(pName);

    let totalRaw = 0;
    let totalLabor = 0;
    let totalPrintTime = 0;

    const components = productsDB[pName] || [];
    components.forEach(part => {
        const k = String(part.item_key || part.di_item_id || part.name || "");
        const q = parseFloat(part.qty || part.quantity) || 0;
        if (q <= 0) return;

        const cleanK = k.replace("RECIPE:::", "");
        const catalogItem = catalogByName[k] || catalogByName[cleanK];

        // 1. 3D PRINT METADATA (Recursion on Raw Goods level)
        if (catalogItem && catalogItem.is_3d_print) {
            totalPrintTime += (parseFloat(catalogItem.print_time_mins) || 0) * q;
        }

        // 2. SUB-ASSEMBLY RECURSION
        if (productsDB[cleanK]) {
            const sub = calculateProductBreakdown(cleanK, new Set(visited));
            totalRaw += (sub.raw * q);
            totalLabor += (sub.labor * q);
            totalPrintTime += (sub.print * q);
        } else {
            // 3. RAW MATERIAL COST
            if (catalogItem) {
                totalRaw += (parseFloat(catalogItem.avgUnitCost) || 0) * q;
            }
        }
    });

    // 4. ADD LOCAL LABOR
    if (laborDB[pName]) {
        const l = laborDB[pName];
        const ownLabor = (parseFloat(l.time || 0) / 60) * parseFloat(l.rate || 0);
        if (!isNaN(ownLabor)) totalLabor += ownLabor;
    }

    return { 
        raw: totalRaw, 
        labor: totalLabor, 
        print: totalPrintTime, 
        total: totalRaw + totalLabor 
    };
}

function calculateProductTotal(pName) { 
    return calculateProductBreakdown(pName).total; 
}

function getRawMaterials(pName, mult = 1, map = {}, vis = new Set()) { 
    if (vis.has(pName)) return map; 
    vis.add(pName); 
    (productsDB[pName] || []).forEach(part => { 
        let k = String(part.item_key || part.di_item_id || part.name || ""); 
        let q = (parseFloat(part.quantity || part.qty) || 1) * mult; 
        if (k.startsWith('RECIPE:::')) getRawMaterials(k.replace('RECIPE:::', ''), q, map, new Set(vis)); 
        else { map[k] = (map[k] || 0) + q; } 
    }); 
    return map; 
}

/**
 * 2. THE STICKER PRICE: LIVE MSRP
 * Hunts the database and strips out dollar signs/commas.
 */
function getEngineLiveMsrp(productName) {
    let matchedKey = findMasterRecipeKey(productName);
    if (!matchedKey) return 0.00;

    let pData = productsDB[matchedKey];
    
    // Cast a wide net for whatever your Supabase column is actually called
    let rawPrice = pData.msrp || pData.MSRP || pData.price || pData.retail_price || pData.retailPrice || pData.sale_price || 0;
    
    // Strip out any accidental $ or commas from the database string so JS can do math on it
    let cleanPrice = parseFloat(String(rawPrice).replace(/[^0-9.-]+/g,""));
    
    return isNaN(cleanPrice) ? 0.00 : cleanPrice;
}

/**
 * 3. THE PAYMENT TOLL: STRIPE FEES
 * Calculated on the GROSS total the customer pays (Price + Ship + Tax - Discounts).
 */
function getEngineStripeFee(grossCapturedAmount) {
    let amount = parseFloat(grossCapturedAmount) || 0;
    if (amount <= 0) return 0;
    return (amount * ENGINE_CONFIG.stripePercent) + ENGINE_CONFIG.stripeFlat;
}

/**
 * 4. THE VIABILITY CHECK: GROSS MARGIN
 * Raw MSRP minus Raw True COGS.
 */
function getEngineGrossMargin(productName) {
    let msrp = getEngineLiveMsrp(productName);
    let cogs = getEngineTrueCogs(productName);
    return msrp - cogs;
}

/**
 * 5. HISTORICAL ACTUALS: NET PROFIT
 * The exact cash kept on a real, historical order.
 */
function getHistoricalNetProfit(actualSalePrice, shippingCollected, taxCollected, totalDiscount, actualPostage, productName) {
    let totalCaptured = (actualSalePrice + shippingCollected + taxCollected) - totalDiscount;
    let stripeFee = getEngineStripeFee(totalCaptured);
    let cogs = getEngineTrueCogs(productName);
    
    return totalCaptured - taxCollected - stripeFee - actualPostage - cogs;
}

/**
 * 6. CUSTOMER OUT OF POCKET (OOP)
 * Calculates what the customer actually pays based on shipping threshold.
 */
function getEngineOOP(msrp, freeShipThreshold) {
    if (typeof freeShipThreshold !== 'number' || isNaN(freeShipThreshold)) freeShipThreshold = 999999;
    return msrp >= freeShipThreshold ? msrp : (msrp + ENGINE_CONFIG.flatShipping);
}

/**
 * 7. PREDICTIVE METRICS (CEO TERMINAL)
 * Returns the exact mathematical breakdown of a projected retail sale.
 */
function getEnginePredictiveMetrics(msrp, cogs, freeShipThreshold, cacFlat, affPercent, warrPercent) {
    let oop = getEngineOOP(msrp, freeShipThreshold);
    let stripeFee = getEngineStripeFee(oop);
    let affAmt = msrp * (affPercent / 100);
    let warrAmt = msrp * (warrPercent / 100);
    
    // Determines if shipping appears as a margin reduction visually
    let merchantShipCost = (oop > msrp) ? 0 : ENGINE_CONFIG.flatShipping;
    
    let netProfit = oop - cogs - ENGINE_CONFIG.flatShipping - stripeFee - affAmt - warrAmt - cacFlat;

    return {
        oop: Math.round(oop * 100) / 100,
        stripe: Math.round(stripeFee * 100) / 100,
        aff: Math.round(affAmt * 100) / 100,
        warr: Math.round(warrAmt * 100) / 100,
        ship: Math.round(ENGINE_CONFIG.flatShipping * 100) / 100,
        merchantShipMargin: Math.round(merchantShipCost * 100) / 100,
        net: Math.round(netProfit * 100) / 100
    };
}

// ==========================================
// CENTRAL KPI RENDER ENGINE (MIGRATED & AUDITED)
// ==========================================
function updateHubStats() {
    try {
        const setStat = (id, val) => { const el = document.getElementById(id); if (el) { el.innerText = val; el.classList.add('pulse-orange'); setTimeout(() => el.classList.remove('pulse-orange'), 4000); } };
        const fmtNum = (n) => (!isNaN(n) && n !== null) ? Number(n).toLocaleString() : n;
        const fmtMoney = (n) => (!isNaN(n) && n !== null) ? $ + Number(n).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2}) : n;

        // --- DATAZ ---
        if (typeof salesDB !== 'undefined') {
            let parcels = new Set(), totalPostage = 0, totalWt = 0;
            salesDB.forEach(s => {
                if (s.parcel_no) parcels.add(s.parcel_no);
                totalPostage += parseFloat(s.order_postage) || 0;
                totalWt += parseFloat(s.total_dist_weight_g) || 0;
            });
            setStat('statDatazRecords', fmtNum(salesDB.length));
            setStat('statDatazParcels', fmtNum(parcels.size));
            setStat('statDatazPaid', fmtMoney(totalPostage));
            setStat('statDatazWt', fmtNum(totalWt));
            setStat('statDatazAvg', totalWt > 0 ? fmtMoney(totalPostage / totalWt) : '.00');
        }

        // --- EDITZ ---
        if (typeof catalogCache !== 'undefined') {
            let cKeys = Object.keys(catalogCache);
            setStat('statEditzCat', fmtNum(cKeys.length));
            let cWt = 0, cVal = 0, miss = 0;
            cKeys.forEach(k => {
                let item = catalogCache[k];
                let qty = (typeof inventoryDB !== 'undefined' && inventoryDB[k]) ? Math.max(0, (inventoryDB[k].produced_qty || 0) - (inventoryDB[k].sold_qty || 0)) : 0;
                cWt += (parseFloat(item.unit_weight_g) || 0) * qty;
                cVal += (parseFloat(item.avgUnitCost) || parseFloat(item.unit_china_landed_price) || 0) * qty;
                if (!item.unit_weight_g || !item.sku) miss++;
            });
            setStat('statEditzWt', fmtNum(cWt));
            setStat('statEditzVal', fmtMoney(cVal));
            setStat('statEditzAvgCos', cKeys.length > 0 ? fmtMoney(cVal / cKeys.length) : '.00');
            setStat('statEditzMiss', fmtNum(miss));
        }

        // --- STOCKZ ---
        if (typeof inventoryDB !== 'undefined') {
            let keys = Object.keys(inventoryDB);
            setStat('statStockzSkus', fmtNum(keys.length));
            let fgiUnits = 0, alerts = 0, rawVal = 0, fgiVal = 0;
            keys.forEach(k => {
                let s = (inventoryDB[k].produced_qty || 0) - (inventoryDB[k].sold_qty || 0);
                if (s < 5) alerts++;
                if (!k.startsWith('RECIPE:::') && typeof catalogCache !== 'undefined' && catalogCache[k]) {
                    rawVal += Math.max(0, s) * (parseFloat(catalogCache[k].avgUnitCost) || 0);
                }
            });
            if (typeof productsDB !== 'undefined') {
                Object.keys(productsDB).forEach(p => {
                    let s = (inventoryDB[RECIPE::: + p]?.produced_qty || 0) - (inventoryDB[RECIPE::: + p]?.sold_qty || 0);
                    fgiUnits += Math.max(0, s);
                    fgiVal += Math.max(0, s) * getEngineTrueCogs(p); // AUDITED: USES ENGINE COGS
                });
            }
            setStat('statStockzUnits', fmtNum(fgiUnits));
            setStat('statStockzAlerts', fmtNum(alerts));
            setStat('statStockzRawVal', fmtMoney(rawVal));
            setStat('statStockzFgiVal', fmtMoney(fgiVal));
            setStat('statStockzTotalVal', fmtMoney(rawVal + fgiVal));
        }

        // --- RECIPEZ ---
        if (typeof productsDB !== 'undefined') {
            let keys = Object.keys(productsDB);
            setStat('statRecipezActive', fmtNum(keys.length));
            let maxCost = 0, missing = 0, totalMargin = 0, marginCount = 0;
            keys.forEach(p => {
                let cost = getEngineTrueCogs(p); // AUDITED: USES ENGINE COGS
                let msrp = getEngineLiveMsrp(p); // AUDITED: USES ENGINE MSRP
                if (cost > maxCost) maxCost = cost;
                
                let prod = productsDB[p];
                if (prod.bom) {
                    prod.bom.forEach(b => { if (typeof catalogCache !== 'undefined' && !catalogCache[b.id]) missing++; });
                }
                
                if (msrp > 0 && cost > 0) {
                    totalMargin += ((msrp - cost) / msrp) * 100;
                    marginCount++;
                }
            });
            setStat('statRecipezMargin', marginCount > 0 ? (totalMargin/marginCount).toFixed(1) + '%' : '0.0%');
            setStat('statRecipezCost', fmtMoney(maxCost));
            setStat('statRecipezMaster', keys.length > 0 ? String(keys[0]).substring(0,12) : 'NONE');
            setStat('statRecipezMissing', fmtNum(missing));
        }

        // --- BATCHEZ ---
        if (typeof workOrdersDB !== 'undefined') {
            let active = workOrdersDB.filter(w => w.status !== 'Completed');
            setStat('statBatchezBuilt', fmtNum(active.length));
            let units = 0, time = 0, val = 0, pulls = 0;
            active.forEach(w => {
                units += (w.qty || 0);
                val += (w.qty || 0) * getEngineTrueCogs(w.product_id); // AUDITED: USES ENGINE COGS
                if (w.materials_pulled) pulls++;
            });
            if (typeof printQueueDB !== 'undefined') {
                active.forEach(w => {
                    time += printQueueDB.filter(p => String(p.wo_id) === String(w.id) && !p.completed && !p.failed)
                        .reduce((sum, p) => sum + (p.expected_time_mins || 0), 0);
                });
            }
            setStat('statBatchezUnits', fmtNum(units));
            setStat('statBatchezComps', pulls + '/' + active.length);
            setStat('statBatchezTime', fmtNum(Math.round(time/60)) + ' hrs');
            setStat('statBatchezVal', fmtMoney(val));
        }

        // --- LAYERZ ---
        if (typeof printQueueDB !== 'undefined') {
            let active = printQueueDB.filter(p => !p.completed && !p.failed);
            let done = printQueueDB.filter(p => p.completed && !p.failed).length;
            setStat('statLayerzJobs', fmtNum(active.filter(p => p.status === 'Printing').length));
            setStat('statLayerzDone', fmtNum(done));
            setStat('statLayerzPending', fmtNum(active.filter(p => p.status === 'Queued').length));
            
            let mat = 0, hrs = 0;
            active.forEach(p => {
                hrs += (p.expected_time_mins || 0);
                if (p.component_id && typeof catalogCache !== 'undefined') {
                    mat += (catalogCache[p.component_id]?.unit_weight_g || 0) * (p.qty || 1);
                }
            });
            setStat('statLayerzMat', fmtNum(Math.round(mat)));
            setStat('statLayerzScrap', fmtNum(Math.round(hrs/60)));
        }

        // --- ORDERZ ---
        if (typeof salesDB !== 'undefined') {
            setStat('statOrderzTotal', fmtNum(salesDB.length));
            let units = 0, shopify = 0, etsy = 0, val = 0;
            salesDB.forEach(s => {
                units += (s.quantity || 1);
                val += parseFloat(s.total) || 0;
                let so = (s.source || "").toLowerCase();
                if (so.includes("shopify")) shopify++;
                if (so.includes("etsy")) etsy++;
            });
            setStat('statOrderzUnits', fmtNum(units));
            setStat('statOrderzShopify', fmtNum(shopify));
            setStat('statOrderzEtsy', fmtNum(etsy));
            setStat('statOrderzVal', fmtMoney(val));
        }

        // --- STATZ ---
        if (typeof salesDB !== 'undefined') {
            let rev = 0, exp = 0, actualNet = 0;
            salesDB.forEach(s => {
                let rawTotal = parseFloat(s.total) || 0;
                let tax = parseFloat(s.tax) || 0;
                let postage = parseFloat(s.order_postage) || 0;
                let shipCollected = parseFloat(s.shipping_collected) || 0;
                let discount = parseFloat(s.discount) || 0;
                
                // AUDITED: Historical Engine Net Profit call
                let pName = s.neogleamz_product || s.item_name;
                let cogs = getEngineTrueCogs(pName);
                
                // Add revenue and expenses
                rev += rawTotal;
                exp += cogs;
                
                actualNet += getHistoricalNetProfit(rawTotal, shipCollected, tax, discount, postage, pName);
            });
            let roi = exp > 0 ? (actualNet / exp) * 100 : 0;
            setStat('statStatzRev', fmtMoney(rev));
            setStat('statStatzNet', fmtMoney(actualNet)); // REAL MATHEMATICAL NET PROFIT
            setStat('statStatzRoi', roi.toFixed(1) + '%');
            setStat('statStatzAvgProf', salesDB.length > 0 ? fmtMoney(actualNet / salesDB.length) : '.00');
            setStat('statStatzRawExp', fmtMoney(exp));
        }

        // --- SIMULATORZ ---
        if (typeof productsDB !== 'undefined') {
            let keys = Object.keys(productsDB);
            if (keys.length > 0) {
                // Determine an average predictive profile across all master products
                let totNet = 0, totMsrp = 0, totShip = 0;
                keys.forEach(p => {
                    let msrp = getEngineLiveMsrp(p);
                    let cogs = getEngineTrueCogs(p);
                    let sim = getEnginePredictiveMetrics(msrp, cogs, 75.00, 0, 0, 0); // Assuming  free shipping
                    totNet += sim.net;
                    totMsrp += msrp;
                    totShip += sim.merchantShipMargin;
                });
                let avgNet = totNet / keys.length;
                let avgMsrp = totMsrp / keys.length;
                let avgMargin = avgMsrp > 0 ? (avgNet / avgMsrp) * 100 : 0;
                
                setStat('statSimzCac', '.00'); // Requires manual slider input later
                setStat('statSimzMarg', avgMargin.toFixed(1) + '%');
                setStat('statSimzShip', fmtMoney(totShip / keys.length));
                setStat('statSimzLev', 'LOCKED');
                setStat('statSimzHealth', 'OPTIMAL');
            } else {
                setStat('statSimzCac', '.00'); 
                setStat('statSimzMarg', '--');
                setStat('statSimzShip', '--');
                setStat('statSimzLev', '--');
                setStat('statSimzHealth', 'NO ALIAS');
            }
        }

        // --- IMPORTZ ---
        let syncCount = localStorage.getItem('statImpzSyncs') || 0;
        setStat('statImpzSyncs', fmtNum(parseInt(syncCount)));
        if (typeof finalResults !== 'undefined') {
            let capex = 0, customs = 0, freight = 0, weight = 0, pkgs = new Set();
            finalResults.forEach(r => {
                capex += parseFloat(r['Order Total']) || parseFloat(r.order_total) || 0;
                weight += parseFloat(r['Actual Chargeable Weight (g)']) || parseFloat(r.actual_chargeable_weight_g) || 0;
                let pno = r['Parcel No'] || r.parcel_no;
                if (pno && !pkgs.has(pno)) {
                    pkgs.add(pno);
                    customs += parseFloat(r['Custom Clearance Fee']) || parseFloat(r.custom_clearance_fee) || 0;
                    freight += parseFloat(r['Actual Shipping Fee']) || parseFloat(r.actual_shipping_fee) || 0;
                }
            });
            setStat('statImpzSpend', fmtMoney(capex));
            setStat('statImpzCus', fmtMoney(customs));
            setStat('statImpzShip', fmtMoney(freight));
            setStat('statImpzWt', fmtNum(weight));
        } else {
            setStat('statImpzSpend', '--');
            setStat('statImpzCus', '--');
            setStat('statImpzShip', '--');
            setStat('statImpzWt', '--');
        }

        // --- SALEZ (SYNC) ---
        if (typeof aliasDB !== 'undefined') {
            let mapped = Object.keys(aliasDB).length;
            setStat('statSalzTotal', fmtNum(mapped));
            
            let unmappedS = 0, unmappedE = 0, rev24 = 0;
            if (typeof salesDB !== 'undefined') {
                let now = new Date();
                salesDB.forEach(s => {
                    let dt = new Date(s.date);
                    if ((now - dt) < 86400000) rev24 += parseFloat(s.total) || 0;
                    if (!aliasDB[s.storefront_sku]) {
                        let src = (s.source||"").toLowerCase();
                        if (src.includes('shopify')) unmappedS++;
                        if (src.includes('etsy')) unmappedE++;
                    }
                });
            }
            setStat('statSalzUnShop', fmtNum(unmappedS));
            setStat('statSalzUnEtsy', fmtNum(unmappedE));
            setStat('statSalz24h', fmtMoney(rev24));
            setStat('statSalzHealth', (unmappedS + unmappedE) === 0 ? 'NOMINAL' : 'UNMAPPED ALIAS');
        }

        // --- BRAINZ ---
        setStat('statBrnzSync', (performance.now() / 1000).toFixed(2) + 's');
        setStat('statBrnzCache', fmtNum(document.getElementsByTagName('*').length) + ' Nodes');
        let lastSync = localStorage.getItem('lastBrainSync') || 'NEVER';
        let tDiff = lastSync !== 'NEVER' ? Math.round((Date.now() - parseInt(lastSync))/60000) + 'm ago' : lastSync;
        setStat('statBrnzBack', tDiff);
        setStat('statBrnzBld', 'V.3.1.5');
        setStat('statBrnzErr', typeof systemErrorState !== 'undefined' && systemErrorState ? 'ACTIVE FAULT' : '0');

    } catch(e) { console.warn("Hub Stats Sync Error:", e); }
}
