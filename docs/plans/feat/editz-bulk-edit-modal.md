# EDITZ Bulk Edit Modal System

## Goal Description
The objective is to introduce a "Bulk Edit" environment within the EDITZ module that mimics the NEXUZ Sandbox. Instead of saving data linearly row-by-row and triggering immediate Supabase network calls, this feature will allow the user to load the entire `full_landed_costs` ledger into a local "staging" memory matrix. The user can mass-edit data natively, utilize search/filtering, review visually highlighted changes, and execute a single batch-commit to push all modified rows to Supabase simultaneously.

## Proposed Changes

### 1. index.html (UI Architecture)
- **EDITZ Actions:** Inject a `📦 Bulk Edit` button into the `.manual-entry-bar` next to "+ Add Row".
- **The Sandbox Modal:** Create a new fullscreen modal `<div id="editzBulkModal">` styled explicitly like the NEXUZ Sandbox.
    - **Header:** Title ("🧪 EDITZ BULK STAGING"), Warning text ("Database physically bypassed until committed..."), and a live **Search/Filter input field**.
    - **Bulk Action Bar [NEW]:** A sub-header bar containing a "Find & Replace" tool. It will include:
        - Dropdown: "Target Column" (e.g., Neogleamz Product)
        - Input: "Find" (e.g., "Soulz")
        - Input: "Replace With" (e.g., "Soulz White")
        - Button: `🪄 Apply to Visible Rows`
    - **Body (Matrix):** A scrollable table container.
    - **Footer:** "🗑️ Discard Changes" and "✅ COMMIT X MODIFIED ITEMS" buttons.

### 2. index.html (State & Logic)
- **Staging Memory Manager:**
    - Initialize `let editzBulkStagingArray = []` and `let editzBulkModifiedTracking = new Set()`.
    - Function `openEditzBulkModal()`: Deep clones the current `finalResults` into the staging array, clears the modified set, and renders the modal.
- **Rendering Engine (`renderEditzBulkTable`):**
    - Generates a data grid exclusively from `editzBulkStagingArray`.
    - Honors the Search/Filter input to only display rows matching the search criteria.
    - Implements native `<input>` elements for editable columns (e.g., Qty, Unit Cost, Neogleamz Name, Specification).
    - Rows that exist in `editzBulkModifiedTracking` will receive a `background: rgba(16, 185, 129, 0.15)` highlight to visually indicate pending changes.
- **Find & Replace Logic [NEW]:**
    - Function `applyBulkFindReplace()`: Iterates through the currently *visible* rows in the modal (post-search filtering). If the target column text matches or contains the "Find" string, it replaces it with the "Replace With" string, updates `editzBulkStagingArray`, flags the `_RowKey` in `editzBulkModifiedTracking`, and re-renders the table to show the green highlights.
- **Data Mutation Handler:**
    - Attaches `onchange` or `oninput` listeners to the table inputs to update `editzBulkStagingArray` locally and flag the `_RowKey` in `editzBulkModifiedTracking`.
- **Commit Pipeline (`commitEditzBulkChanges`):**
    - Filters the staging array to only extract the modified rows.
    - Constructs the necessary JSON payloads mapping back to `colMap`.
    - Executes a concurrent `Promise.all` Supabase `.update()` execution.
    - Upon successful batch update, closes the modal, clears the staging memory, and executes `await loadData(true)` to natively sync the live system.

## User Review Required
> [!IMPORTANT]
> - I have added the **Bulk Action Bar** to handle the Find & Replace feature you requested! 
> - By default, I will treat the editable columns (like cost and quantity) as raw inputs—meaning the system will simply absorb whatever raw numbers you type in without doing local math in the sandbox, exactly like the current EDITZ grid.
> 
> Review the updated plan in the artifact, and type "proceed" if everything looks good so we can start building!

## Verification Plan
### Manual Verification
1. Click "📦 Bulk Edit" to open the fullscreen sandbox.
2. Use the search bar to filter for "Soulz".
3. Use the Bulk Action Bar to target the "Target Column", Find: "Soulz", Replace: "Soulz White", and click Apply.
4. Verify all filtered rows instantly update to "Soulz White" and highlight green.
5. Click "Commit Changes" and verify the edits persist to Supabase.
