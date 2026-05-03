-- ==============================================
-- TASK ENGINE (Phase 8): Archive Features
-- ==============================================

-- 1. Add `is_archived` to taskz
ALTER TABLE public.taskz
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;

-- 2. Add `is_archived` to cyclez
ALTER TABLE public.cyclez
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;

-- 3. Add `is_archived` to teams
ALTER TABLE public.teams
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;
