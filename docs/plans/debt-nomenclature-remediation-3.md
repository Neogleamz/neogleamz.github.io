# debt/nomenclature-remediation — Batch 3: N1 dynamic_id_allowlist Registry Fix

## Scope

Batch 3 of the multi-batch ledger item `debt/nomenclature-remediation`. Targets a confirmed-safe subset of **N1_GHOST_ID_PREFIX** (17 findings total): 4 prefix patterns covering 8 findings, all genuine registry gaps — not code bugs.

## Same shape as Batch 2: a registry fix, not a code change

I traced every one of the 17 N1_GHOST_ID_PREFIX findings for a real DOM producer (not just trusting the scanner). This surfaced a materially mixed category — nothing like the uniform "add null-guards" framing the ledger's Tier 2 description assumed:

| Pattern | Findings | Status |
|---|---|---|
| `stockzAuditBtn_*` | 3 | **Real producer** — index.html:6444-6446 (3 static `id="stockzAuditBtn_{audit,planning,history}"` tab buttons). Registry gap only. |
| `stockzAuditTab_*` | 2 | **Real producer** — index.html:6465,6569,6634. Registry gap only. |
| `sect-P-*` | 2 | **Real producer** — index.html:2202,2209,2226,2243 (print-job status pipeline: Queued/Printing/Cleaned/Completed). Same enum family as the existing `pipe-P-*` allowlist/rename_forbidden entry. Registry gap only. |
| `sect-*` (no `-P-`) | 1 | **Real producer** — index.html:2109,2113,2120,2136 (work-order status pipeline: Queued/Picking/Production/Completed — a *different* enum from `sect-P-*`, do not conflate). Registry gap only. |
| `inlineContainer_*` / `inlineLeftPane_*` / `inlineRightPane_*` / `inlinePreviewContainer_*` | 4 | **No producer anywhere in the repo.** The only caller, `window.initInlineResize` (system-tools-module.js:2844), has **zero callers itself** — the whole drag-resize feature is orphaned. Already safely guarded (`if(!wrapper \|\| !leftPane) return;`) — no crash risk, but "guard it" doesn't apply; this is a dead-feature judgment call (delete vs. rewire), out of scope for a registry fix. |
| `inlineSopQA_*` / `inlineSopQAPreview_*` | 2 | **Ambiguous.** `inlineRenderTelemetryPreview` (which reads these ids) IS called, gated on `window.activeSOPTextAreaId.startsWith('inlineSopQA_')`. That value is set from a button's `data-textid` attribute at runtime (production-module.js:2706) — meaning the actual textarea id may be produced dynamically via markup I haven't fully traced yet. Already guarded (`?.`, `if(!previewContainer) return;`). Needs more call-chain tracing before I'd trust a verdict either way. |
| `sim-shipexp-*` / `sim-ghost-*` / `sim-net-*` | 3 | **No producer found** in a first pass. Not yet traced for orphan-caller status (unlike `initInlineResize`) or guard status. Needs the same treatment as the inline-editor cases before acting. |

## This batch: only the 4 confirmed-safe patterns

Add 4 new entries to `tools/nomenclature-registry.json`'s `dynamic_id_allowlist`, matching the existing entry shape (`pattern`, `resolution_type`, `evidence`, optional `note`):

- `stockzAuditBtn_*`
- `stockzAuditTab_*`
- `sect-P-*` (note the enum-coupling parallel to the existing `pipe-P-*` entry — same print-job status family, different DOM role)
- `sect-*` (distinct work-order status enum — do not merge with `sect-P-*`)

No application code changes.

## Explicitly deferred (do not attempt now)

The remaining 9 N1_GHOST_ID_PREFIX findings (`inlineContainer_*` family + `inlineSopQA_*` family + `sim-*` family) and all 141 N1_GHOST_ID findings need per-item producer/orphan-caller tracing before any fix — this manual investigation is expensive per item (each requires walking the call chain, not just a grep), so a future batch should dispatch the full pre-task swarm (`explore-mapper` doing exhaustive tracing at scale) rather than continue hand-verifying one by one in-session. N4_LEGACY_TERM Tier 1 (85 findings) remains untouched.

## Verification

1. `node scripts/nomenclature-audit.js --warn` — confirm N1_GHOST_ID_PREFIX drops from 17 → 9.
2. Confirm N1_GHOST_ID, N3, N4, N6 unchanged; N7 stays clean (regenerate dictionary if the registry edit trips it).
3. `node scripts/generate-nomenclature-dictionary.js` to keep the generated doc in sync.

## Security / XSS
None — JSON registry change only.
