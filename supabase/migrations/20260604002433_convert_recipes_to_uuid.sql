-- Migrate product_recipes components JSON from string item_keys to permanent item_uuids
UPDATE product_recipes pr
SET components = COALESCE((
    SELECT jsonb_agg(
        CASE 
            -- Leave barcodes as strings, they have no UUIDs
            WHEN (elem->>'item_key') LIKE 'BARCODE_LABEL:::%' THEN
                elem
            -- If it already has an item_uuid, skip it
            WHEN (elem->>'item_uuid') IS NOT NULL THEN
                elem
            -- Otherwise, map the string key to a UUID from the master ledger
            ELSE
                COALESCE(
                    (
                        SELECT jsonb_build_object(
                            'item_uuid', im.item_uuid,
                            'quantity', COALESCE(elem->'quantity', elem->'qty', '1')
                        )
                        FROM (
                            SELECT item_uuid,
                            CASE
                                WHEN neogleamz_product IS NOT NULL AND parcel_no = 'RECIPE_AUTO' THEN
                                    'RECIPE:::' || neogleamz_product
                                WHEN neogleamz_name IS NOT NULL AND neogleamz_name != '' THEN
                                    neogleamz_name || ':::' || COALESCE(neogleamz_product, '') || ':::(Grouped Raw Items):::(Mixed Specs)'
                                ELSE
                                    ':::' || COALESCE(neogleamz_product, '') || ':::' || COALESCE(item_name, 'Unknown') || ':::' || COALESCE(specification, '')
                            END as generated_key
                            FROM full_landed_costs
                        ) im
                        WHERE im.generated_key = (elem->>'item_key')
                        LIMIT 1
                    ),
                    elem -- Fallback to keeping the old string if mapping fails
                )
        END
    )
    FROM jsonb_array_elements(pr.components) AS elem
), '[]'::jsonb);
