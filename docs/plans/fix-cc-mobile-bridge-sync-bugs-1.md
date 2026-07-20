# fix/cc-mobile-bridge-sync-bugs — Implementation Plan

## 0. Scope

Fix all 5 findings logged in `tools/SK8Lytz_Bucket_List.md` (P1, elevated 2026-07-20) and fully evidenced in `docs/plans/debt-nomenclature-remediation-9.md` §4, discovered during Batch 9 of `debt/nomenclature-remediation` and deliberately deferred to this dedicated `fix/*` task. Surface: STOCKPILEZ → STOCKZ → open any item's audit → `stockzAuditModal` → 📷 SCAN PORTAL → 📱 Smartphone Link.

**Methodology note (per anti-hallucination protocol):** the Batch 9 doc was treated as the authoritative starting point but NOT trusted blindly — every cited line number, DOM id, and function name below was independently re-`Read`/`Grep`'d against the current on-disk state of `assets/js/inventory-module.js`, `index.html`, and `tools/remote-scanner.html` before finalizing this plan. Line numbers have drifted slightly since Batch 9 (its own 7 safe deletions are already merged, shifting everything below them up by a few lines) — every snippet below is quoted from the file as it reads **right now**, not from Batch 9's numbering. The parallel explore-mapper's map should be cross-checked against this plan's citations before implementation; where they disagree, trust neither blindly — re-`Read` again.

**No Supabase schema/table/column/RLS change is anticipated or required by any of the 4 code fixes below — confirmed.** All 4 fixes are client-side `getElementById` target corrections and one function-call routing fix; zero Supabase queries are added, removed, or altered. `tools/SK8Lytz_App_Master_Reference.md`'s `## Database Schemas` section requires no update. No button/modal/UI element is created, deleted, or moved by Findings 1-4 (only internal JS targets change), so the Mermaid Architectural Blueprint topological-integrity rule does not apply to them. Finding 5 (HALT, §5) is the only item that *could* eventually require a topology update, and only if "restore" is chosen — see §5.2.

---

## 1. Finding 1 (MEDIUM) — connection-status dot never turns green

**Root cause (re-confirmed):** `assets/js/inventory-module.js:1394`, inside the `MOBILE_CONNECT` broadcast handler (`initializeCcSyncChannel()`, starts line 1353):

```js
1394:        const statusIndicator = document.getElementById('ccScannerStatusIndicator');
```

`ccScannerStatusIndicator` has zero producer anywhere in the repo. The real, live element is `stockzAuditScannerStatusIndicator` (`index.html:6598`, hardcoded `background:#ef4444`, `animation:pulse 1.5s infinite`, zero other JS writer anywhere).

### Fix
```diff
-        const statusIndicator = document.getElementById('ccScannerStatusIndicator');
+        const statusIndicator = document.getElementById('stockzAuditScannerStatusIndicator');
```
One-line id swap. The existing usage block 2 lines below (unchanged, already correct):
```js
        if (statusIndicator) {
            statusIndicator.style.background = '#10b981';
            statusIndicator.style.boxShadow = '0 0 10px #10b981';
        }
```
now finally reaches the real, live, currently-permanently-red dot.

---

## 2. Finding 2 (LOW-MEDIUM) — QR doesn't auto-hide / preview doesn't auto-show on connect

**Root cause (re-confirmed):** same `MOBILE_CONNECT` handler, `inventory-module.js:1395-1396`:
```js
1395:        const qrContainer = document.getElementById('ccScannerQRContainer');
1396:        const screenContainer = document.getElementById('ccRemotePreviewScreenContainer');
```
Both ghost. Real siblings: `stockzAuditMobileQRContainer` (`index.html:6636`) and `stockzAuditMobilePreviewContainer` (`index.html:6639`). These real ids ARE correctly managed elsewhere — the `MOBILE_PREVIEW_MODE_CHANGED` handler (`inventory-module.js:1440-1466`) — but that handler only fires on a manual phone-side route-button tap, never automatically at connect time.

**Additional scope beyond a pure id-swap, per task instruction to "replicate the same show/hide logic":** `MOBILE_PREVIEW_MODE_CHANGED`'s block also toggles a third element, `stockzAuditPhoneOnlyPlaceholder` (`index.html:6641` — static markup, `📱` + "Camera Rendering on Phone", zero dynamic content, zero XSS surface), based on `currentPreviewMode`:
```js
1454:                if (payload.mode === 'phone') {
1455:                    if (streamContainer) streamContainer.style.display = 'flex';
1456:                    if (placeholder) placeholder.style.display = 'flex';
1457:                } else if (payload.mode === 'pc') {
1458:                    if (streamContainer) streamContainer.style.display = 'flex';
1459:                    if (placeholder) placeholder.style.display = 'none';
1460:                } else {
1461:                    if (streamContainer) streamContainer.style.display = 'flex';
1462:                    if (placeholder) placeholder.style.display = 'none';
1463:                }
```
`MOBILE_CONNECT`'s current (ghost-id, inert) block never touches this placeholder at all — even after the id-swap it would leave the placeholder in its static `display:none` default, which is *wrong* whenever `currentPreviewMode === 'phone'` (the module-scope default, `inventory-module.js:1333: let currentPreviewMode = 'phone';`).

### Fix (lines 1395-1405, full connected block)
Before:
```js
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
After:
```js
        const qrContainer = document.getElementById('stockzAuditMobileQRContainer');
        const screenContainer = document.getElementById('stockzAuditMobilePreviewContainer');
        const placeholder = document.getElementById('stockzAuditPhoneOnlyPlaceholder');
        const routeBar = document.getElementById('pcRouteBar');

        if (statusIndicator) {
            statusIndicator.style.background = '#10b981';
            statusIndicator.style.boxShadow = '0 0 10px #10b981';
        }
        if (qrContainer) qrContainer.style.display = 'none';
        if (screenContainer) screenContainer.style.display = 'flex';
        // Mirror MOBILE_PREVIEW_MODE_CHANGED's placeholder logic (inventory-module.js:1454-1463)
        // so the default connect state matches whatever route mode is already active.
        if (placeholder) placeholder.style.display = (currentPreviewMode === 'phone') ? 'flex' : 'none';
        if (routeBar) routeBar.style.display = 'flex';
```
**`pcRouteBar` is left completely untouched (Finding 5, do not resolve here).**

**Why reading `currentPreviewMode` here is correct, not a hack:** it is not reset anywhere on session teardown (`stopCycleCount`/`closeStockzAuditModal` — confirmed via full-file grep, only 4 occurrences of `currentPreviewMode` exist: the declaration at 1333, this new read, and the 2 existing reads/writes in `MOBILE_PREVIEW_MODE_CHANGED` at 1443-1444). This means it deliberately persists across audit sessions within the same page load — if the operator last used "Both" mode, a freshly-reconnected phone on a *new* item correctly re-arrives in "Both" mode instead of snapping back to a hardcoded default. Hardcoding `'flex'` (assume phone-only) here would regress that carryover behavior for anyone who last used PC/Both mode; reading the shared variable is the more correct fix, and it costs nothing extra.

**Important interaction with Finding 5 (read before touching `updateCCRouteUI` under any future decision):** this fix creates a **second live reader** of `currentPreviewMode` outside of `updateCCRouteUI()`. Batch 9 §1.3 recommended, if Finding 5's "delete wholesale" option is ever chosen, deleting "`updateCCRouteUI()` + both call sites + the `currentPreviewMode` variable (line 1333)" as one unit. **That recommendation is now stale** — after this fix, `currentPreviewMode` is also read directly inside `MOBILE_CONNECT` (independent of `updateCCRouteUI`) and is still read/written inside the live, correctly-working `MOBILE_PREVIEW_MODE_CHANGED` handler. **Whoever eventually implements Finding 5's "delete" option must keep the `currentPreviewMode` variable and its declaration — only the `updateCCRouteUI` function body and its 2 call sites (`window.updateCCRouteUI(currentPreviewMode);` at lines 1407 and 1444) may be deleted.** Flagging this now so it isn't lost.

---

## 3. Finding 3 (HIGH) — phone's manual item dropdown always empty

**Root cause, part (a) — re-confirmed live bug:** `inventory-module.js:1410`, inside `MOBILE_CONNECT`'s `ITEM_DIRECTORY` broadcast block:
```js
1409:        // Broadcast the serialized grouped item dropdown directory list to the phone cockpit
1410:        const select = document.getElementById('ccMngrItemSelect');
1411:        const items = [];
1412:        if (select) {
1413:            for (let i = 0; i < select.options.length; i++) {
1414:                const opt = select.options[i];
1415:                if (opt.value) {
1416:                    items.push({ value: opt.value, text: opt.text });
1417:                }
1418:            }
1419:        }
1420:        window.ccSyncChannel.send({
1421:            type: 'broadcast',
1422:            event: 'ITEM_DIRECTORY',
1423:            payload: { items: items }
1424:        }).catch(() => {});
```
`ccMngrItemSelect` is a ghost — `select` is always `null`, so `items` is always `[]`. The real select is `stockzAuditItemSelect` (`index.html:6388`), populated synchronously and unconditionally by `window.populateStockzAuditDropdown()` (`inventory-module.js:1753`, called at line 2588) every time `openStockzAuditModal()` runs — i.e. always populated well before a phone can physically scan the QR and connect (the phone side has a deliberate 1.5s connect delay, `tools/remote-scanner.html:1152`). **No race condition exists between dropdown population and `MOBILE_CONNECT` firing.**

### Fix (part a)
```diff
-        const select = document.getElementById('ccMngrItemSelect');
+        const select = document.getElementById('stockzAuditItemSelect');
```
`stockzAuditItemSelect` uses `<optgroup>` grouping (`window.populateStockzAuditDropdown()`), but `HTMLSelectElement.options` is a flat `HTMLOptionsCollection` regardless of `<optgroup>` nesting per the DOM spec — the existing `for (let i = 0; i < select.options.length; i++)` loop and `if (opt.value)` placeholder-filter (skips the `-- Choose Item --` blank option) work unchanged against the real select with zero further edits.

### Investigation of part (b) — is the `catalogCache` fallback also worth fixing? **No — decision: fix (a) only.**

The phone's own fallback, `populateItemsFromCache()` (`tools/remote-scanner.html:1034-1065`), is gated behind `if (payload.catalogCache)` inside its `SESSION_TRANSFER` handler (`tools/remote-scanner.html:932`) — and the PC's actual `SESSION_TRANSFER` broadcast (`inventory-module.js:1367-1374`, `1381-1391`) never includes a `catalogCache` field. Investigated whether this should *also* be fixed (per task instruction to check redundancy first):

1. **Once (a) is fixed, `ITEM_DIRECTORY` reliably delivers a complete, correctly-grouped-by-category item list to `ccMobileItemSelect` on every connect** (confirmed: `stockzAuditItemSelect`'s options ARE grouped via `<optgroup>` — `📦 RETAIL PRODUCTS` / `⚙️ SUB-ASSEMBLIES` / `🖨️ 3D PRINTS` / `🏷️ CUSTOM LABELZ` / `🔩 RAW MATERIALS`, `inventory-module.js:1772-1783` — but `ITEM_DIRECTORY`'s payload is a **flat** `{value, text}` array with no group metadata, so the phone's rendered dropdown, post-fix, will be flat/ungrouped, not sectioned like the PC's). `populateItemsFromCache()` independently re-derives its own (cruder, prefix-guessed) grouping from `window.catalogCache` — a cosmetic improvement at best, not a functional fix, since (a) alone already fully resolves "the dropdown is always empty."
2. **Decisive reason NOT to also wire `catalogCache` into `SESSION_TRANSFER`: doing so would activate a currently-dormant, unguarded XSS surface.** Read `populateItemsFromCache()` in full — its final render step is:
   ```js
   1056:            let html = '<option value="">-- Choose Item Natively --</option>';
   1057:            for (let prefix in groups) {
   1058:                html += `<optgroup label="${prefix}">`;
   1059:                groups[prefix].sort((a,b) => a.text.localeCompare(b.text)).forEach(i => {
   1060:                    html += `<option value="${i.value}">${i.text}</option>`;
   1061:                });
   1062:                html += `</optgroup>`;
   1063:            }
   1064:            selectBox.innerHTML = html;
   ```
   Line 1064 is a raw `element.innerHTML = ` assignment with **unescaped dynamic data** (`${prefix}`, `${i.value}`, `${i.text}` — all sourced from `window.catalogCache`, i.e. DB-derived item names/types) interpolated straight into the HTML string. This is exactly the CLAUDE.md-forbidden pattern (`element.innerHTML = \`...${dbValue}...\`;`) — and confirmed `tools/remote-scanner.html` loads **no `neogleamz-engine.js`, no `window.safeHTML`, no DOMPurify anywhere** (its only `<script src>` tags are the Supabase SDK and `html5-qrcode`, verified via grep). This function is currently **100% unreachable dead code** (its sole caller is gated behind a `catalogCache` field that never arrives), so the vulnerability is inert today. **Adding `catalogCache` to the `SESSION_TRANSFER` payload as part of "fixing part (b)" would directly activate this unguarded XSS sink** the moment any item name/type in the catalog ever contained attacker-influenced or malformed content (e.g. a mis-entered product name with `<`/`>` — low likelihood given this is an internal ops tool with trusted data-entry staff, but categorically a real gap, not a hypothetical one).

**Decision: fix (a) only** (`ITEM_DIRECTORY`'s select-id, above). Do **not** add `catalogCache` to `SESSION_TRANSFER`'s payload in this task — it is unnecessary (the dropdown-empty bug is already fully solved) and would reopen a live, currently-dormant XSS vector for zero functional gain. **Recommend logging the `remote-scanner.html:1064` unguarded-innerHTML finding as its own small follow-up debt item** (fix: either wrap with a DOMPurify `<script>` tag + `DOMPurify.sanitize(html)` before assignment, since `remote-scanner.html` has no `safeHTML` engine loaded, or rebuild via `createElement`/`.textContent` per option like `ITEM_DIRECTORY`'s own handler already does correctly at `remote-scanner.html:1024-1027`) — **not fixed as part of this task**, since `populateItemsFromCache()` remains fully unreachable after this task's changes and touching it would expand this fix's diff beyond its 5 scoped findings.

---

## 4. Finding 4 (HIGH, silent data-loss) — phone-side item selection never syncs to PC

**Root cause (re-confirmed):** `inventory-module.js:1485-1494`, the `MOBILE_ITEM_SELECTED` handler:
```js
1485:    window.ccSyncChannel.on('broadcast', { event: 'MOBILE_ITEM_SELECTED' }, (envelope) => {
1486:        const payload = envelope.payload;
1487:        if (payload && typeof payload.value !== 'undefined') {
1488:            const select = document.getElementById('ccMngrItemSelect');
1489:            if (select) {
1490:                select.value = payload.value;
1491:                window.updateCcMngrStock();
1492:            }
1493:        }
1494:    });
```
`ccMngrItemSelect` is a ghost, so `select` is always `null`, so the whole `if (select)` body — including `window.updateCcMngrStock()` — never runs. **Confirmed the phone side still sends this event on every dropdown change** (`tools/remote-scanner.html:1384-1400`, `ccMobileItemSelect`'s `change` listener). Downstream: `MOBILE_SAVE_COUNT`'s PC-side handler (`inventory-module.js:1522`) gates the actual save on `if (payload.value === window.currentAuditItemKey)` — since `window.currentAuditItemKey` is never updated to match the phone's selection, a phone-picked item that differs from the PC's currently-active item causes this condition to be `false`, and `submitStockzAudit()` (line 1559, the real, guarded save call) **never executes — with zero toast, zero console warning, on either device.**

### Fix — route through `window.selectStockzAuditItem()`, not a bare id-swap

A bare id-swap (`ccMngrItemSelect` → `stockzAuditItemSelect`) is **not sufficient** — it would set the `<select>` element's DOM `.value` but never touch `window.currentAuditItemKey`, so `MOBILE_SAVE_COUNT`'s guard would still fail. Per the task's specification and Batch 9's minimal-fix pointer, route through the same function every other item-selection path in this file already uses (`onScanSuccess` → `window.selectStockzAuditItem(actualKey)` at line 1677; `openStockzAuditModal` → `window.selectStockzAuditItem(itemKey)` at line 2591):

Before:
```js
    window.ccSyncChannel.on('broadcast', { event: 'MOBILE_ITEM_SELECTED' }, (envelope) => {
        const payload = envelope.payload;
        if (payload && typeof payload.value !== 'undefined') {
            const select = document.getElementById('ccMngrItemSelect');
            if (select) {
                select.value = payload.value;
                window.updateCcMngrStock();
            }
        }
    });
```
After:
```js
    window.ccSyncChannel.on('broadcast', { event: 'MOBILE_ITEM_SELECTED' }, (envelope) => {
        const payload = envelope.payload;
        if (payload && typeof payload.value !== 'undefined') {
            window.selectStockzAuditItem(payload.value);
        }
    });
```
`window.updateCcMngrStock()` (`inventory-module.js:2198-2200`) is now redundant here — it is itself just `if (window.currentAuditItemKey) window.selectStockzAuditItem(window.currentAuditItemKey);`, i.e. a thin re-render-current-item wrapper. Calling `selectStockzAuditItem(payload.value)` directly is both the correct fix (it sets `window.currentAuditItemKey`, which the actual bug is about) and strictly more direct than the old two-call pairing.

### Confirmed: this correctly closes the silent-save-loss bug and satisfies zero-refresh

Read `window.selectStockzAuditItem` in full (`inventory-module.js:1866-2153`). On a non-empty `itemKey` it, synchronously and in order:
1. Sets `window.currentAuditItemKey = itemKey;` (line 1944) — **this is the exact field `MOBILE_SAVE_COUNT`'s save-guard checks**, closing the root cause.
2. Re-renders the PC's own `stockzAuditItemSelect` value + `stockzAuditSearch` text (1946-1953).
3. Re-renders `stockzAuditScannerItemName` label (1968), clears/repopulates count/delta/notes inputs (1970-1978).
4. Computes and re-renders the full `stockzAuditBalancesGrid` (both branches, `RECIPE:::`-prefixed and raw-material, lines 2013-2081), via `grid.innerHTML = window.safeHTML(...)` — already-compliant, unmodified by this fix.
5. Calls `window.updateStockzAuditDeltaValuation()` (2085) and `window.updateStockzAuditROPSimulator()` (2093) — the same render functions every other selection path (barcode scan, PC dropdown, manual open) already re-invokes.
6. Re-generates the mobile QR code URL/img src and session-details text (2096-2110).
7. **Re-broadcasts a `PC_STOCK_UPDATE` event back to the phone** (2112-2151) with the freshly computed stock/planning/grid data — so the phone's own UI also reflects the update instantly, not just the PC's.

This satisfies the zero-refresh mandate on both ends of the bridge: the PC's own render functions all re-fire synchronously in the same call, and the phone gets an explicit follow-up broadcast reflecting the accepted selection — no manual refresh needed on either device. **No `MOBILE_SAVE_COUNT`/`submitStockzAudit()` behavior is touched by this fix** — it only ensures the PC's state correctly reflects the phone's selection *before* a save is attempted, which is exactly the missing step.

### 4-state UX — is a new Error state needed for Finding 4? Decision: no, scope is sufficient as-is.

The task asks whether this fix should also surface an explicit error/toast on the residual `MOBILE_SAVE_COUNT` mismatch branch (`inventory-module.js:1522`, `if (payload.value === window.currentAuditItemKey) { ... }` — no `else`). **Decision: do not add one.** Reasoning:
- The actual failure mode this task must close is "the PC's `currentAuditItemKey` silently drifts from the phone's real selection." After this fix, every phone-side dropdown change immediately and synchronously updates `window.currentAuditItemKey` to match — the mismatch condition this silent-failure depended on can no longer arise from normal phone-driven item selection. The bug is closed at its root, not papered over with a toast.
- A theoretical residual race (phone sends `MOBILE_ITEM_SELECTED` for item A, then near-instantly `MOBILE_SAVE_COUNT` before the broadcast is processed) is extremely unlikely given Supabase Realtime broadcast delivery ordering per-sender-per-channel, and the phone-side UI itself requires two separate user interactions (select from dropdown, then tap save) with human reaction time between them — but this scenario, if it ever occurred, is exactly what the manual phone-in-the-loop test checklist (§8) must stress-test (rapid item-switch-then-save).
- **CLAUDE.md's Boy Scout rule is explicitly disabled during bug fixes** ("Disable this during bug fixes") — this is a `fix/*` branch, not `feat/*`/`refactor/*`, so adding a new defensive `else` branch/toast on the `MOBILE_SAVE_COUNT` guard, however small, is out of scope for this task even though it would be a reasonable hardening. **Flagging as an optional future hardening, not implementing it here:** an `else { showToast("Item changed on PC — please retry the save.", "warning"); }` branch at `inventory-module.js:1522`'s guard would give this one remaining edge case an explicit Error-state surface instead of a silent no-op, should this ever be prioritized separately.

---

## 5. Finding 5 (MEDIUM) — `updateCCRouteUI()` dead-code cluster — **APPROVED: Option A (delete wholesale)**

**Decision made 2026-07-20:** user selected Option A (delete wholesale) over Option B (restore) and over further deferral. Implement per §5.1 below.

**Re-confirmed current state:** `inventory-module.js:1696-1741`, `window.updateCCRouteUI = function(mode) {`:
```js
1696: window.updateCCRouteUI = function(mode) {
1697:     const btnPhone = document.getElementById('pcRoutePhone');
1698:     const btnPC = document.getElementById('pcRoutePC');
1699:     const btnBoth = document.getElementById('pcRouteBoth');
1700:     const screen = document.getElementById('ccRemotePreviewScreen');
1701:     const placeholder = document.getElementById('ccPhoneOnlyPlaceholder');
1702:     const statusCheck = document.getElementById('ccMobileBridgeStatus');
1703:
1704:     if (!btnPhone) return;
```
`pcRoutePhone`/`pcRoutePC`/`pcRouteBoth`/`pcRouteBar` all confirmed **zero producer anywhere in `index.html`** (repo-wide grep, re-run fresh — zero matches). `btnPhone` is therefore always `null`, and the unconditional `if (!btnPhone) return;` guard trips on every single call. Called from 2 live sites, both untouched by this task: `MOBILE_CONNECT` (line 1407, `window.updateCCRouteUI(currentPreviewMode);`) and `MOBILE_PREVIEW_MODE_CHANGED` (line 1444, same call). Confirmed via grep: the PC **never sends** `PC_PREVIEW_MODE_CHANGED` anywhere in `inventory-module.js` — but `tools/remote-scanner.html:997-1014` **does** have a live listener waiting for it (`syncChannel.on('broadcast', { event: 'PC_PREVIEW_MODE_CHANGED' }, ...)`, fully wired to update the phone's own 3-way route-button UI) — confirming the original bidirectional design was at least partially built on the phone side and never completed on the PC side, rather than never started at all.

### 5.1 Option A — delete wholesale (intentionally-retired reading)

Rationale: the simpler, live, 2-way `stockzAuditCameraRoute_pc`/`stockzAuditCameraRoute_phone` toggle (which selects *which device's camera is the active source* — PC webcam vs. phone camera) may have organically superseded the older 3-way Phone/PC/Both *destination*-routing concept from `docs/plans/feat-cycle-count-dual-preview.md`, making the whole selector genuinely obsolete, not merely unfinished.

What deleting looks like (do NOT execute without sign-off):
- Delete the `window.updateCCRouteUI` function body entirely (lines 1696-1741).
- Delete both call sites: `inventory-module.js:1407` (inside `MOBILE_CONNECT`) and `inventory-module.js:1444` (inside `MOBILE_PREVIEW_MODE_CHANGED`).
- **Do NOT delete `let currentPreviewMode = 'phone';` (line 1333)** — corrected from Batch 9 §1.3's original recommendation. This task's Finding 2 fix (§2) adds a *second*, independent live reader of `currentPreviewMode` inside `MOBILE_CONNECT`, and `MOBILE_PREVIEW_MODE_CHANGED` still needs to read/write it (lines 1443, 1454-1463) for its own already-correct placeholder-toggle logic. The variable is no longer solely `updateCCRouteUI`'s — it must survive this deletion.
- Leaves `remote-scanner.html:997-1014`'s `PC_PREVIEW_MODE_CHANGED` listener as permanently-unreachable dead code on the phone side (the PC never sends it) — a matching future cleanup, out of scope here regardless of which Finding-5 option is chosen, since `tools/remote-scanner.html` is confirmed untouched by this entire task.

### 5.2 Option B — restore the bidirectional 3-way routing (lost-feature reading)

Rationale: the phone-side listener (`remote-scanner.html:997-1014`) is fully built and waiting — only the PC-side send + PC-side buttons are missing, suggesting a deliberate feature that was left half-shipped, not abandoned.

What restoring requires (do NOT execute without sign-off — this is materially more invasive than any of Findings 1-4):
1. **New DOM markup** in `index.html`, Panel B (`stockzAuditCameraPanel_phone`, near lines 6634-6646) — 3 new buttons (`pcRoutePhone`/`pcRoutePC`/`pcRouteBoth`) plus a wrapping bar (`pcRouteBar`, already read-but-never-rendered at line 1397/1405 today). **Per CLAUDE.md's topological-integrity rule, this requires a simultaneous Mermaid Architectural Blueprint update in `tools/SK8Lytz_App_Master_Reference.md`.**
2. **New click wiring** — 3 new `data-click` tokens (e.g. `click_setPcPreviewRoute` with a `data-mode` attribute) plus a matching case block in `assets/js/system-event-delegator.js`.
3. **New PC→phone broadcast** — a `PC_PREVIEW_MODE_CHANGED` send (currently zero occurrences anywhere in `inventory-module.js`) fired from the new click handler, matching the payload shape the phone's existing listener already expects (`{ mode: 'phone'|'pc'|'both' }`).
4. **A product-level UX clarification is needed first, independent of code:** today's 2-way `stockzAuditCameraRoute_pc`/`_phone` toggle already lets the operator pick *which device's camera captures the barcode*. Whether a *second*, orthogonal "where does the live video render" 3-way selector is still wanted alongside it — or whether it would just confuse operators with two overlapping route concepts — is a product question this plan cannot answer. Recommend clarifying intended UX before scoping actual implementation, should Option B be chosen.
5. `updateCCRouteUI()` itself would then be reactivated as-is (its internal logic for the button/placeholder/status-text toggling is already correct — it uses the now-would-be-real `pcRoutePhone`/`pcRoutePC`/`pcRouteBoth` and, per Finding 2's fix above, would also need its `ccRemotePreviewScreen`/`ccPhoneOnlyPlaceholder`/`ccMobileBridgeStatus` reads (lines 1700-1702) individually corrected to their real `stockzAudit*` siblings at the same time, since those are still ghosts even under Option B).

**Recommendation for the HALT conversation:** ask the user directly which reading is correct before writing any Finding-5 code — this plan takes no position and implements neither option.

---

## 6. Security / XSS / RLS

**Zero new `innerHTML`/`insertAdjacentHTML`/`outerHTML`/`document.write` logic anywhere in Findings 1-4.** Every edited line is one of: a `getElementById(...)` argument string, a `.style.display` assignment (including one new ternary, see below), or a single function-call swap (`select.value = ...; window.updateCcMngrStock();` → `window.selectStockzAuditItem(...)`). No dynamic string is ever assigned to any DOM-injecting property.

**On the one new ternary introduced (Finding 2, §2):**
```js
if (placeholder) placeholder.style.display = (currentPreviewMode === 'phone') ? 'flex' : 'none';
```
This is **not** the CLAUDE.md-forbidden ternary pattern. The banned pattern is specifically `element.innerHTML = window.safeHTML ? window.safeHTML(x) : x;` — a fallback that can expose raw HTML if `neogleamz-engine.js` fails to load. This ternary chooses between two static string literals (`'flex'`/`'none'`) for a `.style.display` property assignment — there is no HTML injection surface here at all, guarded or otherwise. Flagging explicitly so a future `xss-audit.js`/manual-review pass doesn't misflag it on sight.

**Adjacent finding, NOT part of this task's diff (see §3):** `tools/remote-scanner.html:1064`, inside the currently-unreachable `populateItemsFromCache()`, contains a genuine unguarded `element.innerHTML = html` assignment with unescaped dynamic data (`${prefix}`/`${i.value}`/`${i.text}`, DB-sourced via `window.catalogCache`) — and the file has zero `safeHTML`/DOMPurify available at all. This is dead code today (its sole caller is gated behind a `catalogCache` field the PC never sends) and this task's Finding 3 decision (§3) deliberately keeps it dead by design — **do not add `catalogCache` to `SESSION_TRANSFER`'s payload as part of this task**, since doing so would activate this sink. Recommend logging this as its own small follow-up debt item (`tools/SK8Lytz_Bucket_List.md` § Technical Debt) rather than folding a security fix into this bug-fix branch's diff.

`node scripts/xss-audit.js` expected: **0 violations before and after** this task's 4 code changes (no-op on this metric — nothing in Findings 1-4 touches an HTML-injecting sink). Per CLAUDE.md's mandate, run `node scripts/xss-audit.js --warn` as part of the pre-implementation security-scout pass and post-implementation xss-validator pass regardless, to confirm this expectation empirically rather than asserting it.

**RLS implications:** none. Zero Supabase table reads/writes exist anywhere in the 4 edited spans (the nearest real Supabase-touching calls in this cluster — `supabaseClient.auth.getSession()`/`setSession()` in the session-transfer handshake, `submitStockzAudit()`'s actual DB write — are several lines away from every edit and are completely untouched).

**Print-window DOMPurify:** not applicable — no `document.write`/print-window path exists anywhere in this cluster.

---

## 7. Vanilla JS / framework constraints

All 4 fixes are edits inside existing native `function`/`window.X = function`/`channel.on('broadcast', ...)` handler bodies, using only native DOM (`getElementById`, `.style.display`, `.value`) and the existing Supabase Realtime broadcast channel (`window.ccSyncChannel`) — no framework code, no build step, no new CSS classes. No `var` present in any touched code; none introduced (all declarations remain `const`/`let`, matching surrounding style). Web Bluetooth (`navigator.bluetooth`) is not used anywhere in this cluster — the bridge itself is Supabase Realtime broadcast over WebSocket + `html5-qrcode`'s camera API, consistent with the existing architecture; nothing about that changes here.

---

## 8. UI mutex

**No new DB-mutation button is introduced or touched by any of the 4 fixes.** The one real mutation in this cluster, `window.submitStockzAudit()` (`inventory-module.js:2940`), is already correctly wrapped:
```js
2944:    await window.executeWithButtonAction(submitBtn, '⚡ COMMITTING...', '✅ SUCCESS', async () => {
```
and remains completely untouched by this task. Finding 4's fix (§4) changes *when/whether* `MOBILE_SAVE_COUNT`'s existing `await window.submitStockzAudit();` call (line 1559) is reached — by correctly keeping `window.currentAuditItemKey` in sync — but does not change the call itself or its mutex wrapping in any way. No other button in this cluster triggers a DB mutation.

---

## 9. Zero-refresh

Findings 1-3 are one-shot, connect-time DOM-state corrections inside a Realtime broadcast handler, not "after an async mutation resolves" render re-invocations — there is no async DB call in any of their code paths, so there is no render function to separately re-invoke; the corrected `getElementById` targets *are* the fix.

Finding 4 is the one fix in this task with real zero-refresh implications, and it is fully satisfied — see §4's full trace of `window.selectStockzAuditItem()`'s render cascade (re-renders the item select, scanner label, balances grid, delta valuation, ROP simulator, QR/session text, and re-broadcasts `PC_STOCK_UPDATE` back to the phone) with zero manual refresh required on either device.

---

## 10. Nomenclature-audit incidental side effect (informational only — not an objective of this task)

Fixing Findings 1, 2, and 3(a) as designed above will, as a pure side effect, correct 5 of the 12 remaining `N1_GHOST_ID` occurrences Batch 9 left open in this cluster (`ccScannerStatusIndicator`@1394, `ccScannerQRContainer`@1395, `ccRemotePreviewScreenContainer`@1396, `ccMngrItemSelect`@1410 and @1488) — since the correct fix for each *is* pointing them at their real modern siblings. The remaining 7 (`pcRoutePhone`/`pcRoutePC`/`pcRouteBoth`/`pcRouteBar`/`ccRemotePreviewScreen`@1700/`ccPhoneOnlyPlaceholder`@1701/`ccMobileBridgeStatus`@1702, all inside the untouched Finding-5 `updateCCRouteUI` body) remain open pending §5's product decision. **This task should NOT run `--update-baseline` or touch `scripts/nomenclature-baseline.json`** — that belongs to the separate `debt/nomenclature-remediation` epic's own process; report the incidental delta in this task's completion notes for that epic's future bookkeeping, nothing more.

---

## 11. Manual testing — phone-in-the-loop required, DOM inspection alone is not sufficient

This is a live, Supabase-Realtime-broadcast-driven, multi-device feature. **Zero automated test coverage exists for this cluster today** (confirmed: `tests/` has zero references to `selectStockzAuditItem`, `stockzAudit*`, `MOBILE_SAVE_COUNT`, or `ccSyncChannel` — the whole-file `require()` in `tests/inventory-engine.test.js` only guards against hard syntax errors, not behavior). A single-device click-through cannot exercise any of Findings 1-4 — all 4 are only reachable from a second physical device's broadcast events. **A real phone (or second browser instance on the same local network, minimum) is required before this task can be considered verified**, not just DOM/console inspection.

### 🧪 Manual Testing Guide — cc* Mobile Bridge Sync Bugs

**Browser:** Chrome 120+ on both PC and phone (Web Bluetooth-adjacent camera APIs + Supabase Realtime WebSocket).
**Environment:** PC on `http://127.0.0.1:5500` (or local network IP) + phone on the same Wi-Fi network, or both against `https://neogleamz.github.io` if testing post-deploy.
**Prerequisites:** logged-in Neogleamz OS session with STOCKZ inventory data seeded; a second device (phone or laptop) with a camera and Chrome.

#### ✅ Happy Path
1. STOCKPILEZ → STOCKZ → click any item's audit-triggering cell to open `stockzAuditModal`.
2. Click **📷 SCAN PORTAL** → **📱 Smartphone Link**. Confirm the QR code renders in the "Panel B" phone-camera-link view.
3. On the phone, scan the QR (or manually navigate to the printed URL). Wait for the phone to show "Bridge Connected ✓".
4. **Finding 1 check:** on the PC, confirm the small status dot next to "📷 AUDIT SCANNER" turns from red/pulsing to solid green within ~1-2 seconds of the phone connecting.
5. **Finding 2 check:** confirm the QR code box on the PC automatically disappears and the live-preview box automatically appears **without tapping anything on the phone** — this should happen the instant `MOBILE_CONNECT` fires, not after any additional phone-side interaction. Confirm the phone-only placeholder ("📱 Camera Rendering on Phone") is visible in the newly-shown preview box (matching the default `phone` preview mode).
6. **Finding 3 check:** on the phone, expand the manual item-selection drawer/dropdown. Confirm it now lists real items (grouped or flat is acceptable — flat is expected per §3's decision), not just the `-- Choose Item Natively --` placeholder.
7. **Finding 4 check (the highest-priority check in this batch):** on the phone, use the manual dropdown to select a **different** item than whatever is currently active on the PC. Confirm the PC's own item-select, scanner item name, and balances grid **immediately** update to reflect the phone's selection (zero-refresh, no PC-side action taken). Enter a count/delta on the phone and tap Save. Confirm the count **actually saves** — check for the `✅ SUCCESS` button-state flash on the PC's submit button and confirm the modal's grid updates to reflect the new balance. This is the scenario that silently failed before this fix — do not skip it.
8. Repeat step 7 but pick the SAME item on the phone that's already active on the PC (the pre-existing, already-working path) — confirm no regression.

#### ❌ Error & Edge Cases
1. On the phone, select the blank `-- Choose Item Natively --` placeholder option after having a real item selected. Expected: PC clears back to "no item selected" state (mirrors `openStockzAuditModal`'s own empty-selection behavior) — confirm this doesn't throw a console error.
2. Rapidly switch items on the phone's dropdown 3-4 times in quick succession, then immediately tap Save. Expected: the save applies to whichever item was selected last; no stale/wrong-item save. This stresses the theoretical race noted in §4 — watch the PC console for any errors during rapid switching.
3. Disconnect the phone's Wi-Fi mid-session, then reconnect. Expected: no PC-side crash; status dot may not reliably reflect a dropped connection (this is a known, out-of-scope gap — Finding 1's fix only makes the dot correctly turn green on connect, it does not add disconnect detection).

#### 🔁 Regression Checks (nearby features — verify nothing broke)
- PC-side barcode scan via 💻 PC Webcam route still selects the correct item (`onScanSuccess` → `selectStockzAuditItem`, untouched by this task).
- The 3 preview-route buttons on the **phone's own screen** (Phone/PC/Both) still work and still correctly trigger `MOBILE_PREVIEW_MODE_CHANGED`'s existing (already-correct, untouched) handler on the PC.
- Tapping "Discard" on the phone's shutter controls still cleanly closes the PC modal and tears down the webcam/channel with no console errors (`stopCycleCount`, untouched by this task).
- The PC's own "💾 RECORD AUDIT" button (non-phone path) still saves correctly and still shows `⚡ COMMITTING...` → `✅ SUCCESS` states (`submitStockzAudit`/`executeWithButtonAction`, untouched by this task).
- **Finding 5's dead `updateCCRouteUI()` must remain exactly as broken as before** — do not expect the 3-way Phone/PC/Both buttons to appear anywhere on the PC (they don't exist in either the before or after state of this task); this is expected, not a regression.

#### 🗄️ Database Verification (if DB write occurred)
- Supabase dashboard → Table: **`inventory_ledger`** (or the equivalent audit/adjustment table `submitStockzAudit()` writes to — confirm exact table name via `tools/SK8Lytz_App_Master_Reference.md`'s Database Schemas section before checking).
- Verify: the row logged for the Happy-Path-step-7 save reflects the item that was actually active on the phone at save time (the item you deliberately mismatched from the PC's prior selection), not the PC's stale prior item — this is the exact data-integrity check that confirms Finding 4 is closed.

---

## 12. Risks (ranked)

1. **Highest risk — Finding 4's fix is the only behavior change beyond a pure id-swap.** Routing through `window.selectStockzAuditItem()` instead of the old bare `select.value = ...` pairing is a strictly more-correct, better-tested code path (shared with barcode-scan and manual-open selection), but it is still new call-graph surface for the `MOBILE_ITEM_SELECTED` event specifically — verify via the Happy Path step 7 test above before trusting it, not just via code review.
2. **Medium-high risk — multi-device, asynchronous, Realtime-driven feature with zero automated test coverage.** As with Batch 9, a subtle regression here would not surface from a PC-only click-through. Phone-in-the-loop testing (§11) is mandatory, not optional.
3. **Medium risk — Finding 5 must not be resolved unilaterally.** Even though it is the most tempting "just delete it, it's obviously dead" cleanup in this cluster, §5 requires an explicit user decision before any code changes; do not fold it into this task's commits.
4. **Low risk — Findings 1, 2, 3 are pure/near-pure id-swaps** with no new call-graph surface (Finding 2 adds one new `.style.display` read of an already-existing module-scope variable, not a new mutation or async path). Re-`Read` each exact span immediately before editing regardless — this file has documented line-drift history across the parent nomenclature-remediation epic.

---

## Files Touched

- `assets/js/inventory-module.js` — the only application code file touched:
  - Line ~1394 (Finding 1): `getElementById('ccScannerStatusIndicator')` → `getElementById('stockzAuditScannerStatusIndicator')`.
  - Lines ~1395-1405 (Finding 2): `getElementById('ccScannerQRContainer')` → `getElementById('stockzAuditMobileQRContainer')`; `getElementById('ccRemotePreviewScreenContainer')` → `getElementById('stockzAuditMobilePreviewContainer')`; add new `const placeholder = document.getElementById('stockzAuditPhoneOnlyPlaceholder');` + one new conditional `.style.display` line. `pcRouteBar` line left untouched.
  - Line ~1410 (Finding 3a): `getElementById('ccMngrItemSelect')` → `getElementById('stockzAuditItemSelect')` inside the `ITEM_DIRECTORY` broadcast block.
  - Lines ~1485-1494 (Finding 4): replace the `getElementById('ccMngrItemSelect')` + `select.value = ...; window.updateCcMngrStock();` pairing with a single `window.selectStockzAuditItem(payload.value);` call inside the `MOBILE_ITEM_SELECTED` handler.
  - **Finding 5 (APPROVED, delete wholesale): delete `window.updateCCRouteUI` function body (lines ~1696-1741) and both call sites (`window.updateCCRouteUI(currentPreviewMode);` at ~1407 and ~1444). Keep `let currentPreviewMode = 'phone';` (line ~1333) — do NOT delete it, per §2's discovery that Finding 2's fix adds a second live reader.**
  - **Net: ~4 lines modified, ~2 lines added (Finding 2's new placeholder logic), ~48 lines deleted (Finding 5's function body + 2 call-site lines). All within one file.**

**Not touched (confirmed):**
- `index.html` — zero DOM producers created/deleted/moved; every real modern sibling id used by Findings 1-4 already exists and is unmodified.
- `tools/remote-scanner.html` — read for verification only. The phone-side code for Findings 1-4 is entirely correct as-is (the bugs are 100% PC-side/`inventory-module.js`). The adjacent unguarded-XSS discovery in `populateItemsFromCache()` (§3, §6) is flagged but explicitly not fixed here — recommend a separate small follow-up debt item.
- `assets/js/system-event-delegator.js` — no delegator tokens added/removed/renamed by any of the 4 fixes.
- `eslint.config.mjs` — no new/renamed `window.X` global function declarations (Finding 4 calls a pre-existing global, `window.selectStockzAuditItem`, already declared).
- `tools/SK8Lytz_App_Master_Reference.md` — no schema/RLS/UI-topology change from Findings 1-4. (Finding 5's Option B, if ever chosen, would require an update here per the topological-integrity rule — not applicable to this task's actual diff.)
- `tools/SK8Lytz_Bucket_List.md` — ledger-exemption rule; syncs at `/wind-down`. Recommend logging the `remote-scanner.html:1064` unguarded-innerHTML finding (§3, §6) as a new small Technical Debt entry at that time, alongside marking this task's ledger line `[x]`.
- `scripts/nomenclature-baseline.json` — deliberately not touched; the incidental N1_GHOST_ID improvement (§10) belongs to a different epic's bookkeeping process, not this task.
- `tests/` — zero existing test coverage for this cluster to update; no new automated tests are being added as part of this task (out of scope; the manual phone-in-the-loop checklist in §11 is the verification mechanism).

## Suggested commit message(s)

Micro-commit cadence, one commit per finding (matching this repo's established style):

1. `fix(cc-mobile-bridge): point ccScannerStatusIndicator ghost read at real stockzAuditScannerStatusIndicator so the connection dot turns green` — `assets/js/inventory-module.js` (§1)
2. `fix(cc-mobile-bridge): point QR/preview-container ghost reads at real stockzAudit* siblings and auto-toggle the phone-only placeholder on connect` — `assets/js/inventory-module.js` (§2)
3. `fix(cc-mobile-bridge): point ITEM_DIRECTORY's ghost select read at real stockzAuditItemSelect so the phone's manual dropdown populates` — `assets/js/inventory-module.js` (§3)
4. `fix(cc-mobile-bridge): route MOBILE_ITEM_SELECTED through selectStockzAuditItem() to close silent phone-to-PC save-loss bug` — `assets/js/inventory-module.js` (§4)
5. `refactor(cc-mobile-bridge): delete dead updateCCRouteUI() 3-way routing function and its 2 call sites, superseded by stockzAuditCameraRoute_pc/_phone toggle` — `assets/js/inventory-module.js` (§5)

(Per the ledger-exemption rule, `tools/SK8Lytz_Bucket_List.md` is not touched in any of these micro-commits.)
