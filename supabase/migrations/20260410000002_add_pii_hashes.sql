ALTER TABLE public.sales_ledger ADD COLUMN IF NOT EXISTS customer_email_hash text;
ALTER TABLE public.sales_ledger ADD COLUMN IF NOT EXISTS customer_phone_hash text;
ALTER TABLE public.sales_ledger ADD COLUMN IF NOT EXISTS shipping_name_hash text;
ALTER TABLE public.sales_ledger ADD COLUMN IF NOT EXISTS shipping_address_hash text;
