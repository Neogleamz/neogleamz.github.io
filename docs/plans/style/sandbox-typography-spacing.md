### Design Decisions & Rationale
We are refining the Net Profit Sandbox Engine's visual hierarchy strictly utilizing native inline CSS styling and Vanilla JS rendering. To maximize usable vertical screen space for the interactive sandbox, the modal header padding and font scales are reduced, while the critical financial numbers across the Database Snapshot and CSV literal rows are unified to a highly readable `14px` monospace size, directly within the `sales-module.js` DOM injection pipeline.

## Proposed Changes

### 1. Header Layout Refactor (index.html)
Shrink the vertical footprint of the main Sandbox header to reclaim screen space.

#### [MODIFY] index.html
- **Header Padding**: Reduce outer padding from `1.5rem` to `0.75rem 1rem`.
- **Icon Block**: Reduce padding from `1rem` to `0.5rem 0.75rem`.
- **Typography**: Scale down the primary title from `24px` to `18px`.
- **Controls**: Adjust the top padding/margin slightly to maintain vertical alignment within the compressed bar.

### 2. Uniform Numeric Typography (sales-module.js)
Increase the font size of the raw numbers in the mathematical rows so they pop and are easier to parse visually, while leaving the descriptive labels small.

#### [MODIFY] sales-module.js
- **Row 1 (Raw Database Snapshot)**: Inject `font-size: 14px;` directly into the `<span>` tags wrapping the rendered `$${rawXYZ}` variables.
- **Row 2 (Raw CSV Data)**: Inject `font-size: 14px;` into the nested ID-bound `<span>` tags (e.g., `sim-total-raw-${i}`) to standardize sizing across the metric display.

## Verification Plan

### Automated Tests
- Run `npm test` and `npx eslint .` to ensure zero syntax regressions.

### Manual Verification
- Open the Sandbox Engine modal, verify the header occupies significantly less vertical space.
- Load an order into the sandbox and confirm that the numeric values in the top two rows (Snapshot and CSV) render uniformly at `14px`, drastically improving readability without breaking the flex/grid layouts.
