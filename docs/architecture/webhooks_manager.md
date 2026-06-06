# Architecture Decision Record: Webhooks Manager

## 1. Context & Objectives
- **Problem:** Shopify orders occasionally fail to sync into the `SALEZ` ledger via the native `shopify-webhook` Edge Function due to network timeouts or data mapping errors. Currently, there is no observability into incoming webhook traffic, nor is there a way to manually force-replay a dropped payload natively within Neogleamz without logging into the Shopify Developer backend.
- **Objective:** Build a native UI pane within the `SALEZ` module to log, inspect, and manually replay incoming Shopify webhooks to guarantee absolute data retention and zero dropped orders.

## 2. Architectural Overview (Context Level)
- **Database Layer (Supabase):** A new `shopify_webhook_logs` table must be instantiated. It will act as the primary ingestion buffer, storing the raw JSON payload, `shopify_event_id`, timestamp, and processing `status` (`pending`, `processed`, `failed`).
- **Edge Function Layer:** The existing `shopify-webhook` Edge Function must be refactored. Before attempting to parse and upsert the data to the `sales_ledger`, it will immediately `INSERT` the raw payload into `shopify_webhook_logs`.
- **Frontend Layer (`SALEZ`):** The `SALEZ` module's `#salezControlPanel` will host a 4th Panel Card titled "Webhooks Manager". Clicking this triggers a new `webhooksModal` displaying the `shopify_webhook_logs` table, allowing the operator to click "Manually Run Selected", triggering a direct replay.

## 3. Industry Standard Validation
*Validations provided by Swarm Subagents:*
- **Security & Performance:** Instead of the frontend parsing massive Shopify JSON payloads manually, the "Manually Run Selected" button will simply send the stored `shopify_event_id` back to the Edge Function. The Edge Function fetches the payload securely server-side and executes the upsert. This prevents frontend DOM memory bloat and mitigates XSS risks from raw vendor JSON injection.
- **Vanilla JS & Data Flow:** We will strictly reuse the existing `.modal-overlay` patterns and CSS grid structures already present in `index.html` to maintain UI consistency and avoid framework bloat.
- **UI/UX Strategy:** The 2x2 grid layout in `#salezControlPanel` is currently unbalanced with only 3 active panels. The new "Webhooks Manager" card completes the quadrant symmetrically. Pushing the heavy data table into a `.modal-overlay` keeps the complex payload JSON isolated from the main `ORDERZ` screen, prioritizing a clean, glanceable UI.

## 4. Design Decisions & Trade-offs
- **Decision:** Storing Raw Webhook Payloads.
- *Trade-off:* Requires more Supabase PostgreSQL storage over time. However, the data loss mitigation for financial orders far outweighs the storage cost. We will mitigate storage bloat by implementing a strict 30-day auto-purge TTL on the `shopify_webhook_logs` table.
- **Decision:** Server-Side Re-execution vs Frontend Re-execution.
- *Trade-off:* Executing the replay server-side requires an additional Edge Function route, but is significantly more secure and prevents the browser from freezing during large historical batch replays.
