# fix/regex-playground-preset-bugs — Implementation Plan (FINAL)

Status: execution-ready. Re-verified line-for-line against current `assets/js/system-tools-module.js` on branch `fix/regex-playground-preset-bugs` (fresh off `main`) by an independent explore-mapper pass, then cross-checked directly by this planning pass. All line numbers below were read fresh from the file, not inherited blind from the prior discovery draft.

## Origin

Discovered during `debt/nomenclature-remediation` Batch 7 while tracing the Regex/Parcel Preset Playground's DOM ids for nomenclature-audit purposes (see `docs/plans/debt-nomenclature-remediation-7.md` §1.2 and §7 for the full evidence trail). Both bugs are naming-mismatch regressions — the DOM producer templates (`EXTRACTOR_CONFIGS`, rendered by `openGlobalRegexPlayground()`) were refactored to use different ids than the reader functions still expect. Batch 7 deliberately left them untouched (out of nomenclature-remediation scope, since they're behavior bugs, not pure naming drift) and logged them for this dedicated `fix/*` branch.

**Single file touched, both bugs:** `assets/js/system-tools-module.js`.

---

## Bug 1 — CRITICAL (crash): Orderz Regex Playground Apply / Save As New / Overwrite all throw

`window.getCurrentUIRules()` (lines 109-122):

```js
window.getCurrentUIRules = function() {
    return {
        regexOrderNum: document.getElementById('regexOrderNum').value.trim(),
        regexOrderDate: document.getElementById('regexOrderDate').value.trim(),
        regexOrderTotal: document.getElementById('regexOrderTotal').value.trim(),
        regexPostage: document.getElementById('regexPostage').value.trim(),      // line 114 — BEFORE
        regexMakeup: document.getElementById('regexMakeup').value.trim(),        // line 115 — BEFORE
        regexLineItemNum: document.getElementById('regexLineItemNum').value.trim(),
        regexItemName: document.getElementById('regexItemName').value.trim(),
        regexQuantity: document.getElementById('regexQuantity').value.trim(),
        regexUnitPrice: document.getElementById('regexUnitPrice').value.trim(),
        regexSpecs: document.getElementById('regexSpecs').value.trim()
    };
};
```

`document.getElementById('regexPostage')` and `('regexMakeup')` both return `null` — **zero DOM producer exists for either id anywhere in the codebase** (confirmed by grep and by `node scripts/nomenclature-audit.js`, which still flags both as `N1_GHOST_ID`). `null.value.trim()` throws `TypeError: Cannot read properties of null (reading 'value')`.

The live template (`EXTRACTOR_CONFIGS.orders`, field-render loop `conf.groups.forEach → g.fields.forEach` at line 1972) renders these two logical fields under **different, correct** ids:

```js
// lines 1856-1857 — EXTRACTOR_CONFIGS.orders, group "ORDER METADATA"
{ id: "regexFeeStructure", prop: "regexPostage", label: "Postage Deductions ({FEE_NAME} intercepts string)", ... },
{ id: "regexSecondaryFee", prop: "regexMakeup",  label: "Secondary Make Up Fee (Capture Group 1)", ... }
```

Confirmed via the nomenclature scanner too: `regexFeeStructure` / `regexSecondaryFee` are **not** flagged (correctly recognized as live ids elsewhere), while `regexPostage` / `regexMakeup` **are** still flagged as `N1_GHOST_ID` — direct evidence the producer really did move to those two ids and the reader was never updated.

**3 live, wired call sites hit this crash:**
1. `saveRegexPresetAsNew()` — line 182: `window.PARSER_PROFILES.push({name: ..., rules: window.getCurrentUIRules()})`
2. `overwriteCurrentRegexPreset()` — line 195: `cur.rules = window.getCurrentUIRules();`
3. The `data-app-click="apply-regex-rules"` delegated handler — line 2335: `if(type === 'orders') { window.PARSER_RULES=window.getCurrentUIRules(); ... }`, wired to the **"✅ APPLY ACTIVE RULES (TEMPORARY)"** footer button (line 2014) of the Orderz Regex Playground modal.

**Fix — change lines 114-115 only:**

```js
regexPostage: document.getElementById('regexFeeStructure').value.trim(),   // line 114 — AFTER
regexMakeup: document.getElementById('regexSecondaryFee').value.trim(),   // line 115 — AFTER
```

Do **not** touch the object's key names (`regexPostage:` / `regexMakeup:` stay exactly as-is on the left side of the colon). Those keys are the persisted rule-model property names consumed elsewhere as `prop: "regexPostage"` / `prop: "regexMakeup"` (template lines 1856-1857), `window.PARSER_RULES.regexPostage` / `.regexMakeup` (regex-eval code, ~lines 1275 & 1278), `UI_COLOR_MAP.regexPostage` (line 225), and `DEFAULT_PARSER_RULES.regexPostage` / `.regexMakeup` (lines 17-18). Only the **DOM lookup id** (the string argument to `getElementById`) was wrong — the data model is untouched by this fix.

---

## Bug 2 — MEDIUM (silent no-op): Parcelz preset Delete / Overwrite buttons never appear

`window.renderParcelPresetDropdown()` (lines 441-461):

```js
window.renderParcelPresetDropdown = function() {
    let sel = document.getElementById('parcelPresetSelect');
    if(!sel) return;
    sel.innerHTML = window.safeHTML("");
    window.PARCEL_PROFILES.forEach((p, idx) => {
        let opt = document.createElement('option');
        opt.value = idx; opt.innerText = p.name;
        if(idx === window.ACTIVE_PARCEL_PROFILE_INDEX) opt.selected = true;
        sel.appendChild(opt);
    });

    let btnDelete = document.getElementById('btnDeleteParcelPreset');      // line 452 — BEFORE
    let btnOver = document.getElementById('btnOverwriteParcelPreset');    // line 453 — BEFORE
    if (window.ACTIVE_PARCEL_PROFILE_INDEX === 0) {
        if(btnDelete) btnDelete.style.display = 'none';
        if(btnOver) btnOver.style.display = 'none';
    } else {
        if(btnDelete) btnDelete.style.display = 'inline-block';
        if(btnOver) btnOver.style.display = 'inline-block';
    }
};
```

No producer exists for `btnDeleteParcelPreset` / `btnOverwriteParcelPreset` anywhere. The template renders these buttons with generic, shared, non-namespaced ids (same markup block serves both Orders and Parcels — the modal is built once per `type` from the same footer-button HTML):

```js
// lines 1956-1957 — inside openGlobalRegexPlayground(), shared by both "orders" and "parcels" renders
<button id="btnOverwritePreset" data-app-click="overwrite-regex-preset" ...>🔄 Overwrite</button>
<button id="btnDeletePreset" data-app-click="delete-regex-preset" ...>🗑️ Delete</button>
```

Confirmed correct on the sibling Orders-side function, `renderPresetDropdown()` (lines 154-155), which already reads `btnDeletePreset` / `btnOverwritePreset` correctly. Because `getElementById('btnDeleteParcelPreset')` / `('btnOverwriteParcelPreset')` are always `null`, the `if(btnDelete)` / `if(btnOver)` guards silently no-op forever — **no crash**, just a permanently-invisible affordance: the Delete/Overwrite buttons never toggle visible on the Parcelz Regex Playground even when a non-default profile is selected.

**Live callers that trigger this dead code path:**
- `saveParcelRegexPresetAsNew()` — line 484, direct call: `window.renderParcelPresetDropdown();`
- `openGlobalRegexPlayground('parcels')` — line 2055, direct call, guarded by `typeof` check, executed every time the Parcelz modal renders (initial open via `openParcelConfig()`, and indirectly whenever `loadSelectedParcelRegexPreset()`, `restoreDefaultParcelRules()`, or `deleteParcelRegexPreset()` call `openParcelConfig()` → `openGlobalRegexPlayground('parcels')` to fully refresh the modal)

*(Note: the mapper's inventory attributed one of these call sites to `toggleRawParcelView()` at "line 2055" — re-verified directly: line 2055 is inside `openGlobalRegexPlayground()`'s `type !== "orders"` branch, not inside `toggleRawParcelView()` (which is a separate function at lines 422-435 and does not call `renderParcelPresetDropdown()` at all). Corrected above; substance of the finding is unaffected.)*

**Fix — change lines 452-453 only:**

```js
let btnDelete = document.getElementById('btnDeletePreset');     // line 452 — AFTER
let btnOver = document.getElementById('btnOverwritePreset');    // line 453 — AFTER
```

---

## Bug 3 — LOW, adjacent: `regexGroupWeight` silently dropped from saved parcel rules

**Status: BUNDLED into this branch (user override).** This planner's original recommendation was to defer (see reasoning below, kept for the record) — CLAUDE.md's Boy Scout Rule is disabled on `fix/*` branches, and Bug 3 is a different bug class from Bugs 1-2 (silent data loss, not a ghost-DOM-id crash/no-op). The user explicitly chose "Proceed + fix Bug 3 too" when asked, overriding the deferral recommendation. Implemented in the same commit as Bugs 1-2.

Original deferral reasoning (kept for context, no longer the operative decision):
1. **CLAUDE.md's Boy Scout Rule is explicitly disabled for bug-fix branches**: *"Boy Scout rule: while in `feat/*` or `refactor/*`, fix exactly one piece of nearby debt. Disable this during bug fixes."* This is a `fix/*` branch. Bug 3 is a different bug *class* from Bugs 1-2 (a missing property in a returned rules object — a silent data-loss bug — not a ghost-DOM-id crash/no-op), discovered incidentally during the same trace, not part of the crash/silent-button symptoms that this branch exists to close.
2. **Zero live-visible impact today.** It is defensively masked by the load-time backfill in `window.loadParserConfig()` (lines 68-69: `window.PARCEL_PROFILES.forEach(p => { if(!p.rules.regexGroupWeight) p.rules.regexGroupWeight = DEFAULT_PARCEL_RULES.regexGroupWeight; });`), so there is no user-facing urgency comparable to Bug 1 (hard crash) or Bug 2 (missing button).
3. **Keeps this PR maximally surgical** — exactly 4 changed lines across 2 functions, both directly tied to the diagnosed crash/no-op. That tight scope is what makes this fix trivial to review, test, and roll back in isolation (see Risk section).
4. Bundling a 3rd, unrelated-root-cause change would dilute the single-purpose commit history and complicate any future targeted revert of just the ghost-id fixes.

**Exact fix, implemented**: in `getCurrentParcelUIRules()` (lines 408-420), insert a new line between the current `regexQuantity` (line 417) and `regexSpecs` (line 418) entries, mirroring the field order in `EXTRACTOR_CONFIGS.parcels`'s "LINE ITEMS" group (line 1918, `id: "regexGroupWeight", prop: "regexGroupWeight"`):

```js
window.getCurrentParcelUIRules = function() {
    return {
        regexParcelNum: document.getElementById('regexParcelNum').value.trim(),
        regexActualPaid: document.getElementById('regexActualPaid').value.trim(),
        regexChargeableWeight: document.getElementById('regexChargeableWeight').value.trim(),
        regexFeeStructure: document.getElementById('regexFeeStructure').value.trim(),
        regexDeductionStructure: document.getElementById('regexDeductionStructure').value.trim(),
        regexLineItemNum: document.getElementById('regexParcelLineItemNum').value.trim(),
        regexItemName: document.getElementById('regexParcelItemName').value.trim(),
        regexQuantity: document.getElementById('regexParcelQuantity').value.trim(),
        regexGroupWeight: document.getElementById('regexGroupWeight').value.trim(),   // ← new line to add later
        regexSpecs: document.getElementById('regexParcelSpecs').value.trim()
    };
};
```

Recommend logging this as its own tiny entry in `tools/SK8Lytz_Bucket_List.md` §🧹 Technical Debt (not actioned here — ledger edits are out of scope for an implementation plan and require the ledger-hydration gate).

---

## Vanilla JS constraints

No violation risk: the fix is a pure string-literal substitution inside existing `document.getElementById(...)` calls. No `var`, no new variable declarations, no framework, no Web Bluetooth surface touched. Existing `let` usage in both functions is preserved unchanged.

## Security / XSS

Trivial — confirmed by direct read of both functions and their surrounding lines:
- No `innerHTML` / `insertAdjacentHTML` / `outerHTML` / `document.write` lines are touched by either fix. The only mutation is the string argument passed to `getElementById(...)`.
- No `window.safeHTML` call sites are added, removed, or altered — no risk of introducing the forbidden ternary (`window.safeHTML ? window.safeHTML(x) : x`) pattern.
- No print-window / `DOMPurify.sanitize(...)` code path is anywhere near these functions.
- No RLS implication — see Schema section below.
- `node scripts/xss-audit.js` expectation: **0 violations before, 0 violations after** (unchanged).

## RLS / Supabase / schema implications

**None.** Both bugs are 100% client-side, DOM-id-only reads. `window.PARSER_PROFILES` / `window.PARCEL_PROFILES` persist to `localStorage` only (`saveStorageProfiles()` / `saveParcelProfiles()` — confirmed, no Supabase client call anywhere in the preset save/overwrite/delete chain). No table, column, or RLS policy is read or written by this fix. **No Master Reference `## Database Schemas` update required.**

## Topological integrity (Mermaid blueprint)

**No update required.** Neither fix creates, deletes, or moves any button, modal, or UI element — both buttons (`btnDeletePreset` / `btnOverwritePreset`) and both fields (`regexFeeStructure` / `regexSecondaryFee`) already exist in the live template exactly as currently rendered; only the *internal JS lookup strings* pointing at them are being corrected to match. Confirmed via grep: `tools/SK8Lytz_App_Master_Reference.md` contains zero references to any of `regexPostage`, `regexMakeup`, `btnDeleteParcelPreset`, `btnOverwriteParcelPreset`, `regexFeeStructure`, `regexSecondaryFee`, `btnDeletePreset`, `btnOverwritePreset`, or `regexGroupWeight` today, so there is nothing stale to correct there either.

## 4-state UX (Loading / Error / Empty / Success)

Not directly applicable in the usual async-data-component sense: both preset dropdowns are synchronous, `localStorage`-backed (no network round trip — `window.PARSER_PROFILES` / `window.PARCEL_PROFILES` are already resident in memory from page-load-time `loadParserConfig()` / `loadParcelConfig()`), so there is no "Loading" state and no possible network "Error" state. The closest applicable equivalent — **Empty** (only "Factory Default" profile exists → Delete/Overwrite hidden) vs **Success** (a custom profile is selected → Delete/Overwrite visible) — is already correctly implemented by the existing `ACTIVE_PROFILE_INDEX === 0` / `ACTIVE_PARCEL_PROFILE_INDEX === 0` branch in both render functions; this fix does not change that branching logic, it only corrects which real elements the branch's `style.display` toggles apply to.

## UI mutex (`window.executeWithButtonAction`)

**Not applicable.** Confirmed by reading the full call chain of `saveRegexPresetAsNew()`, `overwriteCurrentRegexPreset()`, `deleteRegexPreset()`, and their Parcelz equivalents: none perform a Supabase mutation. They mutate `window.PARSER_PROFILES` / `window.PARCEL_PROFILES` in memory and persist via synchronous `localStorage.setItem(...)` inside `saveStorageProfiles()` / `saveParcelProfiles()`. `executeWithButtonAction` exists specifically to guard against double-submit races on async DB writes; there is no async race here to guard against, so adding it would be scope creep with no behavioral justification.

## Zero-refresh

Already correctly implemented by the existing code and unaffected by this fix beyond now actually working:
- `saveRegexPresetAsNew()` (line 186) and `saveParcelRegexPresetAsNew()` (line 484) already re-invoke `renderPresetDropdown()` / `renderParcelPresetDropdown()` immediately after saving — once Bug 2's ids are corrected, the Delete/Overwrite buttons will now correctly toggle visible immediately, with no page refresh, exactly as designed.
- `deleteRegexPreset()` / `deleteParcelRegexPreset()` already call `openParserConfig()` / `openParcelConfig()` (full modal re-render) after deletion.
- `overwriteCurrentRegexPreset()` / `overwriteCurrentParcelRegexPreset()` intentionally do not re-render the dropdown — they only change the *rules payload* of the already-selected profile, not the profile list/name, so there is nothing stale to refresh. No change needed here.

No new render-function re-invocation needs to be added anywhere for this task.

---

## Verification checklist

### Manual — Orderz side (Bug 1)
1. NEXUZ → IMPORTZ → **⚙️ PARSER CONFIG** to open the Orderz Regex Playground.
2. Click **✅ APPLY ACTIVE RULES (TEMPORARY)** → must close the modal with no console `TypeError`. (Before the fix: throws immediately.)
3. Click **💾 Save As New**, enter a profile name → must save successfully and re-populate the preset dropdown with the new profile selected, no console error.
4. Select the new (non-default) profile, edit a field, click **🔄 Overwrite** → confirm dialog → must complete with a success `alert()`, no console error.

### Manual — Parcelz side (Bug 2)
1. Same modal family: NEXUZ → IMPORTZ → **⚙️ PARCEL CONFIG** to open the Parcelz Regex Playground.
2. With "Factory Default" selected: confirm **Delete Preset** and **Overwrite Preset** buttons are hidden (unchanged baseline behavior).
3. Use **💾 Save As New** to create/select a custom profile → **🗑️ Delete** and **🔄 Overwrite** buttons must now become visible immediately (`inline-block`) with no refresh. (Before the fix: buttons never appear, permanently `display:none` default from inline template style.)
4. Click **🔄 Overwrite** on that profile → confirm dialog → success alert, no console error.
5. Click **🗑️ Delete** on that profile → confirm dialog → profile removed, dropdown falls back to Factory Default, buttons hide again.

### Automated
- `node scripts/xss-audit.js` — expect **0 violations before and after** (no DOM-write line touched).
- `npx eslint .` — expect **0 new errors/warnings**; only literal string arguments inside two `getElementById(...)` calls per bug change, no new identifiers or unused vars introduced.
- `npm test` — expect the full existing suite to remain green with **no new failures**. Confirmed no test file references `getCurrentUIRules`, `getCurrentParcelUIRules`, `renderParcelPresetDropdown`, `regexPostage`, `regexMakeup`, `btnDeleteParcelPreset`, or `btnOverwriteParcelPreset` (grepped across `tests/`), so this change is untested by the current suite by construction — rely on the manual steps above as the primary verification. (`test-lint-runner` should still capture and report the exact before/after pass count as part of the post-task validation swarm.)
- `node scripts/nomenclature-audit.js --warn` — **predicted delta: total `N1_GHOST_ID` findings drops from 24 to 20.** Reasoning: the audit's fingerprint key is `file|ruleId|identifier` (not per-occurrence), and each of the 4 affected identifiers (`regexPostage`, `regexMakeup`, `btnDeleteParcelPreset`, `btnOverwriteParcelPreset`) appears as a `document.getElementById(...)` target exactly **once** in the whole file (confirmed via grep — their other textual occurrences, e.g. `regexPostage` as an object property key in `DEFAULT_PARSER_RULES` line 17 or `UI_COLOR_MAP` line 225, are not `getElementById` calls and were never separately flagged). So exactly 4 findings disappear, 1:1 with the 4 identifiers fixed, dropping 24 → 20. `newBlocking` will be 0 either way (exit 0) since no new ghost ids are introduced. Bug 3, if ever fixed, has **zero effect** on this count — it is a missing-object-property bug, not a `getElementById` ghost-id pattern, so it was never one of the 24.
  - Non-blocking note: `scripts/nomenclature-baseline.json` will still list these 4 as known/accepted fingerprints after this fix (the baseline is only pruned by an explicit `--update-baseline` run, and per script logic that's pure "shrinkage" so it needs no `--force`). Pruning the baseline is optional cleanup, out of scope for this branch, and best left to a `debt/nomenclature-remediation` batch per this task's own Origin note.

## Risk

**Very low.** This is a 4-line, 2-function, single-file change that corrects `getElementById(...)` target strings to point at DOM elements that already exist and already render exactly as today, with zero new elements, zero data-model changes, zero schema/RLS surface, and zero DOM-write/XSS surface touched. The only possible regression is a UI-affordance display-state mistake (e.g., toggling the wrong button), which is trivially caught by the 5-step manual checklist above and fully reversible with a 1-line revert. Both bugs are currently either a hard, always-reproducible crash (Bug 1) or a silently-broken no-op (Bug 2) — meaning shipping this fix cannot make either code path *worse* than its current state.

## Suggested commit message

Single commit (one file, both bugs, both already fully diagnosed and scoped to this branch's name):

```
fix(system-tools): correct ghost DOM ids in regex/parcel preset playground

- getCurrentUIRules() now reads regexFeeStructure/regexSecondaryFee
  (was regexPostage/regexMakeup, neither id exists in the DOM) —
  fixes a TypeError crash on Apply Active Rules / Save As New /
  Overwrite in the Orderz Regex Playground.
- renderParcelPresetDropdown() now reads btnDeletePreset/
  btnOverwritePreset (was btnDeleteParcelPreset/
  btnOverwriteParcelPreset, neither id exists in the DOM) — fixes
  the Delete/Overwrite buttons never appearing on the Parcelz
  Regex Playground for non-default profiles.

Data model / persisted rule property names (regexPostage, regexMakeup)
are unchanged; only the internal getElementById lookup strings were
wrong. No schema/RLS/XSS surface touched.

Refs: debt/nomenclature-remediation Batch 7 N1_GHOST_ID backlog —
clears regexPostage, regexMakeup, btnDeleteParcelPreset,
btnOverwriteParcelPreset from the next nomenclature-audit run
(24 -> 20 total findings).
```

If strict one-bug-per-commit atomicity is preferred instead, split into:
1. `fix(system-tools): read regexFeeStructure/regexSecondaryFee ids in getCurrentUIRules() to stop Apply/Save/Overwrite crash`
2. `fix(system-tools): read shared btnDeletePreset/btnOverwritePreset ids in renderParcelPresetDropdown() to unhide Parcelz preset buttons`

## Files Touched

- `assets/js/system-tools-module.js` — lines 114-115 (Bug 1 fix), one new line ~418 (Bug 3 fix, bundled per user override — see status note above), and lines 453-454 (Bug 2 fix). No other file touched.

---

## Execution Addendum (post-implementation)

**N1_GHOST_ID delta differs from prediction: 24 → 22, not 24 → 20 (still a real, correct improvement, just not the exact math predicted).** The implementer verified before/after via a stash round-trip rather than trusting the prediction: fixing the 4 ghost ids (`regexPostage`, `regexMakeup`, `btnDeleteParcelPreset`, `btnOverwriteParcelPreset`) genuinely cleared all 4 — but pointing `getElementById` at `regexSecondaryFee` and `regexGroupWeight` for the first time surfaced 2 **new** N1 findings for those two identifiers. Both are false positives, not new bugs: `tools/nomenclature-registry.json`'s `dynamic_id_allowlist` regex-family pattern (~line 225, introduced in `debt/nomenclature-remediation` Batch 7) includes `FeeStructure` as a recognized alternation but not `SecondaryFee` or `GroupWeight` — so `regexFeeStructure` resolves cleanly while its two siblings don't, purely because neither had ever been used as a `getElementById` *consumer* before this fix (they were producer-only, never scanner-visible as ghost candidates until now). Real producers for both are confirmed to exist (`EXTRACTOR_CONFIGS.parcels`, ~lines 1858/1919). **Not fixed here** — correcting the registry's regex pattern is nomenclature-remediation bookkeeping, not this branch's bug-fix scope; flagged as a small follow-up item for a future `debt/nomenclature-remediation` batch (add `SecondaryFee`/`GroupWeight` to the existing family pattern's alternation list).

All other verification landed as predicted: 59/59 tests, 0/0 eslint, 0 XSS violations before/after, zero remaining code references to the 4 fixed ghost ids anywhere in the repo.
