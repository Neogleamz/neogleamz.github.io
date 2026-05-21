# Legacy Audit: `analytics-module.js` (Vanilla JS Enforcement)

### Design Decisions & Rationale
During my initial scan of `analytics-module.js`, I discovered that the critical security parameters (DOM `innerHTML` wrappers and `data-click` event delegators) are **already fully compliant**. There are zero legacy `onmouseover` or `onclick` handlers, and the single string-templated `innerHTML` injection is already secured by the `window.safeHTML()` protocol! 

Because the module is structurally secure, I will utilize this audit branch to enforce the **Boy Scout Mandate**. I will target and eradicate the massive blocks of compressed, unreadable code (specifically the single-line table sorting algorithm and table header generation), expanding them into properly formatted Vanilla JS structures. I will also inject missing JSDoc documentation for the core rendering functions to improve long-term maintainability.

> [!NOTE]
> **Minimal Risk Surface**
> Since we are not touching the Supabase queries, charting algorithms, or `data-click` bindings, there is essentially zero risk of regressions. This is purely a code hygiene pass.

## Proposed Changes

### `assets/js/analytics-module.js`
- **[MODIFY]** Verify and confirm zero-trust DOM insertion loops.
- **[MODIFY]** Refactor Line 229: Explode the massive single-line string template (`let ths = <th class...`) into clean, multi-line backticks.
- **[MODIFY]** Refactor Line 251: Decompress the deeply nested, unreadable one-line array sorting algorithm (`a.sort((x,y) => { let u...`) into a proper multi-line structural function.
- **[MODIFY]** Boy Scout Mandate: Add formal `@param` and `@returns` JSDoc blocks to `renderWaterfallChart`, `renderExpenseDoughnut`, `renderTrendsChart`, and `renderProfitabilityMatrix`.

## Verification Plan

### Manual Verification Actions (To Test)
Because this is purely a code formatting and documentation sweep, testing is extremely straightforward. Once merged, open the local instance (`127.0.0.1:5500`):
1. Navigate to the **Profitability Dashboard** (Analytics).
2. Ensure the 3 charts (Waterfall, Expense Doughnut, Trends) still render correctly.
3. Scroll down to the Matrix Table and click the column headers (e.g., `Live MSRP`, `Actual Net Profit`) to verify the newly decompressed sorting algorithm still accurately sorts ascending and descending!
