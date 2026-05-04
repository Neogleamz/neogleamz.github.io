-- ==============================================
-- NEXUZ TERMINAL: GLOBAL INVENTORY SNAPSHOTS
-- ==============================================

-- 1. Create inventory_snapshots table
CREATE TABLE IF NOT EXISTS public.inventory_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    name TEXT NOT NULL,
    snapshot_data JSONB NOT NULL,
    created_by TEXT DEFAULT 'system'
);

-- 2. Enable RLS
ALTER TABLE public.inventory_snapshots ENABLE ROW LEVEL SECURITY;

-- 3. Create Policies (Mirroring inventory_consumption)
CREATE POLICY "Enable read access for all users" ON public.inventory_snapshots
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for all users" ON public.inventory_snapshots
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable delete for all users" ON public.inventory_snapshots
    FOR DELETE USING (true);

-- 4. Index for performance
CREATE INDEX IF NOT EXISTS idx_inventory_snapshots_created_at ON public.inventory_snapshots (created_at DESC);
