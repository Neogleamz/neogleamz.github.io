CREATE OR REPLACE FUNCTION public.get_active_schema_tables()
RETURNS TABLE(table_name text) AS $$
BEGIN
    RETURN QUERY
    SELECT relname::text
    FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
