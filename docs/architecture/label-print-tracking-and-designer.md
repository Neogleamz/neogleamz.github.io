# High-Level Architecture: Label Print Tracking & Visual Designer

## 1. Context & Objectives
Currently, the `barcodz` and `labelz` modules print labels but have no way to verify if the labels actually printed successfully. Furthermore, users cannot easily add standard Product Barcodes (generated in Barcodz) as physical components to packaging sub-assemblies (e.g., adding the "Haloz Barcode" to the "Haloz Product Box" sub-assembly).

The objective is to:
1. Prevent inaccurate inventory stock deductions caused by unverified print jobs.
2. Build a Visual Template Designer to allow users to customize and preview label layouts.
3. Bridge Barcodz and the BOM so that printed Product Barcodes can be added as components to any sub-assembly.

## 2. Architectural Overview (Context Level)
- **The Visual Designer** will be a new UI component injected into the DOM when a user opts to customize a label template. 
- **The Print Tracking mechanism** will use a manual Confirmation Dialog pure-web fallback to verify successful prints before deducting stock.
- **Dynamic Barcodz BOM Injection:** The BOM module will be modified to dynamically recognize and expose all Barcodz as virtual inventory items, allowing them to be added to sub-assemblies just like Custom Labelz.

## 3. Industry Standard Validation

### UI/UX Strategy: Vanilla JS Template Designer
Our UI/UX subagent verified a **State-Driven DOM Architecture** using CSS physical units (`in` or `mm`) as the source of truth, bypassing `<canvas>` limitations for crisp 300dpi vector barcode printing.

### Security & Performance: Native OS Print Queue Tracking
Our System Capabilities subagent confirmed that standard browser APIs cannot track native OS print queues. We will use a **User Confirmation Dialog** (`onafterprint` event) as the pure-web fallback to confirm prints before committing inventory deductions.

## 4. Design Decisions & Trade-offs

### Bridging Barcodz to the BOM (The "Sub-Assembly" Solution)
To allow the user to add a standard product barcode (e.g., "Haloz SKU Label") to a sub-assembly (e.g., "Haloz Product Box") without manual duplicate data entry, we will implement **Dynamic Barcodz BOM Injection**:
1. **The Virtual Key:** The system will dynamically generate a key (e.g., `BARCODE_LABEL:::Haloz`) for every product in the system.
2. **BOM Availability:** In the BOM `bulkAddModal` and component selectors, these virtual Barcode Labels will appear exactly like "Custom Labelz" or Raw Materials. The user can select the "Haloz Barcode" and add it to the "Haloz Product Box" recipe.
3. **Production via Spooler:** When the user prints 50 Haloz barcodes from the Barcodz Spooler and confirms the print, the system will instantly log the production of 50 `BARCODE_LABEL:::Haloz` into the inventory (and consume the raw thermal paper).
4. **Consumption via Assembly:** When the user builds the "Haloz Product Box" sub-assembly, it will correctly consume the printed `BARCODE_LABEL:::Haloz` from stock, accurately tracking the lifecycle of the physical sticker.
