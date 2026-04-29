-- ==============================================
-- NEXUZ TERMINAL: REVENUEZ FULFILLMENT EXPANSION
-- ==============================================

-- 1. Add precise operational tracking and payout data to sales_ledger
ALTER TABLE sales_ledger
ADD COLUMN IF NOT EXISTS tracking_number VARCHAR DEFAULT NULL,
ADD COLUMN IF NOT EXISTS carrier_name VARCHAR DEFAULT NULL,
ADD COLUMN IF NOT EXISTS actual_shipping_cost NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS actual_payout NUMERIC DEFAULT 0;
