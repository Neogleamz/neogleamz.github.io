# Implementation Plan - Unified SKU & Barcode Parity Engine

This plan establishes a Unified Hybrid Identification Architecture (UHIA) across the Neogleamz ecosystem. It ensures absolute parity with the Shopify MS Barcodes settings—enforcing a standard `NG-{4-Digit Random}-{Name}` SKU layout and `[0-9]{9}` numeric barcode signature (Code 128 Subset C) for all internal and retail goods. It also implements a self-healing conflict resolution protocol that always defers to Shopify's randomized values upon sync.

## Design Decisions & Rationale
We are abandoning the deterministic `'NGZ-'` code generation for Shopify retail items because Shopify generates randomized 4-digit codes in SKUs and completely randomized 9-digit barcodes. We are introducing a **Unified Hybrid Identification Architecture (UHIA)** where Neogleamz emulates the Shopify MS Barcodes generator locally for raw materials and sub-assemblies, storing them in `storefront_aliases`. A self-healing overwrite sync ensures that if a locally created item is later initialized in Shopify, Shopify's randomized records immediately overwrite the local emulator ones.

## Proposed Changes

---

### 🗄️ Database Layer

We will create a new idempotent migration file to support the extended alias metadata.

#### [NEW] [20260601232000_unified_sku_barcode_parity.sql](file:///d:/GitHub/neogleamz.github.io/supabase/migrations/20260601232000_unified_sku_barcode_parity.sql)
* Add `barcode_value` (text) to store the physical 9-digit barcode number.
* Add `is_shopify_synced` (boolean, default false) to distinguish between Shopify-generated values and local emulator values.
* Ensure columns are safe and idempotent.

---

### ⚙️ Core Logic & Utility Layer

We will update our barcode and SKU generators to mirror the MS Barcodes pattern.

#### [MODIFY] [packerz-module.js](file:///d:/GitHub/neogleamz.github.io/assets/js/packerz-module.js)
* **SKU & Barcode Emulator**: Implement `generateMSRuntimeSKU(itemName, option1, option2)` and `generateMSRuntimeBarcode(existingSet)`.
* **Conflict Resolution Overwrite API**: Integrate a mechanism to detect and resolve collisions when Shopify webhooks sync an order.
* **Hybrid Scanner Parsing**: Update the scanner resolver `getItemBarcodeValue(itemName)` and active SOP scanner checks to accept *either* the physical 9-digit Shopify barcode, the internal recipe name, or the legacy `NGZ-` code for seamless transition support.

---

### 🖨️ Thermal Spooler Layer

#### [MODIFY] [barcodz-module.js](file:///d:/GitHub/neogleamz.github.io/assets/js/barcodz-module.js)
* Update `buildBarcodzCache()` to check `aliasDB` for the real SKU and Barcode (9-digit number) first.
* If a mapped record does not exist (e.g., new raw materials or sub-assemblies):
  * Programmatically generate a compliant `NG-XXXX` SKU and 9-digit barcode on the fly.
  * Persist the generated values to Supabase `storefront_aliases` (marked as `is_shopify_synced = false`).
* In `executeBatchPrint()`, render numeric 9-digit barcodes using **Code 128 Subset C** to guarantee crisp, compact, highly scannable outputs.

---

### 🎨 Visual Canvas Designer Layer

#### [MODIFY] [labelz-module.js](file:///d:/GitHub/neogleamz.github.io/assets/js/labelz-module.js)
* Update `applyCatalogData()` to pull the actual `storefront_sku` and `barcode_value` from `aliasDB` (or the catalog cache) instead of generating the old `NGZ-` prefix.
* When adding a barcode element to the Fabric.js canvas for a linked product, automatically drop the actual 9-digit sequence and size it to a clean aspect ratio.

---

## Verification Plan

### Automated Tests
* Execute `npm test` to ensure no existing tests are broken.
* Create a dedicated unit test suite inside `tests/unified-parity.test.js` verifying the emulator outputs:
  * Verifies SKU outputs match `NG-XXXX-Name` format.
  * Verifies Barcode outputs are exactly 9-digit numeric strings.
  * Verifies that Shopify sync overrides local temporary records without duplication.

### Manual Verification
1. **Fulfillz Spooler Test**: Open FULFILLZ -> BARCODZ tab. Verify raw materials and sub-assemblies show 9-digit numeric barcodes and `NG-` SKUs. Print a sample layout to PDF; verify the barcode displays Subset C compression.
2. **SOP Scanner Verification**: Load a sample order. Print the 9-digit barcode. Scan the barcode using the WebRTC Camera scanner on a phone/simulator. Verify the scan passes QA check instantly.
3. **Overwrite Simulation**: Map a local item with a temporary SKU/Barcode. Run a mock sync event with a Shopify-tagged payload. Verify the temporary record is safely purged and replaced by the Shopify version in `storefront_aliases`.
