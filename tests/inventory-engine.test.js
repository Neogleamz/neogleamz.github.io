const fs = require('fs');
const path = require('path');

const engineCode = fs.readFileSync(path.resolve(__dirname, '../neogleamz-engine.js'), 'utf8');
const invCode = fs.readFileSync(path.resolve(__dirname, '../inventory-module.js'), 'utf8');

beforeAll(() => {
    // Provide a basic DOM for inventory-module since it creates <style> tags
    document.body.innerHTML = '<div></div>';

    // Mock localStorage since inventory-module calls it
    let mockStorage = {};
    window.localStorage = {
        getItem: (k) => mockStorage[k] || null,
        setItem: (k, v) => mockStorage[k] = String(v),
        removeItem: (k) => delete mockStorage[k],
        clear: () => mockStorage = {}
    };

    eval(engineCode);
    eval(invCode);
});

describe('📦 Inventory Intelligence & ROP Algorithms', () => {
    test('calculateTrailingVelocity correctly computes daily average over 30 days', () => {
        // Mock salesDB to have some sales within the last 30 days
        let today = new Date();
        let tenDaysAgo = new Date(today);
        tenDaysAgo.setDate(today.getDate() - 10);
        let fortyDaysAgo = new Date(today);
        fortyDaysAgo.setDate(today.getDate() - 40);

        window.salesDB = [
            // Should be counted (1 PRO-SKATE-WHEEL = 1 RECIPE + raw materials)
            { sale_date: tenDaysAgo.toISOString(), transaction_type: 'Order', internal_recipe_name: 'PRO-SKATE-WHEEL', qty_sold: 6 },
            // Should NOT be counted (too old)
            { sale_date: fortyDaysAgo.toISOString(), transaction_type: 'Order', internal_recipe_name: 'PRO-SKATE-WHEEL', qty_sold: 100 },
            // Should NOT be counted (Refund)
            { sale_date: tenDaysAgo.toISOString(), transaction_type: 'Refund', internal_recipe_name: 'PRO-SKATE-WHEEL', qty_sold: 5 },
        ];

        // PRO-SKATE-WHEEL requires 1 WHEEL-CORE-ASY (which requires 2 RAW-BEARING)
        // Let's test the trailing velocity of RECIPE:::PRO-SKATE-WHEEL
        // Total valid sales in 30 days = 6
        // Velocity = 6 / 30 = 0.20 items/day
        const velRecipe = window.calculateTrailingVelocity('RECIPE:::PRO-SKATE-WHEEL', 30);
        expect(velRecipe).toBeCloseTo(0.20, 2);

        // Test Raw Material demand (RAW-BEARING)
        // 6 PRO-SKATE-WHEEL sold. Each takes 1 WHEEL-CORE-ASY. Each wheel core takes 2 RAW-BEARING.
        // Total RAW-BEARING needed = 6 * 1 * 2 = 12
        // Velocity = 12 / 30 = 0.40 items/day
        const velBearing = window.calculateTrailingVelocity('RAW-BEARING', 30);
        expect(velBearing).toBeCloseTo(0.40, 2);
    });

    test('calculateDynamicROP triggers correct bounds considering velocity and lead time', () => {
        // If Velocity is 0.40 items per day, and Supplier Lead Time is 5 days
        // It should be 0.40 * 5 = 2.0. Then adding Safety Stock Multiplier (1.10) => 2.20
        const rop = window.calculateDynamicROP(0.40, 5);
        expect(rop).toBeCloseTo(2.20, 2);

        // Should return 0 if no velocity to avoid infinite restocking algorithms
        const zeroRop = window.calculateDynamicROP(0, 5);
        expect(zeroRop).toBe(0);
    });
});
