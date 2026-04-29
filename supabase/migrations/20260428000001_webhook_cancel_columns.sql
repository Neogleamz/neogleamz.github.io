-- Add cancellation columns
ALTER TABLE sales_ledger
ADD COLUMN IF NOT EXISTS cancelled_at VARCHAR DEFAULT NULL,
ADD COLUMN IF NOT EXISTS cancel_reason VARCHAR DEFAULT NULL;
