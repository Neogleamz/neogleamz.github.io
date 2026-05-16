-- Add metadata JSONB column to projectz to support Sandbox spoofing
ALTER TABLE public.projectz
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
