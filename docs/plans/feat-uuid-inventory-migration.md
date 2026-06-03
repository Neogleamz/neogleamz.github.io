# Implementation Plan: UUID Inventory Architecture Migration

## 1. Goal Description
The entire Sk8Lytz architecture currently relies on mutable `TEXT` strings (like `neogleamz_name` or `item_key`) to link tables. Renaming an item breaks downstream historical data across the application (e.g., zeroing out Stockz levels). 

This plan translates the High-Level Architecture Document ([docs/architecture/uuid_based_inventory_relations.md](file:///d:/GitHub/neogleamz.github.io/docs/architecture/uuid_based_inventory_relations.md)) into an actionable technical blueprint to safely replace string keys with permanent `item_uuid` foreign keys across the platform.

---

## 2. Technical Approach: Database (Supabase SQL Migration)

The backend migration must guarantee zero loss of historical data by executing in a strict, transaction-safe sequence.

**Step 2.1: Master UUID Injection**
- Enable `"uuid-ossp"` extension.
- Alter `full_landed_costs` to add `item_uuid UUID DEFAULT uuid_generate_v4() NOT NULL UNIQUE`.

**Step 2.2: Downstream Column Injection**
- Alter the 9 dependent tables to inject empty UUID foreign keys:
  - `inventory_consumption` (`item_uuid`)
  - `product_recipes` (`filament_item_uuid`, `product_item_uuid`)
  - `inventory_adjustments_log` (`item_uuid`)
  - `production_sops` (`product_item_uuid`)
  - `pack_ship_sops` (`recipe_item_uuid`)
  - `label_designs` (`product_item_uuid`)
  - `sales_ledger` (`recipe_item_uuid`)
  - `work_orders` (`product_item_uuid`)
  - `print_queue` (`part_item_uuid`)

**Step 2.3: Legacy String Mapping & Backfill**
- Execute `UPDATE ... FROM full_landed_costs flc` statements on every dependent table to map the existing string variables (like `internal_recipe_name` or `item_key`) to the newly generated `flc.item_uuid`.
- Safely handle UI prefixes (e.g., stripping `RECIPE:::` during the JOIN for `inventory_consumption`).

**Step 2.4: Referential Integrity & Cleanup**
- Apply strict `FOREIGN KEY` constraints pointing back to `full_landed_costs(item_uuid)` to prevent orphaned data.
- Drop all legacy string columns (`item_key`, `internal_recipe_name`, `product_name`) to officially burn the bridges.

---

## 3. Technical Approach: Frontend (Vanilla JS Refactoring)

A massive overhaul of `assets/js` is required to ensure payloads send UUIDs.

**Step 3.1: Data Dictionary Refactor**
- Update global state initialization (e.g., `productsDB`, `inventoryDB`) to either index directly by `item_uuid` or construct a global `window.uuidMap` mapping names to UUIDs on application load.

**Step 3.2: DOM Binding Standardization**
- Refactor UI generators across all 16 modules. Interactive rows, buttons, and selects will transition from using `data-key="RECIPE:::Name"` to `data-uuid="<UUID>"`.

**Step 3.3: Module-Specific Payload Updates**
- **`inventory-module.js` & `bom-module.js`**: Eradicate all `RECIPE:::` string concatenations. Update `components` arrays and `upsert` API payloads to strictly pass `item_uuid`.
- **`sales-module.js`**: Rewire `storefront_sku` mapping logic to target the product's `item_uuid` for accurate COGS math and ledger injection.
- **`production-module.js` & `packerz-module.js`**: Transition API filters (`.eq('product_name', p)`) to UUID queries (`.eq('item_uuid', p_uuid)`) for SOP fetching, Print Queue handling, and Work Order generation.

---

## 4. Verification Plan

1. **Local Migration Dry Run:** Run the generated `.sql` migration file locally using Supabase CLI. Verify no rows are deleted or orphaned in the `inventory_consumption` and `sales_ledger` tables.
2. **Frontend CRUD Testing:** Create a new raw item, attach it to a recipe, log a fake sale, and spin up a work order on `127.0.0.1:5500`. Verify the browser's Network tab confirms UUIDs are being transmitted instead of string names.
3. **The Acid Test:** Rename the newly created item in EDITZ. Verify that its Stockz levels and Recipe assignments do not zero out, confirming the architecture holds.
