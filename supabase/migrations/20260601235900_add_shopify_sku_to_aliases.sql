-- Migration: Add shopify_sku to storefront_aliases to store the official Shopify variant SKU mapping directly.
ALTER TABLE public.storefront_aliases ADD COLUMN IF NOT EXISTS shopify_sku text;

COMMENT ON COLUMN public.storefront_aliases.shopify_sku IS 'The actual official Shopify variant SKU associated with this storefront alias.';
