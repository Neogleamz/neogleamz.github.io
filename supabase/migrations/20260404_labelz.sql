-- LABELZ MODULE MIGRATION
-- Adds is_label flag to product_recipes and creates label_designs table

-- 1. Add is_label column to existing product_recipes table
ALTER TABLE product_recipes
  ADD COLUMN IF NOT EXISTS is_label boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS label_emoji text DEFAULT '🏷️';

-- 2. Create label_designs table for visual design data
CREATE TABLE IF NOT EXISTS label_designs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  product_name text NOT NULL UNIQUE,
  emoji text DEFAULT '🏷️',
  file_url text,
  file_name text,
  layout_json jsonb,
  label_size text DEFAULT '2.25x1.25',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. Enable RLS on label_designs
ALTER TABLE label_designs ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Allow all for authenticated" ON label_designs FOR ALL USING (true);
