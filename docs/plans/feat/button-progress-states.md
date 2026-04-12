### Design Decisions & Rationale
We are implementing a forced UI repaint delay in the Vanilla JS global `executeWithButtonAction` wrapper to guarantee the browser rendering cycle visually updates button text before locking the main thread for heavy synchronous operations. We are standardizing all isolated async calls (e.g., `executeExport` and `syncAndCalculate`) to utilize this single global wrapper to enforce uniform tactical feedback across the entire application without bringing in heavy state management libraries.

### Planned Modifications

#### 1. Core Platform Repaint Engine (`index.html`)
- Modify `executeWithButtonAction` to inject an `await new Promise(r => setTimeout(r, 50));` micro-delay immediately after styling the button into the "Loading" state. This ensures the browser has time to paint before CPU-intensive Tasks (like Excel parsing) freeze the thread.

#### 2. System Level Toggles (`system-tools-module.js`)
- **`executeExport()`**: Rip out the hardcoded `btn.innerHTML` manipulations and wrap the core Excel generation logic fully inside `executeWithButtonAction('btnExportBackup', '⏳ EXPORTING...', '✅ EXPORTED!', async () => { ... })`.
- **`syncAndCalculate()`**: Wrap the core Supabase API calculation inside `executeWithButtonAction('btnCalc', '🧮 CALCULATING...', '✅ CALCULATED!', async () => { ... })`.
- **`executeRestore()`**: Wrap the `upsert` loop inside `executeWithButtonAction('btnRestoreDB', '⏳ RESTORING...', '✅ RESTORED!', async () => { ... })`.

#### 3. Content Modules (`bom-module.js`, `production-module.js`, `sales-module.js`, etc.)
- Audit standalone save functions (`saveInlineSOP`, `saveBulkAdd`, `saveMasterSOP`, `saveAliasMapping`, `savePackerzSOPToDB`, `saveCeoBundle`) and convert them from manual DOM management to routing through the single `executeWithButtonAction` handler so that if we ever want to modify the tactile styles, we only touch one place.

*Proceed if this architectural upgrade aligns with your expectations.*
