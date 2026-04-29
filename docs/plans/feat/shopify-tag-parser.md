# Shopify Tag Parser Implementation Plan

## Goal Description
Develop a forward-looking Webhook/Sync module inside the existing Supabase Edge Function (`shopify-webhook`) to automatically extract "Transaction Type" and "Actual Shipping Cost" directly from Shopify Order Tags. This eliminates the need for manual CSV imports for future orders by securely reading tags applied by the user in the Shopify Admin.

### Design Decisions & Rationale
We are natively extending the `orders/updated` and `orders/create` payload mapping within `index.ts`. By parsing `order.tags` using Case-Insensitive Regular Expressions (Regex), we can gracefully override the system's estimated transaction type (`tType`) and default shipping cost. This ensures the A.I. CFO terminal calculates exact Net Profit identically to the CSV importer, but completely autonomously.

> [!IMPORTANT]
> ## User Review Required
> Please review the proposed tag formatting syntax below. By default, the system will look for tags exactly matching these patterns (spaces optional):
> - **Shipping Cost:** `Cost: 4.55` or `Label: $4.55`
> - **Transaction Type:** `Type: Warranty` or `Type: Pre-Ship Exchange`

## Open Questions

> [!WARNING]
> 1. Do these tag prefixes (`Cost:` and `Type:`) align with your current operational workflow in Shopify? 
> 2. Will you be manually applying these tags before the order is fulfilled, or using Shopify Flow to auto-tag them? (If using Flow, the `orders/updated` webhook will naturally catch them).

## Proposed Changes

---

### Supabase Edge Function: `shopify-webhook`

We will modify the core data extraction matrix in the Edge Function to intercept and parse the tags string.

#### [MODIFY] [index.ts](file:///d:/GitHub/neogleamz.github.io/supabase/functions/shopify-webhook/index.ts)
1. **Tag Parsing Logic:** Inject regex extraction directly after `order.tags` is pulled from the payload.
   ```javascript
   const tagsStr = String(order.tags || "");
   
   // Extract Cost (e.g. "Cost: 4.55" or "Label: $5.00")
   let tagShippingCost = 0;
   const costMatch = tagsStr.match(/(?:Cost|Label):\s*\$?(\d+(?:\.\d{2})?)/i);
   if (costMatch && costMatch[1]) {
       tagShippingCost = parseFloat(costMatch[1]);
   }

   // Extract Type (e.g. "Type: Warranty")
   let tagTransactionType = null;
   const typeMatch = tagsStr.match(/Type:\s*([A-Za-z\-\s]+)(?:,|$)/i);
   if (typeMatch && typeMatch[1]) {
       tagTransactionType = typeMatch[1].trim();
   }
   ```
2. **Override Defaults:** Downstream in the `line_items` iteration, we will dynamically override `tType` and `rowActualShippingCost` if the tags produced valid matches.
3. **Net Profit Integrity:** The existing `net_profit` calculation naturally subtracts `rowActualShippingCost`. By passing the extracted tag cost into this variable, the True Net Profit equation seamlessly inherits the exact margin math.

## Verification Plan

### Automated Tests
- Ensure `npx eslint .` passes cleanly on the TypeScript modifications.
- Deploy the updated function locally using `supabase functions serve` or push to production for live testing.

### Manual Verification
- We will simulate a Shopify Webhook payload locally containing `tags: "Type: Warranty, Cost: $8.50"`.
- We will verify the `sales_ledger` receives an exact `actual_shipping_cost` of `8.50` and `transaction_type` of `Warranty`.
