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
    
    // If a pre-calculated True COGS is hardcoded in the DB, use it
    if (productsDB[matchedKey].cogs) {
        cogs = parseFloat(productsDB[matchedKey].cogs);
    } 
    // Otherwise, dynamically calculate Materials + Labor
    else {
        let rawCost = typeof calculateProductTotal === 'function' ? calculateProductTotal(matchedKey) : 0;
        let labCost = 0;
        if (typeof laborDB !== 'undefined' && laborDB[matchedKey]) {
            labCost = (parseFloat(laborDB[matchedKey].time) / 60) * parseFloat(laborDB[matchedKey].rate);
        }
        cogs = rawCost + labCost;
    }
    
    return cogs;
}

/**
 * 2. THE STICKER PRICE: LIVE MSRP
 * Hunts the database for the active website price.
 */
function getEngineLiveMsrp(productName) {
    let matchedKey = findMasterRecipeKey(productName);
    if (!matchedKey) return 0.00;

    let pData = productsDB[matchedKey];
    // Hunts for any variation of the price column name
    return parseFloat(pData.msrp || pData.price || pData.retail_price || pData.retailPrice || pData.MSRP) || 0.00;
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
 * 5. HISTORICAL ACTUALS: NET PROFIT (For Analytics/Sales)
 * The exact cash kept on a real, historical order.
 */
function getHistoricalNetProfit(actualSalePrice, shippingCollected, taxCollected, totalDiscount, actualPostage, productName) {
    let totalCaptured = (actualSalePrice + shippingCollected + taxCollected) - totalDiscount;
    let stripeFee = getEngineStripeFee(totalCaptured);
    let cogs = getEngineTrueCogs(productName);
    
    // Tax is subtracted because it is a liability pass-through, not kept revenue.
    return totalCaptured - taxCollected - stripeFee - actualPostage - cogs;
}