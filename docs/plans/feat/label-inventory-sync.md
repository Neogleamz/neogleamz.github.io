# Implementation Plan: Label Inventory Sync & Auto-Creation

## High-Level Objective
This task is a combination of a critical bug fix and a quality-of-life feature upgrade:
1. **Bug Fix**: Restore the Labelz print batch tracking functionality that was broken by the recent UUID Architecture Migration, ensuring thermal paper and printed labels accurately deduct/add using their true `item_uuid` instead of string keys.
2. **Feature Upgrade**: Introduce an "Auto-Create Label" button inside the Recipez view for Retail Products and Sub-Assemblies to automatically generate the Custom Label base item, saving the user from manually creating label items for every product.

---

## 1. Bug Fix: UUID Resolution in `barcodz-module.js`
The core issue is that `consumeThermalMedia()` falls back to passing literal string keys (e.g. `"Thermal 2.25 x 1.25::::::..."`) into `item_uuid` columns if the exact `window.uuidMap` lookup fails, causing a Postgres `invalid input syntax for type uuid` crash.

### A. Thermal Media Lookup (Raw Material)
- The current logic dynamically builds `activeKey` using `sizeText`. We must update this to find the matching entry in `catalogCache` and extract its `item_uuid`.
- We will safeguard the payload insert so that if a valid UUID is absolutely not found for the thermal media, it safely handles it without crashing the entire transaction.

### B. Produced Label Lookup
- For custom labels (`is_label: true`), they are tracked as `RECIPE:::Name`. We will ensure `window.uuidMap['RECIPE:::' + item.name]` is properly fetched.
- For standard barcodes tracked as `BARCODE_LABEL:::Name`, we will either resolve their UUID or omit them from the `inventory_consumption` upsert payload if they are not explicitly tracked items, preventing the entire batch from crashing.

---

## 2. Feature Upgrade: Auto-Create Custom Labels in `bom-module.js`
To save time creating labels manually, we will add a convenience button directly within the Recipez interface.

- **UI Addition**: Inject an "Auto-Create Label" button into the Recipe Detail view Action Bar for Retail Products and Sub-Assemblies.
- **Conditional Rendering**: The button will scan the `productsDB` to check if a Custom Label already exists for the current product. If it does, the button remains hidden.
- **Click Event Logic**: 
  - Automatically generates a new `is_label: true` item named `"Label - " + currentProductName`.
  - Pushes this new label UUID into the `components` array of the current Retail Product/Sub-Assembly.
  - Automatically adds a quantity of `1` for the Thermal Paper under this new label's recipe (if possible, or leaves it blank for the user to select the specific paper type).
  - Syncs the updated `product_recipes` back to Supabase.

## 3. Verification Plan
1. **Print Spooler Fix**: Add 1 Label to the queue, execute the batch print, confirm "Yes", and verify no UUID crash occurs and inventory adjusts correctly.
2. **Auto-Create Feature**: Open a Retail Product that has no label, click "Auto-Create Label", verify the label is generated in `productsDB`, and verify it was added as a component to the product.

## Open Questions for User
- When the "Auto-Create Label" button is clicked, do you want the system to automatically attach a generic Thermal Paper raw good underneath it, or should it just create the blank Label component and let you manually attach the specific paper (e.g. 2.25x1.25 vs 4x6) depending on the product?
- Are `BARCODE_LABEL:::` pseudo-items explicitly tracked in your database, or should we skip tracking them if they don't have a UUID?
