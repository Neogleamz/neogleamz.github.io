# Project Structure Cleanup & Organization

Provide a clean, structured repository layout by establishing designated directories for specific file types, eliminating root-level clutter.

## Design Decisions & Rationale
We are adhering to standard Vanilla JS architectural patterns by grouping application logic into `assets/js/` and visual assets into `assets/images/`. Temporary or legacy exports and dumps are safely isolated in `.gitignore` protected directories to prevent repository bloat, while leaving configuration files (e.g., `package.json`, `.eslintrc.json`) in the root where development tools expect them.

## Proposed Changes

### Configuration Updates
#### [MODIFY] [`.gitignore`](file:///d:/GitHub/neogleamz.github.io/.gitignore)
- Append `data/exports/` and `supabase/dumps/` to prevent tracking these operational files.

### File Relocations & Cleanups
- **Linting Artifacts:**
  - `[DELETE] eslint-errors.json`
  - `[DELETE] eslint-errors.txt`
  - `[DELETE] eslint.config.mjs`
- **Data Exports:**
  - `[NEW] data/exports/`
  - Move `Shopify TOTAL SALES.xml`, `charges_export.csv`, and `orders_export_1.csv` here.
- **Database Dumps:**
  - `[NEW] supabase/dumps/`
  - Move `dump.sql` and `schema_dump.sql` here.
- **Type Definitions:**
  - `[NEW] types/`
  - Move `types.ts` to `types/types.ts`.
- **Assets:**
  - `[NEW] assets/images/`
  - Move `neo_logo_orange.png` and `neo_logo_white.png` here.
  - `[NEW] assets/js/`
  - Move all 19 application `.js` files here.

### Application Wiring
#### [MODIFY] [`index.html`](file:///d:/GitHub/neogleamz.github.io/index.html)
- Update all `<script src="...">` tags to point to the new `assets/js/...` relative paths.
- Update all `neo_logo_` CSS background definitions and `<img>` source attributes to point to the new `assets/images/...` paths.

## Verification Plan

### Automated Tests
- Run `npm test` and `npx eslint .` to ensure JavaScript pathways remain correctly resolved for the testing/linting suites.
- Launch the application on the local port and verify zero 404 errors in the browser console for scripts and images.
