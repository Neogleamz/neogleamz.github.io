### Design Decisions & Rationale
To ensure absolute Vanilla JS browser performance, I am utilizing a synchronous memory filtering approach identical to the bulk edit UI. Instead of creating expensive DOM nodes and toggling `display: none` (which causes heavy browser reflows on typing), the search query interacts directly with the `inventoryDB` raw objects during the virtual `a.filter()` mapping loop, rebuilding only the exact row subset needed natively via `innerHTML`. This eliminates memory leaks and keeps typing entirely lag-free.

### UI & Browser Strategy
**Environment:** Internal Desktop Business Tool (STOCKPILEZ / DATAZ). 
**Strategy:** We will inject a wide-aspect search bar spanning the top of the hybrid `stockz-split-container` (which holds both the FGI logic and the RAW Goods ledger). This acts as a global namespace filter, typing once seamlessly repaints both tables instantly using our established fluid layout spacing (8px/12px internal metrics) and current `var(--bg-input)` CSS token design. 

---

## Proposed Changes

### `index.html`
**[MODIFY]** `index.html`  
- Inject the unified `<input id="inventorySearch">` bar directly above `id="fgiTableWrap"` inside the primary `.table-container` block.
- Bind the input's `onkeyup` event to synchronously fire both `renderInventoryTable()` and `renderFgiTable()` simultaneously. 

### `inventory-module.js`
**[MODIFY]** `inventory-module.js`  
- Inside `renderInventoryTable()`, parse the input from `document.getElementById('inventorySearch')`.
- Chain a `.filter()` onto the mapped ledger array (`a`), performing `.toLowerCase().includes()` comparisons across `Neogleamz Name`, `Item Name`, and `Item Key` before passing the subset to the `sort()` function.
- Reproduce this exact filter check inside `renderFgiTable()` to filter the finished goods side simultaneously.
