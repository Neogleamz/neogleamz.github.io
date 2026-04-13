const fs = require('fs');
const path = require('path');

// 1. We load the vanilla code as a string
const engineCode = fs.readFileSync(path.resolve(__dirname, '../neogleamz-engine.js'), 'utf8');

describe('NeoEngine Zero-Build Strict Typing Mathematical Validations', () => {
    
    beforeAll(() => {
        // 2. Evaluate the code safely into the JSDOM `window` execution context
        // This makes functions like `calculateProductBreakdown` available globally
        eval(engineCode);
    });

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

    test('calculateProductBreakdown dynamically processes recursive BOM structures (Sub-assemblies)', () => {
        const breakdown = window.calculateProductBreakdown('PRO-SKATE-WHEEL');
        
        // Expected Logic:
        // Labor = 10 min / 60 * 15.00 = 2.50
        // Sub-Assembly = 5.25
        // Raw Box = 1.00
        // Raw Total = 6.25
        // Total = 8.75
        
        expect(breakdown.raw).toBeCloseTo(6.25, 2);
        expect(breakdown.labor).toBeCloseTo(2.50, 2);
        expect(breakdown.total).toBeCloseTo(8.75, 2); 
    });

    test('getEngineTrueCogs returns strictly the total number', () => {
        const cogs = window.getEngineTrueCogs('PRO-SKATE-WHEEL');
        expect(cogs).toBeCloseTo(8.75, 2);
    });
    
    test('getEngineLiveMsrp gracefully processes margins', () => {
        const msrp = window.getEngineLiveMsrp('PRO-SKATE-WHEEL');
        expect(msrp).toBeCloseTo(45.00, 2);
    });
});
