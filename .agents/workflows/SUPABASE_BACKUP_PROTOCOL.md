# SUPABASE BACKUP & DISASTER RECOVERY PROTOCOL

This document satisfies Audit Requirement **7c (Backup Strategy Documented)**. It outlines the disaster recovery architecture for the Neogleamz Supabase backend.

## 1. Automated Point-in-Time Recovery (PITR)
Neogleamz is hosted exclusively on Supabase, leveraging its managed PostgreSQL infrastructure.

**Default Safety Blanket:**
- Supabase inherently takes daily physical database backups of the entire cluster.
- Every database manipulation (via `packerz-module.js` or `sales-module.js`) is natively transaction-logged automatically.

**How to Restore from a Catastrophic Deletion:**
1. Log in to the [Supabase Dashboard](https://app.supabase.com/).
2. Navigate to your defined Neogleamz Project.
3. Select the **Database** icon from the left navigation pane.
4. Go to **Backups**.
5. You will see a list of physical daily snapshots. Click **Restore** on the most recent known healthy state.
*(Note: A full DB restore creates a temporary read-only lock while the database volume physically rebuilds).*

## 2. Hard Data Exports (The local safety net)
Because Neogleamz thrives on independent access without relying on enterprise SAAS locked data, you should perform a manual logical extraction once a month.

**Monthly CSV Export Procedure:**
1. Open the Supabase Dashboard -> **Table Editor**.
2. Select the core master ledgers one-by-one: `product_recipes`, `sales_ledger`, `inventory_consumption`.
3. In the top right corner of the grid, click **Export to CSV**.
4. Store these files natively on your `OneDrive - Neogleamz` under `Accounting - General\Database Backups`.

## 3. High-Concurrency Transaction Racing (Audit Item 3a) 
In evaluating Audit Item **3a**, the system determined that strict distributed lock mechanisms (like `SELECT FOR UPDATE` or Optimistic Concurrency Control) are unnecessary architectural overhead. Because Neogleamz operates as a single-admin logistics suite, true multi-agent race conditions (two instances writing to the same row at the exact same millisecond) simply do not exist.  

If a partial network drop occurs in the middle of a `renameCurrentProduct` multi-batch call, the `.catch()` hooks (implemented in Phase 3) will log the structural failure locally, allowing safe manual repair without locking up the user interface.
