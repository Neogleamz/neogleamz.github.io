-- 1. Introduce item_uuid to Master Table
ALTER TABLE full_landed_costs 
ADD COLUMN item_uuid UUID DEFAULT gen_random_uuid() NOT NULL UNIQUE;

-- 2. Add New UUID Columns to Downstream Tables
ALTER TABLE inventory_consumption ADD COLUMN item_uuid UUID;
ALTER TABLE product_recipes 
  ADD COLUMN filament_item_uuid UUID, 
  ADD COLUMN product_item_uuid UUID;
ALTER TABLE inventory_adjustments_log ADD COLUMN item_uuid UUID;
ALTER TABLE production_sops ADD COLUMN product_item_uuid UUID;
ALTER TABLE pack_ship_sops ADD COLUMN recipe_item_uuid UUID;
ALTER TABLE label_designs ADD COLUMN product_item_uuid UUID;
ALTER TABLE sales_ledger ADD COLUMN recipe_item_uuid UUID;
ALTER TABLE work_orders ADD COLUMN product_item_uuid UUID;
ALTER TABLE print_queue ADD COLUMN part_item_uuid UUID;
ALTER TABLE storefront_aliases ADD COLUMN recipe_item_uuid UUID;

-- 3. Backfill-- 3. Map Existing Legacy String Data to the New UUID
-- But first, dynamically resurrect any orphaned items back into full_landed_costs
-- to ensure they receive a valid UUID and are not lost to the void.
INSERT INTO full_landed_costs (parcel_no, di_item_id, neogleamz_name, neogleamz_product, item_uuid)
SELECT DISTINCT 
    'ORPHAN_PARCEL', 
    'ORPHAN_' || orphan_name, 
    orphan_name, 
    orphan_name,
    gen_random_uuid()
FROM (
    SELECT REPLACE(item_key, 'RECIPE:::', '') AS orphan_name FROM inventory_consumption
    UNION SELECT REPLACE(item_key, 'RECIPE:::', '') FROM inventory_adjustments_log
    UNION SELECT product_name FROM product_recipes
    UNION SELECT product_name FROM production_sops
    UNION SELECT internal_recipe_name FROM pack_ship_sops
    UNION SELECT product_name FROM label_designs
    UNION SELECT internal_recipe_name FROM sales_ledger
    UNION SELECT internal_recipe_name FROM storefront_aliases
    UNION SELECT product_name FROM work_orders
    UNION SELECT part_name FROM print_queue
) AS orphans
WHERE orphan_name IS NOT NULL
  AND orphan_name NOT IN (
      SELECT COALESCE(neogleamz_product, neogleamz_name) FROM full_landed_costs WHERE COALESCE(neogleamz_product, neogleamz_name) IS NOT NULL
  );

UPDATE inventory_consumption ic
SET item_uuid = flc.item_uuid
FROM full_landed_costs flc
WHERE REPLACE(ic.item_key, 'RECIPE:::', '') = COALESCE(flc.neogleamz_product, flc.neogleamz_name);

UPDATE product_recipes pr
SET filament_item_uuid = flc.item_uuid
FROM full_landed_costs flc
WHERE pr.filament_item_key = flc.neogleamz_name;

UPDATE product_recipes pr
SET product_item_uuid = flc.item_uuid
FROM full_landed_costs flc
WHERE pr.product_name = flc.neogleamz_product;

UPDATE production_sops ps
SET product_item_uuid = flc.item_uuid
FROM full_landed_costs flc
WHERE ps.product_name = flc.neogleamz_product;

UPDATE pack_ship_sops pss
SET recipe_item_uuid = flc.item_uuid
FROM full_landed_costs flc
WHERE pss.internal_recipe_name = flc.neogleamz_product;

UPDATE sales_ledger sl
SET recipe_item_uuid = flc.item_uuid
FROM full_landed_costs flc
WHERE sl.internal_recipe_name = flc.neogleamz_product;

UPDATE work_orders wo
SET product_item_uuid = flc.item_uuid
FROM full_landed_costs flc
WHERE wo.product_name = flc.neogleamz_product;

UPDATE print_queue pq
SET part_item_uuid = flc.item_uuid
FROM full_landed_costs flc
WHERE pq.part_name = flc.neogleamz_product;

UPDATE label_designs ld
SET product_item_uuid = flc.item_uuid
FROM full_landed_costs flc
WHERE ld.product_name = flc.neogleamz_product;

UPDATE storefront_aliases sa
SET recipe_item_uuid = flc.item_uuid
FROM full_landed_costs flc
WHERE sa.internal_recipe_name = flc.neogleamz_product;

UPDATE inventory_adjustments_log ial
SET item_uuid = flc.item_uuid
FROM full_landed_costs flc
WHERE REPLACE(ial.item_key, 'RECIPE:::', '') = COALESCE(flc.neogleamz_product, flc.neogleamz_name);

-- 4. Enforce Referential Integrity (Foreign Keys)
ALTER TABLE inventory_consumption 
  ADD CONSTRAINT fk_inv_consumption_item FOREIGN KEY (item_uuid) REFERENCES full_landed_costs(item_uuid) ON DELETE CASCADE;

ALTER TABLE product_recipes 
  ADD CONSTRAINT fk_recipes_filament FOREIGN KEY (filament_item_uuid) REFERENCES full_landed_costs(item_uuid) ON DELETE CASCADE,
  ADD CONSTRAINT fk_recipes_product FOREIGN KEY (product_item_uuid) REFERENCES full_landed_costs(item_uuid) ON DELETE CASCADE;

ALTER TABLE inventory_adjustments_log
  ADD CONSTRAINT fk_inv_adj_item FOREIGN KEY (item_uuid) REFERENCES full_landed_costs(item_uuid) ON DELETE CASCADE;

ALTER TABLE production_sops
  ADD CONSTRAINT fk_prod_sop_product FOREIGN KEY (product_item_uuid) REFERENCES full_landed_costs(item_uuid) ON DELETE CASCADE;

ALTER TABLE pack_ship_sops
  ADD CONSTRAINT fk_pack_sop_recipe FOREIGN KEY (recipe_item_uuid) REFERENCES full_landed_costs(item_uuid) ON DELETE CASCADE;

ALTER TABLE label_designs
  ADD CONSTRAINT fk_label_product FOREIGN KEY (product_item_uuid) REFERENCES full_landed_costs(item_uuid) ON DELETE CASCADE;

ALTER TABLE sales_ledger
  ADD CONSTRAINT fk_sl_recipe FOREIGN KEY (recipe_item_uuid) REFERENCES full_landed_costs(item_uuid) ON DELETE CASCADE;

ALTER TABLE work_orders
  ADD CONSTRAINT fk_wo_product FOREIGN KEY (product_item_uuid) REFERENCES full_landed_costs(item_uuid) ON DELETE CASCADE;

ALTER TABLE print_queue
  ADD CONSTRAINT fk_pq_part FOREIGN KEY (part_item_uuid) REFERENCES full_landed_costs(item_uuid) ON DELETE CASCADE;

ALTER TABLE storefront_aliases
  ADD CONSTRAINT fk_sa_recipe FOREIGN KEY (recipe_item_uuid) REFERENCES full_landed_costs(item_uuid) ON DELETE CASCADE;

-- 5. Final Cleanup (Drop Legacy Columns)
ALTER TABLE inventory_consumption DROP CONSTRAINT IF EXISTS inventory_consumption_pkey;
ALTER TABLE inventory_consumption ADD PRIMARY KEY (item_uuid);

ALTER TABLE inventory_consumption DROP COLUMN item_key;
ALTER TABLE product_recipes DROP COLUMN filament_item_key, DROP COLUMN product_name;
ALTER TABLE inventory_adjustments_log DROP COLUMN item_key;
ALTER TABLE production_sops DROP COLUMN product_name;
ALTER TABLE pack_ship_sops DROP COLUMN internal_recipe_name;
ALTER TABLE label_designs DROP COLUMN product_name;
ALTER TABLE sales_ledger DROP COLUMN internal_recipe_name;
ALTER TABLE work_orders DROP COLUMN product_name;
ALTER TABLE print_queue DROP COLUMN part_name;
ALTER TABLE storefront_aliases DROP COLUMN internal_recipe_name;
