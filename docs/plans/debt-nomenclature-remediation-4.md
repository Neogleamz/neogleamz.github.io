# debt/nomenclature-remediation — Batch 4: Close out N1_GHOST_ID_PREFIX (9→0) + N7 dictionary sync

## Scope

Batch 4 of the multi-batch ledger item `debt/nomenclature-remediation`. Resolves all 9 remaining **N1_GHOST_ID_PREFIX** findings (17 total at Phase-1 capture, minus the 8 that Batch 3 already allowlisted `stockzAuditBtn_*`/`stockzAuditTab_*`/`sect-P-*`/`sect-*` = 9 remaining, confirmed against the live `dynamic_id_allowlist` and `scripts/nomenclature-baseline.json`'s 13 deduped `N1_GHOST_ID_PREFIX` fingerprints). Two independent mechanisms, same as Batches 1-3's pattern of "registry fix where safe, code fix where the code is truly dead":

1. **Code deletion** (2 files) — two genuinely dead code islands with zero producers and zero live callers.
2. **Registry allowlist** (2 entries) — one dormant-but-guarded feature, not dead code.
3. **Dictionary regeneration** — clears the pre-existing `N7_DICT_STALE` (1 finding) as a side effect of the registry edit.

A separate, **not-in-scope-by-default** "Option B" investigation of the wider Cycle Count Mobile Bridge cluster is presented at the end for an explicit user decision — see that section before assuming it's part of this batch.

---

## 1. DELETE dead resize trio — `assets/js/system-tools-module.js`

**Revised deletion boundary vs. the initial task framing.** The task cited `window.initInlineResize` at 2844-2875, but reading the file shows the 4 ghost-id reads (`inlineContainer_*`, `inlineLeftPane_*`, `inlineRightPane_*`, `inlinePreviewContainer_*`) are not inside `initInlineResize` at all — they're inside a **second** function, `window.doInlineResize`, which `initInlineResize` merely registers as a `mousemove` listener. A third function, `window.stopInlineResize`, unregisters both listeners. All three only ever reference each other:

| Function | Lines | Evidence |
|---|---|---|
| `window.initInlineResize` | 2844-2851 | Zero callers repo-wide (`grep -rn initInlineResize` → 1 hit, the declaration itself). |
| `window.doInlineResize` | 2853-2876 | Reads `inlineContainer_` (2856), `inlineLeftPane_` (2857), `inlineRightPane_` (2858), `inlinePreviewContainer_` (2864). Only ever wired via `initInlineResize`'s `addEventListener('mousemove', window.doInlineResize)` (line 2849) — never called directly. |
| `window.stopInlineResize` | 2878-2886 | Only ever wired via `initInlineResize`'s `addEventListener('mouseup', window.stopInlineResize)` (line 2850) — never called directly. |

Since the sole entry point (`initInlineResize`) has no caller, the whole trio is unreachable dead code, not just the ghost-id-reading middle function. **Correct deletion span: lines 2844-2886** (43 lines, the full trio), not 2844-2875.

Boundary check (no orphaned comments/surrounding code):
- Line 2843 is blank; line 2842 is the closing `};` of the unrelated, live `window.stopUnifiedSopResize` — no shared header comment to preserve or delete.
- Line 2887 is blank; line 2889 begins `// --- 14. LOCAL ENGINE & SANDBOX AUTOMATION ---`, the next section's own banner — untouched.
- No dedicated banner comment exists for the inline-resize trio itself (it was inserted between two unrelated blocks with no heading), so nothing is orphaned by deleting exactly 2844-2886.

Already-guarded, zero crash risk today (`if(!wrapper || !leftPane) return;`) — this is a pure dead-code removal, not a bug fix.

Not declared as an ESLint global in `eslint.config.mjs` (checked — no match for `initInlineResize`/`doInlineResize`/`stopInlineResize`), so no stale global-declaration cleanup is needed alongside the deletion.

---

## 2. DELETE 6 dead lines — `assets/js/sales-module.js:1494-1499`

Confirmed exact span. Inside the `forensicResults.forEach` block (which starts around line 1490), immediately after the comment `// Update DOM live` (line 1493):

```
1494  let elCapture = document.getElementById(`sim-capture-${i}`);
1495  let elFee = document.getElementById(`sim-fee-${i}`);
1496  let elShipExp = document.getElementById(`sim-shipexp-${i}`);
1497  let elCogs = document.getElementById(`sim-cogs-${i}`);
1498  let elGhost = document.getElementById(`sim-ghost-${i}`);
1499  let elNet = document.getElementById(`sim-net-${i}`);
```

Verified via repo-wide grep for each of the 6 variable names (`elCapture`, `elFee`, `elShipExp`, `elCogs`, `elGhost`, `elNet`): **every one only ever appears on its own declaration line** — never read, never assigned to again. This is a bigger dead span than the task's framing implied (which called out only `elShipExp`/`elGhost`/`elNet` as the N1-relevant ones, since only `sim-shipexp-*`, `sim-ghost-*`, `sim-net-*` are ghost prefixes) — but `elCapture`/`elFee`/`elCogs` are equally dead (`sim-capture-*`/`sim-fee-*`/`sim-cogs-*` just happen to also resolve as real prefixes elsewhere via `collected.dynamicPrefixes`, so their ghost-ness was never flagged by N1 — they're still unused-variable dead code). Deleting all 6 together is correct and matches the task's "6 lines" instruction exactly.

**Confirmed naming-mismatch, not a bug to fix:** `sim-shipexp-${i}` (line 1496, dead) vs. the real, live, later-declared `sim-ship-exp-${i}` (line 1535, hyphenated, used to build `shipExpEl` which **is** read). The dead line is simply an earlier, abandoned draft of the same lookup — the live code a few lines down (1533-1538: `captureEl`, `feeEl`, `shipExpEl`, `cogsEl`, `refEl`, `profitEl`) is the real, working implementation using corrected ids and variable names. Do not touch lines 1533-1538.

Boundary check: line 1493's comment (`// Update DOM live`) is a section header for the whole forEach body (not just these 6 lines — the `log(...)` calls and the real DOM-write block at 1533+ continue under the same conceptual heading), so it must **stay**. Only delete lines 1494-1499 themselves; line 1500 (blank) and 1501 onward are untouched.

---

## 3. Registry allowlist — `inlineSopQA_*` / `inlineSopQAPreview_*`

**Not dead code — a dormant, half-shipped feature.** Full call-chain trace:

1. `window.click_openSOPSnapshotCamera_inlineProduction(btn)` (`assets/js/production-module.js:2704-2709`) is a generic, **live**, delegator-wired handler (`data-click`) that sets `window.activeSOPTextAreaId = btn.dataset.textid` — whatever text the clicked button's `data-textid` attribute carries.
2. `window.inlineRenderTelemetryPreview(grpId)` (`assets/js/production-module.js:2900-2925`) reads `document.getElementById('inlineSopQA_' + grpId)?.value` (line 2902, optional-chained) and `document.getElementById('inlineSopQAPreview_' + grpId)` (line 2903, followed by `if(!previewContainer) return;` on line 2904) — fully guarded, zero crash risk.
3. `inlineRenderTelemetryPreview` is invoked from `assets/js/packerz-module.js:2082-2083`, gated on `window.activeSOPTextAreaId.startsWith('inlineSopQA_')` — so the read path only fires if some button somewhere sets `activeSOPTextAreaId` to a string with that exact prefix.
4. **No such button exists in shipped code.** The intended markup — `data-click="click_openSOPSnapshotCamera_inlineProduction" data-textid="inlineSopQA_${grp.id}"` paired with a `<textarea id="inlineSopQA_${grp.id}">` — exists **only** in two archived one-off patch scripts (`scripts/archive/compact_batchez_buttons.py:10`, `scripts/archive/patch_production_module.py:61`), never merged into the live `assets/js/production-module.js` template. No textarea with this id is ever produced today.

Conclusion: this is a **planned-but-never-shipped** feature stub, not orphaned dead code — the reader is correctly guarded and wired to a real (if currently-unreachable) gate, and deleting it would destroy working infrastructure for a feature that just needs its producer markup finished later. Registry allowlist is the correct fix, matching Batch 3's precedent for the ambiguous case it explicitly deferred.

**Resolution type:** both ids are composed via string concatenation (`'inlineSopQA_' + grpId`, `'inlineSopQAPreview_' + grpId` — a `+` operator, not a template literal), so classify as `runtime-concatenation` (same category as `pipe-P-*`/`sect-P-*`/`sect-*`), not `template-literal`.

Add to `tools/nomenclature-registry.json` → `dynamic_id_allowlist`:

```json
{
  "pattern": "inlineSopQA_*",
  "resolution_type": "runtime-concatenation",
  "evidence": ["assets/js/production-module.js:2902"],
  "note": "Dormant planned feature, not dead code. Reader window.inlineRenderTelemetryPreview (production-module.js:2900-2904, guarded via ?. and if(!previewContainer) return;) is invoked from assets/js/packerz-module.js:2082-2083, gated on window.activeSOPTextAreaId.startsWith('inlineSopQA_'). That flag is set generically by the live, delegator-wired window.click_openSOPSnapshotCamera_inlineProduction (production-module.js:2704-2709) from a clicked button's data-textid attribute. The intended producer markup (a button with data-textid=\"inlineSopQA_${grp.id}\" paired with a matching <textarea id>) exists only in scripts/archive/compact_batchez_buttons.py:10 and scripts/archive/patch_production_module.py:61 — never merged into the live production-module.js template. Zero crash risk; do not delete, this is unfinished-feature scaffolding, not an orphan."
},
{
  "pattern": "inlineSopQAPreview_*",
  "resolution_type": "runtime-concatenation",
  "evidence": ["assets/js/production-module.js:2903"],
  "note": "Companion preview-container id to inlineSopQA_* — same dormant-feature story, same reader (inlineRenderTelemetryPreview), same guard (if(!previewContainer) return; at production-module.js:2904). See inlineSopQA_* note for the full call-chain trace.",
  "cross_ref": "dynamic_id_allowlist.inlineSopQA_*"
}
```

No application code changes for this item.

---

## 4. Regenerate the dictionary

`node scripts/generate-nomenclature-dictionary.js` after the registry edit. `checkN7` (`scripts/nomenclature-audit.js:452-465`) does a byte-for-byte diff between `docs/nomenclature_dictionary.md` and what `buildOutput(registry)` would produce right now — any registry edit without a regeneration trips `N7_DICT_STALE`. This clears the **pre-existing** `N7_DICT_STALE: 1` finding left over from Batch 3 (which edited the registry but — per its own plan doc — only said "regenerate the dictionary if the registry edit trips it," and evidently the regeneration step was never actually run/committed, since the finding is still live). This batch commits the regenerated file.

---

## Baseline handling — do NOT run `--update-baseline` this batch

Traced `scripts/nomenclature-audit.js:512-548` (`loadBaselineIfExists`/`updateBaseline`) and the CLI flags at the top of the file:

- **Shrink (fixed findings) never needs a flag.** `updateBaseline()` only refuses to write when `added.length > 0 && !FORCE` (line 525) — i.e. it blocks *growth* (new fingerprints not already in the committed baseline) unless `--force` is passed. Removed fingerprints are always accepted silently (line 532: `console.log('✅ Baseline shrinking...')`).
- **Precedent: none of Batches 1-3 ran `--update-baseline`.** Read all three prior plans — each verification section only re-runs `--warn` and (where relevant) regenerates the dictionary; none mention `--update-baseline`. Confirmed against the live file: `scripts/nomenclature-baseline.json`'s `captured_at` is still `2026-07-17T11:56:54Z` with `total_findings: 358` and `by_rule.N1_GHOST_ID_PREFIX: 17` — the Phase-1 initial-capture snapshot — even though Batches 2 and 3 have already merged and shrunk the *live* scan well below those numbers (confirmed: the baseline's own fingerprint list still lists `stockzAuditBtn_*`, `stockzAuditTab_*`, `sect-P-*`, `sect-*`, and (implicitly, not re-checked line-by-line here) the 12 Batch-2 localStorage keys, as still-open findings, which they no longer are on this branch).
- Batch 1's own plan text explains why: baseline refresh reads as a **phase-boundary** activity ("Phase 4... flips the pre-commit hook to blocking"), not a per-batch one — the pre-commit hook only ever runs `--warn --changed-only` (advisory), so a stale/oversized baseline blocks nothing; it only means the "X of Y total findings are NEW" reporting line undercounts how much has already shrunk.

**Decision for this batch: follow the established precedent, do not run `--update-baseline`.** Running it would be safe (this batch is pure shrink) but would produce an unrelated, noisy diff across ~30+ already-resolved Batch 2/3 fingerprints that this batch didn't touch, breaking the "one batch, one concern" pattern the ledger's micro-commit cadence expects. Flag for the user: a **future consolidated `chore(audit): refresh nomenclature baseline` commit** (own commit, own review) would be the right place to catch the baseline up to Batches 2-4 all at once, whenever the epic reaches its next natural checkpoint (e.g. after Tier 2 fully closes, or right before flipping the pre-commit hook to blocking). Not part of this batch's diff.

---

## Verification

Expected deltas from `node scripts/nomenclature-audit.js --warn` (full scan, not `--changed-only` — N1/N7 aren't scoped by the changed-only line filter regardless):

| Rule | Before | After | Why |
|---|---|---|---|
| `N1_GHOST_ID_PREFIX` | 9 | **0** | 4 raw findings from `inlineContainer_`/`inlineLeftPane_`/`inlineRightPane_`/`inlinePreviewContainer_` (1 call site each) disappear because the reading code (`doInlineResize`) is deleted. 3 raw findings from `sim-shipexp-`/`sim-ghost-`/`sim-net-` disappear because the reading lines are deleted. 2 raw findings from `inlineSopQA_`/`inlineSopQAPreview_` disappear because the patterns are now allowlisted. 4+3+2 = 9. |
| `N7_DICT_STALE` | 1 | **0** | Dictionary regenerated immediately after the registry edit. |
| `N1_GHOST_ID` | 141 | **141** (unchanged) | This batch touches no `literal`-kind ghost lookups, only `prefix`-kind ones. |
| `N3_LABEL_DRIFT` | 1 | 1 (unchanged) | Not touched. |
| `N4_LEGACY_TERM` | 85 | 85 (unchanged) | Not touched. |
| `N5_NEW_NONCONFORMANT_KEY` | 0 (post-Batch-2) | 0 (unchanged) | Not touched. |
| `N6_UNUSED_CSS` | 29 (post-Batch-1) | 29 (unchanged) | Not touched. |

If Option B is separately approved (see below), also expect an **`N1_GHOST_ID`** reduction — estimated count given in that section — as its own follow-up diff, not folded into the numbers above.

**Other required checks:**
- `npm test` → 59/59 passing (unchanged). Confirmed no test file references `initInlineResize`, `doInlineResize`, `stopInlineResize`, or the 6 deleted `sales-module.js` variable names (`grep`'d `tests/*.js` — zero hits).
- `npx eslint .` → 0 errors / 0 warnings (unchanged). None of the deleted identifiers are declared in `eslint.config.mjs`'s globals list, so no stale-global cleanup is required alongside the deletion.
- `node scripts/xss-audit.js` → 0 violations before and after. This batch touches no `innerHTML`/`insertAdjacentHTML`/`outerHTML`/`document.write` call — it is pure dead-code deletion in two `.js` files plus a `.json` registry edit and a regenerated `.md` doc. Still required to run per CLAUDE.md's active-scan mandate; expect a no-op confirmation, not a fix.
- Pre-commit hook (`.githooks/pre-commit`) runs the nomenclature audit in `--warn --changed-only` mode (line 40) — advisory only, cannot block this commit even if something were miscounted. The XSS gate (line 33) *is* blocking, but is unaffected by this batch (see above).

---

## Security / XSS

None of these edits touch a DOM-write path (`innerHTML`, `insertAdjacentHTML`, `outerHTML`, `document.write`). No RLS/Supabase implications — `tools/nomenclature-registry.json` is a project-internal linting registry, not a database schema or policy. `node scripts/xss-audit.js` must still show 0 violations before and after (see Verification).

## Vanilla JS / framework constraints

Deletions only remove `var`-free, native-DOM `function`/`window.X =` assignments (`system-tools-module.js`) and `let` declarations (`sales-module.js`) — no `var` was present in the deleted code, none is introduced. No framework code, no build step, no new CSS utility classes. The registry/dictionary edits are JSON/generated-Markdown, not JS.

## 4-state UX / UI mutex / zero-refresh

Not applicable — no data component, no DB mutation button, no async operation, no new UI surface. Nothing rendered on screen changes behavior (the deleted drag-resize handlers were never reachable; the allowlisted ids belong to a feature with no shipped UI yet).

## Schema / Master Reference

No Supabase table/column/RLS change. `tools/SK8Lytz_App_Master_Reference.md` `## Database Schemas` section is unaffected — no update required for this batch. No button/modal/UI element is created, moved, or deleted, so the Mermaid Architectural Blueprint is also unaffected (topological-integrity rule N/A here).

---

## Option B — Cycle Count Mobile Bridge cluster (requires explicit user approval; NOT part of the default batch)

The originating task description framed this as "delete lines ~1400-1900+ in `assets/js/inventory-module.js`, resolve 12 ghost ids, superseded by the live `stockzAuditModal`." **I traced every one of the 12 cited ids plus their containing functions and this framing is materially wrong as a bulk-delete plan — it would break the live feature if executed as literally described.** Full findings below; treat this whole section as revised/Discovery-Mode analysis, not a ready-to-execute instruction.

### The core problem: this is not one dead block, it's live and dead code interleaved inside shared functions

`window.initializeCcSyncChannel` (`inventory-module.js:1378-1634`) — the Supabase Realtime channel bridge that most of the 12 cited ids live inside — is **not dead**. It is called directly from `window.selectStockzAuditItem` at **lines 2324 and 2489**, which is the live, shipped item-selection handler for the `stockzAuditModal` feature (the very feature Agent A's map said superseded this cluster). In other words: the mobile-bridge channel logic wasn't superseded, it was **reused** — the old "Cycle Count Manager" UI was ripped out of `index.html`, but its JS backing functions were kept and repurposed to drive the new `stockzAuditModal`'s remote-phone-camera feature. Concretely:

- `window.openCycleCountManager` / `window.closeCycleCountManager` (`inventory-module.js:2598-2604`) are now **thin live aliases**: `openCycleCountManager()` just calls `window.openStockzAuditModal('', 'audit')`; `closeCycleCountManager()` just calls `window.closeStockzAuditModal()`. `openCycleCountManager` is wired to a real, currently-visible button: `<button data-click="click_window_openCycleCountManager">📦 Cycle Counts</button>` at `index.html:1902`.
- `window.updateCcMngrStock` (`inventory-module.js:2592-2596`) is a live alias that calls `window.selectStockzAuditItem(...)` — and is itself called from ~6 live sites elsewhere in `inventory-module.js` (e.g. lines 35, 411, 454, 461, 634) plus `system-event-delegator.js:1893`.
- `window.updateCCRouteUI` (`inventory-module.js:2019-2064`) is called live from inside `initializeCcSyncChannel`'s `MOBILE_CONNECT` and `MOBILE_PREVIEW_MODE_CHANGED` broadcast handlers (lines 1452, 1492) — i.e. it fires whenever a phone actually connects during a real stockzAudit session.
- `window.stopCycleCount` (`inventory-module.js:1888-1921`) tears down `window.ccSyncChannel` and is called live from `initializeCcSyncChannel`'s `MOBILE_DISCARD_AND_BACK` broadcast handler (line 1528) — a real phone-triggered event.

None of these four can be deleted. Each still contains a handful of ghost-id reads (already null-guarded, e.g. `if (statusIndicator) {...}`, `if(!btnPhone) return;`), but those reads are inseparable from live logic in the same handler blocks (e.g. the `REMOTE_FRAME_STREAM` handler at lines 1476-1485 updates both the dead `ccRemotePreviewScreen` **and** the live `stockzAuditMobilePreviewScreen` in the same `if` block). Removing them safely requires careful line-level surgery inside a shared, actively-used function — a materially different (and riskier) task than deleting an orphaned block, and out of scope for this batch.

### What's actually, fully dead (verified: zero live callers, confirmed via delegator-emitter and DOM-producer search)

| Function | Lines | Why it's dead |
|---|---|---|
| `window.startLocalCycleCount` | 1638-1731 | Delegator case `click_startLocalCycleCount` (system-event-delegator.js:1214-1216) has zero `data-click` emitters anywhere in the repo. |
| `window.startLocalScannerWithDevice` | 1733-1757 | Only called from `startLocalCycleCount` (dead) and `change_handleCCLocalDeviceChange` (dead, below). |
| `window.change_handleCCLocalDeviceChange` | 1759-1763 | Wired to `id="ccLocalDeviceSelect"` (a `change` handler), which has zero producer anywhere (already a known `N1_GHOST_ID` baseline entry, `assets/js/inventory-module.js\|N1_GHOST_ID\|ccLocalDeviceSelect`). |
| `window.startRemoteCycleCount` | 1765-1863 | Delegator case `click_startRemoteCycleCount` (system-event-delegator.js:1217-1219) has zero emitters. Its own alias `window.startCycleCount` (line 1886) is wired to `click_window_startCycleCount` (system-event-delegator.js:1211-1212), which also has zero emitters. |
| `window.click_updateLocalIPQRCode_cc` | 1865-1883 | Only calls `startRemoteCycleCount` (dead); no delegator case references this token at all (not even a dead one). |
| `window.startCycleCount` (alias) | 1885-1886 | `= window.startRemoteCycleCount` — dead by association. |
| `window.click_setCCRoutePhone` / `click_setCCRoutePC` / `click_setCCRouteBoth` | 2066-2076 / 2078-2088 / 2090-2100 | Delegator cases `click_setCCRoutePhone`/`click_setCCRoutePC`/`click_setCCRouteBoth` (system-event-delegator.js:1220-1228) have zero emitters. (`updateCCRouteUI`, which these call, stays live via the other, real call path described above.) |
| `window.filterCcMngrItems` | 2110-2138 | Delegator case `click_window_filterCcMngrItems` (system-event-delegator.js:1229-1231) has zero emitters. Also permanently short-circuits today regardless (`if(!window.cachedCcMngrOptions) return;` — that global is never assigned anywhere in the repo). |
| `window.selectCcMngrItem` | 2140-2145 | Only reachable via an `action === 'selectCcItem'` branch (inventory-module.js:3560) inside a shared action-dispatcher function — that specific branch has no live producer of a `data-action="selectCcItem"` element anywhere. Contains one **unguarded** ghost-id write (`document.getElementById('ccMngrItemSelect').value = val;`, line 2141 — would throw if ever reached, since `ccMngrItemSelect` has no producer) — currently harmless only because it's unreachable. Also declared as an ESLint global (`eslint.config.mjs:259`) that would need cleanup if deleted. |
| `window.saveManualCycleCount` | — (never defined) | Referenced (conditionally, `typeof window.saveManualCycleCount === 'function'`) at `system-event-delegator.js:1233` and inside `initializeCcSyncChannel`'s `MOBILE_SAVE_COUNT` else-branch (line 1621) — but **no definition exists anywhere in the repo**. Both call sites are permanently-false-guarded no-ops. Nothing to delete here (there's no function body), but worth noting as further evidence this whole subsystem was abandoned mid-migration. |

These 9 functions/aliases span **three non-contiguous line ranges** in `inventory-module.js` (roughly 1638-1886, 2066-2100, 2110-2145) — `updateCCRouteUI` (2019-2064) and `stopCycleCount` (1888-1921) sit *between* them and must be preserved, so this is not a single clean block deletion even for the confirmed-safe subset.

### Estimated finding reduction (verified per-id, not assumed)

Because `N1_GHOST_ID`/`N1_GHOST_ID_PREFIX` findings are deduped by `(file, ruleId, identifier)` — **any single remaining reference anywhere in the file keeps the finding alive**, even if 3 of 4 call sites are deleted. Tracing every reference of every candidate id individually:

**Would be fully eliminated** by deleting the 9 confirmed-dead functions above (all references exclusively inside them): `ccScannerHeaderTitle`, `ccLocalScannerArea`, `ccRemoteScannerArea`, `inlineScannerItemName`, `inlineScannerExpected`, `ccLocalDeviceSelect`, `ccLocalDeviceSelectContainer`, `ccLocalIPOverrideContainer`, `pcLocalIPInput_cc`, `ccScannerQRCodeImg`, `ccMngrSearch`, `ccMngrDropdown` — **12 ids**, a different set than Agent A's original 12.

**Would NOT be eliminated** (at least one reference persists inside `initializeCcSyncChannel`, `updateCCRouteUI`, or `stopCycleCount`, all of which must stay): `ccMobileBridgeStatus`, `ccScannerStatusIndicator`, `ccScannerQRContainer`, `ccRemotePreviewScreenContainer`, `pcRouteBar`, `ccMngrItemSelect`, `ccRemotePreviewScreen`, `ccMngrQtyInput`, `inlineCycleScannerCard`, `barcode-reader`, `pcRoutePhone`, `pcRoutePC`, `pcRouteBoth`, `ccPhoneOnlyPlaceholder` — **13 ids, including 9 of Agent A's original 12-id list.**

Net: of Agent A's originally-cited 12 ghost ids, only **3** (`ccScannerHeaderTitle`, `ccLocalScannerArea`, `ccRemoteScannerArea`) would actually clear. The other 9 persist regardless of Option B, because their only remaining references live inside functions this investigation confirms are shared with the live `stockzAuditModal` feature. Total realistic `N1_GHOST_ID` reduction from executing the confirmed-safe subset: **12 ids** (a mix of Agent A's list and newly-discovered ones), against a backlog of 141 — roughly 8-9%, not "a large chunk."

### Risks

- The dead functions are **not contiguous** — deleting them requires 3 separate precise excisions in the same file, each bounded by a live function on at least one side (`updateCCRouteUI`, `stopCycleCount`). Higher chance of an off-by-one boundary error than a single-block deletion.
- `window.selectCcMngrItem`'s deletion also requires removing one `if` branch (`action === 'selectCcItem'`) out of a larger, shared action-dispatcher function at `inventory-module.js:~3550-3565` — that dispatcher itself must not be touched beyond this one branch.
- Deleting `selectCcMngrItem` also orphans its `eslint.config.mjs:259` global declaration — would need a follow-up removal there (outside `inventory-module.js`) to avoid a stale/unused global.
- None of this resolves the underlying architectural question of whether `initializeCcSyncChannel`/`updateCCRouteUI`/`stopCycleCount`'s embedded dead-id branches should ever be cleaned up — that would require a dedicated future investigation scoped around *editing inside* live functions (materially different risk profile than deleting orphans), likely wanting its own security-scout-style review given how deeply it's wired into the live Supabase Realtime channel.

### Recommendation

**Decline bulk Option B as originally scoped** — the premise ("delete the whole cluster, it's superseded") is not supported by the evidence; executing it literally would strip working code out of the live `stockzAuditModal` mobile-camera bridge.

If the user wants to proceed with the **verified-safe subset** ("Option B-lite": the 9 functions/aliases in the first table above, ~12 `N1_GHOST_ID` findings resolved, 3 non-contiguous deletion spans plus one ESLint global cleanup), that is safe to schedule as its own future batch, separate from this one — it is a meaningfully different, smaller, and differently-risked change than what was originally described, and deserves its own plan document and its own explore-mapper pass to re-verify line numbers at execution time (this repo's line numbers shift between batches). **Not executed as part of Batch 4.**

---

## Files Touched

- `assets/js/system-tools-module.js` — delete lines 2844-2886 (dead `initInlineResize`/`doInlineResize`/`stopInlineResize` trio).
- `assets/js/sales-module.js` — delete lines 1494-1499 (6 dead `let` declarations).
- `tools/nomenclature-registry.json` — add 2 entries to `dynamic_id_allowlist` (`inlineSopQA_*`, `inlineSopQAPreview_*`).
- `docs/nomenclature_dictionary.md` — regenerated output (via `node scripts/generate-nomenclature-dictionary.js`), not hand-edited.

Not touched (confirmed): `scripts/nomenclature-baseline.json` (see "Baseline handling" above — deliberately deferred to a future consolidated refresh), `tools/SK8Lytz_App_Master_Reference.md` (no schema/RLS/UI-topology change), `index.html`, any Supabase table/RLS, `assets/js/inventory-module.js` (Option B not executed by default).

## Suggested commit message (micro-commit cadence)

Two small, semantically-scoped commits, matching Batches 1-3's one-concern-per-commit style:

1. `refactor(nomenclature): delete dead inline-resize trio and sales-module dead vars`
   — `assets/js/system-tools-module.js`, `assets/js/sales-module.js`
2. `chore(nomenclature): allowlist dormant inlineSopQA_* ids, regen dictionary`
   — `tools/nomenclature-registry.json`, `docs/nomenclature_dictionary.md`

(Per the ledger-exemption rule, `tools/SK8Lytz_Bucket_List.md` is not touched in either commit — it syncs at `/wind-down`.)
