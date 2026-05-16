# Actual Net Modal Implementation

This plan outlines the integration of the "Actual Net" feature into the `ORDERZ` hub (specifically `paneSalezBridge`).

## 🧠 Design Decisions & Rationale
We will leverage the pre-calculated metrics inside `window.processedSalesDB` to derive per-order aggregates dynamically without requiring redundant heavy engine computation. A dedicated Vanilla HTML Modal (`actual-net-modal`) will be constructed using our fluid Flexbox/Grid architectures, natively equipped with live-search input bindings, column sorting memory (`window._netSortKey`), and collapsible line-item sub-tables natively toggled via class lists (`.classList.toggle('expanded')`), strictly adhering to the DOM security protocol by binding events dynamically post-render.

## 🔴 User Review Required
No major architectural collisions expected. The `actualNetModal` will follow the exact `modal-overlay` formatting defined in the Master Reference.

## 🟢 Proposed Changes

---

### `index.html`
#### [MODIFY] index.html
1. Inject the **"ACTUAL NET"** button (`.btn-blue-neon`) into the `.pane-header-bar` of `paneSalezBridge`.
2. Construct the **`actual-net-modal`** DOM structure at the bottom of the file alongside the other `.modal-overlay` elements.
   - Requires a search input (`#actualNetSearch`).
   - Requires a header grid for sorting (Order ID, Date, Gross, COGS, Shipping, Taxes, Fees, Net).
   - Requires a container for rows (`#actualNetContainer`).

---

### `sales-module.js`
#### [MODIFY] sales-module.js
1. **Modal Controller Functions:**
   - `openActualNetModal()`: Gathers `window.processedSalesDB`, groups by `order_id`, and calculates per-order totals using idempotency rules.
   - `closeActualNetModal()`: Clears memory and closes the modal.
2. **Rendering Engine:**
   - `renderActualNetList()`: Builds the HTML strings for the parent order rows and the hidden nested line-item rows.
   - Post-injection execution to safely attach `onclick` listeners to the expandable parent rows to reveal the child arrays.
3. **Sorting & Filtering:**
   - Implement `actualNetSort(column)` and a global isolated sort key state.
   - Map `actualNetSearch` oninput to filter the grouped array locally.

---

### `system-event-delegator.js`
#### [MODIFY] system-event-delegator.js
1. Map `data-click="click_openActualNetModal"` to `openActualNetModal()`.
2. Map `data-click="click_closeActualNetModal"` to `closeActualNetModal()`.

## 🔬 Verification Plan
- **Automated tests:** Ensure `npm test` still passes.
- **Manual Verification:** Open the Actual Net modal, verify that the per-order totals match the sum of line items from the Orderz grid. Test search, sorting, and expand/collapse interactions.
