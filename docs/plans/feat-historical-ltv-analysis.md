### Design Decisions & Rationale

We will leverage the pre-existing SHA-256 `customer_email_hash` strings securely stored inside the `sales_ledger` database structure to group individual transactions by unique human identities. This perfectly bypasses all PII exposures while exposing exact repeat-purchase velocity curves dynamically. For the graphical layout, we will deploy a dedicated "Customer LTV & Acquisition" numeric strip natively inside the CEO module above the Waterfall engine to inject exact percentages for Top Line readability.

### Proposed Changes

#### [MODIFY] index.html
- Locate the `<div id="ceoDashWrap">` element in the main GUI.
- Inject two new metric stat-cards sequentially positioned before the graphical analytics canvas blocks:
  1. **Repeat Rate**: The strict percentage `(%)` calculated of returning buyers.
  2. **Average LTV Net**: The raw lifetime profit contribution per unique user hash.

#### [MODIFY] ceo-module.js
- Inject algorithmic loop mechanisms into `calculateCEOMetrics()` that reduce the imported `salesDB` JSON payloads down to uniquely distinct keys mapped to `s.customer_email_hash`.
- Enforce the arithmetic sequence:
  - Phase 1: `Total Unique Indexed Hashes` vs `Total Active Raw Orders`.
  - Phase 2: Compute `Repeat Percentage` (Hashes containing >= 2 mapped records).
  - Phase 3: Compute `LTV per Customer` (Global Net Profit / Total Unique Indexed Hashes).
- Emit and explicitly bind the numeric results securely into the newly injected HTML DOM variables.
