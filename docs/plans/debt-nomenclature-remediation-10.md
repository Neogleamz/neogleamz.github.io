# Batch 10 — `debt/nomenclature-remediation`: N2 orphan-delegator triage (35 findings) + 2 residual N1 ghosts

Branch: `debt/nomenclature-remediation` (fresh off `main`).
Scope: `scripts/nomenclature-audit.js`'s N2 check (`assets/js/system-event-delegator.js` — 35 `case` blocks with zero `data-click`/`data-change`/`data-input`/`data-mousedown`/`data-blur`/`data-focus` emitter anywhere), plus 2 residual N1_GHOST_ID reads (`pcRouteBar`, `packerzAdminRecipeSelect`).

**Verification method:** every one of the 35 line numbers and both ghost-id lines was re-read directly from the live files this session (not taken on the mapper's word). Every handler-function claim ("defined/not defined", "has other callers/doesn't") was independently re-grepped across the *entire* repo (not just the delegator file), including `scripts/archive/*.py`, `docs/plans/**`, and `eslint.config.mjs`. Two mapper errors were caught and corrected (see §1). This is dead-code/nomenclature cleanup only — zero DOM/UX surface change, zero schema change, zero new UI element — consistent with Batches 4-9's precedent that the topological-integrity Mermaid-blueprint rule does not apply to removing orphaned JS handlers with no HTML counterpart.

---

## 0. Bottom line

- **35/35 N2 findings triaged.** All 35 are confirmed dead-end-to-end or safely reducible to "case only" deletions — **zero require option (d)** (N2 has no allowlist mechanism at all — `checkN2` never consults `tools/nomenclature-registry.json`, confirmed by reading `scripts/nomenclature-audit.js:331-356`) and **zero require option (c)** ("flag as live bug") — none of the 35 are reachable by any live UI path today, and none of the handler functions they call are *also* broken on some other, live-emitter case (the specific risk the task asked me to rule out for Groups B/C/G/I). Full per-case reasoning is in §2.
- **`pcRouteBar`**: DELETE. New evidence (not available to Batch 9): the sibling 3-way routing feature it belonged to (`updateCCRouteUI()` + `pcRoutePhone`/`pcRoutePC`/`pcRouteBoth`) was already **approved for wholesale deletion by the user** and shipped in `fix/cc-mobile-bridge-sync-bugs`. `pcRouteBar` is the one fragment that fix missed because it lives in a *different* function (`MOBILE_CONNECT`, not `updateCCRouteUI` itself). See §3.1.
- **`packerzAdminRecipeSelect`**: NO ACTION — Batch 6's "deliberately unguarded, tied to a separate `data-prodid` bug" reasoning is re-verified and still holds exactly as stated. See §3.2.
- **Zero new functional bugs discovered this batch.** No new `fix/*` ledger entry is being spun out.
- **Zero Supabase schema/RLS change.** `## Database Schemas` in the Master Reference needs no edit.
- One **pre-existing, unrelated Master Reference documentation-drift** was found while tracing `openPrintSOP` (line 779 misattributes a function call) — flagged as an optional doc fix in §7, not required for this batch's diff.

---

## 1. Corrections to the pre-task swarm's map (explore-mapper errors caught this session)

| # | Mapper claim | Correction (re-verified by reading the actual code) |
|---|---|---|
| 1 | Group A: line 1075 (`click_openSOPSnapshotCamera_smart`) is "fully dead end-to-end, no other caller anywhere" | **Wrong.** `window.click_openSOPSnapshotCamera_smart` (production-module.js:2703) **is** called from a second, live delegator case — `mousedown_smartPhotoPaste` (system-event-delegator.js:1706-1709) — which has a real, live `data-mousedown="mousedown_smartPhotoPaste"` producer at `production-module.js:95`. This is a Group E case (handler live via another path), not Group A. Verdict changes from "delete case + function" to "delete case only." |
| 2 | Group G: line 1844 (`change_window_updateCcMngrStock`) — "function exists in inventory-module.js but is NOT actually attached to window" | **Wrong.** `window.updateCcMngrStock = function() {...}` is declared exactly that way at `inventory-module.js:2144` — it is directly attached to `window`. It also has ~5 other live internal callers in the same file (lines 35, 411, 418, 591, 1427). Verdict unaffected (still "delete case only") but the *reasoning* the mapper gave was incorrect and is corrected here for the record. |
| 3 | Group B did not list line 1332 as clearly as the others, and it was easy to mis-file as "out of scope" | Line 1332 (`click_openMediaManager`) **is** one of the 35 (confirmed: zero `data-click="click_openMediaManager"` producer anywhere in live code, and `window.openMediaManager`/`openMediaManager` has zero definition anywhere in the repo). Folded into §2's doubly-dead bucket alongside its sibling, line 925. |

No other mapper claims were found incorrect after independent re-verification; the remaining 32 case-level verdicts and both N1 ghost dispositions matched the mapper's evidence once traced to source, though several required additional cross-file evidence (git/plan-doc history) the mapper didn't have to fully justify *why* a given case is dead (see per-item notes in §2).

---

## 2. Full disposition — all 35 N2_ORPHAN_HANDLER findings

Three outcome buckets emerged. **None fall into (c) FLAG or (d) ALLOWLIST** — see §0 for why.

### Bucket 1 — DELETE case block **and** delete the handler function (8 cases)
Function confirmed to have **zero other callers anywhere in the repo** (delegator case, inline `onclick=`, other dispatch tables, and direct `window.fnName()` calls all checked) — safe to remove both.

| Line | Token | Handler | Function location | Why fully dead |
|---|---|---|---|---|
| 130-132 | `click_openTaskContext` | `window.openTaskContext()` | `task-engine.js:2194-2199` | The *real* task-open flow, `teOpenTaskContext()` (task-engine.js:804+), unhides `#taskContextFlyout` itself at line 877 — it never calls `window.openTaskContext()`. This standalone function is a pre-`teOpenTaskContext` leftover with literally one caller anywhere: its own dead case. (`window.closeTaskContext`, its symmetric sibling, stays — it's genuinely live via the flyout's real `data-click="click_closeTaskContext"` CLOSE button, `index.html:7356`.) |
| 1072-1074 | `click_openSOPSnapshotCamera_packerz` | `window.click_openSOPSnapshotCamera_packerz(e)` | `packerz-module.js:2420-2424` | Leftover from the pre-unification Packerz SOP editor. The shared `buildUnifiedSopLayoutHTML()` (system-tools-module.js:2702) hardcodes `cameraClickAction = 'click_openSOPSnapshotCamera_production'` for **every** `sopType` including `'packerz'` — the packerz-specific variant was never wired after SOP-editor unification. Confirms it: this function's body now just sets `activeSOPTextAreaId = 'productionAdminQA'` — functionally identical to its `_production` sibling, since the `packerzAdminQA` id it would once have pointed at was already deleted as dead in Batch 6. |
| 1380-1382 | `click_openPrintSOP` | `window.openPrintSOP(...)` | `print-module.js:927-963` (+ binding `production-module.js:3393`) | Zero other caller of `openPrintSOP`/`window.openPrintSOP` anywhere. The 3-way fallthrough that *sounds* related (`click_window_printSOP` / `click_window_openPrintSOP_currentPri` / `click_window_openSopPrintModal_prod`, lines 348-356) calls `window.openSopPrintModal(...)`, a **different** function — not this one. Already-compliant `DOMPurify.sanitize()` print-window body is being deleted wholesale, not modified (see §4). |
| 1384-1386 | `click_movePackerzSOPUp` | `window.movePackerzSOPUp` | `packerz-module.js:1462` | Superseded by the unified, generic `moveSOPUp`/`click_moveSOPUp` (production-module.js:81, 330 — confirmed live, emitted for every SOP row type including Packerz rows in the shared row template). Zero other caller. |
| 1387-1389 | `click_movePackerzSOPDown` | `window.movePackerzSOPDown` | `packerz-module.js:1463` | Same story, superseded by `moveSOPDown`/`click_moveSOPDown` (production-module.js:82, 331). Zero other caller. |
| 1393-1395 | `click_removePackerzSOPRow` | `window.removePackerzSOPRow` | `packerz-module.js:1464` | Same story, superseded by `removeSOPRow`/`click_removeSOPRow` (production-module.js:84, 329). Zero other caller. |
| 1852-1856 | `change_teAssignCycle` | `window.teUpdateTaskCycle(taskId, cycleId)` | `task-engine.js:1365-1393` | Real, substantive function (writes `taskz.cycle_id` to Supabase) — **but** its sole UI trigger, the `#te-flyout-cycle` "Section/Cycle" `<select>`, was already confirmed to have zero DOM producer and its population logic deleted as dead scaffolding in **Batch 7** (`docs/plans/debt-nomenclature-remediation-7.md §5.5`, `task-engine.js:843-862`). This delegator case is the one remaining fragment of that already-resolved dead feature. Zero other caller. |
| 1904-1906 | `change_teChangeIdentity` | `window.teChangeIdentity(_userId)` | `task-engine.js:92-95` | Self-documented dead: `console.warn("teChangeIdentity is deprecated.")`, with an inline comment "Identity is now strictly tied to Supabase Auth session via `window.currentUser`." The planned "Simulate User" dropdown that would have emitted this (`docs/plans/feat/task-engine-p7.md`) was never built (zero DOM producer, zero other caller). |

### Bucket 2 — DELETE case block only (16 cases)
Handler function is confirmed **live** via a genuinely different, real path (another delegator case with a real emitter, or a direct in-file JS call) — deleting the orphaned case has zero effect on the function.

| Line | Token | Handler stays live via |
|---|---|---|
| 349 | `click_window_openPrintSOP_currentPri` | Duplicate fallthrough label sharing case 348's body (`click_window_printSOP`, live emitter `index.html:2125`) — deleting 349 leaves 348's identical behavior untouched. |
| 350 | `click_window_openSopPrintModal_prod` | Same fallthrough as above; this exact token's own emitter is gone (only found in an archived migration script, `scripts/archive/compact_sop_buttons.py`, not live code) — superseded by the shorter `click_window_printSOP` button. |
| 532-535 | `click_teToggleTaskDone` | `window.teToggleTaskDone` stays live via `click_teToggleTaskDoneInFlyout` (line 555-558, emitter `index.html:7363`) and `change_teToggleSubtaskDone` (line 1860-1863, emitter `task-engine.js:928`). |
| 569-571 | `click_window_openSOPMasterModal_bat` | `window.openSOPMasterModal` stays live via direct call `production-module.js:1789` plus the live cases at lines 318-322 (`click_window_openSOPMasterModal_prod`/`_packerz`, emitters `index.html:2077`/`2494`). |
| 978-982 | `click_addSOPRow_this` | `window.addSOPRow` stays live via `click_addSOPRow` (line 1084-1085, emitter literal at `production-module.js:83`) and `click_addDashboardSOPRow` (line 973-976). |
| 1019-1021 | `click_if_typeof_toggleHorizontalPrev_12` | Bare `toggleHorizontalPreview(...)` call — confirmed **not** a scope-mismatch bug (all `assets/js/*.js` + `index.html` load as classic, non-module `<script>` tags sharing one global object; `window.X = function(){}` assignments are always bare-callable). Function stays live via `click_toggleDashboardPreview` (931-935) and `click_toggleHorizontalPreview` (1574-1575). Auto-generated token name (`_12` suffix) matches the mechanical "inline-onclick-purge" migration script pattern (`docs/plans/refactor/inline-onclick-purge-production.md`), i.e. a raw, never-cleaned-up conversion artifact. |
| 1022-1026 | `click_addPackerzSOPRow_this` | `window.addPackerzSOPRow` stays live via `click_addPackerzSOPRow` (line 1390-1391, emitter is a literal string embedded directly in `system-tools-module.js`'s `addRowClickAttr` JS variable) and a direct call at `packerz-module.js:2236`. |
| 1075-1077 | `click_openSOPSnapshotCamera_smart` | See §1 correction — live via `mousedown_smartPhotoPaste` (1706-1709, real emitter `production-module.js:95`). |
| 1196-1198 | `click_window_closeCycleCountManager` | `window.closeCycleCountManager` stays live via a direct internal call, `inventory-module.js:1480`. |
| 1202-1204 | `click_stopCycleCount` | Bare `stopCycleCount()` call — same non-module-scope reasoning as line 1019 (not a scope bug). `window.stopCycleCount` stays live via `inventory-module.js:1479`, the real phone-triggered `MOBILE_DISCARD_AND_BACK` broadcast handler (per Batch 4/5's analysis). |
| 1574-1576 | `click_toggleHorizontalPreview` | Function stays live via `click_toggleDashboardPreview` (931-935) and a direct call `packerz-module.js:2232`. |
| 1577-1579 | `click_deleteAllArchive` | Duplicate of the real, live `click_window_deleteAllArchive` (line 992-993, emitter `index.html:3905`) — both call the identical `window.deleteAllArchive()`. |
| 1694-1696 | `mousedown_initPackerzSopResize_event` | References 3 DOM ids (`packerzSopLeftPane`/`packerzSopSplitWrapper`/`packerzSopPreviewCol`) that were **already deleted in Batch 6** (`packerzSopSplitWrapper` explicitly confirmed removed, `docs/plans/debt-nomenclature-remediation-6.md:271`). `window.initUnifiedSopResizer` itself stays fully live via `mousedown_initProductionSopResize_event` (1691-1693) and `mousedown_initLiveSopResize_event` (1697-1701), which use the real, currently-rendered `productionSopLeftPane`/`sopViewerLeftPane` ids. |
| 1844-1846 | `change_window_updateCcMngrStock` | See §1 correction — `window.updateCcMngrStock` is attached to `window` and has ~5 other live internal callers in `inventory-module.js`. |
| 1954 | `input_renderProductionTelemetryPrevi` (truncated/typo'd duplicate label) | Falls through to the same body as its live sibling case, `input_renderDashboardTelemetryPreview` (line 1955, emitter is a literal string embedded in `system-tools-module.js:2713`'s `mainInputHandler` variable) — deleting only the 1954 label line leaves 1955's identical behavior untouched. |
| 2060-2062 | `focus_storeOldVal_this` | Bare `storeOldVal(el)` call — `function storeOldVal(cell){}` (`index.html:5739`) is a true top-level global (same non-module-script reasoning as lines 1019/1202), confirmed **not** a scope bug. Stays live via its wrapper `window.focus_storeOldVal` (`index.html:7727-7728`, itself also a bare `storeOldVal(cell)` call), invoked by the live case `focus_storeOldVal` (2057-2058, emitters `index.html:5728` and `sales-module.js:873`). |

### Bucket 3 — DELETE case block only, handler function never existed anywhere / already fully removed elsewhere (11 cases)
Zero emitter **and** zero function definition anywhere in the repo (confirmed via repo-wide grep, not just the delegator file). None of these are reachable by any live UI path today, so none constitute a "live, currently-reachable functional bug" under the task's flagging criterion — they are confirmed-inert, and in three cases (marked *) directly corroborated by evidence that the surrounding feature was already, separately confirmed dead in an earlier batch.

| Line | Token | Handler referenced | Evidence it never existed / is already gone |
|---|---|---|---|
| 162-164 | `click_teCloseTaskContext` | `window.teCloseTaskContext()` | Zero definition anywhere. The real close path is `window.closeTaskContext()` (task-engine.js:2201, live via `click_closeTaskContext`, `index.html:7356`) — a different, working token. |
| 563-565 | `click_teToggleSubtask` | `window.teToggleSubtask(...)` | Zero definition anywhere. Superseded — subtask-done toggling is handled by the live, reused `window.teToggleTaskDone` (see Bucket 2, line 532) via `change_teToggleSubtaskDone`. |
| 925-927 | `click_openMediaManager_telemetry` | bare `openMediaManager('telemetry')` | Zero definition anywhere (`function openMediaManager`, `openMediaManager =`, and `window.openMediaManager =` all absent). `docs/plans/refactor/inline-onclick-purge-production.md:31` confirms an inline `onclick="openMediaManager('telemetry')"` handler existed historically and was mechanically migrated to this exact orphaned token — the underlying function has since been deleted/renamed without anyone cleaning up this case. Superseded by the different, live `openMediaModal` (singular; production-module.js:30, live via `click_openVideo`/`click_openImage`). |
| 1134-1136 | `click_printPackerzSOP_legacy` *| bare `printPackerzSOP()` | Zero definition anywhere. `CHANGELOG.md:431` documents this token's own history: it was renamed from a duplicate `'click_printPackerzSOP'` case label specifically to "restore correct event routing and **eliminate unreachable dead code**" — i.e. it was already dead (shadowed by the first, still-live `click_printPackerzSOP` case at line 362) *before* the rename. `tools/SK8Lytz_App_Master_Reference.md:780` corroborates: "New DOM elements must only ever reference the L275 [live] case." |
| 1199-1201 | `click_window_saveManualCycleCount` | `window.saveManualCycleCount()` | Zero definition anywhere — independently re-confirmed by **Batch 9**, which deleted the function's last other reference (a dead `else`-branch inside `MOBILE_SAVE_COUNT`, `docs/plans/debt-nomenclature-remediation-9.md §5.3`) and explicitly noted "it has zero actual definition anywhere." This case is the final remaining fragment of that same already-resolved finding. |
| 1332-1334 | `click_openMediaManager` | `window.openMediaManager(...)` (guarded) | Same as line 925 — zero definition anywhere. See §1's correction; this token is genuinely one of the 35, not out of scope. |
| 2085-2087 | `blur_window_handleCcMngrTelemetryEd` | `window.handleCcMngrTelemetryEdit(el, 1)` | Zero definition anywhere (checked hard per the task's instruction — no typo'd/aliased variant found: grepped `CcMngrTelemetry`, `handleCc`, `ccMngr` broadly). All 5 variants are **unguarded** (no `typeof` check, unlike ~95% of this file's other cases) — if ever triggered they would throw, caught only by the outer `try/catch`. Part of the same already-largely-dead legacy "Cycle Count Manager" (`ccMngr*`) modal system progressively confirmed dead across Batches 4, 5, and 9 (`ccMngrSearch`, `ccMngrDropdown`, `ccMngrItemSelect`, `ccMngrQtyInput` all already deleted as ghosts/dead code in prior batches). |
| 2088-2090 | `blur_window_handleCcMngrTelemetryEd_16` | `window.handleCcMngrTelemetryEdit(el, 2)` | Same as above. |
| 2091-2093 | `blur_window_handleCcMngrTelemetryEd_17` | `window.handleCcMngrTelemetryEdit(el, 3)` | Same as above. |
| 2094-2096 | `blur_window_handleCcMngrTelemetryEd_18` | `window.handleCcMngrTelemetryEdit(el, 4)` | Same as above. |
| 2097-2099 | `blur_window_handleCcMngrTelemetryEd_19` | `window.handleCcMngrTelemetryEdit(el, 5)` | Same as above. |

**Bucket count check: 8 + 16 + 11 = 35.** ✓ matches the task's stated finding count.

### A note on the Bucket-3 philosophy shift vs. Batch 5 precedent
Batch 5 left `click_window_saveManualCycleCount` as "OUT OF SCOPE — stays (guarded no-op, `window.saveManualCycleCount` never defined anywhere)" — but at that time N2's orphan-detection didn't exist yet (the scanner-hardening fix that revealed all 35 of this batch's findings landed after Batch 5), and that batch's scope was a *different* span of code. Batch 9 then independently re-confirmed zero definition and closed out the function's other reference. This batch is the first with N2 visibility into these cases' *reachability* — every Bucket-3 item is now doubly-confirmed dead (zero emitter **and** zero definition), which is a stronger, more final basis for deletion than existed when the "stays" precedent was set. If the reviewer prefers to preserve the historical "stays, documented" posture for `click_window_saveManualCycleCount` specifically (as a matter of continuity with the earlier comment), that's a one-line change to this plan — flagging it here rather than silently overriding established language.

---

## 3. The 2 residual N1_GHOST_ID findings

### 3.1 `pcRouteBar` (`inventory-module.js:1398`) — **DELETE**

```js
// inventory-module.js, inside initializeCcSyncChannel()'s MOBILE_CONNECT handler
1398:   const routeBar = document.getElementById('pcRouteBar');
...
1407:   if (routeBar) routeBar.style.display = 'flex';
```

This is a residual fragment, not a separate live code path. Full chain of evidence:
1. `pcRouteBar` was meant to wrap a 3-way PC-side preview-routing selector (`pcRoutePhone`/`pcRoutePC`/`pcRouteBoth`), wired by `window.updateCCRouteUI()`.
2. **Batch 9** (`docs/plans/debt-nomenclature-remediation-9.md`, Finding 5) confirmed the entire cluster — `updateCCRouteUI()` plus its 3 buttons plus `pcRouteBar` — was a 100%-dead function body with no PC-side markup anywhere, and explicitly left it as an "ambiguous, product-decision-required" open item rather than resolving it unilaterally.
3. That product decision was subsequently made: `docs/plans/fix-cc-mobile-bridge-sync-bugs-1.md §5` records **"APPROVED: Option A (delete wholesale)"** — the user approved deleting `window.updateCCRouteUI` (was `inventory-module.js:1696-1741`) and its 2 call sites.
4. Confirmed shipped: `updateCCRouteUI`, `pcRoutePhone`, `pcRoutePC`, and `pcRouteBoth` are **all already gone** from `inventory-module.js` today (repo-wide grep finds them only in prior plan docs and the frozen `scripts/nomenclature-baseline.json` snapshot).
5. `pcRouteBar` alone survived because it's read in a **different function** (`MOBILE_CONNECT`, inside `initializeCcSyncChannel`) than `updateCCRouteUI()` itself — the prior fix's scope was deliberately narrow (`docs/plans/fix-cc-mobile-bridge-sync-bugs-1.md:96`: *"pcRouteBar is left completely untouched (Finding 5, do not resolve here)"*), not because it's a separate live feature.

Since the product decision to abandon the whole 3-way routing UI is already made and shipped, this is no longer an open ambiguity — it's the last 2 lines of an already-authorized deletion that fell outside a prior fix's narrow diff boundary. **Action: delete line 1398 (`const routeBar = ...`) and line 1407 (`if (routeBar) routeBar.style.display = 'flex';`).** `currentPreviewMode` (line 1333) and the rest of `MOBILE_CONNECT` are untouched — they're independently live per the prior fix's own findings.

### 3.2 `packerzAdminRecipeSelect` (`production-module.js:357`) — **NO ACTION (re-confirmed, stays unguarded)**

```js
// production-module.js, inside window.triggerSopDirectUpload
349:  let prodId = btn.getAttribute('data-prodid') || '';
350:  let sopType = btn.getAttribute('data-soptype') || 'batches';
352:  if (!prodId) {
353:      if (sopType === 'batches') { ... }
354:      } else if (sopType === 'packerz') {
357:          let sel = document.getElementById('packerzAdminRecipeSelect'); // ghost
358:          if (sel) prodId = sel.value;
359:      }
360:  }
361:  if (!prodId) prodId = 'unknown';
```

Re-verified: Batch 6's reasoning holds exactly as stated. The shared upload button template (`system-tools-module.js:2705`, `uploadBtn`) never sets `data-prodid` at all, so this fallback branch is genuinely reached for every Packerz-context upload — `sel` is always `null` (the `packerzAdminRecipeSelect` `<select>` was itself deleted as dead legacy UI in Batch 6), so `prodId` always falls through to `'unknown'`. Guarding the ghost read (e.g. repointing it at some other id) would not fix anything — there is no live "current Packerz recipe" selector id to point it at instead; the real fix is giving the upload button a correct `data-prodid` (or reading `window.currentActiveSopRecipe`/`currentActiveSopOrderId`), which is a functional change outside nomenclature-remediation scope, exactly as Batch 6 concluded. **No new `fix/*` ticket is being opened for this** — it was already flagged in Batch 6 and remains accurately described; re-flagging it a second time would be noise, not new information.

---

## 4. Security / XSS

`node scripts/xss-audit.js` expected: **0 violations before and after** — no-op confirmation, matching Batch 5/6/7/9 precedent for pure-deletion batches.

- `assets/js/system-event-delegator.js` has **zero** `innerHTML`/`insertAdjacentHTML`/`document.write`/`outerHTML` call sites at all (confirmed by the pre-task security scout and independently re-confirmed this session) — it's a pure dispatch table. All 35 deletions in this file carry zero XSS risk by construction.
- Every deleted handler function was individually checked for HTML-sink code:
  - `window.openTaskContext` — `classList` only, no HTML writes.
  - `window.click_openSOPSnapshotCamera_packerz` — sets a string variable + calls an untouched function, no HTML writes.
  - `openPrintSOP` (`print-module.js:927-963`) — the one function in this batch with an HTML-writing print-window pattern. It is **already fully compliant**: `const safe = DOMPurify.sanitize(html); win.document.write(safe);` — being **deleted wholesale, not modified**, so removing it carries zero risk either direction.
  - `movePackerzSOPUp`/`movePackerzSOPDown`/`removePackerzSOPRow` — pure DOM node reordering (`insertBefore`/`remove`), no HTML writes.
  - `window.teUpdateTaskCycle` — Supabase calls + arithmetic only, no HTML writes.
  - `window.teChangeIdentity` — `console.warn` only.
  - `pcRouteBar`'s deleted lines — `getElementById` + `.style.display=`, no HTML writes.
- No new `innerHTML`/`insertAdjacentHTML`/`document.write`/`outerHTML` call site is introduced anywhere in this batch. No `window.safeHTML ? ... : ...` ternary pattern is introduced. Nothing in this batch touches the FORBIDDEN_TERNARY surface at all.

**RLS implications:** none. The only Supabase-writing code being deleted (`teUpdateTaskCycle`'s `supabaseClient.from('taskz').update(...)`) never executed in practice (zero live callers, confirmed) — removing it has zero effect on any RLS-gated read/write pattern actually exercised in production. `taskz` remains fully live and writable via every other, unaffected Task Engine mutation path. No table, column, or policy is created, altered, or removed anywhere in this batch.

**Print-window DOMPurify:** the one print-window pattern in scope (`openPrintSOP`) is being deleted, not modified, and was already correctly guarded — no change to this batch's DOMPurify posture.

---

## 5. Vanilla JS / framework constraints

All edits are deletions of `case`/`break` blocks inside existing native `switch(action){}` dispatch blocks, or deletions of native `function`/`window.X = function` declarations using native DOM calls (`getElementById`, `classList`, `.style`, `insertBefore`/`remove`) and native Supabase client calls. No `var` present in any touched/deleted code, none introduced. No framework code, no build step, no new CSS utility classes. Web Bluetooth is not implicated anywhere in this batch (none of the 35 findings or 2 ghosts touch `navigator.bluetooth`).

One piece of Vanilla-JS-architecture verification specific to this batch: three of the 35 findings (lines 1019, 1202, 2060) involve **bare** (non-`window.`-prefixed) function calls the task flagged as a possible scope-mismatch risk. Confirmed via direct inspection that `index.html` and every `assets/js/*.js` module load as classic (non-`type="module"`) `<script>` tags sharing one global object — `window.X = function(){}` assignments and top-level `function X(){}` declarations are both true globals, callable bare from any other script on the page. None of the three are scope-broken; all three resolve correctly if ever triggered (they simply never are, due to the missing emitter).

---

## 6. 4-state UX / UI mutex / zero-refresh

**4-state UX:** not applicable. Every deletion in this batch removes either (a) permanently-unreachable dead code with no user-visible state at all, or (b) a duplicate case label whose live sibling preserves identical Loading/Error/Empty/Success behavior unchanged (lines 349-350, 1954). No render function's 4-state behavior changes.

**UI mutex:** the only deleted case wrapping `window.executeWithButtonAction(...)` is `click_window_saveManualCycleCount` (line 1199-1201) — but since it has zero live emitter and `window.saveManualCycleCount` was never defined, the mutex wrapper was already guaranteed to no-op before this deletion (matching Batch 9's identical conclusion for the same function). No live DB-mutation button loses mutex protection anywhere in this batch.

**Zero-refresh:** not applicable — no live render function (`teRenderTaskGrid`, `renderProductionTelemetryPreview`, `updateCcMngrStock`, etc.) is touched or needs re-invocation; every one of them keeps its exact current behavior. Only their unreachable dead *callers* are removed.

---

## 7. Schema / Master Reference / Topological integrity

**No Supabase table/column/RLS change anywhere in this batch.** `tools/SK8Lytz_App_Master_Reference.md`'s `## Database Schemas` section requires no edit.

**No button, modal, or UI element is created, deleted, or moved.** Every case/function deleted in this batch already had zero live HTML producer backing it (confirmed individually per §2/§3) — consistent with Batch 5-9 precedent, the Mermaid Architectural Blueprint topological-integrity rule does not apply to removing orphaned JS handlers with no HTML counterpart.

**Optional, pre-existing doc-drift correction found while tracing `openPrintSOP` (not required for this batch, flagged for transparency):** `tools/SK8Lytz_App_Master_Reference.md:779` currently states *"click_window_openPrintSOP_currentPri was ambiguous — the 3D Layerz print handler is now click_window_openLayerzPrintSOP_currentPri (calls window.openPrintSOP(currentPrintJob.part_name))."* This was already inaccurate before this batch — `click_window_openLayerzPrintSOP_currentPri` (system-event-delegator.js:593-597, live, not one of the 35) actually calls `window.openSopPrintModal('production', cleanName)`, never `window.openPrintSOP`. After this batch deletes `openPrintSOP` entirely, the doc's reference becomes doubly stale (naming a function that no longer exists at all). Recommend a one-line correction in the same commit or a follow-up doc-sync at `/wind-down` — not blocking.

---

## 8. Expected scanner deltas

Going in: **N2_ORPHAN_HANDLER = 35** (all in `assets/js/system-event-delegator.js`), **N1_GHOST_ID** includes `pcRouteBar` + `packerzAdminRecipeSelect` (2 residual, out of the larger already-mostly-resolved `cc*`/legacy-SOP clusters from Batches 4-9).

| Finding | Before | After | Mechanism |
|---|---|---|---|
| N2_ORPHAN_HANDLER | 35 | **0** | 35 case-block deletions (§2, Buckets 1-3) |
| N1_GHOST_ID — `pcRouteBar` | 1 | **0** | §3.1 deletion |
| N1_GHOST_ID — `packerzAdminRecipeSelect` | 1 | 1 (unchanged) | §3.2 — deliberately untouched, re-confirmed |

No new N1/N2/N4/N5 findings are expected to be introduced (no new `getElementById`, no new delegator case, no new non-`sk8lytz_` localStorage key, no new legacy-term text anywhere in this batch's diff).

---

## 9. Files Touched

- `assets/js/system-event-delegator.js` — all 35 case-block deletions (§2, Buckets 1-3).
- `assets/js/task-engine.js` — delete `window.openTaskContext` (2194-2199), `window.teUpdateTaskCycle` (1365-1393), `window.teChangeIdentity` (92-95).
- `assets/js/packerz-module.js` — delete `window.click_openSOPSnapshotCamera_packerz` (2420-2424), `window.movePackerzSOPUp` (1462), `window.movePackerzSOPDown` (1463), `window.removePackerzSOPRow` (1464).
- `assets/js/print-module.js` — delete `function openPrintSOP(pName)` (927-963).
- `assets/js/production-module.js` — delete the `window.openPrintSOP = ...` binding line (3393). (`packerzAdminRecipeSelect` at line 357 is explicitly **not** touched, §3.2.)
- `assets/js/inventory-module.js` — delete `pcRouteBar` read (1398) and its guarded usage (1407), §3.1.
- `eslint.config.mjs` — **optional** Boy-Scout tidy: remove 3 now-fully-stale global declarations whose last live reference is deleted by this batch — `"openMediaManager"` (line 198), `"openPrintSOP"` (line 203), `"printPackerzSOP"` (line 215). Not required for lint to pass; purely hygiene.
- `tools/SK8Lytz_App_Master_Reference.md` — **optional**, not required this batch: correct the pre-existing stale `openPrintSOP` attribution at line 779 (§7).

Not touched: `tools/nomenclature-registry.json` (N2 has no allowlist mechanism to update), `docs/nomenclature_dictionary.md` (auto-derived from the registry, which isn't changing), `scripts/nomenclature-baseline.json` (left frozen, consistent with Batches 1-9's standing deferral), `tools/SK8Lytz_Bucket_List.md` / Master Reference `## Database Schemas` (ledger-exempt / no schema change).

---

## 10. Recommended implementation order (micro-commit cadence per CLAUDE.md)

1. `assets/js/system-event-delegator.js` — all 35 deletions in one pass (single file, mechanical, low-risk once this plan is approved); commit as `refactor(nomenclature-remediation): [batch] delete 35 orphaned N2 delegator case blocks`.
2. `assets/js/task-engine.js` deletions — one commit.
3. `assets/js/packerz-module.js` deletions — one commit.
4. `assets/js/print-module.js` + `assets/js/production-module.js` (`openPrintSOP` function + its binding line travel together) — one commit.
5. `assets/js/inventory-module.js` (`pcRouteBar`) — one commit.
6. Optional `eslint.config.mjs` tidy — one commit, clearly labeled `chore:`.
7. Optional Master Reference doc correction — one commit, clearly labeled `docs:`.

After each commit, re-run `node scripts/nomenclature-audit.js --warn` to confirm the expected delta from §8 before proceeding to the next.
