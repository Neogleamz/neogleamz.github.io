-- ==============================================
-- NEXUZ TERMINAL: SALES LEDGER REFUND EXPANSION
-- ==============================================

ALTER TABLE sales_ledger
ADD COLUMN IF NOT EXISTS refunded_amount NUMERIC DEFAULT 0;
