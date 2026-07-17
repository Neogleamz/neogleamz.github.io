# Canonical Nomenclature Dictionary
> Generated from tools/nomenclature-registry.json — do not hand-edit.
> Regenerate: node scripts/generate-nomenclature-dictionary.js
> Machine authority: tools/nomenclature-registry.json (ratified 2026-07-17)

## Hub & Pane Directory

| Hub | Tab Content DOM ID | Tab Button Token | Panes (canonical label → dom id) | Modules |
| --- | --- | --- | --- | --- |
| 📊 STOCKPILEZ | `stockpilez-tab` | `click_switchTab_stockpilez` | STOCKZ → `paneInventory`<br>DATAZ → `panePipeline`<br>EDITZ → `paneSimple` | `inventory-module.js`<br>`bom-module.js` |
| 🏭 MAKERZ | `makerz-tab` | `click_switchTab_makerz` | RECIPEZ → `paneProdBuilder`<br>BATCHEZ → `paneProdControl`<br>LAYERZ → `paneProdPrint` | `production-module.js`<br>`barcodz-module.js` |
| 📦 FULFILLZ | `fulfillz-tab` | `click_switchTab_fulfillz` | PACKERZ → `paneFulfillzPackerz`<br>BARCODZ → `paneFulfillzBarcodz`<br>LABELZ → `paneFulfillzLabelz` | `packerz-module.js`<br>`print-module.js`<br>`labelz-module.js` |
| 🛒 REVENUEZ | `revenuez-tab` | `click_switchTab_revenuez` | ORDERZ → `paneSalezBridge`<br>STATZ → `paneSalezAnalyticz`<br>SIMULATORZ → `paneSalezCommandz` | `sales-module.js`<br>`ceo-module.js` |
| 👥 SOCIALZ | `socialz-tab` | `click_switchTab_socialz` | ROSTER → `paneSocialzRoster` | `socialz-module.js` |
| ⚡ NEXUZ | `nexuz-tab` | `click_switchTab_nexl` | IMPORTZ → `paneNexlImportz`<br>SALEZ → `paneNexlSalez`<br>BRAINZ → `paneNexlBrainz` | `system-tools-module.js`<br>`task-engine.js` |

## Legacy Alias Log (L2/L3 — document, don't rename; ADR decision D2)

| Identifier | Canonical Label | Embedded Legacy Term(s) | Note |
| --- | --- | --- | --- |
| `paneProdBuilder` | RECIPEZ | Prod | Selected via static lookup object index.html:5211 (literal-matchable, not concatenation). |
| `paneProdControl` | BATCHEZ | Prod |  |
| `paneProdPrint` | LAYERZ | Prod |  |
| `paneSalezBridge` | ORDERZ | Salez, Bridge | Selected via runtime string concatenation index.html:5196 — see dynamic_id_allowlist 'paneSalez*'. |
| `paneSalezAnalyticz` | STATZ | Salez |  |
| `paneSalezCommandz` | SIMULATORZ | Salez |  |
| `paneNexlImportz` | IMPORTZ | Nexl | Selected via static lookup object index.html:5249 (literal-matchable, not concatenation). |
| `paneNexlSalez` | SALEZ | Nexl |  |
| `paneNexlBrainz` | BRAINZ | Nexl |  |
| `syncSalezStats()` | — | Salez | Referenced by name inside a function-pointer table entry {name:'SALEZ', func: syncSalezStats} (line 1119) — a rename must update both the declaration and this table entry atomically. |
| `showSalezPane()` | — | Salez | Also declared writable in eslint.config.mjs globals. |
| `showNexlPane()` | — | Nexl | Also tracked as an unrelated no-undef ESLint-warning cleanup item at tools/SK8Lytz_Bucket_List.md:267 — that item is a lint-declaration fix, not a rename; do not conflate. |
| `click_switchTab_nexl` | — | nexl | FM-5 — no default: case exists in the delegator's switch(action) block, so a partial/non-atomic rename silently disables the NEXUZ tab button with zero console error. |

## Rename-Forbidden Identifiers (ADR decision D3)

| Pattern | Coupling Type | Reason | Evidence |
| --- | --- | --- | --- |
| `click_advancePrintStatus_*` | db_enum | Suffix is a literal Supabase print-job status enum value (Queued/Printing/Cleaned/Completed) passed directly as the argument to advancePrintStatus(status). | `assets/js/system-event-delegator.js:584`<br>`assets/js/system-event-delegator.js:587`<br>`assets/js/system-event-delegator.js:590`<br>`assets/js/system-event-delegator.js:593`<br>`index.html:2344-2347`<br>`assets/js/print-module.js:463` |
| `pipe-P-*` | db_enum | DOM id suffix mirrors the same print-job status enum; composed at runtime via 'pipe-P-' + job.status / 'pipe-P-' + s. | `index.html:2344-2347`<br>`assets/js/print-module.js:246`<br>`assets/js/print-module.js:272` |
| `batchezSopSort_*` | persistence | localStorage key suffix is the live product name; renaming the key prefix silently orphans every user's saved BATCHEZ SOP sort order with no migration path. | `assets/js/production-module.js:1677`<br>`assets/js/production-module.js:2847` |
| `batchezSopExpanded_*` | persistence | localStorage key suffix is a work-order group id; same silent-data-loss risk as batchezSopSort_*. | `assets/js/production-module.js:1691`<br>`assets/js/production-module.js:2857`<br>`assets/js/production-module.js:2861` |
| `layerzSopExpanded_*` | persistence | Same expand/collapse persistence pattern as batchezSopExpanded_*, scoped to the LAYERZ pane. | `assets/js/system-event-delegator.js:1401`<br>`assets/js/system-event-delegator.js:1405`<br>`assets/js/print-module.js:489` |
| `neoSelect_*` | persistence | D3-cited example — localStorage key suffix is a live <select> element's own DOM id; renaming the select silently wipes that user's saved dropdown value. | `assets/js/neogleamz-engine.js:1310`<br>`assets/js/neogleamz-engine.js:1317` |
| `neoResizer_*` | persistence | D3-cited example — localStorage key suffix is a sidebar/panel DOM id controlling saved drag-resize width/height. | `assets/js/neogleamz-engine.js:1204`<br>`assets/js/neogleamz-engine.js:1228`<br>`assets/js/neogleamz-engine.js:1240`<br>`assets/js/neogleamz-engine.js:1287` |
| `neogleamz_*` | persistence | D8 blanket policy — ALL existing localStorage keys are frozen regardless of prefix; this repo's oldest/most common prefix family (~11 keys observed) is captured as one wildcard entry rather than enumerated individually, consistent with this file's pattern-over-enumeration design. New keys must use sk8lytz_ instead (N5, Phase 2) — does not retroactively apply to these. | `assets/js/label-designer.js:21`<br>`index.html:4335`<br>`assets/js/packerz-module.js:3189`<br>`assets/js/inventory-module.js:168`<br>`assets/js/system-event-delegator.js:519`<br>`assets/js/system-tools-module.js:58`<br>`assets/js/system-tools-module.js:381` |

## Dynamic ID Allowlist Patterns (ADR decision D5, feeds Phase 2 N1)

| Pattern | Resolution Type | Note |
| --- | --- | --- |
| `paneSalez*` | runtime-concatenation | The ONLY hub pane-switcher using true concatenation. showProductionPane (paneProd*), showFulfillzPane (paneFulfillz*), and showNexlPane (paneNexl*) all use static lookup objects (index.html:5211, 5232, 5249) — their ids are literal string values, resolvable by exact match. Do not add paneProd*/paneNexl*/paneFulfillz* here; doing so would over-broaden N1 and mask genuine ghost ids in those functions. |
| `pipe-P-*` | runtime-concatenation | Evidence: assets/js/print-module.js:246,272 — see rename_forbidden.pipe-P-* |
| `packerz-card-*` | runtime-concatenation | Suffix is order.order_id. |
| `btnCompleteAssembly_*` | template-literal | Suffix is order_id; used as the target of window.executeWithButtonAction. |
| `sop-bc-*` | template-literal | Suffix is an incrementing barcodeIdx counter. |
| `ldProp[A-Z]` | runtime-concatenation | CORRECTED SCOPE: suffix is exactly one uppercase letter (key.toUpperCase().charAt(0)), not an arbitrary string. Use this narrower regex in Phase 2's N1, not a bare ldProp* wildcard, or it will mask real ghosts under the ldProp prefix. |
| `neoSelect_*` | template-literal | Evidence: assets/js/neogleamz-engine.js:1310,1317 — see rename_forbidden.neoSelect_* |
| `neoResizer_*` | template-literal | Evidence: assets/js/neogleamz-engine.js:1204,1228,1240,1287 — see rename_forbidden.neoResizer_* |

## localStorage Key Policy (ADR decisions D3/D8)

**Existing keys:** Frozen — rename-forbidden wholesale, no exceptions (D8).

**New keys:** Must use the sk8lytz_ prefix (D8, enforced by Phase 2's N5 check — new keys only, not retroactive).

**Observed legacy prefix families:**
- neogleamz_* (~11 keys, see rename_forbidden)
- neoSelect_*
- neoResizer_*
- batchezSopSort_* / batchezSopExpanded_* / layerzSopExpanded_*
- ~6 further hub-local state keys carrying no org prefix — already D8-conformant (no prefix was ever required retroactively), not enumerated here

## Legacy Term Watchlist (Phase 2 N4 input)

| Term | Match Scope | False-Positive Risk | Note |
| --- | --- | --- | --- |
| `Salez` | identifier-safe substring | low | No legitimate current identifier or label contains 'Salez'; safe for Phase 2 N4 substring scan. |
| `Nexl` | identifier-safe substring | low |  |
| `Salz` | identifier-safe substring | low | Distinct 4-letter legacy variant from 'Salez' — track separately, do not merge counts. |
| `Bridge` | identifier-context only | medium | 'Bridge' is also a plausible generic English word in comments/prose. N4 must scope matches to identifiers (DOM ids, function/variable names, delegator tokens), not free-text comments, or it will false-positive. |
| `Prod` | identifier-boundary only (e.g. paneProd*, ProdBuilder, camelCase 'Prod' segment) | HIGH | 'Prod' is a substring of legitimate, frequently-used words: 'Production', 'product', 'produce', 'productive'. A bare substring scan will flood N4 with false positives. Must use word/identifier-boundary matching (e.g. a regex anchored on a camelCase/PascalCase segment boundary), not a plain substring test. |

## Known Discrepancies / Forward Notes

**Legacy Term Occurrence Estimate:** ADR §1 (docs/architecture/nomenclature-audit-engine.md:16-17) cites 'Total drift: LARGE (150+ hard findings)'. This Phase 1 recon pass found ~28 active-code legacy-term text occurrences (Salez ~12, Nexl ~7, Salz ~4, Bridge ~3, Prod ~2 beyond the pane ids already modeled above). The 150+ figure also folds in the 87 ghost-DOM-lookup and 46 orphan-delegator-token counts (ADR line 16), which are Phase 2 scanner (N1/N2) findings, not raw legacy-term text matches. Sizing-context note for Phase 2/3 planning, not a Phase 1 scope change.

**Localstorage Brand Sweep Tension:** The epic's draft Phase 4 plan (docs/plans/nomenclature-audit-engine.md:217) proposes renaming neoSelect_${id} -> sk8lytzSelect_${id} as part of the brand sweep. This directly conflicts with D3/D8's 'existing localStorage keys are frozen, full stop' policy encoded above. Flagged for the Phase 4 planner to resolve explicitly (likely resolution: brand sweep touches comments/paths/script-tag urls only, not localStorage key prefixes) — not blocking for Phase 1, does not change this file.

---
For the full architectural Mermaid topology (modals, buttons, shared components), see
tools/SK8Lytz_App_Master_Reference.md §0 "Architectural Hierarchy Blueprint (IMMUTABLE)"
— the single canonical location per CLAUDE.md's Topological Integrity rule. Not duplicated
here; the prior hand-copied duplicate in this file had already drifted from the original
(see docs/plans/feat-nomenclature-registry-1.md §0.5) and is removed as part of this
regeneration rather than perpetuated.
