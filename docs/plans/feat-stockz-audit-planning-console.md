# Stockz Bulletproof Audit & Planning Console

Implement a robust, state-of-the-art **Inventory Audit & Supply Chain Planning Console** modal inside the **STOCKZ** hub. This replaces inline cell modifications on critical operational columns with a secure, form-assisted console. 

It includes three unified drawers/tabs: **Physical Audit** (reconciling expected vs. physical counts with asset valuation impact logs), **Supply Chain Planning** (real-time ROP mathematical simulator), and a **Mobile Haptic Portal** (letting operators perform the shelf count hand-held via phone camera scans with real-time websocket sync).

## Design Decisions & Rationale

> [!NOTE]
> ### Design Decisions & Rationale
> - **Zero-Mental-Math Audit Mode**: By requiring operators to input the absolute physical count rather than the calculated offset, we completely eliminate operator arithmetic error—calculating the delta (`Offset = Counted - Expected`) and log impact purely inside the native database transaction engine.
> - **Forensic Valuation Accounting**: Capturing average cost and valuation impact inside a new `inventory_adjustments_log` table gives stakeholders a pristine history of write-offs/write-ins for tax and bookkeeping.
> - **Unified Drawer UI**: Standardizing all planning and count controls under a clean 3-tab glassmorphism modal console (pre-focused based on which table cell is clicked) dramatically improves the DTC cockpit experience.

## Proposed Changes

### Database Migration

---

#### [NEW] [20260531000000_inventory_adjustments_log.sql](file:///d:/GitHub/neogleamz.github.io/supabase/migrations/20260531000000_inventory_adjustments_log.sql)

1. **Create Adjustment Log Table:**
   Establish the transaction logging schema with strict reference keys:
   ```sql
   CREATE TABLE IF NOT EXISTS inventory_adjustments_log (
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       item_key TEXT NOT NULL,
       operator_id UUID,
       operator_email TEXT,
       previous_stock NUMERIC(12,2) NOT NULL,
       counted_stock NUMERIC(12,2) NOT NULL,
       delta NUMERIC(12,2) NOT NULL,
       avg_unit_cost NUMERIC(12,2) NOT NULL,
       valuation_impact NUMERIC(12,2) NOT NULL,
       reason_code TEXT NOT NULL,
       notes TEXT,
       created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
   );
   
   -- Enable RLS Policies
   ALTER TABLE inventory_adjustments_log ENABLE ROW LEVEL SECURITY;
   CREATE POLICY "Allow authenticated read and insert" ON inventory_adjustments_log FOR ALL TO authenticated USING (true) WITH CHECK (true);
   ```

### UI and Grid Standardization

---

#### [MODIFY] [inventory-module.js](file:///d:/GitHub/neogleamz.github.io/assets/js/inventory-module.js)

1. **Lock Down Grid Columns (Audit Compliance):**
   - Strip `contenteditable="true"` and the `.editable` class from `consumed_qty`, `prototype_consumed_qty`, `production_consumed_qty`, `scrap_qty`, and `stock` cells in the Raw Materials grid (`renderRawInventoryTable`).
   - Strip them similarly from Finished Goods categories (`renderFgiTable`).
   - Add a new gear/tool button (`🛠️ Audit`) at the end of each row.

2. **Establish the Audit & Planning Console Modal Markup:**
   - Inject the glassmorphism modal HTML skeleton dynamically (or statically in `index.html`).
   - Build a 3-tab navigation panel:
     - **Tab 1: Physical Audit**: Displays Expected Stock. Provides a "Physical Count" numeric input. Shows live delta (`Offset = Counted - Expected`) and Valuation Impact (`delta * cost`). Includes Reason Code select ("Periodic Count", "Damage", "Theft", "Supplier Overfill") and a notes textarea.
     - **Tab 2: Supply Chain Planning**: Configures `Min Stock` (Safety Stock) and `Lead Time Days`. Renders a live **ROP Simulator** showing the formula $\text{ROP} = (\text{Velocity} \times \text{Lead Time}) + 10\% \text{ Safety}$ with an interactive warning preview.
     - **Tab 3: Handheld Mobile Audit Portal**: Generates a dynamic QR code pre-authenticating the operator's session and pointing to `/tools/remote-scanner.html` for hand-held shelf counting.

3. **Wire Event Delegators:**
   - Map double-clicking / clicking `ADJMT`, `MIN`, or `LEAD` cells, or clicking the `🛠️ Audit` button, to open the modal and automatically activate the corresponding tab.
   - Wire the save execution: calculate transaction payload, insert to `inventory_adjustments_log` via Supabase, increment `manual_adjustment` inside `inventory_consumption`, and trigger a real-time grid redraw.

---

## Verification Plan

### Automated Tests
- Run `npm test` to verify math engine and calculation fidelity.
- Run `npx eslint .` to check for warning-free code compliance.

### Manual Verification
1. Launch the local dev server.
2. Navigate to the **STOCKZ** tab.
3. Click the `🛠️ Audit` gear next to any Raw Material (e.g. Filament).
4. Perform an audit:
   - expected stock is 15. Type physical count `17`.
   - Verify the calculated offset matches `+2.00` and displays the correct dollar valuation impact.
   - Select "Periodic Audit" and hit "Record Audit".
5. Verify the main grid redraws instantly, updating the adjustment column to reflect the audit, and updates the final stock tally.
6. Open the modal again, go to the **Planning Config** tab, and drag/adjust the Lead Time slider. Verify that the ROP threshold dynamically recalculates.
