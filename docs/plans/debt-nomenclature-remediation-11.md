# Implementation Plan — `debt/nomenclature-remediation` Batch 11 (N3_LABEL_DRIFT — likely final batch)

**Branch:** `debt/nomenclature-remediation` (continuing epic branch, fresh off `main`)
**Scope:** 1 finding, 1 file, 1 line. This plan is intentionally short — the fix is a single literal-text edit with a zero-risk blast radius, verified below rather than assumed.

## 1. The finding (re-verified against live source, not re-derived)

- `index.html:3206` — `<div id="paneSocialzRoster" class="executive-pane" style="display:none;">`
- `index.html:3208` (confirmed exact current line/indentation by direct read — 16-space indent, matches sibling `<div class="pane-header-actions">` on the next line):
  ```html
                  <span class="pane-header-title">SOCIALZ AUDIENCE</span>
  ```
- Registry: `tools/nomenclature-registry.json:68` — `"paneSocialzRoster": { "canonical_label": "ROSTER", "embedded_legacy_terms": [], "rename_status": "canonical" }`
- Master Reference Mermaid diagram: `tools/SK8Lytz_App_Master_Reference.md:144` — `SZ_Roster[ROSTER Pane<br>DOM: paneSocialzRoster]` (already correct — see §3).
- Master Reference prose section, also already correct: `tools/SK8Lytz_App_Master_Reference.md:620` — `**\`paneSocialzRoster\` (ROSTER)**:`.
- `docs/nomenclature_dictionary.md:14` and `.agents/rules/core-safety-protocols.md:35` also already say ROSTER (auto-generated / hand-synced from the registry, not from the live HTML — this is exactly how the drift went undetected: every doc layer agreed with the registry, only the live `<span>` text disagreed).
- `scripts/nomenclature-baseline.json:815-821` carries this fingerprint (`index.html|N3_LABEL_DRIFT|SOCIALZ:paneSocialzRoster`, severity MODERATE) with a stale `example_line: 3355` — confirmed that line is a `<!-- DECOMMISSIONED LEGACY TABS -->` comment, not the header span. This is expected: per Batch 4's precedent, N3 fingerprints are identifier-based (`file|ruleId|hub:paneId`), not line-based, so line drift in the baseline snapshot doesn't affect resolution — only the fingerprint tuple matters, and it matches this finding uniquely.

**Fix:** change `index.html:3208`'s text node from `SOCIALZ AUDIENCE` to `ROSTER`. No attribute, class, id, or surrounding structure changes.

## 2. Blast-radius check (full-repo grep, unrestricted path)

| Search string | Hits outside `index.html:3208` |
|---|---|
| `SOCIALZ AUDIENCE` (exact case) | **None.** Sole hit in the entire repo is `index.html:3208`. |
| `Socialz Audience` (title case) | One hit: `assets/js/system-realtime-sync.js:477` — a code comment `// 9. Socialz Audience Cache` immediately preceding `if (table === 'socialz_audience') {...}`. Read in context (lines 465-494): this comments on the **Supabase table name** `socialz_audience` (a DB-layer identifier, out of scope for this fix and not a Master Reference schema change — no column/table edit here), not the pane header text. Confirmed independent — safe to leave untouched. |
| `socialzAudience` (camelCase) | **None** anywhere in the repo. |
| `pane-header-title` (class, to check for text-matching selectors) | Only other usage is `assets/js/task-engine.js:1387,1497` for an unrelated "Edit Project"/"Create New Project" modal header — no CSS or JS selects on this class's *text content*, only the class name for styling. No dependency. |

**Conclusion:** zero blast radius. Nothing else in the repo — no JS string-matching, no CSS selector, no test, no other doc — depends on the literal string `SOCIALZ AUDIENCE` surviving. This is a fully isolated one-line text edit.

## 3. Topological integrity check

CLAUDE.md's rule requires a Mermaid blueprint update only when a button/modal/UI element is **created, deleted, or moved**. This change does none of those — `paneSocialzRoster` keeps its DOM id, position, children, and all wired actions (`Analytics`, `Import`, `Export`, `Migrate Avatars`, `Add Skater`); only the header's literal text content changes.

Additionally, the Master Reference's own diagram (`tools/SK8Lytz_App_Master_Reference.md:144`) and prose section (`:620`) **already say "ROSTER"** — they were correct all along; the live HTML was the outlier. No Master Reference edit is required for this batch. (This is the inverse of the usual "corporate brain sync" case — here the doc was right and the code was wrong, so fixing the code brings it into sync with the existing doc rather than the other way around.)

## 4. Dynamic re-render check (does anything re-write this header at runtime?)

Checked for a JS code path that could reintroduce `SOCIALZ AUDIENCE` on tab-switch or data refresh:
- `assets/js/socialz-module.js` — grepped for `pane-header-title`: **no matches**. The module's only touches on `paneSocialzRoster` (lines 887, 895) are `style.setProperty('display', 'flex'/'none', 'important')` show/hide toggles — it never sets `.innerHTML`/`.textContent` on the header span.
- `assets/js/system-event-delegator.js` — grepped for `socialz` (case-insensitive): only `case 'click_switchTab_socialz': switchTab('socialz');` (line 80-81) and `case 'click_socialzSort':` (line 860). `switchTab()` shows/hides tab containers by id; it does not rewrite pane header text anywhere in this file.

**Conclusion:** the header text is fully static markup with no dynamic writer. The fix is durable — no re-render path can regress it back to the old string.

## 5. Security / XSS

Pure literal-string edit inside existing static markup — no `innerHTML`, `insertAdjacentHTML`, `outerHTML`, template literal, or `document.write` involved at the edit site. Not a new sink; nothing for `window.safeHTML`/DOMPurify to guard, since no dynamic/DB-sourced data touches this line before or after the change. `node scripts/xss-audit.js` is expected to report identical before/after counts (0 new violations, consistent with every prior batch in this epic).

## 6. Vanilla JS / 4-state UX / UI mutex / zero-refresh / schema

- **Vanilla JS constraints:** N/A — no JS file is touched at all; this is an `index.html` markup edit only.
- **4-state UX (Loading/Error/Empty/Success):** N/A — this is static chrome (a pane header label), not a data-bound component. §4 above confirms there's no dynamic render function that owns this text, so there's no "state" to model.
- **UI mutex (`executeWithButtonAction`):** N/A — no button, no DB mutation triggered by this change.
- **Zero-refresh:** N/A — no async mutation occurs; nothing to re-invoke after the edit lands (it's live the instant the page reloads, same as any other static-HTML edit).
- **Schema changes:** none. No Supabase table/column/RLS is touched, and per §2, the one adjacent DB-table reference (`socialz_audience`) is unrelated and untouched — so no Master Reference `## Database Schemas` update is triggered either.

## 7. Does this close out `debt/nomenclature-remediation`? (judgment call — not silently decided)

Per-check status after this batch, cross-referenced against the ledger's own "Remaining" note (`tools/SK8Lytz_Bucket_List.md` line 48) and Batch 1-10 history:

| Check | Status entering Batch 11 | Status after Batch 11 | Disposition |
|---|---|---|---|
| N1_GHOST_ID(_PREFIX) | 1 (`packerzAdminRecipeSelect`) | 1 (unchanged — out of this batch's scope) | Deliberately unguarded, tied to a separate `data-prodid` bug (Batch 6/10), re-confirmed twice. Documented permanent exception, not a floor caused by scanner limits. |
| N2_ORPHAN_HANDLER | 0 (resolved Batch 10) | 0 | Closed. |
| **N3_LABEL_DRIFT** | **1 (this finding)** | **0 (this batch)** | **Closed by this fix.** |
| N4_LEGACY_TERM | 84 (fully triaged Batch 8: 61 protected aliases + 21 now-documented + 2 out-of-scope `cc*`) | 84 (unchanged — out of scope) | Documented **permanent floor under the current scanner** (no per-identifier suppression mechanism exists — confirmed empirically in Batch 8). Explicitly assigned to `debt/brand-sweep` (Phase 4) to resolve via gate-scoping, not this task. |
| N5_NEW_NONCONFORMANT_KEY | 0 (resolved Batch 2) | 0 | Closed. |
| N6_UNUSED_CSS | 29 (confirmed live, intentionally kept — Batch 1) | 29 (unchanged — out of scope) | Documented **permanent floor**: these 29 are real scanner false positives (dynamic class construction, third-party defaults) the static scanner can't see — not remediable code debt. |
| N7_DICT_STALE | 0 (CRLF false-positive fixed in `chore/nomenclature-scanner-hardening`) | 0 | Closed. |

**My assessment:** every one of the 7 nomenclature-audit categories has now been individually triaged to either (a) a genuine `0`, or (b) an explicitly documented, evidence-backed permanent floor with a named owner for further action (N4 → `debt/brand-sweep`; N1's single finding and N6's 29 findings → accepted as-is, not deferred to any other task). Batch 11 was the last unaddressed category (N3) and it closes cleanly with zero blast radius. There is no remaining unexamined finding anywhere in this epic's scope.

Given that, I believe `- [ ] debt/nomenclature-remediation` in `tools/SK8Lytz_Bucket_List.md` is a reasonable candidate to mark `[x]` and archive after this batch — its own scope was "triaged remediation," not "reach absolute zero," and Batches 1-11 collectively demonstrate every category has been triaged with evidence, not skipped. `debt/brand-sweep` (Phase 4) remains open as the correct home for the N4 permanent-floor gate-scoping decision and the neogleamz→sk8lytz rename sweep — those were always scoped to Phase 4, not Phase 3, per the epic's own multi-phase description (line 25).

**However**, I'm surfacing rather than deciding this per your instruction: an alternative reading is that "each batch verified via scanner baseline shrink" (the task's own success language) implies the task stays open until someone explicitly declares the shrink effort complete, and closing an epic checkbox is a milestone decision you may want to make deliberately at `/wind-down` rather than have an implementation-planner infer it mid-batch. **Recommendation: mark `[x]` at this batch's completion, archive the epic block per the ledger's own archiving protocol, and open/confirm `debt/brand-sweep` as the successor** — but this is your call at HALT-for-approval, not mine to silently execute.

## Files Touched

- `index.html` — line 3208 only: `<span class="pane-header-title">SOCIALZ AUDIENCE</span>` → `<span class="pane-header-title">ROSTER</span>`. No other lines in this file change.

No other files require edits for this batch (confirmed no Master Reference change needed per §3, no registry/dictionary change needed since they already say ROSTER, no schema change per §6).
