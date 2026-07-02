# RECIPEZ Sidebar Live-Filter Search — Implementation Plan

**Branch:** `feat/recipez-search-filter` → base `main`
**Feature:** Live-filter search box in the RECIPEZ sidebar (MAKERZ hub → `paneProdBuilder`). Case-insensitive substring match against recipe names, applied on every keystroke, across all four recipe categories (RETAIL, SUB-ASSEMBLIES, 3D PRINTS, CUSTOM LABELZ) simultaneously. Pure client-side filter — no Supabase writes.

---

## ⚠️ Correction to declared touch files

The ledger entry declares `index.html` + `assets/js/production-module.js`. Direct inspection shows this is **incomplete/incorrect** — I'm citing proof instead of guessing:

- `productListUI` (the RECIPEZ sidebar `<ul>`) does **not** appear anywhere in `assets/js/production-module.js` (grep returns zero matches). `production-module.js` L1–40 confirms its actual scope is SOP/media/routing/work-order logic — unrelated to the recipe list.
- The real render function, `window.renderProductList`, lives in **`assets/js/bom-module.js`** (L211–352), and it is the function that builds `#productListUI`'s `<li>` items (L224, L350).
- Wiring a new `data-input` token requires an edit to **`assets/js/system-event-delegator.js`** (the global `input` listener switch, L1962–2017), which is a third file not in the original declared list.

The corrected, actual file set is: `index.html`, `assets/js/bom-module.js`, `assets/js/system-event-delegator.js` (+ `tools/SK8Lytz_App_Master_Reference.md` for the mandatory topological-integrity update — see below). See `## Files Touched`.

This is a confident correction based on direct grep/read evidence (cited above), not a blocking ambiguity — proceeding without a halt.

---

## 1. Exact insertion point — search `<input>` markup

**File:** `index.html`, inside `#recipezSidebar` (`.bom-sidebar`), L2126–2132:

```html
2126:                <div id="recipezSidebar" class="bom-sidebar">
2127:                    <div style="display:flex; gap:8px; margin-bottom: 8px; flex-shrink:0;">
2128:                        <button class="btn-green-neon" data-click="click_window_showRecipeModal_create" style="flex:1; padding:8px; font-size:13px;">+ Create</button>
2129:                        <button class="btn-orange" data-click="click_window_openRecipeManager" style="flex:1; padding:8px; font-size:13px;">🛠️ Manager</button>
2130:                    </div>
2131:                    <ul class="product-list" id="productListUI"></ul>
2132:                </div>
```

**Insert immediately after L2130 (`</div>`), before L2131 (`<ul ...>`):**

```html
<input type="text" id="recipeSearchInput" data-input="input_window_filterRecipeList"
    placeholder="🔍 Search recipes..." autocomplete="off"
    style="width:100%; border:1px solid var(--border-input); border-radius:4px; padding:8px; background:var(--bg-input); color:var(--text-color); margin-bottom:8px; flex-shrink:0; box-sizing:border-box;">
```

This mirrors the established sidebar-search precedent (`#rawInvSearch`, index.html L2067) almost exactly (same border/padding/bg/color tokens, 8px = 8-point grid), and matches the button row's own `margin-bottom:8px; flex-shrink:0` so it doesn't get squeezed by the scrolling `<ul>` below it.

**Insert immediately after L2131 (`</ul>` close), before L2132 (`</div>` closing `#recipezSidebar`):**

```html
<div id="recipeSearchEmptyState" style="display:none; padding:16px 8px; color:var(--text-muted); text-align:center; font-style:italic; font-size:13px; flex-shrink:0;">No recipes found matching search.</div>
```

Wording matches existing empty-state copy precedent (`assets/js/barcodz-module.js` L110: *"No labels found matching search."*, `assets/js/labelz-module.js` L961 / `assets/js/sales-module.js` L1904: *"No results found."*).

**Why this placement is XSS-safe by construction and needs no `window.safeHTML` at all:** both new elements are 100% static, hand-authored HTML literals baked into `index.html`. Neither is ever assigned via `.innerHTML`/`insertAdjacentHTML` at runtime — the filter logic (below) only ever toggles `.style.display` on them via plain DOM APIs. Zero new dynamic-HTML surface is introduced.

**Why placement matters for focus preservation:** per Master Reference §14.A ("Focus-Loss Mitigation on Dynamic innerHTML Overwrites", L801–806), any input the user types into must sit **physically outside** the container that gets its `innerHTML` rewritten (`#productListUI` is rewritten wholesale by `renderProductList()` at bom-module.js L350). Both new elements are outside `<ul id="productListUI">`, so the search input's caret/focus is never destroyed by a list re-render — exactly the same pattern already used for `#rawInvSearch` relative to `#invTableWrap`.

---

## 2. Filter mechanism — toggle `display`, not innerHTML rewrite

**Decision:** Use DOM-node visibility toggling (task option 4's preferred approach), **not** an HTML re-render. `renderProductList()` already emits one discrete `<li data-name="...">` per recipe (bom-module.js `buildItem()`, L247–259), grouped inside four category `<div>` wrappers with stable, hardcoded ids: `#cat-retail`, `#cat-sub`, `#cat-3d`, `#cat-labels` (L297–349). Each category also has a `<li class="neo-category-row" data-cat="cat-*">` header (e.g. L299, L312, L325, L338). This means filtering can be done entirely by walking already-rendered nodes and flipping `style.display` — **no `innerHTML` call is introduced anywhere in the filter path.**

**New function — add to `assets/js/bom-module.js`, immediately after `window.renderProductList` closes (after L352, before `function productDragStart` at L354):**

```js
window.filterRecipeList = function() {
    const input = document.getElementById('recipeSearchInput');
    const term = input ? input.value.toLowerCase().trim() : '';
    const emptyState = document.getElementById('recipeSearchEmptyState');
    const catIds = ['cat-retail', 'cat-sub', 'cat-3d', 'cat-labels'];
    let totalVisible = 0;

    catIds.forEach(catId => {
        const catDiv = document.getElementById(catId);
        if (!catDiv) return; // category has zero products this render pass — no DOM node exists
        const headerLi = document.querySelector(`li.neo-category-row[data-cat="${catId}"]`);
        const items = catDiv.querySelectorAll('li[data-name]');
        let visibleInCat = 0;

        items.forEach(li => {
            // Match against the *displayed* name span, NOT the data-name attribute.
            // buildItem() (bom-module.js L248) escapes data-name with `.replace(/'/g, "\\'")`,
            // which leaves a literal backslash in the attribute for any recipe name containing
            // an apostrophe (e.g. "Skater's Special" -> data-name="Skater\'s Special"). Matching
            // against that would silently break search for those recipes. The first <span> inside
            // the <li> (L257: `<span>☰ ${n}</span>`) carries the real, unescaped display text.
            const nameSpan = li.querySelector('span');
            const displayName = (nameSpan ? nameSpan.textContent : (li.getAttribute('data-name') || '')).toLowerCase();
            const matches = term === '' || displayName.includes(term);
            li.style.display = matches ? '' : 'none';
            if (matches) { visibleInCat++; totalVisible++; }
        });

        if (term === '') {
            // Restore whatever collapse/expand state the user had before typing.
            const isOpen = window.recipeGroupState ? window.recipeGroupState[catId] : true;
            catDiv.style.display = isOpen ? 'block' : 'none';
            if (headerLi) headerLi.style.display = '';
        } else {
            // Active search: force-expand categories that have a match, fully hide empty ones.
            catDiv.style.display = visibleInCat > 0 ? 'block' : 'none';
            if (headerLi) headerLi.style.display = visibleInCat > 0 ? '' : 'none';
        }
    });

    if (emptyState) emptyState.style.display = (term !== '' && totalVisible === 0) ? 'block' : 'none';
};
```

Notes for the implementer:
- No debounce, no `setTimeout` — matches task spec (client-side array of DOM nodes, small N, `input` fires per keystroke).
- Category-collapse state (`window.recipeGroupState`, bom-module.js L263–269, persisted to `localStorage` under key `recipeGroupState`) is **read but never mutated** by the filter — clearing the search box must restore the exact pre-search collapse/expand layout, not force everything open permanently.
- Non-blocking observation (do not fix as part of this task — out of scope, pre-existing): `window.recipeGroupState`'s default object (L264–269) uses keys `cat-print`/`cat-label`, but the actual rendered category div ids are `cat-3d`/`cat-labels` (L324, L337). This mismatch already exists in production and causes the 3D Prints / Custom Labelz categories to default to collapsed on first load unless `currentProduct` happens to belong to that category (`getCatState()`, L286–294). `filterRecipeList()`'s restore branch intentionally reads `window.recipeGroupState[catId]` the same way `getCatState()` does, so it stays behaviorally consistent with existing (quirky) behavior rather than silently "fixing" it as a side effect.

---

## 3. Event wiring — `data-input` token via `system-event-delegator.js`

Per CLAUDE.md, inline `oninput`/`onchange` HTML attributes are forbidden. The codebase's established pattern for this **exact** use case — live-filter-as-you-type — is the global `data-input` delegator in `assets/js/system-event-delegator.js` (`document.body.addEventListener('input', ...)`, L1962–2017), already used by `input_actualNetSearch` (→ `renderActualNetList()`) and `input_window_updateRecipeManagerStaging` (→ `window.updateRecipeManagerStaging(el)`). This satisfies both options the task description raised ("addEventListener in module JS" *or* "a data-* token via system-event-delegator.js") simultaneously — the delegator itself *is* an `addEventListener('input', ...)` call.

`data-keyup` (used by `#rawInvSearch`) was considered but rejected: `keyup` misses paste/cut/autocomplete/IME composition input; the native `input` event is the semantically correct choice and is what the task explicitly asked for ("applied live on `input` event").

**Add to `assets/js/system-event-delegator.js`**, inside the `input` switch, immediately after the `input_window_updateRecipeManagerStaging` case (after L2016 `break;`, before L2017 closing `}`):

```js
                case 'input_window_filterRecipeList':
                    if (typeof window.filterRecipeList === 'function') window.filterRecipeList();
                    break;
```

Token name follows the existing `input_window_<targetFunctionName>` convention already used at L2012 (`input_window_updateRecipeManagerStaging`).

---

## 4. Dynamic HTML review (XSS)

**No new dynamic HTML is rendered by this feature.** Confirmed:
- The search `<input>` and the empty-state `<div>` (§1) are static literals in `index.html`, never assigned via `.innerHTML`.
- `filterRecipeList()` (§2) only calls `.style.display =`, `.getAttribute()`, `.querySelector()`, `.textContent` (read-only) — no `innerHTML`, `insertAdjacentHTML`, `outerHTML`, or `document.write` anywhere in the new code path.
- The only pre-existing dynamic-HTML call this feature touches indirectly is `renderProductList()`'s `ui.innerHTML = window.safeHTML(html);` (bom-module.js L350) — already using the sole allowed pattern (unconditional `window.safeHTML(x)`, no ternary fallback). This plan does not modify that line's guard; it only appends a call after it (§6).
- **`FORBIDDEN_TERNARY` check:** N/A — no `window.safeHTML(...)` call is added or modified by this task at all.

**RLS implications:** none. This feature performs zero new Supabase queries. It filters exclusively over already-loaded, in-memory `productsDB` (populated by pre-existing initial-load queries elsewhere in the app, already subject to whatever RLS policy governs `product_recipes`/`full_landed_costs`). RLS posture is unchanged.

**Print-window DOMPurify:** N/A — this feature does not touch any `printWin.document.write(...)` path.

**Security-scout recommendation:** run `node scripts/xss-audit.js --warn` scoped to `assets/js/bom-module.js`, `assets/js/system-event-delegator.js`, and the changed `index.html` region after implementation, per the standard post-task validation swarm. Expected result: zero new findings.

---

## 5. 4-state UX

This is a single client-side data component (`#productListUI` + the two new sidebar elements) sourced from already-loaded `productsDB`/`catalogCache`. All four states map onto *existing* behavior plus the one new "filtered-empty" case:

| State | Trigger | Behavior |
|---|---|---|
| **Loading** | Initial app boot, before `productsDB` is populated | Already handled upstream by the existing app boot sequence (unrelated to this feature) — no change needed. Search input is inert/harmless if typed into before data loads (list is simply empty at that point). |
| **Error** | N/A for this feature | This is a pure client-side array/DOM filter with no network call, so there is no failure mode to guard beyond what `renderProductList()`'s existing `try/catch` (bom-module.js L212–222) already covers for the base list render. No new error path is introduced. |
| **Empty (no recipes exist)** | `productsDB` has zero keys | Already handled by existing code: `renderProductList()` L239 shows `"No products."` and hides `#bomMainArea`. Unaffected by this task — the new search input remains visible and interactive but has nothing to filter. |
| **Empty (filter, this task's new case)** | User has typed a search term and zero recipe names contain it, across all 4 categories | `#recipeSearchEmptyState` becomes visible (`display:block`) showing *"No recipes found matching search."*; all category `<div>`s are hidden (`visibleInCat === 0` branch, §2). Clearing the input restores the prior view instantly. |
| **Success** | Search term is empty, or matches ≥1 recipe | Matching `<li>` elements visible, non-matching hidden; matching categories force-expanded; `#recipeSearchEmptyState` hidden. |

---

## 6. UI mutex — not applicable

No Supabase mutation occurs anywhere in this feature (confirmed: `filterRecipeList()` never calls `supabaseClient.from(...)`). Per CLAUDE.md, `window.executeWithButtonAction(...)` is only required for buttons that trigger DB writes. There is no button here — filtering happens automatically on `input`. **No mutex wiring needed.**

---

## 7. Zero-refresh

The filter must survive every async mutation that re-renders the sidebar, not just the initial page load. `window.renderProductList()` is called from **12 sites** across the codebase (create recipe, delete recipe, rename, bulk-add save, labor-cost update, drag-reorder, category toggle, label auto-purge, plus 2 in `labelz-module.js` and 2 in `index.html`'s hub-switch/init logic). Rather than hunting down and patching every call site individually (fragile, easy to miss one), **the fix goes inside `renderProductList()` itself**, so every caller gets it automatically:

**File:** `assets/js/bom-module.js`, end of `window.renderProductList` (currently L350–352):

```js
350:    ui.innerHTML = window.safeHTML(html);
351:    if(currentProduct) window.renderProductBOM();
352:}
```

**Change to:**

```js
350:    ui.innerHTML = window.safeHTML(html);
351:    if(currentProduct) window.renderProductBOM();
352:    if (typeof window.filterRecipeList === 'function') window.filterRecipeList();
353:}
```

This guarantees: after *any* recipe create/delete/rename/bulk-add/labor-update/reorder resolves and `renderProductList()` rebuilds `#productListUI`'s `<li>` nodes from scratch, whatever text is currently sitting in `#recipeSearchInput` (which itself lives outside the rewritten `<ul>` and is therefore never cleared by the rebuild) is immediately reapplied to the fresh DOM — the user never has to retype their search or refresh the page. If the box is empty, the same call correctly restores category collapse/expand state (§2) instead of leaving everything force-expanded from a stale filter pass.

The `typeof` guard matches the codebase's existing defensive-call convention (e.g. `if(typeof populateDropdowns === 'function') populateDropdowns();`, bom-module.js L87) and avoids any load-order fragility, even though in practice both functions are defined synchronously in the same file before any render call can fire.

---

## 8. Vanilla JS constraints

- No `var` anywhere in the new code (§2, §3 snippets use `const`/`let` only, matching bom-module.js's existing mixed `let`/`const` style, e.g. L224 `const ui = ...`).
- No framework/library dependency introduced. DOM access is 100% native (`getElementById`, `querySelector`, `querySelectorAll`, `.style.display`, `.textContent`, `.getAttribute`).
- No Web Bluetooth interaction (N/A to this feature).
- No new CSS utility classes — reuses existing CSS variables (`var(--border-input)`, `var(--bg-input)`, `var(--text-color)`, `var(--text-muted)`) and inline `style=""` attributes, consistent with the rest of `.bom-sidebar`'s markup.

---

## 9. Schema changes

**None.** No Supabase table, column, or RLS policy is touched by this feature. No update to the Master Reference `## Database Schemas` section is required.

---

## 10. Topological integrity — Master Reference update required

CLAUDE.md's "Topological integrity" rule requires the Mermaid Architectural Blueprint to be updated whenever a UI element is created inside a pane — this is a distinct, narrower obligation than the general "Ledger exemption" (which defers *routine* Master Reference syncing to `/wind-down`). Since this task adds a new interactive UI element (`#recipeSearchInput`) to `paneProdBuilder`/RECIPEZ, the blueprint must be updated **as part of this task**, but as its **own separate commit** (not bundled into the `index.html`/`bom-module.js`/`system-event-delegator.js` feature commits), to respect the spirit of the ledger-exemption clause.

**A. Mermaid blueprint** — `tools/SK8Lytz_App_Master_Reference.md`, inside the `MK_Builder` block (L52–63). Add one line after L60 (`RecipeAddPart`):

```
        MK_Builder --> RecipeSearchFilter[Live Recipe Search Filter<br>Input: 🔍 Search recipes...]
```

**B. DOM Binding Dictionary** — `tools/SK8Lytz_App_Master_Reference.md`, `paneProdBuilder (RECIPEZ)` entry (L577–579). Append a bullet noting the new `#recipeSearchInput` / `#recipeSearchEmptyState` pair and their behavior (client-side filter, no DB write, restores category collapse state on clear).

If the user would rather defer this to `/wind-down` per the general ledger-exemption habit, that's a one-line confirmation to ask before committing — flagging it here rather than guessing which precedence wins.

---

## 11. Suggested micro-commit sequence

1. `feat(recipez): add live search input + empty-state element to RECIPEZ sidebar` — `index.html` only.
2. `feat(recipez): add filterRecipeList() + zero-refresh hook in renderProductList()` — `assets/js/bom-module.js` only.
3. `feat(recipez): wire input_window_filterRecipeList delegator token` — `assets/js/system-event-delegator.js` only.
4. `chore(docs): document RECIPEZ search filter in Master Reference blueprint` — `tools/SK8Lytz_App_Master_Reference.md` only (separate commit per §10).

---

## Files Touched

- `index.html` — new `#recipeSearchInput` (search box) + `#recipeSearchEmptyState` (empty-state message) markup inside `#recipezSidebar`, between L2130 and L2131 (exact snippets in §1).
- `assets/js/bom-module.js` — new `window.filterRecipeList` function (added after L352, full body in §2); one-line zero-refresh hook appended to `window.renderProductList` (L350–352 → §7).
- `assets/js/system-event-delegator.js` — new `case 'input_window_filterRecipeList':` in the global `input` event switch (added after L2016, snippet in §3).
- `tools/SK8Lytz_App_Master_Reference.md` — Mermaid blueprint node under `MK_Builder` (after L60) + DOM Binding Dictionary bullet under `paneProdBuilder (RECIPEZ)` (L577–579); required by the Topological Integrity rule (§10), committed separately from the three files above.

No other files require changes. No Supabase migration files. No `CLAUDE.md` changes.
