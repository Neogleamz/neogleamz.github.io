-- Migration to enable Supabase Realtime for sitewide synchronization
-- This explicitly adds the core tables to the realtime publication.

begin;
  -- Task Engine Tables
  alter publication supabase_realtime add table taskz;
  alter publication supabase_realtime add table cyclez;
  alter publication supabase_realtime add table projectz;
  alter publication supabase_realtime add table teams;
  alter publication supabase_realtime add table task_comments;
  alter publication supabase_realtime add table task_activity;
  alter publication supabase_realtime add table tagz;

  -- Inventory & Work Orders
  alter publication supabase_realtime add table inventory_consumption;
  alter publication supabase_realtime add table work_orders;

  -- Financials
  alter publication supabase_realtime add table sales_ledger;
commit;
