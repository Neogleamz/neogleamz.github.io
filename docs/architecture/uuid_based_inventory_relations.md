# Architecture Decision Record: UUID-Based Inventory & Recipe Relations

## 1. Context & Objectives
**Problem:** Currently, the platform (including STOCKZ, RECIPEZ, and EDITZ modules) relies on mutable strings (e.g., `Neogleamz name` and `Neogleamz Product`) to define relations between raw items, product recipes, and inventory consumption logs. When a user renames an item in the `full_landed_costs` table via EDITZ, the string changes, breaking the link to its historical data. This causes stock levels in STOCKZ to reset to zero and breaks existing recipes.
**Objective:** Transition the data architecture to use immutable UUIDs as primary and foreign keys for all inventory, recipe tracking, and cost ledgers (`full_landed_costs`), ensuring that human-readable names can be safely renamed at any time without severing data history.

## 2. Architectural Overview (Context Level)
The new architecture will plug into the existing SK8Lytz ecosystem by modifying how data is referenced:
- **Master Item Ledger (`full_landed_costs`):** The `full_landed_costs` table acts as the master source of truth for items. We will inject a permanent `item_uuid` into this table. It serves as the bridge between raw supplier data and the SK8Lytz internal ecosystem.
- **Raw Ingestion Tables Boundary:** Tables like `raw_orders`, `raw_parcel_items`, and `raw_parcel_summary` will remain entirely untouched. They are immutable records of supplier imports and will continue to link to `full_landed_costs` via the `parcel_no` and `di_item_id` composite keys.
- **STOCKZ / `inventory_consumption`:** Will transition from using a `TEXT` `item_key` to a relational `item_uuid` to track consumed, prototype, scrap, and current stock levels. 
- **RECIPEZ / `product_recipes`:** Will reference raw materials and finished goods via UUIDs rather than dynamically constructed string prefixes like `RECIPE:::${pName}` or raw string names.
- **EDITZ:** When items in `full_landed_costs` are edited, the system will update the string names, but the underlying UUID remains unchanged, protecting downstream relations.

## 3. Industry Standard Validation
**Database & Backend Validator Findings:**
- The current Supabase schema relies on string-based keys (`TEXT`) to map inventory and recipes.
- `inventory_consumption` uses an `item_key` (TEXT) as its primary identifier for upserts. The frontend builds this string (e.g., prefixing finished goods as `RECIPE:::${pName}`).
- `product_recipes` links items using string columns like `filament_item_key TEXT` rather than a UUID foreign key.
- There are no relational foreign keys enforcing referential integrity from `inventory_consumption` or `product_recipes` to a unified master items table.

**Standardization Validation:** 
Relying on mutable data (strings) for database relations is considered an anti-pattern. Using UUIDv4 for primary keys and enforcing foreign key constraints is the industry-standard approach for PostgreSQL (Supabase) to guarantee referential integrity, prevent orphaned records, and decouple data identity from UI presentation.

## 4. Design Decisions & Trade-offs
- **Decision:** Introduce a new `item_uuid` column to the `full_landed_costs` table to act as the true primary key for relational mapping.
- **Decision:** Shift all primary associations from `TEXT` columns to `UUID` foreign keys pointing to `full_landed_costs.item_uuid` across the following tables:
  - `inventory_consumption` (currently using `item_key`)
  - `product_recipes` (currently using strings)
  - `inventory_adjustments_log` (currently using `item_key`)
  - `production_sops` (currently using `product_name`)
  - `pack_ship_sops` (currently using `internal_recipe_name`)
  - `label_designs` (currently using `product_name`)
  - `sales_ledger` (currently using `internal_recipe_name`)
  - `work_orders` (currently using `product_name`)
  - `print_queue` (currently using `part_name`)
- **Handling JSONB Tables:** The `inventory_snapshots` table stores data as a point-in-time `JSONB` blob. It does not require a rigid UUID foreign key column. However, as the frontend transitions to UUIDs, future snapshots will natively store the UUIDs within the JSON payload. A decision will need to be made during implementation whether to run a script to update historical JSON blobs or leave them as immutable text-based historical records.
- **Trade-off (Migration Complexity):** We cannot simply flip a switch. This will require a careful database migration to generate UUIDs for all existing items, and map the existing string-based `item_key` records to their new UUIDs before dropping the old text-based columns. This ensures no historical stock data is lost during the transition.
- **Trade-off (Frontend Refactoring):** The `assets/js` frontend will require a massive overhaul to deprecate string-based payloads:
  - **`bom-module.js` & `inventory-module.js`**: Must drop all `RECIPE:::` string concatenations. The `components` arrays and `upsert` payloads must pass `item_uuid`.
  - **`sales-module.js`**: `storefront_sku` must map directly to an `item_uuid` instead of an `internal_recipe_name` for COGS math and ledger tracking.
  - **`production-module.js` & `packerz-module.js`**: SOP, Work Order, and Print Queue queries must transition from `.eq('product_name', p)` to `.eq('item_uuid', uuid)`.
  - **UI Binding Strategy**: DOM elements will continue rendering human-readable names, but interactive elements will transition from `data-key` attributes to `data-uuid` attributes to ensure secure state management.
