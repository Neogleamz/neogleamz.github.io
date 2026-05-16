-- ==============================================
-- ASANA-STYLE PROJECTS & SECTIONS
-- ==============================================

-- 1. Create Enums
CREATE TYPE public.project_visibility AS ENUM ('Private', 'Organization');
CREATE TYPE public.project_status AS ENUM ('On Track', 'At Risk', 'Off Track');

-- 2. Projectz Table
CREATE TABLE IF NOT EXISTS public.projectz (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    visibility public.project_visibility DEFAULT 'Organization',
    health_status public.project_status DEFAULT 'On Track',
    due_date TIMESTAMPTZ,
    owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
    color_hex TEXT,
    icon_name TEXT DEFAULT 'folder',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Alter Cyclez (Now 'Sections')
ALTER TABLE public.cyclez 
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projectz(id) ON DELETE CASCADE;

-- 4. Alter Taskz
ALTER TABLE public.taskz 
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projectz(id) ON DELETE CASCADE;

-- ==============================================
-- ZERO-TRUST RLS: Enable & Grant Access
-- ==============================================

-- projectz
ALTER TABLE public.projectz ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_full_access" ON public.projectz
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
