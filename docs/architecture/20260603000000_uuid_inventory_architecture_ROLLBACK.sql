-- ==============================================
-- NEXUZ TERMINAL: EMERGENCY ROLLBACK PROTOCOL
-- Reverts the UUID Architecture back to String Identifiers
-- ==============================================

-- 1. Restore Legacy String Columns
ALTER TABLE full_landed_costs ADD COLUMN IF NOT EXISTS neogleamz_name TEXT;
ALTER TABLE product_recipes ADD COLUMN IF NOT EXISTS product_name TEXT;
ALTER TABLE inventory_consumption ADD COLUMN IF NOT EXISTS item_key TEXT;
ALTER TABLE inventory_adjustments_log ADD COLUMN IF NOT EXISTS item_key TEXT;
ALTER TABLE production_sops ADD COLUMN IF NOT EXISTS product_name TEXT;
ALTER TABLE pack_ship_sops ADD COLUMN IF NOT EXISTS internal_recipe_name TEXT;
ALTER TABLE label_designs ADD COLUMN IF NOT EXISTS product_name TEXT;
ALTER TABLE sales_ledger ADD COLUMN IF NOT EXISTS internal_recipe_name TEXT;
ALTER TABLE storefront_aliases ADD COLUMN IF NOT EXISTS internal_recipe_name TEXT;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS product_name TEXT;
ALTER TABLE print_queue ADD COLUMN IF NOT EXISTS part_name TEXT;

-- 2. Drop the UUID Constraints & Columns
ALTER TABLE full_landed_costs DROP CONSTRAINT IF EXISTS full_landed_costs_item_uuid_fkey;
ALTER TABLE product_recipes DROP CONSTRAINT IF EXISTS product_recipes_product_item_uuid_fkey;
ALTER TABLE inventory_consumption DROP CONSTRAINT IF EXISTS inventory_consumption_item_uuid_fkey;
ALTER TABLE inventory_adjustments_log DROP CONSTRAINT IF EXISTS inventory_adjustments_log_item_uuid_fkey;
ALTER TABLE production_sops DROP CONSTRAINT IF EXISTS production_sops_product_item_uuid_fkey;
ALTER TABLE pack_ship_sops DROP CONSTRAINT IF EXISTS pack_ship_sops_recipe_item_uuid_fkey;
ALTER TABLE label_designs DROP CONSTRAINT IF EXISTS label_designs_product_item_uuid_fkey;
ALTER TABLE sales_ledger DROP CONSTRAINT IF EXISTS sales_ledger_recipe_item_uuid_fkey;
ALTER TABLE storefront_aliases DROP CONSTRAINT IF EXISTS storefront_aliases_recipe_item_uuid_fkey;
ALTER TABLE work_orders DROP CONSTRAINT IF EXISTS work_orders_recipe_item_uuid_fkey;
ALTER TABLE print_queue DROP CONSTRAINT IF EXISTS print_queue_part_item_uuid_fkey;

ALTER TABLE full_landed_costs DROP COLUMN IF EXISTS item_uuid;
ALTER TABLE product_recipes DROP COLUMN IF EXISTS product_item_uuid;
ALTER TABLE inventory_consumption DROP COLUMN IF EXISTS item_uuid;
ALTER TABLE inventory_adjustments_log DROP COLUMN IF EXISTS item_uuid;
ALTER TABLE production_sops DROP COLUMN IF EXISTS product_item_uuid;
ALTER TABLE pack_ship_sops DROP COLUMN IF EXISTS recipe_item_uuid;
ALTER TABLE label_designs DROP COLUMN IF EXISTS product_item_uuid;
ALTER TABLE sales_ledger DROP COLUMN IF EXISTS recipe_item_uuid;
ALTER TABLE storefront_aliases DROP COLUMN IF EXISTS recipe_item_uuid;
ALTER TABLE work_orders DROP COLUMN IF EXISTS recipe_item_uuid;
ALTER TABLE print_queue DROP COLUMN IF EXISTS part_item_uuid;

-- 3. Re-establish Primary Keys on Legacy Strings
ALTER TABLE product_recipes DROP CONSTRAINT IF EXISTS product_recipes_pkey;
ALTER TABLE product_recipes ADD PRIMARY KEY (product_name);

ALTER TABLE inventory_consumption DROP CONSTRAINT IF EXISTS inventory_consumption_pkey;
ALTER TABLE inventory_consumption ADD PRIMARY KEY (item_key);

ALTER TABLE production_sops DROP CONSTRAINT IF EXISTS production_sops_pkey;
ALTER TABLE production_sops ADD PRIMARY KEY (product_name);

ALTER TABLE label_designs DROP CONSTRAINT IF EXISTS label_designs_pkey;
ALTER TABLE label_designs ADD PRIMARY KEY (product_name);

ALTER TABLE pack_ship_sops DROP CONSTRAINT IF EXISTS pack_ship_sops_pkey;
ALTER TABLE pack_ship_sops ADD PRIMARY KEY (internal_recipe_name);

-- Note: The `inventory` table remains unchanged (item_uuid is kept as primary)
-- because it was always generating UUIDs natively.
