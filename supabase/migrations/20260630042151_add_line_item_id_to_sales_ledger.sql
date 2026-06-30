ALTER TABLE "public"."sales_ledger" 
ADD COLUMN "line_item_id" character varying;

ALTER TABLE ONLY "public"."sales_ledger"
DROP CONSTRAINT IF EXISTS "sales_ledger_order_sku_unique";
