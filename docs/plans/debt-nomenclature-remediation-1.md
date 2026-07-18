# debt/nomenclature-remediation — Batch 1: N6 Unused CSS Cleanup

## Scope

This is the **first of several planned batches** under the ledger item `debt/nomenclature-remediation` (tools/SK8Lytz_Bucket_List.md). The full ledger item covers Tier 1 (legacy-term comment/docstring cleanup) and Tier 2 (orphan delegator handlers, ghost `getElementById` guards, unused CSS) — too large for one pass by design ("via triaged `/bucketlist` parallel batches").

Batch 1 targets only the **N6_UNUSED_CSS** category from `node scripts/nomenclature-audit.js --warn` (90 flagged findings). Tier 1 (N4_LEGACY_TERM) and the N1 ghost-ID guard work are explicitly deferred to future batches — see "Deferred" below.

## Why N6 first

- Zero JS runtime risk in principle (pure CSS deletion) — no delegator wiring, no DOM ID changes.
- Closest match to the ledger's own "~100 unused CSS classes" Tier 2 estimate (90 actual).
- Self-contained to `<style>` blocks in `index.html` and `qa-dashboard.html`.

## Critical discovery: the scanner has real false positives

The static N6 check only recognizes literal `class="..."` attributes and literal `.classList` calls. It **cannot** see:
1. Classes applied via string concatenation: `b.className = 'prog-' + state;`
2. Classes applied via template-literal interpolation: `` `socialz-hover-bg-${colorClass}` ``
3. Classes passed as third-party library config values (e.g. SortableJS's `ghostClass: 'sortable-ghost'`)
4. A library's own *default* class names, which are applied at runtime even when never written literally in this repo's source (SortableJS 1.15.7 auto-applies `sortable-drag` via its default `dragClass` option, confirmed by downloading and inspecting the pinned CDN source — this repo's code never overrides that option, so the class is live purely from the library's internal default).

Because of this, **29 of the 90 flagged classes are false positives** and must be kept. Each was verified with concrete file:line evidence (not just re-running the scanner):

| Class(es) | Why it's live |
|---|---|
| `.mod-working`, `.mod-success`, `.mod-error` | `setMasterStatus(msg, "mod-working"/"mod-success"/"mod-error")` — 50+ call sites across nearly every module |
| `.prog-success`, `.prog-error` | `setSysProgress()` in index.html:4459 builds the class via `'prog-' + state`; called with `'success'`/`'error'` at 20+ sites |
| `.status-completed`, `.status-archived`, `.status-in-progress`, `.status-todo` | assigned to `statusColorClass` in task-engine.js:692-695, 1029-1032, then interpolated into task-card markup |
| `.sortable-ghost` | explicit SortableJS `ghostClass:` config (task-engine.js:554, 583, 1942) |
| `.sortable-drag` | SortableJS's own default `dragClass` value — never written in our source, applied by the library itself during drag (confirmed against the pinned `sortablejs@1.15.7` CDN source) |
| `.sorted-asc`, `.sorted-desc` | ternary in socialz-module.js:504 |
| `.highlight-calc`, `.negative-stock`, `.low-stock` | conditional assignment in inventory-module.js:109, 330 |
| `.margin-good`, `.margin-ok`, `.margin-bad` | ternary in analytics-module.js:292 |
| `.toast-enter` | className template in socialz-module.js:90 |
| `.completed`, `.manual` | string comparisons / class toggles across task-engine.js, neogleamz-engine.js, production-module.js |
| `.sub-nav`, `.sub-nav-btn` | `querySelectorAll('.sub-nav-btn')` in qa-dashboard.html:396; `.sub-nav` referenced qa-dashboard.html:395 |
| `.socialz-hover-bg-pink/cyan/red/blue` | built via template literal `` `socialz-hover-bg-${colorClass}` `` in socialz-module.js:173 |
| `.log-success` | `cls += ' log-success'` in qa-dashboard.html:118 |

`.sortable-dragover` is **not** a SortableJS default (confirmed against the library source: SortableJS 1.15.7's only built-in class defaults are `sortable-chosen`, `sortable-drag`, `sortable-fallback`, `sortable-ghost`, `sortable-selected`, `sortable-swap`) and has zero references anywhere in this repo — genuinely dead.

## Verified delete-safe list (61 classes, all in `index.html`)

Every entry below was checked for: (1) literal `class="..."` usage, (2) `.classList`/`querySelector` usage, (3) variable-assignment usage, (4) string-concatenation/template-literal prefix construction, (5) third-party library config/default collision. Zero hits on all five checks.

```
.card-stat, .back-hub-btn, .btn-ghost-emerald, .btn-ghost-red, .btn-ghost-purple,
.btn-flat-emerald, .btn-flat-blue, .btn-flat-red, .btn-flat-brand, .btn-flat-purple,
.btn-flat-amber, .btn-flat-slate, .inventory-pane, .pane-title, .no-print,
.btn-purple-muted, .btn-purple-neon, .btn-amber-neon, .btn-slate-neon, .master-card,
.sync-section-header, .sync-section-desc, .ceo-terminal-grid, .ceo-control-panel,
.span-2, .span-3, .login-box, .exec-header, .exec-kpi, .kpi-box,
.badge-queued, .badge-printing, .badge-cleaned, .badge-completed, .section-hdr,
.transition-all-300, .glass-panel, .flex-col, .gap-2, .gap-4, .gap-6,
.mt-1, .mt-4, .p-2, .p-4, .p-6, .pt-4, .rounded-2xl, .w-12, .h-12, .object-cover,
.grid-cols-1, .action-toolbar, .bg-indigo-500, .bg-slate-200, .bg-brand,
.sortable-dragover, .status-blocked, .task-timeline-node, .task-checkbox, .badge-red-neon
```

Note: `.status-blocked` and `.task-checkbox` are near-miss naming collisions — the live code uses `Archived`/other status strings for the "blocked" concept and `.te-task-checkbox` (different, `te-`-prefixed class) respectively. The bare `.task-checkbox`/`.status-blocked` selectors are genuinely orphaned.

No `qa-dashboard.html` changes in this batch — its only N6 candidate (`.log-success`) is confirmed live.

## Implementation approach

1. Locate each of the 61 selectors in `index.html`'s `<style>` blocks (5 separate `<style>` tags exist: lines 29, 3382, 3743, 6419, 7962 — most CSS is in the first block).
2. Delete each rule in full, including any `:hover`/`::before`/media-query-scoped variants of the *same selector* (verify via grep that the variant isn't also covering a still-live sibling selector in a comma-separated group — e.g. `.dead-class, .live-class { ... }` must keep the rule and only drop `.dead-class` from the selector list, not delete the whole block).
3. After edits, re-run `node scripts/nomenclature-audit.js --warn` and confirm N6 count drops from 90 to 29 (the confirmed-live set), and that all other categories (N1/N1_PREFIX/N3/N4/N5/N7) are unchanged.
4. No JS files change in this batch.

## Deferred to future batches (do not attempt now)

- **Tier 1** — N4_LEGACY_TERM (85 findings): mostly `documented-alias-do-not-rename` identifiers per `tools/nomenclature-registry.json` (`syncSalezStats`, `showSalezPane`, `showNexlPane`, etc.) — renaming these would break live wiring, contrary to the ledger's original "~30 comment-only refs" framing. Needs its own scoped investigation to separate genuine comment/docstring occurrences from protected aliases.
- **Tier 2 remainder** — N1_GHOST_ID (141) + N1_GHOST_ID_PREFIX (17) ghost `getElementById` guards, N5_NEW_NONCONFORMANT_KEY (24) localStorage key fixes.
- **`debt/brand-sweep`** — next phase, blocked on this item completing (shares files, flips the pre-commit hook to blocking).

## Security / XSS

None — CSS-only deletion, no `innerHTML`/`insertAdjacentHTML` surfaces touched.

## 4-state UX / UI mutex / zero-refresh

Not applicable — no DB mutation, no async operation, no new UI surface.
