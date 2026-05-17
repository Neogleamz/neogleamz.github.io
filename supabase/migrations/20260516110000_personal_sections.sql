-- Migration: 20260516110000_personal_sections.sql
-- Description: Adds personal_cycle_id to taskz to allow tasks to be assigned to personal user sections (Inbox/My Tasks) independent of their project sections.

ALTER TABLE public.taskz 
ADD COLUMN IF NOT EXISTS personal_cycle_id UUID REFERENCES public.cyclez(id) ON DELETE SET NULL;

-- Add index for performance when filtering personal views
CREATE INDEX IF NOT EXISTS idx_taskz_personal_cycle_id ON public.taskz(personal_cycle_id);
