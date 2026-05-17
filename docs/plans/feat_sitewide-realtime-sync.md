### Design Decisions & Rationale
We are implementing a centralized `system-realtime-sync.js` module rather than configuring WebSockets independently across all 15+ feature files. This prevents connection saturation and enforces a single source of truth for incoming data mutations. By listening to the `postgres_changes` event for `schema: 'public'` universally, we capture every `INSERT`, `UPDATE`, and `DELETE`. The incoming payload directly mutates our local `window.*` caches (e.g., `taskEngineDB`, `inventoryDB`) without requiring a secondary Supabase round-trip, executing true Zero-Cache efficiency. Finally, we implement an "Active Focus Guard" that queues UI re-renders if the user is actively typing in an `input` or `textarea` to prevent focus-stealing during cross-user edits.

## User Review Required
> [!IMPORTANT]
> Because Supabase Realtime channels can cause UI flickering if someone else updates a row while you are typing, we are introducing an **Active Focus Guard**. If a user is currently focused on an `INPUT`, `TEXTAREA`, or `SELECT` inside a grid, the real-time update will update the background data, but the visual re-render will be paused until they finish typing (blur). Does this UX sound appropriate for the Command Center?

## Proposed Changes

### Core System Integration

#### [NEW] `system-realtime-sync.js`
Create the centralized WebSocket listener.
- Initialize `supabaseClient.channel('neogleamz-global-sync')`.
- Subscribe to `postgres_changes` for `*` on schema `public`.
- Parse incoming payloads and map them to their respective in-memory databases (`window.taskEngineDB`, `window.inventoryDB`, `window.workOrdersDB`, `window.salesDB`, etc.).
- Update, insert, or delete from the arrays based on `eventType`.
- Fire a debounced and focus-guarded re-render command for the affected module.
- Dispatch a `neogleamz:realtime` CustomEvent for edge-case modules to hook into.

#### [MODIFY] `index.html`
- Inject `<script src="system-realtime-sync.js"></script>` just after `neogleamz-engine.js` so all global DB variables are instantiated before the listener boots.

#### [MODIFY] `task-engine.js`
- Export `teRenderTaskGrid` securely to the `window` object so the Realtime module can trigger it.
- Remove any redundant localized polling mechanisms (if any exist).

#### [MODIFY] `inventory-module.js` & `sales-module.js`
- Expose `window.renderInventoryGrid` and `window.renderSalesLedger` so the central Sync engine can refresh them dynamically when their respective caches (`inventory_consumption`, `sales_ledger`) mutate.

## Verification Plan

### Automated Tests
- Run `npx eslint .` to guarantee the new `system-realtime-sync.js` adheres to strict syntax standards.

### Manual Verification
- Execute a dual-browser test: Open two browser instances (e.g., Chrome and Edge) side by side.
- Make a task status change in Window A. Verify Window B visually updates instantly without refreshing.
- Attempt to edit an input field in Window A while changing a separate task status in Window B. Verify Window A's typing flow is not interrupted by the background re-render.
