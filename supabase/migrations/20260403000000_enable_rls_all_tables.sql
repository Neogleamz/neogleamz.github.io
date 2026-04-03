-- ==============================================
-- SECURITY: ENABLE ROW LEVEL SECURITY (RLS)
-- ==============================================
-- Enables RLS on all public tables and creates
-- a single policy per table allowing full access
-- to authenticated (logged-in) users only.
-- Unauthenticated (anon) users get zero access.
--
-- This does NOT change the app's login flow.
-- Users still authenticate with the same email
-- and password via Supabase Auth. RLS simply
-- ensures the database API itself is also gated.
-- ==============================================

-- app_settings
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_full_access" ON public.app_settings;
CREATE POLICY "authenticated_full_access" ON public.app_settings
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- full_landed_costs
ALTER TABLE public.full_landed_costs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_full_access" ON public.full_landed_costs;
CREATE POLICY "authenticated_full_access" ON public.full_landed_costs
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- inventory_consumption
ALTER TABLE public.inventory_consumption ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_full_access" ON public.inventory_consumption;
CREATE POLICY "authenticated_full_access" ON public.inventory_consumption
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- pack_ship_sops
ALTER TABLE public.pack_ship_sops ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_full_access" ON public.pack_ship_sops;
CREATE POLICY "authenticated_full_access" ON public.pack_ship_sops
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- print_queue
ALTER TABLE public.print_queue ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_full_access" ON public.print_queue;
CREATE POLICY "authenticated_full_access" ON public.print_queue
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- product_recipes
ALTER TABLE public.product_recipes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_full_access" ON public.product_recipes;
CREATE POLICY "authenticated_full_access" ON public.product_recipes
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- production_sops
ALTER TABLE public.production_sops ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_full_access" ON public.production_sops;
CREATE POLICY "authenticated_full_access" ON public.production_sops
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- raw_orders
ALTER TABLE public.raw_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_full_access" ON public.raw_orders;
CREATE POLICY "authenticated_full_access" ON public.raw_orders
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- raw_parcel_items
ALTER TABLE public.raw_parcel_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_full_access" ON public.raw_parcel_items;
CREATE POLICY "authenticated_full_access" ON public.raw_parcel_items
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- raw_parcel_summary
ALTER TABLE public.raw_parcel_summary ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_full_access" ON public.raw_parcel_summary;
CREATE POLICY "authenticated_full_access" ON public.raw_parcel_summary
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- sales_ledger
ALTER TABLE public.sales_ledger ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_full_access" ON public.sales_ledger;
CREATE POLICY "authenticated_full_access" ON public.sales_ledger
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- socialz_audience
ALTER TABLE public.socialz_audience ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_full_access" ON public.socialz_audience;
CREATE POLICY "authenticated_full_access" ON public.socialz_audience
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- storefront_aliases
ALTER TABLE public.storefront_aliases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_full_access" ON public.storefront_aliases;
CREATE POLICY "authenticated_full_access" ON public.storefront_aliases
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- tipz
ALTER TABLE public.tipz ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_full_access" ON public.tipz;
CREATE POLICY "authenticated_full_access" ON public.tipz
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- work_orders
ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_full_access" ON public.work_orders;
CREATE POLICY "authenticated_full_access" ON public.work_orders
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
