const fs = require('fs');

// Environment Mock
global.window = global;
global.NEOGLEAMZ_CONFIG = { DEFAULT_SHIPPING_COST: 8.00 };
global.window.addEventListener = () => {};
global.document = { addEventListener: () => {}, getElementById: () => null, querySelectorAll: () => [] };
global.localStorage = { getItem: () => null, setItem: () => {} };
global.StripeRates = {
    web: { percent: 0.029, fixed: 0.30 },
    ebay: { percent: 0.1325, fixed: 0.30 }
};

// Import Engine Natively
const engineCode = fs.readFileSync('./neogleamz-engine.js', 'utf-8');
eval(engineCode);

// Mock Recipes
// Mock Recipes (Bypass dynamic JSON fetch)
window.getEngineTrueCogs = function(recipeName) {
    if (recipeName === 'White Dual-Stripe') return 25.12;
    if (recipeName === 'Black') return 24.87;
    return 0;
};

console.log("====================================================");
console.log("NEOGLEAMZ FINANCIAL MATHEMATICS ENGINE AUDIT V.1.0");
console.log("====================================================\n");

// ----------------------------------------------------
// RAW PAYLOAD SIMULATOR
// ----------------------------------------------------
function executeSimulation(testName, payloadRows) {
    console.log(`[TESTING] ${testName}`);
    
    // EXECUTE AUTHORITATIVE ENGINE
    let salesPayload = window.runForensicAccounting(payloadRows);

    // OUTPUT
    salesPayload.forEach(row => {
        console.log(` -> Row: ${row.internal_recipe_name} (${row.transaction_type})`);
        console.log(`    COGS applied: $${row.cogs.toFixed(2)} | Stripe Fee applied: $${row.fee.toFixed(2)}`);
        console.log(`    FINAL TRUE NET PROFIT: $${row.net.toFixed(2)}`);
    });
    console.log("----------------------------------------------------");
}



// ----------------------------------------------------
// TEST MATRIX
// ----------------------------------------------------

executeSimulation("Test 1: Standard Domestic Order (Free Ship)", [
    { qty_sold: 1, actual_sale_price: 129.99, shipping: 0, taxes: 0, discount_amount: 0, "Outstanding Balance": 0, total: 129.99, internal_recipe_name: 'Black', transaction_type: 'Standard' }
]);

executeSimulation("Test 2: Order 1028 (High Volume Multi-Item 3x SOULZ)", [
    { qty_sold: 3, actual_sale_price: 129.99, shipping: 0, taxes: 0, discount_amount: 38.99, "Outstanding Balance": 0, total: 351.00, internal_recipe_name: 'Black', transaction_type: 'Standard' }
]);

executeSimulation("Test 3: Pre-Ship Exchange (Order 1019)", [
    { qty_sold: 1, actual_sale_price: 129.99, shipping: 7.30, taxes: 0, discount_amount: 12.99, "Outstanding Balance": 117.00, total: 124.30, internal_recipe_name: 'White Dual-Stripe', transaction_type: 'Pre-Ship Exchange' },
    { qty_sold: 1, actual_sale_price: 129.99, shipping: 0, taxes: 0, discount_amount: 0, "Outstanding Balance": 0, total: 129.99, internal_recipe_name: 'Black', transaction_type: 'Exchange Replacement' }
]);

executeSimulation("Test 4: Post-Ship Exchange (Order 1017) (Restock physical return)", [
    { qty_sold: 1, actual_sale_price: 139.99, shipping: 10.09, taxes: 0, discount_amount: 17.98, "Outstanding Balance": 126.00, total: 132.10, internal_recipe_name: 'White Dual-Stripe', transaction_type: 'Post-Ship Exchange' },
    { qty_sold: 1, actual_sale_price: 129.99, shipping: 0, taxes: 0, discount_amount: 0, "Outstanding Balance": 0, total: 129.99, internal_recipe_name: 'Black', transaction_type: 'Exchange Replacement' }
]);

executeSimulation("Test 5: Standard Warranty Request (Free Zero Revenue Shipment)", [
    { qty_sold: 1, actual_sale_price: 129.99, shipping: 0, taxes: 0, discount_amount: 0, "Outstanding Balance": 0, total: 0.00, internal_recipe_name: 'Black', transaction_type: 'Warranty' }
]);

