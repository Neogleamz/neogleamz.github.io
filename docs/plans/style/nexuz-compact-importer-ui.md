### Design Decisions & Rationale
To fulfill the request of reducing the vertical footprint of the NEXUZ importer cards, we will migrate their internal layout from a standard vertical block flow into a compact, row-based flexbox architecture. This allows the action buttons to stack tightly on the left (~25-30% width) while reserving the vast majority of the card width for the Engine Trace terminals.

### Proposed Changes

#### [MODIFY] index.html
We will refactor the following 5 primary panels inside the NEXUZ framework:
1. **📦 Orderz Sync**
2. **🚚 Parcelz Sync**
3. **🛍️ Salez Order Sync**
4. **☁️ Backup & Restore**
5. **⚙️ Force Recalculation** *(Will adapt to fit the left/right layout constraint)*

**For each card, the new DOM structure will be:**
1. A top header row using `display: flex; justify-content: space-between; align-items: baseline;` to put the Title on the left and the Description flush right.
2. A main body row using `display: flex; gap: 15px;`.
   - **Left Column:** `flex: 0 0 30%; display: flex; flex-direction: column; gap: 8px;` (Contains the primary import button, the Sandbox mode toggle block, and the config settings button — all scaled down with smaller padding).
   - **Right Column:** `flex: 1; display: flex; flex-direction: column; min-height: 150px;` (Contains the Engine Trace terminal stretching to fill the remaining 70% width and full height).

*Note on SKU Alias Manager: Since it does not use an Engine Trace (it houses an interactive list), we will leave its layout structurally similar but tighten its padding to match the new compact footprint.*

### Open Questions
1. For the new compact buttons on the left, should we drop the text labels to just icons to save even more space, or keep the text but reduce the font size/padding?
2. Currently, the Sandbox block has a dashed border and its own mini-title. Are we keeping this dashed border wrapper in the compact view, or should I simplify it to just the button?
