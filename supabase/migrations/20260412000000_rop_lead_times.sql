-- ==============================================
-- NEXUZ TERMINAL: INVENTORY ROP LEAD TIMES
-- ==============================================

-- Add new tracking column to inventory_consumption table for dynamic lead times
ALTER TABLE public.inventory_consumption
ADD COLUMN IF NOT EXISTS rop_lead_time_days NUMERIC DEFAULT 5;
