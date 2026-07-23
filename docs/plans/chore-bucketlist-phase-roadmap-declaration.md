# Implementation Plan: chore/bucketlist-phase-roadmap-declaration

## Task Summary
Amend [.claude/commands/bucketlist.md](../../.claude/commands/bucketlist.md)'s Pre-Task Intelligence Swarm (step 3) so that when the implementation-planner discovers a phase's true remaining scope is far bigger than one batch can resolve, it must state a forward-looking roadmap (rough batch/phase grouping, not a precise count) at the HALT-for-approval gate — before any code is written — instead of only narrating "Batch N/N" reactively after each pass.

## Source
Derived from ADR: [docs/architecture/bucketlist-phase-roadmap-declaration.md](../architecture/bucketlist-phase-roadmap-declaration.md) (`/whiteboard_mode` session, 2026-07-23).

## Background evidence (from the ADR)
- The Nomenclature Audit Engine epic was correctly sized by `/whiteboard_mode` *before* `/idea_intake` ever logged it — commit `c4fc83b` (whiteboard ADR, measured "LARGE, systemic across 4 of 6 hubs," Phases 0-4 declared) then commit `8b80e94` (`/idea_intake` log), 7 minutes apart. **No changes needed to `/idea_intake`** — it faithfully captured an already-correctly-sized plan.
- Phase 3 of that epic (`debt/nomenclature-remediation`) was already flagged "LARGE" in the ADR, but its execution inside `/bucketlist` still expanded to 11 sequential batches, each narrated only after the fact ("Batch N/N done") with no upfront statement that more passes were coming or how they'd likely be grouped.
- Two alternative fixes (front-door grep-based triage, front-door linguistic self-check gate inside `/idea_intake`) were evaluated and rejected: neither has a validated historical failure case at the intake layer, and both carry structural blind spots (grep can't detect scope for systems that don't exist yet; a linguistic gate keyed on "audit/sweep/across" words would false-positive on `epic/red-team-audit`, `epic/legacy-code-janitor`, `debt/documentation-consolidation`, `debt/eslint-warnings-sweep`, and both `debt/legacy-audit-*` tasks — all genuinely bounded, single-pass work in the existing ledger).

## Exact Change — `.claude/commands/bucketlist.md`

**Location:** Step 3, "Pre-Task Intelligence Swarm (MANDATORY — spawn all agents in parallel before writing any code)" — insert a new sub-rule after the existing Agent B_i (Implementation Planner) bullet and before the "Once all agents return, synthesize..." line.

**New text to insert:**

> **Scope-explosion escape valve:** If Agent B_i's independent verification finds the task's true remaining scope is clearly too large for this batch to resolve in full (e.g. the touch-point count is an order of magnitude bigger than the ledger's description, or the plan itself concludes the work cannot complete in one pass), it must not silently scope itself down to "this batch only" without comment. The synthesized batch plan presented at the HALT gate must then include a short forward-looking **Roadmap** section: a rough grouping of the remaining work into likely future batches/phases (not a precise count), stated once, before any code is written — not narrated reactively batch-by-batch after the fact.

**Also update** the HALT prompt template (currently: *"Pre-task intelligence complete for [N] parallel tasks. Review the batch plan above. Type 'proceed' to execute all, or provide feedback."*) — append a conditional clause: *"(If a scope-explosion Roadmap is included above, this batch is expected to be the first of several — review the roadmap alongside the batch plan.)"*

## Files Touched
- `.claude/commands/bucketlist.md` — single amendment (~2 short insertions within step 3's existing text; no other steps, no other files).

## Security / Schema / UX Checklist (all N/A)
- XSS guards: N/A — this is a Markdown command-definition file, never parsed by the running application.
- RLS / schema: N/A — no Supabase table/column/policy touched.
- Vanilla JS constraints: N/A — no JS written or edited.
- 4-state UX / UI mutex / zero-refresh: N/A — no render surface, no button, no mutation.
- Mermaid Architectural Blueprint (Topological integrity rule): N/A — no button/modal/UI element created, deleted, or moved.

## Risk
Very low. Single markdown file, additive text only, no behavior change to any other command or to `/bucketlist`'s existing steps 1-2 and 4-9. The change only affects what `/bucketlist` prints at its existing HALT gate in the case scope turns out to be much bigger than declared — it does not change when or whether that gate fires.
