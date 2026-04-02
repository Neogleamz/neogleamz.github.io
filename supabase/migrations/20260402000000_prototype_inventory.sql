-- ==============================================
-- NEXUZ TERMINAL: INVENTORY TRACKING MIGRATION
-- ==============================================

-- 1. Add new tracking columns to inventory_consumption table
ALTER TABLE inventory_consumption
ADD COLUMN IF NOT EXISTS prototype_consumed_qty NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS assembly_consumed_qty NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS production_consumed_qty NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS prototype_produced_qty NUMERIC DEFAULT 0;

-- 2. Backfill existing production_consumed_qty with legacy consumed_qty to ensure continuity
-- Assuming prior consumption was primarily production-based unless sub-assembly routing was heavy, 
-- but this keeps the math (legacy consumed_qty = prototype + assembly + production) sound for new systems.
UPDATE inventory_consumption
SET production_consumed_qty = consumed_qty
WHERE production_consumed_qty = 0 AND consumed_qty > 0;
