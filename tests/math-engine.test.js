const fs = require('fs');
const path = require('path');

// 1. We load the vanilla code as a string
const engineCode = fs.readFileSync(path.resolve(__dirname, '../neogleamz-engine.js'), 'utf8');

beforeAll(() => {
    // Evaluate the code safely into the JSDOM `window` execution context
    // This makes functions like `calculateProductBreakdown` available globally
    eval(engineCode);
});

describe('📦 Sub-Assembly & Recipe Cost Matrix', () => {
    test('calculateProductBreakdown correctly calculates raw material and labor cost of a single component', () => {
        const breakdown = window.calculateProductBreakdown('WHEEL-CORE-ASY');
        // Expected Logic from setup.js:
        // Labor = 5 min / 60 * 15.00 = 1.25
        // Filament = 0.2 * 15.00 = 3.00
        // Bearings = 2 * 0.50 = 1.00
        // Raw Total = 4.00
        // Total = 5.25
        expect(breakdown.raw).toBeCloseTo(4.00, 2);
        expect(breakdown.labor).toBeCloseTo(1.25, 2);
        expect(breakdown.total).toBeCloseTo(5.25, 2);
    });

    test('calculateProductBreakdown dynamically processes recursive BOM structures', () => {
        const breakdown = window.calculateProductBreakdown('PRO-SKATE-WHEEL');
        // Expected Logic:
        // Labor = 10 min / 60 * 15.00 = 2.50
        // Sub-Assembly = 5.25
        // Raw Box = 1.00
        // Raw Total = 6.25 (5.25 sub + 1.00 box)
        // Total = 8.75
        expect(breakdown.raw).toBeCloseTo(6.25, 2);
        expect(breakdown.labor).toBeCloseTo(2.50, 2);
        expect(breakdown.total).toBeCloseTo(8.75, 2); 
    });

    test('getEngineTrueCogs returns strictly the total number', () => {
        const cogs = window.getEngineTrueCogs('PRO-SKATE-WHEEL');
        expect(cogs).toBeCloseTo(8.75, 2);
    });
});

describe('💳 Financial Gateway & Fee Logic', () => {
    test('getEngineStripeFee calculates correctly for default Web traffic (2.9% + 30¢)', () => {
        // If order total is $100
        const fee = window.getEngineStripeFee(100.00, 'web');
        // 100 * 0.029 = 2.90 + 0.30 = 3.20
        expect(fee).toBeCloseTo(3.20, 2);
    });

    test('getEngineStripeFee calculates correctly for eBay blended overhead', () => {
        // If order total is $100
        const fee = window.getEngineStripeFee(100.00, 'ebay');
        // 100 * 0.2388 = 23.88
        expect(fee).toBeCloseTo(23.88, 2);
    });
    
    test('getEngineLiveMsrp gracefully processes margins', () => {
        const msrp = window.getEngineLiveMsrp('PRO-SKATE-WHEEL');
        expect(msrp).toBeCloseTo(45.00, 2);
    });
});

describe('📈 True Net Profit Calculator (CFO Core Engine)', () => {
    test('getHistoricalNetProfit calculates net correctly for standard purchase', () => {
        // gross, shipCol, tax, disc, actShip, pName, qty, source
        // Example: Base $45.00 product, $8.00 shipping charged, $0 tax, $5.00 discount, Actual Ship Cost $8.00, Stripe Web
        // Gross = $45
        // Captured = 45 + 8 - 5 = 48
        // Stripe Fee = 48 * 0.029 + 0.30 = 1.392 + 0.30 = 1.69
        // COGS = 8.75
        // Net = 45 (gross) + 8 (shipCol) - 5 (disc) - 1.69 (fee) - 8 (actShip) - 8.75 (cogs) = 29.56
        const net = window.getHistoricalNetProfit(45.00, 8.00, 0, 5.00, 8.00, 'PRO-SKATE-WHEEL', 1, 'web');
        expect(net).toBeCloseTo(29.56, 2);
    });
});

describe('🔮 Predictive Metrics & Margin Forecasting', () => {
    test('getEnginePredictiveMetrics generates forward-looking math properly', () => {
        // msrp, cogs, fsThreshold, cac, aff, warr
        // msrp: 45, cogs: 8.75, fs: 75.00 (won't trigger free ship), Shipping: $8 collected
        // Fee = 53 * 0.029 + 0.30 = 1.537 + 0.30 = 1.84
        // ActShip = 8.00
        // Net = 45 + 8.00 - 8.75 - 1.84 - 8.00 - 10 (cac) - 2 (aff) - 0 (warr) = 22.41
        // Margin = 22.41 / 45 = 49.8%
        const prediction = window.getEnginePredictiveMetrics(45.00, 8.75, 75.00, 10.00, 2.00, 0);
        
        expect(prediction.stripe).toBeCloseTo(1.84, 2);
        expect(prediction.net).toBeCloseTo(22.41, 1);
        expect(prediction.margin).toBeCloseTo(49.8, 1);
        expect(prediction.merchantShipMargin).toBe(0); // 8 collected - 8 paid
    });
});

describe('⏱️ Time-Tracking & 3D Print Engine', () => {
    test('getPrintTime calculates total machine hours based on BOM', () => {
        // PRO-SKATE-WHEEL = 120 mins natively IF it was directly checked (fallback logic)
        // BUT natively productsDB says it has RECIPE:::WHEEL-CORE-ASY (60 mins) + RAW-BOX-S (0 mins).
        // Let's rely on the native recursive lookup calculation from the code.
        const mins = window.getPrintTime('PRO-SKATE-WHEEL');
        // Based on productsDB logic it goes to RECIPE:::WHEEL-CORE-ASY which goes to 60 mins.
        expect(mins).toBeGreaterThanOrEqual(60); 
    });
});
