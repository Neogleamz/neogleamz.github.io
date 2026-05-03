ALTER TABLE teams ADD COLUMN IF NOT EXISTS members jsonb DEFAULT '[]'::jsonb;
