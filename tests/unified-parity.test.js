/**
 * @jest-environment jsdom
 */

describe("Unified SKU & Barcode Parity Engine (UHIA)", () => {
    beforeAll(() => {
        // Setup initial global mocks
        window.aliasDB = {};
        window.aliasMetadataDB = {};
        window.sysLog = jest.fn();

        // Require the packerz-module to load our newly exposed methods
        require("../assets/js/packerz-module.js");
    });

    beforeEach(() => {
        // Reset DB mock states before each test run
        window.aliasDB = {};
        window.aliasMetadataDB = {};
    });

    test("getDeterministic9DigitHash produces a valid, consistent 9-digit numeric string", () => {
        const hash1 = window.getDeterministic9DigitHash("Red sub-assembly");
        const hash2 = window.getDeterministic9DigitHash("Red sub-assembly");
        const hashOther = window.getDeterministic9DigitHash("Blue sub-assembly");

        // Should be exactly 9 characters long and purely numeric
        expect(hash1).toMatch(/^[0-9]{9}$/);
        expect(hash2).toMatch(/^[0-9]{9}$/);
        expect(hashOther).toMatch(/^[0-9]{9}$/);

        // Must be deterministic (same input produces same output)
        expect(hash1).toBe(hash2);

        // Different inputs should produce different hashes (under rolling hash logic)
        expect(hash1).not.toBe(hashOther);
    });

    test("getItemBarcodeValue falls back to a deterministic 9-digit hash when no alias mapping exists", () => {
        const barcode = window.getItemBarcodeValue("Raw Goods Filament");
        const expectedHash = window.getDeterministic9DigitHash("Raw Goods Filament");

        expect(barcode).toBe(expectedHash);
        expect(barcode).toMatch(/^[0-9]{9}$/);
    });

    test("getItemBarcodeValue resolves mapped metadata barcode from aliasMetadataDB when available", () => {
        // Mock DB entries
        window.aliasDB["NG-9999-SHOPIFY-SKU"] = "Raw Goods Filament";
        window.aliasMetadataDB["NG-9999-SHOPIFY-SKU"] = {
            barcode_value: "123456789", // shopify mapped barcode
            is_shopify_synced: true
        };

        const barcode = window.getItemBarcodeValue("Raw Goods Filament");
        expect(barcode).toBe("123456789");
    });

    test("window.getItemSKUValue returns storefront mapped SKU if it exists in aliasDB", () => {
        window.aliasDB["NG-1234-WHEEL-CORE"] = "WHEEL-CORE-ASY";

        const sku = window.getItemSKUValue("WHEEL-CORE-ASY");
        expect(sku).toBe("NG-1234-WHEEL-CORE");
    });

    test("window.getItemSKUValue and getItemBarcodeValue prioritize Shopify-synced SKU and barcode when multiple aliases map to the same recipe name", () => {
        // Mock multiple aliases mapped to "Haloz":
        // 1. eBay alias (not synced to Shopify, no barcode)
        window.aliasDB["EBAY-HALOZ-listing-123"] = "Haloz";
        window.aliasMetadataDB["EBAY-HALOZ-listing-123"] = {
            barcode_value: null,
            is_shopify_synced: false
        };

        // 2. Shopify-synced alias (which has the correct SKU and barcode)
        window.aliasDB["NG-0360-Rechargeable"] = "Haloz";
        window.aliasMetadataDB["NG-0360-Rechargeable"] = {
            barcode_value: "552701078",
            is_shopify_synced: true
        };

        const resolvedSku = window.getItemSKUValue("Haloz");
        const resolvedBarcode = window.getItemBarcodeValue("Haloz");

        // The system must prioritize the Shopify-synced mapping
        expect(resolvedSku).toBe("NG-0360-Rechargeable");
        expect(resolvedBarcode).toBe("552701078");
    });

    test("window.getItemSKUValue generates a deterministic emulated SKU matching standard format if absent", () => {
        const sku = window.getItemSKUValue("Filament Roll Black");
        
        // SKU format: NG-{4-Digit Random}-{Name Chunk}
        // "Filament Roll Black" -> NameChunk "FILAMENT-ROLL" (trimmed to max 13 chars, clean characters)
        expect(sku).toMatch(/^NG-[0-9]{4}-FILAMENT-ROLL$/);

        // Try a very long name with special characters
        const longSku = window.getItemSKUValue("Extruder Sub-Assembly Red V2 Custom Long Name");
        // "Extruder Sub-Assembly Red V2 Custom Long Name" -> Max 13 alphanumeric chars: "EXTRUDER-SUB" or "EXTRUDER-SUB-A"
        expect(longSku).toMatch(/^NG-[0-9]{4}-EXTRUDER-SUB$/);
    });

    test("Self-Healing Duplicate Resolution Process: identifies duplicate emulator aliases when a Shopify synced alias exists", () => {
        // CRP (Conflict Resolution Protocol) simulation mimicking the index.html background query resolver:
        function runCollisionPurge(mockSupabaseData) {
            const recipesWithShopify = new Set();
            mockSupabaseData.forEach(a => {
                if (a.is_shopify_synced) {
                    recipesWithShopify.add(a.internal_recipe_name);
                }
            });

            const duplicatesToDelete = [];
            mockSupabaseData.forEach(a => {
                if (!a.is_shopify_synced && recipesWithShopify.has(a.internal_recipe_name)) {
                    duplicatesToDelete.push(a.storefront_sku);
                }
            });

            return duplicatesToDelete;
        }

        // Simulate database state:
        // Recipe 'Black Widget' has both a Shopify-synced alias (which was synced later)
        // and a local emulator alias (which was generated locally first).
        const mockSupabaseAliases = [
            {
                storefront_sku: "NG-5555-BLACK-WIDGET",
                internal_recipe_name: "Black Widget",
                barcode_value: "100000001",
                is_shopify_synced: false // local emulator version
            },
            {
                storefront_sku: "NG-8888-BLACK-WIDGET",
                internal_recipe_name: "Black Widget",
                barcode_value: "999888777",
                is_shopify_synced: true // official Shopify-synced version
            },
            {
                storefront_sku: "NG-4444-YELLOW-WIDGET",
                internal_recipe_name: "Yellow Widget",
                barcode_value: "100000002",
                is_shopify_synced: false // local emulator (no shopify sync yet - keep!)
            }
        ];

        const toDelete = runCollisionPurge(mockSupabaseAliases);

        // The emulator version of 'Black Widget' should be flagged for background deletion,
        // while the Yellow Widget (which has only an emulator version) should NOT be flagged.
        expect(toDelete).toContain("NG-5555-BLACK-WIDGET");
        expect(toDelete).not.toContain("NG-8888-BLACK-WIDGET");
        expect(toDelete).not.toContain("NG-4444-YELLOW-WIDGET");
        expect(toDelete.length).toBe(1);
    });
});
