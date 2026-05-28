# Implementation Plan - Custom Label Dropdown Categorization

### Design Decisions & Rationale
Custom labels (which have the `is_label: true` attribute) are currently falling through to the `else` case in `populateDropdowns()` because they are neither 3D prints nor sub-assemblies. To fix this, we will explicitly check the `is_label` property during dropdown menu assembly, group them into a dedicated `labelRecipes` array, and render them under a new, distinct `<optgroup label="🏷️ CUSTOM LABELS">` header. We will also expose custom labels under their own group in secondary selectors like `batchProductSelect` and `aliasRecipeSelect` to enable batching and aliasing capabilities for custom labelz.

## Proposed Changes

### Neogleamz Command Center GUI

#### [MODIFY] [index.html](file:///d:/GitHub/neogleamz.github.io/index.html)
- **Modify `populateDropdowns()` (Lines ~5383 - 5428)**:
  - Add `let labelRecipes = [];` to track custom label options.
  - In the iteration loop over `productsDB`, verify `pData.is_label`. If true, set `iconStr` to `pData.label_emoji || '🏷️'` and route it to `labelRecipes.push(htmlStr)`.
  - In `recipesHtml`, append the group: `if(labelRecipes.length > 0) recipesHtml += '<optgroup label="🏷️ CUSTOM LABELS">' + labelRecipes.join('') + '</optgroup>';`
  - In the secondary selector logic:
    - Create `let labelProds = sortedProducts.filter(p => productsDB[p] && productsDB[p].is_label);` to extract all labels.
    - Update `batchProductSelect` innerHTML to append `(labelProds.length ? \`<optgroup label="🏷️ CUSTOM LABELS">\${mapOpts(labelProds, '🏷️')}</optgroup>\` : '')`.
    - Update `aliasRecipeSelect` innerHTML to append `(labelProds.length ? \`<optgroup label="🏷️ CUSTOM LABELS">\${mapOpts(labelProds, '🏷️')}</optgroup>\` : '')`.

## Verification Plan

### Automated Tests
- Execute `npm test` to ensure that our refactored dropdown logic compiles correctly and registers no regressions in the testing suite.

### Manual Verification
- Deploy to `127.0.0.1:5500` using the local development server.
- Navigate to the **MAKERZ** hub tab and verify the **RECIPEZ** dropdown (Component select).
  - Verify that custom labels are grouped under their own **🏷️ CUSTOM LABELS** header with their custom emoji (or a default label tag emoji) rather than being inside **RETAIL PRODUCTS**.
- Verify the **Batch Build** product selector dropdown on **MAKERZ** contains the new **🏷️ CUSTOM LABELS** category.
- Verify the **Alias** selection dropdown on the **STOCKZ** or appropriate pane contains the new **🏷️ CUSTOM LABELS** category.
