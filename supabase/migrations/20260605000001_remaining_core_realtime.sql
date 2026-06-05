-- Migration to enable Supabase Realtime for remaining core tables
DO $$
DECLARE
    tbl text;
BEGIN
    FOR tbl IN SELECT unnest(ARRAY[
        'pack_ship_sops', 'label_designs', 'label_templates', 'product_catalog', 
        'inventory_adjustments_log', 'app_settings', 'task_templates', 
        'template_subtasks', 'hardware_blacklist', 'feature_flags'
    ])
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables 
            WHERE pubname = 'supabase_realtime' AND tablename = tbl
        ) THEN
            EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE ' || tbl;
        END IF;
    END LOOP;
END $$;
