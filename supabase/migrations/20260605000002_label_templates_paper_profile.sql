-- Add paper profile to label_templates
ALTER TABLE public.label_templates ADD COLUMN IF NOT EXISTS "paper_profile" text;
