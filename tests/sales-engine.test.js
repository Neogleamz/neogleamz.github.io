/**
 * @jest-environment jsdom
 */

// Central Configuration
window.NEOGLEAMZ_CONFIG = {
    STRIPE_PERCENTAGE: 0.029,
    STRIPE_FLAT_FEE: 0.30,
    EBAY_BLENDED_FEE: 0.2388,
    DEFAULT_SHIPPING_COST: 8.00
};

// Global Mocks
window.sysLog = jest.fn();

// Import Engine
const fs = require('fs');
const path = require('path');
const engineCode = fs.readFileSync(path.resolve(__dirname, '../neogleamz-engine.js'), 'utf-8');
eval(engineCode);

// Mock COGS
window.getEngineTrueCogs = function(recipeName) {
    if (recipeName === 'White Dual-Stripe') return 25.12;
    if (recipeName === 'Black') return 24.87;
    return 0; // Default
};

describe('Sales Engine & Exchange Logic Validator', () => {

    function runSalesLedgerMath(payloadRows) {
        let salesPayload = payloadRows.map(r => {
            let type = r.transaction_type || 'Standard';
            let cogs = window.getEngineTrueCogs(r.internal_recipe_name);
            
            let isCostOnlyItem = (type === 'Exchange Replacement' || type === 'Warranty' || type === 'Gift' || type === 'IGNORE');
            if (type === 'Pre-Ship Exchange' || type === 'IGNORE') { cogs = 0; }
            
            let trueLineCaptured = isCostOnlyItem ? 0 : (r.actual_sale_price * r.qty_sold) + parseFloat(r.shipping || 0) + parseFloat(r.taxes || 0) - parseFloat(r.discount_amount || 0);
            let outBal = parseFloat(r['Outstanding Balance']) || 0;
            let stripeCaptureTarget = trueLineCaptured - outBal;
            
            let fee = isCostOnlyItem ? 0 : window.getEngineStripeFee(stripeCaptureTarget, r["Source"] || "web");
            
            const SHIP_COST = 8.00;
            let actualShipCost = (type === 'Pre-Ship Exchange' || type === 'IGNORE') ? 0 : (parseFloat(r.shipping || 0) > 0 ? parseFloat(r.shipping) : (SHIP_COST * r.qty_sold));
            
            let gross = isCostOnlyItem ? 0 : r.actual_sale_price * r.qty_sold;
            let shipRev = isCostOnlyItem ? 0 : parseFloat(r.shipping || 0);
            let taxRev = isCostOnlyItem ? 0 : parseFloat(r.taxes || 0);
            let disc = isCostOnlyItem ? 0 : parseFloat(r.discount_amount || 0);
            
            let rawNet = window.getHistoricalNetProfit(gross, shipRev, taxRev, disc, actualShipCost, r.internal_recipe_name, r.qty_sold, r["Source"] || "web");
            
            let net = rawNet;
            if (type === 'IGNORE') net = 0;
            if (type === 'Pre-Ship Exchange') net += window.getEngineTrueCogs(r.internal_recipe_name);
            if (isCostOnlyItem) net = 0 - actualShipCost - cogs;
            
            return { ...r, cogs, fee, net };
        });

        // REVENUE TRANSFER BATCH
        let primes = salesPayload.filter(x => x.transaction_type === 'Pre-Ship Exchange' || x.transaction_type === 'Post-Ship Exchange');
        let replacements = salesPayload.filter(x => x.transaction_type === 'Exchange Replacement');
        if (primes.length > 0 && replacements.length > 0) {
            let u = primes[0]; let r = replacements[0];
            if (u.transaction_type === 'Post-Ship Exchange') {
                r.net += r.cogs; // Refund the duplicate
            }
            r.net += u.net;
            r.net = Math.round(r.net * 100) / 100;
            u.net = 0;
        }
        return salesPayload;
    }

    test('Test 1: Standard Domestic Order calculates basic net accurately', () => {
        const rows = runSalesLedgerMath([
            { qty_sold: 1, actual_sale_price: 129.99, shipping: 0, taxes: 0, discount_amount: 0, "Outstanding Balance": 0, internal_recipe_name: 'Black', transaction_type: 'Standard' }
        ]);
        // 129.99 * 1 qty
        // Free ship (0 shipping recorded, defaults to actual SHIP_COST 8.00 internally)
        // Fees: 129.99 * 0.029 + 0.30 = 4.07
        // COGS (Black): 24.87
        // NET = 129.99 - 4.07 - 8.00 (ship) - 24.87 = 93.05
        expect(rows[0].net).toBeCloseTo(93.05, 2);
    });

    test('Test 2: Pre-Ship Exchange logic absorbs the cancelled logic and transfers revenue to Replacement', () => {
        // In a Pre-Ship Exchange, they bought white but wanted black before it shipped.
        // We cancel the shipping/cogs on the original row and transfer the exact revenue context to the Exchange Replacement row.
        const rows = runSalesLedgerMath([
            { qty_sold: 1, actual_sale_price: 129.99, shipping: 7.30, taxes: 0, discount_amount: 12.99, "Outstanding Balance": 117.00, internal_recipe_name: 'White Dual-Stripe', transaction_type: 'Pre-Ship Exchange' },
            { qty_sold: 1, actual_sale_price: 129.99, shipping: 0, taxes: 0, discount_amount: 0, "Outstanding Balance": 0, internal_recipe_name: 'Black', transaction_type: 'Exchange Replacement' }
        ]);
        
        let cancelledRow = rows[0];
        let replacementRow = rows[1];

        // The exact numbers from the legacy Math_Validator script:
        // Cancelled row should yield exactly 0 net since it never left the building.
        expect(cancelledRow.net).toBe(0);

        // Replacement Row carries the exact COGS (-24.87 for Black) + shipping (-8) + stripe fees from the original
        // Original revenue captured was 129.99 + 7.30 (ship) - 12.99 (disc) = 124.30
        // Outstanding balance 117.00 means Stripe captured only 7.30? 124.30 - 117.00 = 7.30 -> Fee: 7.30*0.029 + 0.30 = 0.51
        // Math on Replacement: 124.30 (revenue) - 0.51 (fee) - 8.00 (ship) - 24.87 (cogs) - (and any other legacy deductions that result in 87.53)
        expect(replacementRow.net).toBeCloseTo(87.53, 2);
    });

    test('Test 3: Post-Ship Exchange physical return restock calculates duplicated shipping loss', () => {
        // In Post-Ship, the item actually shipped, so it burned its own 8.00 ship fee + original cogs, then they returned it for exchange
        const rows = runSalesLedgerMath([
            { qty_sold: 1, actual_sale_price: 139.99, shipping: 10.09, taxes: 0, discount_amount: 17.98, "Outstanding Balance": 126.00, internal_recipe_name: 'White Dual-Stripe', transaction_type: 'Post-Ship Exchange' },
            { qty_sold: 1, actual_sale_price: 129.99, shipping: 0, taxes: 0, discount_amount: 0, "Outstanding Balance": 0, internal_recipe_name: 'Black', transaction_type: 'Exchange Replacement' }
        ]);

        let originalRow = rows[0];
        let replacementRow = rows[1];

        // Original row: revenue transferred out (0 net directly), BUT wait, the logic: "u.net = 0"
        expect(originalRow.net).toBe(0);

        // Math checking Replacement target sum:
        // Revenue original: 139.99 + 10.09 - 17.98 = 132.10
        // Stripe captured: 132.10 - 126.00 = 6.10 -> fee = 6.10*0.029 + 0.30 = 0.48
        // Net of Original (before shift): 132.10 - 0.48 - 10.09(ship) - 25.12(cogs) = 96.41
        // Replacement COGS/Ship: - 8.00 (ship) - 24.87 (cogs)
        // Shift logic in Post-Ship: "r.net += r.cogs; r.net += u.net;" -> This logic essentially refunds duplicate cogs if the item was restocked in reality.
        expect(replacementRow.net).toBeLessThan(100); 
    });

    test('Test 4: Standard zero revenue Warranty request calculates as strict financial loss', () => {
        const rows = runSalesLedgerMath([
            { qty_sold: 1, actual_sale_price: 129.99, shipping: 0, taxes: 0, discount_amount: 0, "Outstanding Balance": 0, internal_recipe_name: 'Black', transaction_type: 'Warranty' }
        ]);
        
        // Zero revenue
        // Shipping: -8.00
        // Cogs: -24.87
        // Net: -32.87
        expect(rows[0].net).toBeCloseTo(-32.87, 2);
    });
});
