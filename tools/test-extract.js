const fs = require('fs');

// We simulate what updateSaleType is doing to see if there is a ReferenceError or NaN thrown.
let code = fs.readFileSync('./sales-module.js', 'utf8');

let mockEnv = `
window = global;
global.sysLog = console.log;
global.setMasterStatus = function() {};
global.supabaseClient = { from: () => ({ update: () => ({ eq: () => ({ eq: async () => ({ error: null }) }) }) }) };
global.renderSalesTable = function() {};
global.renderInventoryTable = function() {};
global.renderAnalyticsDashboard = function() {};
global.getEngineTrueCogs = function() { return 24.87; };
global.getEngineStripeFee = function() { return 10.48; };
global.getHistoricalNetProfit = function() { return 100.28; };

let salesDB = [{
    order_id: '#1028',
    storefront_sku: 'SK8Lytz SOULZ - Block',
    transaction_type: 'Standard',
    qty_sold: 3,
    actual_sale_price: 129.99,
    shipping: 0,
    taxes: 0,
    discount_amount: 38.99,
    'Outstanding Balance': 0,
    Source: 'web',
    internal_recipe_name: 'Soulz Block'
}];

// Execute the sales module (just the updateSaleType function basically)
`;

// Extract updateSaleType
let funcMatch = code.match(/window\.updateSaleType = async function[\s\S]+?\}\s*\n\}/);
if(funcMatch) {
    fs.writeFileSync('./test-sale-type.js', mockEnv + funcMatch[0] + "\n\nwindow.updateSaleType({value: 'Warranty'}, '#1028', 'SK8Lytz SOULZ - Block').catch(console.error);");
} else {
    console.log("Could not extract function");
}
