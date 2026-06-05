# Architecture Decision Record: Label Inventory & Template Sync

## 1. Context & Objectives
The business goal is to track physical sticker and label stock as an actual raw material inventory item. When a "Retail Product" or "Sub-assembly" is manufactured, its associated physical label should be automatically deducted from inventory. The user needs to be able to print batches of labels (e.g., 50 at a time), which increases the stock of that specific Custom Label and consumes the underlying blank label paper. These custom labels must be fully trackable in the **Stockz** page to monitor when stock is low and when new blank paper needs to be ordered. 

## 2. Architectural Overview (Context Level)
This feature bridges the `barcodz` (design templates), `recipez` (BOM math), and `stockz` (inventory tracking) modules within the SK8Lytz ecosystem. 
Instead of merging the design data with the inventory ledger, they remain distinct. `Recipez` will introduce a new item type of `Label`, acting as a distinct entity type separate from Retail Products, Sub-assemblies, and Raw Materials. The `Labelz` page will act as a unified dashboard that joins the inventory ledger with the design templates. The **Stockz** page will automatically track the production, consumption, and stock levels of these labels strictly under the "Custom Labels" section.

## 3. Industry Standard Validation
**Data Architecture & Inventory Flow Validation:**
- **Separation of Concerns:** The subagent strongly advised against merging `barcodzDB` and `labelzDB`. Design layouts and stock lifecycles are fundamentally different. 
- **The Bridge:** When "Auto-Create Label" is clicked, it inserts a new item into the inventory (`recipez`) with `is_label: true` and a `linked_barcode_slug` metadata field.
- **Stockz Integration:** Because the label is tracked natively in `product_recipes` as a pure `Label` entity, it automatically plugs into the existing `Stockz` ledger under "Custom Labels". Production events (printing batches) increase stock and consume raw paper. Consumption events (building retail products) decrease the sticker stock.
- **Client-Side Join:** The Labelz page will perform a client-side join, grabbing all `is_label: true` inventory items and visually rendering them by matching the slug against the `barcodzDB` templates.

## 4. Design Decisions & Trade-offs
- **Decoupled Tables vs. Merged Data:** We chose decoupled tables bridged by a `slug`. While this requires a slightly heavier client-side fetch, it elegantly solves synchronization. Modifying a barcode design instantly updates the visual representation on the Labelz page, while stock adjustments independently modify the inventory ledger without corrupting design data.
- **Referential Integrity Risk:** The trade-off of the decoupled approach is orphan records if a Barcodz template is deleted. We will need to enforce soft-deletes or warning prompts before deleting a Barcodz template that has linked physical inventory.
- **Native DOM `<details>` vs JS State:** Opting for `<details>` eliminates the need for click event listeners and state management for the Labelz page groupings, minimizing memory overhead and adhering strictly to Vanilla JS best practices.
