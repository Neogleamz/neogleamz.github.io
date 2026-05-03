-- ==============================================
-- TASK ENGINE (Phase 2): Relational Schema
-- ==============================================
-- This schema establishes the foundation for the
-- Neogleamz Task Engine, including identity groups,
-- cycle timeboxing, dependencies, and Process Street
-- style template scaffolding.
-- ==============================================

-- 1. Create Enums
CREATE TYPE public.task_status AS ENUM ('Backlog', 'Todo', 'In Progress', 'Blocked', 'Done', 'Canceled');
CREATE TYPE public.task_module AS ENUM ('inventory', 'sales', 'work_orders', 'cfo', 'general');

-- 2. Teams (Group Identity)
CREATE TABLE IF NOT EXISTS public.teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    color_hex TEXT
);

-- 3. Team Members (Junction Table)
CREATE TABLE IF NOT EXISTS public.team_members (
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    PRIMARY KEY (team_id, user_id)
);

-- 4. Cyclez (Timeboxing & Milestones)
CREATE TABLE IF NOT EXISTS public.cyclez (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    color_hex TEXT,
    assigned_to_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    assigned_team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL
);

-- 5. Core Taskz Engine
CREATE TABLE IF NOT EXISTS public.taskz (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    status public.task_status DEFAULT 'Todo',
    due_date TIMESTAMPTZ,
    parent_task_id UUID REFERENCES public.taskz(id) ON DELETE CASCADE,
    cycle_id UUID REFERENCES public.cyclez(id) ON DELETE SET NULL,
    linked_module public.task_module DEFAULT 'general',
    linked_entity_id UUID,
    estimated_minutes INTEGER DEFAULT 0,
    actual_minutes INTEGER DEFAULT 0,
    assigned_to_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    assigned_team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
    created_by_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Task Dependencies (Asana Blockers)
CREATE TABLE IF NOT EXISTS public.task_dependencies (
    task_id UUID REFERENCES public.taskz(id) ON DELETE CASCADE,
    blocked_by_id UUID REFERENCES public.taskz(id) ON DELETE CASCADE,
    PRIMARY KEY (task_id, blocked_by_id)
);

-- 7. Task Comments (Rich Threading)
CREATE TABLE IF NOT EXISTS public.task_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES public.taskz(id) ON DELETE CASCADE,
    author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. Task Activity (Immutable Audit Ledger)
CREATE TABLE IF NOT EXISTS public.task_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES public.taskz(id) ON DELETE CASCADE,
    actor_type TEXT, -- 'System' or 'User'
    action_text TEXT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT now()
);

-- 9. Task Templates (Process Street Scaffold)
CREATE TABLE IF NOT EXISTS public.task_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    default_status public.task_status DEFAULT 'Todo',
    estimated_minutes INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 10. Template Subtasks
CREATE TABLE IF NOT EXISTS public.template_subtasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID REFERENCES public.task_templates(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    estimated_minutes INTEGER DEFAULT 0
);

-- ==============================================
-- ZERO-TRUST RLS: Enable & Grant Access
-- ==============================================

-- teams
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_full_access" ON public.teams
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- team_members
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_full_access" ON public.team_members
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- cyclez
ALTER TABLE public.cyclez ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_full_access" ON public.cyclez
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- taskz
ALTER TABLE public.taskz ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_full_access" ON public.taskz
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- task_dependencies
ALTER TABLE public.task_dependencies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_full_access" ON public.task_dependencies
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- task_comments
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_full_access" ON public.task_comments
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- task_activity
ALTER TABLE public.task_activity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_full_access" ON public.task_activity
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- task_templates
ALTER TABLE public.task_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_full_access" ON public.task_templates
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- template_subtasks
ALTER TABLE public.template_subtasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_full_access" ON public.template_subtasks
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
