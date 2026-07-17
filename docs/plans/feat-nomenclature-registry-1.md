# Implementation Plan: Canonical Nomenclature Registry (Phase 1)

**Branch:** `feat/nomenclature-registry`
**Ledger item:** `tools/SK8Lytz_Bucket_List.md:33` → Epic "Nomenclature Audit Engine" → Phase 1 (P2)
**Related docs:** [docs/architecture/nomenclature-audit-engine.md](../architecture/nomenclature-audit-engine.md) (ADR, decisions D1–D9) · [docs/plans/nomenclature-audit-engine.md](nomenclature-audit-engine.md) (epic-level draft plan, lines 91–146 — this document supersedes that section)
**Author:** implementation-planner subagent
**Status:** Awaiting user approval (CLAUDE.md "Planning bypass override" forbids skipping the halt-for-approval gate for any Bucket List task)

---

## 0. Critical Corrections & Verified Findings (read first)

Per CLAUDE.md's anti-hallucination protocol ("verify payloads/schemas/UI labels against the Master Reference... if the Reference contradicts live code, HALT and ask"), every identifier below was re-verified against live `index.html`/`assets/js/*.js` via direct grep/read, not assumed from the touch-point inventory. Several findings go beyond what the inventory flagged and materially change what this task must write.

### 0.1 CRITICAL — Both nomenclature docs' "DOM ID (Legacy)" hub-tab column is entirely fictional
`tools/SK8Lytz_App_Master_Reference.md:10-17` **and** `docs/nomenclature_dictionary.md:6-11` both carry a table column listing `invhub-tab`, `prodhub-tab`, `fulfillzhub-tab`, `salezhub-tab`, `socialzhub-tab`, `synchub-tab` as the "legacy" DOM ids for the 6 hub tabs.

**Proof these do not exist:** repo-wide grep for `invhub|prodhub|salezhub|fulfillzhub-tab|synchub|socialzhub` returns zero hits in `index.html` or any `assets/js/*.js` file — only in documentation (both nomenclature docs) and stale `.agents/` handoff files. The real, live tab-content container ids are:

| Hub | Real live `id` | Verified at |
|---|---|---|
| STOCKPILEZ | `stockpilez-tab` | index.html:1956 |
| MAKERZ | `makerz-tab` | index.html:2077 |
| REVENUEZ | `revenuez-tab` | index.html:2406 |
| FULFILLZ | `fulfillz-tab` | index.html:2596 |
| NEXUZ | `nexuz-tab` | index.html:2954 |
| SOCIALZ | `socialz-tab` | index.html:3354 |

These are already fully canonical (no legacy term embedded) and are exactly the ids used correctly in both docs' own Mermaid diagrams (Master Reference §0 line 36 `Stockpilez[...DOM: stockpilez-tab]`, dictionary line 28 same) — meaning **each doc already internally contradicts its own table vs. its own diagram**. This is precisely the "dictionary is provably stale" failure mode D1 was written to fix (ADR §4 D1 cites this exact `invhub-tab` example). The registry and both docs must be corrected, not perpetuated. This is flagged as **Ratification Gate item #1** below (§6) rather than silently fixed, per the HALT-and-ask directive, even though the evidence is unambiguous.

### 0.2 Master Reference §6B NEXUZ subsection cites 3 pane ids that don't exist in code either
`tools/SK8Lytz_App_Master_Reference.md:562,564,566` use `paneNexuzBrainz`, `paneNexuzImportz`, `paneNexuzSalez`. Grep confirms these strings appear **nowhere** in `index.html`/`assets/js/*`. The real ids — matching the touch-point inventory, the same file's own §0 Mermaid diagram (line 142-144), and `docs/nomenclature_dictionary.md`'s diagram (line 133-135) — are `paneNexlBrainz` (index.html:3212), `paneNexlImportz` (index.html:2995), `paneNexlSalez` (index.html:3074). This is a doc-only bug, not a legacy alias that ever existed in code; §5 below corrects it.

### 0.3 FM-2 scope correction — only `paneSalez*` uses true runtime concatenation
The ADR (FM-2) cites `'paneSalez' + paneId.charAt(0).toUpperCase()…` (index.html:5196) as evidence for the `paneSalez*` dynamic-id-allowlist entry. Re-reading the three sibling pane-switcher functions (index.html:5205-5256) shows they do **not** follow the same pattern:
- `showProductionPane()` (index.html:5211): `const mapping = { 'builder': 'paneProdBuilder', 'production': 'paneProdControl', 'print': 'paneProdPrint' };` — a **static lookup object**, not concatenation.
- `showFulfillzPane()` (index.html:5232): same static-mapping idiom.
- `showNexlPane()` (index.html:5249): `const mapping = { 'importz': 'paneNexlImportz', 'salez': 'paneNexlSalez', 'brainz': 'paneNexlBrainz' };` — also a static lookup object.

Only `showSalezPane()` composes the id at runtime via string concatenation. This matters because the dynamic-id-allowlist (used by Phase 2's N1 ghost-lookup scanner) exists specifically to keep the scanner from false-flagging ids it can't find via literal string match. Adding `paneProd*`/`paneNexl*`/`paneFulfillz*` to that allowlist would be unnecessary **and would reduce N1's precision** by widening the wildcard match past ids that are, in fact, perfectly literal-matchable. The registry in §3 reflects this correction: `paneSalez*` is the only pane-switcher wildcard entry.

### 0.4 `ldProp*` is narrower than a bare wildcard
`assets/js/label-designer.js:514`: `document.getElementById('ldProp' + key.toUpperCase().charAt(0))`. The suffix is **exactly one uppercase letter** (`.charAt(0)` truncates), not an arbitrary string. The registry allowlist entry is written as `ldProp[A-Z]` rather than `ldProp*` so Phase 2's N1 doesn't accidentally swallow unrelated ghosts that happen to start with `ldProp`.

### 0.5 `docs/nomenclature_dictionary.md` already exists and has already independently drifted
This file is **not new** — it was relocated from the repo root by a prior, already-completed task (`debt/documentation-consolidation`, see `docs/plans/debt-documentation-consolidation.md`) and is linked from Master Reference §8 (line 863). It is currently a hand-copied near-duplicate of Master Reference §0, and the two copies have **already diverged**: the dictionary's line 33 reads `Cycle Count Manager Modal<br>Btn: 🔄 CYCLE COUNTS` while the Master Reference's own copy (line 41) reads `Inventory Audit & Planning Console Modal<br>Btn: 📦 CYCLE COUNTS`; the dictionary is also missing the `RecipeSearchFilter` node the Master Reference has (line 61). This is a live, in-repo demonstration of exactly the anti-pattern D1 exists to kill. This task **overwrites** the file's content via a generator (§4), it does not hand-edit it again.

### 0.6 The 150+ vs. ~28 legacy-term discrepancy
The ADR (§1) states "Total drift: LARGE (150+ hard findings)." The touch-point inventory's L5 recon found only ~28 active-code legacy-term text occurrences (`Salez`~12, `Nexl`~7, `Salz`~4, `Bridge`~3, `Prod`~2 beyond the 9 pane ids already modeled). The 150+ figure also folds in the ADR's own separately-cited 87 ghost-DOM-lookup and 46 orphan-delegator-token counts (ADR §1, lines 16), which are **Phase 2 scanner (N1/N2) findings**, not raw legacy-term text matches. This is a sizing-context note for Phase 2/3 estimation, not a Phase 1 scope change — captured in the registry's `known_discrepancies` block (§3) so it isn't lost.

### 0.7 Forward-looking tension flagged (non-blocking)
The epic's draft Phase 4 plan (`docs/plans/nomenclature-audit-engine.md:217`) proposes `neoSelect_${id}` → `sk8lytzSelect_${id}` as part of the brand sweep — this directly conflicts with D3/D8's "existing localStorage keys are frozen, full stop" policy. Not this phase's problem to resolve, but captured in the registry's `known_discrepancies` block so Phase 4's planner inherits the context instead of re-discovering the conflict.

---

## 1. Objective

Produce the single machine-readable naming authority (`tools/nomenclature-registry.json`), regenerate its human-readable view (`docs/nomenclature_dictionary.md`) from it instead of by hand, and sync `tools/SK8Lytz_App_Master_Reference.md` to link to (not restate) that authority — per ADR decision D1. Zero runtime browser code is touched; the only new code is a small Node build-time generator script.

---

## 2. Design Principle: patterns over exhaustive enumeration

`tools/nomenclature-registry.json` stores **patterns and documented exceptions** (canonical names, legacy-alias notes, rename-forbidden families, dynamic-id allowlist regex), not an exhaustive per-occurrence catalog of the ~564 delegator tokens, ~87 ghost lookups, or ~28 legacy-term text hits already sized by recon. Exhaustive occurrence-level findings are Phase 2 scanner (N1–N7) output, written to `scripts/nomenclature-baseline.json`, not this file (ADR D5: "central list is reviewable" — an exhaustive dump defeats that). This keeps the registry small, diffable, and human-reviewable, matching this repo's existing `xss-audit.js` culture of small rule files + generated reports.

---

## 3. Deliverable A — `tools/nomenclature-registry.json` (NEW)

Full content to write, verbatim (implementer: transcribe this JSON, do not re-derive):

```json
{
  "$schema_version": "1.0.0",
  "meta": {
    "purpose": "Single machine-readable naming authority for Neogleamz OS (ADR: docs/architecture/nomenclature-audit-engine.md). Consumed by scripts/generate-nomenclature-dictionary.js (Phase 1) and scripts/nomenclature-audit.js (Phase 2, N1-N7 checks).",
    "adr_ref": "docs/architecture/nomenclature-audit-engine.md",
    "phase1_plan_ref": "docs/plans/feat-nomenclature-registry-1.md",
    "generated_dictionary": "docs/nomenclature_dictionary.md",
    "generator_script": "scripts/generate-nomenclature-dictionary.js",
    "ratified_via": "Whiteboard session 2026-07-17 (D1-D9) + Phase 1 plan HALT-approval",
    "ratified_date": "2026-07-17",
    "design_principle": "This file stores PATTERNS and DOCUMENTED EXCEPTIONS, not an exhaustive per-identifier catalog of the ~564 delegator tokens / ~87 ghost lookups already inventoried by the epic's recon pass. Exhaustive occurrence-level findings are Phase 2 scanner (N1-N7) output, written to scripts/nomenclature-baseline.json, not this file (D5).",
    "corrections_applied_2026_07_17": [
      "tools/SK8Lytz_App_Master_Reference.md §0 and docs/nomenclature_dictionary.md both listed a 'DOM ID (Legacy)' column with values (invhub-tab, prodhub-tab, fulfillzhub-tab, salezhub-tab, socialzhub-tab, synchub-tab) that do not exist anywhere in index.html or assets/js/*.js (verified via repo-wide grep, zero code hits, doc-only). Corrected to the real live tab-content ids below, confirmed at index.html:1956,2077,2406,2596,2954,3354.",
      "tools/SK8Lytz_App_Master_Reference.md §6B NEXUZ subsection referenced 'paneNexuzBrainz'/'paneNexuzImportz'/'paneNexuzSalez' — these ids do not exist in code either. Corrected to the real 'paneNexlBrainz'/'paneNexlImportz'/'paneNexlSalez' (index.html:3212,2995,3074), matching the ids already used correctly in both docs' own Mermaid diagrams."
    ]
  },
  "hubs": {
    "STOCKPILEZ": {
      "emoji": "📊",
      "tab_content_dom_id": "stockpilez-tab",
      "tab_button_token": "click_switchTab_stockpilez",
      "modules": ["inventory-module.js", "bom-module.js"],
      "panes": {
        "paneInventory": { "canonical_label": "STOCKZ", "embedded_legacy_terms": [], "rename_status": "canonical" },
        "panePipeline": { "canonical_label": "DATAZ", "embedded_legacy_terms": [], "rename_status": "canonical" },
        "paneSimple": { "canonical_label": "EDITZ", "embedded_legacy_terms": [], "rename_status": "canonical" }
      }
    },
    "MAKERZ": {
      "emoji": "🏭",
      "tab_content_dom_id": "makerz-tab",
      "tab_button_token": "click_switchTab_makerz",
      "modules": ["production-module.js", "barcodz-module.js"],
      "panes": {
        "paneProdBuilder": { "canonical_label": "RECIPEZ", "embedded_legacy_terms": ["Prod"], "rename_status": "documented-alias-do-not-rename", "note": "Selected via static lookup object index.html:5211 (literal-matchable, not concatenation)." },
        "paneProdControl": { "canonical_label": "BATCHEZ", "embedded_legacy_terms": ["Prod"], "rename_status": "documented-alias-do-not-rename" },
        "paneProdPrint": { "canonical_label": "LAYERZ", "embedded_legacy_terms": ["Prod"], "rename_status": "documented-alias-do-not-rename" }
      }
    },
    "FULFILLZ": {
      "emoji": "📦",
      "tab_content_dom_id": "fulfillz-tab",
      "tab_button_token": "click_switchTab_fulfillz",
      "modules": ["packerz-module.js", "print-module.js", "labelz-module.js"],
      "panes": {
        "paneFulfillzPackerz": { "canonical_label": "PACKERZ", "embedded_legacy_terms": [], "rename_status": "canonical" },
        "paneFulfillzBarcodz": { "canonical_label": "BARCODZ", "embedded_legacy_terms": [], "rename_status": "canonical" },
        "paneFulfillzLabelz": { "canonical_label": "LABELZ", "embedded_legacy_terms": [], "rename_status": "canonical" }
      }
    },
    "REVENUEZ": {
      "emoji": "🛒",
      "tab_content_dom_id": "revenuez-tab",
      "tab_button_token": "click_switchTab_revenuez",
      "modules": ["sales-module.js", "ceo-module.js"],
      "panes": {
        "paneSalezBridge": { "canonical_label": "ORDERZ", "embedded_legacy_terms": ["Salez", "Bridge"], "rename_status": "documented-alias-do-not-rename", "note": "Selected via runtime string concatenation index.html:5196 — see dynamic_id_allowlist 'paneSalez*'." },
        "paneSalezAnalyticz": { "canonical_label": "STATZ", "embedded_legacy_terms": ["Salez"], "rename_status": "documented-alias-do-not-rename" },
        "paneSalezCommandz": { "canonical_label": "SIMULATORZ", "embedded_legacy_terms": ["Salez"], "rename_status": "documented-alias-do-not-rename" }
      }
    },
    "SOCIALZ": {
      "emoji": "👥",
      "tab_content_dom_id": "socialz-tab",
      "tab_button_token": "click_switchTab_socialz",
      "modules": ["socialz-module.js"],
      "panes": {
        "paneSocialzRoster": { "canonical_label": "ROSTER", "embedded_legacy_terms": [], "rename_status": "canonical" }
      }
    },
    "NEXUZ": {
      "emoji": "⚡",
      "tab_content_dom_id": "nexuz-tab",
      "tab_button_token": "click_switchTab_nexl",
      "tab_button_token_status": "documented-alias-do-not-rename",
      "tab_button_token_note": "Token name carries a stale 'nexl' term though behavior is correct (routes to switchTab('nexuz')). See legacy_token_aliases.click_switchTab_nexl. FM-5: any rename requires an atomic single-commit edit of both the emitter (index.html:1931) and the delegator case (system-event-delegator.js:83) — the switch(action) block has no default: case, so a partial rename silently disables the button.",
      "modules": ["system-tools-module.js", "task-engine.js"],
      "panes": {
        "paneNexlImportz": { "canonical_label": "IMPORTZ", "embedded_legacy_terms": ["Nexl"], "rename_status": "documented-alias-do-not-rename", "note": "Selected via static lookup object index.html:5249 (literal-matchable, not concatenation)." },
        "paneNexlSalez": { "canonical_label": "SALEZ", "embedded_legacy_terms": ["Nexl"], "rename_status": "documented-alias-do-not-rename" },
        "paneNexlBrainz": { "canonical_label": "BRAINZ", "embedded_legacy_terms": ["Nexl"], "rename_status": "documented-alias-do-not-rename" }
      }
    }
  },
  "legacy_function_aliases": {
    "syncSalezStats": { "file": "assets/js/neogleamz-engine.js", "lines": [1062, 1119], "embedded_legacy_terms": ["Salez"], "rename_status": "documented-alias-do-not-rename", "note": "Referenced by name inside a function-pointer table entry {name:'SALEZ', func: syncSalezStats} (line 1119) — a rename must update both the declaration and this table entry atomically." },
    "showSalezPane": { "file": "index.html", "lines": [5190], "embedded_legacy_terms": ["Salez"], "rename_status": "documented-alias-do-not-rename", "related_tokens": ["click_showSalezPane_bridge", "click_showSalezPane_analyticz", "click_showSalezPane_commandz"], "note": "Also declared writable in eslint.config.mjs globals." },
    "showNexlPane": { "file": "index.html", "lines": [5243], "embedded_legacy_terms": ["Nexl"], "rename_status": "documented-alias-do-not-rename", "related_tokens": ["click_showNexlPane_importz", "click_showNexlPane_salez", "click_showNexlPane_brainz"], "note": "Also tracked as an unrelated no-undef ESLint-warning cleanup item at tools/SK8Lytz_Bucket_List.md:267 — that item is a lint-declaration fix, not a rename; do not conflate." }
  },
  "legacy_token_aliases": {
    "click_switchTab_nexl": {
      "emitter_file": "index.html",
      "emitter_line": 1931,
      "handler_file": "assets/js/system-event-delegator.js",
      "handler_line": 83,
      "handler_calls": "switchTab('nexuz')",
      "embedded_legacy_terms": ["nexl"],
      "rename_status": "documented-alias-do-not-rename",
      "risk": "FM-5 — no default: case exists in the delegator's switch(action) block, so a partial/non-atomic rename silently disables the NEXUZ tab button with zero console error."
    }
  },
  "rename_forbidden": {
    "click_advancePrintStatus_*": {
      "coupling_type": "db_enum",
      "reason": "Suffix is a literal Supabase print-job status enum value (Queued/Printing/Cleaned/Completed) passed directly as the argument to advancePrintStatus(status).",
      "evidence": ["assets/js/system-event-delegator.js:584", "assets/js/system-event-delegator.js:587", "assets/js/system-event-delegator.js:590", "assets/js/system-event-delegator.js:593", "index.html:2344-2347", "assets/js/print-module.js:463"]
    },
    "pipe-P-*": {
      "coupling_type": "db_enum",
      "reason": "DOM id suffix mirrors the same print-job status enum; composed at runtime via 'pipe-P-' + job.status / 'pipe-P-' + s.",
      "evidence": ["index.html:2344-2347", "assets/js/print-module.js:246", "assets/js/print-module.js:272"],
      "cross_ref": "dynamic_id_allowlist"
    },
    "batchezSopSort_*": {
      "coupling_type": "persistence",
      "reason": "localStorage key suffix is the live product name; renaming the key prefix silently orphans every user's saved BATCHEZ SOP sort order with no migration path.",
      "evidence": ["assets/js/production-module.js:1677", "assets/js/production-module.js:2847"]
    },
    "batchezSopExpanded_*": {
      "coupling_type": "persistence",
      "reason": "localStorage key suffix is a work-order group id; same silent-data-loss risk as batchezSopSort_*.",
      "evidence": ["assets/js/production-module.js:1691", "assets/js/production-module.js:2857", "assets/js/production-module.js:2861"]
    },
    "layerzSopExpanded_*": {
      "coupling_type": "persistence",
      "reason": "Same expand/collapse persistence pattern as batchezSopExpanded_*, scoped to the LAYERZ pane.",
      "evidence": ["assets/js/system-event-delegator.js:1401", "assets/js/system-event-delegator.js:1405", "assets/js/print-module.js:489"]
    },
    "neoSelect_*": {
      "coupling_type": "persistence",
      "reason": "D3-cited example — localStorage key suffix is a live <select> element's own DOM id; renaming the select silently wipes that user's saved dropdown value.",
      "evidence": ["assets/js/neogleamz-engine.js:1310", "assets/js/neogleamz-engine.js:1317"]
    },
    "neoResizer_*": {
      "coupling_type": "persistence",
      "reason": "D3-cited example — localStorage key suffix is a sidebar/panel DOM id controlling saved drag-resize width/height.",
      "evidence": ["assets/js/neogleamz-engine.js:1204", "assets/js/neogleamz-engine.js:1228", "assets/js/neogleamz-engine.js:1240", "assets/js/neogleamz-engine.js:1287"]
    },
    "neogleamz_*": {
      "coupling_type": "persistence",
      "reason": "D8 blanket policy — ALL existing localStorage keys are frozen regardless of prefix; this repo's oldest/most common prefix family (~11 keys observed) is captured as one wildcard entry rather than enumerated individually, consistent with this file's pattern-over-enumeration design. New keys must use sk8lytz_ instead (N5, Phase 2) — does not retroactively apply to these.",
      "evidence": ["assets/js/label-designer.js:21", "index.html:4335", "assets/js/packerz-module.js:3189", "assets/js/inventory-module.js:168", "assets/js/system-event-delegator.js:519", "assets/js/system-tools-module.js:58", "assets/js/system-tools-module.js:381"]
    }
  },
  "dynamic_id_allowlist": [
    { "pattern": "paneSalez*", "resolution_type": "runtime-concatenation", "evidence": "index.html:5196 — 'paneSalez' + paneId.charAt(0).toUpperCase() + paneId.slice(1)", "note": "The ONLY hub pane-switcher using true concatenation. showProductionPane (paneProd*), showFulfillzPane (paneFulfillz*), and showNexlPane (paneNexl*) all use static lookup objects (index.html:5211, 5232, 5249) — their ids are literal string values, resolvable by exact match. Do not add paneProd*/paneNexl*/paneFulfillz* here; doing so would over-broaden N1 and mask genuine ghost ids in those functions." },
    { "pattern": "pipe-P-*", "resolution_type": "runtime-concatenation", "evidence": "assets/js/print-module.js:246,272", "cross_ref": "rename_forbidden.pipe-P-*" },
    { "pattern": "packerz-card-*", "resolution_type": "runtime-concatenation", "evidence": "assets/js/packerz-module.js:154,340", "note": "Suffix is order.order_id." },
    { "pattern": "btnCompleteAssembly_*", "resolution_type": "template-literal", "evidence": "assets/js/packerz-module.js:409,434,1264,1290", "note": "Suffix is order_id; used as the target of window.executeWithButtonAction." },
    { "pattern": "sop-bc-*", "resolution_type": "template-literal", "evidence": "assets/js/packerz-module.js:1595,1636", "note": "Suffix is an incrementing barcodeIdx counter." },
    { "pattern": "ldProp[A-Z]", "resolution_type": "runtime-concatenation", "evidence": "assets/js/label-designer.js:514", "note": "CORRECTED SCOPE: suffix is exactly one uppercase letter (key.toUpperCase().charAt(0)), not an arbitrary string. Use this narrower regex in Phase 2's N1, not a bare ldProp* wildcard, or it will mask real ghosts under the ldProp prefix." },
    { "pattern": "neoSelect_*", "resolution_type": "template-literal", "evidence": "assets/js/neogleamz-engine.js:1310,1317", "cross_ref": "rename_forbidden.neoSelect_*" },
    { "pattern": "neoResizer_*", "resolution_type": "template-literal", "evidence": "assets/js/neogleamz-engine.js:1204,1228,1240,1287", "cross_ref": "rename_forbidden.neoResizer_*" }
  ],
  "localstorage_policy": {
    "existing_keys": "Frozen — rename-forbidden wholesale, no exceptions (D8).",
    "new_keys": "Must use the sk8lytz_ prefix (D8, enforced by Phase 2's N5 check — new keys only, not retroactive).",
    "observed_legacy_prefix_families": ["neogleamz_* (~11 keys, see rename_forbidden)", "neoSelect_*", "neoResizer_*", "batchezSopSort_* / batchezSopExpanded_* / layerzSopExpanded_*", "~6 further hub-local state keys carrying no org prefix — already D8-conformant (no prefix was ever required retroactively), not enumerated here"]
  },
  "legacy_term_watchlist": [
    { "term": "Salez", "match_scope": "identifier-safe substring", "false_positive_risk": "low", "note": "No legitimate current identifier or label contains 'Salez'; safe for Phase 2 N4 substring scan." },
    { "term": "Nexl", "match_scope": "identifier-safe substring", "false_positive_risk": "low" },
    { "term": "Salz", "match_scope": "identifier-safe substring", "false_positive_risk": "low", "note": "Distinct 4-letter legacy variant from 'Salez' — track separately, do not merge counts." },
    { "term": "Bridge", "match_scope": "identifier-context only", "false_positive_risk": "medium", "note": "'Bridge' is also a plausible generic English word in comments/prose. N4 must scope matches to identifiers (DOM ids, function/variable names, delegator tokens), not free-text comments, or it will false-positive." },
    { "term": "Prod", "match_scope": "identifier-boundary only (e.g. paneProd*, ProdBuilder, camelCase 'Prod' segment)", "false_positive_risk": "HIGH", "note": "'Prod' is a substring of legitimate, frequently-used words: 'Production', 'product', 'produce', 'productive'. A bare substring scan will flood N4 with false positives. Must use word/identifier-boundary matching (e.g. a regex anchored on a camelCase/PascalCase segment boundary), not a plain substring test." }
  ],
  "known_discrepancies": {
    "legacy_term_occurrence_estimate": "ADR §1 (docs/architecture/nomenclature-audit-engine.md:16-17) cites 'Total drift: LARGE (150+ hard findings)'. This Phase 1 recon pass found ~28 active-code legacy-term text occurrences (Salez ~12, Nexl ~7, Salz ~4, Bridge ~3, Prod ~2 beyond the pane ids already modeled above). The 150+ figure also folds in the 87 ghost-DOM-lookup and 46 orphan-delegator-token counts (ADR line 16), which are Phase 2 scanner (N1/N2) findings, not raw legacy-term text matches. Sizing-context note for Phase 2/3 planning, not a Phase 1 scope change.",
    "localstorage_brand_sweep_tension": "The epic's draft Phase 4 plan (docs/plans/nomenclature-audit-engine.md:217) proposes renaming neoSelect_${id} -> sk8lytzSelect_${id} as part of the brand sweep. This directly conflicts with D3/D8's 'existing localStorage keys are frozen, full stop' policy encoded above. Flagged for the Phase 4 planner to resolve explicitly (likely resolution: brand sweep touches comments/paths/script-tag urls only, not localStorage key prefixes) — not blocking for Phase 1, does not change this file."
  }
}
```

---

## 4. Deliverable B — `docs/nomenclature_dictionary.md` regeneration

### 4.1 Generation approach: standalone one-off Node script now, not hand-typed prose

**Decision:** write `scripts/generate-nomenclature-dictionary.js` in this phase (small, single-purpose: read the registry JSON, emit the markdown). **Not** deferred entirely to Phase 2, and **not** hand-typed.

**Justification:** ADR D1 explicitly states "`docs/nomenclature_dictionary.md` becomes generated output" and N7 (registry↔docs sync) is a **blocking** check from day one — the dictionary must never again be a manually-maintained document, because §0.5 above just proved that exact anti-pattern is live in the repo today. Hand-typing it "one more time" would recreate the very drift this epic exists to eliminate. However, the *full* N1–N7 scanner (ghost-lookup resolution, orphan-token detection, baseline mechanics) is legitimately deferred to Phase 2 — it requires whole-codebase regex walking that this phase doesn't need. A dictionary generator only needs to read one JSON file and print markdown, which is a much smaller, self-contained task appropriate for Phase 1. Phase 2's `scripts/nomenclature-audit.js` can later import this script's render function or absorb it behind a `--generate-dict` flag — that wiring decision is left to the Phase 2 planner, not fixed here.

### 4.2 Script contract (design spec — implementer writes the actual code)

- Location: `scripts/generate-nomenclature-dictionary.js` (covered by the existing `scripts/**` eslint ignore — no lint config changes needed).
- Runtime: plain Node, CommonJS (matches `package.json`'s `"type": "commonjs"`), zero new dependencies — `fs`/`path` only, mirroring `scripts/xss-audit.js` and `scripts/bump-system-version.js` conventions.
- No `var`; `const`/`let` only.
- Input: reads and `JSON.parse`s `tools/nomenclature-registry.json`.
- Output: writes `docs/nomenclature_dictionary.md`, overwriting the existing file.
- **No wall-clock timestamp in the output.** Deriving the "as of" date from `meta.ratified_date` in the registry (not `Date.now()`) keeps re-runs with no data change producing an identical file — avoids meaningless git-diff churn on every regeneration, consistent with the ratchet/monotonic-shrink philosophy the ADR already establishes for the baseline file.
- Optional npm script: add `"generate:nomenclature-dict": "node scripts/generate-nomenclature-dictionary.js"` to `package.json`'s `"scripts"` block (mirrors the existing `"version:bump"` pattern).

### 4.3 Output document structure

```
# Canonical Nomenclature Dictionary
> Generated from tools/nomenclature-registry.json — do not hand-edit.
> Regenerate: node scripts/generate-nomenclature-dictionary.js
> Machine authority: tools/nomenclature-registry.json (ratified 2026-07-17)

## Hub & Pane Directory
[table: Hub | Tab Content DOM ID | Tab Button Token | Panes (canonical label → dom id) | Modules]

## Legacy Alias Log (L2/L3 — document, don't rename; ADR decision D2)
[table, built from every hubs.*.panes.* / legacy_function_aliases / legacy_token_aliases
 entry with rename_status = documented-alias-do-not-rename: Identifier | Canonical Label |
 Embedded Legacy Term(s) | Note]

## Rename-Forbidden Identifiers (ADR decision D3)
[table from rename_forbidden: Pattern | Coupling Type | Reason | Evidence]

## Dynamic ID Allowlist Patterns (ADR decision D5, feeds Phase 2 N1)
[table from dynamic_id_allowlist: Pattern | Resolution Type | Note]

## localStorage Key Policy (ADR decisions D3/D8)
[prose block from localstorage_policy]

## Legacy Term Watchlist (Phase 2 N4 input)
[table from legacy_term_watchlist: Term | Match Scope | False-Positive Risk | Note]

## Known Discrepancies / Forward Notes
[prose block from known_discrepancies]

---
For the full architectural Mermaid topology (modals, buttons, shared components), see
tools/SK8Lytz_App_Master_Reference.md §0 "Architectural Hierarchy Blueprint (IMMUTABLE)"
— the single canonical location per CLAUDE.md's Topological Integrity rule. Not duplicated
here; the prior hand-copied duplicate in this file had already drifted from the original
(see docs/plans/feat-nomenclature-registry-1.md §0.5) and is removed as part of this
regeneration rather than perpetuated.
```

### 4.4 Explicit scope decision: delete the duplicated Mermaid diagram from this file

The current `docs/nomenclature_dictionary.md` (lines 13-167) carries its own ~155-line copy of the modal/button architecture Mermaid graph that also lives in Master Reference §0. Per §0.5's proof that this exact duplication has already drifted once, the regenerated file **replaces** that copy with a one-line pointer (§4.3 footer) instead of regenerating a second copy of it. The registry does not model button/modal topology at all (out of its L1-L5 naming scope) — only Master Reference §0 remains the single source for that Mermaid graph, consistent with CLAUDE.md's "Topological integrity" rule already naming that file as the authority.

---

## 5. Deliverable C — `tools/SK8Lytz_App_Master_Reference.md` sync

Three surgical edits. No Mermaid/topology edits (see §11).

### 5.1 §0 "Canonical Nomenclature Dictionary" table (lines 9-17) — fix + link, don't restate

```
// BEFORE (lines 9-17)
### Canonical Nomenclature Dictionary
| UI Tab Label (Found) | DOM ID (Legacy) | Canonical Name (Mandated) | Associated JS Modules |
| --- | --- | --- | --- |
| 📊 STOCKPILEZ | `invhub-tab` | **STOCKPILEZ** | `inventory-module.js`, `bom-module.js` |
| 🏭 MAKERZ | `prodhub-tab` | **MAKERZ** | `production-module.js`, `barcodz-module.js` |
| 📦 FULFILLZ | `fulfillzhub-tab` | **FULFILLZ** | `packerz-module.js`, `print-module.js`, `labelz-module.js` |
| 🛒 REVENUEZ | `salezhub-tab` | **REVENUEZ** | `sales-module.js`, `ceo-module.js` |
| 👥 SOCIALZ | `socialzhub-tab` | **SOCIALZ** | `socialz-module.js` |
| ⚡ NEXUZ | `synchub-tab` | **NEXUZ** | `system-tools-module.js`, `task-engine.js` |

// AFTER
### Canonical Nomenclature Dictionary
| UI Tab Label (Found) | Tab Content DOM ID | Canonical Name (Mandated) | Associated JS Modules |
| --- | --- | --- | --- |
| 📊 STOCKPILEZ | `stockpilez-tab` | **STOCKPILEZ** | `inventory-module.js`, `bom-module.js` |
| 🏭 MAKERZ | `makerz-tab` | **MAKERZ** | `production-module.js`, `barcodz-module.js` |
| 📦 FULFILLZ | `fulfillz-tab` | **FULFILLZ** | `packerz-module.js`, `print-module.js`, `labelz-module.js` |
| 🛒 REVENUEZ | `revenuez-tab` | **REVENUEZ** | `sales-module.js`, `ceo-module.js` |
| 👥 SOCIALZ | `socialz-tab` | **SOCIALZ** | `socialz-module.js` |
| ⚡ NEXUZ | `nexuz-tab` | **NEXUZ** | `system-tools-module.js`, `task-engine.js` |

> **Corrected 2026-07-17:** the previous "DOM ID (Legacy)" values in this table
> (`invhub-tab`, `prodhub-tab`, `fulfillzhub-tab`, `salezhub-tab`, `socialzhub-tab`,
> `synchub-tab`) did not exist anywhere in the codebase — verified via exhaustive
> repo-wide grep. Corrected to the real live tab-content ids above. See
> [docs/plans/feat-nomenclature-registry-1.md](../docs/plans/feat-nomenclature-registry-1.md) §0.1.
>
> Pane-level (L2), function-level (L3), and delegator-token legacy aliases, plus the
> rename-forbidden and dynamic-id-allowlist rules, are maintained in the
> machine-authoritative [tools/nomenclature-registry.json](nomenclature-registry.json)
> and its generated human-readable view,
> [docs/nomenclature_dictionary.md](../docs/nomenclature_dictionary.md). This table
> intentionally stays scoped to the 6 top-level hub tabs only — do not hand-restate
> pane/function/token aliases here (ADR decision D1).
```

### 5.2 §6B NEXUZ subsection (lines 561-567) — fix the 3 non-existent pane ids

```
// BEFORE
#### 1. NEXUZ (The Command Center)
- **`paneNexuzBrainz` (A.I. Terminal)**:
  - Houses the `#agentTerminal` text UI. Controls strict system commands via `.btn-green` `EXECUTE` and `.btn-blue` `EXPORT BACKUP`.
- **`paneNexuzImportz` (Data Sync)**:
  - Contains distinct `.import-card` blocks. Forces uploaded payload data strings sequentially into the `sandboxDataModal` for deduplication.
- **`paneNexuzSalez` (Ledger)**:
  - Strictly Read-Only interface. Renders inbound logic via collapsible classes: `.salez-record` (Standard), `.replacement-row` (Warranty), and `.refund-row` (Ghost Revenue). 

// AFTER
#### 1. NEXUZ (The Command Center)
> Pane ids corrected 2026-07-17 — see tools/nomenclature-registry.json for the full
> legacy-alias record (these ids carry the legacy "Nexl" term by design; see D2).
- **`paneNexlBrainz` (A.I. Terminal)**:
  - Houses the `#agentTerminal` text UI. Controls strict system commands via `.btn-green` `EXECUTE` and `.btn-blue` `EXPORT BACKUP`.
- **`paneNexlImportz` (Data Sync)**:
  - Contains distinct `.import-card` blocks. Forces uploaded payload data strings sequentially into the `sandboxDataModal` for deduplication.
- **`paneNexlSalez` (Ledger)**:
  - Strictly Read-Only interface. Renders inbound logic via collapsible classes: `.salez-record` (Standard), `.replacement-row` (Warranty), and `.refund-row` (Ghost Revenue). 
```

### 5.3 §8 Supplementary Architectural Documentation table (line 863) — reflect generated nature

```
// BEFORE (line 863)
| **Canonical Nomenclature Dictionary** | [nomenclature_dictionary.md](file:///d:/GitHub/neogleamz.github.io/docs/nomenclature_dictionary.md) | Standardizes the mapping between user-facing UI Tab Labels, legacy DOM IDs, Mandated Canonical Names, and their associated JavaScript Modules. | Includes a complete Mermaid-based Architectural Topology Blueprint of the entire application layout, button lists, and modal routes. |

// AFTER
| **Canonical Nomenclature Dictionary (generated)** | [nomenclature_dictionary.md](file:///d:/GitHub/neogleamz.github.io/docs/nomenclature_dictionary.md) | Human-readable view generated from tools/nomenclature-registry.json — do not hand-edit. Standardizes the mapping between user-facing UI Tab Labels, canonical DOM IDs, legacy-alias notes, rename-forbidden identifiers, and dynamic-id allowlist patterns. | Regenerate via `node scripts/generate-nomenclature-dictionary.js`. For the full Mermaid Architectural Topology Blueprint, see this document's own §0 (single canonical copy). |
| **Canonical Nomenclature Registry (machine authority)** | [nomenclature-registry.json](file:///d:/GitHub/neogleamz.github.io/tools/nomenclature-registry.json) | The single machine-readable source of truth for hub/pane canonical names, legacy-alias records, rename-forbidden identifiers, and dynamic-id allowlist patterns. | Consumed by the generated dictionary above and by the Phase 2 nomenclature scanner (`scripts/nomenclature-audit.js`, N1–N7 checks). |
```

---

## 6. Ratification Gate — HALT-for-user-approval checklist

CLAUDE.md's "Planning bypass override" forbids skipping halt-for-approval for any Bucket List task, and its anti-hallucination protocol specifically requires HALT when the Reference contradicts live code (§0.1/§0.2 below are exactly that). The ADR whiteboard session already ratified the high-level decisions (D1–D9) and the example legacy aliases; the items below are things this planning pass discovered or refined *beyond* that session and need explicit confirmation before the implementer writes any file:

1. **CRITICAL:** Confirm the correction in §0.1/§5.1 — replacing the fictional `invhub-tab`/`prodhub-tab`/`fulfillzhub-tab`/`salezhub-tab`/`socialzhub-tab`/`synchub-tab` values with the real live tab-content ids in both `tools/SK8Lytz_App_Master_Reference.md` and (via regeneration) `docs/nomenclature_dictionary.md`.
2. Confirm the correction in §0.2/§5.2 — fixing Master Reference §6B's 3 non-existent NEXUZ pane ids (`paneNexuzBrainz`/`Importz`/`Salez`) to the real `paneNexl*` ids.
3. Confirm the 9 pane-id → canonical-label mappings in §3 (RECIPEZ/BATCHEZ/LAYERZ/ORDERZ/STATZ/SIMULATORZ/IMPORTZ/SALEZ/BRAINZ) are complete and correctly assigned to their hubs.
4. Confirm the 3 function-name aliases (`syncSalezStats`, `showSalezPane`, `showNexlPane`) plus the 1 token alias (`click_switchTab_nexl`) are the complete L2/L3 legacy-alias set — anything else known to the user that recon missed?
5. Confirm the `rename_forbidden` list (7 pattern-families in §3) is complete — any other DB-enum-coupled or persistence-coupled identifier families the user knows of that weren't surfaced?
6. Confirm the `dynamic_id_allowlist` correction in §0.3/§0.4 — only `paneSalez*` gets the pane-switcher wildcard (not `paneProd*`/`paneNexl*`/`paneFulfillz*`), and `ldProp[A-Z]` is used instead of a bare `ldProp*`.
7. Confirm the scope decision in §2 — `legacy_term_watchlist` stores terms/patterns only (for Phase 2's N4), not the ~28 individual occurrence sites; full occurrence enumeration is explicitly deferred to Phase 2.
8. Confirm the dictionary-generation approach in §4.1 — a standalone `scripts/generate-nomenclature-dictionary.js` script now, versus fully manual hand-typed markdown "one more time."
9. Confirm the scope decision in §4.4 — deleting the duplicated ~155-line Mermaid modal/button diagram from `docs/nomenclature_dictionary.md` in favor of a pointer to Master Reference §0, since that diagram is outside the registry's naming scope and has already drifted once.
10. Acknowledge (no action needed) the forward-looking tensions flagged in §0.6 (150+ vs. ~28 discrepancy) and §0.7 (D8-vs-Phase-4-draft localStorage conflict) — captured in the registry's `known_discrepancies` block for the Phase 2/4 planners to inherit.

---

## 7. Security

### 7.1 XSS / DOM injection
**Not applicable.** This phase touches zero browser runtime code — no `.innerHTML`, `.insertAdjacentHTML`, `.outerHTML`, or `document.write` sinks anywhere in the deliverables. `tools/nomenclature-registry.json` is a static data file; `docs/nomenclature_dictionary.md` is static markdown; `scripts/generate-nomenclature-dictionary.js` is a Node build-time script that never runs in a browser and never touches the DOM. CLAUDE.md's `window.safeHTML`/DOMPurify guard rules govern browser-rendered dynamic HTML and simply don't apply to this task's file types. `node scripts/xss-audit.js` is expected to report the same finding count before and after (verification checklist §12).

### 7.2 RLS / Supabase
**Not applicable.** No Supabase table, column, query, or RLS policy is read, written, or referenced anywhere in this task's deliverables.

### 7.3 Print-window DOMPurify
**Not applicable.** No print-window `document.write` code path exists in any file this task touches.

### 7.4 Public exposure of the registry JSON (GitHub Pages)
`tools/nomenclature-registry.json` and `docs/nomenclature_dictionary.md` will be served publicly (the repo root is the live site). Confirmed safe: every value in §3's JSON is an identifier name, DOM id, file path, or line number **already visible in the shipped, unminified `index.html`/`assets/js/*.js`** — there is no new exposure. No Supabase URLs, API keys, secrets, or credentials appear anywhere in the registry or the generator script (grep-verifiable at review time). This matches the ADR's own Security & Performance Validator finding (§3 of the ADR): "Registry JSON is publicly served but contains only names already visible in shipped JS — no new exposure."

---

## 8. Vanilla JS Constraints

The only new executable code in this phase is `scripts/generate-nomenclature-dictionary.js`:
- No `var` — `const`/`let` only.
- No framework, no bundler, no TypeScript, no new npm dependencies (`fs`/`path` only, CommonJS, matching `package.json`'s `"type": "commonjs"`).
- This is a Node build-time dev-tooling script (like `scripts/xss-audit.js`/`scripts/bump-system-version.js`), not part of the browser SPA runtime — CLAUDE.md's "Web Bluetooth only" hardware-interaction clause targets the live browser app and does not apply to `scripts/` dev tooling. The "no `var`"/"no framework" style rules still apply for repo consistency.
- `scripts/**` is already excluded from ESLint (`eslint.config.mjs:10`), so no new globals/config entries are needed for this script.

---

## 9. 4-State UX / UI Mutex / Zero-Refresh

**Not applicable — no UI surface exists in this task.** All three deliverables (registry JSON, generated markdown, Master Reference doc edits) are static, developer/agent-facing artifacts with no browser rendering, no data-fetch component, no DB-mutation button, and therefore:
- No Loading/Error/Empty/Success states to implement (nothing fetches or renders to an end user).
- No `window.executeWithButtonAction` mutex (no button, no DB mutation).
- No render function to re-invoke after a mutation (nothing mutates the database; regenerating the dictionary is a one-shot Node script run, not a zero-refresh UI concern).

---

## 10. Schema Changes

**None.** No Supabase table, column, or RLS policy is created, altered, or dropped. Per CLAUDE.md's "Corporate brain sync" rule, no edit to Master Reference §3 "Database Schemas" is required or made.

---

## 11. Topological Integrity (Mermaid Blueprint)

**No edit to the Master Reference §0 Mermaid "Architectural Hierarchy Blueprint (IMMUTABLE)" is made or required.** CLAUDE.md's rule triggers on *creating, moving, or deleting* a button/modal/UI element — this task does none of those; it only corrects pane-id text in §6B's prose directory (a separate, non-Mermaid section) and the table in §0 (also non-Mermaid), and adds a linking sentence. §4.4's decision to remove the *duplicate* Mermaid copy from `docs/nomenclature_dictionary.md` does not touch the canonical copy in Master Reference §0, which remains the single immutable source, unedited.

---

## 12. Verification Checklist

1. **JSON validity:** `node -e "JSON.parse(require('fs').readFileSync('tools/nomenclature-registry.json','utf8'))"` exits 0.
2. **Generator run:** `node scripts/generate-nomenclature-dictionary.js` produces `docs/nomenclature_dictionary.md` matching the §4.3 structure; re-running it twice in a row produces byte-identical output (confirms no wall-clock timestamp leaked in, §4.2).
3. **Live-DOM spot check (re-verify before writing, per CLAUDE.md's surgical-edit "Read before Edit" rule in case of drift):** confirm all 6 tab-content ids and all 9 legacy-named pane ids in the registry still match `index.html` exactly.
4. **XSS audit:** `node scripts/xss-audit.js` — expect identical finding count before/after (no runtime JS touched).
5. **Lint:** `npx eslint .` — expect 0 new errors; `scripts/generate-nomenclature-dictionary.js` is excluded from linting (`eslint.config.mjs:10`), so this only confirms zero regression elsewhere.
6. **Tests:** `npm test` — expect unchanged pass count; no existing test references any of this task's new files.
7. **Root whitelist:** confirm neither new file lands at repo root — `tools/nomenclature-registry.json` and `scripts/generate-nomenclature-dictionary.js` are in already-whitelisted subdirectories; no `.githooks/pre-commit` whitelist edit needed.
8. **Doc link check:** confirm the `file:///` links added/edited in Master Reference §0/§5.3 resolve to the correct relocated paths (`nomenclature-registry.json` lives in `tools/`, sibling to the Master Reference itself — use a relative link there, not an absolute `file:///` link, to match how §0's other internal links behave... actually confirm against the existing convention used at line 863 (absolute `file:///` links) and match it exactly for consistency, per the existing table's own style).
9. **Manual review:** read the final `docs/nomenclature_dictionary.md` top to bottom — confirm no leftover fictional `invhub-tab`-style ids, no orphaned Mermaid diagram, all tables render.

---

## Files Touched

- `tools/nomenclature-registry.json` — **NEW.** Full content specified in §3.
- `docs/nomenclature_dictionary.md` — **REWRITTEN** (pre-existing file, relocated from repo root by a prior completed task; currently hand-maintained and already drifted from Master Reference — see §0.5). Regenerated via the new script, per §4.
- `scripts/generate-nomenclature-dictionary.js` — **NEW.** Node build-time generator, spec in §4.2. (Beyond the ledger's originally-listed file set — flagged explicitly since `tools/SK8Lytz_Bucket_List.md:33` only lists the registry/dictionary/Master-Reference trio; this script is the mechanism that produces the dictionary per §4.1's justification.)
- `tools/SK8Lytz_App_Master_Reference.md` — 3 edits: §0 table fix + link (§5.1), §6B NEXUZ pane-id fix (§5.2), §8 supplementary-docs table update (§5.3).
- `package.json` — optional, minor: add one `"generate:nomenclature-dict"` script entry (§4.2). Low-risk, purely additive; implementer may omit if deemed unnecessary without materially changing the plan.

**Not touched:** `index.html`, any `assets/js/*.js`, `qa-dashboard.html`, `.githooks/pre-commit`, `scripts/nomenclature-audit.js` / `scripts/nomenclature-baseline.json` (Phase 2), `tools/SK8Lytz_Bucket_List.md` (ledger exemption — syncs at `/wind-down`; the swarm-lock `[/]` marker is the orchestrator's responsibility, not this plan's), any Supabase schema/RLS.

---

## Suggested Commit Sequencing (micro-commit cadence per CLAUDE.md)

1. `feat(nomenclature): add tools/nomenclature-registry.json machine authority` — §3.
2. `feat(nomenclature): add docs/nomenclature_dictionary.md generator script` — §4.2 (`scripts/generate-nomenclature-dictionary.js` + optional `package.json` entry).
3. `chore(nomenclature): regenerate docs/nomenclature_dictionary.md from registry` — §4, running the generator (this commit's diff should show the fictional tab-id table + duplicated Mermaid diagram disappearing).
4. `fix(docs): correct stale invhub-tab-family DOM ids and NEXUZ pane ids in Master Reference` — §5.1 + §5.2 (grouped: both are corrections of the same class of error, discovered in the same recon pass).
5. `docs(reference): link Master Reference §8 to the new registry as machine authority` — §5.3.

(`tools/SK8Lytz_Bucket_List.md` is exempt from these micro-commits per CLAUDE.md's ledger exemption — it syncs at `/wind-down`.)
