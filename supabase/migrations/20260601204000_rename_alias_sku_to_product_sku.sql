-- Migration: Rename storefront_sku to product_sku in storefront_aliases to eliminate transaction/product naming confusion.
ALTER TABLE public.storefront_aliases RENAME COLUMN storefront_sku TO product_sku;
