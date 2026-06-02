-- Migration to enable Supabase Realtime for storefront_aliases table
alter publication supabase_realtime add table storefront_aliases;
