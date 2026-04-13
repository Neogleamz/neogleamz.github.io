// ==========================================
// NEO-ENGINE JEST ENVIRONMENT MOCKS
// ==========================================

// 1. Mock the native File System capabilities often expected by JSDOM environments during canvas/audio executions
window.URL.createObjectURL = function() {};

// 2. Setup mock Databases to make math output deterministic!
window.ENGINE_CONFIG = {
    flatLaborMin: 15.00, // 25 cents per minute
    flatShipping: 8.00,
    packagingBase: 1.50
};

window.catalogCache = {
    "RAW-FILAMENT-BLK": { totalQty: 100, avgUnitCost: 15.00, scrapRate: 0.1 },
    "RAW-BEARING": { totalQty: 500, avgUnitCost: 0.50, scrapRate: 0.05 },
    "RAW-BOX-S": { totalQty: 1000, avgUnitCost: 1.00, scrapRate: 0.01 }
};

window.isSubassemblyDB = {
    "WHEEL-CORE-ASY": true
};

window.productsDB = {
    "WHEEL-CORE-ASY": [
        { item_key: "RAW-FILAMENT-BLK", quantity: 0.2 }, 
        { item_key: "RAW-BEARING", quantity: 2 }         
    ],
    "PRO-SKATE-WHEEL": [
        { name: "RECIPE:::WHEEL-CORE-ASY", quantity: 1 }, 
        { item_key: "RAW-BOX-S", quantity: 1 } 
    ]
};

// Add properties required by engine
window.productsDB["WHEEL-CORE-ASY"].is_subassembly = true;
window.productsDB["PRO-SKATE-WHEEL"].msrp = 45.00;

window.laborDB = {
    "WHEEL-CORE-ASY": { time: 5, rate: 15.00 },
    "PRO-SKATE-WHEEL": { time: 10, rate: 15.00 }
};

window.pricingDB = {
    "PRO-SKATE-WHEEL": { msrp: 45.00 }
};

window.inventoryDB = {
    "RECIPE:::WHEEL-CORE-ASY": { produced_qty: 10, sold_qty: 0 }
};

window.salesDB = [
    { order_id: 1, internal_recipe_name: "PRO-SKATE-WHEEL", qty_sold: 1, total: 45.00, net: 20.00 }
];

window.sysLog = function(msg) { /* silence console spam */ };
