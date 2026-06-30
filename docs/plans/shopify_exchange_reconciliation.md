# Implementation Plan: Shopify Exchange Reconciliation

Implement explicit quantity subtraction and fulfillment status checks during Shopify CSV imports and webhook processing to prevent duplicate quantity/revenue calculations for returns and exchanges.

## User Review Required
No breaking database migration changes are required. This change updates the backend and frontend application logic for ingesting Shopify order payloads.

---

## Proposed Changes

### Webhook Engine

#### [MODIFY] [index.ts](file:///d:/GitHub/neogleamz.github.io/supabase/functions/shopify-webhook/index.ts)
*   **Extract Refund Mapping:**
    Iterate over `order.refunds` at the start of order parsing. Sum the refunded quantities per `line_item_id` and store them in a temporary map.
*   **Calculate Net Quantities:**
    In the `line_items` loop, fetch the item's refunded quantity from the map. Deduct it from the item's original quantity to obtain the true `netQty`.
*   **Filter/Aggregate Adjustments:**
    If `netQty === 0`, ensure that the item does not add to the aggregated `qty_sold`, `subtotal`, and `discount_amount` of the row. Set the row's `qty_sold = 0` and `transaction_type = 'Refunded - Restocked'` (preserving the row historically without duplicating the financial figures).

---

### CSV Import Engine

#### [MODIFY] [sales-module.js](file:///d:/GitHub/neogleamz.github.io/assets/js/sales-module.js)
*   **Evaluate Lineitem Fulfillment Status:**
    In the `processParsedSales` iteration, inspect `r['Lineitem fulfillment status']`.
*   **Zero Out Restocked Items:**
    If the status is `'restocked'`, `'refunded'`, or `'cancelled'`, treat the net quantity for this row as `0`.
*   **Classify Transaction Type:**
    Mark these rows with `transaction_type = 'Refunded - Restocked'` to reflect their return status cleanly.

---

## Verification Plan

### Automated Tests
*   Ensure that existing test suites pass with zero regressions.

### Manual Verification
*   **Dry Run Import Test:** Upload a test CSV containing order `#1041` with both rows, and verify that the Sandbox sync modal displays a single unit of `SK8Lytz HALOZ` and a subtotal of `$76.50` instead of `$153.00`.
*   **Webhook Replay Test:** Replay the webhook event for order `#1041` on the development database, verifying that the database record is updated to `qty_sold = 1`, `total = 76.50`, and correct COGS/net calculations.
