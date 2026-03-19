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

    let cogs = 0;
    
    if (productsDB[matchedKey] && productsDB[matchedKey].cogs) {
        // Strip $ just in case
        cogs = parseFloat(String(productsDB[matchedKey].cogs).replace(/[^0-9.-]+/g,""));
    } else {
        cogs = calculateProductTotal(matchedKey);
    }
    
    return isNaN(cogs) ? 0.00 : cogs;
}

/**
 * CORE BOM MATH: Recursively calculates the raw and labor breakdown of any product or sub-assembly.
 */
function calculateProductBreakdown(pName, visited = new Set()) {
    if (visited.has(pName)) return { raw: 0, labor: 0, print: 0, total: 0 };
    visited.add(pName);
    let rawCost = 0;
    let totalPrintTime = 0;
    (productsDB[pName] || []).forEach(part => {
        let k = String(part.item_key || part.di_item_id || part.name || "");
        let q = parseFloat(part.quantity || part.qty) || 1;
        if (k.startsWith('RECIPE:::')) {
            let subBreakdown = calculateProductBreakdown(k.replace('RECIPE:::', ''), new Set(visited));
            rawCost += (subBreakdown.total * q); 
            totalPrintTime += (subBreakdown.print * q);
        } else if (catalogCache[k]) {
            rawCost += (catalogCache[k].avgUnitCost * q);
        }
    });

    // Add this product's own print time if it's flagged as a 3D print
    if (productsDB[pName] && productsDB[pName].is_3d_print) {
        totalPrintTime += (parseFloat(productsDB[pName].print_time_mins) || 0);
    }

    let laborCost = 0;
    if (laborDB[pName]) {
        laborCost = (laborDB[pName].time / 60) * laborDB[pName].rate;
    }
    return { raw: rawCost, labor: laborCost, print: totalPrintTime, total: rawCost + laborCost };
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
        oop: oop,
        stripe: stripeFee,
        aff: affAmt,
        warr: warrAmt,
        ship: ENGINE_CONFIG.flatShipping,
        merchantShipMargin: merchantShipCost,
        net: netProfit
    };
}
