# Global Column Truncation Standard

This plan addresses the UI issue where resizing grid columns causes text to overlap (as seen with the Source column in the Orderz module). We will establish a global CSS standard for column truncation using the `.trunc-col` class and enforce it across all data grids in the application.

## 🚨 User Review Required
Please review the proposed CSS updates and the specific columns targeted for truncation. If you agree with this approach, type **proceed** in the chat.

## Proposed Changes

### 1. UI & Browser Strategy (CSS Refinement)
We will refine the existing `.trunc-col` class in `index.html` to be more flexible. Currently, it's hardcoded to `max-width: 250px`. We will implement a purely fluid responsive approach.

- **Refining `.trunc-col`:** 
  ```css
  .trunc-col {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 250px; /* Base fallback */
      cursor: pointer;
  }
  
  /* Additional constraint classes for different column types if necessary, or rely on table auto-layout */
  ```
- **Ensuring fluid boundaries:** We will apply `.trunc-col` to any cell containing variable-length string data (like names, SKUs, and sources).

### 2. Application Across Modules (JavaScript)

We will audit and apply the `.trunc-col` class to all relevant `<td >` tags in our module rendering loops.

#### [MODIFY] `orders-module.js`
- Target `order.source` (the specific bug reported)
- Target `order.storefront_sku`
- Target `order.internal_recipe_name`
- Target `order.shipping_city`

#### [MODIFY] `sales-module.js`
- Ensure `Source` column has `.trunc-col` applied (it currently doesn't on line 583).
- Verify `storefront_sku` and `internal_recipe_name` still have it.

#### [MODIFY] `socialz-module.js`
- Apply `.trunc-col` to fields like `influencer name`, `platform`, and `location`. (Currently applied partially).

#### [MODIFY] `inventory-module.js`
- Apply `.trunc-col` to `Item Name` and `Specification` columns.

#### [MODIFY] `bom-module.js`
- Apply `.trunc-col` to `Part Name` and `Spec` columns in both tables.

### 3. Corporate Memory Synchronization

#### [MODIFY] `tools/SK8Lytz_App_Master_Reference.md`
- Inject a new subsection `### UI/UX Standards & Truncation` under the Architecture section.
- Document that any future module generating a data grid MUST wrap text-heavy columns in the `.trunc-col` class to ensure responsive 4-state integrity without breaking flex boundaries.

## Verification Plan
- Reload the UI and navigate to the Orderz tab. Shrink the browser window and confirm the "Source" column now shows `shopify_draft_o...` instead of overlapping the next cell.
- Check Dataz, Recipez, and Socialz grids to ensure consistent behavior.
