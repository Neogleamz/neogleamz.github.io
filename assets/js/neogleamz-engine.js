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
    // Suppress cross-origin and Chrome Extension noise (e.g., LastPass DOM scanning crashes)
    if (!event.error && event.message === 'Script error.') return;
    if (event.filename && event.filename.includes('chrome-extension://')) return;
    if (event.message && event.message.includes('ResizeObserver')) return;

    console.error('System Error:', event.message, event.error);
    if (typeof sysLog === 'function') {
        const errorMsg = event.error?.message || event.message || 'Unknown Error';
        sysLog(`System Fault: ${errorMsg}`, true);
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
            ADD_ATTR: ['target', 'allow', 'allowfullscreen', 'frameborder', 'scrolling', 'muted', 'playsinline', 'preload', 'autoplay', 'loop', 'data-url', 'data-click', 'data-mousedown', 'data-keyup', 'data-blur', 'data-focus', 'data-change', 'data-input', 'data-mouseover', 'data-mouseout', 'data-submit', 'data-colkey', 'data-issimple', 'data-isn', 'data-rowkey', 'data-index', 'data-col', 'data-order', 'data-sku', 'data-isnum', 'data-sortcol', 'data-idx', 'data-oid', 'data-parent-oid', 'contenteditable', 'src', 'loading', 'class', 'style', 'selected', 'value', 'checked', 'type', 'tabindex']
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
window.calculateProductBreakdown = function(pName, visited = new Set()) {
    let res = { raw: 0, labor: 0, total: 0 };
    if (!pName || typeof productsDB === 'undefined' || !productsDB[pName]) return res;
    
    if (visited.has(pName)) {
        console.warn("Circular dependency detected for:", pName);
        return res;
    }
    
    // Create a new set so we don't accidentally block sibling branches
    let branchVisited = new Set(visited);
    branchVisited.add(pName);

    const components = productsDB[pName] || [];
    components.forEach(item => {
        let key = item?.item_key || item?.di_item_id || item?.name;
        if (!key) return; // Prevent crashes on empty objects

        let qty = parseFloat(item?.quantity || item?.qty) || 1;
        if (key.startsWith('RECIPE:::')) {
            let sub = window.calculateProductBreakdown(key.replace('RECIPE:::', ''), branchVisited);
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
window.getRawMaterials = function(pName, qty = 1, visited = new Set()) {
    let res = {};
    if (!pName || typeof productsDB === 'undefined' || !productsDB[pName]) return res;

    if (visited.has(pName)) {
        console.warn("Circular dependency detected in getRawMaterials for:", pName);
        return res;
    }
    
    let branchVisited = new Set(visited);
    branchVisited.add(pName);

    const components = productsDB[pName] || [];
    components.forEach(item => {
        let key = item?.item_key || item?.di_item_id || item?.name;
        if (!key) return;

        let compQty = (parseFloat(item?.quantity || item?.qty) || 1) * qty;
        if (key.startsWith('RECIPE:::')) {
            let sub = window.getRawMaterials(key.replace('RECIPE:::', ''), compQty, branchVisited);
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

window.getTransactionTypeOptions = function(selectedValue) {
    const opts = [
        { val: 'Standard', color: 'var(--text-main)' },
        { val: 'Pre-Ship Exchange', color: 'var(--text-main)' },
        { val: 'Post-Ship Exchange', color: 'var(--text-main)' },
        { val: 'Scrapped Exchange', color: 'var(--text-main)' },
        { val: 'Exchange Replacement', color: 'var(--text-main)' },
        { val: 'Warranty', color: 'var(--text-main)' },
        { val: 'Gift', color: 'var(--text-main)' },
        { val: 'IGNORE', color: 'var(--text-main)' },
        { val: 'Partial Refund', color: '#8b5cf6' },
        { val: 'Cancelled', color: '#ef4444' },
        { val: 'Refunded - Restocked', color: '#f59e0b' },
        { val: 'Refunded - Scrapped', color: '#f59e0b' },
        { val: 'Refunded - Warranty', color: '#f59e0b' },
        { val: 'NEEDS ATTENTION', color: '#ef4444', weight: 'bold' }
    ];
    return opts.map(o => {
        let style = `background:var(--bg-panel); color:${o.color};`;
        if (o.weight) style += ` font-weight:${o.weight};`;
        return `<option style="${style}" value="${o.val}" ${selectedValue === o.val ? 'selected' : ''}>${o.val}</option>`;
    }).join('');
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
    
    // 1. RAW DATA HARVESTING
    let totalOrderCaptured = 0; // Inflated CSV total
    let exactPayoutTotal = 0;
    let hasDbCosts = false;
    let maxCsvShipCost = 0;
    let firstRowWithMaxShipCostIndex = -1;
    let orderRefundTotal = 0;
    let totalOrderOutstanding = 0;
    let totalShipping = 0;
    let totalTaxes = 0;
    let donorCreditPool = 0;
    let refundLossPool = 0;
    
    rows.forEach((r, i) => {
        let t = parseFloat(r.total || 0);
        if (t > totalOrderCaptured) totalOrderCaptured = t;
        
        if (parseFloat(r.dbActualPayout) > 0) exactPayoutTotal += parseFloat(r.dbActualPayout);
        
        let sc = parseFloat(r.actual_shipping_cost || r.actualShipCost || 0);
        if (sc > 0) hasDbCosts = true;
        
        if (sc > maxCsvShipCost) {
            maxCsvShipCost = sc;
            firstRowWithMaxShipCostIndex = i;
        }
        
        let refAmt = parseFloat(r.refunded_amount) || 0;
        if (refAmt > orderRefundTotal) orderRefundTotal = refAmt;
        
        let outBal = parseFloat(r['Outstanding Balance']) || 0;
        if (outBal > totalOrderOutstanding) totalOrderOutstanding = outBal;

        let s = parseFloat(r.shipping || 0);
        if (s > totalShipping) totalShipping = s;
        
        let tx = parseFloat(r.taxes || 0);
        if (tx > totalTaxes) totalTaxes = tx;

        let type = r.transaction_type || 'Standard';
        let val = (parseFloat(r.actual_sale_price || 0) * parseFloat(r.qty_sold || 1)) - parseFloat(r.discount_amount || 0);
        
        if (type === 'Pre-Ship Exchange' || type === 'Post-Ship Exchange' || type === 'Scrapped Exchange') {
            donorCreditPool += val;
        } else if (type === 'Refunded - Restocked' || type === 'Refunded - Scrapped' || type === 'Refunded - Warranty' || type === 'Cancelled' || type === 'IGNORE' || type === 'Partial Refund') {
            refundLossPool += val;
        }
    });

    rows.forEach(r => {
        let type = r.transaction_type || 'Standard';
        if (type === 'Exchange Replacement') {
            let val = (parseFloat(r.actual_sale_price || 0) * parseFloat(r.qty_sold || 1)) - parseFloat(r.discount_amount || 0);
            donorCreditPool -= val;
        }
    });

    let exchangeBalanceCredit = Math.max(0, donorCreditPool);
    let consumedCredit = Math.min(exchangeBalanceCredit, orderRefundTotal);
    let unspentExchangeCredit = exchangeBalanceCredit - consumedCredit;
    
    let trueConcessionRefund = Math.max(0, orderRefundTotal - consumedCredit - refundLossPool);

    let firstShippableIndex = rows.findIndex(r => {
        let t = r.transaction_type || 'Standard';
        let st = (r.fulfillment_status || '').toLowerCase();
        let lst = (r.lineitem_fulfillment_status || '').toLowerCase();
        return ((st === 'fulfilled' || lst === 'fulfilled') && t !== 'Pre-Ship Exchange' && t !== 'IGNORE' && t !== 'Cancelled' && t !== 'Scrapped Exchange' && t !== 'Post-Ship Exchange');
    });
    if (firstShippableIndex === -1) firstShippableIndex = 0;

    let processed = rows.map((r, i) => {
        let type = r.transaction_type || 'Standard';
        let status = (r.fulfillment_status || '').toLowerCase();
        let lStatus = (r.lineitem_fulfillment_status || '').toLowerCase();
        
        let cogs = (window.getEngineTrueCogs(r.internal_recipe_name) || 0) * (parseFloat(r.qty_sold) || 1);
        let actShipCost;
        
        let isAbandonedPartial = (status !== 'pending' && status !== 'unfulfilled') && (lStatus === 'pending' || lStatus === 'unfulfilled');
        
        if (type === 'Pre-Ship Exchange' || type === 'IGNORE' || type === 'Cancelled' || isAbandonedPartial) { 
            cogs = 0; 
        }
        if (type === 'Post-Ship Exchange' || type === 'Refunded - Restocked') {
            cogs = 0;
        }
        if (type === 'Scrapped Exchange') {
            // cogs is preserved strictly for scraped returns
            // actShipCost assignment removed as it is overwritten later
        }

        let lineRevenue = (parseFloat(r.actual_sale_price || 0) * parseFloat(r.qty_sold || 1)) - parseFloat(r.discount_amount || 0);
        let work;
        let revenueDerivation;
        
        let newSubtotal = r.subtotal;
        let newDiscount = r.discount_amount;
        let newShipping = r.shipping;
        let newTaxes = r.taxes;
        let newTotal = r.total;
        let newSalePrice = r.actual_sale_price;
        let newOutBal = r['Outstanding Balance'];
        
        const isExchangeDonor = type === 'Pre-Ship Exchange' || type === 'Post-Ship Exchange' || type === 'Scrapped Exchange';
        const isVoided = type === 'Cancelled' || type === 'IGNORE' || type === 'Partial Refund';
        const isRefundLoss = type === 'Refunded - Warranty' || type === 'Refunded - Scrapped' || type === 'Refunded - Restocked';
        
        if (isExchangeDonor || isVoided || isRefundLoss) {
            let surrenderedVal = lineRevenue;
            lineRevenue = 0;
            work = isExchangeDonor ? `[Exchange Donor] (Surrendered $${surrenderedVal.toFixed(2)})` : `[Voided/Refunded] (Surrendered $${surrenderedVal.toFixed(2)})`;
            revenueDerivation = isExchangeDonor ? `Surrendered to Replacement ($${surrenderedVal.toFixed(2)} -> $0.00)` : `Refunded/Voided ($0.00)`;
        } else if (type === 'Exchange Replacement') {
            work = `[Replacement Funded]`;
            revenueDerivation = `True Line Value: $${lineRevenue.toFixed(2)}`;
            newTotal = lineRevenue;
        } else {
            let ob = parseFloat(r['Outstanding Balance'] || 0);
            let tot = parseFloat(r.total || 0);
            if (ob > 0) lineRevenue = ob;
            else if (tot > 0 && lineRevenue === 0) lineRevenue = tot;
            
            work = `[Standard Line: $${lineRevenue.toFixed(2)}]`;
            revenueDerivation = `Calculated: $${lineRevenue.toFixed(2)}`;
        }

        let src = r['Source'] || 'web';
        let fee = 0;

        if (hasDbCosts) {
            actShipCost = parseFloat(r.actual_shipping_cost || r.actualShipCost || 0);
        } else {
            actShipCost = (i === firstRowWithMaxShipCostIndex) ? maxCsvShipCost : 0;
        }

        if (!hasDbCosts && (type === 'Pre-Ship Exchange' || type === 'IGNORE' || type === 'Cancelled' || isAbandonedPartial || type === 'Scrapped Exchange')) {
            actShipCost = 0;
        }

        let net = lineRevenue - fee - actShipCost - cogs;
        if (isVoided) net = 0;

        let isCostOnlyItem = (type === 'Gift' || type === 'Warranty' || type === 'NEEDS ATTENTION' || type === 'IGNORE' || type === 'Cancelled' || type === 'Partial Refund' || type === 'Refunded - Restocked' || type === 'Refunded - Scrapped' || type === 'Refunded - Warranty');

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
            rawItemRevenue: lineRevenue,
            liveCogs: cogs, stripeFee: fee, actualShipCost: actShipCost,
            _tempLineRevenue: lineRevenue,
            _src: src
        };
    });

    let activeLineRevenueSum = processed.reduce((sum, r) => sum + r._tempLineRevenue, 0);
    let trueOrderCaptured = activeLineRevenueSum + totalShipping + totalTaxes + unspentExchangeCredit;
    
    let orderStripeFee = 0;
    if (exactPayoutTotal > 0) {
        orderStripeFee = Math.max(0, trueOrderCaptured - exactPayoutTotal);
    } else {
        let src = processed[0] ? processed[0]._src : 'web';
        orderStripeFee = window.getEngineStripeFee(trueOrderCaptured, src);
    }

    processed.forEach((r, i) => {
        let isDonor = r.transaction_type === 'Pre-Ship Exchange' || r.transaction_type === 'Post-Ship Exchange' || r.transaction_type === 'Scrapped Exchange';
        let isVoided = r.transaction_type === 'Cancelled' || r.transaction_type === 'IGNORE' || r.transaction_type === 'Partial Refund';
        
        r.fee = (i === firstShippableIndex) ? orderStripeFee : 0;
        r.stripeFee = r.fee;

        if (!isVoided && !isDonor) {
            // This runs for Standard, Warranty, Gift, Exchange Replacement, AND our isRefundLoss types (using 0 revenue)
            r.net = r._tempLineRevenue + parseFloat(r.forensic_shipping || r.shipping || 0) - r.fee - r.actShipCost - r.cogs;
            if (i === firstShippableIndex && unspentExchangeCredit > 0) {
                r.net += unspentExchangeCredit;
            }
        }

        r.engineGrossCaptured = (isVoided || isDonor || r.isCostOnlyItem) ? 0 : r.trueLineCaptured;
        if (i === firstShippableIndex && !isVoided && !isDonor && !r.isCostOnlyItem) {
            if (unspentExchangeCredit > 0) r.engineGrossCaptured += unspentExchangeCredit;
            r.engineGrossCaptured += totalShipping;
            r.engineGrossCaptured += totalTaxes;
        }

        if (i === firstShippableIndex && trueConcessionRefund > 0) {
            r.net -= trueConcessionRefund;
            r.engineGrossCaptured -= trueConcessionRefund;
            r.applied_order_refund = trueConcessionRefund;
        }

        delete r._tempLineRevenue;
        delete r._src;
    });

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
window.getPrintTime = function(partName, visited = new Set()) {
    if (visited.has(partName)) return 0;
    
    let branchVisited = new Set(visited);
    branchVisited.add(partName);

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
                total += (window.getPrintTime(k.replace('RECIPE:::', ''), branchVisited) * q);
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

/**
 * Surgically sets the text content of a DOM element by ID with a micro-pulse animation.
 * @param {string} id - The target element ID.
 * @param {string|number} val - The content to write safely to the DOM.
 */
const setStat = (id, val) => { 
    const el = document.getElementById(id); 
    if (el) { 
        el.innerText = val; 
        el.classList.add('pulse-orange'); 
        setTimeout(() => el.classList.remove('pulse-orange'), 4000); 
    } 
};

/**
 * Formats a raw number or string representation with standard locale thousands separators.
 * @param {number|string} n - The raw numeric value.
 * @returns {string} The formatted local representation.
 */
const fmtNum = (n) => (!isNaN(n) && n !== null) ? Number(n).toLocaleString() : n;

/**
 * Formats a raw number into a highly-precise locale USD currency string.
 * @param {number|string} n - The raw monetary value.
 * @returns {string} The formatted USD string.
 */
const fmtMoney = (n) => (!isNaN(n) && n !== null) ? '$' + Number(n).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2}) : n;

function syncDatazStats() {
    if (typeof finalResults === 'undefined') return;
    let parcels = new Set(), totalWt = 0;
    let absoluteRawSpend = 0, pureGoodsCost = 0;
    let processedOrdersForPureGoods = new Set();
    let visibleRecords = 0;
    finalResults.forEach(s => {
        let pno = s['Parcel No'];
        if (pno === 'ORPHAN_PARCEL' || pno === 'RECIPE_AUTO') return;
        visibleRecords++;

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
    
    setStat('statDatazRecords', fmtNum(visibleRecords));
    setStat('statDatazParcels', fmtNum(parcels.size));
    setStat('statDatazPaid', fmtMoney(totalLogisticsSpend));
    setStat('statDatazWt', fmtNum(totalWt));
    setStat('statDatazTotalCost', fmtMoney(absoluteRawSpend));
}

function syncEditzStats() {
    if (typeof catalogCache === 'undefined') return;
    let cKeys = Object.keys(catalogCache);
    let usedSet = new Set(), assigned = 0;
    let subAssyCount = 0;
    let retailCount = 0;
    let printsCount = 0;
    let labelCount = 0;
    
    if(typeof productsDB !== 'undefined'){
        Object.keys(productsDB).forEach(pName => {
            let pArr = productsDB[pName];
            pArr.forEach(c => usedSet.add(c.item_key || c.di_item_id || c.name));
            
            let isSub = typeof isSubassemblyDB !== 'undefined' && isSubassemblyDB[pName];
            let isPrint = !!(pArr.is_3d_print);
            let isLabel = !!(pArr.is_label);
            
            if (isLabel) {
                labelCount++;
            } else if (isSub) {
                subAssyCount++;
            } else if (isPrint) {
                printsCount++;
            } else {
                retailCount++;
            }
        });
    }
    
    cKeys.forEach(k => { 
        if (usedSet.has(k)) assigned++;
    });

    setStat('statEditzRetail', fmtNum(retailCount));
    setStat('statEditzLabels', fmtNum(labelCount));
    setStat('statEditzPrints', fmtNum(printsCount));
    setStat('statEditzSubAssy', fmtNum(subAssyCount));
    setStat('statEditzRaw', fmtNum(cKeys.length));
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

    const hasSubassemblyDB = typeof isSubassemblyDB !== 'undefined';

    if (typeof productsDB !== 'undefined') {
        Object.keys(productsDB).forEach(p => {
            let k = `RECIPE:::` + p;
            let i = inventoryDB[k] || {produced_qty:0, sold_qty:0};
            let s = (i.produced_qty || 0) - (i.sold_qty || 0);
            if (!hasSubassemblyDB || !isSubassemblyDB[p]) {
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
        Object.keys(productsDB).filter(p => hasSubassemblyDB && isSubassemblyDB[p]).forEach(p => {
            let k = `RECIPE:::` + p;
            let i = inventoryDB[k] || {produced_qty:0, sold_qty:0};
            simStock[k] = (i.produced_qty || 0) - (i.sold_qty || 0);
        });

        function simCanBuild(recipeName, stockTracker, undoLog = []) {
            if (!productsDB[recipeName] || productsDB[recipeName].length === 0) return false;
            
            let localUndo = [];
            for (let comp of productsDB[recipeName]) {
                let compKey = comp.item_key || comp.di_item_id || comp.name;
                let reqQty = parseFloat(comp.quantity) || 1;
                if (String(compKey).startsWith('RECIPE:::')) {
                    let subName = String(compKey).replace('RECIPE:::', '');
                    let availablePrebuilt = stockTracker[compKey] || 0;
                    if (availablePrebuilt >= reqQty) {
                        localUndo.push({ key: compKey, prev: availablePrebuilt });
                        stockTracker[compKey] -= reqQty;
                    } else {
                        let needed = reqQty - availablePrebuilt;
                        localUndo.push({ key: compKey, prev: availablePrebuilt });
                        stockTracker[compKey] = 0;
                        
                        let possible = true;
                        for (let i = 0; i < needed; i++) {
                            if (!simCanBuild(subName, stockTracker, localUndo)) {
                                possible = false;
                                break;
                            }
                        }
                        if (!possible) {
                            for (let j = localUndo.length - 1; j >= 0; j--) {
                                stockTracker[localUndo[j].key] = localUndo[j].prev;
                            }
                            return false;
                        }
                    }
                } else {
                    let avail = stockTracker[compKey] || 0;
                    if (avail < reqQty) {
                        for (let j = localUndo.length - 1; j >= 0; j--) {
                            stockTracker[localUndo[j].key] = localUndo[j].prev;
                        }
                        return false;
                    }
                    localUndo.push({ key: compKey, prev: avail });
                    stockTracker[compKey] -= reqQty;
                }
            }
            undoLog.push(...localUndo);
            return true;
        }

        let buildable = true;
        let retailRecipes = Object.keys(productsDB).filter(p => !hasSubassemblyDB || !isSubassemblyDB[p]);
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
            x.transaction_type !== 'Pre-Ship Exchange' &&
            x.transaction_type !== 'Post-Ship Exchange' &&
            x.transaction_type !== 'Scrapped Exchange' &&
            x.transaction_type !== 'Exchange Replacement'
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