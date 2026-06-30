# Implementation Plan: Shopify Exchange Reconciliation (Webhook-Only)

Implement explicit quantity subtraction in the Shopify webhook processing to prevent duplicate quantity/revenue calculations for returns and exchanges.

### Design Decisions & Rationale
*   **Leverage authoritative `refund_line_items` in Webhook:** Instead of estimating returned items from general refund totals, parsing the webhook's `refund_line_items` by `line_item_id` provides exact, row-level returns tracking, avoiding mismatches on orders with different items.
*   **Preserve Historical Records with Qty = 0:** Rather than discarding returned rows completely (which destroys the order log structure), setting their `qty_sold` and `subtotal` to `0` and their `transaction_type` to `'Refunded - Restocked'` keeps the dataset structurally complete while ensuring they don't double-count financial totals.

---

## User Review Required
No breaking database migration changes are required. This change updates the backend logic for the Deno-based Supabase `shopify-webhook` edge function.

---

## Proposed Changes

### Webhook Engine

#### [MODIFY] [index.ts](file:///d:/GitHub/neogleamz.github.io/supabase/functions/shopify-webhook/index.ts)
*   **Extract Refund Mapping:**
    Iterate over `order.refunds` at the start of order parsing. Sum the refunded quantities per `line_item_id` and store them in a temporary map:
    ```typescript
    const refundedLineItems: Record<string, number> = {};
    if (order.refunds) {
        order.refunds.forEach((r: any) => {
            if (r.refund_line_items) {
                r.refund_line_items.forEach((ri: any) => {
                    const liId = String(ri.line_item_id);
                    refundedLineItems[liId] = (refundedLineItems[liId] || 0) + (parseInt(ri.quantity) || 0);
                });
            }
        });
    }
    ```
*   **Calculate Net Quantities:**
    In the `line_items` loop, fetch the item's refunded quantity from the map. Deduct it from the item's original quantity to obtain the true `netQty`:
    ```typescript
    const lineItemId = String(item.id);
    const refundedQty = refundedLineItems[lineItemId] || 0;
    const netQty = Math.max(0, qty - refundedQty);
    ```
*   **Filter/Aggregate Adjustments:**
    Modify the aggregator and row generation:
    - If `netQty === 0`, ensure that the item does not add to the aggregated `qty_sold`, `subtotal`, and `discount_amount` of the row.
    - Set the row's `qty_sold = 0`, `subtotal = 0`, `discount_amount = 0`, `net_profit = 0`, and `transaction_type = 'Refunded - Restocked'` (preserving the row historically without duplicating the financial figures).
    - If `netQty > 0`, use `netQty` to calculate the row's values.

---

## Immediate Data Repair (Order #1041)
We have verified that the original Shopify webhook payload for order `#1041` is stored under `shopify_webhook_logs` with **Event ID: `custom-1782789448880`**.
Once the edge function code is updated and deployed:
1. We will issue a local/live POST request to the `shopify-webhook` endpoint with:
   ```json
   {
     "action": "replay",
     "shopify_event_id": "custom-1782789448880"
   }
   ```
2. This will re-trigger the ingestion pipeline using the new, correct exchange logic and immediately fix order `#1041`'s quantities and net profit calculations in the database.

---

## Verification Plan

### Automated Tests
*   Ensure that existing test suites pass with zero regressions.

### Manual Verification
*   **Webhook Replay Test:** Replay the webhook event for order `#1041` on the development database, verifying that the database record is updated to `qty_sold = 1`, `total = 76.50`, and correct COGS/net calculations.
