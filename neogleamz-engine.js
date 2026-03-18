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
    
    if (productsDB[matchedKey].cogs) {
        // Strip $ just in case
        cogs = parseFloat(String(productsDB[matchedKey].cogs).replace(/[^0-9.-]+/g,""));
    } else {
        let rawCost = typeof calculateProductTotal === 'function' ? calculateProductTotal(matchedKey) : 0;
        let labCost = 0;
        if (typeof laborDB !== 'undefined' && laborDB[matchedKey]) {
            labCost = (parseFloat(laborDB[matchedKey].time) / 60) * parseFloat(laborDB[matchedKey].rate);
        }
        cogs = rawCost + labCost;
    }
    
    return isNaN(cogs) ? 0.00 : cogs;
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
