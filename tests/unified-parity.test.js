/**
 * @jest-environment jsdom
 */

describe("Unified SKU & Barcode Parity Engine (UHIA)", () => {
    beforeAll(() => {
        // Setup initial global mocks
        window.aliasDB = {};
        window.aliasMetadataDB = {};
        window.sysLog = jest.fn();
        window.setMasterStatus = jest.fn();
        window.runForensicAccounting = jest.fn().mockImplementation((lines) => lines.map(l => ({ ...l, cogs: 0, fee: 0, net: 0 })));
        window.renderAliasManager = jest.fn();
        window.renderSalesTable = jest.fn();
        window.renderInventoryTable = jest.fn();
        window.renderAnalyticsDashboard = jest.fn();
        window.buildBarcodzCache = jest.fn();
        window.renderBarcodzGrid = jest.fn();
        window.alert = jest.fn();

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
            is_shopify_synced: true,
            is_primary: true
        };

        const barcode = window.getItemBarcodeValue("Raw Goods Filament");
        expect(barcode).toBe("123456789");
    });

    test("window.getItemSKUValue returns storefront mapped SKU if it is primary", () => {
        window.aliasDB["NG-1234-WHEEL-CORE"] = "WHEEL-CORE-ASY";
        window.aliasMetadataDB["NG-1234-WHEEL-CORE"] = {
            barcode_value: "111222333",
            is_shopify_synced: false,
            is_primary: true
        };

        const sku = window.getItemSKUValue("WHEEL-CORE-ASY");
        expect(sku).toBe("NG-1234-WHEEL-CORE");
    });

    test("window.getItemSKUValue and getItemBarcodeValue prioritize Shopify-synced SKU and barcode when multiple aliases map to the same recipe name", () => {
        // Mock multiple aliases mapped to "Haloz":
        // 1. eBay alias (not synced to Shopify, no barcode)
        window.aliasDB["EBAY-HALOZ-listing-123"] = "Haloz";
        window.aliasMetadataDB["EBAY-HALOZ-listing-123"] = {
            barcode_value: null,
            is_shopify_synced: false,
            is_primary: false
        };

        // 2. Shopify-synced alias (which has the correct SKU and barcode, designated as primary/linked)
        window.aliasDB["NG-0360-Rechargeable"] = "Haloz";
        window.aliasMetadataDB["NG-0360-Rechargeable"] = {
            barcode_value: "552701078",
            is_shopify_synced: true,
            is_primary: true
        };

        let resolvedSku = window.getItemSKUValue("Haloz");
        let resolvedBarcode = window.getItemBarcodeValue("Haloz");

        // The system must prioritize the Shopify-synced mapping
        expect(resolvedSku).toBe("NG-0360-Rechargeable");
        expect(resolvedBarcode).toBe("552701078");

        // 3. Add a primary designated Shopify-synced alias (which should override option 2)
        window.aliasMetadataDB["NG-0360-Rechargeable"].is_primary = false;
        window.aliasDB["NG-3090-SK8Lytz HALOZ"] = "Haloz";
        window.aliasMetadataDB["NG-3090-SK8Lytz HALOZ"] = {
            barcode_value: "954170281",
            is_shopify_synced: true,
            is_primary: true
        };

        resolvedSku = window.getItemSKUValue("Haloz");
        resolvedBarcode = window.getItemBarcodeValue("Haloz");

        expect(resolvedSku).toBe("NG-3090-SK8Lytz HALOZ");
        expect(resolvedBarcode).toBe("954170281");
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
                    duplicatesToDelete.push(a.product_sku);
                }
            });

            return duplicatesToDelete;
        }

        // Simulate database state:
        // Recipe 'Black Widget' has both a Shopify-synced alias (which was synced later)
        // and a local emulator alias (which was generated locally first).
        const mockSupabaseAliases = [
            {
                product_sku: "NG-5555-BLACK-WIDGET",
                internal_recipe_name: "Black Widget",
                barcode_value: "100000001",
                is_shopify_synced: false // local emulator version
            },
            {
                product_sku: "NG-8888-BLACK-WIDGET",
                internal_recipe_name: "Black Widget",
                barcode_value: "999888777",
                is_shopify_synced: true // official Shopify-synced version
            },
            {
                product_sku: "NG-4444-YELLOW-WIDGET",
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

    test("scanOrphanStorefrontSKUs correctly identifies unmapped storefront SKUs in aliasDB and salesDB", () => {
        // Mock salesDB & productsDB
        window.salesDB = [
            { storefront_sku: "SKU-HISTORICAL-ORPHAN", qty_sold: 1 },
            { storefront_sku: "MANUAL_ENTRY_Haloz", qty_sold: 1 }, // ignored
            { storefront_sku: "IGNORE", qty_sold: 1 }, // ignored
            { storefront_sku: "SK8Lytz HALOZ", qty_sold: 1 }, // mapped below
            { storefront_sku: "SKU-UNMAPPED-SHOPIFY", qty_sold: 1 }, // ordered and unmapped
            { storefront_sku: "SKU-INVALID-RECIPE", qty_sold: 1 } // ordered but mapped to invalid recipe
        ];
        window.productsDB = {
            "Haloz": {},
            "WHEEL-CORE-ASY": {}
        };
        // Mock aliasDB
        window.aliasDB = {
            "SK8Lytz HALOZ": "Haloz", // valid mapping
            "SKU-UNMAPPED-SHOPIFY": null, // unmapped shopify variant (ordered)
            "SKU-INVALID-RECIPE": "NonExistentRecipe", // maps to invalid recipe (ordered)
            "SKU-NOT-ORDERED": null // unmapped shopify variant (NOT ordered - should NOT be orphan!)
        };

        // Load sales-module to expose scanOrphanStorefrontSKUs
        require("../assets/js/sales-module.js");

        window.scanOrphanStorefrontSKUs();

        // Should identify SKU-HISTORICAL-ORPHAN, SKU-UNMAPPED-SHOPIFY, and SKU-INVALID-RECIPE as orphans
        expect(window.orphanSKUs).toContain("SKU-HISTORICAL-ORPHAN");
        expect(window.orphanSKUs).toContain("SKU-UNMAPPED-SHOPIFY");
        expect(window.orphanSKUs).toContain("SKU-INVALID-RECIPE");
        
        // SKU-NOT-ORDERED should NOT be an orphan (no sales history)
        expect(window.orphanSKUs).not.toContain("SKU-NOT-ORDERED");
        
        // Valid mapping should NOT be an orphan
        expect(window.orphanSKUs).not.toContain("SK8Lytz HALOZ");
    });

    test("window.resolveOrphanSKUMapping preserves Shopify sync metadata and barcode for synced catalog SKUs", async () => {
        // Setup mock salesDB and window.supabaseClient
        window.salesDB = [
            { storefront_sku: "NG-3090-SK8Lytz HALOZ", order_id: "1001", qty_sold: 1, actual_sale_price: 10 }
        ];
        
        const upsertMock = jest.fn().mockResolvedValue({ error: null });
        const eqMock = jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ error: null })
        });
        const updateMock = jest.fn().mockReturnValue({
            eq: eqMock
        });
        window.supabaseClient = {
            from: jest.fn().mockReturnValue({
                upsert: upsertMock,
                update: updateMock
            })
        };

        // Load sales-module to expose resolveOrphanSKUMapping
        require("../assets/js/sales-module.js");

        // 1. Synced Shopify SKU Scenario
        window.aliasMetadataDB["NG-3090-SK8Lytz HALOZ"] = {
            barcode_value: "954170281",
            is_shopify_synced: true,
            is_primary: false,
            platform: "Shopify Webhook"
        };

        await window.resolveOrphanSKUMapping("NG-3090-SK8Lytz HALOZ", "Haloz");

        // Verify upsert arguments
        expect(upsertMock).toHaveBeenCalledWith({
            product_sku: "NG-3090-SK8Lytz HALOZ",
            internal_recipe_name: "Haloz",
            barcode_value: "954170281",
            is_shopify_synced: true,
            is_primary: false,
            platform: "Shopify Webhook",
            shopify_sku: "NG-3090-SK8Lytz HALOZ"
        });

        expect(window.aliasMetadataDB["NG-3090-SK8Lytz HALOZ"]).toEqual({
            barcode_value: "954170281",
            is_shopify_synced: true,
            is_primary: false,
            platform: "Shopify Webhook",
            shopify_sku: "NG-3090-SK8Lytz HALOZ"
        });

        // 2. Local Manual/Orphan SKU Scenario
        upsertMock.mockClear();
        await window.resolveOrphanSKUMapping("LOCAL-MANUAL-SKU", "Haloz");

        // Should fall back to emulated barcode and Auto Scanner platform
        const expectedEmulatedBarcode = window.getItemBarcodeValue("LOCAL-MANUAL-SKU");
        expect(upsertMock).toHaveBeenCalledWith({
            product_sku: "LOCAL-MANUAL-SKU",
            internal_recipe_name: "Haloz",
            barcode_value: expectedEmulatedBarcode,
            is_shopify_synced: false,
            is_primary: false,
            platform: "Auto Scanner",
            shopify_sku: null
        });

        expect(window.aliasMetadataDB["LOCAL-MANUAL-SKU"]).toEqual({
            barcode_value: expectedEmulatedBarcode,
            is_shopify_synced: false,
            is_primary: false,
            platform: "Auto Scanner",
            shopify_sku: null
        });
    });

    test("window.findShopifyCatalogVariantsForRecipe correctly matches unmapped Shopify variants to recipe names", () => {
        // Require sales-module to expose the method
        require("../assets/js/sales-module.js");

        window.aliasDB = {
            "SK8Lytz HALOZ": "Haloz",
            "NG-3090-SK8Lytz HALOZ": null, // unmapped shopify variant
            "NG-4000-WIDGET": null // unrelated unmapped shopify variant
        };

        window.aliasMetadataDB = {
            "SK8Lytz HALOZ": {
                barcode_value: "111111111",
                is_shopify_synced: true
            },
            "NG-3090-SK8Lytz HALOZ": {
                barcode_value: "954170281",
                is_shopify_synced: true
            },
            "NG-4000-WIDGET": {
                barcode_value: "444444444",
                is_shopify_synced: true
            }
        };

        // Searching for Haloz recipe should return the mapped one and suggest the unmapped Shopify variant
        const results = window.findShopifyCatalogVariantsForRecipe("Haloz");
        
        expect(results).toContainEqual({
            sku: "SK8Lytz HALOZ",
            barcode: "111111111",
            mapped: true
        });
        expect(results).toContainEqual({
            sku: "NG-3090-SK8Lytz HALOZ",
            barcode: "954170281",
            mapped: false
        });
        expect(results).not.toContainEqual(expect.objectContaining({
            sku: "NG-4000-WIDGET"
        }));
    });


    test("window.getItemSKUValue and window.getItemBarcodeValue dynamically match unmapped Shopify variants", () => {
        window.aliasDB = {
            "SK8Lytz HALOZ": "Haloz",
            "NEW Rechargeable Bluetooth ARGB LED Lights for Quad Roller Skates SK8Lytz HALOZ": "Haloz",
            "NG-3090-SK8Lytz HALOZ": null // unmapped
        };

        window.aliasMetadataDB = {
            "SK8Lytz HALOZ": {
                barcode_value: "199043262",
                is_shopify_synced: false
            },
            "NEW Rechargeable Bluetooth ARGB LED Lights for Quad Roller Skates SK8Lytz HALOZ": {
                barcode_value: "199043262",
                is_shopify_synced: false
            },
            "NG-3090-SK8Lytz HALOZ": {
                barcode_value: "954170281",
                is_shopify_synced: true
            }
        };

        // Resolving "Haloz" recipe should fall back to emulated/deterministic defaults because no alias is primary
        const sku = window.getItemSKUValue("Haloz");
        const barcode = window.getItemBarcodeValue("Haloz");

        expect(sku).toBe("NG-9262-HALOZ");
        expect(barcode).toBe("199043262");

        // Resolving an alias like "SK8Lytz HALOZ" (storefront SKU query) should resolve to its matched Shopify variant
        const aliasSku = window.getItemSKUValue("SK8Lytz HALOZ");
        const aliasBarcode = window.getItemBarcodeValue("SK8Lytz HALOZ");

        expect(aliasSku).toBe("NG-3090-SK8Lytz HALOZ");
        expect(aliasBarcode).toBe("954170281");
    });

    test("window.getItemSKUValue and window.getItemBarcodeValue resolve unique Shopify variants for multiple aliases mapped to same recipe", () => {
        window.aliasDB = {
            "SK8Lytz HALOZ": "Haloz",
            "NEW Rechargeable Bluetooth ARGB LED Lights for Quad Roller Skates SK8Lytz HALOZ": "Haloz",
            "NG-3090-SK8Lytz HALOZ": null,
            "NG-0360-Rechargeable": null
        };

        window.aliasMetadataDB = {
            "SK8Lytz HALOZ": {
                barcode_value: "199043262",
                is_shopify_synced: false
            },
            "NEW Rechargeable Bluetooth ARGB LED Lights for Quad Roller Skates SK8Lytz HALOZ": {
                barcode_value: "199043262",
                is_shopify_synced: false
            },
            "NG-3090-SK8Lytz HALOZ": {
                barcode_value: "954170281",
                is_shopify_synced: true
            },
            "NG-0360-Rechargeable": {
                barcode_value: "552701078",
                is_shopify_synced: true
            }
        };

        // Regular Haloz alias should resolve to the standard Haloz Shopify SKU & Barcode
        expect(window.getItemSKUValue("SK8Lytz HALOZ")).toBe("NG-3090-SK8Lytz HALOZ");
        expect(window.getItemBarcodeValue("SK8Lytz HALOZ")).toBe("954170281");

        // Rechargeable alias should resolve to the Rechargeable Shopify SKU & Barcode
        expect(window.getItemSKUValue("NEW Rechargeable Bluetooth ARGB LED Lights for Quad Roller Skates SK8Lytz HALOZ")).toBe("NG-0360-Rechargeable");
        expect(window.getItemBarcodeValue("NEW Rechargeable Bluetooth ARGB LED Lights for Quad Roller Skates SK8Lytz HALOZ")).toBe("552701078");
    });

    test("window.getItemBarcodeValue resolves storefront SKU's own emulated hash and maps it when designated as primary, without colliding with the recipe's fallback hash", () => {
        window.aliasDB["RAILZ Prototypes"] = "Railz";
        window.aliasMetadataDB["RAILZ Prototypes"] = {
            barcode_value: null,
            is_shopify_synced: false,
            is_primary: true
        };

        const aliasBarcode = window.getItemBarcodeValue("RAILZ Prototypes");
        const recipeBarcode = window.getItemBarcodeValue("Railz");
        
        const expectedAliasHash = window.getDeterministic9DigitHash("RAILZ Prototypes");
        const expectedRecipeHash = window.getDeterministic9DigitHash("Railz");

        // The storefront SKU's barcode should be its own deterministic hash, not the recipe's fallback hash
        expect(aliasBarcode).toBe(expectedAliasHash);
        expect(aliasBarcode).not.toBe(expectedRecipeHash);

        // Since RAILZ Prototypes is primary/linked, resolving the barcode for the recipe name "Railz" should return the primary alias's barcode
        expect(recipeBarcode).toBe(expectedAliasHash);
    });

    test("window.getItemSKUValue resolves emulated formatted SKUs for non-SKU storefront alias names, and preserves already-formatted SKUs", () => {
        window.aliasDB["RAILZ Prototypes"] = "Railz";
        window.aliasMetadataDB["RAILZ Prototypes"] = {
            barcode_value: null,
            is_shopify_synced: false,
            is_primary: true
        };

        window.aliasDB["NG-1234-WHEEL-CORE"] = "WHEEL-CORE-ASY";
        window.aliasMetadataDB["NG-1234-WHEEL-CORE"] = {
            barcode_value: "111222333",
            is_shopify_synced: false,
            is_primary: true
        };

        // 1. Storefront alias name that is a title (not a formatted SKU) should get emulated SKU format
        const aliasSku = window.getItemSKUValue("RAILZ Prototypes");
        expect(aliasSku).toBe("NG-1337-RAILZ-PROTOTY");

        // 2. When mapped as primary, the recipe should resolve to the emulated SKU of that primary alias
        const recipeSku = window.getItemSKUValue("Railz");
        expect(recipeSku).toBe("NG-1337-RAILZ-PROTOTY");

        // 3. Storefront alias name that is already formatted as a SKU should be preserved as-is
        const formattedSku = window.getItemSKUValue("NG-1234-WHEEL-CORE");
        expect(formattedSku).toBe("NG-1234-WHEEL-CORE");

        // 4. When mapped as primary, the recipe should resolve to the already-formatted SKU
        const recipeForFormattedSku = window.getItemSKUValue("WHEEL-CORE-ASY");
        expect(recipeForFormattedSku).toBe("NG-1234-WHEEL-CORE");
    });
});
