### Design Decisions & Rationale
We are refining the CEO Terminal (Simulatorz) to be more space-efficient and fixing a major counting error in the LTV telemetry. 
1. **Vertical Space Compression:** We'll collapse the two separate KPI container rows currently housing 6 cards into a single `grid-template-columns: repeat(6, 1fr)` flex matrix. This drastically reduces the top margin footprint.
2. **Action Prominence:** We'll migrate the "View Cohort Intelligence" button into the standard `.pane-header-actions` section of the `paneSalezCommandz` (SIMULATORZ) parent div, treating it like a system macro rather than an inline widget.
3. **LTV Counting Accuracy:** We'll refactor `_syncCeoKPIs()` in `ceo-module.js` to use a native JS `Set()` to track `s.order_id` per unique cryptographic hash. This prevents multi-item orders from incorrectly spiking the repeat purchase rate.
4. **Modal Data Expansion & Interactivity:** We will add a "Total Buyers" stat block to the modal distribution grid, widen the modal to ensure data isn't crushed, and add `[cursor: pointer]` header sorting logic to the whales leaderboard per system standards.

## User Review Required

Please review the data logic correction: by using `order_id` via a `Set()`, a customer who bought 3 items in a single transaction will correctly be labeled as a 1-time buyer, dramatically correcting the current repeat rate metric. Is this the intended fix?

## Proposed Changes

### UI & Browser Strategy
This is an internal desktop-first dashboard feature. We are strictly utilizing CSS Grid `repeat(6, 1fr)` combined with native Flexbox inside the cards to handle responsiveness gracefully without React. The modal sorting will leverage straightforward Vanilla JS DOM manipulation (Array sorting and element re-rendering) via inline data attributes, conforming exactly to our Vanilla DOM constraints.

---

### `index.html`

#### [MODIFY] `index.html`
- Collapse the two KPI rows inside `#ceo-viewport` into a single `<div class="ceo-kpi-row" style="display: grid; grid-template-columns: repeat(6, 1fr); gap: 10px; flex-shrink: 0;">`.
- Remove the inline action block `<div style="margin-top: 15px; width: 100%;">... <button class="btn-orange-neon"... View Cohort Intelligence ...></div>`.
- Insert the "View Cohort Intelligence" button into the DOM hierarchy at `.pane-header-bar` specifically inside `#paneSalezCommandz`.
- Adjust the `#ltv-metrics-modal` grid structure to be `grid-template-columns: repeat(4, 1fr);` to accommodate the new "Total Buyers" widget alongside 1-Time, 2-Time, and 3+ Time.
- Expand `<div style="width: 95%; max-width: 800px; ...">` to `max-width: 1000px` for better readability.
- Add standard sortable headers (`data-ltvsort` attributes) to the Whale Leaderboard `<th>` tags.

---

### `ceo-module.js`

#### [MODIFY] `ceo-module.js`
- **Bug Fix:** In `_syncCeoKPIs`, replace the direct increment `window._ltvCustomerMap[h].orders += 1;` with a unique order ID tracker (`let idSet = map[h]._orderIds; if(!idSet.has(order_id)) { map[h].orders++; idSet.add(order_id); }`).
- **Feature Add - Total Buyers:** Calculate `totalUniqueHashes` and inject it into the new DOM ID `ltv-dist-total`.
- **Interactivity:** Introduce global sort variables `ltvSortKey` and `ltvSortAsc`. Add a `sortLtvTable()` function that re-sorts the `whales` array when a header is clicked, and inject an event delegation listener for the modal headers to re-render the `ltv-whales-tbody`.

---

### `@/tools/SK8Lytz_App_Master_Reference.md`

#### [MODIFY] `SK8Lytz_App_Master_Reference.md`
- Append the new standard Modal grid pattern, explicitly noting the requirement to have a top-right flex close button and interactive `[data-sort]` headers for complex table overlays, to act as the canonical template for future agents.

## Open Questions
- Should the "View Cohort Intelligence" button use a specific icon from FontAwesome beside `fa-users-viewfinder` now that it is in the top right? 
- Should the modal table default to sorting by Net Profit rather than Order Frequency?

## Verification Plan
### Automated Tests
- No Jest modules directly cover complex UI grid rendering. I will verify standard DOM compatibility manually by observing logs.
- I will verify the math validation by manually running a `.filter()` to simulate the multi-item array and assuring `orders` remains at 1 per transaction.

### Manual Verification
- Will rely on the user or the `isolated_test_and_verify` workflow to view the visual layout compression and confirm that the Repeat Customer Rate drops dramatically because the system no longer counts identical line items as separate purchases.
