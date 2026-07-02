# Implementation Plan — Delete Orphaned `findDynamicShopifyVariant()`

**Branch slug:** `debt/tooling-3`
**Task type:** `chore` (dead-code removal, no app behavior change)
**Scope:** `assets/js/packerz-module.js` ONLY. No other file requires an edit.
**Bucket List source:** `tools/SK8Lytz_Bucket_List.md` § 🧹 Technical Debt → 🟡 Low — Dead Code → `debt/dead-code`: *"`packerz-module.js:213` — `findDynamicShopifyVariant()` has zero callers repo-wide and carries an `eslint-disable-next-line no-unused-vars` suppression masking the fact. Delete the function and its suppression comment."*

## 1. Summary

`findDynamicShopifyVariant(recipeName)` (lines 213–250 of `assets/js/packerz-module.js`) is fully orphaned: `grep -rn "findDynamicShopifyVariant\s*\("` across the repo returns only the function's own definition — zero call sites in any `assets/js/*.js` file, `index.html`, or test file. It was hidden from ESLint's `no-unused-vars` warning by a `// eslint-disable-next-line no-unused-vars` comment directly above it (line 212), plus an explanatory comment above that (line 211) describing a purpose the function never actually serves in the live call graph. This task deletes the function, its disable-comment, and its now-orphaned explanatory comment, and nothing else.

This is a pure subtraction — no new code, no new callers, no behavior change for any user-facing surface.

## 2. Exact Deletion Boundaries — `assets/js/packerz-module.js`

Confirmed by direct `Read` of the live file (lines 180–270 read in full; not assumed from the mapper report alone).

**Current structure (verified line numbers):**
```
201  window.getDeterministic9DigitHash = function(str) {
...
209  };
210  <blank line>
211  // Helper to find an unmapped Shopify-synced variant that dynamically matches the recipe or its mapped aliases
212  // eslint-disable-next-line no-unused-vars
213  function findDynamicShopifyVariant(recipeName) {
214      if (typeof aliasDB === 'undefined' || typeof window.aliasMetadataDB === 'undefined') return null;
...      (body — see full text below)
249      return null;
250  }
251  <blank line>
252  window.getItemBarcodeValue = function(itemName) {
```

**Delete lines 211–251 inclusive** (the explanatory comment, the eslint-disable comment, the entire function body, and the one trailing blank line after its closing `}`). **Keep line 210's blank line** as the sole separator between the end of `window.getDeterministic9DigitHash` (line 209 `};`) and `window.getItemBarcodeValue` (former line 252, becomes new line 211 after deletion). This preserves the file's existing single-blank-line convention between top-level declarations and avoids leaving either a double-blank gap or zero-blank collision.

**Full text to be removed (lines 211–250; a trailing blank line at old-251 is also removed but has no printable content to show):**
```js
// Helper to find an unmapped Shopify-synced variant that dynamically matches the recipe or its mapped aliases
// eslint-disable-next-line no-unused-vars
function findDynamicShopifyVariant(recipeName) {
    if (typeof aliasDB === 'undefined' || typeof window.aliasMetadataDB === 'undefined') return null;
    
    // Find all aliases currently mapped to this recipeName
    const mappedAliases = Object.keys(aliasDB).filter(sku => aliasDB[sku] === recipeName);
    
    // Check all unmapped Shopify-synced variants
    for (const sku of Object.keys(window.aliasMetadataDB)) {
        const meta = window.aliasMetadataDB[sku];
        if (!meta || !meta.is_shopify_synced || aliasDB[sku]) continue; // skip mapped
        
        const cleanSku = sku.toLowerCase();
        
        // 1. Compare with recipeName
        const cleanRecipe = recipeName.toLowerCase();
        const recipeWords = cleanRecipe.split(/[^a-z0-9]/).filter(w => w.length > 2);
        const recipeMatch = cleanSku.includes(cleanRecipe) || 
                            cleanRecipe.includes(cleanSku) ||
                            (recipeWords.length > 0 && recipeWords.every(w => cleanSku.includes(w)));
                            
        if (recipeMatch) {
            return { sku, barcode: meta.barcode_value };
        }
        
        // 2. Compare with any mapped aliases
        for (const alias of mappedAliases) {
            const cleanAlias = alias.toLowerCase();
            const aliasWords = cleanAlias.split(/[^a-z0-9]/).filter(w => w.length > 2);
            const aliasMatch = cleanSku.includes(cleanAlias) || 
                               cleanAlias.includes(cleanSku) ||
                               (aliasWords.length > 0 && aliasWords.every(w => cleanSku.includes(w)));
            if (aliasMatch) {
                return { sku, barcode: meta.barcode_value };
            }
        }
    }
    return null;
}
```

**Implementer note — exact Edit tool usage:** Several lines inside this body (e.g. old lines 215, 218, 223, 225, 232, 236) are blank-but-indented (trailing whitespace only). The reproduction above is a best-effort visual transcription for human review; it must **not** be hand-retyped into an `Edit` call's `old_string`. Per CLAUDE.md's Surgical Edits rule, the implementer must:
1. `Read` `assets/js/packerz-module.js` lines ~195–260 fresh, immediately before editing, to re-confirm no drift since this plan was authored and to capture exact byte-for-byte whitespace.
2. Build the `Edit` tool's `old_string` from that fresh read (the block starting at the `// Helper to find an unmapped...` comment through the blank line after the closing `}`, i.e. old lines 211–251), and `new_string` = `''` (empty).
3. If the exact-match `Edit` fails due to whitespace drift, re-`Read` and retry — do not fall back to a full-file `Write` (blind-overwrite is forbidden by CLAUDE.md).

**Do not touch:**
- Lines 201–209 (`window.getDeterministic9DigitHash`) — the preceding function, unrelated, has live callers (used by `getItemBarcodeValue` fallback per the adjacent test file).
- Lines 252+ (renumbered to 211+ after deletion) — `window.getItemBarcodeValue`, `window.findShopifyVariantForAlias`, and everything after — unrelated, must remain byte-identical.

## 3. Security Considerations

- **Pure deletion — zero new attack surface.** No `innerHTML`, `insertAdjacentHTML`, `document.write`, or any DOM-injection sink exists anywhere in the deleted block; it is pure string/object logic (`.toLowerCase()`, `.split()`, `.includes()`, `Object.keys()`). The `window.safeHTML` / DOMPurify rules in CLAUDE.md's DOM security section do not apply to this diff.
- **No RLS implication.** The function never called Supabase (`supabase.from(...)`, `.select()`, `.insert()`, etc.) — it only read two already-populated in-memory globals. No table, policy, or query is touched.
- **`aliasDB` / `window.aliasMetadataDB` integrity confirmed intact.** Grep of the full file (`assets/js/packerz-module.js`) shows:
  - `window.aliasDB` and `window.aliasMetadataDB` are read (never written/initialized) at lines 214, 217, 220–222 (inside the deleted function) **and independently** at lines 256, 269–270, 282–287, 301, 320–321, 340–345 (inside `getItemBarcodeValue`, `findShopifyVariantForAlias`, and related helpers that are **not** part of this deletion and remain fully functional).
  - The bare (non-`window.`-prefixed) identifier `aliasDB` used at old lines 214/217/222 appears **only** inside the now-deleted function — every other reference in the file correctly uses `window.aliasDB`. This is additional confirmation the function was dead/abandoned code (a stray bare-global reference pattern not used anywhere else), and its removal eliminates that one loose end rather than creating one.
  - Neither global is initialized or mutated by this function or by its deletion — both remain sourced/populated elsewhere (outside this file's scope; not part of this task).

## 4. Vanilla JS Constraints

No new code is written, so no new syntax is introduced. The deletion itself doesn't touch `var`/`let`/`const` usage anywhere else in the file. Confirms compliance by subtraction: removing a `function` declaration and two comment lines cannot introduce a framework dependency, a non-native DOM API, or a non-`navigator.bluetooth` Bluetooth call.

## 5. 4-State UX / UI Mutex / Zero-Refresh

**Not applicable.** `findDynamicShopifyVariant` has zero callers, therefore:
- No Loading/Error/Empty/Success state was ever rendered from its return value — it fed no visible component.
- No button, modal, or DB-mutation call path invokes it — `window.executeWithButtonAction` is irrelevant here.
- No render function (`renderInventoryTable`, `renderSalesTable`, etc.) depends on it — there is nothing to re-invoke after this edit, and nothing to zero-refresh.

Zero UI/DOM impact for end users, confirmed by the mapper's zero-caller grep result.

## 6. Schema Changes

**None.** No Supabase table, column, or RLS policy is touched. No update to `tools/SK8Lytz_App_Master_Reference.md` § Database Schemas is required. (A search of the Master Reference for `findDynamicShopifyVariant` returns zero hits — it was never documented there, so there is also no stale doc entry to retract.)

**Topological integrity note:** CLAUDE.md's Mermaid Architectural Blueprint requirement applies to buttons/modals/UI elements. This function created/destroyed none, so the blueprint in the Master Reference needs no edit for this task.

## 7. Verification Steps

1. **Grep confirms clean removal:**
   ```
   grep -rn "findDynamicShopifyVariant" .
   ```
   Expected: zero hits in any source file (`.js`/`.html`/`.md`). The only pre-edit hits were `tools/SK8Lytz_Bucket_List.md` (the task entry itself — untouched by this plan; the ledger line is closed out separately during `/wind-down`/`/bucketlist`, not by this implementation task) and `assets/js/packerz-module.js` (the definition, now deleted). A possible incidental hit in a generated `coverage/` artifact (if `npm test -- --coverage` was ever run) is acceptable and not a source-code violation — do not attempt to clean generated coverage output as part of this task.
2. **ESLint — confirm no new warnings, confirm the old suppression is simply gone (not surfaced as new):**
   ```
   npx eslint assets/js/packerz-module.js
   npm run lint
   ```
   Expected: the file's warning count for this rule does not increase. Since the entire function (the only thing the disable-comment was suppressing) is deleted along with the comment, there is nothing left for `no-unused-vars` to flag — the warning should simply disappear, not reappear elsewhere. Compare warning counts before/after the edit to confirm no incidental regression in unrelated lines (i.e., confirm the `Edit` didn't accidentally shift/duplicate any surrounding code).
3. **Jest — confirm the existing parity test suite stays green:**
   ```
   npm test -- tests/unified-parity.test.js
   ```
   `tests/unified-parity.test.js` does `require("../assets/js/packerz-module.js")` and exercises `window.getDeterministic9DigitHash` and `window.getItemBarcodeValue` (both **preserved**, untouched by this deletion) against mocked `window.aliasDB` / `window.aliasMetadataDB`. It never references `findDynamicShopifyVariant`. Expected: all existing tests in this file continue to pass with no modification to the test file itself.
4. **Full suite sanity check:** `npm test` (no test file references the deleted function; expect identical pass/fail counts to the pre-edit baseline).
5. **`git diff assets/js/packerz-module.js`** — confirm the diff is exactly a 41-line removal (old lines 211–251) with no other line touched, and that `window.getDeterministic9DigitHash` (above) and `window.getItemBarcodeValue` (below) are byte-identical to their pre-edit state outside of line-number shift.

## 8. Files Touched

- `assets/js/packerz-module.js` — delete lines 211–251 (explanatory comment, `eslint-disable-next-line no-unused-vars` comment, the full `findDynamicShopifyVariant(recipeName)` function body, and its trailing blank line); no other line in this file changes.

No other files are touched by this implementation task. (Separately, and out of scope for this plan: `tools/SK8Lytz_Bucket_List.md` §🧹 Technical Debt gets its `debt/dead-code` line checked off during the normal `/bucketlist`/`/wind-down` ledger-sync flow — per CLAUDE.md's Ledger Exemption, this must NOT be micro-committed as part of the `packerz-module.js` edit itself.)
