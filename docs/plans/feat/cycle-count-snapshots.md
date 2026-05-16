# Global Inventory Snapshots (Restore Points)

This feature provides a "System Restore" capability for the Neogleamz inventory engine. It allows the user to capture the entire state of the `inventory_consumption` table (Produced, Sold, Consumed, Scrap, Adjustments) as a named snapshot, enabling safe testing of new features or work orders with the ability to revert to a "Known Good" state.

## Design Decisions & Rationale
- **Global save-state**: To support the user's testing workflow (e.g. "Reset Stock Levels" alternative), we will snapshot the *entire* table state rather than individual items.
- **JSONB Payload**: We will store the entire inventory state as a JSONB array in a single row. This simplifies the "Revert" process to a single `DELETE` and `INSERT` transaction, ensuring atomicity.
- **Named Snapshots**: Users can name snapshots (e.g., "Pre-Layerz-Test-0504") to manage multiple test scenarios.

## Proposed Changes

### Database

#### [NEW] [20260504000000_inventory_snapshots.sql](file:///d:/GitHub/neogleamz.github.io/supabase/migrations/20260504000000_inventory_snapshots.sql)
- Create `inventory_snapshots` table:
    - `id` (uuid, pk)
    - `created_at` (timestamptz, default now())
    - `name` (text)
    - `snapshot_data` (jsonb) - Array of `InventoryConsumptionRow` objects.
    - `created_by` (text)
- Enable RLS and add policies for authenticated users.

### Inventory Module

#### [MODIFY] [inventory-module.js](file:///d:/GitHub/neogleamz.github.io/inventory-module.js)
- Implement `window.createInventorySnapshot(name)`:
    - Fetch all rows from `inventory_consumption`.
    - Save to `inventory_snapshots` with the provided name.
- Implement `window.restoreInventorySnapshot(snapshotId)`:
    - **CRITICAL**: Use a transaction-like approach (Delete all -> Insert snapshot rows).
    - Trigger `window.renderInventoryTable()` and `window.updateCcMngrStock()` post-restoration.
- Implement `window.fetchInventorySnapshots()`:
    - Retrieve metadata (id, name, created_at) for the UI.

### User Interface

#### [MODIFY] [index.html](file:///d:/GitHub/neogleamz.github.io/index.html)
- Add a "📋 Snapshots" button next to the "⚠️ Reset Stock Levels" button in the System Tools area.
- Implement a new `<!-- Snapshot Manager Modal -->`:
    - Display a list of available snapshots with "Revert" and "Delete" buttons.
    - Include a "Create New Snapshot" input field and button.
    - Style with premium "Testing/Debug" aesthetics (e.g., amber/gold borders).

## Verification Plan

### Automated Tests
- Verify that `createInventorySnapshot` correctly captures all 16+ telemetry columns.
- Verify that `restoreInventorySnapshot` completely wipes current state and replaces it with snapshot data.

### Manual Verification
1. Click "Snapshots" -> Create a snapshot named "Baseline".
2. Go to Batchez and run a large Work Order that consumes filament.
3. Verify that stock levels in Inventory have decreased.
4. Click "Snapshots" -> Select "Baseline" -> Click "REVERT".
5. Verify that all stock levels have returned to their exact "Baseline" values.
