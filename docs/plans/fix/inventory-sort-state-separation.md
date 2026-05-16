### Design Decisions & Rationale
Currently, the `DATAZ` and `EDITZ` ledgers inside the STOCKPILEZ module both structurally share a singular global sort configuration object (`currentSort`) and actively mutate the underlying `finalResults` list sequentially. This causes direct sorting state collisions when switching between the tabs. By decoupling them into `currentDatazSort` and `currentEditzSort`, and applying the respective sort to the array array *during* the isolated rendering phase (`renderLedgerView`), we can keep the tabs physically independent and eliminate the layout-sync bug without bloated third-party plugins.

### Target Replacements in `index.html`
1. **Global Variable Declaration**:
    - Replace `let currentSort = window.getSavedSort('currentSort', ...)` with decoupled references:
      ```javascript
      let currentDatazSort = window.getSavedSort('currentDatazSort', { column: 'Order Date', direction: 'desc' });
      let currentEditzSort = window.getSavedSort('currentEditzSort', { column: 'Order Date', direction: 'desc' });
      ```

2. **Sorting Logic Overhaul (`sortData`)**:
    - Update `sortData` to dynamically infer which tab is currently active in the DOM (checking if `panePipeline` or `paneSimple` is flexed).
    - Map the incoming action to mutate either `currentDatazSort` or `currentEditzSort` specifically.
    - Persist the decoupled sort state to `localStorage` immediately.

3. **Render Target Abstraction (`renderLedgerView`)**:
    - `renderLedgerView(isSimple, containerId)` currently checks headers against the global state.
    - It will instead read from `currentEditzSort` if `isSimple` is `true`, otherwise from `currentDatazSort`.
    - Apply the exact array `.sort()` function *inside* `renderLedgerView` prior to drawing the DOM table loop, ensuring the view exactly matches its assigned config state regardless of recent mutations.
