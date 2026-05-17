-- Add metadata JSONB column to cyclez to support section sorting
ALTER TABLE public.cyclez
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
