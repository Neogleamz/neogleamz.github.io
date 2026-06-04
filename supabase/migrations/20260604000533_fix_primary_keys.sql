-- Restore Primary Keys dropped during UUID Migration
ALTER TABLE product_recipes DROP CONSTRAINT IF EXISTS product_recipes_pkey;
ALTER TABLE product_recipes ADD PRIMARY KEY (product_item_uuid);

ALTER TABLE production_sops DROP CONSTRAINT IF EXISTS production_sops_pkey;
ALTER TABLE production_sops ADD PRIMARY KEY (product_item_uuid);

ALTER TABLE pack_ship_sops DROP CONSTRAINT IF EXISTS pack_ship_sops_pkey;
ALTER TABLE pack_ship_sops ADD PRIMARY KEY (recipe_item_uuid);
