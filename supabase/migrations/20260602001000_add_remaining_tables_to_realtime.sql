-- Migration to enable Supabase Realtime for remaining core tables
alter publication supabase_realtime add table product_recipes;
alter publication supabase_realtime add table full_landed_costs;
alter publication supabase_realtime add table production_sops;
alter publication supabase_realtime add table socialz_audience;
