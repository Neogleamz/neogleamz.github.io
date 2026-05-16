# Universal Live Staging DB Diff Highlighting

The objective has been expanded to support ALL importers across the system (Superbuy Orderz, Superbuy Parcelz, Shopify Orderz, Shopify Billing). We will architect a universal asynchronous differential engine that intercepts payloads directly inside the global `openSandboxModal` pipeline. This ensures that any array mapped to the Sandbox will automatically cross-reference existing database records and visually flag numeric or string discrepancies in real-time.

Furthermore, we will inject the required table definitions into **both** the "Test Mode" Sandbox intercepts and "Live" Production intercepts, ensuring visual diff highlighting is universally visible whether the user is running a dry run or staging an actual database push.

## Design Decisions & Rationale
Per the Master Reference and **Strict Mathematical Unification Mandate**, absolutely zero mathematical comparisons or floating point tolerance logic will exist in the UI modules. We will construct `window.applyDifferentialHighlighting()` directly inside `neogleamz-engine.js`. The UI module `system-tools-module.js` (`openSandboxModal`) will simply await this centralized engine to mutate the DOM matrix, preserving 100% architectural integrity.

## Proposed Changes

### 1. Centralized Forensic Diff Engine (`neogleamz-engine.js`)
We will create a globally bound function `window.applyDifferentialHighlighting(payload, table, conflictStr)` inside the master engine file.
- **Key Resolution**: Automatically infer primary keys based on the target table (e.g., `sales_ledger` defaults to `order_id` & `storefront_sku`, `raw_parcel_items` to `parcel_no` & `di_item_id`).
- **Chunked DB Fetch**: Extract all primary key values from the incoming payload, chunk them into arrays of 100, and securely fetch the current live records from Supabase via an `.in()` query.
- **Mathematical Parity Algorithm**: Compare all intersecting keys using a strict `0.001` float tolerance threshold to prevent ghost flags on backend rounding structures. If a difference is found, log the live `old_value` to `sim._diffs`.

### 2. Async Modal Interception (`system-tools-module.js`)
We will upgrade `window.openSandboxModal` to an `async` function.
- It will accept `importMeta` regardless of whether it is Test Mode or Production Mode.
- Before triggering `_renderSandboxModal`, it will await `window.applyDifferentialHighlighting` from the Neogleamz Engine.
- Update the Sandbox Sync Button to momentarily display "⏳ CALCULATING DIFFS..." to provide user feedback during the network fetch.
- Modify `_renderSandboxModal` to read `row._diffs[c]`. If a diff exists, cast a strict red boundary on the cell (`color:#ef4444; background:rgba(239,68,68,0.15); border: 1px dashed rgba(239,68,68,0.5);`), inject a `⚠️ ` icon, and rewrite the native tooltip to explicitly display: `[EXISTING DB] ${old_val} | [IMPORTED CSV] ${new_val}`.

### 3. Syntax Upgrades Across Importers
We will pass the table context even during "Test Mode" so the engine knows which tables to query against.

#### [MODIFY] [system-tools-module.js]
- Upgrade `window.openSandboxModal` to await the diffs.
- Modify `_renderSandboxModal` table cell generation loop to apply the differential CSS bounds.
- Modify `runFileImport` Test Mode blocks to pass `liveImportMeta: { resObj: resObj }`.
- Modify `change_handleShopifyBillingUpload` Test Mode block to pass table context.

#### [MODIFY] [sales-module.js]
- Modify `processSalesCSV` Test Mode block to pass table context `{ resObj: { table: 'sales_ledger' } }` into `openSandboxModal`.

## User Review Required

> [!IMPORTANT]
> The engine is successfully migrated to `neogleamz-engine.js` to ensure the Unification Mandate is upheld! Do you approve this final approach to proceed with code generation?

## Verification Plan
1. Parse Shopify Orders CSV in Test Mode; verify diff highlights appear.
2. Parse Shopify Orders CSV in Production Mode; verify diff highlights still appear.
3. Parse Superbuy Orderz CSV and confirm the Sandbox handles the async diff processing perfectly.
