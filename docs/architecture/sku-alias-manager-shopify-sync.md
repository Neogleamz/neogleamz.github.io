# Architecture Decision Record: SKU Alias Manager Shopify Sync Stabilization

## 1. Context & Objectives
The SKU Alias Manager is currently experiencing critical data mapping issues: duplicating alias entries, missing barcode values ("None"), and misidentifying full product titles (e.g., "SK8Lytz SOULZ - Black") as the system SKUs. This issue originates from the Supabase Edge Functions (`shopify-webhook` and `shopify-force-sync`) mistakenly using the highly mutable Product Title as the unique conflict resolution key (`product_sku`) within the `storefront_aliases` database table. The objective is to stabilize the data model to definitively prevent orphaned aliases, accurately ingest Shopify SKUs, and ensure barcodes are properly mapped for physical fulfillment scanners.

## 2. Architectural Overview (Context Level)
The SKU Alias Manager serves as the crucial translation bridge between external Shopify storefront orders and the internal "Recipes" (manufactured units) managed in `index.html`. 
* **Ingestion Points**: The `shopify-webhook` function handles real-time event-driven orders, while `shopify-force-sync` acts as a catalog reconciliation backup. 
* **The Fix**: This update requires a schema paradigm shift within `storefront_aliases` to align with Shopify's true unique identifiers, coupled with updates to both edge functions and the Vanilla JS DOM rendering logic to decouple the human-readable product name from the system's mapping logic.

## 3. Industry Standard Validation
The **Vanilla JS & Data Flow Validator** subagent was dispatched and confirmed three major systemic flaws preventing accurate mapping:
1. **Destructive Barcode Overwrite (`shopify-webhook`)**: The webhook forces `barcode_value: item.barcode || null` during upsert. Because Shopify `orders/create` webhooks famously do not natively include the barcode in the line items payload, this continually erases any previously stored barcodes.
2. **Mini SKU / `shopify_sku` Overshadowing (`shopify-force-sync` & `shopify-webhook`)**: Both scripts use `const targetSku = fullTitle || sku` for the `product_sku` conflict resolution column. This effectively buries the actual short SKU ("mini SKU") and forces the system to rely on highly mutable Product Titles, causing duplication.
3. **Silent Update Failure (`index.html`)**: The UI function `saveAliasBarcode` attempts to `update({ barcode_value })` by matching `product_sku` to the visually rendered mini SKU string. Because the database actually holds the long title in `product_sku`, it updates 0 rows and fails silently without user feedback.

## 4. Design Decisions & Trade-offs
* **Decision 1: Protect Existing Barcodes from Null Overwrites**
  * *Approach*: Refactor `shopify-webhook` so that `barcode_value` is conditionally omitted from the upsert payload entirely if `item.barcode` is undefined or falsy. 
  * *Why*: This explicitly prevents the webhook from destructively overwriting barcodes that were successfully hydrated by the asynchronous `shopify-force-sync` job or manually entered by warehouse staff.
* **Decision 2: Switch Primary Identifier to the Immutable Mini SKU**
  * *Approach*: Refactor the edge functions so the database constraint strictly utilizes the `sku` / `shopify_sku` as the unique `product_sku`. Move the human-readable full title into a secondary UI-only column (e.g., `storefront_name`).
  * *Trade-off*: We must run a migration script to clean up legacy aliases that were mapped via product titles to prevent them from becoming orphaned.
* **Decision 3: Hard-Bind UI Updates to Internal IDs**
  * *Approach*: Update the Vanilla JS DOM logic (`saveAliasBarcode`) to bind state mutations to either the internal database UUID of the alias row, or explicitly match on the newly corrected `shopify_sku` column, rather than attempting to match against the frontend visual string.
