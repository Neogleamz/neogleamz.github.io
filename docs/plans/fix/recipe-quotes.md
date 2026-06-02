# Implementation Plan: Fix Unescaped Quotes in DOM Interpolation

### Design Decisions & Rationale
This implementation plan strictly adheres to the High-Level Architectural Document generated at `docs/architecture/fix-recipe-quotes.md`. The core issue is that our Vanilla JS `data-name` attributes are prematurely terminating when injected with a string containing a double quote (e.g., `Glossy 4" x 6"`). We must manually encode `"` to `&quot;` inside string literals used for DOM interpolation to prevent XSS-style DOM-clobbering and ensure stability. 

## Proposed Changes

### `assets/js/bom-module.js`
- **[MODIFY]** Locate `renderProductList` (approx. line 214). Update the single quote replacement to also handle double quotes.
  - *From:* `let safeName = String(n).replace(/'/g, "\\'");`
  - *To:* `let safeName = String(n).replace(/'/g, "\\'").replace(/"/g, '&quot;');`

### `assets/js/ceo-module.js`
- **[MODIFY]** Locate the `renderCEO` tables (approx. line 556 and 567) where `data-name="${p.name}"` and `data-name="${k}"` are injected. 
  - Wrap these interpolations in a `.replace(/"/g, '&quot;')` call.

### `assets/js/labelz-module.js`
- **[MODIFY]** Ensure any `data-name="${safeName}"` injection (such as lines 156, 163, 801) properly utilizes `.replace(/"/g, '&quot;')` if not already doing so.

## Verification Plan

### Automated Tests
- Run `npm test` and `npx eslint .` to ensure no regression or syntax errors.

### Manual Verification
- Render the application locally (`127.0.0.1:5500`).
- Create a Custom Label named `Glossy 4" x 6"`.
- Open the Recipez (Sub-assemblies) pane.
- Verify that the label correctly appears in the "🏷️ CUSTOM LABELZ" tree.
- Verify clicking it properly triggers `data-app-click="selectProd"`.
