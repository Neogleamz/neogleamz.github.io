# EDITZ Bulk Edit Modal System

## Goal Description
The objective is to introduce a "Bulk Edit" environment within the EDITZ module that mimics the NEXUZ Sandbox. Instead of saving data linearly row-by-row and triggering immediate Supabase network calls, this feature will allow the user to load the entire `full_landed_costs` ledger into a local "staging" memory matrix. The user can mass-edit data natively, utilize search/filtering, review visually highlighted changes, and execute a single batch-commit to push all modified rows to Supabase simultaneously.

## Proposed Changes

### 1. index.html (UI Architecture)
- **EDITZ Actions:** Inject a `📦 Bulk Edit` button into the `.manual-entry-bar` next to "+ Add Row".
- **The Sandbox Modal:** Create a new fullscreen modal `<div id="editzBulkModal">` styled explicitly like the NEXUZ Sandbox.
    - **Header:** Title ("🧪 EDITZ BULK STAGING"), Warning text ("Database physically bypassed until committed..."), and a live Search/Filter input field.
    - **Body (Matrix):** A scrollable table container.
    - **Footer:** "🗑️ Discard Changes" and "✅ COMMIT X MODIFIED ITEMS" buttons.

### 2. index.html (State & Logic)
- **Staging Memory Manager:**
    - Initialize `let editzBulkStagingArray = []` and `let editzBulkModifiedTracking = new Set()`.
    - Function `openEditzBulkModal()`: Deep clones the current `finalResults` into the staging array, clears the modified set, and renders the modal.
- **Rendering Engine (`renderEditzBulkTable`):**
    - Generates a data grid exclusively from `editzBulkStagingArray`.
    - Implements native `<input>` elements for editable columns (e.g., Qty, Unit Cost, Neogleamz Name, Specification).
    - Rows that exist in `editzBulkModifiedTracking` will receive a `background: rgba(16, 185, 129, 0.15)` highlight to visually indicate pending changes.
- **Data Mutation Handler:**
    - Attaches `onchange` or `oninput` listeners to the table inputs to update `editzBulkStagingArray` locally and flag the `_RowKey` in `editzBulkModifiedTracking`.
- **Commit Pipeline (`commitEditzBulkChanges`):**
    - Filters the staging array to only extract the modified rows.
    - Constructs the necessary JSON payloads mapping back to `colMap`.
    - Executes a concurrent `Promise.all` Supabase `.update()` execution.
    - Upon successful batch update, closes the modal, clears the staging memory, and executes `await loadData(true)` to natively sync the live system.
- **Event Delegation:**
    - Register all new button clicks via `system-event-delegator.js`.

## User Review Required
> [!IMPORTANT]
> Because we are bypassing the single-row update logic, mass-editing hundreds of rows and clicking COMMIT will trigger multiple simultaneous `UPDATE` requests to Supabase. Are there any specific mathematical columns (like `final_cost_weight` or `total_cost_weight`) that you want the Staging Matrix to *auto-calculate locally* while you type, or should it behave exactly like the main EDITZ grid where you input the raw number and let the system absorb it?

## Verification Plan
### Manual Verification
1. Click "📦 Bulk Edit" to open the fullscreen sandbox.
2. Edit several fields across multiple different items. Observe the row highlighting green to indicate pending modifications.
3. Use the search bar inside the modal to filter and edit a specific subset of items.
4. Click "Commit Changes". Verify the modal closes, the main EDITZ table updates silently without a page refresh, and the changes persist to Supabase.
