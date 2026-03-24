-- ==============================================
-- NEXUZ PACKERZ TERMINAL: DATABASE MIGRATION
-- ==============================================

-- 1. Create the new SOP table to hold packing instructions
CREATE TABLE IF NOT EXISTS pack_ship_sops (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    internal_recipe_name TEXT NOT NULL UNIQUE,
    instruction_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    required_box_sku TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Mutate the existing sales ledger to track Kanban board states
ALTER TABLE sales_ledger 
ADD COLUMN IF NOT EXISTS internal_fulfillment_status TEXT DEFAULT 'Awaiting Assembly';

-- 3. Pre-seed the default dummy test order state if needed
UPDATE sales_ledger 
SET internal_fulfillment_status = 'Awaiting Assembly' 
WHERE internal_fulfillment_status IS NULL;
