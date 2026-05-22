
beforeAll(() => {
    // Provide global variables needed for production-module logic
    window.productsDB = {};
    window.catalogCache = {};
    window.inventoryDB = {};
    window.workOrdersDB = [];
    window.sopsDB = {};
    window.sysLog = jest.fn();

    // Mock DOM elements that might be accessed globally
    document.body.innerHTML = `
        <div id="mediaContainer"></div>
        <div id="mediaModal"></div>
    `;

    require('../assets/js/production-module.js');
});

describe("Production Algorithm: calculateExactWODeductions", () => {
    
    beforeEach(() => {
        window.productsDB = {};
    });

    test("Deducts simple raw materials from Top Level build", () => {
        window.productsDB = {
            "PRODUCT-A": [
                { item_key: "RAW-1", qty: 2 },
                { item_key: "RAW-2", qty: 1 }
            ]
        };

        const wo = { product_name: "PRODUCT-A", qty: 5, routing: {} };
        const res = window.calculateExactWODeductions(wo);

        expect(res.raws).toEqual({ "RAW-1": 10, "RAW-2": 5 });
        expect(res.raws_production).toEqual({ "RAW-1": 10, "RAW-2": 5 });
        expect(res.raws_assembly).toEqual({});
        expect(res.built_subs).toEqual({});
        expect(res.pulls).toEqual({});
    });

    test("Handles nested sub-assemblies cascading mathematically", () => {
        window.productsDB = {
            "PRODUCT-B": [
                { item_key: "RECIPE:::SUB-1", qty: 2 }
            ],
            "SUB-1": [
                { item_key: "RECIPE:::SUB-2", qty: 1 },
                { item_key: "RAW-X", qty: 3 }
            ],
            "SUB-2": [
                { item_key: "RAW-Y", qty: 4 }
            ]
        };

        const wo = { product_name: "PRODUCT-B", qty: 1, routing: {
            "SUB-1": { build: 2, pull: 0 },
            "SUB-2": { build: 2, pull: 0 }
        }};

        const res = window.calculateExactWODeductions(wo);

        // Sub-1 (build 2) uses 2 * 3 = 6 RAW-X
        // Sub-2 (build 2) uses 2 * 4 = 8 RAW-Y
        expect(res.raws).toEqual({ "RAW-X": 6, "RAW-Y": 8 });
        expect(res.raws_assembly).toEqual({ "RAW-X": 6, "RAW-Y": 8 });
        expect(res.built_subs).toEqual({ "RECIPE:::SUB-1": 2, "RECIPE:::SUB-2": 2 });
        expect(res.pulls).toEqual({});
    });

    test("Handles shelf pulls bypassing deeper raw material deduction", () => {
        window.productsDB = {
            "PRODUCT-C": [
                { item_key: "RECIPE:::SUB-3", qty: 1 }
            ],
            "SUB-3": [
                { item_key: "RAW-Z", qty: 5 }
            ]
        };

        // We pull the sub-assembly instead of building it.
        const wo = { product_name: "PRODUCT-C", qty: 2, routing: {
            "SUB-3": { build: 0, pull: 2 }
        }};

        const res = window.calculateExactWODeductions(wo);

        // Because we pull it, RAW-Z should not be deducted!
        expect(res.raws).toEqual({});
        expect(res.pulls).toEqual({ "RECIPE:::SUB-3": 2 });
        expect(res.built_subs).toEqual({});
    });

    test("Treats 3D Prints as raw materials and does not traverse into them", () => {
        window.productsDB = {
            "PRODUCT-D": [
                { item_key: "RECIPE:::PRINT-1", qty: 3 }
            ],
            "PRINT-1": {
                is_3d_print: true, // Marker for 3D Print
                length: 0 // Mocking array property access (BOM structure inside is empty or not used for traverse)
            }
        };
        // Provide the recipe inside as an array just in case traverse tries
        Object.defineProperty(window.productsDB["PRINT-1"], "forEach", {
            value: function(cb) {
                [{ item_key: "RAW-FILAMENT", qty: 10 }].forEach(cb);
            }
        });

        const wo = { product_name: "PRODUCT-D", qty: 1, routing: {} };
        const res = window.calculateExactWODeductions(wo);

        // It should treat PRINT-1 as a raw material for PRODUCTION, and NOT traverse to RAW-FILAMENT.
        expect(res.raws).toEqual({ "RECIPE:::PRINT-1": 3 });
        expect(res.raws_production).toEqual({ "RECIPE:::PRINT-1": 3 });
        // The RAW-FILAMENT should be 0 because 3D prints defer filament deductions to the Layerz module completion.
        expect(res.raws["RAW-FILAMENT"]).toBeUndefined();
    });

});
