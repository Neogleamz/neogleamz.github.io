# Implementation Plan: Label Inventory & Template Sync

## High-Level Objective
Implement physical label inventory tracking by bridging `Recipez` inventory math with `Barcodz` design templates, treating "Labels" as distinct raw materials that can be automatically generated, tracked in `Stockz`, and visually managed in `Labelz`.

## 1. Supabase Data Integration
- No new tables are needed. We will use the existing `product_recipes` table for inventory and `label_designs` for label canvas layouts.
- Label inventory items will be uniquely identified by their `product_item_uuid`, `product_name` (e.g. `RECIPE:::Glowz Sticker`), and `is_label: true`.
- An additional `linked_barcode_slug` metadata field (or similar logical mapping) will bridge the label inventory item to its visual Barcodz template.

## 2. Recipez UI/UX Implementation
- Inject a context-aware "Auto-Create Label" `<button class="btn-secondary btn-sm">` into the Recipe Detail view Action Bar (or within a `<details>` dropdown).
- This button should conditionally render: it checks the inventory array for an existing `is_label: true` item linked to the current Retail Product. If it exists, the button hides.
- **Click Event Logic:** 
  - Generates a UUID for the new label.
  - Inserts a new `product_recipes` record with `is_label: true`, `product_name: "RECIPE:::Label - " + currentProductName`.
  - Automatically pushes this new label UUID into the `components` array of the currently viewed Retail Product.
  - Syncs to Supabase.

## 3. Labelz Dashboard Implementation
- Refactor the Labelz page to fetch all `is_label: true` records from `product_recipes` natively (or utilize `productsDB` cache).
- Group the labels logically using native HTML5 `<details>` and `<summary>` elements styled with Vanilla CSS (Flexbox) for high-performance collapsibles.
- Client-Side Join: For each label, perform a lookup against `barcodzDB` to fetch the design template via the linked slug. Render the visual barcode by applying the Barcodz layout metadata to the FabricJS DOM.

## 4. Stockz Tracking Lifecycle
- Because labels are now `is_label: true` elements in `product_recipes`, the existing Stockz calculation engine will inherently pick them up.
- Ensure the Stockz view classifies them distinctly under the "Custom Labels" `<details>` group.
- **Production Loop:** Printing a batch of labels acts as a "Produce" event for that Label item, increasing `STOCK` and consuming underlying thermal paper (Raw Material).
- **Consumption Loop:** Building a Retail Product automatically consumes 1 instance of the Label item, accurately decreasing its `STOCK`.

## 5. Security & Vanilla JS Standards
- **Zero Frameworks:** The entire DOM mutation must remain in pure Vanilla JS, utilizing `document.createElement`, `innerHTML` strictly with DOMPurify (or native `textContent` mapping), and flexbox.
- **Performance:** Avoid heavy event listeners for collapsibles by strictly using `<details>`.
- **Referential Integrity:** Ensure warnings are prompted if a user attempts to delete a Barcodz template that is actively linked to an `is_label` inventory item.
