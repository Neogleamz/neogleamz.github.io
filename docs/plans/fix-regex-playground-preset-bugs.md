# fix/regex-playground-preset-bugs — Implementation Plan

## Origin

Discovered during `debt/nomenclature-remediation` Batch 7 while tracing the Regex/Parcel Preset Playground's DOM ids for nomenclature-audit purposes (see [docs/plans/debt-nomenclature-remediation-7.md](debt-nomenclature-remediation-7.md) §1.2 and §7 for the full evidence trail). Both bugs are naming-mismatch regressions — the DOM producer templates were refactored to use different ids than the reader functions still expect — left deliberately untouched by that batch since fixing them is outside nomenclature-remediation scope.

## Bug 1 — CRITICAL, crash: Orderz Regex Playground Apply/Save/Overwrite all throw

**File:** `assets/js/system-tools-module.js`

`window.getCurrentUIRules()` (lines 109-122) reads:
```js
regexPostage: document.getElementById('regexPostage').value.trim(),   // line 114 — no such DOM id
regexMakeup: document.getElementById('regexMakeup').value.trim(),     // line 115 — no such DOM id
```
But the live template (`openGlobalRegexPlayground`, `EXTRACTOR_CONFIGS.orders` field definitions, ~lines 1864-1865) renders these two fields with different ids:
```js
{ id: "regexFeeStructure", prop: "regexPostage", ... }
{ id: "regexSecondaryFee", prop: "regexMakeup", ... }
```
`document.getElementById('regexPostage')` returns `null`; `null.value` throws `TypeError`. This fires on every one of 3 real, wired call sites: `data-app-click="apply-regex-rules"` (Apply Active Rules), `saveRegexPresetAsNew()` (Save As New), `overwriteCurrentRegexPreset()` (Overwrite) — all on the **Orders** side only. The Parcels side (`getCurrentParcelUIRules()`, lines 408-420) reads the equivalent fields correctly by their real ids and is unaffected.

**Fix:** change lines 114-115 to read the correct ids:
```js
regexPostage: document.getElementById('regexFeeStructure').value.trim(),
regexMakeup: document.getElementById('regexSecondaryFee').value.trim(),
```
Keep the returned object's `prop` keys (`regexPostage`/`regexMakeup`) unchanged — those are the persisted-rule property names used elsewhere (presets, `DEFAULT_PARSER_RULES`); only the DOM lookup id is wrong, not the data model.

## Bug 2 — MEDIUM, silent: Parcelz preset Delete/Overwrite buttons never appear

**File:** `assets/js/system-tools-module.js`

`window.renderParcelPresetDropdown()` (lines 441-461) reads:
```js
let btnDelete = document.getElementById('btnDeleteParcelPreset');    // line 452 — no such DOM id
let btnOver = document.getElementById('btnOverwriteParcelPreset');   // line 453 — no such DOM id
```
The live template renders these buttons with generic, non-namespaced ids shared by both configs (lines 1964-1965): `id="btnOverwritePreset"` / `id="btnDeletePreset"` — confirmed correct on the Orders-side sibling `renderPresetDropdown()` (lines 154-155). Both `btnDelete`/`btnOver` are always `null` here, so the `if(btnDelete)`/`if(btnOver)` guards silently no-op — the Delete/Overwrite buttons never toggle visible on the Parcelz Regex Playground even when a non-default profile is selected. No crash (guarded), just a permanently-missing UI affordance.

**Fix:** change lines 452-453 to read the correct shared ids:
```js
let btnDelete = document.getElementById('btnDeletePreset');
let btnOver = document.getElementById('btnOverwritePreset');
```

## Bug 3 — LOW, adjacent, optional: `regexGroupWeight` silently dropped from saved parcel rules

Noted during the same trace, not a DOM-id bug (not N1-scanner-visible): `getCurrentParcelUIRules()` (system-tools-module.js:408-420) omits `regexGroupWeight` from its returned rules object, so a typed override is silently discarded on Save/Overwrite. Currently masked by a defensive backfill (`DEFAULT_PARCEL_RULES.regexGroupWeight` re-injected on every profile load, line ~69) — the field renders and looks editable but is never actually persisted. Optional: add `regexGroupWeight: document.getElementById('regexGroupWeight').value.trim(),` to the returned object. Fix if convenient while already in this file; not required to close Bugs 1-2.

## Verification

1. Manual — NEXUZ → IMPORTZ → **⚙️ PARSER CONFIG** (Orderz side): load any saved preset (or defaults), click **✅ Apply Active Rules** — must complete without a console `TypeError`. Repeat for **💾 Save As New** and **🔄 Overwrite** (needs a preset selected).
2. Manual — same modal, **⚙️ PARCEL CONFIG** (Parcelz side): select a non-default saved preset — **Delete Preset**/**Overwrite Preset** buttons must become visible.
3. `node scripts/xss-audit.js` — expect 0 violations before/after (no DOM-write lines touched, only `getElementById` target strings change).
4. `npx eslint .` — expect 0 errors/warnings.
5. `npm test` — expect 59/59 (no test currently covers this file directly; rely on manual testing above).
6. `node scripts/nomenclature-audit.js --warn` — expect the 4 previously-left-open N1_GHOST_ID findings (`regexPostage`, `regexMakeup`, `btnDeleteParcelPreset`, `btnOverwriteParcelPreset`) to clear to 0 as a side effect of the fix (the ids now correctly match real producers already allowlisted by Batch 7's registry entries — confirm no new allowlist entry is needed).

## Security / XSS

None — both fixes are `getElementById(...)` target-string corrections only, no DOM-write logic touched.

## Files Touched

- `assets/js/system-tools-module.js` (lines 114-115, 452-453; optionally line ~419 for Bug 3)
