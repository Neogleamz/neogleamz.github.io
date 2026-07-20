# debt/nomenclature-remediation — Batch 9: `cc*` Cycle Count Mobile Bridge cluster (19 N1_GHOST_ID findings)

## 0. Methodology note — the explore-mapper's verdicts were NOT trusted; every claim below was independently re-derived

Per the task brief, this epic's mapper has been wrong, in confident and specific ways, in every prior batch (Batch 4: called a live cluster dead; Batch 6: wrong live/dead call on `executeSopPrint`; Batch 7: hallucinated 5 function names, missed 2 live bugs; Batch 8: wrongly claimed 74/84 registry-protected, off by 13). This plan re-derived every verdict from direct `Read`/`Grep` evidence — the DOM producers were individually grepped in `index.html`, the phone-side counterpart (`tools/remote-scanner.html`) was read for every broadcast/handler pairing, and the retirement of the legacy standalone "Cycle Count Manager" modal was traced via `window.openCycleCountManager`/`closeCycleCountManager`/`updateCcMngrStock` (confirmed thin aliases forwarding to `openStockzAuditModal`/`closeStockzAuditModal`/`selectStockzAuditItem`).

**Confirmed baseline (authoritative, not a hand-derived estimate):** `tools/SK8Lytz_Bucket_List.md` records Batch 8's own live-scanned result: *"N1_GHOST_ID 20 (1 is `packerzAdminRecipeSelect` from Batch 6, tied to the data-prodid bug; ~19 are the `cc*` Cycle Count Mobile Bridge cluster ... permanently persisting inside live shared functions)."* This plan's 19-identifier trace (below) reproduces that exact count line-for-line. **Going-in baseline for this batch: N1_GHOST_ID = 20 total (19 in scope here + 1 `packerzAdminRecipeSelect`, out of scope, untouched).**

**Fix-category taxonomy (per Batches 4-8 precedent):**
- **(a) REGISTRY ALLOWLIST** — verified real producer, scanner-blind only. *(Not used this batch — every finding here is a genuine ghost, zero real producer.)*
- **(b) DEAD-CODE DELETION** — zero live callers to the containing function/handler.
- **(c) IN-FUNCTION SURGERY (trivial only)** — ghost read inside a live function, deletion proven zero-behavior-change.
- **(d) LEAVE AS FINDING** — a real, reachable bug tangled with functionality outside nomenclature-remediation scope; not touched this batch.

---

## 1. THE CRITICAL QUESTION — scenario A vs. scenario B, resolved per-identifier with independent evidence

### 1.1 First — verify the 5 claimed "modern DOM-id sibling" pairs actually exist as real producers

Grepped `index.html` directly for each claimed modern id:

| Old (ghost) id | Line (inventory-module.js) | Claimed modern sibling | Modern sibling confirmed real? | Evidence |
|---|---|---|---|---|
| `ccScannerStatusIndicator` | 1395 | `stockzAuditScannerStatusIndicator` | ✅ REAL | `index.html:6598` `<span id="stockzAuditScannerStatusIndicator" ...>` |
| `ccScannerQRContainer` | 1396 | `stockzAuditMobileQRContainer` | ✅ REAL | `index.html:6636` `<div id="stockzAuditMobileQRContainer" ...>` |
| `ccRemotePreviewScreenContainer` | 1397 | `stockzAuditMobilePreviewContainer` | ✅ REAL | `index.html:6639` `<div id="stockzAuditMobilePreviewContainer" ...>` |
| `ccRemotePreviewScreen` | 1436, 1731 | `stockzAuditMobilePreviewScreen` | ✅ REAL | `index.html:6640` `<img id="stockzAuditMobilePreviewScreen" ...>` |
| `ccPhoneOnlyPlaceholder` | 1732 | `stockzAuditPhoneOnlyPlaceholder` | ✅ REAL | `index.html:6641` `<div id="stockzAuditPhoneOnlyPlaceholder" ...>` |

**All 5 claimed modern siblings are confirmed real, live DOM producers.** The mapper did not hallucinate any of these.

### 1.2 Second — the load-bearing question, resolved individually per pair

**`ccRemotePreviewScreen` → `stockzAuditMobilePreviewScreen` — SCENARIO A (redundant leftover), smoking-gun evidence.** Read `REMOTE_FRAME_STREAM`'s handler in full (inventory-module.js:1433-1442):
```js
window.ccSyncChannel.on('broadcast', { event: 'REMOTE_FRAME_STREAM' }, (envelope) => {
    const payload = envelope.payload;
    if (payload && payload.frame) {
        const screenOld = document.getElementById('ccRemotePreviewScreen');
        if (screenOld) screenOld.src = payload.frame;

        const screenNew = document.getElementById('stockzAuditMobilePreviewScreen');
        if (screenNew) screenNew.src = payload.frame;
    }
});
```
The variables are **literally named `screenOld`/`screenNew`** — the parallel, correct, modern-id-targeting code sits in the exact same handler, 2 lines below the ghost. This is not an inference, it's self-documented. **Verdict: (c) IN-FUNCTION SURGERY, safe deletion of the `screenOld` pair.**

**`ccPhoneOnlyPlaceholder` — SCENARIO A, but only because the containing function is 100% dead (see §1.3).** In isolation this id has the same "modern sibling managed elsewhere" profile as the pair above (the real `stockzAuditPhoneOnlyPlaceholder` is correctly toggled by the `MOBILE_PREVIEW_MODE_CHANGED` handler, inventory-module.js:1455/1461/1464/1467). Bundled into the `updateCCRouteUI` finding below rather than deleted in isolation — see §1.3.

**`ccScannerStatusIndicator` → `stockzAuditScannerStatusIndicator` — SCENARIO B, confirmed live bug.** Grepped the entire repo for every write to `stockzAuditScannerStatusIndicator`: **zero results outside its own static declaration** (`index.html:6598`, hardcoded `background:#ef4444` red, `animation:pulse 1.5s infinite`). No other function anywhere ever sets this element's color. The only code that *ever* attempted to turn this indicator green on phone-connect is the `MOBILE_CONNECT` handler's `ccScannerStatusIndicator` block (inventory-module.js:1401-1404) — which targets a ghost id and is therefore permanently inert. **Conclusion: the "turn the scanner status dot green when the phone connects" feature has been silently broken since whatever refactor renamed this id family — this is genuinely the ONLY code path that ever attempted it, and it's broken.** Left as finding, not touched (§4, Finding 1).

**`ccScannerQRContainer`/`ccRemotePreviewScreenContainer` → `stockzAuditMobileQRContainer`/`stockzAuditMobilePreviewContainer` — SCENARIO B, confirmed live (partial) bug.** The modern siblings ARE correctly managed, but only by the `MOBILE_PREVIEW_MODE_CHANGED` broadcast handler (inventory-module.js:1444-1471), which only fires when the **phone-side operator manually taps one of the 3 preview-route buttons** (`tools/remote-scanner.html:1321-1350`, `setPreviewMode()` — confirmed called *exclusively* from 3 click listeners, never automatically on connect/page-load). **Confirmed: nothing sends `MOBILE_PREVIEW_MODE_CHANGED` automatically when `MOBILE_CONNECT` fires.** Net effect: the instant the phone connects, the QR code does **not** auto-hide and the live-preview container does **not** auto-show on the modern UI — the operator must additionally tap a phone-side route button (even re-tapping the default "Phone" mode) before the correctly-wired modern-id handler runs. Left as finding, not touched (§4, Finding 2).

### 1.3 `updateCCRouteUI()` — control-flow claim re-verified, and its own scenario A/B question resolved

Read the function fresh (inventory-module.js:1727-1772):
```js
window.updateCCRouteUI = function(mode) {
    const btnPhone = document.getElementById('pcRoutePhone');
    const btnPC = document.getElementById('pcRoutePC');
    const btnBoth = document.getElementById('pcRouteBoth');
    const screen = document.getElementById('ccRemotePreviewScreen');
    const placeholder = document.getElementById('ccPhoneOnlyPlaceholder');
    const statusCheck = document.getElementById('ccMobileBridgeStatus');

    if (!btnPhone) return;
    // ... forEach + if/else branches, all reference btnPhone/btnPC/btnBoth/screen/placeholder/statusCheck, all individually guarded ...
```
**Confirmed: all 6 `getElementById` calls execute unconditionally** (they're `const` declarations above the guard) — but **`pcRoutePhone` has zero producer anywhere in `index.html`** (confirmed via repo-wide grep), so `btnPhone` is always `null`, and `if (!btnPhone) return;` **always trips, unconditionally, every single call.** The `[btnPhone, btnPC, btnBoth].forEach(btn => { if (btn) {...} })` loop the mapper cited is real (line ~1738) but **never reached** — traced and confirmed it is also individually null-safe regardless (each iteration is itself guarded), so even in a counterfactual world where the early return didn't exist, it could not throw on a null entry. **The mapper's claim is accurate: the guard covers all 3 button reads, and the forEach cannot throw on a null entry either way.**

This makes `updateCCRouteUI()` a **100%-dead-body function** — structurally identical to Batch 7's `initVerticalResizer` (also guard-gated on a confirmed-always-null lookup). The critical difference: `initVerticalResizer` had **zero callers anywhere** (fully orphaned, safe outright deletion); `updateCCRouteUI` has **2 live call sites**, both inside this same cc* cluster (`MOBILE_CONNECT` handler line 1409, `MOBILE_PREVIEW_MODE_CHANGED` handler line 1449), both feeding it a `currentPreviewMode` value that a live broadcast handler actively tracks. Root-cause tracing via `docs/plans/feat-cycle-count-dual-preview.md` (the original design doc for this whole feature) confirms the **intent**: *"Insert the preview routing selector buttons so the PC operator can also control the live stream destination dynamically"* — a bidirectional, PC-side 3-way (Phone/PC/Both) routing selector. Confirmed via grep: **the PC never sends `PC_PREVIEW_MODE_CHANGED` anywhere** (zero occurrences in `inventory-module.js`) — the bidirectional half of the original design was either never built or was removed, and no PC-side `pcRoutePhone`/`pcRoutePC`/`pcRouteBoth`/`pcRouteBar` markup exists today (all 4 confirmed zero producer, repo-wide).

**Verdict: ambiguous between "intentionally retired, safe to delete wholesale" and "lost-but-still-desired feature, should be restored" — this is a product decision, not a nomenclature-cleanup decision.** Deleting the function + both call sites + the `currentPreviewMode` variable would be provably zero-behavior-change *today*, but it is also the single most structurally invasive, least-reversible edit available in this cluster (removing live-called machinery, not just a guarded dead branch), and doing so forecloses "restore the bidirectional routing" as an option without an explicit product call. **Treated as LEAVE AS FINDING (§4, Finding 5) — not touched this batch.** This bundle also carries `ccRemotePreviewScreen`@1731, `ccPhoneOnlyPlaceholder`@1732, and `ccMobileBridgeStatus`@1733 (the 2nd occurrence) — even though those 3, taken alone, would qualify as "safe" under the same logic as their siblings elsewhere in the cluster, they are bundled into the untouched function for consistency and conservatism (see §4, Finding 5 for full reasoning).

### 1.4 Synthesis

| Scenario | Identifiers | Disposition |
|---|---|---|
| **A — genuinely redundant, real parallel code path already works** | `ccRemotePreviewScreen`@1436/1437 (REMOTE_FRAME_STREAM), `ccMngrItemSelect`@1571 + `ccMngrQtyInput`@1572 (dead legacy-modal fallback branch), `barcode-reader`@1609 (stopCycleCount), `inlineCycleScannerCard`@1627 (stopCycleCount), `scanner-success-flash`@1647 (no modern sibling ever existed — purely decorative, zero data/workflow impact), `ccMobileBridgeStatus`@1394 (text-status concept absorbed into the — currently broken — single-dot indicator, no separate modern text field ever built) | Safe deletion this batch (§2) |
| **B — this ghost code is the ONLY attempt, and it's broken** | `ccScannerStatusIndicator`@1395, `ccScannerQRContainer`@1396, `ccRemotePreviewScreenContainer`@1397, `ccMngrItemSelect`@1412 (ITEM_DIRECTORY broadcast), `ccMngrItemSelect`@1493 (MOBILE_ITEM_SELECTED) | **LEAVE AS FINDING** (§4, Findings 1-4) |
| **Ambiguous — product decision required** | `pcRoutePhone`@1728, `pcRoutePC`@1729, `pcRouteBoth`@1730, `pcRouteBar`@1398, `ccRemotePreviewScreen`@1731, `ccPhoneOnlyPlaceholder`@1732, `ccMobileBridgeStatus`@1733 | **LEAVE AS FINDING** (§4, Finding 5) |

---

## 2. Second-priority verification — the `scanner-beep`/`scanner-success-flash` reconciliation

Read lines 1634-1652 (`onScanSuccess`) directly:
```js
1641:    let beep = document.getElementById('scanner-beep');
1642:    if (beep) {
1643:        beep.currentTime = 0;
1644:        beep.play().catch((err)=>{ sysLog("Scanner beep audio playback blocked/failed: " + err); });
1645:    }
1646:
1647:    let flash = document.getElementById('scanner-success-flash');
1648:    if (flash) {
1649:        flash.style.display = 'block';
1650:        setTimeout(() => flash.style.display = 'none', 300);
1651:    }
```
Grepped `index.html` for both ids:
- `scanner-beep` — **REAL**, `index.html:7232`: `<audio id="scanner-beep" src="https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3" preload="auto"></audio>`.
- `scanner-success-flash` — **zero producer anywhere** (confirmed repo-wide grep).

**Reconciliation: no hallucination, no mislabeling — the mapper's two statements are both independently accurate, just confusingly juxtaposed in its prose.** Line 1641 (`scanner-beep`) really is real and really is at line 1641; line 1647 (`scanner-success-flash`) really is a ghost and really is at line 1647. These are two **different, adjacent** identifiers that happen to share a "scanner-" prefix and a similar purpose (audio vs. visual feedback on scan success) — the mapper evidently cited `scanner-beep`'s line/status while explaining why it does **not** appear in the 19-finding list (correctly excluded, since it's real), and this got compressed into confusing prose that reads as if it might be a 20th finding. **It is not a 20th finding; the original 19-count is exactly reproduced by this plan's independent trace (§3); `scanner-beep` was never a ghost and correctly never appeared in your list.**

---

## 3. Full verified inventory — all 19 raw occurrences

| # | Identifier | Line | Containing function | Modern sibling? | Verdict |
|---|---|---|---|---|---|
| 1 | `ccMobileBridgeStatus` | 1394 | `initializeCcSyncChannel` → `MOBILE_CONNECT` | Concept absorbed into (broken) dot indicator; no separate modern text field | **(c) delete** |
| 2 | `ccScannerStatusIndicator` | 1395 | same | `stockzAuditScannerStatusIndicator` (real, zero other writer) | **(d) LEAVE AS FINDING — Finding 1** |
| 3 | `ccScannerQRContainer` | 1396 | same | `stockzAuditMobileQRContainer` (real, managed by a different event) | **(d) LEAVE AS FINDING — Finding 2** |
| 4 | `ccRemotePreviewScreenContainer` | 1397 | same | `stockzAuditMobilePreviewContainer` (real, managed by a different event) | **(d) LEAVE AS FINDING — Finding 2** |
| 5 | `pcRouteBar` | 1398 | same | none (retired-or-lost 3-way selector) | **(d) LEAVE AS FINDING — Finding 5 (bundled)** |
| 6 | `ccMngrItemSelect` | 1412 | same, `ITEM_DIRECTORY` broadcast block | `stockzAuditItemSelect` (real, but a rename here is a functional fix, not cleanup) | **(d) LEAVE AS FINDING — Finding 3** |
| 7 | `ccRemotePreviewScreen` | 1436 | `initializeCcSyncChannel` → `REMOTE_FRAME_STREAM` | `stockzAuditMobilePreviewScreen` (real, managed 2 lines below, same handler) | **(c) delete** |
| 8 | `ccMngrItemSelect` | 1493 | `initializeCcSyncChannel` → `MOBILE_ITEM_SELECTED` | `stockzAuditItemSelect`/`currentAuditItemKey` (real, but fix = functional change) | **(d) LEAVE AS FINDING — Finding 4** |
| 9 | `ccMngrItemSelect` | 1571 | `initializeCcSyncChannel` → `MOBILE_SAVE_COUNT` else-branch | n/a — branch only reachable when `stockzAuditModal` is closed; nothing to update regardless of id | **(c) delete** |
| 10 | `ccMngrQtyInput` | 1572 | same | same | **(c) delete** |
| 11 | `barcode-reader` | 1609 | `stopCycleCount` | `stockzAuditLocalReader`, cleaned up correctly by the always-paired `stopStockzAuditWebcam()` | **(c) delete** |
| 12 | `inlineCycleScannerCard` | 1627 | `stopCycleCount` | `stockzAuditModal` itself, hidden correctly by the always-paired `closeStockzAuditModal()` | **(c) delete** |
| 13 | `scanner-success-flash` | 1647 | `onScanSuccess` | none, ever (no modern equivalent element exists anywhere) | **(c) delete** |
| 14 | `pcRoutePhone` | 1728 | `updateCCRouteUI` | none | **(d) LEAVE AS FINDING — Finding 5** |
| 15 | `pcRoutePC` | 1729 | same | none | **(d) LEAVE AS FINDING — Finding 5** |
| 16 | `pcRouteBoth` | 1730 | same | none | **(d) LEAVE AS FINDING — Finding 5** |
| 17 | `ccRemotePreviewScreen` | 1731 | same | `stockzAuditMobilePreviewScreen` (real) — bundled for consistency, see §1.3 | **(d) LEAVE AS FINDING — Finding 5** |
| 18 | `ccPhoneOnlyPlaceholder` | 1732 | same | `stockzAuditPhoneOnlyPlaceholder` (real) — bundled for consistency, see §1.3 | **(d) LEAVE AS FINDING — Finding 5** |
| 19 | `ccMobileBridgeStatus` | 1733 | same | n/a — inside the 100%-dead function body | **(d) LEAVE AS FINDING — Finding 5** |

**Total: 19 raw occurrences. Safe deletion: 7 (rows 1, 7, 9, 10, 11, 12, 13). LEAVE AS FINDING, untouched: 12 (rows 2-6, 8, 14-19).**

---

## 4. LEAVE AS FINDING — 5 bugs discovered this batch, explicitly NOT fixed here

Per the task mandate (same treatment as Batch 6's `data-prodid` discovery and Batch 7's Regex Playground discoveries): these are real, reachable functional bugs entangled with business/product logic outside nomenclature-remediation scope. Recommend logging one dedicated `fix/*` task (e.g. `fix/cc-mobile-bridge-sync-bugs`) covering all 5 via `/idea_intake` at the next `/wind-down`.

**Finding 1 — MEDIUM, cosmetic/trust signal: the Audit Scanner connection-status dot never turns green.**
`stockzAuditScannerStatusIndicator` (index.html:6598) is hardcoded red/pulsing (`background:#ef4444`) and has **zero JS writer anywhere in the repo** except its own static declaration. The only code that ever attempted to change it — the `MOBILE_CONNECT` handler's `ccScannerStatusIndicator` block (inventory-module.js:1395, 1401-1404) — targets a ghost id and is permanently inert. **Reproduction:** open STOCKPILEZ → STOCKZ → scan any item to open `stockzAuditModal` → click "📷 SCAN PORTAL" → click "📱 Smartphone Link" → scan the QR with a phone → phone connects and streams successfully → the small status dot next to "📷 AUDIT SCANNER" stays red and pulsing forever, even though the bridge is fully live. Minimal fix (future task, not this batch): change `getElementById('ccScannerStatusIndicator')` to `getElementById('stockzAuditScannerStatusIndicator')` at line 1395.

**Finding 2 — LOW-MEDIUM, UX gap: the QR code does not auto-hide / live preview does not auto-show on initial phone connect.**
`stockzAuditMobileQRContainer`/`stockzAuditMobilePreviewContainer` (index.html:6636/6639) ARE correctly managed, but only by the `MOBILE_PREVIEW_MODE_CHANGED` handler (inventory-module.js:1444-1471), which only fires when the phone-side operator manually taps a preview-route button (`tools/remote-scanner.html:1321-1350`). The `MOBILE_CONNECT` handler's own attempt to do this immediately on connect (lines 1396-1397, 1405-1406) targets ghost ids `ccScannerQRContainer`/`ccRemotePreviewScreenContainer` and is inert. **Reproduction:** same steps as Finding 1 — after the phone connects, the QR code box remains visible and the live-preview box remains hidden until the operator additionally taps any Phone/PC/Both button on the phone screen. Minimal fix (future task): change both ghost ids at lines 1396/1397 to their real siblings.

**Finding 3 — HIGH, functional: the phone's manual "Choose Item Natively" dropdown is always empty.** Two compounding bugs:
1. The PC's `ITEM_DIRECTORY` broadcast (inventory-module.js:1411-1426) reads `getElementById('ccMngrItemSelect')` — a ghost — so `items` is always `[]`.
2. The phone's own notionally-primary path, `populateItemsFromCache()` (`tools/remote-scanner.html:1034`), is gated on `if (payload.catalogCache)` inside its `SESSION_TRANSFER` handler (line 932) — but the PC's actual `SESSION_TRANSFER` broadcast (inventory-module.js:1367-1374, 1381-1391) **never includes a `catalogCache` field**, so this path also never fires. `tools/remote-scanner.html:1016`'s own comment calls `ITEM_DIRECTORY` a "(fallback)" — but it is in fact the sole mechanism attempted, and it's broken too.
**Reproduction:** connect the phone as above, expand the phone's manual item-selection drawer — the dropdown shows only the placeholder `-- Choose Item Natively --`, never any real items, 100% of the time. Minimal fix (future task): point `ccMngrItemSelect` at `stockzAuditItemSelect` (restores the fallback path); separately consider whether to also populate `catalogCache` in the `SESSION_TRANSFER` payload to fix the intended primary path.

**Finding 4 — HIGH, functional, potential silent data loss: phone-side manual item selection never syncs to the PC, which can cause a counted quantity to silently fail to save.**
`MOBILE_ITEM_SELECTED`'s PC-side handler (inventory-module.js:1490-1499) reads `getElementById('ccMngrItemSelect')` — a ghost — so `window.updateCcMngrStock()` is never triggered with the phone's selection, and the PC's `window.currentAuditItemKey` is never updated to match. **Confirmed live-scanner.html still broadcasts this event** (`tools/remote-scanner.html:1384-1400`, on every dropdown change) — this is not a retired feature on the phone side. Consequence: `MOBILE_SAVE_COUNT`'s PC-side handler (inventory-module.js:1527) gates the actual save on `if (payload.value === window.currentAuditItemKey)` — if the operator picked a different item via the phone's dropdown, this condition is now false (since the PC's key was never updated), so `submitStockzAudit()` **never fires, with zero error toast, zero console warning, on either device.** **Reproduction:** on the PC, open the audit for Item A; on the phone, use the manual dropdown to pick Item B instead of scanning; enter a count and submit from the phone — the count silently vanishes; neither device shows any error. Minimal fix (future task): point line 1493 at `stockzAuditItemSelect`, and route the selection through `window.selectStockzAuditItem(payload.value)` (which correctly sets `currentAuditItemKey`) instead of the current `select.value = ...; window.updateCcMngrStock();` pairing.

**Finding 5 — MEDIUM, ambiguous, product-decision required: the entire PC-side 3-way preview-routing selector (`pcRoutePhone`/`pcRoutePC`/`pcRouteBoth`/`pcRouteBar`) and its handler `updateCCRouteUI()` are a confirmed 100%-dead function body, called from 2 live sites, with no PC-side markup anywhere.**
Full detail and evidence in §1.3. This may be an intentionally-retired feature (the original 3-way "Phone/PC/Both" design per `docs/plans/feat-cycle-count-dual-preview.md`, superseded by the simpler 2-way `stockzAuditCameraRoute_pc`/`_phone` toggle that exists today) — in which case `updateCCRouteUI()` + both call sites (lines 1409, 1449) + the `currentPreviewMode` variable (line 1333) are all safely deletable as one coherent unit. Or it may be a lost-but-still-desired feature (the PC operator was meant to retain bidirectional control over where the live stream renders) whose markup was dropped during the Stockz Audit redesign and never rebuilt — in which case the correct fix is to restore `pcRoutePhone`/`pcRoutePC`/`pcRouteBoth`/`pcRouteBar` markup and wire a PC→phone `PC_PREVIEW_MODE_CHANGED` broadcast (confirmed currently never sent). **Recommend explicit user/product sign-off on which before any code is touched — do not delete or restore unilaterally.**

**Adjacent, out-of-scope documentation-drift discovery (not an N1 finding, not fixed, flagged per the anti-hallucination protocol):** `tools/SK8Lytz_App_Master_Reference.md:561` documents `cycleCountManagerModal` as *"The WebBluetooth/WebRTC scanner UI for STOCKZ. Requires physical `#barcode-reader`..."* — this modal id and `#barcode-reader` requirement **no longer exist as live DOM ids anywhere** (both were superseded by `stockzAuditModal`/`stockzAuditLocalReader` during a past redesign, independently confirmed by this batch's `openCycleCountManager`/`closeCycleCountManager` alias trace). The same stale reference recurs at Master Reference line 591 and `docs/ARCHITECTURE.md:404`. This does not block or contradict anything in this batch's own verdicts (it's stale on an adjacent topic), but per CLAUDE.md's "If the Reference contradicts live code, HALT and ask" anti-hallucination rule, it should be corrected in a small follow-up doc-sync pass — **not bundled into this batch's diff** to keep this batch's review surface limited to the 19 N1 findings.

---

## 5. Exact edits for the 7 safe deletions

All edits are inside `assets/js/inventory-module.js`. Re-`Read` a generous window immediately before editing and use exact-string `Edit` matching — never raw line numbers alone (this file has documented history of shifting line numbers across prior batches of this same epic).

### 5.1 `ccMobileBridgeStatus` (MOBILE_CONNECT) — 2 non-contiguous single-line deletions

Before (lines 1393-1407):
```js
        // Update UI states to connected
        const statusCheck = document.getElementById('ccMobileBridgeStatus');
        const statusIndicator = document.getElementById('ccScannerStatusIndicator');
        const qrContainer = document.getElementById('ccScannerQRContainer');
        const screenContainer = document.getElementById('ccRemotePreviewScreenContainer');
        const routeBar = document.getElementById('pcRouteBar');
        
        if (statusCheck) statusCheck.innerHTML = '🟢 📱 Phone Connected | Stream Active';
        if (statusIndicator) {
            statusIndicator.style.background = '#10b981';
            statusIndicator.style.boxShadow = '0 0 10px #10b981';
        }
        if (qrContainer) qrContainer.style.display = 'none';
        if (screenContainer) screenContainer.style.display = 'flex';
        if (routeBar) routeBar.style.display = 'flex';
```
After — delete only the `statusCheck` declaration and its usage line; **leave `statusIndicator`/`qrContainer`/`screenContainer`/`routeBar` completely untouched** (Findings 1, 2, 5):
```js
        // Update UI states to connected
        const statusIndicator = document.getElementById('ccScannerStatusIndicator');
        const qrContainer = document.getElementById('ccScannerQRContainer');
        const screenContainer = document.getElementById('ccRemotePreviewScreenContainer');
        const routeBar = document.getElementById('pcRouteBar');
        
        if (statusIndicator) {
            statusIndicator.style.background = '#10b981';
            statusIndicator.style.boxShadow = '0 0 10px #10b981';
        }
        if (qrContainer) qrContainer.style.display = 'none';
        if (screenContainer) screenContainer.style.display = 'flex';
        if (routeBar) routeBar.style.display = 'flex';
```

### 5.2 `ccRemotePreviewScreen` (REMOTE_FRAME_STREAM) — delete `screenOld` pair

Before:
```js
    window.ccSyncChannel.on('broadcast', { event: 'REMOTE_FRAME_STREAM' }, (envelope) => {
        const payload = envelope.payload;
        if (payload && payload.frame) {
            const screenOld = document.getElementById('ccRemotePreviewScreen');
            if (screenOld) screenOld.src = payload.frame;
            
            const screenNew = document.getElementById('stockzAuditMobilePreviewScreen');
            if (screenNew) screenNew.src = payload.frame;
        }
    });
```
After:
```js
    window.ccSyncChannel.on('broadcast', { event: 'REMOTE_FRAME_STREAM' }, (envelope) => {
        const payload = envelope.payload;
        if (payload && payload.frame) {
            const screenNew = document.getElementById('stockzAuditMobilePreviewScreen');
            if (screenNew) screenNew.src = payload.frame;
        }
    });
```
Optional Boy-Scout tidy (not required): rename `screenNew` → `screen` now that there's no `screenOld` to contrast it with. Leave as-is if the implementer prefers a smaller diff.

### 5.3 `ccMngrItemSelect`/`ccMngrQtyInput` (MOBILE_SAVE_COUNT else-branch) — brace-restructuring edit, highest-precision edit in this batch

Before (exact, re-verified fresh at inventory-module.js:1569-1586):
```js
                }
            } else {
                const select = document.getElementById('ccMngrItemSelect');
                const qtyInput = document.getElementById('ccMngrQtyInput');
                if (select && qtyInput) {
                    select.value = payload.value;
                    qtyInput.value = payload.qty;
                    
                    // Execute the native PC save manual cycle count logic!
                    await window.saveManualCycleCount();
                    
                    if (payload.close) {
                        window.closeCycleCountManager();
                    }
                }
            }
        }
    });
```
After — **change `} else {` to a plain `}`** (removes the else-branch, keeps the `if (auditModal...)` block's own closing brace):
```js
                }
            }
        }
    });
```
**This is not a pure deletion — it is one modified line (`} else {` → `}`) plus a 14-line deletion (the else-branch body, lines 1571-1584 in the current numbering).** Getting the brace count wrong here would break the entire `MOBILE_SAVE_COUNT` handler (the real, live audit-count save path) — verify the edit compiles (`tests/inventory-engine.test.js` `require()`s the whole file) before trusting it.

**Supporting evidence this is safe:** `window.saveManualCycleCount` is referenced only via `typeof window.saveManualCycleCount === 'function'` guards in the whole repo (`system-event-delegator.js:1200`, and inside this very else-branch) — **it has zero actual definition anywhere**, confirming this branch was already dead in every respect, not just its ghost DOM ids. The `if (auditModal && auditModal.style.display === 'flex')` branch above it is the sole surviving, fully-live path (targets the real, current `stockzAuditModal`).

### 5.4 `barcode-reader` (stopCycleCount) — 2-line deletion

Before:
```js
    const readerEl = document.getElementById("barcode-reader");
    if (readerEl) readerEl.innerHTML = window.safeHTML('');

    // 2. Unsubscribe cleanly from Supabase Realtime channel
```
After:
```js
    // 2. Unsubscribe cleanly from Supabase Realtime channel
```
(Delete the 2 code lines; the blank line before the comment may also be tidied but is not required.)

### 5.5 `inlineCycleScannerCard` (stopCycleCount) — 2-line deletion

Before:
```js
    window.ccSessionId = null;

    let card = document.getElementById('inlineCycleScannerCard');
    if(card) card.style.display = 'none';
};
```
After:
```js
    window.ccSessionId = null;
};
```

### 5.6 `scanner-success-flash` (onScanSuccess) — 5-line deletion

Before:
```js
    let flash = document.getElementById('scanner-success-flash');
    if (flash) {
        flash.style.display = 'block';
        setTimeout(() => flash.style.display = 'none', 300);
    }
```
After: delete entirely (all 5 lines, including the blank line separating it from the `scanner-beep` block above it is optional to also trim).

---

## 6. Security / XSS

Zero new `innerHTML`/`insertAdjacentHTML`/`outerHTML`/`document.write` logic is introduced anywhere in this batch. Every touched line was already either non-HTML-writing (`.src=`, `.style.*=`, `.value=`) or a pure deletion of already-compliant code:
- `inventory-module.js:1400` (`statusCheck.innerHTML = '🟢 📱 Phone Connected | Stream Active';`) — a static string literal with zero dynamic interpolation, already compliant under CLAUDE.md's "static literal only" allowed pattern — being **deleted wholesale**, not modified.
- `inventory-module.js:1610` (`readerEl.innerHTML = window.safeHTML('');`) — already compliant (correctly wrapped, empty string) — being deleted wholesale.
- No other deleted line touches `innerHTML` at all (`.src=`, `.style.display=`, `.value=` only).
- The one `innerHTML` write that **remains untouched** in this cluster, `inventory-module.js:1771` (inside the LEAVE-AS-FINDING `updateCCRouteUI`) — `statusCheck.innerHTML = window.safeHTML(`🟢 📱 Phone Connected | ${sub}`);` — is already correctly guarded with `window.safeHTML(...)` around dynamic data, fully compliant, and is not being touched this batch regardless.

`node scripts/xss-audit.js` expected: **0 violations before and after** (no-op confirmation, matching Batch 5-8 precedent for pure-deletion batches). None of the 5 LEAVE-AS-FINDING bugs (§4) are XSS-relevant — all are `getElementById(...)` null-reference / broadcast-payload-routing issues, not HTML-injection issues.

**RLS implications:** none. Zero Supabase table reads/writes exist in any of the 7 deleted spans (confirmed individually — the nearest Supabase calls in this cluster, `window.ccSyncChannel.send(...)`/`supabaseClient.removeChannel(...)` in `stopCycleCount`, and `submitStockzAudit()` in `MOBILE_SAVE_COUNT`, are a few lines away from every edit and are untouched). No table/column/policy is created, altered, or removed.

**Print-window DOMPurify:** not applicable — no print-window `document.write` path exists anywhere in this cluster.

---

## 7. Vanilla JS / framework constraints

All edits are deletions or a single-line brace simplification inside existing native `function`/`window.X = function` bodies, using native DOM calls (`getElementById`, `.style`, `.src`, `.value`) and native Supabase Realtime broadcast handlers (`channel.on('broadcast', ...)`). No `var` present in any touched code, none introduced. No framework code, no build step, no new CSS utility classes. Web Bluetooth is not used anywhere in this cluster (it's Web Bluetooth-adjacent hardware-scanning UI, but the actual bridge is Supabase Realtime broadcast over WebSocket + `html5-qrcode`'s camera API, not `navigator.bluetooth` — consistent with the existing architecture, nothing changed here).

## 8. 4-state UX / UI mutex / zero-refresh

**UI mutex:** not applicable — zero DB-mutation buttons are touched. The nearest real mutation (`submitStockzAudit()`, `MOBILE_SAVE_COUNT`'s live `if` branch) is untouched; the dead `else` branch being removed never reached a mutation in the first place (`window.saveManualCycleCount` doesn't exist).

**Zero-refresh:** not applicable in the sense of "new render function to re-invoke" — every deletion is inside an already-guarded-false or fully-redundant branch, so no render function's zero-refresh behavior changes. `selectStockzAuditItem()`, `renderInventoryTable()`/`renderFgiTable()`, and `updateStockzAuditDeltaValuation()` (the real render functions this cluster's live paths call into) are all untouched.

**4-state UX:** the deletions themselves don't remove any user-visible Loading/Error/Empty/Success state (every deleted line was already a guaranteed no-op, confirmed individually in §3/§5). The 5 LEAVE-AS-FINDING bugs (§4), however, **do** have real 4-state impact worth flagging for whoever picks up the future fix: Finding 1/2 degrade the "Success" (connected) visual state without ever surfacing an "Error" state to compensate (the user just sees a stale red dot / lingering QR code, with no indication anything is wrong); Finding 3/4 are the most serious — a silently-failed save is a missing **Error** state (the operation fails with zero toast/console warning on either device), which directly violates the 4-state mandate and should be a priority consideration for the future fix, not just a rename.

## 9. Schema / Master Reference / Topological integrity

No Supabase table/column/RLS change anywhere in this batch. `tools/SK8Lytz_App_Master_Reference.md`'s `## Database Schemas` section requires no update. **No button, modal, or UI element is created, deleted, or moved** — every edit targets JS-side `getElementById` reads of ids that already have zero live HTML producer (confirmed individually per §3); the Mermaid Architectural Blueprint topological-integrity rule does not apply to removing orphaned JS handlers with no HTML counterpart, consistent with Batch 5-8 precedent. The Master Reference documentation-drift discovery (`cycleCountManagerModal`/`#barcode-reader`, §4) is flagged but explicitly **not** corrected in this batch's diff (adjacent, doc-only, would enlarge review scope beyond the 19 N1 findings) — recommend a small dedicated follow-up.

---

## 10. Expected scanner deltas

**Going-in baseline (confirmed via ledger, live-scanned by Batch 8's implementer): N1_GHOST_ID = 20** (19 in this cc* cluster + 1 `packerzAdminRecipeSelect`, out of scope, untouched, tied to the Batch 6 `data-prodid` bug).

| Cluster | Raw findings before | Raw findings after | Mechanism |
|---|---|---|---|
| `ccMobileBridgeStatus` | 2 (1394, 1733) | 1 (1733 remains, Finding 5) | 1 safe delete (§5.1) |
| `ccScannerStatusIndicator` | 1 (1395) | 1 (unchanged) | Finding 1, untouched |
| `ccScannerQRContainer` | 1 (1396) | 1 (unchanged) | Finding 2, untouched |
| `ccRemotePreviewScreenContainer` | 1 (1397) | 1 (unchanged) | Finding 2, untouched |
| `pcRouteBar` | 1 (1398) | 1 (unchanged) | Finding 5, untouched |
| `ccMngrItemSelect` | 3 (1412, 1493, 1571) | 2 (1412, 1493 remain, Findings 3/4) | 1 safe delete (§5.3) |
| `ccRemotePreviewScreen` | 2 (1436, 1731) | 1 (1731 remains, Finding 5) | 1 safe delete (§5.2) |
| `ccMngrQtyInput` | 1 (1572) | 0 | 1 safe delete (§5.3) |
| `barcode-reader` | 1 (1609) | 0 | 1 safe delete (§5.4) |
| `inlineCycleScannerCard` | 1 (1627) | 0 | 1 safe delete (§5.5) |
| `scanner-success-flash` | 1 (1647) | 0 | 1 safe delete (§5.6) |
| `pcRoutePhone` | 1 (1728) | 1 (unchanged) | Finding 5, untouched |
| `pcRoutePC` | 1 (1729) | 1 (unchanged) | Finding 5, untouched |
| `pcRouteBoth` | 1 (1730) | 1 (unchanged) | Finding 5, untouched |
| `ccPhoneOnlyPlaceholder` | 1 (1732) | 1 (unchanged) | Finding 5, untouched |
| **Cluster total** | **19** | **12** | **−7** |
| `packerzAdminRecipeSelect` (out of scope) | 1 | 1 (unchanged) | Not touched |
| **N1_GHOST_ID grand total** | **20** | **13** | **−7** |

**N4_LEGACY_TERM side effect:** `ccMobileBridgeStatus`@1394 (being deleted) contains the watchlisted "Bridge" compound-identifier term; its sibling occurrence at line 1733 (untouched, part of Finding 5) also does. Per Batch 8's exact citation (`N4 Bridge: inventory-module.js:1394, 1733 — ccMobileBridgeStatus — OUT OF SCOPE, cc* cluster`), deleting line 1394 removes exactly 1 of these 2 tracked N4 findings. **Predicted N4_LEGACY_TERM: 84 → 83 (−1)**, the remaining 1 (line 1733) stays open, tied to the untouched Finding 5 bundle.

| Rule | Before | After | Confidence |
|---|---|---|---|
| `N1_GHOST_ID` | 20 | **13** | High — every deletion individually traced and boundary-verified against the current file text (§3, §5) |
| `N4_LEGACY_TERM` | 84 | **83** | High — exactly 1 of the 2 tracked `Bridge`-term `ccMobileBridgeStatus` occurrences is deleted |
| `N1_GHOST_ID_PREFIX` | unaffected | unchanged | High — every finding here is a `literal`-kind lookup, none are `prefix`-kind |
| `N2_ORPHAN_HANDLER` | unaffected | unchanged | High — zero `system-event-delegator.js` edits this batch (the orphaned `click_stopCycleCount` case, noted in §5.4's evidence trail, is a pre-existing N2 issue, out of scope, not touched) |
| `N5_NEW_NONCONFORMANT_KEY` | unaffected | unchanged | High — zero localStorage/sessionStorage keys touched |
| `N6_UNUSED_CSS` | unaffected | unchanged | High — zero CSS touched |
| `N7_DICT_STALE` | 0 | 0 | High — zero registry/dictionary edits this batch (no allowlist entries added; every finding here is either deleted outright or left as an unfixed finding, neither path touches `tools/nomenclature-registry.json`) |

**Do not force a live scan to match 13/83 exactly if it differs slightly** — as with every prior batch, run `node scripts/nomenclature-audit.js --warn` post-edit and report the actual numbers; investigate any mismatch before committing.

---

## 11. Verification checklist

1. `npm test` → confirm same pass count as pre-batch. **Safety net:** `tests/inventory-engine.test.js:16` `require()`s the whole `assets/js/inventory-module.js` — this will immediately surface any brace mismatch from §5.3's edit (the one edit in this batch with real brace-restructuring risk) as a hard `SyntaxError`. No other test file references any identifier touched in this batch (confirmed via grep of `tests/`).
2. `npx eslint .` → 0 new errors/warnings. No `window.X` global function names are deleted or renamed this batch (only internal `getElementById` reads inside existing live functions), so no `eslint.config.mjs` edit is required — confirmed zero global declarations exist for any name touched.
3. `node scripts/xss-audit.js` → 0 violations before and after (§6 — no-op confirmation expected).
4. `node scripts/nomenclature-audit.js --warn` → confirm the §10 table's actual numbers (expect N1_GHOST_ID 20→13, N4_LEGACY_TERM 84→83); investigate any mismatch before committing.
5. Syntax-check §5.3's edit specifically before running the full suite — read the edited region back with `Read` immediately after the `Edit` call and manually count braces, since this is the one edit in the batch that isn't a pure line-deletion.
6. Manual — STOCKPILEZ → STOCKZ → open `stockzAuditModal` on any item, click "📷 SCAN PORTAL", confirm the scanner card still opens and the header title/status dot render (dot will still be red per Finding 1 — that's expected, unchanged, not a regression).
7. Manual — click "💻 PC Webcam" route, click "📷 START WEBCAM", confirm the local webcam scanner still starts, decodes a barcode, and the item auto-selects (exercises `onScanSuccess` post-§5.6 edit — beep still plays, no visual flash, expected/unchanged since the flash never worked before either).
8. Manual — click "📱 Smartphone Link" route, scan the displayed QR with a real phone, confirm the phone connects, streams video to the PC preview panel (once the phone-side route button is tapped — expected per Finding 2), and a barcode scan on the phone correctly selects the item on the PC (exercises `MOBILE_CONNECT`/`REMOTE_FRAME_STREAM`/`REMOTE_BARCODE_SCAN` post-§5.1/§5.2 edits).
9. Manual — with the phone connected, submit a count from the phone (Next or Close) for the SAME item currently active on the PC, confirm it saves correctly and the modal updates/closes as expected (exercises `MOBILE_SAVE_COUNT`'s live `if` branch, post-§5.3 edit — must work identically to before).
10. Manual — tap "Discard" on the phone's shutter controls, confirm the PC-side modal closes cleanly and the webcam/channel are fully torn down with no console errors (exercises `stopCycleCount` post-§5.4/§5.5 edits, via the `MOBILE_DISCARD_AND_BACK` handler).
11. **Do NOT attempt to fix or test the 5 LEAVE-AS-FINDING bugs (§4) as part of this batch's verification** — they remain reproducible exactly as documented, for the future `fix/*` task. Specifically do not test "does the status dot turn green" (Finding 1) or "does a mismatched phone-selected item save" (Finding 4) expecting a fix — both are expected to still reproduce exactly as described.
12. **Baseline handling:** do NOT run `--update-baseline` this batch — same standing precedent as Batches 1-8.

---

## 12. Risks (ranked) — do not undersell; this is the highest-remaining-risk chunk of the epic

1. **Highest risk — §5.3's brace-restructuring edit inside `MOBILE_SAVE_COUNT`.** This is the ONE edit in the batch that is not a pure line-deletion — it changes `} else {` to `}`, removing an entire else-branch. A miscounted brace here breaks the **live, real** audit-count save path for every future phone-triggered count submission (the surrounding `if (auditModal...)` branch, untouched, is the actual production save flow) — the blast radius of a mistake here is much larger than a simple dead-line deletion. Mitigated by: the whole-file `require()` test (item 1), a dedicated syntax-check step before running the suite (item 5), and manual verification step 9.
2. **Medium-high risk — this cluster is a live, Realtime-channel-driven, asynchronous, multi-device feature.** Unlike prior batches' dead functions/CSS/registry edits, every edit here sits inside functions that are invoked from a **different device** (the phone, via Supabase broadcast) at unpredictable times, not from a synchronous button click on the same page. A subtle regression would not necessarily surface during a quick manual click-through on the PC alone — genuine phone-in-the-loop testing (checklist items 8-10) is required, not just a DOM inspection.
3. **Medium risk — the 5 LEAVE-AS-FINDING bugs (§4) are zero implementation risk to *this* batch** (nothing about them is touched) **but 2 of them (Findings 3, 4) represent a currently-live, silent, potentially confusing data-loss path** in a feature actively used for inventory counting. Flag prominently in the batch summary and recommend the follow-up `fix/*` task be prioritized above P3/backlog — a silently-dropped stock count is a data-integrity issue, not just cosmetic debt.
4. **Medium risk — Finding 5's ambiguity must not be resolved unilaterally mid-implementation.** If, while implementing the other 6 safe deletions, the implementer is tempted to "just also clean up" `updateCCRouteUI()` since it's provably dead — resist. That decision needs explicit user sign-off per §1.3's reasoning, not a judgment call made mid-batch.
5. **Low risk — the remaining 6 pure-deletion edits (§5.1, §5.2, §5.4, §5.5, §5.6)** are all confirmed zero-behavior-change via multiple independent lines of evidence each (modern sibling confirmed managed elsewhere, OR zero producer anywhere regardless of caller, OR containing branch confirmed permanently unreachable-to-effect). Re-`Read` each exact span immediately before editing regardless — this file has documented line-drift history across this epic (Batch 7 §14.5's warning about `populateDropdowns()` applies to the whole file, not just that function).
6. **N1 delta prediction is High confidence (not Medium)** for once, since the going-in baseline (20) is a confirmed live-scanned number from the ledger, not a hand-derived estimate — but still report the actual post-edit scanner output rather than assuming 13/83 is exact.

---

## Files Touched

- `assets/js/inventory-module.js` — the only file touched this batch:
  - Lines ~1394, ~1400 (§5.1): delete `ccMobileBridgeStatus` declaration + usage inside `MOBILE_CONNECT`. **Leave `ccScannerStatusIndicator`/`ccScannerQRContainer`/`ccRemotePreviewScreenContainer`/`pcRouteBar` declarations and usages completely untouched** (Findings 1, 2, 5).
  - Lines ~1436-1437 (§5.2): delete `ccRemotePreviewScreen` (`screenOld`) declaration + usage inside `REMOTE_FRAME_STREAM`.
  - Lines ~1570-1584 (§5.3): modify `} else {` → `}`; delete the entire else-branch body (`ccMngrItemSelect`/`ccMngrQtyInput` + their guarded usage) inside `MOBILE_SAVE_COUNT`.
  - Lines ~1609-1610 (§5.4): delete `barcode-reader` declaration + usage inside `stopCycleCount`.
  - Lines ~1627-1628 (§5.5): delete `inlineCycleScannerCard` declaration + usage inside `stopCycleCount`.
  - Lines ~1647-1651 (§5.6): delete `scanner-success-flash` declaration + if-block inside `onScanSuccess`.
  - **Net: ~27 lines removed, 1 line modified, all within one file.**

**Not touched (confirmed):** `index.html` (zero DOM producers created/deleted/moved — every ghost id already had zero producer, every real modern sibling already exists and is untouched), `tools/remote-scanner.html` (read for verification only, zero edits — the phone-side code is entirely correct as-is; the bugs are all on the PC/`inventory-module.js` side), `assets/js/system-event-delegator.js` (the orphaned `click_stopCycleCount` case is a pre-existing, out-of-scope N2 issue, not touched), `eslint.config.mjs` (zero global declarations reference any name touched), `tools/nomenclature-registry.json` / `docs/nomenclature_dictionary.md` (no allowlist entries added — every finding here is either deleted or left as an unfixed bug, neither path is a registry concern), `tools/SK8Lytz_App_Master_Reference.md` (no schema/RLS/UI-topology change; the `cycleCountManagerModal` documentation-drift discovery is flagged in §4 but explicitly deferred to its own small follow-up, not bundled here), `tools/SK8Lytz_Bucket_List.md` (ledger-exemption rule — syncs at `/wind-down`; recommend logging the 5 LEAVE-AS-FINDING bugs there as a new `fix/*` idea at that time), `scripts/nomenclature-baseline.json` (deliberately deferred, same standing precedent as Batches 1-8).

## Suggested commit message(s)

Micro-commit cadence, one commit per handler/function touched (matching Batch 7's established style for this epic):

1. `fix(nomenclature): remove dead ccMobileBridgeStatus text-status read from live MOBILE_CONNECT handler` — `assets/js/inventory-module.js` (§5.1)
2. `fix(nomenclature): remove redundant ccRemotePreviewScreen read, superseded by stockzAuditMobilePreviewScreen in the same handler` — `assets/js/inventory-module.js` (§5.2)
3. `refactor(nomenclature): delete unreachable legacy Cycle Count Manager fallback branch from live MOBILE_SAVE_COUNT handler` — `assets/js/inventory-module.js` (§5.3)
4. `refactor(nomenclature): remove dead barcode-reader/inlineCycleScannerCard reads from live stopCycleCount, superseded by stopStockzAuditWebcam/closeStockzAuditModal` — `assets/js/inventory-module.js` (§5.4, §5.5)
5. `fix(nomenclature): remove dead scanner-success-flash read from live onScanSuccess (no modern equivalent ever existed)` — `assets/js/inventory-module.js` (§5.6)

(Per the ledger-exemption rule, `tools/SK8Lytz_Bucket_List.md` is not touched in any of these micro-commits. A separate ledger entry/`fix/*` task should be opened for §4's 5 LEAVE-AS-FINDING bugs — recommend `fix/cc-mobile-bridge-sync-bugs` — at `/wind-down` or the next `/bucketlist` pass, along with the small Master Reference doc-sync follow-up noted in §4/§9.)
