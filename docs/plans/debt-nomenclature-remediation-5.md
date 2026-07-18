# debt/nomenclature-remediation — Batch 5: "Option B-lite" — delete 9 confirmed-dead Cycle Count Mobile Bridge functions + wiring

## Scope

Executes the verified-safe subset that Batch 4's "Option B" section explicitly deferred (`docs/plans/debt-nomenclature-remediation-4.md`, "Option B" section) — 9 functions/aliases confirmed to have **zero live callers, zero delegator emitters, zero HTML producers**, spanning 3 non-contiguous ranges in `assets/js/inventory-module.js`, plus their now-orphaned wiring in `assets/js/system-event-delegator.js` and one stale `eslint.config.mjs` global. This plan independently re-verifies every line number, every claimed "zero occurrence outside the span," and every scanner-rule interaction cited below — see evidence inline. Zero drift confirmed against Batch 4 and against the task's re-verified line numbers.

**Not in scope (explicitly, per Batch 4's Option B writeup):** `window.initializeCcSyncChannel` (1378-1634), `window.stopCycleCount` (1888-1921), `window.updateCCRouteUI` (2019-2064) — all live, called from the live `stockzAuditModal` / `selectStockzAuditItem` remote-camera-bridge feature. Also **not in scope**: `window.resumeCycleCount` (2102-2104, a no-op "compatibility stub" sitting between spans — not one of the 9 confirmed-dead functions, left untouched even though its own liveness is questionable; flagged below as residual debt for a future pass, not this batch) and `window.saveManualCycleCount` (referenced but never defined anywhere — nothing to delete, no function body exists).

---

## A. `assets/js/inventory-module.js` — 3 deletion spans + 1 dispatcher-branch excision

### A1. Span 1 — lines 1638-1886 (249 lines)

| Function | Lines |
|---|---|
| `window.startLocalCycleCount` | 1638-1731 |
| `window.startLocalScannerWithDevice` | 1733-1757 |
| `window.change_handleCCLocalDeviceChange` | 1759-1763 |
| `window.startRemoteCycleCount` | 1765-1863 |
| `window.click_updateLocalIPQRCode_cc` | 1865-1883 |
| `// Aliasing startCycleCount for backward compatibility` (comment) + `window.startCycleCount = window.startRemoteCycleCount;` (alias) | 1885-1886 |

**Boundary check (confirmed by direct read, not assumed):**
- Line 1636 (`let ccLocalQrScanner = null;`) sits **2 lines before** the span starts (1638) — it is a **shared module-scoped variable**, read/written by both the dead functions inside the span (`startLocalCycleCount`, `startLocalScannerWithDevice`) **and** the live `window.stopCycleCount` (1888-1921, references `ccLocalQrScanner` at lines 1890/1893/1895/1899). **Do not touch line 1636.** Line 1637 is blank — also untouched, correctly excluded from the span.
- All six items inside 1638-1886 are separated only by blank lines (1732, 1758, 1764, 1864, 1884) and the one-line comment at 1885 (which belongs to and is included with the alias at 1886) — confirmed via direct read, no other live code interleaved.
- Line 1887 is blank; line 1888 (`window.stopCycleCount = async function() {`) is LIVE — untouched. Matches the task's stated boundary exactly, no correction needed.

### A2. Span 2 — lines 2066-2100 (35 lines)

| Function | Lines |
|---|---|
| `window.click_setCCRoutePhone` | 2066-2076 |
| `window.click_setCCRoutePC` | 2078-2088 |
| `window.click_setCCRouteBoth` | 2090-2100 |

**Boundary check:**
- Line 2064 (`};`) closes the live `window.updateCCRouteUI` (2019-2064) — untouched. Line 2065 blank.
- None of these three functions call `document.getElementById` at all — they only call `window.updateCCRouteUI(...)` and `window.ccSyncChannel.send(...)`. **This span contains zero DOM-id reads**, confirmed by direct read — relevant to the scanner-delta section below (span 2 contributes 0 ids to the N1_GHOST_ID reduction).
- **What sits between span 2 and span 3 (lines 2101-2109, checked per task instruction):** line 2101 blank; lines 2102-2104 = `window.resumeCycleCount = function() { // compatibility stub };` — **out of scope**, not one of the 9 confirmed-dead functions, left untouched (see "Residual debt, not in scope" note below); line 2105 blank; lines 2106-2108 = a section banner comment `// === CYCLE COUNT MANAGER MODAL LOGIC ===`; line 2109 blank. The banner immediately precedes span 3's two functions today — see the residual-debt note below regarding what happens to this banner after span 3 is deleted.

### A3. Span 3 — lines 2110-2145 (36 lines)

| Function | Lines |
|---|---|
| `window.filterCcMngrItems` | 2110-2138 |
| `window.selectCcMngrItem` | 2140-2145 |

**Boundary check:** line 2139 blank; line 2146 blank; line 2147 (`window.populateStockzAuditDropdown = function() {`) is LIVE (an unrelated, different feature — the Stockz Audit item dropdown) — untouched. Matches the task's stated boundary exactly.

**Residual debt flagged, NOT deleted this batch:** once span 3 is removed, the `// === CYCLE COUNT MANAGER MODAL LOGIC ===` banner comment (2106-2108) will sit directly above `populateStockzAuditDropdown` — a function it does not describe — becoming a stale/misleading section header. The task's explicit span-3 boundary starts at line 2110 (not 2106), so per scope this comment is **left in place** this batch. Note for a future cleanup pass (do not fold into this batch — it's a comment-only, zero-functional-risk item that doesn't belong to the "9 confirmed-dead functions" contract this batch executes).

**`selectCcMngrItem`'s one unguarded line (2141, `document.getElementById('ccMngrItemSelect').value = val;`)** is being deleted as part of the whole function; this line would have thrown if ever reached (no producer for `ccMngrItemSelect` as an actual selectable target from this codepath's caller), but it is a **null-reference crash risk, not an XSS risk** — no HTML is written, `.value =` does not parse markup. Confirmed clean.

### A4. Dispatcher branch excision — line 3560 only

Inside the shared, `data-app-click`-driven dispatcher (`document.addEventListener('click', (e) => {...})`, starting ~3553):

```js
3557  if (action === 'sortFgi') { if(typeof sortFGI === 'function') sortFGI(btn.dataset.cat, btn.dataset.col); }
3558  if (action === 'sortInv') { if(typeof sortInventory === 'function') sortInventory(btn.dataset.col); }
3559  if (action === 'toggleFgiCat') { if(typeof toggleFgiCategory === 'function') toggleFgiCategory(btn.dataset.cat); }
3560  if (action === 'selectCcItem') { if(typeof selectCcMngrItem === 'function') selectCcMngrItem(btn.dataset.val, btn.dataset.txt); }
3561  if (action === 'previewSnapshot') { if(typeof window.previewInventorySnapshot === 'function') window.previewInventorySnapshot(btn.dataset.id); }
3562  if (action === 'deleteSnapshot') { if(typeof window.deleteInventorySnapshot === 'function') window.deleteInventorySnapshot(btn.dataset.id); }
```

Each `action === '...'` branch is a **single self-contained `if` statement on its own line** — delete **exactly line 3560**, nothing else. Lines 3557-3559 and 3561-3562 are unrelated live branches inside the same shared dispatcher and must not be touched. This dispatcher (`data-app-click`) is a distinct mechanism from `system-event-delegator.js`'s `data-click` switch — `selectCcItem` has no producer of `data-app-click="selectCcItem"` markup anywhere (confirmed, see scanner-delta grep below), consistent with Batch 4's finding.

**Editing-order note (precision risk mitigation):** perform deletions bottom-to-top within this file (A4 line 3560, then A3 2110-2145, then A2 2066-2100, then A1 1638-1886) or use exact-string `Edit` matching rather than raw line numbers, to avoid line-drift confusion between sequential edits in the same file.

---

## B. `assets/js/system-event-delegator.js` — 2 deletion spans (not 8 — see discovery)

**Discovery vs. task framing:** the task lists 8 separate case removals with line ranges that only cover `case '...':` + its call line, omitting the trailing `break;` each case ends with. Re-reading the file shows 7 of the 8 cases sit in **one unbroken, zero-blank-line contiguous run** — collapsing this to 2 excisions, both one line longer than stated (to include `break;`):

### B1. Contiguous block — lines 1211-1231 (21 lines, 7 cases)

```js
1208  case 'click_window_closeCycleCountManager':      // LIVE — stays (calls window.closeCycleCountManager())
1209      window.closeCycleCountManager();
1210      break;
1211  case 'click_window_startCycleCount':               ┐
1212      window.startCycleCount();                      │
1213      break;                                          │
1214  case 'click_startLocalCycleCount':                 │
1215      if (typeof window.startLocalCycleCount === 'function') window.startLocalCycleCount();
1216      break;                                          │
1217  case 'click_startRemoteCycleCount':                │  DELETE
1218      if (typeof window.startRemoteCycleCount === 'function') window.startRemoteCycleCount();
1219      break;                                          │  lines
1220  case 'click_setCCRoutePhone':                      │
1221      if (typeof window.click_setCCRoutePhone === 'function') window.click_setCCRoutePhone();
1222      break;                                          │  1211-1231
1223  case 'click_setCCRoutePC':                         │
1224      if (typeof window.click_setCCRoutePC === 'function') window.click_setCCRoutePC();
1225      break;                                          │
1226  case 'click_setCCRouteBoth':                       │
1227      if (typeof window.click_setCCRouteBoth === 'function') window.click_setCCRouteBoth();
1228      break;                                          │
1229  case 'click_window_filterCcMngrItems':             │
1230      window.filterCcMngrItems();                     │
1231      break;                                          ┘
1232  case 'click_window_saveManualCycleCount':          // OUT OF SCOPE — stays (guarded no-op, window.saveManualCycleCount never defined anywhere)
1233      window.executeWithButtonAction(el, 'SAVING...', '✅ SAVED', async () => { if(typeof window.saveManualCycleCount === 'function') await window.saveManualCycleCount(); });
1234      break;
```

**Why the trailing `break;` matters (load-bearing correction):** the task's stated ranges (e.g. "1211-1212") delete only the `case` label and call line, leaving the `break;` behind as an orphan. An orphaned `break;` immediately following the prior case's own `break;` is a **stray unreachable statement** — ESLint's `no-unreachable` rule is very likely to flag this as a **new error**, directly threatening the "0 eslint errors" verification gate this batch must pass. The corrected spans above always include the `break;`.

Boundary before (1210) and after (1232-1234) confirmed LIVE / in-scope-to-keep by direct read.

### B2. Standalone — lines 1883-1885 (3 lines, 1 case)

```js
1880  case 'change_handleSOPWebcamDeviceChange':          // LIVE, unrelated SOP webcam feature — stays
1881      if (typeof window.change_handleSOPWebcamDeviceChange === 'function') window.change_handleSOPWebcamDeviceChange(el);
1882      break;
1883  case 'change_handleCCLocalDeviceChange':             ┐ DELETE
1884      if (typeof window.change_handleCCLocalDeviceChange === 'function') window.change_handleCCLocalDeviceChange(event);
1885      break;                                            ┘ lines 1883-1885
1886  case 'change_handleStockzAuditDeviceChange':        // LIVE, the real Stockz Audit device-change handler — stays
1887      if (typeof window.change_handleStockzAuditDeviceChange === 'function') window.change_handleStockzAuditDeviceChange(event);
```

Total removed from this file: 21 + 3 = **24 lines**.

---

## C. `eslint.config.mjs` — line 259 only

Remove: `"selectCcMngrItem": "writable",` (line 259).

**Verified (grep, not assumed):** none of the other 8 deleted names (`startLocalCycleCount`, `startLocalScannerWithDevice`, `change_handleCCLocalDeviceChange`, `startRemoteCycleCount`, `click_updateLocalIPQRCode_cc`, `startCycleCount`, `click_setCCRoutePhone`, `click_setCCRoutePC`, `click_setCCRouteBoth`, `filterCcMngrItems`) nor `cachedCcMngrOptions` appear anywhere in `eslint.config.mjs`'s globals list — no further removal needed. **`stopCycleCount` at line 276 is a separate, LIVE global — do not touch** (17 lines away in the alphabetically-sorted list; flagged as a low-probability but real risk of a wrong-line delete).

No `tools/nomenclature-registry.json` change and no dictionary regeneration this batch — none of the 12 ids resolved below are, or were, allowlisted (verified: zero matches for any of them in the registry file).

---

## Scanner deltas (re-derived per-id, not assumed)

### N1_GHOST_ID: 141 → **129** (−12)

Per-id check: for each DOM id referenced inside the 3 deletion spans, grepped the **entire file** for every other occurrence outside the spans. Findings dedupe by `(file, ruleId, identifier)` — one surviving reference anywhere keeps the finding alive.

**Fully eliminated (12 ids — zero occurrences found outside the 3 spans):**

| id | occurrences (all inside deletion spans) |
|---|---|
| `ccScannerHeaderTitle` | 1647, 1774 |
| `ccLocalScannerArea` | 1651, 1778 |
| `ccRemoteScannerArea` | 1652, 1779 |
| `inlineScannerItemName` | 1658, 1795 |
| `inlineScannerExpected` | 1659, 1796 |
| `ccLocalDeviceSelectContainer` | 1685 |
| `ccLocalDeviceSelect` | 1686 |
| `ccLocalIPOverrideContainer` | 1784 |
| `pcLocalIPInput_cc` | 1832, 1866 |
| `ccScannerQRCodeImg` | 1852 |
| `ccMngrSearch` | 2111, 2142 |
| `ccMngrDropdown` | 2112, 2143 |

**NOT eliminated (reference persists in live code outside the spans — confirmed, left as-is):** `ccMngrItemSelect` (1455/1536/1614 inside live `initializeCcSyncChannel`, plus 2141 in dead span 3 — the live occurrences keep this finding open), `ccMobileBridgeStatus` (1437 live + 2025 live `updateCCRouteUI`), `ccScannerStatusIndicator` (1438 live), `ccScannerQRContainer` (1439 live), `ccRemotePreviewScreenContainer` (1440 live), `pcRouteBar` (1441 live), `ccMngrQtyInput` (1615, purely live — not even referenced in a deleted span), `ccRemotePreviewScreen` (1479 live + 2023 live), `barcode-reader` (1901 live, inside `stopCycleCount`), `inlineCycleScannerCard` (1919 live, inside `stopCycleCount`), `pcRoutePhone`/`pcRoutePC`/`pcRouteBoth`/`ccPhoneOnlyPlaceholder` (all live, inside `updateCCRouteUI` only — never referenced in span 2 at all, so span 2's deletion has zero effect on these regardless).

This matches Batch 4's Option B estimate of "12 ids" exactly, one-for-one.

### N1_GHOST_ID_PREFIX: 0 → 0 (unchanged)

All 12 eliminated ids (and all persisting ones) are literal `getElementById('exact-string')` calls — none use string concatenation/prefix construction. This batch resolves zero prefix-kind findings.

### N2_ORPHAN_HANDLER: likely decreases by up to 8 — **discovered side effect, not in the task's original scope, do not treat the number as confirmed until the live scan runs**

`checkN2` (`scripts/nomenclature-audit.js:319-344`) flags any `system-event-delegator.js` switch case with **zero direct `data-click`/`data-change` emitter and zero indirect string-literal match anywhere else in the codebase** (the `allStringLiterals` "RESOLVED-INDIRECT" exemption). Full-repo grep (not scoped to `.html`) for all 8 deleted case tokens found **zero occurrences anywhere** except the delegator's own case labels and Batch 4's plan-doc prose (a `.md` file, not a scanned source per `collectPass1`'s per-file-type scanning) — meaning none of the 8 tokens qualify for the indirect exemption either. This strongly suggests all 8 are **currently already flagged as `N2_ORPHAN_HANDLER`**, and deleting them should reduce that count by up to 8. **This is a bonus, not a scoped goal of this batch** — the task only asked for N1_GHOST_ID accounting. Flag this as an additional expected-but-unconfirmed row in the verification table; the implementer must run the actual `--warn` scan and report the real delta rather than hardcode "−8."

Note: the `data-app-click="selectCcItem"` dispatcher branch (A4) is a **separate mechanism** from `system-event-delegator.js` and is **not** covered by `checkN2` at all (that check only parses `system-event-delegator.js`'s own switch statement) — deleting line 3560 has no N2 effect.

### N7_DICT_STALE: 0 → 0 (unchanged)

No registry edit this batch — nothing to regenerate.

### N3_LABEL_DRIFT: 1 → 1 (unchanged)

Not touched — this rule only scans hub-tab/pane labels in `index.html`, which this batch never edits.

### N4_LEGACY_TERM: 85 → 85 (unchanged)

`registry.legacy_term_watchlist` (`tools/nomenclature-registry.json:227-231`) is a **fixed 5-term list**: `Salez`, `Nexl`, `Salz`, `Bridge`, `Prod`. None of these terms appear as identifier-boundary segments anywhere in the 3 deletion spans (confirmed by direct read of all ~320 deleted lines — the deleted code's vocabulary is "Cycle Count" / "CC" / "Scanner" / "Route" / "Mngr", none of which the watchlist tracks). Deleting this code cannot change N4's count.

### N5_NEW_NONCONFORMANT_KEY: 0 → 0 (unchanged)

The deleted code reads/writes `localStorage` key `neogleamz_pc_local_ip` (lines 1829/1871/1874/1877) — but this key is **also used extensively outside the deletion spans** (`inventory-module.js:2325`, `2490`, `2570`, `2573` — inside the live `stockzAuditModal` remote-bridge code — plus `packerz-module.js:3189/3239/3242/3245`), so it is not deleted, and `N5` only tracks *new* nonconformant keys against a frozen baseline (existing legacy-prefixed keys are grandfathered per D8) — irrelevant either way.

### N6_UNUSED_CSS: 29 → 29 (unchanged) — checked explicitly, not assumed

`filterCcMngrItems` (deleted, span 3) contains the only two usages of CSS class `.cc-dropdown-item` (`querySelectorAll('.cc-dropdown-item')` at lines 2124 and 2131). The class is *defined* at `inventory-module.js:21-22` (`.cc-dropdown-item { ... }` / `.cc-dropdown-item:hover { ... }`, injected via a JS-created `<style>` element — **not** an HTML `<style>` block). Traced `collectCssDefs` (`scripts/nomenclature-audit.js:207-219`) and its caller (`collectPass1`, line 246: `if (rec.relPath.endsWith('.html'))`) — **CSS class *definitions* are only collected from `.html` files** (2 files total, per the code's own comment). Since `.cc-dropdown-item` is defined inside a `.js` file, it was **never captured as an `N6` definition in the first place**, regardless of usage — deleting its only usages changes nothing. (Independently, even if it had been captured: `collectCssUsageLine` only recognizes `class="..."` attributes, `classList.*()` calls, and `.className =` assignments — never `querySelectorAll('.foo')` — so these two lines were never counted as a "usage" either. Double-confirmed no effect via two independent mechanisms.)

---

## Verification

| Rule | Before | After | Confidence |
|---|---|---|---|
| `N1_GHOST_ID` | 141 | **129** | High — per-id grep-verified above |
| `N1_GHOST_ID_PREFIX` | 0 | 0 | High — no prefix-kind ids in deleted spans |
| `N2_ORPHAN_HANDLER` | (not previously tabulated by Batches 1-4) | likely −8, **unconfirmed** | Medium — run `--warn` and record actual delta, do not assume |
| `N7_DICT_STALE` | 0 | 0 | High — no registry edit |
| `N3_LABEL_DRIFT` | 1 | 1 | High — not touched |
| `N4_LEGACY_TERM` | 85 | 85 | High — fixed 5-term watchlist, none present in deleted code |
| `N5_NEW_NONCONFORMANT_KEY` | 0 | 0 | High — key persists elsewhere; rule only tracks new keys anyway |
| `N6_UNUSED_CSS` | 29 | 29 | High — class def never scanned (JS-injected, not `.html`); usage pattern also never scanned |

**Other required checks:**
- `npm test` → 59/59 passing (unchanged). Confirmed via full-repo grep: **zero** references anywhere in `tests/*.js` to any of the 9 deleted function/alias names, `selectCcItem`, or `cachedCcMngrOptions`. Note: `tests/inventory-engine.test.js:16` does `require('../assets/js/inventory-module.js')` — the **whole file is executed**, not just referenced — so any brace-mismatch from an imprecise deletion boundary will surface immediately as a `SyntaxError` failing that entire test file, not as a silent logic bug. Treat a clean test run as strong positive confirmation of correct excision boundaries.
- `npx eslint .` → 0 errors / 0 warnings (unchanged, contingent on the `break;`-inclusive delegator spans above — see B1's load-bearing correction — and on removing `eslint.config.mjs:259` cleanly without touching `stopCycleCount` at line 276).
- `node scripts/xss-audit.js` → 0 violations before and after (see Security/XSS section below — all deleted `innerHTML` writes were already compliant).
- Pre-commit hook (`.githooks/pre-commit`) runs the nomenclature audit in `--warn --changed-only` mode — advisory only. The XSS gate is blocking but unaffected (see below).

**Baseline handling:** following Batches 1-4's established precedent, **do not run `--update-baseline`** this batch. This is pure shrink (fewer findings), which `updateBaseline()` always accepts silently regardless — but running it now would produce a noisy diff unrelated to this batch's actual change, breaking the one-batch-one-concern pattern. Same deferral-to-a-future-consolidated-refresh note as Batch 4 applies.

---

## Security / XSS

**No unguarded pattern is being introduced or removed** — this batch only deletes code, and every `innerHTML`/`insertAdjacentHTML` write inside the 3 deletion spans was already compliant:

| Line | Code | Status |
|---|---|---|
| 1674 | `readerEl.innerHTML = window.safeHTML('');` | Guarded — correct pattern (empty string via `safeHTML`) |
| 1816 | `statusCheck.innerHTML = '🔴 Waiting for Phone Connection...';` | Static literal, no interpolation — compliant per the "static/empty strings, no wrapper needed" allowed pattern |
| 2117, 2122 | `dropdown.innerHTML = window.safeHTML(window.cachedCcMngrOptions);` | Guarded — correct pattern |
| 2134 | `dropdown.innerHTML = window.safeHTML('<div ...>No items found.</div>');` | Guarded (redundant on a static string, but compliant) |

None were `FORBIDDEN_TERNARY` or unguarded dynamic-data writes. Since all four sites are being **deleted, not modified**, `node scripts/xss-audit.js` should show **0 violations before and after** — a no-op confirmation, not a fix. `selectCcMngrItem`'s `document.getElementById('ccMngrItemSelect').value = val;` (line 2141) is a **null-reference crash risk** (would throw if ever reached — it never is), **not an XSS risk** — `.value =` does not parse HTML.

**RLS implications:** none. Verified none of the 9 deleted functions perform any Supabase table query (`supabaseClient.from(...)`) — the only Supabase-adjacent calls in the deleted spans are Realtime **broadcast** sends (`window.ccSyncChannel.send({type:'broadcast', ...})`, `window.ccSyncChannel.httpSend(...)`), and the channel object itself (`initializeCcSyncChannel`, `stopCycleCount`) is untouched, live infrastructure. No RLS policy, table, or column is read, written, or referenced by any deleted line.

**Print-window DOMPurify:** not applicable — no print-window code path exists in any of the 9 deleted functions.

---

## Vanilla JS / framework constraints

Deletions only remove `window.X = function/async function` declarations and one `let` (module-scoped var, untouched, stays) — no `var` was present in any deleted code, none is introduced. No framework code, no build step, no new CSS. The one `eslint.config.mjs` edit is a JSON-like config removal, not JS logic.

## 4-state UX / UI mutex / zero-refresh

Not applicable — no data component, no DB mutation button, no async operation. Every function deleted was already unreachable (zero HTML producer for any button/dropdown/input that could trigger them — confirmed via full-repo grep across all `.html` files: zero matches for any of the 9 function/alias names or `selectCcItem`). Nothing visibly rendered changes behavior for any user.

## Schema / Master Reference / Topological integrity

No Supabase table/column/RLS change — `tools/SK8Lytz_App_Master_Reference.md` `## Database Schemas` section is unaffected, no update required. **No button, modal, or UI element is created, deleted, or moved** — confirmed these 9 functions/tokens never had any corresponding markup in `index.html` (or any other `.html` file) to begin with, so the Mermaid Architectural Blueprint is unaffected; the topological-integrity rule does not apply to removing orphaned JS handlers with no HTML counterpart. Independently confirmed: Master Reference currently contains zero mentions of any of these ids/functions/"Cycle Count Manager" terminology, so no doc drift is created or resolved by this batch.

---

## Risks

1. **Three-span excision precision in `inventory-module.js`.** Non-contiguous deletions in the same file, each bounded by live code on at least one side (`ccLocalQrScanner` shared var before span 1; `updateCCRouteUI`/`stopCycleCount` before/after spans 1-2; `resumeCycleCount`/banner comment/`populateStockzAuditDropdown` around spans 2-3). Mitigation: delete bottom-to-top or use exact-string `Edit` matching; re-read the file after each edit before proceeding to the next span.
2. **Delegator off-by-one (the `break;` correction, B1/B2 above) is load-bearing.** Deleting only `case` + call lines while leaving the trailing `break;` behind creates an orphaned unreachable statement — a likely **new** ESLint `no-unreachable` error, which would fail the "0 errors" gate this batch is required to pass clean.
3. **`eslint.config.mjs` proximity risk.** `selectCcMngrItem` (line 259, delete) and `stopCycleCount` (line 276, a live, different, in-scope-to-keep global) sit in the same alphabetically-sorted block, 17 lines apart — low but real risk of deleting the wrong line; verify by exact string match, not line number alone.
4. **Dispatcher-branch surgery (A4) must not touch adjacent branches.** Lines 3557-3559 and 3561-3562 are unrelated, live `if (action === '...')` branches inside the same shared click dispatcher — delete exactly line 3560, confirm the surrounding structure is untouched via `git diff` after the edit.
5. **Test-suite coupling is a safety net, not just a risk.** `tests/inventory-engine.test.js:16` `require()`s the whole file — any brace-mismatch surfaces immediately as a `SyntaxError` failing that test file. Confirmed zero test references to any of the 9 deleted names via full-repo grep of `tests/*.js` (zero hits).
6. **N2_ORPHAN_HANDLER delta is an estimate, not a guarantee** (see Scanner Deltas above) — do not report a specific "before → after" number for this rule until the actual `--warn` scan runs; report what the tool says.
7. **Residual cosmetic debt intentionally left in place** (not a risk to this batch, but worth tracking): `window.resumeCycleCount` (2102-2104) and the "CYCLE COUNT MANAGER MODAL LOGIC" banner comment (2106-2108, becomes stale once span 3 is gone) are both out of this batch's 9-function contract and are left untouched — candidates for a future, separately-scoped cleanup pass.

---

## Files Touched

- `assets/js/inventory-module.js` — delete 3 spans (1638-1886, 2066-2100, 2110-2145 = 320 lines) + 1 dispatcher-branch line (3560). Net: 321 lines removed.
- `assets/js/system-event-delegator.js` — delete 2 spans (1211-1231, 1883-1885 = 24 lines).
- `eslint.config.mjs` — delete 1 line (259, `"selectCcMngrItem": "writable",`).

**Not touched (confirmed):** `tools/nomenclature-registry.json`, `docs/nomenclature_dictionary.md` (no registry edit this batch, nothing to regenerate), `scripts/nomenclature-baseline.json` (precedent: deferred to a future consolidated refresh), `tools/SK8Lytz_App_Master_Reference.md` (no schema/RLS/UI-topology change), `index.html` (no button/modal ever existed for any of these 9 functions), any Supabase table/RLS, `tools/SK8Lytz_Bucket_List.md` (ledger-exemption rule — syncs at `/wind-down`).

## Suggested commit messages (micro-commit cadence)

Three small, semantically-scoped commits, one per file, matching Batches 1-4's one-concern-per-commit pattern:

1. `refactor(nomenclature): delete 9 dead Cycle Count Mobile Bridge functions (Option B-lite)`
   — `assets/js/inventory-module.js` (3 spans + dispatcher branch)
2. `refactor(nomenclature): remove 8 orphaned Cycle Count delegator cases`
   — `assets/js/system-event-delegator.js`
3. `chore(nomenclature): remove stale selectCcMngrItem eslint global`
   — `eslint.config.mjs`

(Per the ledger-exemption rule, `tools/SK8Lytz_Bucket_List.md` is not touched in any of these micro-commits — it syncs naturally at `/wind-down`.)

---

## Execution Addendum (post-implementation, same batch)

Two facts diverged from this plan during execution — both resolved in-batch, recorded here for the audit trail:

1. **Two delegator cases the B1/B2 enumeration missed.** The implementer's post-deletion grep found `case 'click_updateLocalIPQRCode_cc'` (system-event-delegator.js:264-266, guarded) and `case 'keyup_window_filterCcMngrItems'` (1673-1675, UNGUARDED call) still wired to two of the nine deleted functions. Both tokens verified zero-emitter in index.html and all modules, so no live path existed before or after; but leaving cases that invoke deleted functions contradicts this batch's own item-B intent, so both case blocks (6 lines) were removed by the parent session as an approved-scope completion. Delegator deletion total: 10 cases / 30 lines, not 8 / 24.
2. **Scanner deltas beat the forecast.** Actual: N1_GHOST_ID 141→109 (−32, vs. −12 predicted — the scanner counts per-occurrence, not per-deduped-id, and the dead functions duplicated many DOM lookups that live `updateCCRouteUI`/`stopCycleCount` code also performs, so deleting them removed extra occurrences of ids that themselves remain open, e.g. `ccMngrItemSelect` 6→3, `ccScannerStatusIndicator` 3→1). Bonus N4_LEGACY_TERM 85→84 (deleted `ccMobileBridgeStatus` lookup in `startRemoteCycleCount` carried the watchlisted camelCase term "Bridge"). N2_ORPHAN_HANDLER stayed 0→0 — the plan's "likely −8" was wrong because `checkN2`'s indirect-match exemption scans the delegator file itself, so a `case 'token':` string literal self-satisfies the exemption; the rule is structurally unable to fire on switch-case tokens (pre-existing scanner limitation, NOT fixed this batch — candidate for a future scanner-hardening task).
