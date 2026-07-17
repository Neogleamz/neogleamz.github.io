# Implementation Plan: Nomenclature Audit Engine

**ADR Reference:** [docs/architecture/nomenclature-audit-engine.md](../architecture/nomenclature-audit-engine.md)  
**Branch Strategy:** Multi-phase (`fix/dead-ui-wiring`, `feat/nomenclature-registry`, `feat/nomenclature-audit-engine`, `debt/nomenclature-remediation`, `debt/brand-sweep`)  
**Validated By:** Whiteboard session 2026-07-17 + drift quantifier agent

---

## Objective Summary
Establish a canonical nomenclature registry and build a deterministic scanner to eliminate naming drift across 5 layers (L1 labels, L2 DOM/CSS, L3 functions, L4 DB/storage, L5 docs). Fixes 3 production dead-button bugs as Phase 0. Ratchets from advisory to blocking, mirroring the proven XSS-gate pattern.

---

## Files Touched

### Phase 0 — Dead-UI-Wiring Fix (Immediate)
- `index.html` (line 2344: dead `click_sortLtvModal` emitters, line 5xx: unguarded `getElementById` calls)
- `assets/js/system-event-delegator.js` (dead handlers: `click_sortLtvModal`, `click_cancelRestore`, `click_actualNetSort_a`)
- `assets/js/inventory-module.js` (unguarded ghosts: `batchProductSelect`, `packerzAdminRecipeSelect` ×5)
- `.githooks/pre-commit` (add N1–N2 checks, guard against crashes)

### Phase 1 — Nomenclature Registry
- `tools/nomenclature-registry.json` (NEW)
- `tools/SK8Lytz_App_Master_Reference.md` (sync registry L1 labels into table)
- `docs/nomenclature_dictionary.md` (generated from registry)

### Phase 2 — Scanner Engine Build
- `scripts/nomenclature-audit.js` (NEW; two-pass regex, three-way resolution, N1–N7 checks)
- `scripts/nomenclature-baseline.json` (NEW; ratchet baseline, monotonic shrink)
- `package.json` (no new deps; leverages existing espree transitively if AST needed in v2)
- `.githooks/pre-commit` (wire scanner into advisory mode: `--warn`)

### Phase 3 — Triaged Remediation Batches
- `assets/js/system-event-delegator.js` (delete 43 orphan handlers)
- `assets/js/inventory-module.js`, `assets/js/packerz-module.js`, `assets/js/production-module.js`, etc. (delete 87 unguarded ghosts)
- `index.html`, `qa-dashboard.html` (delete unused CSS classes ~100)
- `docs/nomenclature_dictionary.md` (regenerate after each batch)

### Phase 4 — Brand Sweep + Hook Flip
- `index.html`, `assets/js/*.js`, `qa-dashboard.html`, `CHANGELOG.md`, `README.md` (neogleamz→sk8lytz rename, 88 refs)
- `neogleamz-engine.js` → `sk8lytz-engine.js` (file rename requires script-tag + cache-buster)
- `.githooks/pre-commit` (flip scanner from `--warn` to `-blocking`; remove `--warn` flag)

---

## Security & Compliance

### XSS / DOM Security
- **Phase 0:** Guard unguarded `getElementById` calls with try-catch; verify no `.innerHTML` assignments with unsanitized data.
- **Phase 2:** Scanner is read-only fs + optional espree; no eval, no network, no write except behind `--update-baseline` flag.
- **Validation:** Run `node scripts/xss-audit.js` at each phase to confirm no new violations.

### Vanilla JS Constraints
- No TypeScript, no bundler, no import/export transpilation.
- All DOM manipulation via native `document.*` and `Element.*` methods.
- Event delegation only via system-event-delegator.js static switch blocks.
- Template-literal ids must be allowlisted in the registry's `dynamic-id-allowlist` (e.g. `btnCompleteAssembly_*`, `paneSalez*`).

### Database & Persistence Constraints
- Supabase enum suffixes (e.g., `click_advancePrintStatus_Queued`) are **rename-forbidden** — D1 principle.
- localStorage keys coupled to DOM ids (e.g., `neoSelect_${select.id}`) are **rename-forbidden** — D3 principle.
- Existing localStorage keys (24 across 4 conventions) remain frozen; new keys only use `sk8lytz_` prefix (N5 check).

---

## Implementation Sequence

### Phase 0 — `fix/dead-ui-wiring` (P1, ~2 hours, before other phases)
**Goal:** Eliminate 3 live production bugs shipped silently due to missing delegator handlers and unguarded ghost lookups.

1. **Dead Handlers Fix** (~30 min):
   - `system-event-delegator.js:` Add `default: case` that logs warnings for unrecognized tokens.
   - Index.html line 2344: Delete 6× dead `click_sortLtvModal` emitters (they call `advancePrintStatus('Queued')` which never routes).
   - Delegator: Add real handlers for `click_sortLtvModal`, `click_cancelRestore`, `click_actualNetSort_a` with correct business logic.
   - Verify in delegator: `case 'click_sortLtvModal': ...` and check function exists.

2. **Unguarded Ghosts Removal** (~1 hour):
   - `inventory-module.js:` Lines 417, ~600s: Try-catch all `getElementById('batchProductSelect')`, `getElementById('packerzAdminRecipeSelect_*')`, etc.
   - If not found, log and return early (don't crash).
   - Delete any orphaned `getElementById` with no caller in the module.
   - `packerz-module.js`, `production-module.js`: Scan for unguarded DOM lookups; guard or delete.

3. **Verification** (~30 min):
   - Manual test: Navigate to STOCKPILEZ, click headers that were dead (should now sort).
   - Manual test: Inventory pane that had crashes; confirm no errors in console.
   - Run XSS audit: `node scripts/xss-audit.js` (should find zero new issues).
   - Commit: `git add index.html assets/js/system-event-delegator.js assets/js/inventory-module.js` then `git commit -m "fix(ui-wiring): resolve 3 dead buttons and unguarded ghost lookups"`

---

### Phase 1 — `feat/nomenclature-registry` (~4–6 hours, agent-assisted)
**Goal:** Extract the inventory, user-ratify canonical names, generate the machine authority.

1. **Inventory Extraction** (Explore agent: 30 min):
   - Parse index.html, assets/js/*.js, qa-dashboard.html for every DOM id, CSS class, delegator token, localStorage key, Supabase table reference.
   - Group by hub/pane (STOCKPILEZ, MAKERZ, FULFILLZ, REVENUEZ, LAYERZ, REPORTZ).
   - Produce a TSV or JSON candidates file: `current_name | visible_label | layer | occurrence_count`.

2. **User Ratification** (Manual: 1–2 hours):
   - User reviews candidates, validates L1 labels match current finalized names.
   - User marks rename-forbidden items (DB enums, persistence-coupled ids, print-window classes).
   - User lists allowlist patterns for dynamic ids (e.g., `btnCompleteAssembly_*`, `pipe-P-*`, `ldProp*`, `paneSalez*`).

3. **Registry Generation** (1 hour):
   - Write `tools/nomenclature-registry.json` structured as:
     ```json
     {
       "version": "1.0",
       "hubs": {
         "STOCKPILEZ": {
           "canonical_label": "Stock Pile",
           "panes": {
             "paneStockpilez": {
               "canonical_label": "Stock Summary",
               "dom_ids": { "paneStockpilez": "primary container" },
               "css_classes": ["stockpilez-header", "stock-row"],
               "delegator_tokens": ["click_sortStockpilez", "click_expandStock"],
               "legacy_aliases": ["invhub-tab", "invPaneTab"]
             }
           }
         }
       },
       "rename_forbidden": {
         "click_advancePrintStatus_Queued": "enum suffix couples to DB",
         "pipe-P-*": "print-window document.write payload",
         "neoSelect_*": "localStorage persistence-coupled"
       },
       "dynamic_id_allowlist": [
         "btnCompleteAssembly_*",
         "paneSalez*",
         "tabId-tab",
         "ldProp*"
       ]
     }
     ```
   - Cross-validate against Master Reference tables; update them if stale.

4. **Dictionary Auto-Generation** (~30 min):
   - Write `docs/nomenclature_dictionary.md` as generated prose from registry (one section per hub/pane, L1 label, L2 ids, L3 functions, legacy terms, allowlist notes).
   - Header: "**Generated from tools/nomenclature-registry.json. Do not edit by hand.**"

5. **Commit:**
   - `git add tools/nomenclature-registry.json tools/SK8Lytz_App_Master_Reference.md docs/nomenclature_dictionary.md`
   - `git commit -m "feat(nomenclature-registry): establish machine authority and dictionary"`

---

### Phase 2 — `feat/nomenclature-audit-engine` (~6–8 hours)
**Goal:** Build the scanner, wire pre-commit, baseline the LARGE backlog.

1. **Scanner Architecture** (2 hours):
   - Create `scripts/nomenclature-audit.js`:
     - **Pass 1 (Collect):** Walk the codebase, emit every: DOM id, CSS class, delegator token, localStorage key, function name, Supabase table reference. Store in memory objects keyed by identifier.
     - **Pass 2 (Resolve):** For each name, check registry:
       - `RESOLVED`: name is in registry + passes rename-forbidden rules.
       - `PREFIX-MATCHED`: name matches a dynamic-id allowlist pattern (e.g., `btnCompleteAssembly_` ∈ `btnCompleteAssembly_*`).
       - `UNRESOLVABLE`: name not found and not matched → output as finding.
     - Implement checks N1–N7 (ghost DOM lookups, orphan delegator tokens, L1 drift, legacy-term occurrences, localStorage conformance, unused CSS, registry-docs sync).
     - Exit code: 0 = WARN mode (findings reported but non-fatal); 1 = blocking mode (findings = failure).
     - Output format mirrors xss-audit.js: file, line, rule, context.

2. **Baseline Mechanics** (1 hour):
   - Create `scripts/nomenclature-baseline.json`:
     - Fingerprints for every known finding: `file | ruleId | identifier` (line-independent).
     - Version number; monotonic-shrink enforcement (new baseline rejected if it contains old entries — prevents ratchet-breaking).
     - Regenerated via `nomenclature-audit.js --update-baseline` flag (requires explicit user intent).

3. **Pre-commit Integration** (~1 hour):
   - Add to `.githooks/pre-commit`:
     ```bash
     npm run audit:nomenclature -- --warn
     if [ $? -ne 0 ]; then
       echo "⚠️  Nomenclature warnings — review and update baseline if needed."
       exit 0  # Advisory only; commit proceeds
     fi
     ```
   - Verify hook runs after xss-audit and before version bump.

4. **Baseline the Backlog** (1–2 hours):
   - Run `npm run audit:nomenclature -- --update-baseline` to capture the initial LARGE state.
   - Commit: `git add scripts/nomenclature-baseline.json && git commit -m "chore(audit): baseline initial nomenclature findings (LARGE)"`

5. **Validation**:
   - Run scanner on a no-changes commit; should report 0 new findings.
   - Introduce a ghost `getElementById`; scanner should catch it.
   - Commit:
     - `git add scripts/nomenclature-audit.js scripts/nomenclature-baseline.json .githooks/pre-commit package.json`
     - `git commit -m "feat(nomenclature-audit): build scanner engine and wire pre-commit (advisory mode)"`

---

### Phase 3 — `debt/nomenclature-remediation` (batched, ~12–16 hours over multiple `/bucketlist` executions)
**Goal:** Shrink the LARGE baseline monotonically via triaged Tier 1 & 2 remediation.

**Tier 1 — Docs & Comments** (~4 hours):
- Replace all legacy terms in comments, docstrings, markdown (Salez→STOCKPILEZ, Nexl→NEXUZ, etc.).
- Update `README.md`, `CHANGELOG.md`, any internal docs.
- Re-run scanner; baseline should shrink by ~30–40 findings.

**Tier 2 — Triaged Orphan/Ghost Removal** (~8–12 hours, parallel batches via `/bucketlist`):
- **Batch T2-A:** Delete 43 orphan delegator handlers (handlers with no emitters; verify via grep pre-deletion).
- **Batch T2-B:** Delete 87 unguarded ghost `getElementById` calls (requires code review per D7 — variable indirection can hide live usage).
- **Batch T2-C:** Delete ~100 unused CSS classes (advisory-only, low risk).
- Each batch:
  - Re-run scanner to confirm each deletion reduces findings.
  - Update baseline: `npm run audit:nomenclature -- --update-baseline`.
  - Commit per batch.

**Success Metric:** Baseline shrinks to ~10–15 findings (essential renames + allowed aliases), all at "PREFIX-MATCHED" or documented allowlist.

---

### Phase 4 — `debt/brand-sweep` + Hook Flip (~3–4 hours)
**Goal:** Complete the neogleamz→sk8lytz rename and flip scanner to blocking.

1. **Brand Sweep** (~2 hours):
   - Rename all 88 occurrences of `neogleamz` → `sk8lytz` in comments, doc strings, localStorage key prefixes, URLs, paths (e.g., old `neoSelect_${id}` → `sk8lytzSelect_${id}`, but document migration strategy).
   - **File renames:** `neogleamz-engine.js` → `sk8lytz-engine.js` requires cache-buster in script tags; coordinate with `/release-manager` to bump version.
   - Commit: `git commit -m "debt(brand): migrate neogleamz→sk8lytz across codebase"`

2. **Hook Flip to Blocking** (~30 min):
   - Update `.githooks/pre-commit`: Remove `--warn` flag.
   - Pre-commit now fails if scanner finds any baseline-unregistered names.
   - Document: "From 2026-07-XX, nomenclature violations are blocking. Update registry or baseline if adding known exceptions."

3. **Final Validation:**
   - Run `npm run audit:nomenclature` (blocking mode); should output 0 findings.
   - Commit: `git add .githooks/pre-commit && git commit -m "chore(audit): enable nomenclature blocking gate"`

---

## Security Considerations

### XSS / DOM Safety
- **Phase 0:** Guard all `getElementById` calls; no new `.innerHTML` assignments with dynamic data.
- **Phase 2:** Scanner has no eval, no `exec`; safe to run on untrusted commit diffs.
- **Phase 3:** Manual triage required for orphan removals to avoid false positives (FM-6 proof).

### Vanilla JS Compliance
- All phases use native DOM APIs; no external dependency creep.
- Delegator tokens remain static switch cases; no dynamic eval of token names.

### Persistence Coupling
- Phase 1: Identify all localStorage keys tied to DOM ids or function names; mark as rename-forbidden.
- Phase 4: Brand-sweep includes new documentation for migration strategy (e.g., dual-key reads for localStorage to avoid data loss).

---

## Testing & Verification

### Unit Tests (Automated)
- `npm test` (existing test suite, if any) — confirm no breaking changes to module load order or global state.

### Manual Verification Steps
**Phase 0:**
- Browser: Navigate STOCKPILEZ, click a dead header → should sort (was dead).
- Browser: Inventory module with unguarded ghosts → no console errors.

**Phase 1:**
- Audit: Grep registry for all canonical names; spot-check 10 against live UI (tabs, buttons, headers).
- Docs: Master Reference tables match registry entries.

**Phase 2:**
- Audit: `npm run audit:nomenclature -- --warn` on a clean commit → reports LARGE baseline, all findings valid.
- Audit: Introduce a new ghost `getElementById`; scanner catches it.

**Phase 3:**
- Audit: After each Tier 2 batch, run scanner → baseline shrinks monotonically.

**Phase 4:**
- Audit: Final `npm run audit:nomenclature` (blocking mode) → 0 findings.
- Audit: Attempt to commit code with legacy term → pre-commit hook blocks it.

---

## Rollback Plan

- **Phase 0:** Git revert the fix/dead-ui-wiring commit; code was hand-crafted, safe to reverse.
- **Phases 1–4:** Each phase has atomic commits; use `git revert <commit-sha>` to undo any phase independently.
- **Registry rollback:** If registry is wrong, revert to previous version via git; scanner reads from HEAD, no on-disk compilation.

---

## Success Criteria

- ✅ Phase 0: 3 dead buttons fixed + no unguarded ghosts.
- ✅ Phase 1: Registry built + user-ratified; Master Reference synced.
- ✅ Phase 2: Scanner running in advisory mode; LARGE baseline captured.
- ✅ Phase 3: Baseline shrinks to <15 findings via Tier 1 + 2 remediation.
- ✅ Phase 4: All legacy terms removed; scanner in blocking mode; zero pre-commit violations.
