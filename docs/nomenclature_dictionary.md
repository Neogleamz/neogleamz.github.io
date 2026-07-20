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
| `theme` | persistence | Existing user-facing theme preference (light/dark), predates the sk8lytz_ prefix policy by several months. Renaming would silently reset every returning user's saved theme to default with no migration path. | `index.html:25`<br>`index.html:4261`<br>`index.html:4531` |
| `stockzLeftWidth` | persistence | Persists the user's drag-resized left-table flex-basis width in the STOCKPILEZ split-pane view. Renaming would silently collapse every returning user's customized column split back to the unstyled default on next load. | `index.html:4554`<br>`index.html:4599` |
| `stockzTopHeight` | persistence | Persists the user's drag-resized top-table height (px) in the STOCKPILEZ split-pane view, the vertical-resize counterpart to stockzLeftWidth. Renaming would silently reset every returning user's saved pane height with no migration path. | `index.html:4644`<br>`index.html:4683` |
| `NEOGLEAMZ_VER` | persistence | Stores the app version string from the user's last session, compared against the current build to fire the one-time 'System Updated: X ➝ Y' boot log. Renaming would silently orphan the old key so every existing user's browser re-reports as a fresh install, permanently losing the version-change detection for that session. | `index.html:4986`<br>`index.html:4991` |
| `neo_user_email` | persistence | Cached fallback email address used to attribute anonymous tip/feedback submissions to 'tipz' when the login form field is empty. Renaming would silently drop every returning user's cached identity back to the generic 'unknown_user' fallback. | `index.html:6972` |
| `barcodzGroupState` | persistence | JSON blob persisting which FULFILLZ → BARCODZ grid category groups (Retail Product / Sub-Assembly / Custom Labelz / 3D Print / Raw Material) a user left expanded vs. collapsed. Renaming would silently revert every returning user's saved expand/collapse layout to the all-collapsed default. | `assets/js/barcodz-module.js:126`<br>`assets/js/barcodz-module.js:184` |
| `recipeGroupState` | persistence | JSON blob persisting which MAKERZ → RECIPEZ builder category groups (cat-retail/cat-sub/cat-print/cat-raw) a user left expanded vs. collapsed — same expand/collapse persistence pattern as barcodzGroupState/fgiCategoryState/labelzGroupState, scoped to the recipe builder pane. Renaming would silently revert every returning user's saved layout to the hardcoded defaults. | `assets/js/bom-module.js:262`<br>`assets/js/bom-module.js:283` |
| `fgiCategoryState` | persistence | JSON blob persisting which STOCKPILEZ finished-goods-inventory (FGI) table category groups a user left expanded vs. collapsed — same expand/collapse persistence pattern as barcodzGroupState/recipeGroupState/labelzGroupState, scoped to the FGI table. Renaming would silently revert every returning user's saved layout to the all-expanded default. | `assets/js/inventory-module.js:27`<br>`assets/js/inventory-module.js:31` |
| `neoSnapshotLeftWidth` | persistence | Persists the user's drag-resized left-pane width (px) in the Snapshot Manager modal's list view — a distinct resizer/modal from stockzLeftWidth. Renaming would silently reset every returning user's saved modal layout to default width. | `assets/js/inventory-module.js:872`<br>`assets/js/inventory-module.js:910` |
| `labelzGroupState` | persistence | JSON blob persisting which FULFILLZ → LABELZ grid category groups a user left expanded vs. collapsed — same expand/collapse persistence pattern as barcodzGroupState/recipeGroupState/fgiCategoryState, scoped to the labelz grid. Renaming would silently revert every returning user's saved layout to the all-collapsed default. | `assets/js/labelz-module.js:215`<br>`assets/js/labelz-module.js:306` |
| `statImpzSyncs` | persistence | Persisted sync counter displayed as the 'Vault Ingestionz' KPI stat on the NEXUZ → IMPORTZ pane. The value already lives in returning users' browsers from prior sessions; renaming would silently zero out their displayed sync count with no migration path. | `assets/js/neogleamz-engine.js:1010` |
| `lastBrainSync` | persistence | Persisted epoch-ms timestamp used to compute the 'Xm ago' last-sync display on the NEXUZ → BRAINZ pane. Renaming would silently reset every returning user's display back to 'NEVER' even though a real prior sync exists. | `assets/js/neogleamz-engine.js:1096` |

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
| `stockzAuditBtn_*` | template-literal | 3 static tab-button ids (stockzAuditBtn_audit, stockzAuditBtn_planning, stockzAuditBtn_history); read via `stockzAuditBtn_${t}` in assets/js/inventory-module.js:2990,3014,3027. |
| `stockzAuditTab_*` | template-literal | 3 static tab-pane ids (stockzAuditTab_audit, stockzAuditTab_planning, stockzAuditTab_history); read via `stockzAuditTab_${t}` in assets/js/inventory-module.js:3011,3022. |
| `sect-P-*` | runtime-concatenation | Print-job-status pipeline section-container counterpart to pipe-P-* — same status enum (Queued/Printing/Cleaned/Completed), different DOM role: pipe-P-* is the tab pill, sect-P-* is the content section. Composed at runtime via 'sect-P-' + s / 'sect-P-' + job.status, NOT a template literal — corrected from the initial task assumption after verifying assets/js/print-module.js:247,273. |
| `sect-*` | runtime-concatenation | WARNING: this is a DIFFERENT enum from sect-P-* — this is the work-order status pipeline (Queued/Picking/Production/Completed), not the print-job status enum. Do not merge/confuse the two patterns. Composed at runtime via 'sect-' + s, NOT a template literal — corrected from the initial task assumption after verifying assets/js/production-module.js:1479. |
| `inlineSopQA_*` | runtime-concatenation | Dormant planned feature, not dead code. Reader window.inlineRenderTelemetryPreview (production-module.js:2900-2904, guarded via ?. and if(!previewContainer) return;) is invoked from assets/js/packerz-module.js:2082-2083, gated on window.activeSOPTextAreaId.startsWith('inlineSopQA_'). That flag is set generically by the live, delegator-wired window.click_openSOPSnapshotCamera_inlineProduction (production-module.js:2704-2709) from a clicked button's data-textid attribute. The intended producer markup (a button with data-textid="inlineSopQA_${grp.id}" paired with a matching <textarea id>) exists only in scripts/archive/compact_batchez_buttons.py:10 and scripts/archive/patch_production_module.py:61 — never merged into the live production-module.js template. Zero crash risk; do not delete, this is unfinished-feature scaffolding, not an orphan. |
| `inlineSopQAPreview_*` | runtime-concatenation | Companion preview-container id to inlineSopQA_* — same dormant-feature story, same reader (inlineRenderTelemetryPreview), same guard (if(!previewContainer) return; at production-module.js:2904). See inlineSopQA_* note for the full call-chain trace. |
| `packerzSopEditorArea` | js-variable-literal | Real, live producer. buildUnifiedSopLayoutHTML (system-tools-module.js:2634-2775, called live from production-module.js's renderMasterSOP via the real 'PACKERZ SOP EDITOR'/'BATCHEZ SOP EDITOR' buttons) assigns rowsWrapperId = sopType==='packerz' ? 'packerzSopEditorArea' : 'sopMasterEditorArea' (a closed 2-value ternary, not a suffix/prefix pattern) then interpolates it as id="${rowsWrapperId}" with zero static prefix before '${' — the scanner's RE_ID_ATTR_TEMPLATE requires a non-empty prefix, so this producer is architecturally invisible to static scanning, not merely unreached. Read live at packerz-module.js:1478 inside addPackerzSOPRow. Not a wildcard/suffix family; exact-match pattern (no trailing '*') resolves via nomenclature-audit.js's compilePatterns exact-match branch. |
| `productionAdminQA` | js-variable-literal | Real, live producer — same buildUnifiedSopLayoutHTML mechanism as packerzSopEditorArea (unconditional literal this time, not a ternary: qaTextareaId = 'productionAdminQA'). Read live at production-module.js:462 (saveMasterSOP) and production-module.js:2779 (renderProductionTelemetryPreview, invoked from live renderMasterSOP:302). Exact-match pattern, not a wildcard family. |
| `productionAdminQAPreview` | js-variable-literal | Companion preview-container id to productionAdminQA — same producer, same call chain. Read live at production-module.js:2780 inside renderProductionTelemetryPreview. |
| `regex(OrderNum|OrderDate|OrderTotal|LineItemNum|ItemName|Quantity|UnitPrice|Specs|ParcelNum|ActualPaid|ChargeableWeight|FeeStructure|DeductionStructure|ParcelLineItemNum|ParcelItemName|ParcelQuantity|ParcelSpecs)` | js-variable-literal | Family entry covering 17 verified-real field ids rendered by openGlobalRegexPlayground's per-field forEach loop (system-tools-module.js:1980-1993) — each field object's .id property is interpolated as id="${f.id}" with zero static prefix before '${', identical scanner-blind-spot mechanism to Batch 6's packerzSopEditorArea/productionAdminQA (ternary-sourced bare variable) but here sourced from a config-array iteration instead of a ternary. Two fields sharing an EXTRACTOR_CONFIGS field-array slot with identical .id string across both 'orders' and 'parcels' configs (regexFeeStructure) are covered once, not twice. Deliberately EXCLUDES regexPostage/regexMakeup/btnDeleteParcelPreset/btnOverwriteParcelPreset (confirmed zero real producer, tied to live bugs — see docs/plans/debt-nomenclature-remediation-7.md §1.2/§6, NOT allowlisted) and regexSecondaryFee/regexGroupWeight (real producers, but currently zero getElementById lookups exist for them anywhere, so no finding exists to allowlist — would need a fresh entry only if a future lookup is added) and the 4 readonly-type fields regexAlibabaOrder/regexChinaLanded/regexTotalDistWeight/regexUnitWeight (readonly branch, system-tools-module.js:1987-1988, renders no id= attribute at all — not producers). |
| `(liveRegexPlaygroundPayload|regexPresetSelect|liveRegexSearchBox|liveParcelRegexPlaygroundPayload|parcelPresetSelect|liveParcelRegexSearchBox)` | js-variable-literal | Family entry covering the 6 verified-real conf-object-level ids (not per-field) — same zero-prefix template-interpolation mechanism as the field family above, but sourced from top-level EXTRACTOR_CONFIGS[type] string properties (conf.livePlaygroundPayloadId etc.) rather than a per-field forEach. All 6 confirmed read-correctly by their respective functions (toggleRawOrderView/toggleRawParcelView, evaluateAllRegex/evaluateAllParcelRegex, restoreDefaultParserRules/restoreDefaultParcelRules, loadSelectedRegexPreset/loadSelectedParcelRegexPreset) — zero bugs in this family, unlike the field-id readers. |

## localStorage Key Policy (ADR decisions D3/D8)

**Existing keys:** Frozen — rename-forbidden wholesale, no exceptions (D8).

**New keys:** Must use the sk8lytz_ prefix (D8, enforced by Phase 2's N5 check — new keys only, not retroactive).

**Observed legacy prefix families:**
- neogleamz_* (~11 keys, see rename_forbidden)
- neoSelect_*
- neoResizer_*
- batchezSopSort_* / batchezSopExpanded_* / layerzSopExpanded_*
- theme, stockzLeftWidth, stockzTopHeight, NEOGLEAMZ_VER, neo_user_email, barcodzGroupState, recipeGroupState, fgiCategoryState, neoSnapshotLeftWidth, labelzGroupState, statImpzSyncs, lastBrainSync — 12 further hub-local state keys carrying no org prefix, already D8-conformant (no prefix was ever required retroactively), individually enumerated in rename_forbidden

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
