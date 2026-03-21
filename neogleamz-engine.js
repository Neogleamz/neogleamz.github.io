
window.calculateProductBreakdown = function(pName) {
    let res = { raw: 0, labor: 0, total: 0 };
    if (!pName || typeof productsDB === 'undefined' || !productsDB[pName]) return res;
    
    productsDB[pName].forEach(item => {
        let key = item.item_key || item.di_item_id || item.name;
        let qty = parseFloat(item.quantity || item.qty) || 1;
        if (key.startsWith('RECIPE:::')) {
            let sub = window.calculateProductBreakdown(key.replace('RECIPE:::', ''));
            res.raw += sub.total * qty; 
        } else if (typeof catalogCache !== 'undefined' && catalogCache[key]) {
            res.raw += (parseFloat(catalogCache[key].avgUnitCost) || 0) * qty;
        }
    });
    
    if (typeof laborDB !== 'undefined' && laborDB[pName]) {
        let l = laborDB[pName];
        res.labor = ((parseFloat(l.time) || 0) / 60) * (parseFloat(l.rate) || 0);
    }
    
    res.total = res.raw + res.labor;
    return res;
};
window.getEngineTrueCogs = function(pName) { return window.calculateProductBreakdown(pName).total; };
window.calculateProductTotal = window.getEngineTrueCogs;

window.getEngineStripeFee = function(amt) { return (amt * 0.029) + 0.30; };
window.getEngineLiveMsrp = function(pName) { return typeof pricingDB !== 'undefined' && pricingDB[pName] ? parseFloat(pricingDB[pName].msrp) || 0 : 0; };
window.getHistoricalNetProfit = function(gross, shipCol, tax, disc, actShip, pName) {
    let captured = gross + shipCol + tax - disc;
    let fee = window.getEngineStripeFee(captured);
    let cogs = window.getEngineTrueCogs(pName);
    return gross + shipCol - disc - fee - actShip - cogs;
};
window.getEnginePredictiveMetrics = function(msrp, cogs, fsThreshold, cac, aff, warr) {
    let sCol = msrp >= fsThreshold ? 0 : 8.00;
    let aShip = 8.00; 
    let fee = window.getEngineStripeFee(msrp + sCol);
    let net = msrp + sCol - cogs - fee - aShip - cac - aff - warr;
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
            let parcels = new Set(), totalPaid = 0, totalWt = 0;
            finalResults.forEach(s => {
                let pno = s['Parcel No'];
                if (pno && String(pno).trim().toUpperCase() !== 'MANUAL') {
                    if (!parcels.has(pno)) {
                        parcels.add(pno);
                        totalPaid += parseFloat(s['Actual Paid (Parcel)']) || 0;
                        totalWt += parseFloat(s['Actual Chargeable Weight (g)']) || 0;
                    }
                }
            });
            setStat('statDatazRecords', fmtNum(finalResults.length));
            setStat('statDatazParcels', fmtNum(parcels.size));
            setStat('statDatazPaid', fmtMoney(totalPaid));
            setStat('statDatazWt', fmtNum(totalWt));
            let avgCost = totalWt > 0 ? (totalPaid / totalWt) : 0;
            setStat('statDatazAvg', '$' + avgCost.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:4}));
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
            let fgiUnits = 0, alerts = 0, rawVal = 0, fgiVal = 0;
            
            if (typeof catalogCache !== 'undefined') {
                Object.keys(catalogCache).forEach(k => {
                    let c = catalogCache[k];
                    let i = inventoryDB[k] || {consumed_qty:0, manual_adjustment:0, min_stock:0, scrap_qty:0};
                    let s = (c.totalQty || 0) - (i.consumed_qty || 0) - (i.scrap_qty || 0) + (i.manual_adjustment || 0);
                    if (s < (i.min_stock || 0)) alerts++;
                    rawVal += Math.max(0, s) * (parseFloat(c.avgUnitCost) || 0);
                });
            }

            if (typeof productsDB !== 'undefined') {
                Object.keys(productsDB).forEach(p => {
                    let k = `RECIPE:::` + p;
                    let i = inventoryDB[k] || {produced_qty:0, sold_qty:0};
                    let s = (i.produced_qty || 0) - (i.sold_qty || 0);
                    fgiUnits += Math.max(0, s);
                    fgiVal += Math.max(0, s) * getEngineTrueCogs(p); 
                    if (s < 0) alerts++;
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
            setStat('statStatzAvgProf', salesDB.length > 0 ? fmtMoney(actualNet / salesDB.length) : '$0.00');
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

    } catch(e) { console.warn("Hub Stats Sync Error:", e); }
}
