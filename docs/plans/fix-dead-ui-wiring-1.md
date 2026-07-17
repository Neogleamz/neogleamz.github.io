# Implementation Plan: Production UI Wiring — Dead Buttons & Crashes

**Branch:** `fix/dead-ui-wiring`
**Ledger item:** `tools/SK8Lytz_Bucket_List.md` → Epic "Nomenclature Audit Engine" → Phase 0 (P1)
**Related epic plan:** [docs/plans/nomenclature-audit-engine.md](nomenclature-audit-engine.md) (Phase 0 section — superseded in places by this plan; see §0 corrections below)
**Author:** implementation-planner subagent
**Status:** Awaiting user approval (CLAUDE.md forbids skipping the halt-for-approval gate for any Bucket List task)

---

## 0. Verified Findings & Corrections to the Touch-Point Inventory

Per CLAUDE.md's anti-hallucination protocol, every claim below was re-verified by reading the live files (not assumed from the inventory). Two corrections and one critical companion-fix were discovered during re-verification. **These are presented as evidence-backed corrections, not open questions** — confidence is high enough in each case to proceed without blocking, but they are flagged prominently because they change the literal instructions handed down.

### 0.1 CORRECTION — `click_cancelRestore` target function is `window.cancelRestore()`, not `window.closeSnapshotManager()`
The inventory states the intended handler is `window.closeSnapshotManager()` (inventory-module.js:873). This is incorrect. Proof:
- The `❌ CANCEL` button (`index.html:3261`) lives inside `<div id="paneNexlBrainz">` → "☁️ Backup & Restore" panel-card (`index.html:3223-3264`), **not** inside `<div id="snapshotManagerModal">` (a completely different modal defined 4500+ lines away at `index.html:7824`).
- Its sibling elements in the exact same block are `restorePreview` (3257), `restoreCheckboxes` (3258), `importBackupFile` (3247), `importBackupFileTest` (3252) — all owned by the XLSX backup/restore flow.
- `window.cancelRestore()` (`assets/js/system-tools-module.js:1687-1696`) operates on precisely those IDs: hides `#restorePreview`, clears `#importBackupFile`/`#importBackupFileTest`, resets `pendingRestoreData = {}`, logs `"🗑️ RESTORE ABORTED"`.
- **Master Reference confirms this independently**: `tools/SK8Lytz_App_Master_Reference.md:522-526` documents the "strict 3-stage restoration protocol" for this exact NEXUZ Brainz panel (`importBackupFileTest` → table targeting → `click_executeRestore`). The sibling button `🔥 LIVE RESTORE` (`data-click="click_executeRestore"`, index.html:3260) already has a working delegator case (`system-event-delegator.js:812-814`) calling the bare `executeRestore()` (`window.executeRestore`, system-tools-module.js:1752) — `cancelRestore` is its natural pair.
- `window.closeSnapshotManager` is already correctly wired to a *different* token (`click_window_closeSnapshotManager`, `system-event-delegator.js:255-256`) and is not broken.

**Action:** wire `click_cancelRestore` → `window.cancelRestore()` (via bare-identifier call, matching the immediate sibling `executeRestore()` pattern — see §2.3).

### 0.2 CRITICAL — Adding the `click_sortLtvModal` delegator case alone would introduce a double-toggle regression
`assets/js/ceo-module.js:744-775` already has an **independent, undocumented** `document.addEventListener('click', ...)` block (separate from `system-event-delegator.js`) that includes:
```js
const ltvTh = e.target.closest('th[data-ltvsort]');
if (ltvTh) {
    let key = ltvTh.getAttribute('data-ltvsort');
    if (key) sortLtvModal(key);
}
```
This means the 6 `<th data-ltvsort="...">` headers **already sort today** — clicking one is not currently a no-op; it fires this listener (attached to `document`) even though the delegator's `data-click="click_sortLtvModal"` case is missing (the delegator has no `default:` case, confirmed by exhaustive grep, so the unmatched token is a harmless no-op, not an exception).

Both `document.body` (`system-event-delegator.js`) and `document` (`ceo-module.js`) listeners fire on every click of the same `<th>` (bubble path: target → … → body → html → document — body's listener runs first, but neither calls `stopPropagation`, so both always run). If we add the delegator case *without* removing the `ceo-module.js` duplicate, `sortLtvModal(key)` fires **twice per click**:
- Same-column click: toggle → toggle = net no-op. The sort direction visibly gets "stuck" and never flips on repeat clicks.
- Different-column click: delegator sets `key=newKey, asc=false`; then ceo-module's listener sees the state it just wrote and treats it as a same-key click, flipping `asc` to `true`. Every column switch would silently default to ascending instead of the intended descending.

**Action (required, not optional):** as part of this same fix, remove the `ltvTh`/`data-ltvsort` block from `assets/js/ceo-module.js:769-773`, leaving `system-event-delegator.js` as the single source of truth for this token — consistent with the Master Reference's documented architecture ("Global Interaction Controller… centralized, native `system-event-delegator.js`", `tools/SK8Lytz_App_Master_Reference.md:192,311`) and the epic's own Vanilla JS constraint ("Event delegation only via system-event-delegator.js static switch blocks", `docs/plans/nomenclature-audit-engine.md:56`). This is not a Boy-Scout-rule cleanup (which CLAUDE.md disables during bug fixes) — it is a direct, necessary component of making this specific fix behave correctly.

### 0.3 Stale line reference in the epic plan doc
`docs/plans/nomenclature-audit-engine.md:73` claims "Index.html line 2344: Delete 6× dead `click_sortLtvModal` emitters (they call `advancePrintStatus('Queued')` which never routes)." Verified false: `index.html:2344` is `<div class="pipe-step" id="pipe-P-Queued" data-click="click_advancePrintStatus_Queued">` — the 3D print pipeline, completely unrelated. The real 6 emitters are at `index.html:3560-3565`, are correctly tagged with both `data-click="click_sortLtvModal"` and `data-ltvsort="{pii|order_id|date|item|total|net}"`, and must be **wired, not deleted**. No `index.html` edits are required for this task — the emitters are already correct.

### 0.4 Discovery — all 7 "unguarded ghost" getElementById targets are currently unreachable from the live UI (guard anyway)
Exhaustive repo-wide grep (index.html, all `assets/js/*.js`, qa-dashboard.html) for the literal id strings confirms:
- `id="batchProductSelect"` and `id="batchQty"` **do not exist anywhere** in the DOM (static or dynamically created). The "Start Production Batch" modal (`index.html:3919-3963`, `#newWOModal`) was refactored to use `newWOProductRetail/Sub/Print` + `newWOQty` instead; its submit button (`btnSpawnWO`, `data-click="click_window_validateAndCreateWO"`) calls `production-module.js:1064 validateAndCreateWO()`, **not** `runProductionBatch()`. `runProductionBatch()` (`inventory-module.js:415`) has no confirmed live trigger anywhere in the codebase (only self-reference + `window.runProductionBatch` export at `inventory-module.js:3532`) — it appears to be orphaned legacy code from before the work-order routing system existed.
- `id="packerzAdminRecipeSelect"` **does not exist anywhere** in the DOM either. `initPackerzAdmin()` (`packerz-module.js:1483-1503`, itself already guarded with `if(!ddl) return;`) always no-ops. The delegator cases that call the affected functions (`click_savePackerzSOPToDB` at `system-event-delegator.js:1016`, `change_loadPackerzSopFromDB` at `:1865`) have **no matching `data-click`/`data-change` emitter anywhere in the codebase** (`btnSavePackerzSOP` only exists as a string argument to `executeWithButtonAction`, never as an actual `<button id="btnSavePackerzSOP">`). `production-module.js:357` already safely guards its own read of the same ghost id (`if (sel) prodId = sel.value;`) — this is why the task's inventory correctly counts only 4 in packerz-module.js, not 5.

**Conclusion:** none of the 7 guards are fixing an actively-exploitable crash today (nothing currently calls them from a live button). They are correct, low-risk, zero-behavior-change defensive hardening exactly as instructed by the task, and they close off latent crash risk if this code is ever reactivated (e.g. during Phase 3 remediation, which will need to decide whether to keep-and-guard or delete this orphaned subsystem — flagging that decision for the epic owner, out of scope here). Guarding (not deleting) is the correct, minimal action for *this* task per the explicit task directive; deletion is a Phase 3 remediation call.

---

## 1. Objective

1. Wire 3 dead `data-click` tokens to their real handlers in `assets/js/system-event-delegator.js`: `click_sortLtvModal` (×6 `<th>` emitters), `click_cancelRestore` (×1), `click_actualNetSort_a` (×2 emitters, same token).
2. Remove the now-redundant/conflicting `data-ltvsort` handling block in `assets/js/ceo-module.js` (required companion fix, §0.2).
3. Guard the 7 unguarded `getElementById` calls in `assets/js/inventory-module.js` (×3) and `assets/js/packerz-module.js` (×4) so they fail safe instead of throwing `TypeError`.
4. Explicitly leave `print-module.js`'s unrelated unguarded `.style.display` accesses (lines 63, 66, 92, 551, 745, 1028, 1032) untouched — out of scope, already tracked under `debt/nomenclature-remediation` (Phase 3).
5. Add 2 new global declarations to `eslint.config.mjs` (`cancelRestore`, `sortLtvModal`) required by the new bare-identifier delegator calls, matching the established convention already used for `actualNetSort`, `closeMathSimulator`, `savePackerzSOPToDB`, `executeRestore`, etc.

---

## 2. Security

### 2.1 XSS
No `.innerHTML`, `.insertAdjacentHTML`, `.outerHTML`, or `document.write` sinks are touched by any change in this plan. All edits are: (a) new `switch`-`case` routing lines that call existing, already-audited functions, (b) `getElementById` null-guards, (c) one dead-code removal. **No new XSS surface is created.** `node scripts/xss-audit.js` is expected to report zero new findings (see §8 verification checklist).

### 2.2 RLS / Supabase
No new Supabase queries, tables, columns, or RLS policies are introduced. `savePackerzSOPToDB()` and `runProductionBatch()` already contain their own Supabase `upsert` calls (`pack_ship_sops`, `inventory_consumption`) — those calls are untouched; only the DOM read that feeds their payload is guarded. No RLS implications.

### 2.3 Print-window DOMPurify
Not applicable — no print-window `document.write` code path is touched by this task.

---

## 3. Vanilla JS Constraints

- No `var` is introduced anywhere; all new/edited declarations use `const`/`let`.
- No framework, no bundler, no TypeScript. All routing stays inside the existing native `switch(action)` block in `system-event-delegator.js`.
- Delegator case bodies mirror the exact existing sibling idiom: `case 'click_TOKEN': if (typeof fn === 'function') fn(args); break;` (matching `click_actualNetSort_o/d/g/c/s/t/f/n` at lines 638-661, and `click_closeMathSimulator` at 632-634).
- No Web Bluetooth surface touched.
- Bare (non-`window.`-prefixed) cross-file function references require an `eslint.config.mjs` globals entry under this codebase's established `sourceType: "module"` per-file-isolation convention (proven pattern: `actualNetSort`, `executeRestore`, `savePackerzSOPToDB`, `closeMathSimulator`, `closeLtvModal` are all already declared there despite several being `window.`-scoped at their definition site — the determining factor is how the *call site* references them, not the definition). This plan adds `cancelRestore` and `sortLtvModal` to that list.

---

## 4. 4-State UX (Loading / Error / Empty / Success)

None of the 6 edits in this task introduce a new data-fetching UI component, so a fresh 4-state implementation is not applicable. Assessment of what already exists, confirmed unchanged by this fix:

| Surface | Loading | Error | Empty | Success |
|---|---|---|---|---|
| LTV Whales table (`renderLtvWhalesTable`) | N/A (in-memory sort, no fetch) | N/A | Already handled: `"No historical repeat transactions found."` (ceo-module.js:674-675) | Table re-renders immediately (see §6) |
| Actual Net modal (`renderActualNetList`) | Unaffected by this fix | Unaffected | Pre-existing behavior unaffected | Table re-renders immediately (see §6) |
| Cancel Restore | N/A (synchronous local DOM reset, no network call) | N/A | N/A | `importTrace("🗑️ RESTORE ABORTED…")` write to terminal (system-tools-module.js:1692) unaffected |
| Guarded `getElementById` reads | N/A — these are defensive DOM guards, not data-fetch states | Guard *is* the error handling: fail safe (return / throw, per §5) instead of crashing | N/A | N/A |

No new 4-state scaffolding is required.

---

## 5. UI Mutex (`window.executeWithButtonAction`)

- `sortLtvModal`, `actualNetSort`, `cancelRestore` are **not** DB-mutation buttons (pure client-side sort/reset) — no mutex required, none added, matching their sibling cases (none of `click_actualNetSort_o/d/g/c/s/t/f/n` use a mutex either).
- `savePackerzSOPToDB()` **already** uses the mutex correctly: `await executeWithButtonAction('btnSavePackerzSOP', 'UPLOADING PROTOCOLS...', '💾 SAVED SUCCESSFULLY!', async () => {...})` (packerz-module.js:1802). This plan does not touch that wrapper call.
- **Important nuance for the `productionAdminQA` guard** (packerz-module.js:1821, inside the `executeWithButtonAction` callback): the guard must **`throw`**, not silently `return`. `executeWithButtonAction` (defined `index.html:4842-4902`) only shows the success string (`btn.innerHTML = successStr`) if the callback resolves without throwing; a silent `return` inside the callback would let the promise resolve normally, flipping the button to "💾 SAVED SUCCESSFULLY!" even though the Supabase `upsert` never ran — a false-positive success state that violates the UI-mutex contract. Throwing routes into the existing `.catch(e => { … alert("CRITICAL SAVE ERROR: " + e.message); })` (packerz-module.js:1833-1837), preserving accurate button/error UX. See exact snippet in §7.4.

---

## 6. Zero-Refresh

- `sortLtvModal(key)` already ends by calling `renderLtvWhalesTable()` (ceo-module.js:654) — unchanged by this fix. Once wired through the delegator, clicking a header re-sorts and re-renders the LTV whales table body immediately, no page refresh.
- `actualNetSort(col)` already ends by calling `renderActualNetList()` (sales-module.js:1698) — unchanged. Wiring `_a` makes the "Refund (M)" header call the same re-render path as its 8 siblings.
- `cancelRestore()` already performs its own direct DOM resets synchronously (hide `#restorePreview`, clear file inputs, log to terminal) — no separate render function to re-invoke; zero-refresh already holds by construction.
- The 7 guarded `getElementById` reads do not change any rendering behavior; `window.renderInventoryTable()` / `window.updateCcMngrStock()` calls already present in `runProductionBatch()` are left untouched (still invoked on the success path).

No new render-function re-invocation wiring is needed beyond what already exists in each target function.

---

## 7. Schema Changes

**None.** No Supabase table, column, or RLS policy is created, altered, or dropped by this task. Per CLAUDE.md's "Corporate brain sync" rule, no `## Database Schemas` update to `tools/SK8Lytz_App_Master_Reference.md` is required.

---

## 8. Topological Integrity (Mermaid Blueprint)

**No update required.** CLAUDE.md's rule triggers on *creating, deleting, or moving* a button/modal/UI element. This task does neither:
- The 6 LTV `<th>` headers, the CANCEL button, and the two Refund(M) `<th>` emitters already exist in `index.html`/`sales-module.js` exactly as currently rendered — we are only completing their event routing.
- The `ceo-module.js:769-773` removal deletes a duplicate *event-listener code path*, not a DOM element (the `<th data-ltvsort>` elements themselves are untouched).
- No `getElementById` guard adds/removes/moves a DOM node.

No `tools/SK8Lytz_App_Master_Reference.md` Mermaid section edits are needed for this task.

---

## 9. Per-File Edit List (exact before/after)

> Line numbers are current-state anchors as of this plan's verification pass. The implementer must `Read` each file immediately before `Edit` per CLAUDE.md's surgical-edit rule, in case of drift from other in-flight work.

### 9.1 `assets/js/system-event-delegator.js` — 3 new cases

**(a) `click_sortLtvModal`** — insert immediately after the existing `click_closeLtvModal` case (lines 857-859):
```js
// BEFORE (857-859)
                case 'click_closeLtvModal':
                    closeLtvModal();
                    break;

// AFTER
                case 'click_closeLtvModal':
                    closeLtvModal();
                    break;
                case 'click_sortLtvModal':
                    if (typeof sortLtvModal === 'function') sortLtvModal(el.getAttribute('data-ltvsort'));
                    break;
```

**(b) `click_actualNetSort_a`** — insert between the existing `click_actualNetSort_g` and `click_actualNetSort_c` cases (lines 644-647), matching the "Total (L)" → "Refund (M)" column order in the HTML:
```js
// BEFORE (644-648)
                case 'click_actualNetSort_g':
                    if (typeof actualNetSort === 'function') actualNetSort('g');
                    break;
                case 'click_actualNetSort_c':
                    if (typeof actualNetSort === 'function') actualNetSort('c');
                    break;

// AFTER
                case 'click_actualNetSort_g':
                    if (typeof actualNetSort === 'function') actualNetSort('g');
                    break;
                case 'click_actualNetSort_a':
                    if (typeof actualNetSort === 'function') actualNetSort('a');
                    break;
                case 'click_actualNetSort_c':
                    if (typeof actualNetSort === 'function') actualNetSort('c');
                    break;
```
(Verified: `sales-module.js:1758-1762` `sortMap` already contains `a: 'refunds'` — confirms `'a'` is the correct sort-key letter for "Refund (M)".)

**(c) `click_cancelRestore`** — insert immediately after the existing `click_executeRestore` case (lines 812-814):
```js
// BEFORE (812-815)
                case 'click_executeRestore':
                    executeRestore();
                    break;
                case 'click_syncAndCalculate':

// AFTER
                case 'click_executeRestore':
                    executeRestore();
                    break;
                case 'click_cancelRestore':
                    if (typeof cancelRestore === 'function') cancelRestore();
                    break;
                case 'click_syncAndCalculate':
```

### 9.2 `assets/js/ceo-module.js` — remove redundant duplicate listener block (required companion fix, §0.2)

```js
// BEFORE (763-774)
        const sortTh = e.target.closest('th[data-ceosort]');
        if (sortTh) {
            let key = sortTh.getAttribute('data-ceosort');
            if (key) sortCeoTable(key);
        }
        
        const ltvTh = e.target.closest('th[data-ltvsort]');
        if (ltvTh) {
            let key = ltvTh.getAttribute('data-ltvsort');
            if (key) sortLtvModal(key);
        }
    } catch (err) { console.error(err); }

// AFTER
        const sortTh = e.target.closest('th[data-ceosort]');
        if (sortTh) {
            let key = sortTh.getAttribute('data-ceosort');
            if (key) sortCeoTable(key);
        }
        // click_sortLtvModal routing now owned exclusively by system-event-delegator.js
        // (data-click="click_sortLtvModal" case) — this duplicate listener was firing
        // sortLtvModal() a second time on every click, canceling out the asc/desc toggle.
    } catch (err) { console.error(err); }
```
Do **not** touch the `sortTh`/`data-ceosort` block above it — that is an unrelated, correctly-functioning CEO Terminal simulator sort.

### 9.3 `assets/js/inventory-module.js` — guard 3 ghost reads in `runProductionBatch()`

```js
// BEFORE (415-420)
async function runProductionBatch() {
    try { 
        const n = document.getElementById('batchProductSelect').value; const q = parseFloat(document.getElementById('batchQty').value); 
        let batchType = "Production";
        if(document.getElementById('batchTypeSelect')) batchType = document.getElementById('batchTypeSelect').value;
        if(!n || isNaN(q) || q<=0) return alert("Select product & valid Qty."); 

// AFTER
async function runProductionBatch() {
    try { 
        const batchProductSelectEl = document.getElementById('batchProductSelect');
        const batchQtyEl = document.getElementById('batchQty');
        if (!batchProductSelectEl || !batchQtyEl) { sysLog('runProductionBatch: #batchProductSelect/#batchQty not found in DOM.', true); return; }
        const n = batchProductSelectEl.value; const q = parseFloat(batchQtyEl.value); 
        let batchType = "Production";
        if(document.getElementById('batchTypeSelect')) batchType = document.getElementById('batchTypeSelect').value;
        if(!n || isNaN(q) || q<=0) return alert("Select product & valid Qty."); 
```
(`batchTypeSelect` on the next line is already guarded — leave as-is.)

```js
// BEFORE (449)
        document.getElementById('batchQty').value=1; window.renderInventoryTable(); window.updateCcMngrStock(); setTimeout(()=>setSysProgress(0,'working'),3000); 

// AFTER
        const batchQtyResetEl = document.getElementById('batchQty');
        if (batchQtyResetEl) batchQtyResetEl.value = 1;
        window.renderInventoryTable(); window.updateCcMngrStock(); setTimeout(()=>setSysProgress(0,'working'),3000); 
```

### 9.4 `assets/js/packerz-module.js` — guard 4 ghost reads

**(a) `filterPackerzAdminDropdown` (lines 1509-1512):**
```js
// BEFORE
window.filterPackerzAdminDropdown = async function() {
    let _p = document.getElementById('packerzAdminRecipeSelect').value;
    loadPackerzSopFromDB();
}

// AFTER
window.filterPackerzAdminDropdown = async function() {
    const recipeSelectEl = document.getElementById('packerzAdminRecipeSelect');
    if (!recipeSelectEl) return;
    loadPackerzSopFromDB();
}
```
(`_p` was never used beyond the crash-prone read — dropped, not replaced, to avoid an unused-variable lint warning.)

**(b) `loadPackerzSopFromDB` (lines 1718-1721):**
```js
// BEFORE
async function loadPackerzSopFromDB() {
    const sku = document.getElementById('packerzAdminRecipeSelect').value;
    const wrapper = document.getElementById('packerzSopSplitWrapper');
    if (!wrapper) return;

// AFTER
async function loadPackerzSopFromDB() {
    const recipeSelectEl = document.getElementById('packerzAdminRecipeSelect');
    if (!recipeSelectEl) return;
    const sku = recipeSelectEl.value;
    const wrapper = document.getElementById('packerzSopSplitWrapper');
    if (!wrapper) return;
```

**(c) `savePackerzSOPToDB` outer guard (lines 1798-1800):**
```js
// BEFORE
window.savePackerzSOPToDB = async function() {
    const sku = document.getElementById('packerzAdminRecipeSelect').value;
    if(!sku) return alert("Must select a Recipe first!");

// AFTER
window.savePackerzSOPToDB = async function() {
    const recipeSelectEl = document.getElementById('packerzAdminRecipeSelect');
    if (!recipeSelectEl) return alert("Recipe selector not found on page.");
    const sku = recipeSelectEl.value;
    if(!sku) return alert("Must select a Recipe first!");
```

**(d) `savePackerzSOPToDB` inner guard (line 1821, inside the `executeWithButtonAction` mutex callback — must `throw`, see §5):**
```js
// BEFORE
        let rawQa = document.getElementById('productionAdminQA').value;

// AFTER
        const qaEl = document.getElementById('productionAdminQA');
        if (!qaEl) throw new Error('QA checklist field (#productionAdminQA) not found on page.');
        let rawQa = qaEl.value;
```

### 9.5 `eslint.config.mjs` — 2 new global declarations (required by §3's bare-identifier convention)

```js
// BEFORE (94-97)
        "calculateExactWODeductions": "writable",
        "calculateProductBreakdown": "writable",
        "calculateProductTotal": "writable",
        "catalogByName": "writable",

// AFTER
        "calculateExactWODeductions": "writable",
        "calculateProductBreakdown": "writable",
        "calculateProductTotal": "writable",
        "cancelRestore": "writable",
        "catalogByName": "writable",
```
```js
// BEFORE (271-273)
        "sortBOM": "writable",
        "sortBulk": "writable",
        "stageBatchItem": "writable",

// AFTER
        "sortBOM": "writable",
        "sortBulk": "writable",
        "sortLtvModal": "writable",
        "stageBatchItem": "writable",
```

### 9.6 Explicitly NOT touched
- `index.html` — no edits (§0.3: emitters already correct).
- `assets/js/sales-module.js` — no edits (`actualNetSort()` and both `<th data-click="click_actualNetSort_a">` emitters, index.html:3615 and sales-module.js:1856, are already correct).
- `assets/js/ceo-module.js` — only the §9.2 deletion; `sortLtvModal()`/`renderLtvWhalesTable()`/`openLtvModal()`/`closeLtvModal()` bodies are untouched.
- `assets/js/system-tools-module.js` — no edits (`cancelRestore()`/`executeRestore()` bodies are already correct).
- `assets/js/production-module.js` — no edits (its own `packerzAdminRecipeSelect` read at line 357 is already guarded).
- `assets/js/print-module.js` — no edits (out of scope, §1.4; tracked under `debt/nomenclature-remediation`).
- `tools/SK8Lytz_App_Master_Reference.md` — no edits (§7, §8: no schema change, no topology change).

---

## 10. Risk Assessment

| Change | Risk | Rationale |
|---|---|---|
| `click_actualNetSort_a` case | **Low** | Purely additive; mirrors 8 proven sibling cases; verified against `sortMap.a='refunds'`. |
| `click_cancelRestore` case | **Low** | Purely additive; target function already exists, already idempotent/side-effect-safe (local DOM reset only, no network call). |
| `click_sortLtvModal` case | **Low-Medium** | Additive, but *must* ship together with the `ceo-module.js` duplicate-listener removal (§0.2/§9.2) or it introduces a visible regression (stuck/inverted sort toggle). Both edits are in this plan as one unit — do not split across separate commits without shipping them atomically. |
| `ceo-module.js` listener removal | **Low** | Removes exactly one `if` block; the adjacent `data-ceosort` block (unrelated CEO Terminal table) is untouched and independently verified. |
| 7 `getElementById` guards | **Very Low** | All 7 targets are currently unreachable ghost DOM ids (§0.4) — guards are pure defensive hardening with no observable behavior change on any currently-live code path. Worst case if reasoning is wrong: functions that used to throw now fail silently/return early instead — strictly safer than the current behavior either way. |
| `eslint.config.mjs` additions | **Very Low** | Config-only, additive, alphabetically ordered, matches 5+ existing precedents for bare-identifier + `window.`-scoped functions. |

**Overall risk: Low.** No schema, no new network calls, no new XSS sinks, no deleted/moved UI elements. The one item requiring care is shipping §9.1(a) and §9.2 together (same commit or same PR) to avoid a partial-fix regression window.

---

## 11. Verification Checklist

1. **XSS audit:** `node scripts/xss-audit.js` — expect 0 new findings (no `.innerHTML`/`.insertAdjacentHTML`/`.outerHTML`/`document.write` touched).
2. **Lint:** `npx eslint .` — expect 0 new errors; specifically confirm no `no-undef` on `sortLtvModal`/`cancelRestore` in `system-event-delegator.js` (validates §9.5), and no `no-unused-vars` in the edited `packerz-module.js`/`inventory-module.js` blocks.
3. **Tests:** `npm test` — expect unchanged pass count (grep of `tests/*.test.js` confirms none currently reference `runProductionBatch`, `savePackerzSOPToDB`, `loadPackerzSopFromDB`, `filterPackerzAdminDropdown`, `sortLtvModal`, `actualNetSort`, or `cancelRestore`, so no test updates are required, but zero regressions elsewhere is still the bar).
4. **Manual — LTV sort (STOCKPILEZ or REVENUEZ hub, wherever the CEO Terminal's "OPEN LTV MODAL" trigger lives → `ltv-metrics-modal`):**
   - Click "TOTAL" header once → rows sort by total descending (indicated by `window._ltvSortAsc === false`).
   - Click "TOTAL" again → rows flip to ascending. (This is the regression check for §0.2 — confirm it actually flips, not "sticks".)
   - Click "NET" → switches sort key, defaults to descending.
5. **Manual — Actual Net "Refund (M)" column (REVENUEZ hub → Actual Net Breakdown modal):** click the "Refund (M)" header → table re-sorts by `refunds` value; click again → direction flips.
6. **Manual — Cancel Restore (NEXUZ hub → BRAINZ pane → "☁️ Backup & Restore" panel):** upload a test file via "🧪 INSPECT TEST FILE" to populate `#restorePreview`, then click "❌ CANCEL" → preview panel hides, file inputs clear, terminal logs "🗑️ RESTORE ABORTED: Payload discarded securely."
7. **Manual — console check:** open DevTools console while navigating STOCKPILEZ/MAKERZ/FULFILLZ panes; confirm no new `TypeError: Cannot read properties of null (reading 'value')` for `batchProductSelect`, `batchQty`, or `packerzAdminRecipeSelect` (these were previously silent/unreachable, so no visible before/after difference is expected — this step confirms no *new* console noise was introduced).
8. **Git diff review:** `git diff` scoped to the 5 touched files only; confirm no unrelated lines were altered (CLAUDE.md surgical-edit rule).

---

## Files Touched

- `assets/js/system-event-delegator.js` — add 3 cases: `click_sortLtvModal`, `click_actualNetSort_a`, `click_cancelRestore` (§9.1)
- `assets/js/ceo-module.js` — remove redundant `data-ltvsort` duplicate-listener block, lines 769-773 (§9.2)
- `assets/js/inventory-module.js` — guard 3 `getElementById` reads in `runProductionBatch()`, lines 417 & 449 (§9.3)
- `assets/js/packerz-module.js` — guard 4 `getElementById` reads across `filterPackerzAdminDropdown()`, `loadPackerzSopFromDB()`, `savePackerzSOPToDB()`, lines 1510, 1719, 1799, 1821 (§9.4)
- `eslint.config.mjs` — add 2 global declarations: `cancelRestore`, `sortLtvModal` (§9.5)

**Not touched (verified, see §9.6 and §0):** `index.html`, `assets/js/sales-module.js`, `assets/js/system-tools-module.js`, `assets/js/production-module.js`, `assets/js/print-module.js`, `tools/SK8Lytz_App_Master_Reference.md`.

---

## 12. Suggested Commit Sequencing (micro-commit cadence per CLAUDE.md)

1. `fix(delegator): wire click_actualNetSort_a to actualNetSort('a')` — §9.1(b)
2. `fix(delegator): wire click_cancelRestore to window.cancelRestore()` — §9.1(c) + eslint global (§9.5 part 1)
3. `fix(delegator): wire click_sortLtvModal + remove duplicate ceo-module listener` — §9.1(a) + §9.2 + eslint global (§9.5 part 2) *(ship as one commit — see §10 risk note, do not split)*
4. `fix(inventory): guard unguarded batchProductSelect/batchQty ghost lookups` — §9.3
5. `fix(packerz): guard unguarded packerzAdminRecipeSelect/productionAdminQA ghost lookups` — §9.4

(`tools/SK8Lytz_Bucket_List.md` and `tools/SK8Lytz_App_Master_Reference.md` are exempt from these micro-commits per CLAUDE.md's ledger exemption — they sync at `/wind-down`.)
