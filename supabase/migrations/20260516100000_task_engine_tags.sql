-- ==============================================
-- TASK ENGINE (Phase 2.1): Tagging System
-- ==============================================

-- 1. Create Tagz Table
CREATE TABLE IF NOT EXISTS public.tagz (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    color_hex TEXT DEFAULT '#64748b',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Zero-Trust RLS: Enable & Grant Access
ALTER TABLE public.tagz ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_full_access" ON public.tagz
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
