-- ========================================================
-- NEOGLEAMZ INDEXING SCRIPT
-- Generated for Phase 2 Sitewide Audit Remediation
-- Run this in the Supabase SQL Editor
-- ========================================================

-- Sales Ledger Indexes for faster historical analytics and alias lookups
CREATE INDEX IF NOT EXISTS idx_sales_order_id ON sales_ledger(order_id);
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales_ledger(sale_date);
CREATE INDEX IF NOT EXISTS idx_sales_storefront_sku ON sales_ledger(storefront_sku);

-- Inventory Consumption Indexes for faster bom resolution
CREATE INDEX IF NOT EXISTS idx_inventory_item_key ON inventory_consumption(item_key);

-- Optimization Notes:
-- These indexes will vastly speed up the initial load times of the Neogleamz 
-- Engine by eliminating sequential scans across the core ledger tables.
