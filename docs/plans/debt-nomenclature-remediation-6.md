# debt/nomenclature-remediation — Batch 6: `packerz*` N1_GHOST_ID cluster (Admin Dashboard orphan + inline-fallback surgery)

## 0. Why this plan overrides the mapper's table wholesale

The explore-mapper's "Action" column recommended **Allowlist** for every id in this cluster, including ids it itself tagged GHOST+DEAD. Per the registry's own semantics (`tools/nomenclature-registry.json` meta), `dynamic_id_allowlist` means *"this id genuinely exists at runtime; the scanner just can't statically see it."* An id with **zero producer anywhere, reachable or not** is not a scanner blind spot — it's dead code, and allowlisting it would be a lie baked into a security/lint registry. I re-traced every claim myself (producers, callers, delegator emitters, script load order) before assigning a category. Findings below diverge from the mapper's table in several places — each divergence is evidenced with file:line.

**Fix-category taxonomy used throughout (per the epic's precedent, Batches 1-5):**
- **(a) REGISTRY ALLOWLIST** — only ids with a verified real producer (static or dynamic) the scanner can't statically see.
- **(b) DEAD-CODE DELETION** — reads inside functions with zero live callers.
- **(c) IN-FUNCTION SURGERY** (deferred by precedent unless trivial) — ghost reads inside live functions.
- **(d) LEAVE AS FINDING** — neither applies cleanly (usually because it's tangled with something outside nomenclature scope, e.g. a functional bug).

---

## 1. The `loadPackerzSopFromDB` contradiction — RESOLVED

**Verdict: the mapper's "dead workflow" call was correct, and Batch 5's test-guide-generator was wrong to cite it as live.** Two entirely separate PACKERZ SOP editing surfaces exist in this codebase, and they got conflated:

| Surface | Entry point | Backing code | Status |
|---|---|---|---|
| Fullscreen "📝 PACKERZ SOP EDITOR" modal | `index.html:2494` button → `data-click="click_window_openSOPMasterModal_packerz"` → `system-event-delegator.js:321-322` → `window.openSOPMasterModal('packerz')` | `production-module.js`'s `openSOPMasterModal`/`renderMasterSOP` (117-304), calling the **shared** `window.buildUnifiedSopLayoutHTML({sopType:'packerz', ...})` (`system-tools-module.js:2634-2775`) | **LIVE** — this is the real, currently-shipped PACKERZ SOP editor. |
| "Packerz Admin" inline dashboard | *(no button — see below)* | `packerz-module.js`'s `initPackerzAdmin`/`filterPackerzAdminDropdown`/`openPackerzAuditLog`/`renderPackerzTelemetryPreview`/`loadPackerzSopFromDB`/`savePackerzSOPToDB` (1482-1849) | **DEAD** — its anchor DOM (`packerzAdminRecipeSelect`) was removed from `index.html` at some point in the past; the JS backing was left behind, guarded, silently no-op. |

Proof the second surface is dead: `document.getElementById('packerzAdminRecipeSelect')` (read at `packerz-module.js:1484, 1510, 1720, 1802`) has **zero HTML producer anywhere in the repo** (`index.html` grep: zero hits for `id="packerzAdminRecipeSelect"`). Every one of the 6 functions in that cluster opens with (or is gated behind) a guard on this element:
- `initPackerzAdmin` (1483-1504): `if(!ddl) return;` — always returns.
- `filterPackerzAdminDropdown` (1509-1513): `if (!recipeSelectEl) return;` — always returns, never reaches its `loadPackerzSopFromDB()` call.
- `loadPackerzSopFromDB` (1719-1799): `if (!recipeSelectEl) return;` — always returns before touching `buildUnifiedSopLayoutHTML`, `packerzSopEditorArea`, or its `pack_ship_sops` Supabase query.
- `savePackerzSOPToDB` (1801-1845): `if (!recipeSelectEl) return alert(...)` — always alerts, never reaches its `pack_ship_sops` upsert.
- `renderPackerzTelemetryPreview` (1546-1706): reads `packerzAdminQA`/`packerzAdminQAPreview` (also zero producers anywhere) — reachable only via `input_renderPackerzTelemetryPreview` (delegator case `system-event-delegator.js:1979-1981`, **zero `data-input` emitters anywhere**) or a `system-realtime-sync.js:74` lookup-table entry that is **never actually queued** (confirmed: zero `queueRender('renderPackerzTelemetryPreview')` calls anywhere; the live `pack_ship_sops`-table realtime handler at `system-realtime-sync.js:533-535` queues `renderSOPAuditLogRows` instead, a different, live feature — see §3).
- `openPackerzAuditLog` (1515-1544): **zero callers anywhere**, not even a delegator case (confirmed full-repo grep) — more dead than the rest, discovered incidentally while tracing this cluster.

This closes the "contradiction": the earlier test guide's entry point citation was simply the wrong function for the wrong modal. The two systems share no DOM ids (`packerzAdminQA` ≠ `productionAdminQA`; `packerzSopSplitWrapper` ≠ `productionSopSplitWrapper`), so there is zero cross-contamination risk in deleting the dead one.

**Historical corroboration:** `docs/plans/fix-dead-ui-wiring-1.md` (an earlier, already-executed Phase-0 task) already added the null-guards visible today to these exact functions, specifically *because* they were previously unguarded crash risks. That confirms this cluster's "already dead, already-guarded" state predates this batch — this is dead-code removal, not a live bug fix.

**Table `pack_ship_sops` remains fully in active use** by the live `renderMasterSOP`/`saveMasterSOP` (production-module.js:254, 268, 477, 482) and by the live `loadSOPAuditLog`/`openSOPAuditLog` (packerz-module.js:2300, 2311). Deleting these two dead consumers has no schema/RLS implication — see §7.

---

## 2. REGISTRY ALLOWLIST — 3 verified real producers

`buildUnifiedSopLayoutHTML` (`system-tools-module.js:2634-2775`) is confirmed **LIVE** (called from `production-module.js:294` inside `renderMasterSOP`, itself reached via the real "📝 PACKERZ SOP EDITOR" / "📝 BATCHEZ SOP EDITOR" / "📝 LAYERZ SOP EDITOR" buttons — `index.html:2077, 2169, 2494`). In its EDIT-mode branch it does:

```js
// system-tools-module.js:2704-2706
const qaTextareaId = 'productionAdminQA';
const qaPreviewId = 'productionAdminQAPreview';
const rowsWrapperId = sopType === 'packerz' ? 'packerzSopEditorArea' : 'sopMasterEditorArea';
```
...then embeds them as `id="${qaTextareaId}"` (line 2757), `id="${qaPreviewId}"` (line 2763), `id="${rowsWrapperId}"` (line 2726).

**Why the scanner can't see these:** `collectDomIdDeclLine`'s template regex (`RE_ID_ATTR_TEMPLATE = /\bid=["']([^"'\`]*?)\$\{/g`) only registers a producer when there is **non-empty static text before `${`**. Here the interpolation starts immediately after `id="` — the captured prefix is `''`, which the `if (m[1])` check discards. So the scanner never learns these ids exist, even though the producer is 100% real and reachable. This is architecturally different from every existing `dynamic_id_allowlist` entry (all of which are prefix/suffix patterns of `'text' + var` or `` `text${var}` `` form) — there is no prefix here at all, just a bare variable holding a fixed literal. I'm introducing a new `resolution_type: "js-variable-literal"` to document this distinctly (no existing category fits).

`packerzSopEditorArea` is read live at `packerz-module.js:1478` (inside `addPackerzSOPRow`, kept — see §4.1) and, before deletion, at the now-dead `packerz-module.js:1739`. `productionAdminQA`/`productionAdminQAPreview` are read live at `production-module.js:462` (`saveMasterSOP`) and `production-module.js:2779-2780` (`renderProductionTelemetryPreview`, itself invoked from live `renderMasterSOP:302`).

**Note on `sopMasterEditorArea`** (the other half of the `rowsWrapperId` ternary): it is *never* read via a literal `getElementById('sopMasterEditorArea')` call anywhere (only via the bare `areaId`/`targetContainer` variables at `production-module.js:320, 460`, `classifyLookupArg` returns `dynamic-unresolvable` for those → not scanned, no finding today). It doesn't need an allowlist entry — it produces zero current findings — but it's an equally-real producer for the record.

### Registry edit — add to `dynamic_id_allowlist`

```json
{
  "pattern": "packerzSopEditorArea",
  "resolution_type": "js-variable-literal",
  "evidence": ["assets/js/system-tools-module.js:2706,2726", "assets/js/packerz-module.js:1478"],
  "note": "Real, live producer. buildUnifiedSopLayoutHTML (system-tools-module.js:2634-2775, called live from production-module.js's renderMasterSOP via the real 'PACKERZ SOP EDITOR'/'BATCHEZ SOP EDITOR' buttons) assigns rowsWrapperId = sopType==='packerz' ? 'packerzSopEditorArea' : 'sopMasterEditorArea' (a closed 2-value ternary, not a suffix/prefix pattern) then interpolates it as id=\"${rowsWrapperId}\" with zero static prefix before '${' — the scanner's RE_ID_ATTR_TEMPLATE requires a non-empty prefix, so this producer is architecturally invisible to static scanning, not merely unreached. Read live at packerz-module.js:1478 inside addPackerzSOPRow. Not a wildcard/suffix family; exact-match pattern (no trailing '*') resolves via nomenclature-audit.js's compilePatterns exact-match branch."
},
{
  "pattern": "productionAdminQA",
  "resolution_type": "js-variable-literal",
  "evidence": ["assets/js/system-tools-module.js:2704,2757", "assets/js/production-module.js:462,2779"],
  "note": "Real, live producer — same buildUnifiedSopLayoutHTML mechanism as packerzSopEditorArea (unconditional literal this time, not a ternary: qaTextareaId = 'productionAdminQA'). Read live at production-module.js:462 (saveMasterSOP) and production-module.js:2779 (renderProductionTelemetryPreview, invoked from live renderMasterSOP:302). Exact-match pattern, not a wildcard family."
},
{
  "pattern": "productionAdminQAPreview",
  "resolution_type": "js-variable-literal",
  "evidence": ["assets/js/system-tools-module.js:2705,2763", "assets/js/production-module.js:2780"],
  "note": "Companion preview-container id to productionAdminQA — same producer, same call chain. Read live at production-module.js:2780 inside renderProductionTelemetryPreview.",
  "cross_ref": "dynamic_id_allowlist.productionAdminQA"
}
```

Regenerate `docs/nomenclature_dictionary.md` via `node scripts/generate-nomenclature-dictionary.js` immediately after this registry edit (clears `N7_DICT_STALE`, per Batch 4 precedent).

---

## 3. `paneFulfillzSopAdmin` — the `closeSOPAuditLog` item, fully reconciled (4 spots, not 1)

The task named `closeSOPAuditLog` (~2288) + its `index.html:5076` twin. Tracing the id fully surfaced **two more occurrences** of the exact same dead id, both in `system-event-delegator.js`, both auto-mangled-token orphan cases (the `click_document_getElementById_paneFu*` naming pattern is a known artifact — `docs/architecture/nomenclature-audit-engine.md:85`, FM-8, already documents `click_document_getElementById_paneFu` as "automated renaming already failed here once"). All 4 are part of the **same** removed feature (an old FULFILLZ sub-pane, `paneFulfillzSopAdmin`, whose markup no longer exists in `index.html` — `docs/master_reference.md:495` still describes it in prose as if it exists; see §7 for that finding).

| # | Location | Reachability | Verdict |
|---|---|---|---|
| 1 | `index.html:5076`, inside live `showFulfillzPane(paneId)` | Guarded (`if(document.getElementById(...))`), sibling to 3 other guarded pane-hide lines (5075, 5077, 5078) for panes that DO exist (`paneFulfillzPackerz`/`Barcodz`/`Labelz`) — this is the one that doesn't. Zero crash risk, permanent no-op. | **(c) trivial surgery** — delete the 1 line. |
| 2 | `packerz-module.js:2286-2289`, inside live `closeSOPAuditLog` | Gated behind `if (sopAuditReturnToPackerz)`. **Proven permanently unreachable**: `sopAuditReturnToPackerz` is only ever set via `openSOPAuditLog(fromPackerzPage)`'s parameter, and the **sole call site anywhere in the repo** (`system-event-delegator.js:678`) calls `openSOPAuditLog()` with zero arguments — so `fromPackerzPage` defaults `false`, forever. Not a producer gap, a dead branch. | **(c) trivial surgery** — delete the dead `if` block; bundle removal of the now-fully-vestigial `sopAuditReturnToPackerz` variable and `fromPackerzPage` param (Boy-Scout, zero risk, avoids leaving a write-only dead variable). |
| 3 | `system-event-delegator.js:674-676`, case `click_document_getElementById_paneFu` | Zero `data-click` emitters anywhere (confirmed). Unguarded body (`document.getElementById('paneFulfillzSopAdmin').style.display='flex'`) would throw if ever reached — but it's unreachable. | **(b) dead-code deletion** (orphan delegator case). |
| 4 | `system-event-delegator.js:1025-1027`, case `click_document_getElementById_paneFu_11` | Same as #3 (unguarded, zero emitters). | **(b) dead-code deletion.** |

Raw N1 occurrence count for this identifier today: **5** (index.html:5076 has the marker string `getElementById(` twice on one line → 2 raw findings; the other 3 spots are 1 each). All 5 clear to 0 after this batch.

---

## 4. Ghost fallbacks inside LIVE functions — verified case-by-case

### 4.1 `packerzLiveInlineRowsWrapper` + `packerzSopEditorRowsWrapper` in live `addPackerzSOPRow` (packerz-module.js:1478)

```js
let wrapper = document.getElementById('packerzLiveInlineRowsWrapper') || document.getElementById('packerzSopEditorRowsWrapper') || document.getElementById('packerzSopEditorArea');
```

`addPackerzSOPRow` is confirmed **LIVE** — wired via delegator case `click_addPackerzSOPRow` (`system-event-delegator.js:1399-1401`), emitted dynamically by `buildUnifiedSopLayoutHTML`'s "+ ADD PROCEDURE STEP" button when `sopType==='packerz'` (`system-tools-module.js:2707, 2727`) — i.e. it's the real add-row button inside the same live fullscreen editor from §2.

- `packerzLiveInlineRowsWrapper`: **zero producer anywhere**, confirmed (only this one read site + a pre-existing baseline entry). Pure dead fallback.
- `packerzSopEditorRowsWrapper`: has a literal producer **today**, but only inside `loadPackerzSopFromDB` (`packerz-module.js:1777, 1789` — the dead function being deleted in §1) and one read inside `savePackerzSOPToDB` (also deleted). **Load-bearing scanner-math trap**: today this id is *falsely* "resolved" (scanner sees the literal `id="packerzSopEditorRowsWrapper"` in dead code and marks it non-ghost). Once §1's deletion removes that producer, this same read at line 1478 would flip to a **brand-new** N1_GHOST_ID finding unless fixed in this same batch. It must be removed from the fallback chain here, not left behind.
- `packerzSopEditorArea`: the real, live-resolving option (§2) — this is what the line should reduce to.

**Fix:** simplify to `let wrapper = document.getElementById('packerzSopEditorArea');`. Zero behavior change — the first two options never resolved to a real element at runtime (their only "producer," dead code, never executed), so dropping them changes nothing observable; it only removes text the scanner can see.

### 4.2 `packerzLiveSopSplitWrapper`/`packerzLiveSopLeftPane` in live `doNeoSidebarResize` (neogleamz-engine.js:1165-1169)

```js
// Fallback logic for Packerz custom modal split
if(!sidebar && document.getElementById('packerzLiveSopSplitWrapper')?.offsetParent !== null) {
    activeWrapper = document.getElementById('packerzLiveSopSplitWrapper');
    sidebar = document.getElementById('packerzLiveSopLeftPane');
}
```

`doNeoSidebarResize` is unambiguously live (the universal BOM/task-engine sidebar-resize handler). Both ids have **zero HTML producer** (only CSS *selector* references at `index.html:1013-1014, 1067-1068` inside `@media` blocks — these prove the ids *used to* back a real element, but a CSS rule targeting a nonexistent id is inert, not a producer the scanner recognizes, and not a crash risk).

**Proven inert today, provably, not just probably:** `document.getElementById('packerzLiveSopSplitWrapper')` is always `null`; `null?.offsetParent` short-circuits to `undefined`; `undefined !== null` is `true`. So the guard is equivalent to just `!sidebar` — the block always *executes* whenever the primary `.bom-layout` check fails, but its body reassigns `activeWrapper`/`sidebar` to `null`/`null` (since both ids are ghost), which is exactly the same state they were already in. The following, separate Kanban fallback (lines 1171-1175, real producers at `index.html:2502, 2504` — untouched) is unaffected either way, since it re-checks `!sidebar` independently. Deleting this block is a proven, not assumed, no-op.

**Fix:** delete lines 1165-1169 (comment + if-block) entirely.

### 4.3 `btnPackerzSopSignoff` in live `checkPackerzSopSignoffState` (packerz-module.js:1011)

```js
const btnSignoff = document.getElementById('btnSopSignoff') || document.getElementById('btnPackerzSopSignoff');
```

`checkPackerzSopSignoffState` is heavily live (called from 8+ real sites across the packerz QA flow). `btnSopSignoff` is a real, live, literal producer — `system-tools-module.js:2685`, inside `buildUnifiedSopLayoutHTML`'s VIEW-ONLY branch (`<button id="btnSopSignoff" ... data-click="click_signoffPackerzQA">`), which is exactly the button rendered whenever the QA checklist view (this function's own target) is on screen. `btnPackerzSopSignoff` has zero producer anywhere — legacy naming debris from before some historical rename, never reachable since the first option always wins whenever this code path is relevant.

**Fix:** simplify to `const btnSignoff = document.getElementById('btnSopSignoff');`. Zero behavior change (guarded by `if(btnSignoff)` immediately after either way).

### 4.4 `sopModalWrapper` in `executeSopPrint` — live, NOT dead; mapper's "dead" tag is wrong

**Important correction to the mapper's claim.** `window.executeSopPrint` is defined **twice**: `packerz-module.js:884` and `production-module.js:2446`. Script load order (`index.html:6257-6258`) loads `packerz-module.js` *before* `production-module.js`, so **`production-module.js`'s definition wins** (the one containing the `sopModalWrapper` reads) — it is the function that actually runs in production today, reached live via the real "🖨️ Print" button chain: `click_printActiveSOP` (`system-event-delegator.js:939-943`) → `openSopPrintModal(...)` → print-options-modal buttons `click_executeSopPrint_checklist/richtext/full` (`index.html:7731,7738,7745`, real markup) → `window.executeSopPrint(mode)`. Its own first lines delegate to `window.executePackerzSopPrint` (an alias captured from packerz-module.js's original definition, preserved before being shadowed) when `window.activePrintContext === 'packerz'` — otherwise it runs its own body, which is where `sopModalWrapper` lives. **This branch executes for real, every time a user prints a BATCHEZ/LAYERZ SOP.** The mapper's "dead" verdict is wrong; only the *identifier* `sopModalWrapper` is ghost (zero HTML producer anywhere, confirmed), not the containing code.

This is IN-FUNCTION SURGERY inside a live, business-critical function — the most delicate edit in this batch. It is provably safe via boolean algebra (each clause always evaluates to a fixed constant since the element never exists), not a guess:

```js
// Line 2459 — the sopModalWrapper clause is always true (element never exists → !null is true),
// so `A && B && C && true` simplifies to `A && B && C`:
if(!currentWO && typeof currentWO === 'undefined' && !window.activePrintTargetOverride
   && (!document.getElementById('sopModalWrapper') || document.getElementById('sopModalWrapper').style.display === 'none')) {
// becomes:
if(!currentWO && typeof currentWO === 'undefined' && !window.activePrintTargetOverride) {
```
```js
// Lines 2475-2478 — condition is always false (null && ... is always false) → the whole else-if is
// permanently dead, delete it entirely, no replacement needed:
} else if(document.getElementById('sopModalWrapper') && document.getElementById('sopModalWrapper').style.display !== 'none') {
    targetProductName = currentProductSOP || targetProductName;
    headerTitle = "SOP: " + targetProductName;
}
// (if-branch above it, `if (window.activePrintTargetOverride) {...}`, stays; just drop the else-if)
```
```js
// Line 2491 — the trailing !(...) clause always evaluates true → `A && B && C && true` simplifies:
if(currentWO && currentWO.routing && !window.activePrintTargetOverride
   && !(document.getElementById('sopModalWrapper') && document.getElementById('sopModalWrapper').style.display !== 'none')) {
// becomes:
if(currentWO && currentWO.routing && !window.activePrintTargetOverride) {
```

Raw occurrence count today: 6 (each of the 3 lines has the `getElementById(` marker twice). All 6 clear to 0.

**Extra verification requirement for this specific edit** (beyond the standard suite): after editing, manually diff `executeSopPrint` end-to-end and manually test printing a BATCHEZ SOP *and* a LAYERZ SOP (both routes through this simplified function; PACKERZ printing routes through the aliased `executePackerzSopPrint` and is unaffected).

---

## 5. Deletion — the full `packerz-module.js:1482-1849` span (368 lines, one contiguous block)

Tracing the boundary precisely: line 1480 (`}`) closes the live `removePackerzSOPRow`; line 1481 is blank; the dead cluster begins at 1482 and, unlike Batch 5's non-contiguous mess, is **one uninterrupted block** all the way to line 1849 (only blank lines and orphaned docblocks/comments separate the 6 dead functions — no live code is interleaved). Line 1850 begins the next section (`SOP MEDIA PICKER`), confirmed live (uses `window.activeSOPTextAreaId`/`productionAdminQA`, part of §2's live flow) — untouched.

| Function | Lines | Reachability |
|---|---|---|
| `// API: Initialize...` comment + `initPackerzAdmin` | 1482-1504 | Zero-reachable guard on `packerzAdminRecipeSelect` |
| `// Hook it universally!` + `setTimeout(initPackerzAdmin, 1500);` | 1505-1507 | Calls the dead function above |
| `filterPackerzAdminDropdown` | 1509-1513 | **Zero callers anywhere** (not even a delegator case — more dead than the rest) |
| `openPackerzAuditLog` | 1515-1544 | **Zero callers anywhere** (discovered incidentally, not in original task list) |
| `renderPackerzTelemetryPreview` | 1546-1706 | Zero live callers (§1) |
| `loadPackerzSopFromDB` | 1709-1799 (incl. docblock) | Zero-reachable guard on `packerzAdminRecipeSelect` (§1) |
| `savePackerzSOPToDB` | 1801-1845 | Zero-reachable guard on `packerzAdminRecipeSelect` (§1) |
| `// --- PACKERZ ADMIN: UI Split Pane Resizer ---` (already-orphaned banner — nothing follows it before the next real section) | 1847-1849 | N/A, pure debris |

**Delete lines 1482-1849 in full.**

### Companion delegator cleanup (`system-event-delegator.js`) — 4 non-contiguous spans, delete bottom-to-top

| Case | Lines | Emitters |
|---|---|---|
| `click_savePackerzSOPToDB` + `click_document_getElementById_paneFu_11` (adjacent, one combined 6-line span) | 1022-1027 | Zero for both |
| `change_loadPackerzSopFromDB` | 1847-1849 | Zero |
| `input_renderPackerzTelemetryPreview` | 1979-1981 | Zero |
| `click_document_getElementById_paneFu` | 674-676 | Zero (§3) |

Delete in this order — **1979-1981, then 1847-1849, then 1022-1027, then 674-676** — to avoid line-drift (matches Batch 5's bottom-to-top discipline). Each span includes its trailing `break;` (Batch 5's load-bearing correction: an orphaned `break;` after the prior case's own `break;` is a likely new ESLint `no-unreachable` error).

**N2_ORPHAN_HANDLER note:** per Batch 5's own confirmed finding, `checkN2`'s indirect-match exemption (`allStringLiterals.has(token)`) self-satisfies on a case's own `case 'token':` string literal — the rule is structurally unable to fire on switch-case-only removals. **Do not predict any N2 delta from these 4 deletions** (matches precedent exactly; this is not new information, just re-applying Batch 5's documented scanner limitation).

### `eslint.config.mjs` — remove 3 stale globals (verify by exact string match, not line number alone)

- Line 188: `"loadPackerzSopFromDB": "writable",`
- Line 238: `"renderPackerzTelemetryPreview": "writable",`
- Line 255: `"savePackerzSOPToDB": "writable",`

Checked: `initPackerzAdmin`, `filterPackerzAdminDropdown`, `openPackerzAuditLog` are **not** declared as globals here (eslint only lints `.js` files per its config's `ignores` list — index.html's inline script, the only place `initPackerzAdmin` is called bare, is never parsed by eslint — so no declaration was ever needed for them). No further removal required. `closeSOPAuditLog`/`filterSOPAuditLog`/`openSOPAuditLog`/`addPackerzSOPRow` (live, untouched) stay declared — do not touch those lines.

### Optional bonus (recommend including, zero additional risk): `system-realtime-sync.js:74`

```js
if (name === 'renderPackerzTelemetryPreview') return typeof window.renderPackerzTelemetryPreview === 'function' ? window.renderPackerzTelemetryPreview : null;
```
This `getGlobal` lookup-table entry is never actually invoked (`queueRender('renderPackerzTelemetryPreview')` has zero call sites anywhere — the live `pack_ship_sops` realtime handler queues `renderSOPAuditLogRows` instead, §3). It's already guarded (`typeof ... === 'function' ? ... : null`), so leaving it is zero-crash-risk even after `renderPackerzTelemetryPreview` is deleted — but it becomes a dangling name reference to nothing, worth a 1-line removal in the same commit as the function's own deletion.

---

## 6. Explicitly NOT touched — residual/out-of-scope findings, flagged for the record

These surfaced during tracing but do not belong in a nomenclature-remediation batch:

1. **`production-module.js:352-356` (`triggerSopDirectUpload`), reads `packerzAdminRecipeSelect`** — same dead-anchor pattern as the whole §1 cluster (1 remaining raw N1 occurrence for this identifier after this batch), BUT it's entangled with a **discovered functional bug**: `buildUnifiedSopLayoutHTML`'s upload button (`system-tools-module.js:2712`) never sets `data-prodid`, so in PACKERZ mode `prodId` always falls through to `'unknown'` — meaning packerz SOP media uploads today always file under `sops/packerz/unknown/...` instead of the actual recipe folder. Fixing the ghost-id fallback here without fixing the missing `data-prodid` attribute would just swap one silent failure mode for another. **Leave as finding** — recommend a dedicated `fix/*` bug task, not folded into this nomenclature batch.
2. **`system-event-delegator.js:1028-1030` (`click_if_typeof_toggleHorizontalPrev_12`)** and **`:1031-1035` (`click_addPackerzSOPRow_this`)** — both reference `packerzSopLeftPane`/`packerzSopPreviewCol` (never counted by N1 — they're passed as function *arguments*, not `getElementById(...)` literals, so they're scanner-invisible either way) and a zero-emitter orphan case respectively. Neither touches an N1 identifier this batch is scoped to fix. Flagged as N2 candidates for a future pass, not pulled in here to keep this batch's diff reviewable.
3. **`neogleamz-engine.js:1217-1218`, `restoreNeoSidebarSizes`'s `idsToRestore` array containing `'packerzLiveSopLeftPane'`** — dead entry (the id it restores from `localStorage` never exists), but accessed via a `for...of` bare variable (`document.getElementById(id)`), so it's never scanned/flagged by N1 either way. Zero scanner benefit to touching it. Left alone.
4. **`docs/master_reference.md:495`** (a *different* file from the CLAUDE.md-mandated `tools/SK8Lytz_App_Master_Reference.md`) still describes `paneFulfillzSopAdmin` in prose as an existing "Blueprint Editor" feature. This is now confirmed stale (§3) — the *feature concept* (QA gating before order completion) still exists via `checkPackerzSopSignoffState`/the live inline and fullscreen SOP editors, just not under this id/pane. Not touched — out of scope (different doc, not the one CLAUDE.md's Corporate-brain-sync rule targets), flagged for a future documentation-accuracy pass.

---

## 7. Security / XSS

Zero touch to any `innerHTML`/`insertAdjacentHTML`/`outerHTML`/`document.write` *logic* — every such call inside the deleted 368-line span already uses the compliant `window.safeHTML(...)` pattern (verified line-by-line: `packerz-module.js:1497, 1499-1501, 1542-1543, 1552-1554, 1684, 1742-1744, 1750-1753, 1781, 1789-1790, 1792-1795` — all guarded, none `FORBIDDEN_TERNARY`, none unguarded dynamic-data). This batch **removes** already-compliant code; it introduces none. All other edits (§3, §4) are pure `.style.display`/DOM-reference/boolean-logic changes — zero XSS surface touched. `node scripts/xss-audit.js` expected: 0 violations before and after (no-op confirmation, not a fix).

**RLS implications:** none. `pack_ship_sops` remains fully live via `renderMasterSOP`/`saveMasterSOP`/`loadSOPAuditLog`/`openSOPAuditLog` — no table/column/RLS policy is created, altered, or removed. The two deleted consumers (`loadPackerzSopFromDB`'s `select`, `savePackerzSOPToDB`'s `upsert`) never executed in practice (dead-guarded), so removing them has zero effect on any RLS-gated read/write pattern actually exercised in production.

**Print-window DOMPurify:** not applicable — no print-window `document.write` path exists in any edited/deleted code (the `executeSopPrint` edits in §4.4 are boolean-condition simplifications only, not touching its print-window construction logic further down the function, which is untouched).

---

## 8. Vanilla JS / framework constraints

All edits remove or simplify native `function`/`window.X = function` declarations and native DOM (`getElementById`, `.style`, `querySelectorAll`) — no `var` present in any touched code, none introduced. No framework code, no build step, no new CSS utility classes. The registry/dictionary edits are JSON/generated-Markdown. `system-event-delegator.js` edits are plain `switch`/`case` removals. No Web Bluetooth surface touched.

## 9. 4-state UX / UI mutex / zero-refresh

Not applicable to the deleted cluster (§1, §5) — it was never reachable, so no user-visible Loading/Error/Empty/Success state exists to preserve or break; no DB-mutation button becomes newly reachable or unreachable (both Supabase calls inside it — `pack_ship_sops` select/upsert — never fired in practice). The `paneFulfillzSopAdmin` fixes (§3) and in-function surgeries (§4) touch zero rendered UI (all four are guarded no-ops or provably-dead branches today; deleting them changes no user-observable state, loading indicator, or button behavior). `checkPackerzSopSignoffState`/`addPackerzSOPRow`/`doNeoSidebarResize`/`executeSopPrint` keep their exact current 4-state/mutex/zero-refresh behavior — none of that logic is touched, only the dead-fallback tail ends of their DOM lookups.

## 10. Schema / Master Reference / Topological integrity

No Supabase table/column/RLS change. `tools/SK8Lytz_App_Master_Reference.md` `## Database Schemas` section unaffected — confirmed zero mentions anywhere in that file of any identifier/function touched by this batch (verified via grep). No button, modal, or UI element is created, deleted, or moved by this batch — every deleted/edited reference already had zero live HTML producer (the Mermaid Architectural Blueprint topological-integrity rule does not apply to removing orphaned JS handlers with no HTML counterpart, same reasoning as Batch 5). `docs/master_reference.md` (a separate, non-CLAUDE.md-mandated doc) has one stale line flagged in §6.4 but is not edited by this batch.

---

## 11. Expected scanner deltas

**Baseline going in: N1_GHOST_ID = 109** (per Batch 5's addendum). Math below counts **raw occurrences** (the scanner's actual counting unit — confirmed by re-reading `collectDomIdLookupLine`'s per-marker-occurrence loop and `printReport`'s un-deduped `findings.length` — matches how Batch 5's own 141→109 number was derived), not deduped identifiers. **Predicted conservatively; treat as Medium confidence given the multi-occurrence-per-line counting involved — run the real scan and report actuals, per Batch 4/5 precedent of never hardcoding a promised number as gospel.**

| Identifier | File(s) | Before | After | Mechanism |
|---|---|---|---|---|
| `packerzAdminRecipeSelect` | packerz-module.js (4) + production-module.js (1) | 5 | **1** | 4 deleted with §5 span; 1 (production-module.js:~357) left as finding (§6.1) |
| `packerzAdminQA` | packerz-module.js | 1 | **0** | Deleted with §5 span |
| `packerzAdminQAPreview` | packerz-module.js | 1 | **0** | Deleted with §5 span |
| `packerzSopSplitWrapper` | packerz-module.js | 1 | **0** | Deleted with §5 span |
| `packerzSopEditorArea` | packerz-module.js (2 raw: 1478 kept, 1739 deleted) | 2 | **0** | 1 via §5 deletion, 1 via §2 allowlist |
| `productionAdminQA` | packerz-module.js (4, deleted) + production-module.js (2, kept) | 6 | **0** | 4 via §5 deletion, 2 via §2 allowlist |
| `productionAdminQAPreview` | production-module.js | 1 | **0** | Via §2 allowlist |
| `packerzLiveInlineRowsWrapper` | packerz-module.js | 1 | **0** | Via §4.1 surgery |
| `packerzSopEditorRowsWrapper` | packerz-module.js | 0 (false-negative today) | **0** | Producer deleted (§5) AND reader simplified (§4.1) in the same batch — net zero, no new finding introduced |
| `packerzLiveSopSplitWrapper` | neogleamz-engine.js | 1 | **0** | Via §4.2 surgery |
| `packerzLiveSopLeftPane` | neogleamz-engine.js | 1 | **0** | Via §4.2 surgery |
| `btnPackerzSopSignoff` | packerz-module.js | 1 | **0** | Via §4.3 surgery |
| `sopModalWrapper` | production-module.js | 6 (2 per line × 3 lines) | **0** | Via §4.4 boolean-simplification surgery |
| `paneFulfillzSopAdmin` | index.html (2) + packerz-module.js (1) + system-event-delegator.js (2) | 5 | **0** | Via §3 (1 delete, 1 in-function surgery, 2 delegator-case deletions) |
| **Total N1_GHOST_ID** | | **109** | **~78** (−31) | |

| Rule | Before | After | Confidence |
|---|---|---|---|
| `N1_GHOST_ID` | 109 | **~78** | Medium — per-occurrence math shown above, verify with real scan |
| `N1_GHOST_ID_PREFIX` | (unaffected — check current value at execution time) | unchanged | High — no `prefix`-kind lookups touched (all edits here are `literal`-kind ghost ids) |
| `N2_ORPHAN_HANDLER` | (unaffected) | unchanged | High — per Batch 5's confirmed structural limitation (switch-case tokens self-satisfy the indirect exemption), do not predict a decrease |
| `N7_DICT_STALE` | 0 | 0 → possibly 1 → 0 | High — registry edited (§2), regenerate dictionary in the same commit, must land at 0 |
| `N3_LABEL_DRIFT` | (unaffected) | unchanged | High — not touched |
| `N4_LEGACY_TERM` | (unaffected) | unchanged | High — none of the 5-term watchlist (`Salez/Nexl/Salz/Bridge/Prod`) appears in any deleted/edited identifier vocabulary here (packerz/production/sop/admin/audit/signoff/wrapper terms only) |
| `N5_NEW_NONCONFORMANT_KEY` | (unaffected) | unchanged | High — no localStorage key touched |
| `N6_UNUSED_CSS` | (unaffected) | unchanged | Medium — not specifically audited this batch; no `.cc-dropdown-item`-style JS-injected class touched inside the deleted span (verify at execution if any `.packerz-qa-*` classes lose their only usage — quick grep recommended before commit) |

**Known pre-existing false positive, do not chase:** the N7=1 CRLF finding noted in Batch 5's ledger note is pre-existing and unrelated to this batch's files.

---

## 12. Verification checklist

1. `npm test` → 59/59 passing (unchanged). Confirmed zero test references to any deleted identifier (`loadPackerzSopFromDB`, `initPackerzAdmin`, `filterPackerzAdminDropdown`, `savePackerzSOPToDB`, `renderPackerzTelemetryPreview`, `openPackerzAuditLog`) anywhere in `tests/*.js`. **Safety net:** `tests/production-engine.test.js` + `tests/comment-sync.test.js` `require()` the whole `production-module.js`; `tests/unified-parity.test.js` `require()`s the whole `packerz-module.js`; `tests/ceo-engine.test.js`/`inventory-engine.test.js`/`math-engine.test.js`/`sales-engine.test.js` `require()` the whole `neogleamz-engine.js` — any brace-mismatch in §4.2/§4.4/§5's edits surfaces immediately as a `SyntaxError` failing that whole test file, not a silent bug. No test directly `require()`s `system-event-delegator.js`; verify those edits via `git diff` + manual read instead.
2. `npx eslint .` → 0 errors / 0 warnings (unchanged, contingent on the 3-global removal in §5 landing cleanly and the delegator `break;`-inclusive spans in §5 being followed).
3. `node scripts/xss-audit.js` → 0 violations before and after (§7 — no-op confirmation expected).
4. `node scripts/nomenclature-audit.js --warn` → confirm the §11 table's actual numbers; do not silently accept a mismatch — if the real N1 delta differs from the −31 prediction, investigate why before committing (most likely culprit: a miscounted multi-occurrence line).
5. Manual: print a BATCHEZ SOP and a LAYERZ SOP end-to-end (exercises the simplified `executeSopPrint`, §4.4) — confirm identical output to pre-batch behavior.
6. Manual: open the fullscreen "📝 PACKERZ SOP EDITOR" modal, add a procedure step (exercises simplified `addPackerzSOPRow`, §4.1), complete the QA checklist to the point the sign-off button unlocks (exercises simplified `checkPackerzSopSignoffState`, §4.3).
7. Manual: open "🗃️ COMPLETED ORDERS ARCHIVE" and close it via the CLOSE button (exercises simplified `closeSOPAuditLog`, §3 #2) — confirm no console error and the modal closes cleanly.
8. **Baseline handling:** do NOT run `--update-baseline` this batch — same precedent as Batches 1-5 (pure shrink, `updateBaseline()` always accepts shrink silently, but running it now would produce a noisy diff across unrelated already-resolved fingerprints). Defer to the same future consolidated baseline-refresh commit flagged in Batch 4.

---

## 13. Risks

1. **The `sopModalWrapper` boolean-simplification (§4.4) is the highest-risk edit in this batch** — it's inside a live, business-critical print function shared by BATCHEZ and LAYERZ. Each simplification is proven via boolean algebra (not assumption), but this is still hand-editing conditional logic in production code, not a pure deletion. Mitigation: manual print test of both contexts (checklist item 5), careful `git diff` review before commit.
2. **368-line single-span deletion in `packerz-module.js` (§5)** — large, but low structural risk since it's one contiguous block with clean boundaries on both sides (unlike Batch 5's 3 non-contiguous spans). Primary risk is a boundary off-by-one at 1482 or 1849 — verify via exact-string `Edit` matching, re-read the file after the edit before proceeding to other `packerz-module.js` edits in the same file (§4.1, §4.3, §3#2 also touch this file — do all packerz-module.js edits in one pass, outermost-line-number-first, to avoid drift).
3. **`eslint.config.mjs` proximity** — the 3 globals to remove (188, 238, 255) sit among unrelated live neighbors (`module`, `renderProductList`, `savePrintOrderPrefs`, etc.) — verified zero ambiguity risk (checked surrounding lines), but still verify by exact string match per Batch 5's standing caution.
4. **4 non-contiguous `system-event-delegator.js` spans** — delete bottom-to-top (1979→1847→1022→674) per §5; confirm each span's trailing `break;` is included to avoid a new `no-unreachable` ESLint error (Batch 5's load-bearing correction, re-applied here).
5. **N1 delta prediction is Medium confidence, not High** — the multi-occurrence-per-line counting (`sopModalWrapper` ×6, `paneFulfillzSopAdmin`'s index.html line ×2) is mechanically derived from re-reading the scanner's own loop logic, but has not been cross-checked against a live scan run. Report actual numbers, do not force the diff to match the prediction.
6. **§6 residual findings are deliberately NOT fixed here** — resist the temptation to also patch the `triggerSopDirectUpload`/`data-prodid` bug (§6.1) under this batch; it's a functional defect requiring its own `fix/*` branch and its own testing guide, not nomenclature remediation.

---

## Files Touched

- `assets/js/packerz-module.js` — delete lines 1482-1849 (368 lines, §5); simplify line 1478 (§4.1); simplify line 1011 (§4.3); simplify lines 2274-2290 → 9 lines (§3 #2, bundled `sopAuditReturnToPackerz`/`fromPackerzPage` cleanup).
- `assets/js/production-module.js` — 3 boolean-simplification edits inside `executeSopPrint` (§4.4: lines ~2459, ~2475-2478, ~2491).
- `assets/js/neogleamz-engine.js` — delete lines 1165-1169 (§4.2).
- `index.html` — delete line 5076 (§3 #1).
- `assets/js/system-event-delegator.js` — delete 4 spans: 674-676, 1022-1027, 1847-1849, 1979-1981 (§3 #3/#4, §5 companion cleanup; 15 lines total).
- `eslint.config.mjs` — remove 3 stale globals: lines 188, 238, 255 (§5).
- `assets/js/system-realtime-sync.js` — remove 1 line (74), optional bonus, recommended (§5).
- `tools/nomenclature-registry.json` — add 3 entries to `dynamic_id_allowlist` (§2).
- `docs/nomenclature_dictionary.md` — regenerated output via `node scripts/generate-nomenclature-dictionary.js` (§2), not hand-edited.

**Not touched (confirmed):** `scripts/nomenclature-baseline.json` (deliberately deferred, §12.8), `tools/SK8Lytz_App_Master_Reference.md` (no schema/RLS/UI-topology change, §10), `docs/master_reference.md` (different file, stale-prose finding only, §6.4 — not this batch's mandate), `production-module.js:352-356` / `triggerSopDirectUpload` (§6.1, tangled with a functional bug, left as finding), `system-event-delegator.js:1028-1035` (§6.2, out of scope), `neogleamz-engine.js:1217-1218` (§6.3, zero scanner effect either way), `tools/SK8Lytz_Bucket_List.md` (ledger-exemption rule — syncs at `/wind-down`).

## Suggested commit messages (micro-commit cadence)

1. `refactor(nomenclature): delete orphaned Packerz Admin Dashboard cluster (6 dead functions)` — `assets/js/packerz-module.js` (§5 span only)
2. `refactor(nomenclature): remove 4 orphaned delegator cases + stale eslint globals for Packerz Admin cluster` — `assets/js/system-event-delegator.js`, `eslint.config.mjs`, `assets/js/system-realtime-sync.js`
3. `fix(nomenclature): simplify dead ghost-id fallbacks in addPackerzSOPRow, checkPackerzSopSignoffState, doNeoSidebarResize` — `assets/js/packerz-module.js` (§4.1, §4.3), `assets/js/neogleamz-engine.js` (§4.2)
4. `fix(nomenclature): boolean-simplify dead sopModalWrapper checks in executeSopPrint` — `assets/js/production-module.js` (§4.4) — kept separate given its higher risk profile, for isolated review/revert if needed
5. `fix(nomenclature): remove dead paneFulfillzSopAdmin pane-hide + closeSOPAuditLog branch` — `index.html`, `assets/js/packerz-module.js` (§3 #1, #2)
6. `chore(nomenclature): allowlist real buildUnifiedSopLayoutHTML producer ids, regen dictionary` — `tools/nomenclature-registry.json`, `docs/nomenclature_dictionary.md` (§2)

(Per the ledger-exemption rule, `tools/SK8Lytz_Bucket_List.md` is not touched in any of these micro-commits — it syncs naturally at `/wind-down`.)

---

## Execution Addendum (post-implementation, same batch)

Executed as planned with three corrections/completions, recorded for the audit trail:

1. **§11's per-id table had two offsetting errors** (verified by the implementer via a true stash-baseline diff): `packerzLiveSopSplitWrapper` was 2 raw occurrences pre-batch, not 1 (the §4.2 snippet reads the id twice); and deleting `openPackerzAuditLog` (§5) surfaced a plan-unanticipated NEW finding — `packerzAuditOverlay` at the `click_closePackerzAuditOverlay` delegator case, whose only producer was the deleted function's own HTML template (same scanner-math trap §4.1 predicted for `packerzSopEditorRowsWrapper`, just unspotted here). The aggregate still landed at the predicted 78 because the two errors cancelled.
2. **Two approved-scope completions by the parent session** (same category-(b) completion precedent as Batch 5's two extra delegator cases): deleted the now-fully-orphaned `click_closePackerzAuditOverlay` case (system-event-delegator.js, 6 lines — its only emitter lived inside the deleted `openPackerzAuditLog` template; zero other emitters repo-wide) and the guarded residual `if(typeof initPackerzAdmin === 'function') initPackerzAdmin();` call + its comment in index.html's inline script (a permanent no-op after §5; the plan knew of this call site but only reasoned about it for eslint purposes). Final N1_GHOST_ID: **77** (109 → 77, −32), one better than the plan's ~78.
3. Final verification after completions: eslint 0/0, zero code references remain to any deleted function/token (`initPackerzAdmin`, `packerzAuditOverlay`, `closePackerzAuditOverlay` included).
