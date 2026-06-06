# Implementation Plan: Webhooks Manager

## Reference
- **Architecture Document:** [docs/architecture/webhooks_manager.md](file:///d:/GitHub/neogleamz.github.io/docs/architecture/webhooks_manager.md)

## 1. Database (Supabase)
1. Execute a Supabase Migration to create `shopify_webhook_logs`.
   - Columns: `id` (UUID), `shopify_event_id` (String, Unique), `payload` (JSONB), `status` (Enum: 'pending', 'processed', 'failed'), `created_at` (Timestamptz).
   - Add a 30-day auto-purge TTL trigger (pg_cron or standard trigger).
2. Set up RLS to ensure only authenticated frontend operators can `SELECT` the logs.

## 2. Edge Function Refactoring
1. Update `supabase/functions/shopify-webhook/index.ts`.
2. First step on ingestion: Insert the raw payload into `shopify_webhook_logs` with `status: 'pending'`.
3. Proceed with existing parsing and upsert logic to `sales_ledger`.
4. On success: Update the log `status` to `'processed'`.
5. On failure/try-catch block: Update `status` to `'failed'` and retain the `payload` for manual replay.
6. Build a manual replay route block: If the Edge Function receives a POST request with `action: 'replay'` and `shopify_event_id`, it will fetch the payload directly from the database and re-trigger the upsert sequence.

## 3. Frontend Layout & Logic (`assets/js/sales-module.js` & `index.html`)
1. **The Panel Card:** Append the 4th Panel Card into `#salezControlPanel` using the exact HTML structure validated by the UI/UX Architect. This will feature the "OPEN MANAGER" button.
2. **The Modal:** Append `<div id="webhooksModal" class="modal-overlay">` containing the wide webhook events table near the bottom of `index.html`.
3. **Data Fetching:** In `sales-module.js`, write `fetchWebhookLogs()` using the standard Supabase JS client to fetch the most recent 100 rows from `shopify_webhook_logs`, ordering by `created_at` DESC.
4. **DOM Rendering:** Write `renderWebhooksTable(logs)` to iterate and build `<tr>` elements for the modal.
5. **Replay Action:** Attach an Event Listener to `#btnManuallyRunWebhook`. It will extract the selected row's `shopify_event_id` and execute a `POST` fetch to the Edge Function with `{ action: 'replay', shopify_event_id }`, followed by a UI toast notification and a table refresh.
