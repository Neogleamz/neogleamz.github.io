-- Add is_archived column to projectz table
ALTER TABLE public.projectz
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;
