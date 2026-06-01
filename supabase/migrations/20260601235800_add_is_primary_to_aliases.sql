-- Migration: Add is_primary to storefront_aliases to designate primary printing alias for multi-channel listings
ALTER TABLE public.storefront_aliases ADD COLUMN IF NOT EXISTS is_primary boolean DEFAULT false;

COMMENT ON COLUMN public.storefront_aliases.is_primary IS 'True if this storefront SKU is the primary barcode and SKU name template used for warehouse printing when multiple SKUs map to the same recipe.';
