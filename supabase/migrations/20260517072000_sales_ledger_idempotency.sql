-- Migration: 20260517072000_sales_ledger_idempotency.sql
-- Description: Enforce idempotency on the sales_ledger to prevent duplicate rows caused by simultaneous Shopify webhooks.

BEGIN;

-- Apply a unique constraint blocking identical SKUs on the same Order ID from being inserted multiple times
ALTER TABLE sales_ledger
ADD CONSTRAINT sales_ledger_order_sku_unique UNIQUE (order_id, storefront_sku);

COMMIT;
