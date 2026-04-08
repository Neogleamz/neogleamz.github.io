// ==========================================
// SYSTEM CONFIGURATIONS
// ==========================================
window.NEOGLEAMZ_CONFIG = {
    STRIPE_PERCENTAGE: 0.029,
    STRIPE_FLAT_FEE: 0.30,
    EBAY_BLENDED_FEE: 0.2388,
    DEFAULT_SHIPPING_COST: 8.00
};

// ==========================================
// GLOBAL ERROR HANDLERS
// ==========================================
window.addEventListener('error', (event) => {
    console.error('System Error:', event.error);
    if (typeof sysLog === 'function') {
        sysLog(`System Fault: ${event.error?.message || 'Unknown Error'}`, true);
    }
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled Promise Rejection:', event.reason);
    if (typeof sysLog === 'function') {
        sysLog(`Network/Promise Fault: ${event.reason?.message || 'Unknown Reason'}`, true);
    }
});
// ==========================================
// SECURITY TOOLS
// ==========================================
window.safeHTML = function(dirtyHTML) {
    if (typeof DOMPurify !== 'undefined') {
        return DOMPurify.sanitize(dirtyHTML);
    }
    // Fallback if DOMPurify failed to load
    console.warn("DOMPurify not loaded. Using fallback HTML escaper.");
    const div = document.createElement('div');
    div.innerText = dirtyHTML;
    return div.innerHTML;
};

/**
 * Recursively calculates the exact raw material and labor cost of any given Recipe.
 * Uses optional chaining and null-coalescing to prevent faults on undefined references.
 * @param {string} pName - The internal recipe name to resolve.
 * @returns {{raw: number, labor: number, total: number}} Cost breakdown object.
 */
window.calculateProductBreakdown = function(pName) {
    let res = { raw: 0, labor: 0, total: 0 };
    if (!pName || typeof productsDB === 'undefined' || !productsDB[pName]) return res;
    
    const components = productsDB[pName] || [];
    components.forEach(item => {
        let key = item?.item_key || item?.di_item_id || item?.name;
        if (!key) return; // Prevent crashes on empty objects

        let qty = parseFloat(item?.quantity || item?.qty) || 1;
        if (key.startsWith('RECIPE:::')) {
            let sub = window.calculateProductBreakdown(key.replace('RECIPE:::', ''));
            res.raw += (sub?.total || 0) * qty; 
        } else if (typeof catalogCache !== 'undefined' && catalogCache[key]) {
            res.raw += (parseFloat(catalogCache[key]?.avgUnitCost) || 0) * qty;
        }
    });
    
    if (typeof laborDB !== 'undefined' && laborDB[pName]) {
        let l = laborDB[pName];
        res.labor = ((parseFloat(l?.time) || 0) / 60) * (parseFloat(l?.rate) || 0);
    }
    
    res.total = res.raw + res.labor;
    return res;
};

/**
 * Convenience wrapper returning just the Total True Cost of Goods Sold.
 * @param {string} pName - Internal recipe name.
 * @returns {number} The total COGS.
 */
window.getEngineTrueCogs = function(pName) { return window.calculateProductBreakdown(pName).total; };
window.calculateProductTotal = window.getEngineTrueCogs;

/**
 * Calculates platform transaction fees based dynamically on the parsed metric configurations.
 * @param {number} amt - Total Capture Amount string stripped into pure float.
 * @param {string} [source="web"] - Sales channel (eBay, web, etc.)
 * @returns {number} The computed transaction overhead.
 */
window.getEngineStripeFee = function(amt, source) { 
    if (source && String(source).toLowerCase().includes('ebay')) {
        return (parseFloat(amt) || 0) * window.NEOGLEAMZ_CONFIG.EBAY_BLENDED_FEE; 
    }
    return ((parseFloat(amt) || 0) * window.NEOGLEAMZ_CONFIG.STRIPE_PERCENTAGE) + window.NEOGLEAMZ_CONFIG.STRIPE_FLAT_FEE; 
};

window.getEngineLiveMsrp = function(pName) { return typeof pricingDB !== 'undefined' && pricingDB[pName] ? parseFloat(pricingDB[pName]?.msrp) || 0 : 0; };

/**
 * Primary engine formula for generating explicit Net Profit figures from raw CSV captures.
 * @param {number} gross - The base gross revenue of the specific line items.
 * @param {number} shipCol - Displayed shipping collected from the customer.
 * @param {number} tax - Collected tax.
 * @param {number} disc - Total promotional discount string.
 * @param {number} actShip - The physical flat rate or calculated cost to ship the order.
 * @param {string} pName - The specific tracked Recipe name.
 * @param {number} [qty=1] - Quantity sold of this specific line item.
 * @param {string} [source="web"] - Web/eBay source for Stripe fee modulation.
 * @returns {number} Accurate single-instance net profit.
 */
window.getHistoricalNetProfit = function(gross, shipCol, tax, disc, actShip, pName, qty = 1, source = "web") {
    let captured = (parseFloat(gross) || 0) + (parseFloat(shipCol) || 0) + (parseFloat(tax) || 0) - (parseFloat(disc) || 0);
    let fee = window.getEngineStripeFee(captured, source);
    let cogs = window.getEngineTrueCogs(pName) * (parseFloat(qty) || 1);
    return (parseFloat(gross) || 0) + (parseFloat(shipCol) || 0) - (parseFloat(disc) || 0) - fee - (parseFloat(actShip) || 0) - cogs;
};

/**
 * Generates forward-looking metrics anticipating marketing spend, warranty burden, and margin health.
 */
window.getEnginePredictiveMetrics = function(msrp, cogs, fsThreshold, cac, aff, warr) {
    let sCol = (parseFloat(msrp) || 0) >= (parseFloat(fsThreshold) || 0) ? 0 : window.NEOGLEAMZ_CONFIG.DEFAULT_SHIPPING_COST;
    let aShip = window.NEOGLEAMZ_CONFIG.DEFAULT_SHIPPING_COST; 
    let fee = window.getEngineStripeFee((parseFloat(msrp) || 0) + sCol, "web");
    let net = (parseFloat(msrp) || 0) + sCol - (parseFloat(cogs) || 0) - fee - aShip - (parseFloat(cac) || 0) - (parseFloat(aff) || 0) - (parseFloat(warr) || 0);
    let margin = msrp > 0 ? (net / msrp) * 100 : 0;
    return { net: net, stripe: fee, aff: aff, cac: cac, warr: warr, margin: margin, ship: sCol, oop: msrp + sCol, merchantShipMargin: sCol - aShip };
};

// ==========================================
// CENTRAL KPI RENDER ENGINE (MIGRATED & AUDITED)
// ==========================================
function updateHubStats() {
    try {
        const setStat = (id, val) => { const el = document.getElementById(id); if (el) { el.innerText = val; el.classList.add('pulse-orange'); setTimeout(() => el.classList.remove('pulse-orange'), 4000); } };
        const fmtNum = (n) => (!isNaN(n) && n !== null) ? Number(n).toLocaleString() : n;
        const fmtMoney = (n) => (!isNaN(n) && n !== null) ? '$' + Number(n).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2}) : n;

        // --- DATAZ ---
        if (typeof finalResults !== 'undefined') {
            let parcels = new Set(), totalWt = 0;
            let absoluteRawSpend = 0, pureGoodsCost = 0;
            finalResults.forEach(s => {
                let pno = s['Parcel No'];
                if (pno && String(pno).trim().toUpperCase() !== 'MANUAL') {
                    if (!parcels.has(pno)) {
                        parcels.add(pno);
                        totalWt += parseFloat(s['Actual Chargeable Weight (g)']) || 0;
                    }
                }
                
                absoluteRawSpend += parseFloat(s['Total Landed Cost ($)']) || 0;
                
                let uCost = parseFloat(s['Order Unit Price']) || parseFloat(s.order_unit_price) || 0;
                let qVal = parseFloat(s['Quantity']) || parseFloat(s.quantity) || 1;
                pureGoodsCost += uCost > 0 ? (uCost * qVal) : (parseFloat(s['Order Total']) || parseFloat(s.order_total) || 0);
            });
            
            let totalLogisticsSpend = absoluteRawSpend - pureGoodsCost;
            if (totalLogisticsSpend < 0) totalLogisticsSpend = 0; // Safeguard
            
            setStat('statDatazRecords', fmtNum(finalResults.length));
            setStat('statDatazParcels', fmtNum(parcels.size));
            setStat('statDatazPaid', fmtMoney(totalLogisticsSpend));
            setStat('statDatazWt', fmtNum(totalWt));
            setStat('statDatazTotalCost', fmtMoney(absoluteRawSpend));
        }

        // --- EDITZ ---
        if (typeof catalogCache !== 'undefined') {
            let cKeys = Object.keys(catalogCache);
            let prints = 0;
            let usedSet = new Set();
            if(typeof productsDB !== 'undefined'){
                Object.values(productsDB).forEach(pArr => {
                    pArr.forEach(c => usedSet.add(c.item_key || c.di_item_id || c.name));
                });
            }
            let assigned = 0;
            cKeys.forEach(k => { 
                if (catalogCache[k].is_3d_print) prints++; 
                if (usedSet.has(k)) assigned++;
            });
            setStat('statEditzComps', fmtNum(cKeys.length));
            setStat('statEditzPrints', fmtNum(prints));
            setStat('statEditzRaw', fmtNum(cKeys.length - prints));
            setStat('statEditzAssigned', fmtNum(assigned));
            setStat('statEditzOrphan', fmtNum(cKeys.length - assigned));
        }

        // --- STOCKZ ---
        if (typeof inventoryDB !== 'undefined') {
            let fgiUnits = 0, alerts = 0, fgiVal = 0, rawCount = 0;
            
            if (typeof catalogCache !== 'undefined') {
                Object.keys(catalogCache).forEach(k => {
                    let c = catalogCache[k];
                    let i = inventoryDB[k] || {consumed_qty:0, manual_adjustment:0, min_stock:0, scrap_qty:0};
                    let s = (c.totalQty || 0) - (i.consumed_qty || 0) - (i.scrap_qty || 0) + (i.manual_adjustment || 0);
                    if (s < (i.min_stock || 0)) alerts++;
                    rawCount += Math.max(0, s);
                });
            }

            if (typeof productsDB !== 'undefined') {
                Object.keys(productsDB).forEach(p => {
                    let k = `RECIPE:::` + p;
                    let i = inventoryDB[k] || {produced_qty:0, sold_qty:0};
                    let s = (i.produced_qty || 0) - (i.sold_qty || 0);
                    if (!isSubassemblyDB[p]) {
                        fgiUnits += Math.max(0, s);
                    }
                    fgiVal += Math.max(0, s) * getEngineTrueCogs(p); 
                    if (s < 0) alerts++;
                });
            }

            // --- MAX POTENTIAL YIELD SIMULATION ---
            let maxOverallYield = 0;
            if (typeof productsDB !== 'undefined' && typeof catalogCache !== 'undefined') {
                let simStock = {};
                // Load Raw Materials
                Object.keys(catalogCache).forEach(k => {
                    let i = inventoryDB[k] || {consumed_qty:0, manual_adjustment:0, min_stock:0, scrap_qty:0};
                    simStock[k] = (catalogCache[k].totalQty || 0) - (i.consumed_qty || 0) - (i.scrap_qty || 0) + (i.manual_adjustment || 0);
                });
                // Load Pre-Built Subassemblies
                Object.keys(productsDB).filter(p => isSubassemblyDB[p]).forEach(p => {
                    let k = `RECIPE:::` + p;
                    let i = inventoryDB[k] || {produced_qty:0, sold_qty:0};
                    simStock[k] = (i.produced_qty || 0) - (i.sold_qty || 0);
                });

                function simCanBuild(recipeName, stockTracker) {
                    let tempStock = {...stockTracker};
                    if (!productsDB[recipeName] || productsDB[recipeName].length === 0) return false;
                    for (let comp of productsDB[recipeName]) {
                        let compKey = comp.item_key || comp.di_item_id || comp.name;
                        let reqQty = parseFloat(comp.quantity) || 1;
                        if (String(compKey).startsWith('RECIPE:::')) {
                            let subName = String(compKey).replace('RECIPE:::', '');
                            let availablePrebuilt = tempStock[compKey] || 0;
                            if (availablePrebuilt >= reqQty) {
                                tempStock[compKey] -= reqQty;
                            } else {
                                let needed = reqQty - availablePrebuilt;
                                tempStock[compKey] = 0;
                                for (let i = 0; i < needed; i++) {
                                    if (!simCanBuild(subName, tempStock)) return false;
                                }
                            }
                        } else {
                            if ((tempStock[compKey] || 0) < reqQty) return false;
                            tempStock[compKey] -= reqQty;
                        }
                    }
                    Object.keys(tempStock).forEach(k => stockTracker[k] = tempStock[k]);
                    return true;
                }

                let buildable = true;
                let retailRecipes = Object.keys(productsDB).filter(p => !isSubassemblyDB[p]);
                let loopGuard = 0;
                while (buildable && retailRecipes.length > 0 && loopGuard < 100000) {
                    loopGuard++;
                    let builtAny = false;
                    for (let p of retailRecipes) {
                        if (simCanBuild(p, simStock)) {
                            maxOverallYield++;
                            builtAny = true;
                        }
                    }
                    if (!builtAny) buildable = false;
                }
            }
            
            setStat('statStockzUnits', fmtNum(fgiUnits));
            setStat('statStockzAlerts', fmtNum(alerts));
            setStat('statStockzFgiVal', fmtMoney(fgiVal));
            setStat('statStockzMaxYield', fmtNum(maxOverallYield));
            setStat('statStockzRawCount', fmtNum(rawCount));
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
            let active = workOrdersDB.filter(w => w.status !== 'Completed' && w.status !== 'Archived');
            setStat('statBatchezBuilt', fmtNum(active.length));
            let units = 0, laborMins = 0, msrpVal = 0, pulls = 0;
            active.forEach(w => {
                let q = (w.qty || 0);
                units += q;
                let lTime = typeof laborDB !== 'undefined' && laborDB[w.product_name] ? laborDB[w.product_name].time : 0;
                let pMsrp = typeof pricingDB !== 'undefined' && pricingDB[w.product_name] ? pricingDB[w.product_name].msrp : 0;
                laborMins += q * (parseFloat(lTime) || 0);
                msrpVal += q * (parseFloat(pMsrp) || 0);
                if (w.materials_pulled) pulls++;
            });
            setStat('statBatchezUnits', fmtNum(units));
            setStat('statBatchezComps', pulls + '/' + active.length);
            setStat('statBatchezTime', fmtNum(Math.round(laborMins/60)) + ' hrs');
            setStat('statBatchezVal', fmtMoney(msrpVal));
        }

        // --- LAYERZ ---
        if (typeof printQueueDB !== 'undefined') {
            let active = printQueueDB.filter(p => !p.completed && !p.failed && p.status !== 'Archived');
            let done = printQueueDB.filter(p => p.completed && !p.failed && p.status !== 'Archived').length;
            setStat('statLayerzJobs', fmtNum(active.filter(p => p.status === 'Printing').length));
            setStat('statLayerzDone', fmtNum(done));
            setStat('statLayerzPending', fmtNum(active.filter(p => p.status === 'Queued').length));
            
            // Universal Recursive BOM Time Aggregator
            window.getPrintTime = function(partName) {
                let cat = typeof catalogByName !== 'undefined' ? catalogByName[partName] : null;
                if (cat && parseFloat(cat.print_time_mins) > 0) return parseFloat(cat.print_time_mins);
                
                let recipe = typeof productsDB !== 'undefined' ? productsDB[partName] : null;
                if (recipe) {
                    if (parseFloat(recipe.print_time_mins) > 0) return parseFloat(recipe.print_time_mins);
                    let total = 0;
                    recipe.forEach(comp => {
                        let k = String(comp.item_key || comp.di_item_id || comp.name);
                        let q = parseFloat(comp.quantity || comp.qty) || 1;
                        if (k.startsWith('RECIPE:::')) {
                            total += (window.getPrintTime(k.replace('RECIPE:::', '')) * q);
                        } else {
                            let cc = typeof catalogByName !== 'undefined' ? catalogByName[k] : null;
                            if (cc && cc.is_3d_print) {
                                total += (parseFloat(cc.print_time_mins) || 0) * q;
                            }
                        }
                    });
                    return total;
                }
                return 0;
            };

            let mat = 0, hrs = 0;
            active.forEach(p => {
                let pt = window.getPrintTime(p.part_name);
                let wt = 0;
                let cat = typeof catalogByName !== 'undefined' ? catalogByName[p.part_name] : null;
                if (cat) wt = parseFloat(cat.unit_weight_g) || 0;
                
                hrs += (pt * (p.qty || 1));
                mat += (wt * (p.qty || 1));
            });
            setStat('statLayerzMat', fmtNum(Math.round(mat)));

            let total_farm_produced = 0;
            let total_farm_scrap = 0;
            if (typeof productsDB !== 'undefined' && typeof inventoryDB !== 'undefined') {
                Object.keys(productsDB).forEach(pName => {
                    let is3D = !!(productsDB[pName] && productsDB[pName].is_3d_print);
                    if(is3D) {
                        let k = `RECIPE:::${pName}`;
                        let i = inventoryDB[k] || {};
                        total_farm_produced += (parseFloat(i.produced_qty) || 0) + (parseFloat(i.prototype_produced_qty) || 0);
                        total_farm_scrap += parseFloat(i.scrap_qty) || 0;
                    }
                });
            }
            if(total_farm_produced > 0) {
                let farm_yield = ((total_farm_produced - total_farm_scrap) / total_farm_produced) * 100;
                setStat('statLayerzScrap', farm_yield.toFixed(1) + '%');
            } else {
                setStat('statLayerzScrap', '100%');
            }
        }

        // --- ORDERZ ---
        // --- ORDERZ ---
        let pArray = window.processedSalesDB;
        let pTotals = window.salesEngineTotals;
        if (pArray && pTotals) {
            let shopify = 0;
            pArray.forEach(s => {
                let so = (s.Source || "").toLowerCase();
                if (so.includes("shopify")) shopify++;
            });
            let orderCount = new Set(pArray.map(x => x.order_id)).size;
            setStat('statOrderzTotal', fmtNum(orderCount));
            
            // Exclude purely non-revenue transactions from diluting the AON
            let validAonOrders = new Set(pArray.filter(x => 
                !x.isCostOnlyItem && 
                !x.isRevenueTransfer && 
                x.transaction_type !== 'Pre-Ship Exchange'
            ).map(x => x.order_id)).size;
            let aon = validAonOrders > 0 ? (pTotals.net / validAonOrders) : 0;
            setStat('statOrderzUnits', fmtNum(pTotals.units || 0));
            setStat('statOrderzShopify', fmtNum(shopify));
            setStat('statOrderzAon', fmtMoney(aon));
            setStat('statOrderzBurden', (pTotals.burdenPct || 0).toFixed(1) + '%');
        } else if (typeof salesDB !== 'undefined') {
            setStat('statOrderzTotal', fmtNum(salesDB.length));
            let units = 0, shopify = 0, val = 0;
            salesDB.forEach(s => {
                units += (s.quantity || 1);
                val += parseFloat(s.total) || 0;
                let so = (s.source || "").toLowerCase();
                if (so.includes("shopify")) shopify++;
            });
            let aon = salesDB.length > 0 ? (val / salesDB.length) : 0;
            setStat('statOrderzUnits', fmtNum(units));
            setStat('statOrderzShopify', fmtNum(shopify));
            setStat('statOrderzAon', fmtMoney(aon));
            setStat('statOrderzVal', fmtMoney(val));
        }

        // --- STATZ ---
        if (typeof salesDB !== 'undefined') {
            // Inherit the precisely normalized master Engine logic to guarantee 100% uniformity
            let totals = window.salesEngineTotals || { captured: 0, cogs: 0, net: 0, count: salesDB.length || 1 };
            
            let roi = totals.cogs > 0 ? (totals.net / totals.cogs) * 100 : 0;
            let avgYield = totals.count > 0 ? (totals.net / totals.count) : 0;
            
            setStat('statStatzRev', fmtMoney(totals.captured));
            setStat('statStatzNet', fmtMoney(totals.net)); // REAL MATHEMATICAL NET PROFIT
            setStat('statStatzRoi', roi.toFixed(1) + '%');
            setStat('statStatzAvgProf', fmtMoney(avgYield));
            setStat('statStatzRawExp', fmtMoney(totals.cogs));
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
                    let sim = getEnginePredictiveMetrics(msrp, cogs, 75.00, 0, 0, 0); // Assuming $75 free shipping
                    totNet += sim.net;
                    totMsrp += msrp;
                    totShip += sim.merchantShipMargin;
                });
                let avgNet = totNet / keys.length;
                let avgMsrp = totMsrp / keys.length;
                let avgMargin = avgMsrp > 0 ? (avgNet / avgMsrp) * 100 : 0;
                
                setStat('statSimzCac', '$0.00'); // Requires manual slider input later
                setStat('statSimzMarg', avgMargin.toFixed(1) + '%');
                setStat('statSimzShip', fmtMoney(totShip / keys.length));
                setStat('statSimzLev', 'LOCKED');
                setStat('statSimzHealth', 'OPTIMAL');
            } else {
                setStat('statSimzCac', '$0.00'); 
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
            let absoluteRawSpend = 0, pureGoodsCost = 0;
            
            finalResults.forEach(r => {
                let uCost = parseFloat(r['Order Unit Price']) || parseFloat(r.order_unit_price) || 0;
                let qVal = parseFloat(r['Quantity']) || parseFloat(r.quantity) || 1;
                let goodsCost = uCost > 0 ? (uCost * qVal) : (parseFloat(r['Order Total']) || parseFloat(r.order_total) || 0);
                capex += goodsCost;
                
                absoluteRawSpend += parseFloat(r['Total Landed Cost ($)']) || parseFloat(r.total_cost_weight) || 0;
                pureGoodsCost += goodsCost;

                let pno = r['Parcel No'] || r.parcel_no;
                if (pno && String(pno).trim().toUpperCase() !== 'MANUAL') {
                    if (!pkgs.has(pno)) {
                        pkgs.add(pno);
                        customs += parseFloat(r['Custom Clearance Fee']) || parseFloat(r.custom_clearance_fee) || 0;
                        weight += parseFloat(r['Actual Chargeable Weight (g)']) || parseFloat(r.actual_chargeable_weight_g) || 0;
                    }
                }
            });
            
            freight = absoluteRawSpend - pureGoodsCost;
            if (freight < 0) freight = 0;
            
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
            setStat('statSalzMap', fmtNum(mapped));
            
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
        
        // --- FULFILLZ ---
        if (typeof fetchUnfulfilledOrders === 'function') fetchUnfulfilledOrders();
    } catch(e) { console.warn("Hub Stats Sync Error:", e); }
}

// ==========================================
// UNIVERSAL UI FLEX-BOM RESIZER
// ==========================================
let isNeoSidebarResizing = false;
let activeResizingSidebarId = null;

window.initNeoSidebarResizer = function(e) {
    if(e) e.preventDefault();
    isNeoSidebarResizing = true;
    document.body.style.cursor = 'ew-resize';
    document.addEventListener('mousemove', window.doNeoSidebarResize);
    document.addEventListener('mouseup', window.stopNeoSidebarResize);
};

window.doNeoSidebarResize = function(e) {
    if(!isNeoSidebarResizing) return;
    
    const layouts = document.querySelectorAll('.bom-layout');
    let activeWrapper = null;
    let sidebar = null;
    
    for (let layout of layouts) {
        if (layout.offsetParent !== null) { // is visible
            const s = layout.querySelector('.bom-sidebar');
            if (s) {
                activeWrapper = layout;
                sidebar = s;
                break;
            }
        }
    }
    
    // Fallback logic for Packerz custom modal split
    if(!sidebar && document.getElementById('packerzLiveSopSplitWrapper')?.offsetParent !== null) {
        activeWrapper = document.getElementById('packerzLiveSopSplitWrapper');
        sidebar = document.getElementById('packerzLiveSopLeftPane');
    }
    
    // Fallback logic for Packerz Terminal Main Kanban Board
    if(!sidebar && document.getElementById('packerzKanbanWrapper')?.offsetParent !== null) {
        activeWrapper = document.getElementById('packerzKanbanWrapper');
        sidebar = document.getElementById('packerzKanbanLeftCol');
    }
    
    if (!sidebar || !activeWrapper) return;
    
    const rect = activeWrapper.getBoundingClientRect();
    const paddingLeft = parseFloat(window.getComputedStyle(activeWrapper).paddingLeft) || 0;
    let newWidth = e.clientX - rect.left - paddingLeft;
    
    if (newWidth < 280) newWidth = 280;
    if (newWidth > rect.width - 250) newWidth = rect.width - 250; // Dynamic guard against crushing the right pane
    
    // Absolute max guard only applies to standard BOM sidebars, not 50/50 Kanbans
    if (activeWrapper.classList.contains('bom-layout')) {
        if (newWidth > 700) newWidth = 700; 
    }
    
    // Track active ID for local caching
    if (sidebar.id) activeResizingSidebarId = sidebar.id;
    
    // Aggressive CSS math overrides
    sidebar.style.width = newWidth + 'px';
    sidebar.style.minWidth = newWidth + 'px';
    sidebar.style.flex = `0 0 ${newWidth}px`;
};

window.stopNeoSidebarResize = function(e) {
    if (isNeoSidebarResizing && activeResizingSidebarId) {
        const p = document.getElementById(activeResizingSidebarId);
        if (p) {
            localStorage.setItem(`neoResizer_${activeResizingSidebarId}`, p.style.width);
        }
    }
    
    isNeoSidebarResizing = false;
    activeResizingSidebarId = null;
    document.body.style.cursor = '';
    document.removeEventListener('mousemove', window.doNeoSidebarResize);
    document.removeEventListener('mouseup', window.stopNeoSidebarResize);
};

window.restoreNeoSidebarSizes = function() {
    const idsToRestore = [
        'packerzKanbanLeftCol', 
        'packerzLiveSopLeftPane', 
        'barcodzSidebar', 
        'labelzSidebar',
        'recipezSidebar', 
        'batchezSidebar', 
        'layerzSidebar',
        'ceo-sidebar'
    ];
    
    for (let id of idsToRestore) {
        const cachedWidth = localStorage.getItem(`neoResizer_${id}`);
        if (cachedWidth) {
            const el = document.getElementById(id);
            if (el) {
                el.style.width = cachedWidth;
                el.style.minWidth = cachedWidth;
                el.style.flex = `0 0 ${cachedWidth}`;
            }
        }
    }
};

// Fire on Engine Boot
document.addEventListener('DOMContentLoaded', window.restoreNeoSidebarSizes);
window.restoreNeoSidebarSizes(); // Fire immediately just in case DOM is already loaded

// ==========================================
// UNIVERSAL UI DROPDOWN MEMORY
// ==========================================
window.initNeoDropdownMemory = function() {
    const selects = document.querySelectorAll('.neo-cache-select');
    selects.forEach(select => {
        if(!select.id) return;
        
        // Restore from cache if exists
        const cachedVal = localStorage.getItem(`neoSelect_${select.id}`);
        if(cachedVal) {
            select.value = cachedVal;
        }
        
        // Listen for future changes
        select.addEventListener('change', function(e) {
            localStorage.setItem(`neoSelect_${e.target.id}`, e.target.value);
            
            // Re-trigger global resize/render hooks if they exist on the element (React/Vanilla integration)
            if (this.onchange && typeof this.onchange === 'function') {
                // The native onchange inline event fires naturally, but if we need a custom engine bus dispatch, do it here.
            }
        });
    });
};

// Boot dropdown memory
document.addEventListener('DOMContentLoaded', window.initNeoDropdownMemory);
window.initNeoDropdownMemory();