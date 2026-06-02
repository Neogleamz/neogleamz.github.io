# Implementation Plan: Label Print Tracking & Visual Designer

### Design Decisions & Rationale
We chose a **State-Driven DOM Architecture** using CSS physical units over an HTML5 `<canvas>` approach to guarantee crisp, infinite-scaling vector barcode printing at 300dpi natively through the browser's print engine. For print tracking, we chose the **Confirmation Dialog** as a pure-web fallback because native Vanilla JS cannot read OS print queues, allowing us to accurately track physical media consumption without requiring third-party companion apps. We bridge Barcodz to the BOM using **Dynamic Injection**, dynamically rendering Product SKUs as `BARCODE_LABEL:::` keys in the BOM to enable adding labels to sub-assemblies without duplicate data entry.

## Context & Objectives
Implement the "Dynamic Barcodz BOM Injection" and "Visual Template Designer" to allow tracking of Barcodz product labels exactly like Custom Labelz, while providing a pure Vanilla JS UI for creating custom label dimensions.

## Proposed Changes

### 1. Dynamic Barcodz BOM Injection
#### [MODIFY] `assets/js/bom-module.js`
- **Goal:** Expose product Barcodes as virtual components to the BOM.
- **Implementation:** 
  - Update `window.openBulkAddModal` and `buildBulkAddData()` to iterate over `productsDB`. For every product, inject a virtual item with the key `BARCODE_LABEL:::<ProductName>` into `bulkAddData`.
  - Icon: 🏷️, Type: "Product Barcode".
  - Ensure the virtual item is parsed correctly in `window.renderProductBOM` so it displays with a $0 or raw material unit cost.

#### [MODIFY] `assets/js/barcodz-module.js`
- **Goal:** Track the production and consumption of these virtual labels.
- **Implementation:**
  - Update `consumeThermalMedia(qty, activeSizeSelectId)`. When iterating through `window.barcodzSpoolQueue`, detect if the printed item is a standard product.
  - If it is, increment `inventoryDB['BARCODE_LABEL:::' + item.name].produced_qty` by the spool quantity and push it to the `inventory_consumption` Supabase payload alongside the raw thermal paper deduction.
  - Wrap DOM manipulations in `window.safeHTML()` to comply with the CSP and XSS mitigation policies.

### 2. Visual Template Designer UI
#### [NEW] `assets/js/label-designer.js` (or integrated into `labelz-module.js`)
- **Goal:** Create a drag-and-drop designer strictly in Vanilla JS.
- **Implementation:**
  - **State-Driven DOM:** Use a JSON state array to track elements: `{ id, type, x, y, width, height, value }` using physical CSS units (`in`).
  - **Zoom Canvas:** Container with `transform: scale(3.5)` to provide a workable size on desktop while keeping underlying units in inches.
  - **Interactions:** Use `pointerdown`, `pointermove`, `pointerup` for drag and resize logic. Calculate deltas by dividing screen pixels by `96 * zoom_scale` to update state physical inches.
  - **Print Engine:** Inject the final DOM state into a hidden `<iframe>` with `@media print { @page { size: <W>in <H>in; margin: 0; } }` and call `contentWindow.print()`.

### 3. Pure-Web Print Tracking Fallback
#### [MODIFY] `assets/js/barcodz-module.js` & `assets/js/labelz-module.js`
- **Goal:** Prevent ghost inventory deductions.
- **Implementation:**
  - Hook into `window.onafterprint` or use a timeout after `window.print()` triggers.
  - Render a modal: "Did the label(s) print successfully?" with [Yes] [No - Reprint].
  - Only execute `consumeThermalMedia()` if the user explicitly clicks [Yes].

## Verification Plan
### Automated Tests
- Run existing Jest integration tests for BOM to ensure the introduction of `BARCODE_LABEL:::` virtual keys doesn't break recursive COGS calculations.
### Manual Verification
- Print 5 labels from Barcodz, confirm via the new dialog, and verify that the `inventory_consumption` table logs 5 `produced_qty` for the virtual key.
- Build a sub-assembly in the Recipe Editor, add the virtual label, and ensure the unit cost correctly reflects the base media paper cost.
