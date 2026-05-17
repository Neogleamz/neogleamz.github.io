/**
 * @typedef {Object} FullLandedCostRow
 * @property {number} raw
 * @property {number} labor
 * @property {number} total
 */

/**
 * @typedef {Object} BomTreeNode
 * @property {string} [item_key]
 * @property {string} [di_item_id]
 * @property {string} [name]
 * @property {number|string} [quantity]
 * @property {number|string} [qty]
 */

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
        return DOMPurify.sanitize(dirtyHTML, { 
            ADD_TAGS: ['iframe', 'video', 'source'],
            ADD_ATTR: ['target', 'allow', 'allowfullscreen', 'frameborder', 'scrolling', 'muted', 'playsinline', 'preload', 'autoplay', 'loop', 'data-url', 'data-click', 'data-mousedown', 'contenteditable']
        });
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
 * Recursively computes a flat map of all raw materials needed to produce a recipe.
 * @param {string} pName - Internal recipe name.
 * @param {number} [qty=1] - Multiplier.
 * @returns {Object.<string, number>} key-value pairs of raw material IDs and total quantity required.
 */
window.getRawMaterials = function(pName, qty = 1) {
    let res = {};
    if (!pName || typeof productsDB === 'undefined' || !productsDB[pName]) return res;

    const components = productsDB[pName] || [];
    components.forEach(item => {
        let key = item?.item_key || item?.di_item_id || item?.name;
        if (!key) return;

        let compQty = (parseFloat(item?.quantity || item?.qty) || 1) * qty;
        if (key.startsWith('RECIPE:::')) {
            let sub = window.getRawMaterials(key.replace('RECIPE:::', ''), compQty);
            Object.keys(sub).forEach(k => {
                res[k] = (res[k] || 0) + sub[k];
            });
        } else {
            res[key] = (res[key] || 0) + compQty;
        }
    });

    return res;
};

/**
 * Calculates platform transaction fees based dynamically on the parsed metric configurations.
 * @param {number} amt - Total Capture Amount string stripped into pure float.
 * @param {string} [source="web"] - Sales channel (eBay, web, etc.)
 * @returns {number} The computed transaction overhead.
 */
window.getEngineStripeFee = function(amt, source) { 
    let parsedAmt = parseFloat(amt) || 0;
    if (parsedAmt <= 0) return 0; // Prevent 30-cent phantom fees on $0 captures
    
    let src = source ? String(source).toLowerCase().trim() : 'web';
    if (src.includes('manual')) return 0; // Manual invoices/cash bypass gateways
    
    if (src.includes('ebay')) {
        return parsedAmt * window.NEOGLEAMZ_CONFIG.EBAY_BLENDED_FEE; 
    }
    return (parsedAmt * window.NEOGLEAMZ_CONFIG.STRIPE_PERCENTAGE) + window.NEOGLEAMZ_CONFIG.STRIPE_FLAT_FEE; 
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


/**
 * Unified Singleton for all revenue shifting, cost suppression, and line-item slicing.
 * This is the Authoritative Forensic Engine for Neogleamz.
 * @param {Array} rows - Group of rows sharing the same Order ID.
 * @returns {Array} Processed rows with forensic net profit and inherited attributes.
 */
window.runForensicAccounting = function(rows) {
    if (!rows || rows.length === 0) return [];
    
    // 1. RAW DATA HARVESTING (Start with CSV 'Total Captured')
    let totalOrderCaptured = 0;
    let exactPayoutTotal = 0;
    let exactShipTotal = 0;
    let orderRefundTotal = 0;
    let totalOrderOutstanding = 0;
    
    rows.forEach(r => {
        let t = parseFloat(r.total || 0);
        if (t > totalOrderCaptured) totalOrderCaptured = t;
        
        if (parseFloat(r.dbActualPayout) > 0) exactPayoutTotal += parseFloat(r.dbActualPayout);
        if (parseFloat(r.dbActualShipCost) > 0) exactShipTotal += parseFloat(r.dbActualShipCost);
        
        let refAmt = parseFloat(r.refunded_amount) || 0;
        if (refAmt > orderRefundTotal) orderRefundTotal = refAmt;
        
        let outBal = parseFloat(r['Outstanding Balance']) || 0;
        if (outBal > totalOrderOutstanding) totalOrderOutstanding = outBal;
    });

    // 2. Identify the "Inflation" (Replacement lines that artificially swell the CSV 'Total')
    let totalLineNetPrice = 0;
    rows.forEach(r => {
        totalLineNetPrice += (parseFloat(r.actual_sale_price || 0) * parseFloat(r.qty_sold || 1)) - parseFloat(r.discount_amount || 0);
    });

    // Find the first line item that will actually ship (used to attribute order-level flat fees)
    let firstShippableIndex = rows.findIndex(r => {
        let t = r.transaction_type || 'Standard';
        let st = (r.fulfillment_status || '').toLowerCase();
        let lst = (r.lineitem_fulfillment_status || '').toLowerCase();
        return ((st === 'fulfilled' || lst === 'fulfilled') && (t !== 'Pre-Ship Exchange') && (t !== 'IGNORE') && (t !== 'Cancelled'));
    });
    if (firstShippableIndex === -1) firstShippableIndex = 0;

    // 3. Process Lines with Column Inheritance
    let processed = rows.map((r, i) => {
        let type = r.transaction_type || 'Standard';
        let status = (r.fulfillment_status || '').toLowerCase();
        let lStatus = (r.lineitem_fulfillment_status || '').toLowerCase();
        
        // --- INHERITANCE LOGIC ---
        // If I am a Replacement, I take the numbers from ANY Exchange row (Pre or Post).
        let sourceRow = r;
        if (type === 'Exchange Replacement') {
            const donor = rows.find(d => d.transaction_type === 'Pre-Ship Exchange' || d.transaction_type === 'Post-Ship Exchange');
            if (donor) {
                sourceRow = donor; 
            }
        }
        
        // Physical Cost Suppression
        let cogs = (window.getEngineTrueCogs(r.internal_recipe_name) || 0) * (parseFloat(r.qty_sold) || 1);
        let actShipCost = parseFloat(sourceRow.actual_shipping_cost || sourceRow.actualShipCost || 0);
        
        // Only suppress COGS if this specific item was abandoned/refunded while the rest of the order shipped.
        let isAbandonedPartial = (status !== 'pending' && status !== 'unfulfilled') && (lStatus === 'pending' || lStatus === 'unfulfilled');
        if (type === 'Pre-Ship Exchange' || type === 'IGNORE' || type === 'Cancelled' || isAbandonedPartial) { 
            cogs = 0; actShipCost = 0; 
        }
        if (type === 'Post-Ship Exchange') {
            cogs = 0; // Item returned to stock
        }

        // RAW ATTRIBUTION
        let lineRevenue;
        let work;
        let revenueDerivation;
        
        let newSubtotal = r.subtotal;
        let newDiscount = r.discount_amount;
        let newShipping = r.shipping;
        let newTaxes = r.taxes;
        let newTotal = r.total;
        let newSalePrice = r.actual_sale_price;
        let newOutBal = r['Outstanding Balance'];
        
        const isExchangeDonor = type === 'Pre-Ship Exchange' || type === 'Post-Ship Exchange';
        const isVoided = type === 'Cancelled' || type === 'IGNORE' || type === 'Partial Refund';
        
        if (isExchangeDonor || isVoided) {
            lineRevenue = 0;
            cogs = 0; // Item never left the warehouse or was returned, so we didn't lose the physical asset
            work = isExchangeDonor ? `[Exchange Donor] (Surrendered $${parseFloat(sourceRow.total).toFixed(2)})` : `[Voided] (Surrendered $${parseFloat(sourceRow.total).toFixed(2)})`;
            revenueDerivation = isExchangeDonor ? `Surrendered to Replacement ($${parseFloat(sourceRow.total).toFixed(2)} -> $0.00)` : `Voided/Cancelled ($0.00)`;
            newSubtotal = 0; newDiscount = 0; newShipping = 0; newTaxes = 0; newTotal = 0; newSalePrice = 0; newOutBal = 0;
        } else {
            // AUTHORITATIVE REVENUE AGGREGATION
            // If I am a replacement, I look at the donor first, but fall back to my own data if the donor is hollow
            let ob = Math.max(parseFloat(r['Outstanding Balance'] || 0), parseFloat(sourceRow['Outstanding Balance'] || 0));
            let tot = Math.max(parseFloat(r.total || 0), parseFloat(sourceRow.total || 0));
            
            lineRevenue = ob > 0 ? ob : tot;
            work = ob > 0 ? `[Resolved Out. Bal: $${ob.toFixed(2)}]` : `[Resolved Total: $${tot.toFixed(2)}]`;
            
            if (ob > 0) {
                revenueDerivation = `Outstanding Balance: $${ob.toFixed(2)}`;
            } else {
                revenueDerivation = `total: $${tot.toFixed(2)}`;
            }

            if (type === 'Exchange Replacement' && sourceRow !== r) {
                revenueDerivation = `Inherited from Donor: $${lineRevenue.toFixed(2)}`;
                newSubtotal = Math.max(parseFloat(r.subtotal || 0), parseFloat(sourceRow.subtotal || 0));
                newDiscount = Math.max(parseFloat(r.discount_amount || 0), parseFloat(sourceRow.discount_amount || 0));
                newShipping = Math.max(parseFloat(r.shipping || 0), parseFloat(sourceRow.shipping || 0));
                newTaxes = Math.max(parseFloat(r.taxes || 0), parseFloat(sourceRow.taxes || 0));
                newTotal = Math.max(parseFloat(r.total || 0), parseFloat(sourceRow.total || 0));
                newSalePrice = Math.max(parseFloat(r.actual_sale_price || 0), parseFloat(sourceRow.actual_sale_price || 0));
                newOutBal = Math.max(parseFloat(r['Outstanding Balance'] || 0), parseFloat(sourceRow['Outstanding Balance'] || 0));
            }
        }


        let src = r['Source'] || 'web';
        let fee = (isVoided) ? 0 : window.getEngineStripeFee(lineRevenue, src);

        if (exactShipTotal > 0) {
            actShipCost = (i === firstShippableIndex) ? exactShipTotal : 0;
        } else {
            actShipCost = (i === firstShippableIndex) ? actShipCost : 0;
        }

        if (exactPayoutTotal > 0) {
            let orderStripeFee = Math.max(0, totalOrderCaptured - exactPayoutTotal);
            fee = (i === firstShippableIndex) ? orderStripeFee : 0;
        }

        let net = lineRevenue - fee - actShipCost - cogs;
        if (isVoided) net = 0;

        let isCostOnlyItem = (type === 'Gift' || type === 'Warranty' || type === 'NEEDS ATTENTION' || type === 'IGNORE' || type === 'Cancelled' || type === 'Partial Refund');

        return { 
            ...r, 
            forensic_subtotal: newSubtotal,
            forensic_discount_amount: newDiscount,
            forensic_shipping: newShipping,
            forensic_taxes: newTaxes,
            forensic_total: newTotal,
            forensic_sale_price: newSalePrice,
            forensic_out_bal: newOutBal,
            isCostOnlyItem,
            uiIdx: i, 
            cogs, fee, net, actShipCost,
            trueLineCaptured: lineRevenue,
            revenueDerivation: revenueDerivation,
            work: work,
            rawOrderTotal: totalOrderCaptured,
            rawItemRevenue: totalLineNetPrice,
            liveCogs: cogs, stripeFee: fee, actualShipCost: actShipCost 
        };
    });

    // 4. Apply Refund Deductions (Last Layer)
    if (orderRefundTotal > 0) {
        let refundApplied = false;
        processed.forEach(r => {
            let isDonor = r.transaction_type === 'Pre-Ship Exchange' || r.transaction_type === 'Post-Ship Exchange';
            let isVoided = r.transaction_type === 'Cancelled' || r.transaction_type === 'IGNORE' || r.transaction_type === 'Partial Refund';
            if (!refundApplied && !isVoided && !isDonor) {
                r.net -= orderRefundTotal;
                r.applied_order_refund = orderRefundTotal;
                refundApplied = true;
            }
        });
    }

    return processed;
};

// ==========================================
// UNIVERSAL DIFFERENTIAL ENGINE (STRICT FORENSICS)
// ==========================================
/**
 * Asynchronous Universal Differential Engine
 * Cross-references a payload against live Supabase data to find mathematical or string discrepancies.
 * Used exclusively by the Sandbox Modal.
 * @param {Array} payload - The matrix of imported data to check.
 * @param {string} table - The target database table.
 * @param {string} conflictStr - Optional conflict keys.
 * @returns {Promise<Array>} The payload with injected _diffs tracking.
 */
window.applyDifferentialHighlighting = async function(payload, table, conflictStr) {
    if (!payload || payload.length === 0 || !table) return payload;
    
    let conflictKeys = conflictStr ? conflictStr.split(',').map(s=>s.trim()) : [];
    if (table === 'sales_ledger' && conflictKeys.length === 0) conflictKeys = ['order_id', 'storefront_sku'];
    if (table === 'raw_orders' && conflictKeys.length === 0) conflictKeys = ['di_item_id'];
    if (table === 'raw_parcel_summary' && conflictKeys.length === 0) conflictKeys = ['parcel_no'];
    if (table === 'raw_parcel_items' && conflictKeys.length === 0) conflictKeys = ['parcel_no', 'di_item_id'];
    
    if (conflictKeys.length === 0 || !conflictKeys[0]) return payload;

    let primaryKey = conflictKeys[0];
    let rawValues = [...new Set(payload.map(r => r[primaryKey]))].filter(v => v !== undefined && v !== null && v !== '');
    if (rawValues.length === 0) return payload;
    
    // Normalize to handle `#1005` vs `1005` database inconsistencies
    let fetchValuesSet = new Set();
    rawValues.forEach(v => {
        let strV = String(v).trim();
        fetchValuesSet.add(strV);
        if (strV.startsWith('#')) fetchValuesSet.add(strV.replace(/^#/, ''));
        else fetchValuesSet.add('#' + strV);
    });
    let fetchValues = Array.from(fetchValuesSet);
    
    let existingData = [];
    let dbErrorStr = "";
    if (typeof supabaseClient !== 'undefined') {
        try {
            for (let i = 0; i < fetchValues.length; i += 100) {
                let chunk = fetchValues.slice(i, i + 100);
                let { data, error } = await supabaseClient.from(table).select('*').in(primaryKey, chunk);
                if (error) dbErrorStr += error.message + " | ";
                if (data) existingData = existingData.concat(data);
            }
        } catch(e) {
            console.error("Diff Engine DB Fetch Error:", e);
            dbErrorStr += String(e) + " | ";
        }
    }

    if (existingData.length === 0) {
        if (typeof syncTrace === 'function') syncTrace(`[DB ZERO | PK:${primaryKey} | Val0:${fetchValues[0] || 'none'} | Err: ${dbErrorStr}] Differential highlighting bypassed due to 0 matches.`, true);
        return payload;
    }

    let foundCount = 0;
    let diffCount = 0;

    payload.forEach(sim => {
        let existingRow = existingData.find(ex => {
            return conflictKeys.every(k => {
                let vEx = String(ex[k]).trim().toLowerCase().replace(/\s+/g, ' ');
                let vSim = String(sim[k]).trim().toLowerCase().replace(/\s+/g, ' ');
                if (k === 'order_id' || k === 'parcel_no') {
                    vEx = vEx.replace(/^#/, '');
                    vSim = vSim.replace(/^#/, '');
                }
                return vEx === vSim;
            });
        });
        
        if (existingRow) {
            foundCount++;
            let diffs = {};
            Object.keys(sim).forEach(k => {
                if (k.startsWith('_')) return; // Ignore internal tracking keys
                let v1 = sim[k]; 
                let v2 = existingRow[k];
                if (v1 === undefined || v2 === undefined || v1 === null || v2 === null) return;
                
                // Pure Math Unification
                if (typeof v1 === 'number' && typeof v2 === 'number') {
                    if (Math.abs(v1 - v2) > 0.001) diffs[k] = v2;
                } else if (String(v1) !== String(v2)) {
                    let f1 = parseFloat(v1); let f2 = parseFloat(v2);
                    if (!isNaN(f1) && !isNaN(f2) && String(v1).trim() !== "" && String(v2).trim() !== "") {
                        if (Math.abs(f1 - f2) > 0.001) diffs[k] = v2;
                    } else {
                        // String mismatch
                        diffs[k] = v2;
                    }
                }
            });
            if (Object.keys(diffs).length > 0) {
                diffCount++;
                sim._diffs = diffs;
            }
        }
    });

    if (typeof syncTrace === 'function') {
        syncTrace(`[Diff Engine] DB Matches: ${foundCount} | Mismatches Found: ${diffCount} | Total DB Rows Scanned: ${existingData.length}`, diffCount > 0);
    }
    return payload;
};

// ==========================================
// UNIVERSAL HELPERS

// ==========================================
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

// ==========================================
// CENTRAL KPI RENDER ENGINE (MIGRATED & AUDITED)
// ==========================================

const setStat = (id, val) => { 
    const el = document.getElementById(id); 
    if (el) { 
        el.innerText = val; 
        el.classList.add('pulse-orange'); 
        setTimeout(() => el.classList.remove('pulse-orange'), 4000); 
    } 
};
const fmtNum = (n) => (!isNaN(n) && n !== null) ? Number(n).toLocaleString() : n;
const fmtMoney = (n) => (!isNaN(n) && n !== null) ? '$' + Number(n).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2}) : n;

function syncDatazStats() {
    if (typeof finalResults === 'undefined') return;
    let parcels = new Set(), totalWt = 0;
    let absoluteRawSpend = 0, pureGoodsCost = 0;
    let processedOrdersForPureGoods = new Set();
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
        let goodsCost = 0;
        if (uCost > 0) {
            goodsCost = (uCost * qVal);
        } else {
            let orderId = s['Order No'] || s.order_no || pno || s.parcel_no;
            if (orderId && !processedOrdersForPureGoods.has(orderId)) {
                goodsCost = parseFloat(s['Order Total']) || parseFloat(s.order_total) || 0;
                processedOrdersForPureGoods.add(orderId);
            }
        }
        pureGoodsCost += goodsCost;
    });
    
    let totalLogisticsSpend = absoluteRawSpend - pureGoodsCost;
    if (totalLogisticsSpend < 0) totalLogisticsSpend = 0; // Safeguard
    
    setStat('statDatazRecords', fmtNum(finalResults.length));
    setStat('statDatazParcels', fmtNum(parcels.size));
    setStat('statDatazPaid', fmtMoney(totalLogisticsSpend));
    setStat('statDatazWt', fmtNum(totalWt));
    setStat('statDatazTotalCost', fmtMoney(absoluteRawSpend));
}

function syncEditzStats() {
    if (typeof catalogCache === 'undefined') return;
    let cKeys = Object.keys(catalogCache);
    let prints = 0, usedSet = new Set(), assigned = 0;
    
    if(typeof productsDB !== 'undefined'){
        Object.values(productsDB).forEach(pArr => {
            pArr.forEach(c => usedSet.add(c.item_key || c.di_item_id || c.name));
        });
    }
    
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

function syncStockzStats() {
    if (typeof inventoryDB === 'undefined') return;
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
            fgiVal += Math.max(0, s) * window.getEngineTrueCogs(p); 
            if (s < 0) alerts++;
        });
    }

    let maxOverallYield = 0;
    if (typeof productsDB !== 'undefined' && typeof catalogCache !== 'undefined') {
        let simStock = {};
        Object.keys(catalogCache).forEach(k => {
            let i = inventoryDB[k] || {consumed_qty:0, manual_adjustment:0, min_stock:0, scrap_qty:0};
            simStock[k] = (catalogCache[k].totalQty || 0) - (i.consumed_qty || 0) - (i.scrap_qty || 0) + (i.manual_adjustment || 0);
        });
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

function syncRecipezStats() {
    if (typeof productsDB === 'undefined') return;
    let keys = Object.keys(productsDB);
    setStat('statRecipezActive', fmtNum(keys.length));
    let maxCost = 0, missing = 0, totalMargin = 0, marginCount = 0;
    keys.forEach(p => {
        let cost = window.getEngineTrueCogs(p);
        let msrp = window.getEngineLiveMsrp(p);
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

function syncBatchezStats() {
    if (typeof workOrdersDB === 'undefined') return;
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

function syncLayerzStats() {
    if (typeof printQueueDB === 'undefined') return;
    let active = printQueueDB.filter(p => !p.completed && !p.failed && p.status !== 'Archived');
    let done = printQueueDB.filter(p => p.completed && !p.failed && p.status !== 'Archived').length;
    setStat('statLayerzJobs', fmtNum(active.filter(p => p.status === 'Printing').length));
    setStat('statLayerzDone', fmtNum(done));
    setStat('statLayerzPending', fmtNum(active.filter(p => p.status === 'Queued').length));

    let mat = 0;
    active.forEach(p => {
        let wt = 0;
        let cat = typeof catalogByName !== 'undefined' ? catalogByName[p.part_name] : null;
        if (cat) wt = parseFloat(cat.unit_weight_g) || 0;
        
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

function syncOrderzStats() {
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
        let orderSetForVal = new Set();
        let units = 0, shopify = 0, val = 0;
        salesDB.forEach(s => {
            units += (parseFloat(s.quantity || s.qty_sold) || 1);
            if (s.order_id && !orderSetForVal.has(s.order_id)) {
                val += parseFloat(s.total) || 0;
                orderSetForVal.add(s.order_id);
            }
            let so = (s.source || s.Source || "").toLowerCase();
            if (so.includes("shopify")) shopify++;
        });
        setStat('statOrderzTotal', fmtNum(orderSetForVal.size));
        let aon = orderSetForVal.size > 0 ? (val / orderSetForVal.size) : 0;
        setStat('statOrderzUnits', fmtNum(units));
        setStat('statOrderzShopify', fmtNum(shopify));
        setStat('statOrderzAon', fmtMoney(aon));
        setStat('statOrderzVal', fmtMoney(val));
    }
}

function syncStatzStats() {
    if (typeof salesDB === 'undefined') return;
    let totals = window.salesEngineTotals || { captured: 0, cogs: 0, net: 0, count: salesDB.length || 1 };
    
    let roi = totals.cogs > 0 ? (totals.net / totals.cogs) * 100 : 0;
    let avgYield = totals.count > 0 ? (totals.net / totals.count) : 0;
    
    setStat('statStatzRev', fmtMoney(totals.captured));
    setStat('statStatzNet', fmtMoney(totals.net));
    setStat('statStatzRoi', roi.toFixed(1) + '%');
    setStat('statStatzAvgProf', fmtMoney(avgYield));
    setStat('statStatzRawExp', fmtMoney(totals.cogs));
}

function syncSimulatorzStats() {
    if (typeof productsDB === 'undefined') return;
    let keys = Object.keys(productsDB);
    if (keys.length > 0) {
        let totNet = 0, totMsrp = 0, totShip = 0;
        keys.forEach(p => {
            let msrp = window.getEngineLiveMsrp(p);
            let cogs = window.getEngineTrueCogs(p);
            let sim = window.getEnginePredictiveMetrics(msrp, cogs, 75.00, 0, 0, 0); 
            totNet += sim.net;
            totMsrp += msrp;
            totShip += sim.merchantShipMargin;
        });
        let avgNet = totNet / keys.length;
        let avgMsrp = totMsrp / keys.length;
        let avgMargin = avgMsrp > 0 ? (avgNet / avgMsrp) * 100 : 0;
        
        setStat('statSimzCac', '$0.00'); 
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

function syncImportzStats() {
    let syncCount = localStorage.getItem('statImpzSyncs') || 0;
    setStat('statImpzSyncs', fmtNum(parseInt(syncCount)));
    if (typeof finalResults !== 'undefined') {
        let capex = 0, customs = 0, weight = 0, pkgs = new Set();
        let absoluteRawSpend = 0, pureGoodsCost = 0;
        let processedOrdersForTotal = new Set();
        
        finalResults.forEach(r => {
            let uCost = parseFloat(r['Order Unit Price']) || parseFloat(r.order_unit_price) || 0;
            let qVal = parseFloat(r['Quantity']) || parseFloat(r.quantity) || 1;
            
            let pno = r['Parcel No'] || r.parcel_no;
            let orderId = r['Order No'] || r.order_no || pno;
            
            let goodsCost = 0;
            if (uCost > 0) {
                goodsCost = (uCost * qVal);
            } else {
                if (orderId && !processedOrdersForTotal.has(orderId)) {
                    goodsCost = parseFloat(r['Order Total']) || parseFloat(r.order_total) || 0;
                    processedOrdersForTotal.add(orderId);
                }
            }
            capex += goodsCost;
            
            absoluteRawSpend += parseFloat(r['Total Landed Cost ($)']) || parseFloat(r.total_cost_weight) || 0;
            pureGoodsCost += goodsCost;

            if (pno && String(pno).trim().toUpperCase() !== 'MANUAL') {
                if (!pkgs.has(pno)) {
                    pkgs.add(pno);
                    customs += parseFloat(r['Custom Clearance Fee']) || parseFloat(r.custom_clearance_fee) || 0;
                    weight += parseFloat(r['Actual Chargeable Weight (g)']) || parseFloat(r.actual_chargeable_weight_g) || 0;
                }
            }
        });
        
        let freight = absoluteRawSpend - pureGoodsCost;
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
}

function syncSalezStats() {
    if (typeof aliasDB === 'undefined') return;
    let mapped = Object.keys(aliasDB).length;
    setStat('statSalzMap', fmtNum(mapped));
    
    let unmappedS = 0, unmappedE = 0, rev30 = 0, net30 = 0;
    let processedOrdersFor30hRev = new Set();
    if (typeof salesDB !== 'undefined') {
        let now = new Date();
        salesDB.forEach(s => {
            let dt = new Date(s.sale_date || s.date);
            if ((now - dt) < 2592000000) {
                if (s.order_id && !processedOrdersFor30hRev.has(s.order_id)) {
                    rev30 += parseFloat(s.total) || 0;
                    processedOrdersFor30hRev.add(s.order_id);
                }
                net30 += parseFloat(s.net_profit) || 0;
            }
            if (!aliasDB[s.storefront_sku]) {
                let src = (s.source||"").toLowerCase();
                if (src.includes('shopify')) unmappedS++;
                if (src.includes('etsy')) unmappedE++;
            }
        });
    }
    setStat('statSalzOrd30', fmtNum(processedOrdersFor30hRev.size));
    setStat('statSalzNet30', fmtMoney(net30));
    setStat('statSalz30d', fmtMoney(rev30));
    setStat('statSalzHealth', (unmappedS + unmappedE) === 0 ? 'NOMINAL' : 'UNMAPPED ALIAS');
}

function syncBrainzStats() {
    setStat('statBrnzSync', (performance.now() / 1000).toFixed(2) + 's');
    setStat('statBrnzCache', fmtNum(document.getElementsByTagName('*').length) + ' Nodes');
    let lastSync = localStorage.getItem('lastBrainSync') || 'NEVER';
    let tDiff = lastSync !== 'NEVER' ? Math.round((Date.now() - parseInt(lastSync))/60000) + 'm ago' : lastSync;
    setStat('statBrnzBack', tDiff);
    setStat('statBrnzBld', 'V.3.1.5');
    setStat('statBrnzErr', typeof systemErrorState !== 'undefined' && systemErrorState ? 'ACTIVE FAULT' : '0');
}

function syncFulfillzStats() {
    if (typeof fetchUnfulfilledOrders === 'function') fetchUnfulfilledOrders();
}

window.updateHubStats = function() {
    const modules = [
        { name: "DATAZ", func: syncDatazStats },
        { name: "EDITZ", func: syncEditzStats },
        { name: "STOCKZ", func: syncStockzStats },
        { name: "RECIPEZ", func: syncRecipezStats },
        { name: "BATCHEZ", func: syncBatchezStats },
        { name: "LAYERZ", func: syncLayerzStats },
        { name: "ORDERZ", func: syncOrderzStats },
        { name: "STATZ", func: syncStatzStats },
        { name: "SIMULATORZ", func: syncSimulatorzStats },
        { name: "IMPORTZ", func: syncImportzStats },
        { name: "SALEZ", func: syncSalezStats },
        { name: "BRAINZ", func: syncBrainzStats },
        { name: "FULFILLZ", func: syncFulfillzStats }
    ];

    modules.forEach(mod => {
        try {
            mod.func();
        } catch (e) {
            console.warn(`[Engine] Diagnostic Fault in module ${mod.name}:`, e);
        }
    });
};

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
            const s = layout.querySelector('.bom-sidebar, .task-sidebar');
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

window.stopNeoSidebarResize = function() {
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
    
    // Restore Simulator Vertical Height
    const cachedHeight = localStorage.getItem('neoResizer_math-simulator-sandbox');
    if (cachedHeight) {
        const el = document.getElementById('math-simulator-sandbox');
        if (el) {
            el.style.height = cachedHeight;
            el.style.minHeight = cachedHeight;
            el.style.flex = `0 0 ${cachedHeight}`;
        }
    }
};

// ==========================================
// SIMULATOR VERTICAL RESIZER LOGIC
// ==========================================
let isNeoSimulatorResizing = false;

window.initNeoSimulatorVResizer = function(e) {
    if(e) e.preventDefault();
    isNeoSimulatorResizing = true;
    document.body.style.cursor = 'ns-resize';
    document.addEventListener('mousemove', window.doNeoSimulatorVResize);
    document.addEventListener('mouseup', window.stopNeoSimulatorVResize);
};

window.doNeoSimulatorVResize = function(e) {
    if(!isNeoSimulatorResizing) return;
    
    const sandbox = document.getElementById('math-simulator-sandbox');
    const container = document.getElementById('math-simulator-split-container');
    if (!sandbox || !container) return;
    
    const rect = container.getBoundingClientRect();
    let newHeight = e.clientY - rect.top;
    
    // Constraints
    if (newHeight < 200) newHeight = 200;
    if (newHeight > rect.height - 150) newHeight = rect.height - 150;
    
    sandbox.style.height = newHeight + 'px';
    sandbox.style.minHeight = newHeight + 'px';
    sandbox.style.flex = `0 0 ${newHeight}px`;
};

window.stopNeoSimulatorVResize = function() {
    if (isNeoSimulatorResizing) {
        const sandbox = document.getElementById('math-simulator-sandbox');
        if (sandbox) {
            localStorage.setItem('neoResizer_math-simulator-sandbox', sandbox.style.height);
        }
    }
    
    isNeoSimulatorResizing = false;
    document.body.style.cursor = '';
    document.removeEventListener('mousemove', window.doNeoSimulatorVResize);
    document.removeEventListener('mouseup', window.stopNeoSimulatorVResize);
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
        });
    });
};

// Boot dropdown memory
document.addEventListener('DOMContentLoaded', window.initNeoDropdownMemory);
window.initNeoDropdownMemory();