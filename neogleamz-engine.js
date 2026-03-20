
// ==========================================
// CENTRAL KPI RENDER ENGINE (MIGRATED & AUDITED)
// ==========================================
function updateHubStats() {
    try {
        const setStat = (id, val) => { const el = document.getElementById(id); if (el) { el.innerText = val; el.classList.add('pulse-orange'); setTimeout(() => el.classList.remove('pulse-orange'), 4000); } };
        const fmtNum = (n) => (!isNaN(n) && n !== null) ? Number(n).toLocaleString() : n;
        const fmtMoney = (n) => (!isNaN(n) && n !== null) ? '$' + Number(n).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2}) : n;

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
            setStat('statDatazAvg', totalWt > 0 ? fmtMoney(totalPostage / totalWt) : '$0.00');
        }

        // --- EDITZ ---
        if (typeof catalogCache !== 'undefined') {
            let cKeys = Object.keys(catalogCache);
            let prints = 0;
            cKeys.forEach(k => { if (catalogCache[k].is_3d_print) prints++; });
            setStat('statEditzComps', fmtNum(cKeys.length));
            setStat('statEditzPrints', fmtNum(prints));
            setStat('statEditzRaw', fmtNum(cKeys.length - prints));
            setStat('statEditzAssigned', '--');
            setStat('statEditzOrphan', '--');
        }

        // --- STOCKZ ---
        if (typeof inventoryDB !== 'undefined') {
            let keys = Object.keys(inventoryDB);
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
                    let s = (inventoryDB[`RECIPE:::` + p]?.produced_qty || 0) - (inventoryDB[`RECIPE:::` + p]?.sold_qty || 0);
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

// ==========================================
// CENTRAL KPI RENDER ENGINE (MIGRATED & AUDITED)
// ==========================================
function updateHubStats() {
    try {
        const setStat = (id, val) => { const el = document.getElementById(id); if (el) { el.innerText = val; el.classList.add('pulse-orange'); setTimeout(() => el.classList.remove('pulse-orange'), 4000); } };
        const fmtNum = (n) => (!isNaN(n) && n !== null) ? Number(n).toLocaleString() : n;
        const fmtMoney = (n) => (!isNaN(n) && n !== null) ? '$' + Number(n).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2}) : n;

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
            setStat('statDatazAvg', totalWt > 0 ? fmtMoney(totalPostage / totalWt) : '$0.00');
        }

        // --- EDITZ ---
        if (typeof catalogCache !== 'undefined') {
            let cKeys = Object.keys(catalogCache);
            let prints = 0;
            cKeys.forEach(k => { if (catalogCache[k].is_3d_print) prints++; });
            setStat('statEditzComps', fmtNum(cKeys.length));
            setStat('statEditzPrints', fmtNum(prints));
            setStat('statEditzRaw', fmtNum(cKeys.length - prints));
            setStat('statEditzAssigned', '--');
            setStat('statEditzOrphan', '--');
        }

        // --- STOCKZ ---
        if (typeof inventoryDB !== 'undefined') {
            let keys = Object.keys(inventoryDB);
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
                    let s = (inventoryDB[`RECIPE:::` + p]?.produced_qty || 0) - (inventoryDB[`RECIPE:::` + p]?.sold_qty || 0);
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
