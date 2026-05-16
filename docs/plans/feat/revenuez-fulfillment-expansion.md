# Revenuez Fulfillment & Financial Expansion

### Design Decisions & Rationale
We are extracting operational data directly from Shopify via the GraphQL API to secure absolute mathematical fidelity. Relying purely on the `orders/updated` webhook masks true out-of-pocket label costs and forces us to guess transaction fees (e.g., assuming 2.9% + 30c). Instead, our Edge Function will intercept the webhook and execute a secure GraphQL fetch. We will extract the exact `ShippingLabel` cost AND the exact `ShopifyPaymentsBalanceTransaction` (payout/net amount) tied to the order, injecting `tracking_number`, `carrier_name`, `actual_shipping_cost`, and `actual_payout` directly into Supabase.

### UI & Browser Strategy
This feature targets the **Internal Desktop** application (specifically the `Revenuez -> ORDERZ` datagrid). The architecture adheres to pure vanilla HTML/JS ethos. We will append fluid flexbox columns to the existing grid to surface tracking links, exact payout data, and conditionally format cells with native CSS (e.g., highlighting negative margin costs).

## Proposed Changes

### 1. Supabase Schema Migration
#### [NEW] [20260428_revenuez_fulfillment_expansion.sql](file:///d:/GitHub/neogleamz.github.io/supabase/migrations/20260428_revenuez_fulfillment_expansion.sql)
- Append `tracking_number` (VARCHAR).
- Append `carrier_name` (VARCHAR).
- Append `actual_shipping_cost` (NUMERIC DEFAULT 0).
- Append `actual_payout` (NUMERIC DEFAULT 0).

### 2. Edge Function Router & GraphQL Fetch
#### [MODIFY] [index.ts](file:///d:/GitHub/neogleamz.github.io/supabase/functions/shopify-webhook/index.ts)
- Implement `req.headers.get('x-shopify-topic')` routing.
- Securely `fetch()` the Shopify GraphQL API using the `SUPABASE_SHOPIFY_ADMIN_TOKEN`.
- Query the `Order` node for its associated `Fulfillment` (extracting tracking and `ShippingLabel` cost).
- Query the `Order` node for its associated `transactions` to extract the exact `ShopifyPaymentsBalanceTransaction` fee/payout amount.
- Insert the new extracted data into the UPSERT logic for `sales_ledger`.

### 3. Revenuez UI Datagrid
#### [MODIFY] [revenue-module.js](file:///d:/GitHub/neogleamz.github.io/js/modules/revenue-module.js) (or equivalent revenue view file)
- Inject `<div class="grid-cell">` structures for Carrier, Tracking, Label Cost, and Exact Payout.
- Wrap tracking numbers in dynamic `<a>` tags pointing to public carrier tracking URLs.
- Replace the estimated "Fee" calculation with the true Shopify Payout to guarantee 100% accurate Net Profit rendering.

## Open Questions

> [!IMPORTANT]
> **API Authentication:** I will need the proper private Shopify Admin Access Token stored securely in Supabase environment variables so the Edge Function can execute the GraphQL query. Do you already have a Custom App Token (starting with `shpat_...`) we can use, or will we need to generate one?

## Verification Plan

### Automated Sandbox (Zero-Trust Gate)
1. Capture a raw Shopify `fulfillments/create` JSON payload as a mock test file.
2. Initialize a Jest test script to pipe the JSON payload into our Vanilla JS parsing logic to ensure 100% extraction accuracy of the tracking string.
3. Validate the GraphQL queries locally against actual Shopify orders to ensure label costs and payout amounts parse as valid Numeric floats before writing them to the database.
