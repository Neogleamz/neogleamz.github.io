const fs = require('fs');
const path = require('path');

const engineCode = fs.readFileSync(path.resolve(__dirname, '../neogleamz-engine.js'), 'utf8');
const ceoCode = fs.readFileSync(path.resolve(__dirname, '../ceo-module.js'), 'utf8');

beforeAll(() => {
    // Provide a basic DOM for ceo-module
    document.body.innerHTML = `
        <input id="globalCacNum" value="15.00">
        <input id="globalAffNum" value="5.00">
        <input id="globalWarrNum" value="2.50">
        <input id="ceo-fs-threshold" value="50.00">
        
        <input id="ceo-vol-0-num" value="100">
        <input id="ceo-testmsrp-0" value="45.00">
        
        <input id="ceo-vol-1-num" value="50">
        <input id="ceo-testmsrp-1" value="120.00">
        
        <canvas id="waterfallChart"></canvas>
        <canvas id="unitChart"></canvas>
        <canvas id="efficiencyChart"></canvas>
        <canvas id="curEfficiencyChart"></canvas>
        <div id="ceo-dynamic-sliders"></div>
        
        <div id="kpiGross"></div>
        <div id="kpiOldNet"></div>
        <div id="kpiNewNet"></div>
        <div id="kpiSaved"></div>
        <div id="kpiRepeatRate"></div>
        <div id="kpiAvgLTV"></div>
    `;

    window.NEOGLEAMZ_CONFIG = { DEFAULT_SHIPPING_COST: 8.00 };
    window.ENGINE_CONFIG = { flatShipping: 8.00 };
    
    // Mock the chart library
    window.Chart = class {
        constructor(ctx, config) {
            this.ctx = ctx;
            this.config = config;
        }
        update() {}
        destroy() {}
    };
    window.ChartDataLabels = {};
    window.ceoFmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
    
    eval(engineCode);
    eval(ceoCode);

    window.sysLog = jest.fn();
    window.calculateProductBreakdown = jest.fn((name) => ({ total: name === 'PROD-A' ? 10.00 : 30.00 }));
    window.getEngineTrueCogs = jest.fn((name) => name === 'PROD-A' ? 10.00 : 30.00);
});

describe('CEO Waterfall Mathematics', () => {

    beforeEach(() => {
        // Reset the active products for each test
        window.ceoActiveProducts = [
            { name: 'PROD-A', vol: 100, currentMsrp: 40.00, testMsrp: 45.00, applyCac: true, applyAff: true, applyWarr: false, cogs: 10.00 },
            { name: 'PROD-B', vol: 50, currentMsrp: 110.00, testMsrp: 120.00, applyCac: false, applyAff: false, applyWarr: true, cogs: 30.00 }
        ];
    });

    test('Validates sub-totals and Gross Revenue cascading logic', () => {
        const metrics = window._calculateCeoMetrics();

        // 4500 + 6000 = 10500 Gross Revenue (MSRP based)
        expect(metrics.totals.gross).toBe(10500);
        
        // 1316.3 + 3786.0 = 5102.3
        expect(metrics.totals.testNet).toBeCloseTo(5102.3, 1);
        
        // Cogs: (10*100) + (30*50) = 2500
        expect(metrics.totals.cogs).toBe(2500);
        
        // CAC: (15*100) + (0*50) = 1500
        expect(metrics.totals.cac).toBe(1500);

        // Stripe: 183.7 + 189.0 = 372.7
        expect(metrics.totals.stripe).toBeCloseTo(372.7, 1);
        
        // Waterfall Array:
        // [Cogs(2500), CAC(1500), Aff(500), Warr(125), Ship_Out_of_Pocket, Stripe(372.7), Net(5102.3)]
        // Ship OOP = 0 + 400 (PROD-B free shipping cost) = 400
        expect(metrics.totals.ship).toBeCloseTo(400, 1);
    });

    test('Validates merchant shipping margins correctly map to the array', () => {
        const metrics = window._calculateCeoMetrics();
        
        // metrics.charts.eff should contain the efficiency array
        // PROD-A Efficiency: (ShipCollected - ShipPaid) / b
        // 8 - 8 = 0
        expect(metrics.charts.eff[0][4]).toBeCloseTo(0, 1); // 0%
        
        // PROD-B Efficiency: (ShipCollected - ShipPaid) / b
        // 0 - 8 = -8.  -8 / 120 = -6.66%
        expect(metrics.charts.eff[1][4]).toBeCloseTo(-6.66, 1);
    });
});

describe('LTV and Cohort Analytics', () => {
    test('Calculates repeat rate and LTV while ignoring warranty/gift replacements', () => {
        window._ltvCacheLength = -1; // Force recalculation
        
        window.salesDB = [
            // Customer 1: Bought twice
            { customer_email_hash: 'hash-1', order_id: 'ORD-1', transaction_type: 'Standard', net_profit: 50 },
            { customer_email_hash: 'hash-1', order_id: 'ORD-2', transaction_type: 'Standard', net_profit: 60 },
            { customer_email_hash: 'hash-1', order_id: 'ORD-3', transaction_type: 'Warranty', net_profit: -10 }, // Ignored from repeat count but impacts net!
            
            // Customer 2: Bought once, multi-item order
            { customer_email_hash: 'hash-2', order_id: 'ORD-4', transaction_type: 'Standard', net_profit: 100 },
            { customer_email_hash: 'hash-2', order_id: 'ORD-4', transaction_type: 'Standard', net_profit: 20 },
            
            // Customer 3: Warranty claim ONLY (never bought legitimately on this platform, e.g. imported history)
            { customer_email_hash: 'hash-3', order_id: 'ORD-5', transaction_type: 'Warranty', net_profit: -15 }
        ];

        // Call _syncCeoKPIs with mock totals
        window._syncCeoKPIs({ totals: { gross: 0, curNet: 0, testNet: 0 } });

        // Total unique hashes = 3 (hash-1, hash-2, hash-3)
        // Repeat buyers (legitimately > 1 order_id) 
        // Hash 1: ORD-1, ORD-2 -> 2 orders -> REPEAT
        // Hash 2: ORD-4 -> 1 order -> NOT REPEAT
        // Hash 3: ORD-5 (Warranty) -> 0 legitimate orders -> NOT REPEAT
        // Repeat Rate = 1 / 3 = 33.33%
        
        expect(window._ltvCachedRepeatRate).toBeCloseTo(33.33, 1);

        // Average Net LTV = Total Net Profit / Unique Hashes
        // Total Net = (50 + 60 - 10) + (100 + 20) + (-15) = 100 + 120 - 15 = 205
        // Avg LTV = 205 / 3 = 68.33
        expect(window._ltvCachedAvg).toBeCloseTo(68.33, 1);
    });
});
