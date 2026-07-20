# debt/nomenclature-remediation — Batch 7: Regex Playground cluster + 8 misc N1_GHOST_ID findings

## 0. Methodology note — the mapper's verdicts were re-derived from scratch, not trusted

Per the task brief, the explore-mapper's table has been wrong before in this epic (Batch 4 called a live cluster dead; Batch 6's mapper recommended blanket "allowlist" even for confirmed-dead ids). This plan independently re-traced **every** producer, every caller chain, and every containing-function name cited below via direct `Read`/`Grep` — not the mapper's prose. Divergences found, in addition to the `backupModal` re-check the parent session already flagged:

**A genuinely new, high-value bug the mapper missed entirely** (§1.2): two Regex Playground ids the mapper counted as "verified real producers" are **not** — they're true ghosts tied to a live, currently-crashing feature.

**A systematic mapper-hallucinated-function-name pattern** (5 instances, all in §3-§5): the mapper's containing-function names were wrong in every single "misc singles" item it named a function for. The *identifiers* and *line numbers* it cited were accurate; the *function names* were plausible-sounding fabrications. Table of corrections:

| Mapper claimed | Actual function | Verified via |
|---|---|---|
| `renderSocialzTable()` | `renderSkaters()` (socialz-module.js:374) | Zero matches for `renderSocialzTable` anywhere in repo |
| `loadBOM()` | `updateLaborCosts()` (bom-module.js:44) | Zero matches for `loadBOM` anywhere in repo |
| `renderProductionWOList()` | `renderWOList()` (production-module.js:1188) | Zero matches for `renderProductionWOList` anywhere in repo |
| `renderWODetailsPipeline()` | `renderActiveWO()` (production-module.js:1441) | Zero matches for `renderWODetailsPipeline` anywhere in repo |
| `teRenderFlyoutForm()` | `teOpenTaskContext()` (task-engine.js:804) | Zero matches for `teRenderFlyoutForm` anywhere in repo |

None of this changes the underlying verdicts (all 5 functions genuinely are live, as the mapper asserted) — but it's a signal that **every mapper claim about containing-function identity must be independently confirmed**, never copy-pasted. Noted for future batches of this epic.

**Fix-category taxonomy (per Batches 4-6 precedent):**
- **(a) REGISTRY ALLOWLIST** — verified real producer, scanner-blind only.
- **(b) DEAD-CODE DELETION** — zero live callers to the containing function/handler.
- **(c) IN-FUNCTION SURGERY (trivial only)** — ghost read inside a live function, deletion proven zero-behavior-change.
- **(d) LEAVE AS FINDING** — a real, reachable bug tangled with functionality outside nomenclature scope; not touched this batch.
- **(e) SCANNER-NOISE CLEANUP** (new this batch) — the "finding" is inside a `//` comment, not executable code; the scanner has no comment-awareness (confirmed by re-reading `collectDomIdLookupLine` — it runs `line.indexOf('getElementById(')` on raw lines with no comment-stripping). Deleting the stale comment is optional tidying, not a functional fix.

---

## 1. THE BIG ONE — Regex/Parcel Preset Playground cluster (system-tools-module.js)

### 1.1 What checks out exactly as the mapper claimed

Read `EXTRACTOR_CONFIGS` in full (system-tools-module.js:1835-1934) and `openGlobalRegexPlayground()` in full (1936-2066). Confirmed:
- `openGlobalRegexPlayground(type)` genuinely executes the field-templating loop (`conf.groups.forEach(g => g.fields.forEach(f => ...))`, lines 1971-1996) for **both** `'orders'` and `'parcels'` — same code path, driven entirely by which `EXTRACTOR_CONFIGS[type]` object is passed in. Not a single-branch-only claim; verified both branches share the identical loop.
- Container `globalRegexPlaygroundModalContainer` is real, static, index.html:7251 (`<div id="globalRegexPlaygroundModalContainer" ...></div>`).
- Delegator wiring is real and current, exact lines confirmed (unchanged from the task's citation, file untouched by Batch 6): `system-event-delegator.js:758-759` (`case 'click_openParserConfig': openParserConfig();`) and `:767-768` (`case 'click_openParcelConfig': openParcelConfig();`) ← real buttons `index.html:2872` and `:2906` (`data-click="click_openParserConfig"` / `"click_openParcelConfig"`).
- There is a **second**, separate dispatcher for this whole feature — a `document.addEventListener('click', ...)` with `data-app-click` tokens (system-tools-module.js:2305-2345+), distinct from `system-event-delegator.js`. Confirmed real and live: `action === 'save-new-regex-preset'`, `'overwrite-regex-preset'`, `'delete-regex-preset'`, `'apply-regex-rules'` all route to real `window[conf.xxxFn]` calls.
- **Why the scanner can't see any of these ids**: `RE_ID_ATTR_TEMPLATE = /\bid=["']([^"'`]*?)\$\{/g` only registers a producer when there is non-empty static text before `${`. Every field renders as `id="${f.id}"` (line 1986/1990) or the conf-level ids render as `id="${conf.xxxId}"` (lines 1968, 2008, 2011) — **zero static prefix** in all cases. Same mechanism as Batch 6's `packerzSopEditorArea`/`productionAdminQA` discovery (system-tools-module.js:2634-2775), just driven by a `.forEach()` over a config array (field ids) or by top-level conf-object properties (the 6 non-field ids), not a ternary.

### 1.2 What does NOT check out — 2 pairs of confirmed-real ghost ids, tied to live bugs

Re-tracing `getCurrentUIRules()` (system-tools-module.js:109-122) against the `orders` field config surfaced a genuine mismatch:

```js
// system-tools-module.js:109-122 — reads by PROP name, not by the DOM id the template actually renders
window.getCurrentUIRules = function() {
    return {
        ...
        regexPostage: document.getElementById('regexPostage').value.trim(),   // line 114 — NO SUCH DOM ID
        regexMakeup: document.getElementById('regexMakeup').value.trim(),     // line 115 — NO SUCH DOM ID
        ...
    };
};
```

But the template (system-tools-module.js:1864-1865) renders these two fields as:
```js
{ id: "regexFeeStructure", prop: "regexPostage", ... }     // DOM id is "regexFeeStructure", not "regexPostage"
{ id: "regexSecondaryFee", prop: "regexMakeup", ... }       // DOM id is "regexSecondaryFee", not "regexMakeup"
```

**Every other field in both configs is read by its correct `id`** (confirmed line-by-line: `getCurrentParcelUIRules()`, system-tools-module.js:408-420, correctly reads `regexFeeStructure`/`regexParcelLineItemNum`/etc. by their real `id`, not their `prop`). Only these two order-side fields regressed — almost certainly leftover from a pre-refactor version where the DOM ids matched the prop names directly, never updated when the fields were renamed to `regexFeeStructure`/`regexSecondaryFee`.

**Confirmed live, reachable, currently-crashing impact.** `getCurrentUIRules()` is called from 3 real, wired call sites:
1. `data-app-click="apply-regex-rules"` (button, system-tools-module.js:2022) → dispatcher (2342-2344) → `window.getCurrentUIRules()` when `type === 'orders'`.
2. `window.saveRegexPresetAsNew()` (line 182) ← `data-app-click="save-new-regex-preset"` (real button, line 1963).
3. `window.overwriteCurrentRegexPreset()` (line 195) ← `btnOverwritePreset`, `data-app-click="overwrite-regex-preset"` (real button, line 1964).

`document.getElementById('regexPostage')` returns `null` (confirmed zero producer anywhere via full-repo grep); `null.value` throws `TypeError: Cannot read properties of null (reading 'value')`. **Every one of the 3 actions above crashes, every time, on the Orderz Regex Playground** — Apply Active Rules, Save As New, and Overwrite are all currently broken. This is a confirmed, live, higher-severity bug than Batch 6's `data-prodid` discovery (that one silently mis-filed data; this one hard-crashes).

Second pair — `renderParcelPresetDropdown()` (system-tools-module.js:441-461), the parcels-side counterpart to the (correct) `renderPresetDropdown()`:

```js
// system-tools-module.js:452-453
let btnDelete = document.getElementById('btnDeleteParcelPreset');      // NO SUCH DOM ID
let btnOver = document.getElementById('btnOverwriteParcelPreset');    // NO SUCH DOM ID
```

The template (lines 1964-1965) renders these buttons with **generic, non-namespaced** ids shared by both configs: `id="btnOverwritePreset"` / `id="btnDeletePreset"` (confirmed — `renderPresetDropdown()`, the orders-side sibling at lines 154-155, correctly reads these exact generic ids). `renderParcelPresetDropdown()` is confirmed live — called from `openGlobalRegexPlayground('parcels')` (line 2063) and from `saveParcelRegexPresetAsNew()` (line 484). Impact: `btnDelete`/`btnOver` are always `null`, so the `if(btnDelete)`/`if(btnOver)` guards silently no-op — **the Delete/Overwrite Preset buttons never toggle visible on the Parcelz Regex Playground**, even when a non-default profile is selected. Lower severity than the crash above (guarded, no exception — just a permanently-missing UI affordance), but it's the exact same class of confirmed-real, confirmed-reachable bug.

**These 4 ids (`regexPostage`, `regexMakeup`, `btnDeleteParcelPreset`, `btnOverwriteParcelPreset`) must NOT be allowlisted and must NOT be silently patched in this batch** — see §6 "LEAVE AS FINDING" below.

### 1.3 Full verified inventory (all field `.id` values traced individually)

| Config | Field `id` | Type | Real DOM producer? | Correctly read by getCurrent*UIRules? | Verdict |
|---|---|---|---|---|---|
| orders | regexOrderNum | input | ✅ | ✅ (line 111) | Real, allowlist |
| orders | regexOrderDate | input | ✅ | ✅ (112) | Real, allowlist |
| orders | regexOrderTotal | input | ✅ | ✅ (113) | Real, allowlist |
| orders | regexFeeStructure | input | ✅ | ✅ **only via parcels' own reader** (413) — orders' own reader is broken (§1.2) | Real (producer exists), allowlist |
| orders | regexSecondaryFee | input | ✅ | ❌ never read by its real id anywhere (§1.2) | Real producer, zero current lookups — no finding exists, no allowlist needed |
| orders | regexLineItemNum | input | ✅ | ✅ (116) | Real, allowlist |
| orders | regexAlibabaOrder | **readonly** | N/A — readonly branch (line 1988) renders **no `id=` attribute at all** | n/a | Not a producer, not a finding |
| orders | regexUnitPrice | input | ✅ | ✅ (119) | Real, allowlist |
| orders | regexItemName | input | ✅ | ✅ (117) | Real, allowlist |
| orders | regexQuantity | input | ✅ | ✅ (118) | Real, allowlist |
| orders | regexSpecs | textarea | ✅ | ✅ (120) | Real, allowlist |
| orders | regexChinaLanded | **readonly** | N/A — same as regexAlibabaOrder | n/a | Not a producer, not a finding |
| — | **regexPostage** (read at 114) | — | ❌ zero producer (real field id is `regexFeeStructure`) | — | **GHOST + LIVE-CALLER BUG — leave as finding** |
| — | **regexMakeup** (read at 115) | — | ❌ zero producer (real field id is `regexSecondaryFee`) | — | **GHOST + LIVE-CALLER BUG — leave as finding** |
| parcels | regexParcelNum | input | ✅ | ✅ (410) | Real, allowlist |
| parcels | regexActualPaid | input | ✅ | ✅ (411) | Real, allowlist |
| parcels | regexChargeableWeight | input | ✅ | ✅ (412) | Real, allowlist |
| parcels | regexFeeStructure | input | ✅ (same id string as orders') | ✅ (413) | Real, allowlist (1 entry covers both configs) |
| parcels | regexDeductionStructure | input | ✅ | ✅ (414) | Real, allowlist |
| parcels | regexParcelLineItemNum | input | ✅ | ✅ (415) | Real, allowlist |
| parcels | regexParcelItemName | input | ✅ | ✅ (416) | Real, allowlist |
| parcels | regexParcelQuantity | input | ✅ | ✅ (417) | Real, allowlist |
| parcels | regexGroupWeight | input | ✅ | ❌ never read via literal `getElementById` (only via the bare-variable loop in `evaluateAllParcelRegex`, not scanned) — **and separately, `getCurrentParcelUIRules()` omits it from the returned rules object entirely**, so a user's typed override is silently discarded on save (masked in practice by a `DEFAULT_PARCEL_RULES` backfill at line 69 that re-injects the default value on every profile load) | Real producer, zero current N1 lookup — no finding exists, no allowlist needed. **Minor separate functional gap noted in §6.3, not fixed here.** |
| parcels | regexParcelSpecs | textarea | ✅ | ✅ (418) | Real, allowlist |
| parcels | regexTotalDistWeight | **readonly** | N/A — no `id=` attribute | n/a | Not a producer, not a finding |
| parcels | regexUnitWeight | **readonly** | N/A — no `id=` attribute | n/a | Not a producer, not a finding |
| orders (conf-level) | liveRegexPlaygroundPayload | — | ✅ `id="${conf.livePlaygroundPayloadId}"` (2011) | ✅ (125, 250, 317) | Real, allowlist |
| orders (conf-level) | regexPresetSelect | — | ✅ (1968) | ✅ (144, 167, 172) | Real, allowlist |
| orders (conf-level) | liveRegexSearchBox | — | ✅ (2008) | ✅ (251) | Real, allowlist |
| parcels (conf-level) | liveParcelRegexPlaygroundPayload | — | ✅ | ✅ (423, 525, 610) | Real, allowlist |
| parcels (conf-level) | parcelPresetSelect | — | ✅ | ✅ (442, 465, 470) | Real, allowlist |
| parcels (conf-level) | liveParcelRegexSearchBox | — | ✅ | ✅ (526) | Real, allowlist |
| — | **btnDeleteParcelPreset** (read at 452) | — | ❌ zero producer (real shared id is `btnDeletePreset`) | — | **GHOST + LIVE-CALLER BUG — leave as finding** |
| — | **btnOverwriteParcelPreset** (read at 453) | — | ❌ zero producer (real shared id is `btnOverwritePreset`) | — | **GHOST + LIVE-CALLER BUG — leave as finding** |

**Bottom line: of the ~27 distinct identifiers the mapper bundled as "ALL real producers," 23 are genuinely real (17 field ids + 6 conf-level ids) and 4 are genuinely fake** (regexPostage, regexMakeup, btnDeleteParcelPreset, btnOverwriteParcelPreset). Raw N1 occurrence total for the whole cluster today: **35** (17 field ids × 1 occurrence each = 17, + conf-level ids: liveRegexPlaygroundPayload×3, regexPresetSelect×3, liveRegexSearchBox×1, liveParcelRegexPlaygroundPayload×3, parcelPresetSelect×3, liveParcelRegexSearchBox×1 = 14, + the 4 fake ids ×1 each = 4 → 17+14+4 = 35). This closely matches the task's own "~35" estimate — reassuring cross-check that the estimate was a rough raw-occurrence count, now made exact.

### 1.4 Registry additions — resolution_type decision

**Recommendation: reuse Batch 6's `"js-variable-literal"` resolution_type for both new entries — do not invent a new type.** Rationale: the scanner-blind-spot *mechanism* that matters to `nomenclature-audit.js` is purely syntactic (zero static prefix before `${` in `id="${...}"`), and is identical regardless of whether the interpolated variable's value came from a ternary (Batch 6's case), a `.forEach()` iteration variable bound to a config-array element's `.id` property (this batch's field family), or a top-level object property read directly (this batch's conf-level family). Inventing a new type per-source-shape would fragment the registry without changing how `compilePatterns`/`checkN1` actually resolve it. Each new entry's `note` documents its own specific mechanism precisely, which is where that distinction actually belongs.

**Recommendation: use 2 "family" entries with hand-authored alternation-regex patterns, not 23 individual entries.** The registry's own `meta.design_principle` says it stores "PATTERNS and DOCUMENTED EXCEPTIONS, not an exhaustive per-identifier catalog" — this is a direct license to collapse. `compilePatterns` (nomenclature-audit.js:86-98) already supports this with **zero scanner code changes**: any `pattern` not ending in `*` is compiled as `new RegExp('^' + pattern + '$')` — a plain hand-authored regex, full-string-anchored. This is the exact same mechanism the ratified `"ldProp[A-Z]"` entry already uses. An alternation like `regex(OrderNum|OrderDate|...)` is just as valid a regex fragment as a bracket class, and full-string anchoring means alternative-ordering inside the group cannot cause a false partial match. Verified this does not risk over-broadening N1 (checked: no other identifier anywhere in the repo would incidentally full-match either alternation).

Two entries (split by mechanism, not by orders/parcels, since both configs share each mechanism):

```json
{
  "pattern": "regex(OrderNum|OrderDate|OrderTotal|LineItemNum|ItemName|Quantity|UnitPrice|Specs|ParcelNum|ActualPaid|ChargeableWeight|FeeStructure|DeductionStructure|ParcelLineItemNum|ParcelItemName|ParcelQuantity|ParcelSpecs)",
  "resolution_type": "js-variable-literal",
  "evidence": ["assets/js/system-tools-module.js:1835-1934 (EXTRACTOR_CONFIGS field definitions)", "assets/js/system-tools-module.js:1980-1993 (openGlobalRegexPlayground's g.fields.forEach template loop, id=\"${f.id}\")", "assets/js/system-tools-module.js:109-120,408-418 (getCurrentUIRules/getCurrentParcelUIRules readers)"],
  "note": "Family entry covering 17 verified-real field ids rendered by openGlobalRegexPlayground's per-field forEach loop (system-tools-module.js:1980-1993) — each field object's .id property is interpolated as id=\"${f.id}\" with zero static prefix before '${', identical scanner-blind-spot mechanism to Batch 6's packerzSopEditorArea/productionAdminQA (ternary-sourced bare variable) but here sourced from a config-array iteration instead of a ternary. Two fields sharing an EXTRACTOR_CONFIGS field-array slot with identical .id string across both 'orders' and 'parcels' configs (regexFeeStructure) are covered once, not twice. Deliberately EXCLUDES regexPostage/regexMakeup/btnDeleteParcelPreset/btnOverwriteParcelPreset (confirmed zero real producer, tied to live bugs — see docs/plans/debt-nomenclature-remediation-7.md §1.2/§6, NOT allowlisted) and regexSecondaryFee/regexGroupWeight (real producers, but currently zero getElementById lookups exist for them anywhere, so no finding exists to allowlist — would need a fresh entry only if a future lookup is added) and the 4 readonly-type fields regexAlibabaOrder/regexChinaLanded/regexTotalDistWeight/regexUnitWeight (readonly branch, system-tools-module.js:1987-1988, renders no id= attribute at all — not producers)."
},
{
  "pattern": "(liveRegexPlaygroundPayload|regexPresetSelect|liveRegexSearchBox|liveParcelRegexPlaygroundPayload|parcelPresetSelect|liveParcelRegexSearchBox)",
  "resolution_type": "js-variable-literal",
  "evidence": ["assets/js/system-tools-module.js:1968,2008,2011 (id=\"${conf.presetDropdownId}\" / \"${conf.searchBoxId}\" / \"${conf.livePlaygroundPayloadId}\")", "assets/js/system-tools-module.js:1849-1850,1898-1899 (EXTRACTOR_CONFIGS conf-level id properties)"],
  "note": "Family entry covering the 6 verified-real conf-object-level ids (not per-field) — same zero-prefix template-interpolation mechanism as the field family above, but sourced from top-level EXTRACTOR_CONFIGS[type] string properties (conf.livePlaygroundPayloadId etc.) rather than a per-field forEach. All 6 confirmed read-correctly by their respective functions (toggleRawOrderView/toggleRawParcelView, evaluateAllRegex/evaluateAllParcelRegex, restoreDefaultParserRules/restoreDefaultParcelRules, loadSelectedRegexPreset/loadSelectedParcelRegexPreset) — zero bugs in this family, unlike the field-id readers."
}
```

Regenerate `docs/nomenclature_dictionary.md` via `node scripts/generate-nomenclature-dictionary.js` in the same commit (clears `N7_DICT_STALE`, per Batch 4/6 precedent).

**Growth note:** this adds 2 entries to `dynamic_id_allowlist`, not 23 — file stays lean, matches the registry's own stated design principle.

---

## 2. `backupModal` — confirmed dead-code deletion (parent session's re-check, independently re-verified)

Re-read system-tools-module.js:1463-1470 fresh (not trusting the task's cited line numbers blindly):

```
1463: // --- 13. NEW BACKUP & RESTORE SYSTEM ---
1464: window.openBackupModal = function() {
1465:     document.getElementById('backupModal').style.display = 'flex';
1466:     document.getElementById('restorePreview').style.display = 'none';
1467:     document.getElementById('importBackupFile').value = '';
1468: }
1469:
1470: window.closeBackupModal = function() { document.getElementById('backupModal').style.display = 'none'; }
1471:
1472: const APP_TABLES = [ ... ]   // the REAL, live backup/export/import system starts here
```

Confirmed: exact span is **1464-1470** (7 lines, matching the task's citation exactly — no drift). Line 1463's section-header comment describes the **whole** backup/restore feature (APP_TABLES + export/import functions below it, all live and untouched) — it is **kept**, not deleted, since it still correctly labels the surviving code. Full-repo grep for `openBackupModal|closeBackupModal|backupModal` found: the 2 definitions, one stale-but-harmless shared CSS selector (`index.html:913`, `#backupModal` grouped with other real modal ids — inert, targets nothing, zero functional risk to leave), and one Phase-0-era doc mention (`docs/architecture/nomenclature-audit-engine.md:108`, historical, not touched). **Zero callers anywhere** (confirmed independently, matching parent session's finding). `eslint.config.mjs`: zero matches for either name (nothing to remove there). `tests/backup-schema.test.js`: zero matches for either name or `backupModal` (confirmed it tests something else entirely — safe).

**Verdict: (b) DEAD-CODE DELETION.** Delete lines 1464-1470.

---

## 3. `runProductionBatch` / `batchProductSelect` / `batchQty` — mapper's ambiguity resolved definitively as fully dead

The mapper flagged this GHOST+AMBIGUOUS because it "found no callers of `runProductionBatch()` itself." Independent re-verification: **confirmed zero callers, full stop** — no delegator case (`grep system-event-delegator.js` for `runProductionBatch`: zero hits), no button anywhere (zero `data-click`/`data-app-click` referencing it), no other-module direct call (`grep 'runProductionBatch('` across the whole repo: only the function's own definition line), no `eslint.config.mjs` global, no `system-realtime-sync.js` `queueRender` entry, no test reference. The function is exposed via `window.runProductionBatch = typeof runProductionBatch !== 'undefined' ? runProductionBatch : undefined;` (inventory-module.js:3217) but that binding itself is never invoked by anything either.

**Root cause, traced via the live MAKERZ batch-production UI (index.html:3770-3799, `newWOModal`):** the *current*, real "🏭 Start Production Batch" feature uses `newWOProductRetail`/`newWOProductSub`/`newWOProductPrint` (all real, populated by live `populateDropdowns()`) + the real, shared `batchTypeSelect` (index.html:3782) + `newWOQty`, feeding `production-module.js`'s `validateAndCreateWO`/`checkWORouting` (which itself reads `batchTypeSelect` at production-module.js:1133 — a **different, live** consumer of the same shared select) to `insert()` a `work_orders` row. `runProductionBatch()`'s target ids `batchProductSelect`/`batchQty` belong to a **fully superseded, pre-Work-Order "instant consume" system** whose UI was removed from `index.html` at some point; the JS was left behind, guarded by a Phase-0 fix (`docs/plans/fix-dead-ui-wiring-1.md` §9.3, already shipped, added the `if (!batchProductSelectEl || !batchQtyEl) return;` guard visible today at inventory-module.js:419).

`batchProductSelect` also appears once more, separately, at `index.html:6183` — inside the live, frequently-called `populateDropdowns()`:
```js
const bs = document.getElementById('batchProductSelect'); if(bs) bs.innerHTML = window.safeHTML(...);
```
Already guarded (`if(bs)`), proven always-null (zero `<select id="batchProductSelect">` anywhere), zero behavior change to delete. **Note:** `docs/plans/debt/tooling-2.md:84` explicitly warned a *different*, prior task not to touch this exact line — that warning was scoped to that task's own diff-review discipline, not a blanket future prohibition, but it does confirm `populateDropdowns()` has documented line-drift history (`docs/plans/debt/hygiene-1.md:34` separately warns of the same) — **re-`Read` the surrounding 5+ lines immediately before editing, use exact-string `Edit` matching, not raw line numbers.**

**Verdict: (b) DEAD-CODE DELETION** of the whole `runProductionBatch()` function + its window binding, **(c) trivial IN-FUNCTION SURGERY** for the one guarded line inside live `populateDropdowns()`. This is **not** a GHOST+LIVE-CALLER finding — no live caller exists anywhere, resolved definitively (same style as Batch 6 resolving the mapper's `sopModalWrapper` hedge, just the opposite direction: mapper hedged toward "maybe live," reality is "confirmed fully dead").

Exact boundaries (re-read fresh):
- `assets/js/inventory-module.js:415-456` — `async function runProductionBatch() { ... }` (42 lines; line 413 closes the prior live `handleInvEdit`, line 414 blank, line 457 blank, line 458 begins the next live function `window.resetInventoryConsumptionLocally` — clean boundary both sides).
- `assets/js/inventory-module.js:3217` — `window.runProductionBatch = typeof runProductionBatch !== 'undefined' ? runProductionBatch : undefined;` (one line inside the live "GLOBAL BINDINGS" block, 3210-3218; siblings `renderInventoryTable`/`renderFgiTable`/`sortInventory`/`sortFGI` are all real and untouched).
- `index.html:6183` — the one guarded `batchProductSelect` line inside `populateDropdowns()` (opens ~6148, per `docs/plans/debt/tooling-2.md:46`).

`batchQty` (2 raw occurrences, both inside the deleted function only — inventory-module.js:418, 452) clears fully with the function deletion.

---

## 4. `stat-*` cluster (socialz-module.js) — confirmed dead, already guarded, real containing function is `renderSkaters()`

`renderSkaters()` (socialz-module.js:374) is unambiguously live: reached via delegator cases `change_renderSkaters` (system-event-delegator.js:1802-1803) and `input_renderSkaters` (:1967-1968), called from `input_renderSkaters`/`change_renderSkaters` emitters (index.html:3228, 3298, 3324), called on init and after every CRUD op inside socialz-module.js itself (8 call sites), and queued via `system-realtime-sync.js:60,520`.

**Correction to the task's framing: all 4 lines are already guarded**, contrary to the "if unguarded, this is a bug fix" framing offered as a possibility:

```js
// socialz-module.js:406-413 (one contiguous block)
// Update Stats
if(document.getElementById('stat-total-skaters')) document.getElementById('stat-total-skaters').innerText = filtered.length;
const reach = filtered.reduce((a, c) => a + (c.rawFollowers || 0), 0);
if(document.getElementById('stat-total-reach')) document.getElementById('stat-total-reach').innerText = formatCountShort(reach);
const stylesCount = {};
filtered.forEach(s => { if(s.style) s.style.split(';').forEach(st => { const cl = st.trim(); if(cl) stylesCount[cl] = (stylesCount[cl] || 0) + 1; }); });
if(document.getElementById('stat-top-style')) document.getElementById('stat-top-style').innerText = Object.keys(stylesCount).length > 0 ? ... : '-';
if(document.getElementById('stat-avg-eng')) document.getElementById('stat-avg-eng').innerText = filtered.length > 0 ? (2.4 + (reach % 100) / 100).toFixed(1) + "%" : "0%";
```
Confirmed **zero HTML producer anywhere** for all 4 ids (`stat-total-skaters`, `stat-total-reach`, `stat-top-style`, `stat-avg-eng`) — full-repo grep found only these guarded reads + baseline entries. **This is pure cleanup, not a crash-risk fix** — explicitly noting the distinction the task asked for, since the opposite (unguarded) turned out not to be the case here.

**Scope correction — the deletion span is larger than "4 lines," to avoid a new eslint `no-unused-vars`:** `reach` (line 408) is used *only* at lines 409 and 413 (both being deleted); `stylesCount` (410-411) is used *only* at line 412 (being deleted). Deleting just the 4 guarded display lines would orphan `reach`/`stylesCount` as unused variables — a real risk to the "0 eslint warnings" gate. The correct, clean deletion span is the **entire contiguous 8-line block, lines 406-413** (comment + both calc blocks + all 4 guarded writes), bounded by blank lines 405 (before) and 414 (after) — confirmed neither `reach` nor `stylesCount` is referenced anywhere else in the function (full-file grep for both names: zero hits outside this block).

**Verdict: (c) IN-FUNCTION SURGERY (trivial).** Delete socialz-module.js:406-413 (8 lines). Raw N1 occurrences: 4 ids × 2 occurrences per line (`if(getElementById(X)) ... getElementById(X) ...`) = 8 raw findings → 0.

---

## 5. Misc singles — verified independently, each with corrected function name where applicable

### 5.1 `analytics-tab` (bom-module.js:90-91) — real function is `updateLaborCosts()`, not `loadBOM` (which doesn't exist)

```js
// bom-module.js:90-91, inside window.updateLaborCosts (44-92)
let aTab = document.getElementById('analytics-tab');
if(typeof renderAnalyticsDashboard === 'function' && aTab && aTab.classList.contains('active')) renderAnalyticsDashboard();
```
`updateLaborCosts` confirmed live: 8 real `data-change="change_updateLaborCosts"` inputs/checkboxes in the RECIPEZ builder pane (index.html:2001-2030), wired via delegator case `change_updateLaborCosts` (system-event-delegator.js:1756-1757). `analytics-tab` has zero producer anywhere (confirmed grep). Already guarded (`aTab &&` before `.classList.contains`) — proven always-false branch (`aTab` is always `null`), so `renderAnalyticsDashboard()` here never fires regardless; deleting is zero-behavior-change. Note: this means the intended "auto-refresh the REVENUEZ→STATZ analytics dashboard if it's the currently-visible pane while labor costs are edited" behavior has never worked — a minor, harmless, forever-latent gap, not a crash.

**Verdict: (c) IN-FUNCTION SURGERY (trivial).** Delete bom-module.js:90-91 (2 lines). Raw occurrences: 1 → 0.

### 5.2 `packerzInlineSopLeftPane` (packerz-module.js:2278) — the containing branch is itself unreachable, not just the id

```js
// packerz-module.js:2274-2282 — one contiguous, self-contained mousedown listener
document.addEventListener('mousedown', (e) => {
    const el = e.target;
    if (el.dataset.appMousedown === 'initPackerzResize') {
        if(typeof window.initUnifiedSopResizer === 'function') {
            const targetLeftPane = document.getElementById('packerzInlineSopLeftPane') ? 'packerzInlineSopLeftPane' : 'packerzLiveSopLeftPane';
            window.initUnifiedSopResizer(e, targetLeftPane, 'packerzLiveSopSplitWrapper', null, true);
        }
    }
});
```
Confirmed: `data-app-mousedown="initPackerzResize"` has **zero emitter anywhere in the repo** (full grep) — this entire `if` branch, and therefore the entire single-purpose `mousedown` listener wrapping it (it has no other branch), never executes. Separately confirmed: **both** ternary branches are ghosts anyway — `packerzInlineSopLeftPane` has zero real producer (only a same-string reference at packerz-module.js:2232, itself inside an *also-unreachable* `togglePackerzSOPPreview` branch — zero emitter for `data-app-click="togglePackerzSOPPreview"` either, confirmed; flagged as a residual out-of-scope note, not touched, §6.4) and `packerzLiveSopLeftPane` has zero real producer (only a stale CSS selector, index.html:1014/1068, and Batch 6 already deleted its one other JS reference in `neogleamz-engine.js`). So even in the counterfactual where this branch *were* reachable, the resize would silently no-op (`initUnifiedSopResizer`'s internal `document.getElementById(window.unifiedSopLeftPaneId)` lookup — a bare variable, not scanned by N1 — would always return `null`).

**Verdict: (b) DEAD-CODE DELETION** of the whole unreachable listener (not just a fallback simplification, since there is no live branch left once this one is removed). Delete packerz-module.js:2274-2282 (9 lines). Raw occurrences: 1 → 0.

### 5.3 `activeUnitCount` (production-module.js:1202) — real function is `renderWOList()`, not `renderProductionWOList`

```js
// production-module.js:1188-1204, function renderWOList()
const batchEl = document.getElementById('activeBatchCount');   // REAL — index.html:2063
const unitEl = document.getElementById('activeUnitCount');     // GHOST — zero producer anywhere
if (batchEl) batchEl.innerText = activeBatches;
if (unitEl) unitEl.innerText = totalUnits;
```
`renderWOList()` confirmed live (core MAKERZ work-order list renderer, called throughout production-module.js). `activeBatchCount` real at `index.html:2063`; `activeUnitCount` has zero producer (confirmed grep) — a naming-confusion ghost sitting right next to its real sibling, same shape as Batch 4's `sim-shipexp-`/`sim-ship-exp-` finding. Already guarded.

**Verdict: (c) IN-FUNCTION SURGERY (trivial).** Delete lines 1202 and 1204 only (2 non-contiguous single lines within this 4-line span — lines 1201/1203, the real `activeBatchCount` pair, stay untouched). Raw occurrences: 1 → 0.

### 5.4 `sopLockBtn` (production-module.js:1488) — real function is `renderActiveWO()`, not `renderWODetailsPipeline`

```js
// production-module.js:1441+, function renderActiveWO(id)
const lockBtn = document.getElementById('sopLockBtn'); if(lockBtn) lockBtn.innerText = isSOPLocked ? '🔒' : '🔓';
```
`renderActiveWO()` confirmed live (the primary work-order-details renderer, called at production-module.js:1433 and documented in `docs/ARCHITECTURE.md:282`). `sopLockBtn` has zero producer anywhere (confirmed grep — only this one guarded read). `isSOPLocked` (read, not declared, on this line) is unaffected by deleting this line — it's used elsewhere in the function for other purposes.

**Verdict: (c) IN-FUNCTION SURGERY (trivial).** Delete production-module.js:1488 (1 line). Raw occurrences: 1 → 0.

### 5.5 `te-flyout-cycle` (task-engine.js:843-862) — real function is `teOpenTaskContext()`, not `teRenderFlyoutForm`

```js
// task-engine.js:804+, window.teOpenTaskContext = function(taskId) {...}
const cycleSelect = document.getElementById('te-flyout-cycle');
if (cycleSelect) {
    // 17-line block: populates a "Section/Cycle" <option> dropdown from taskEngineDB.cyclez
    ...
    cycleSelect.value = task.cycle_id || '';
}
```
`teOpenTaskContext()` confirmed live — the real Task Context Flyout opener, reached via `data-click="click_teOpenTaskContext"` (task-engine.js:765, 768). `te-flyout-cycle` has zero producer anywhere (confirmed grep); its 8 sibling flyout fields in the same function (`te-flyout-title`, `te-flyout-description`, `te-flyout-assignee`, `te-flyout-start-date`, `te-flyout-due-date`, `te-flyout-timer-btn`, `te-flyout-tag-input`, `te-flyout-tag-suggest`) are all real and untouched — this is the one missing/removed field in an otherwise-complete flyout form (a "Section" assignment dropdown that never got its `<select>` markup, or had it removed). No archived-scaffolding evidence was found corroborating an in-progress feature (unlike the registry's documented `inlineSopQA_*` dormant-feature case) — treated as ordinary orphaned dead code, not protected scaffolding. Already guarded; the whole 19-line body only ever executes when `cycleSelect` is truthy, which it never is — deleting the entire guarded block is zero-behavior-change (confirmed no variable declared inside leaks outside the block).

**Verdict: (c) IN-FUNCTION SURGERY (trivial, larger block).** Delete task-engine.js:843-862 (20 lines: `const cycleSelect = ...` through the closing `}`). Raw occurrences: 1 → 0.

### 5.6 `newTaskInput` (task-engine.js:2293) — confirmed a scanner-noise finding, not a code finding

```js
// task-engine.js:2289-2294
// Press 'C' to Create Task (placeholder for now)
if (e.key.toLowerCase() === 'c' && isTaskPlannerOpen) {
    e.preventDefault();
    // Create Task shortcut triggered
    // FUTURE: document.getElementById('newTaskInput').focus();
}
```
Confirmed: the `getElementById('newTaskInput')` text is entirely inside a `//` line comment. `nomenclature-audit.js`'s `collectDomIdLookupLine` operates on raw, un-stripped lines (`line.indexOf('getElementById(')`) — it has no comment-awareness, so it flags commented-out prose exactly as it would flag live code. **This is category (e) SCANNER-NOISE CLEANUP, not a code bug** — there is no active code to fix.

**Recommendation: delete the single stale comment line as trivial Boy-Scout tidying** (it references a `newTaskInput` field that was never built, labeled "FUTURE" — a genuinely stale placeholder, zero risk to remove, and it does clear the scanner noise). This is optional; if the user prefers to preserve the comment as a roadmap breadcrumb, skip this one deletion and the batch's final N1 count is 1 higher (26 instead of 25) — flagged clearly in §9's delta table both ways.

---

## 6. `stockz-v-resizer` / `componentsTableWrap` (index.html:4630-4691) — the containing function `initVerticalResizer()` is 100% dead, not partially

Full-repo grep for `initVerticalResizer` found **only its own declaration** (index.html:4630) — zero call sites anywhere (no boot-sequence call in `launchApp()`, no delegator case, no button, no `queueRender` entry, no eslint global). This directly resolves the task's open question ("is `initVerticalResizer()` itself live but missing 2 of its 3 targets, or fully dead?") — **fully dead, confirmed**, not a live function with a partial feature gap.

Root cause, traced via the live STOCKPILEZ→STOCKZ layout (index.html:1910-1919, `.stockz-split-container`): the current pane uses a **horizontal** (side-by-side) split — `fgiTableWrap` | `stockz-h-resizer` (real, live) | `rawTableContainer` — with `flex-direction: row`. `initVerticalResizer()` is leftover debris from an **older, stacked (vertical)** layout where a second "components" table (`componentsTableWrap`) sat *below* the FGI table with a horizontal drag-handle (`stockz-v-resizer`) between them — a naming-confusion pair (`stockz-v-resizer` vs. the real, currently-used `stockz-h-resizer`) analogous to Batch 4's `sim-shipexp-`/`sim-ship-exp-` finding, except here the *entire enclosing function* is dead, not just one identifier inside a live one.

`fgiTableWrap` (the function's `topTable` target) is real (index.html:1914) — but irrelevant, since the whole function never runs (guarded at line 4634: `if (!resizer || !topTable) return;`, and `resizer` is always `null`, so it returns before the real `topTable` reference is ever used).

**Companion registry correction required:** `tools/nomenclature-registry.json`'s `rename_forbidden.stockzTopHeight` entry cites this exact dead function's lines as its sole evidence:
```json
"stockzTopHeight": {
  "coupling_type": "persistence",
  "reason": "Persists the user's drag-resized top-table height (px) ...",
  "evidence": ["index.html:4644", "index.html:4683"]
}
```
Confirmed via grep: `stockzTopHeight` has **no other reader or writer anywhere in the repo** — deleting `initVerticalResizer()` fully orphans this localStorage key from any future code interaction. The D8 freeze policy still applies regardless of active-use status (existing keys are frozen wholesale, not conditionally on being read) — so the `rename_forbidden` status itself is unaffected — but the cited evidence lines will no longer exist post-deletion, which would mislead a future auditor. Amend the entry with a `note` field (see §9) rather than silently leaving stale line citations; regenerate the dictionary in the same commit as the other registry edits (§1.4).

**Verdict: (b) DEAD-CODE DELETION** of the entire function. Delete index.html:4630-4691 (62 lines; line 4629 blank before, line 4692 blank, line 4693 begins the live, critical `executeWithButtonAction` — clean boundary). Raw occurrences: `stockz-v-resizer` 1 → 0, `componentsTableWrap` 1 → 0.

---

## 7. LEAVE AS FINDING — 2 confirmed live bugs discovered this batch, explicitly NOT fixed here

Per the task's mandate (same treatment as Batch 6's `data-prodid` discovery): these are real, reachable functional bugs entangled with business logic outside nomenclature-remediation scope. They are **not** allowlisted, **not** silently patched, and **not** deleted this batch. Recommend a dedicated `fix/*` task for each (or one combined `fix/regex-playground-preset-bugs` task).

**Finding 1 — CRITICAL, crash: Orderz Regex Playground save/apply is completely broken.**
`window.getCurrentUIRules()` (system-tools-module.js:109-122) reads `getElementById('regexPostage')`/`getElementById('regexMakeup')` — DOM ids that do not exist (the real ids are `regexFeeStructure`/`regexSecondaryFee`). Every call — "✅ APPLY ACTIVE RULES," "💾 Save As New," and "🔄 Overwrite" on the **Orders** side of the Regex Playground (STOCKPILEZ → DATAZ or wherever `⚙️ PARSER CONFIG`, index.html:2872, is surfaced) — throws `TypeError: Cannot read properties of null (reading 'value')`. The Parcels side (`getCurrentParcelUIRules()`) is unaffected and works correctly. Minimal fix (for the future `fix/*` task, not this batch): change lines 114-115 to read `document.getElementById('regexFeeStructure')` / `document.getElementById('regexSecondaryFee')` respectively.

**Finding 2 — MEDIUM, silent: Parcelz Regex Playground Delete/Overwrite preset buttons never appear.**
`window.renderParcelPresetDropdown()` (system-tools-module.js:441-461) reads `getElementById('btnDeleteParcelPreset')`/`getElementById('btnOverwriteParcelPreset')` — nonexistent ids (the real, shared ids are `btnDeletePreset`/`btnOverwritePreset`). Selecting a non-default saved Parcelz preset never reveals the Delete/Overwrite buttons (they stay at their template default `display:none`). No crash — guarded — but the feature is unusable on the Parcels side. Minimal fix (for the future task): change lines 452-453 to read the correct shared ids.

**Finding 3 — LOW, silent, adjacent discovery (not a new N1 finding, noted for completeness):** `getCurrentParcelUIRules()` (system-tools-module.js:408-420) omits `regexGroupWeight` from its returned rules object entirely, so a user's typed override for that one field is silently dropped on Save/Overwrite. Currently masked in practice by a defensive backfill (`if(!p.rules.regexGroupWeight) p.rules.regexGroupWeight = DEFAULT_PARCEL_RULES.regexGroupWeight;`, system-tools-module.js:69) that re-injects the default on every profile load — so the field is effectively **never actually customizable** today, even though its input box renders and appears editable. Not an N1 finding (never looked up via literal `getElementById`), so no scanner delta either way; mentioned only so the future `fix/*` task can address all three Regex Playground data-integrity bugs together if desired.

**Residual, out-of-scope, zero scanner effect (noted while tracing §5.2, not touched):** `togglePackerzSOPPreview` (packerz-module.js:2231-2232) is also unreachable (zero `data-app-click="togglePackerzSOPPreview"` emitter anywhere) and also references `packerzInlineSopLeftPane` — but as a function *argument*, not a `getElementById` literal, so it contributes zero N1 findings either way. Left alone to keep this batch's diff reviewable, same discipline as Batch 6 §6.2.

---

## 8. Security / XSS

Zero new `innerHTML`/`insertAdjacentHTML`/`outerHTML`/`document.write` logic introduced anywhere in this batch — every edit is either (a) pure deletion of already-compliant or entirely-non-HTML-writing code, or (b) a JSON/Markdown registry+dictionary edit. Specifically checked every deleted span for XSS-relevant calls:
- `system-tools-module.js:1464-1470` (backupModal) — zero HTML writes, only `.style.display`/`.value=` assignments.
- `inventory-module.js:415-456` (runProductionBatch) — zero HTML writes (Supabase `upsert`, arithmetic, `.innerText`/`.value` only).
- `index.html:6183` (batchProductSelect line) — the deleted line itself uses `window.safeHTML(...)` correctly (guarded, compliant) — being deleted wholesale, not modified, so no risk either way.
- `index.html:4630-4691` (initVerticalResizer) — zero HTML writes, only `.style`/`localStorage`/`classList` calls.
- `socialz-module.js:406-413` (stat-* block) — `.innerText=` only, no HTML parsing.
- `bom-module.js:90-91` (analytics-tab) — zero HTML writes.
- `packerz-module.js:2274-2282` (dead mousedown listener) — zero HTML writes.
- `production-module.js:1202,1204,1488` — `.innerText=` only.
- `task-engine.js:843-862` (te-flyout-cycle) — one `cycleSelect.innerHTML = window.safeHTML(opts)` (line 860) inside the block being **deleted wholesale** — already compliant, removed not modified, zero risk.
- `task-engine.js:2293` (newTaskInput comment) — no code at all, pure text.
- `tools/nomenclature-registry.json` / `docs/nomenclature_dictionary.md` — JSON/Markdown documentation only, no runtime code.

`node scripts/xss-audit.js` expected: **0 violations before and after** (no-op confirmation across the whole batch, not a fix — same as Batch 5/6 precedent). None of the two LEAVE-AS-FINDING bugs (§7) are XSS-relevant — both are `.value`/`getElementById(...)` null-reference issues, not HTML-injection issues.

**RLS implications:** none. `runProductionBatch()`'s embedded `supabaseClient.from('inventory_consumption').upsert(...)` call is deleted along with the rest of the dead function — it never executed in practice (guarded, zero callers), so its removal has zero effect on any RLS-gated read/write pattern actually exercised in production. `inventory_consumption` remains fully live via `handleInvEdit()` and production-module.js's own live batch-creation flow. No table, column, or policy is created, altered, or removed anywhere in this batch.

**Print-window DOMPurify:** not applicable — no print-window `document.write` path exists in any file touched by this batch.

---

## 9. Vanilla JS / framework constraints

All edits are deletions of native `function`/`window.X = function` declarations, native DOM calls (`getElementById`, `.style`, `.innerText`, `classList`, `localStorage`), or additions to a JSON registry file + regeneration of a Markdown doc. No `var` present in any touched/deleted code, none introduced. No framework code, no build step, no new CSS utility classes, no Web Bluetooth surface touched anywhere in this batch.

## 10. 4-state UX / UI mutex / zero-refresh

Not applicable to any deletion in this batch (§2-§6) — every deleted line/function was already unreachable or a proven always-false guarded branch, so no user-visible Loading/Error/Empty/Success state exists to preserve, and no DB-mutation button becomes newly reachable or unreachable (the one embedded Supabase call, inside dead `runProductionBatch()`, never fired in practice). `renderSkaters()`/`updateLaborCosts()`/`renderWOList()`/`renderActiveWO()`/`teOpenTaskContext()`/`populateDropdowns()` all keep their exact current 4-state/mutex/zero-refresh behavior — only dead-fallback tail ends of their DOM lookups are removed, none of their live rendering logic. The 2 LEAVE-AS-FINDING bugs (§7) **do** have real UX impact (a hard crash on 3 Orderz Regex Playground buttons; a permanently-hidden pair of buttons on the Parcelz side) — that is exactly why they are flagged for a dedicated `fix/*` task rather than silently patched here, where a proper fix should also consider whether `executeWithButtonAction`-style button-state feedback (`Save` → `Saving...` → `Saved!`) is warranted for the crash path, which today just throws with no user-facing error state at all.

## 11. Schema / Master Reference / Topological integrity

No Supabase table/column/RLS change anywhere in this batch. `tools/SK8Lytz_App_Master_Reference.md`'s `## Database Schemas` section is unaffected — confirmed via full-file grep that it contains zero mentions of any identifier/function touched by this batch. **No button, modal, or UI element is created, deleted, or moved** — every deleted/edited reference already had zero live HTML producer backing it (confirmed individually in §2-§6); the Mermaid Architectural Blueprint topological-integrity rule does not apply to removing orphaned JS handlers with no HTML counterpart, consistent with Batch 5/6 precedent. The 2 registry edits (§1.4) and 1 registry correction (§6) are metadata/documentation only, not UI changes.

---

## 12. Expected scanner deltas

**Baseline going in: N1_GHOST_ID = 77** (Batch 6's Execution Addendum final confirmed count, obtained by the Batch 6 implementer running a live scan post-edit — this is the authoritative number, not the committed `scripts/nomenclature-baseline.json` file, which per Batches 1-6's standing `--update-baseline` deferral remains frozen at its original pre-Batch-1 capture and does not reflect any of the 6 prior batches' shrinkage). Math counts **raw occurrences**, matching how "109 → 77" was itself derived (confirmed by re-reading `collectDomIdLookupLine`'s per-marker-occurrence loop — each `getElementById(` substring on a line is one occurrence, dedup only happens at the printed-summary/baseline-fingerprint level, not in the raw total).

**Cross-check confirming completeness:** this batch's in-scope raw-finding total (56, computed below) plus the task's stated out-of-scope total (~20 `cc*` cluster + 1 remaining `packerzAdminRecipeSelect` leftover from Batch 6 = 21) equals exactly 77 — matching the going-in baseline with zero unaccounted findings.

| Cluster | Identifiers | Raw before | Raw after | Mechanism |
|---|---|---|---|---|
| Regex Playground — real (allowlisted) | 17 field ids + 6 conf ids = 23 | 31 | **0** | §1.4 registry additions (2 family entries) |
| Regex Playground — bugs (left open) | regexPostage, regexMakeup, btnDeleteParcelPreset, btnOverwriteParcelPreset | 4 | **4** | §7 — deliberately NOT touched this batch |
| backupModal | 1 | 1 | **0** | §2 deletion |
| batchProductSelect | 1 | 2 | **0** | §3 — function deletion (1) + populateDropdowns line (1) |
| batchQty | 1 | 2 | **0** | §3 — both inside deleted function |
| stat-total-skaters / stat-total-reach / stat-top-style / stat-avg-eng | 4 | 8 (2 per line × 4 lines) | **0** | §4 block deletion |
| analytics-tab | 1 | 1 | **0** | §5.1 |
| packerzInlineSopLeftPane | 1 | 1 | **0** | §5.2 |
| activeUnitCount | 1 | 1 | **0** | §5.3 |
| sopLockBtn | 1 | 1 | **0** | §5.4 |
| te-flyout-cycle | 1 | 1 | **0** | §5.5 |
| newTaskInput | 1 | 1 | **0** (if comment deleted) / **1** (if left) | §5.6 — optional |
| stockz-v-resizer | 1 | 1 | **0** | §6 |
| componentsTableWrap | 1 | 1 | **0** | §6 |
| **Total (incl. newTaskInput deletion)** | | **56** | **4** | **−52** |
| **Total (excl. newTaskInput deletion)** | | **56** | **5** | **−51** |

**Predicted final N1_GHOST_ID: 25** (77 − 52, if the `newTaskInput` comment is deleted) **or 26** (77 − 51, if left as pure documentation). **Medium confidence per standing precedent** (Batches 4-6 all flagged this same caveat) — treat as directionally correct, run the actual `node scripts/nomenclature-audit.js --warn` scan post-edit and report real numbers, do not force the diff to match this prediction.

| Rule | Before | After | Confidence |
|---|---|---|---|
| `N1_GHOST_ID` | 77 | **~25 (or 26)** | Medium — per-occurrence math shown above, verify with real scan |
| `N1_GHOST_ID_PREFIX` | (unaffected — check current value at execution time) | unchanged | High — no `prefix`-kind lookups touched; every finding this batch is a `literal`-kind lookup |
| `N2_ORPHAN_HANDLER` | (unaffected) | unchanged | High — zero `system-event-delegator.js` switch cases are added or removed this batch (the one dead listener deleted, packerz-module.js:2274-2282, lives in packerz-module.js's own separate `data-app-mousedown` dispatcher, not the delegator file `checkN2` parses) |
| `N7_DICT_STALE` | 0 | 0 → possibly 1 → 0 | High — registry edited (§1.4, §6), regenerate dictionary in the same commit, must land at 0 |
| `N3_LABEL_DRIFT` | (unaffected) | unchanged | High — not touched |
| `N4_LEGACY_TERM` | (unaffected) | unchanged | High — none of the 5-term watchlist (`Salez/Nexl/Salz/Bridge/Prod`) appears in any deleted/edited identifier vocabulary this batch (regex/backup/batch/stat/analytics/packerz/active/sop/flyout/resizer terms only; `runProductionBatch`/`batchProductSelect` contain "Product"/"Production" which `RE_PROD_BOUNDARY` correctly does not match — lowercase letter follows "Prod" in both, confirmed) |
| `N5_NEW_NONCONFORMANT_KEY` | (unaffected) | unchanged | High — `stockzTopHeight` (touched via §6's registry note) is an *existing*, already-grandfathered key (D8) with its own `rename_forbidden` entry; N5 only tracks brand-new keys, and no new key is introduced anywhere this batch |
| `N6_UNUSED_CSS` | (unaffected) | unchanged | Medium — not specifically re-audited; no JS-injected `<style>` class touched inside any deleted span this batch (quick grep recommended before commit as a final check, per Batch 5 precedent) |

**Known pre-existing false positive, do not chase:** the N7=1 CRLF finding noted in Batch 5's addendum is pre-existing and unrelated to this batch's files.

---

## 13. Verification checklist

1. `npm test` → 59/59 passing (unchanged). Safety-net coverage confirmed: `tests/inventory-engine.test.js` `require()`s the whole `inventory-module.js` (catches any brace mismatch from §3's edits); `tests/production-engine.test.js` + `tests/comment-sync.test.js` `require()` the whole `production-module.js` (catches §5.3/§5.4) and `tests/comment-sync.test.js` also `require()`s the whole `task-engine.js` (catches §5.5/§5.6); `tests/unified-parity.test.js` `require()`s the whole `packerz-module.js` (catches §5.2). **No test requires `socialz-module.js`, `bom-module.js`, `system-tools-module.js`, or `index.html` directly** — §4, §5.1, §1's registry work, §3's `index.html` line, and §6's `index.html` function deletion have no automated syntax safety net; rely on careful `git diff` review and a manual browser smoke test (checklist items 6-9 below). Confirmed zero test references anywhere to any deleted identifier (`runProductionBatch`, `initVerticalResizer`, `openBackupModal`, `closeBackupModal`).
2. `npx eslint .` → 0 errors / 0 warnings. Specifically confirm the socialz-module.js §4 deletion does not orphan `reach`/`stylesCount` as unused (resolved by deleting the whole 406-413 block, not just the 4 display lines — see §4's scope-correction note). No `eslint.config.mjs` edits required this batch (confirmed zero global declarations exist for any deleted name).
3. `node scripts/xss-audit.js` → 0 violations before and after (§8 — no-op confirmation expected).
4. `node scripts/nomenclature-audit.js --warn` → confirm the §12 table's actual numbers; investigate any mismatch before committing (likely culprit if off: a miscounted multi-occurrence line, per Batch 6's own documented experience with this exact kind of math).
5. Confirm `node scripts/generate-nomenclature-dictionary.js` output matches the new `docs/nomenclature_dictionary.md` exactly (N7_DICT_STALE must land at 0).
6. Manual — STOCKPILEZ → STOCKZ: confirm the FGI/raw-inventory split-pane horizontal drag-resizer (`stockz-h-resizer`) still works exactly as before (unaffected — different resizer, different function, §6 only deletes the dead vertical one).
7. Manual — MAKERZ → RECIPEZ: edit any labor cost/checkbox field to confirm `updateLaborCosts()` still saves correctly and does not throw (exercises §5.1's simplified function).
8. Manual — MAKERZ → BATCHEZ: open an active Work Order, confirm the batch count badge and SOP lock icon still render correctly (exercises §5.3/§5.4's simplified `renderWOList()`/`renderActiveWO()`).
9. Manual — SOCIALZ → ROSTER: confirm the roster grid still renders, search/filter still works, and the header stat badges (if visibly present in the current CSS layout) show no console error (exercises §4's simplified `renderSkaters()`).
10. Manual — click "🏭 Start Production Batch" (MAKERZ → BATCHEZ), confirm work-order creation still functions identically (unaffected — different system from the deleted `runProductionBatch()`, §3).
11. Manual — open the Task Engine, open any task's context flyout, confirm all remaining fields (title/description/assignee/dates/timer/tags) still populate correctly (exercises §5.5's simplified `teOpenTaskContext()`).
12. Manual — console check: open DevTools while navigating STOCKPILEZ/MAKERZ/SOCIALZ/NEXUZ panes; confirm no *new* console errors (all deleted code was already either unreachable or a guarded no-op, so no observable difference is expected — this step confirms no regression was introduced, same as Batch 5/6's equivalent check).
13. **Do NOT attempt to fix or test the 2 LEAVE-AS-FINDING bugs (§7) as part of this batch's verification** — they remain reproducible exactly as documented, for the future `fix/*` task.
14. **Baseline handling:** do NOT run `--update-baseline` this batch — same precedent as Batches 1-6 (pure shrink, `updateBaseline()` always accepts shrink silently, but running it now would produce a noisy diff unrelated to this batch and break the one-batch-one-concern pattern). Defer to the future consolidated baseline-refresh already flagged in Batch 4.

---

## 14. Risks (ranked)

1. **Lowest risk — registry-only edits (§1.4, §6's `stockzTopHeight` note).** Pure JSON metadata + regenerated Markdown, zero executable code touched, zero scanner-code changes required (confirmed `compilePatterns` already supports hand-authored regex fragments via the existing `ldProp[A-Z]` precedent).
2. **Low risk — clean, bounded dead-function deletions with a test-suite safety net** (§2 backupModal, §3 runProductionBatch, §5.2 packerz mousedown listener): all confirmed zero-caller via exhaustive grep, all bounded by unambiguous blank-line/brace boundaries, all backed by a `require()`-based test that would surface any brace mismatch as an immediate `SyntaxError`.
3. **Low-medium risk — dead-function deletion with NO test safety net** (§6 `initVerticalResizer`, index.html): the largest single deletion this batch (62 lines) in the one file no automated test loads. Mitigated by the function's total isolation (zero callers, clean boundaries on both sides, confirmed via direct read) — but git-diff review and the manual smoke test (checklist item 6) carry full weight here.
4. **Low-medium risk — IN-FUNCTION SURGERY inside live, high-traffic rendering functions** (§4 socialz stat-* block, §5.1 analytics-tab, §5.3/§5.4 activeUnitCount/sopLockBtn, §5.5 te-flyout-cycle): all proven zero-behavior-change (guarded, always-false), but these are hand-edits inside frequently-invoked live code, some with partial test coverage (production-module.js, task-engine.js) and some without (socialz-module.js, bom-module.js). The §4 block requires deleting 8 lines as one unit, not 4, to avoid a new unused-variable eslint warning — get this boundary exactly right.
5. **Medium risk — the one `index.html:6183` line inside `populateDropdowns()`** (§3): this exact function has a *documented history* of line-drift across at least two prior unrelated plans in this repo (`docs/plans/debt/tooling-2.md`, `docs/plans/debt/hygiene-1.md`) — re-`Read` a generous window immediately before editing and use exact-string `Edit` matching, never raw line numbers alone.
6. **The 2 LEAVE-AS-FINDING bugs (§7) are zero implementation risk to *this* batch** (nothing about them is touched) but carry real, currently-live user-facing impact (one full crash path) — flag prominently in the batch summary so they don't get lost; do not let their discovery tempt a scope-creep fix mid-batch.
7. **N1 delta prediction is Medium confidence, not High** (§12) — matches every prior batch's own stated caveat; report actual scanner output, don't force the diff to match 25/26.

---

## Files Touched

- `assets/js/system-tools-module.js` — delete lines 1464-1470 (7 lines, §2, `backupModal` cluster). **No other edit to this file** — the 2 confirmed bugs (§7, lines 114-115 and 452-453) are explicitly LEFT UNTOUCHED this batch.
- `assets/js/inventory-module.js` — delete lines 415-456 (42 lines, §3, `runProductionBatch`) + line 3217 (1 line, §3, window binding). Net: 43 lines removed.
- `index.html` — delete line 6183 (1 line, §3, guarded `batchProductSelect` in `populateDropdowns()`) + delete lines 4630-4691 (62 lines, §6, `initVerticalResizer`). Net: 63 lines removed.
- `assets/js/socialz-module.js` — delete lines 406-413 (8 lines, §4, `stat-*` block inside `renderSkaters()`).
- `assets/js/bom-module.js` — delete lines 90-91 (2 lines, §5.1, `analytics-tab` inside `updateLaborCosts()`).
- `assets/js/packerz-module.js` — delete lines 2274-2282 (9 lines, §5.2, dead `mousedown` listener).
- `assets/js/production-module.js` — delete line 1202 + line 1204 (2 non-contiguous lines, §5.3, `activeUnitCount` inside `renderWOList()`) + delete line 1488 (1 line, §5.4, `sopLockBtn` inside `renderActiveWO()`). Net: 3 lines removed.
- `assets/js/task-engine.js` — delete lines 843-862 (20 lines, §5.5, `te-flyout-cycle` block inside `teOpenTaskContext()`) + optionally delete line 2293 (1 line, §5.6, stale `newTaskInput` comment — recommended, not mandatory).
- `tools/nomenclature-registry.json` — add 2 entries to `dynamic_id_allowlist` (§1.4, Regex Playground families); amend `rename_forbidden.stockzTopHeight` with a corrective `note` (§6).
- `docs/nomenclature_dictionary.md` — regenerated output via `node scripts/generate-nomenclature-dictionary.js` (§1.4/§6), not hand-edited.

**Not touched (confirmed):** `eslint.config.mjs` (zero global declarations exist for any name deleted this batch — verified individually for `openBackupModal`/`closeBackupModal`/`runProductionBatch`/`initVerticalResizer`/`doNeoResizeV`/`stopNeoResizeV`), `assets/js/system-realtime-sync.js` (zero references to any deleted name), `scripts/nomenclature-baseline.json` (deliberately deferred, §13.14), `tools/SK8Lytz_App_Master_Reference.md` (no schema/RLS/UI-topology change, §11 — confirmed zero mentions of any touched identifier), `tools/SK8Lytz_Bucket_List.md` (ledger-exemption rule — syncs at `/wind-down`), the 4 Regex Playground bug ids and their containing functions (§7, LEFT AS FINDING for a dedicated `fix/*` task), the `togglePackerzSOPPreview` adjacent dead branch (§7, residual, zero scanner effect either way).

## Suggested commit messages (micro-commit cadence)

1. `refactor(nomenclature): delete dead openBackupModal/closeBackupModal functions` — `assets/js/system-tools-module.js`
2. `refactor(nomenclature): delete dead runProductionBatch function (zero callers confirmed)` — `assets/js/inventory-module.js`
3. `refactor(nomenclature): delete dead initVerticalResizer function + orphaned batchProductSelect ghost line` — `index.html`
4. `fix(nomenclature): remove dead guarded stat-* block from live renderSkaters()` — `assets/js/socialz-module.js`
5. `fix(nomenclature): remove dead guarded analytics-tab check from live updateLaborCosts()` — `assets/js/bom-module.js`
6. `refactor(nomenclature): delete unreachable Packerz inline-resize mousedown listener` — `assets/js/packerz-module.js`
7. `fix(nomenclature): remove dead guarded activeUnitCount/sopLockBtn reads from live renderWOList/renderActiveWO` — `assets/js/production-module.js`
8. `fix(nomenclature): remove dead guarded te-flyout-cycle block + stale newTaskInput comment` — `assets/js/task-engine.js`
9. `chore(nomenclature): allowlist verified Regex Playground producer id families, regen dictionary, correct stockzTopHeight evidence` — `tools/nomenclature-registry.json`, `docs/nomenclature_dictionary.md`

(Per the ledger-exemption rule, `tools/SK8Lytz_Bucket_List.md` is not touched in any of these micro-commits — it syncs naturally at `/wind-down`. A separate ledger entry/`fix/*` task should be opened for §7's 2 LEAVE-AS-FINDING bugs at `/wind-down` or the next `/bucketlist` pass.)
