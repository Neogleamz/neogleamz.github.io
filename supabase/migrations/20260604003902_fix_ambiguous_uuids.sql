-- Fix ambiguous UUID mappings where a foreign key accidentally snapped to an ORPHAN_PARCEL or MANUAL row instead of the RECIPE_AUTO row

-- Fix product_recipes
UPDATE product_recipes pr
SET product_item_uuid = correct_flc.item_uuid
FROM full_landed_costs current_flc
JOIN full_landed_costs correct_flc 
  ON current_flc.neogleamz_product = correct_flc.neogleamz_product 
  AND correct_flc.parcel_no = 'RECIPE_AUTO'
WHERE pr.product_item_uuid = current_flc.item_uuid
  AND current_flc.parcel_no != 'RECIPE_AUTO';

-- Fix storefront_aliases
UPDATE storefront_aliases sa
SET recipe_item_uuid = correct_flc.item_uuid
FROM full_landed_costs current_flc
JOIN full_landed_costs correct_flc 
  ON current_flc.neogleamz_product = correct_flc.neogleamz_product 
  AND correct_flc.parcel_no = 'RECIPE_AUTO'
WHERE sa.recipe_item_uuid = current_flc.item_uuid
  AND current_flc.parcel_no != 'RECIPE_AUTO';

-- Fix label_designs
UPDATE label_designs ld
SET product_item_uuid = correct_flc.item_uuid
FROM full_landed_costs current_flc
JOIN full_landed_costs correct_flc 
  ON current_flc.neogleamz_product = correct_flc.neogleamz_product 
  AND correct_flc.parcel_no = 'RECIPE_AUTO'
WHERE ld.product_item_uuid = current_flc.item_uuid
  AND current_flc.parcel_no != 'RECIPE_AUTO';

-- Fix production_sops
UPDATE production_sops ps
SET product_item_uuid = correct_flc.item_uuid
FROM full_landed_costs current_flc
JOIN full_landed_costs correct_flc 
  ON current_flc.neogleamz_product = correct_flc.neogleamz_product 
  AND correct_flc.parcel_no = 'RECIPE_AUTO'
WHERE ps.product_item_uuid = current_flc.item_uuid
  AND current_flc.parcel_no != 'RECIPE_AUTO';

-- Fix pack_ship_sops
UPDATE pack_ship_sops pss
SET recipe_item_uuid = correct_flc.item_uuid
FROM full_landed_costs current_flc
JOIN full_landed_costs correct_flc 
  ON current_flc.neogleamz_product = correct_flc.neogleamz_product 
  AND correct_flc.parcel_no = 'RECIPE_AUTO'
WHERE pss.recipe_item_uuid = current_flc.item_uuid
  AND current_flc.parcel_no != 'RECIPE_AUTO';
