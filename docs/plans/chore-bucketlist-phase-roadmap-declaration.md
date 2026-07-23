# Implementation Plan: chore/bucketlist-phase-roadmap-declaration

## Task Summary
Amend [.claude/commands/bucketlist.md](../../.claude/commands/bucketlist.md)'s Pre-Task Intelligence Swarm (step 3) so that when Agent B_i (the implementation-planner) discovers a task's true remaining scope is far bigger than one batch can resolve, the synthesized batch plan presented at the HALT-for-approval gate must include a short forward-looking **Roadmap** section (rough future batch/phase grouping, not a precise count) — instead of only narrating "Batch N/N" reactively after each pass, as happened historically across 11 batches of the already-archived `debt/nomenclature-remediation` epic.

## Source
Derived from ADR: [docs/architecture/bucketlist-phase-roadmap-declaration.md](../architecture/bucketlist-phase-roadmap-declaration.md) (`/whiteboard_mode` session, 2026-07-23).

## Background evidence (from the ADR)
- The Nomenclature Audit Engine epic was correctly sized by `/whiteboard_mode` *before* `/idea_intake` ever logged it — commit `c4fc83b` (whiteboard ADR, measured "LARGE, systemic across 4 of 6 hubs," Phases 0-4 declared) then commit `8b80e94` (`/idea_intake` log), 7 minutes apart. **No changes needed to `/idea_intake`** — it faithfully captured an already-correctly-sized plan.
- Phase 3 of that epic (`debt/nomenclature-remediation`) was already flagged "LARGE" in the ADR, but its execution inside `/bucketlist` still expanded to 11 sequential batches, each narrated only after the fact ("Batch N/N done") with no upfront statement that more passes were coming or how they'd likely be grouped.
- Two alternative fixes (front-door grep-based triage, front-door linguistic self-check gate inside `/idea_intake`) were evaluated and rejected: neither has a validated historical failure case at the intake layer, and both carry structural blind spots (grep can't detect scope for systems that don't exist yet; a linguistic gate keyed on "audit/sweep/across" words would false-positive on `epic/red-team-audit`, `epic/legacy-code-janitor`, `debt/documentation-consolidation`, `debt/eslint-warnings-sweep`, and both `debt/legacy-audit-*` tasks — all genuinely bounded, single-pass work in the existing ledger).

## Verification against the live file (re-read 2026-07-23, this session)
Re-read `.claude/commands/bucketlist.md` in full before touching anything. Confirmed the following current line numbers and exact text (these supersede any line numbers quoted elsewhere, including the ADR):

```
27  3. **Pre-Task Intelligence Swarm (MANDATORY — spawn all agents in parallel before writing any code)**:
28
29     Dispatch the following agents simultaneously using the Agent tool in a **single message** — one Agent A + one Agent B per task in the parallel batch, plus one shared Agent C. Use the **named subagents** below (defined in `.claude/agents/`); each carries a pinned model tier via its own frontmatter, so do NOT pass a `model` override unless explicitly noted:
30
31     For **each task `i`** in the parallel batch:
32     - **Agent A_i — Touch-Point Mapper** (`subagent_type: explore-mapper` · haiku): ...
33     - **Agent B_i — Implementation Planner** (`subagent_type: implementation-planner` · sonnet): ... Save to `docs/plans/<extracted-branch-slug>-<i>.md`.
34
35     Plus one shared agent for the entire batch:
36     - **Agent C — Security Scout** (`subagent_type: security-scout` · sonnet; required for XSS/security tasks): ...
37
38     Once all agents return, synthesize outputs into a **combined batch plan**, then:
39     - **HALT ALL ACTION.** Ask: *"Pre-task intelligence complete for [N] parallel tasks. Review the batch plan above. Type 'proceed' to execute all, or provide feedback."* Do not write code until approved.
```

**Correction to the original draft of this plan:** the original draft described the insertion point as "after the existing Agent B_i bullet and before the 'Once all agents return, synthesize...' line." That undersold the structure — Agent B_i (line 33) is followed by a *separate* "Plus one shared agent" sub-block containing Agent C (lines 35-36) before the synthesis line (line 38) is reached. Inserting immediately after line 33 would wedge the new rule awkwardly between the per-task agents and the shared Agent C, which is the wrong place: the rule is about what the **synthesized combined batch plan** must contain, so it belongs after synthesis is described, not before Agent C is even introduced.

**Corrected insertion point:** insert as a new bullet immediately after line 38 ("Once all agents return, synthesize outputs into a **combined batch plan**, then:") and immediately before the existing "HALT ALL ACTION" bullet (line 39). This reads naturally as part of the "then: [do this, then do this]" sequence and unambiguously scopes the rule to the synthesis step, before the halt-and-ask happens.

## Exact Change — `.claude/commands/bucketlist.md`

**1. New bullet to insert** between line 38 and line 39 (i.e. the first bullet under "Once all agents return, synthesize outputs into a **combined batch plan**, then:"):

> - **Scope-explosion escape valve:** If Agent B_i's independent verification finds a task's true remaining scope is clearly too large for this batch to resolve in full (e.g. the touch-point count is an order of magnitude bigger than the ledger's description, or the plan itself concludes the work cannot complete in one pass), do not silently scope down to "this batch only" without comment. The combined batch plan must include a short forward-looking **Roadmap** section: a rough grouping of the remaining work into likely future batches/phases (not a precise count), stated once here — not narrated reactively batch-by-batch after the fact.

**2. Amend the existing HALT bullet** (current line 39) by appending one conditional sentence to the end (after "Do not write code until approved."):

> *If a scope-explosion Roadmap is included above, say so explicitly in the prompt — e.g. append: "This batch is expected to be the first of several; review the roadmap alongside the batch plan before typing 'proceed'."*

Resulting bullet (line 39, amended):

> - **HALT ALL ACTION.** Ask: *"Pre-task intelligence complete for [N] parallel tasks. Review the batch plan above. Type 'proceed' to execute all, or provide feedback."* Do not write code until approved. If a scope-explosion Roadmap is included above, say so explicitly in the prompt — e.g. append: *"This batch is expected to be the first of several; review the roadmap alongside the batch plan before typing 'proceed.'"*

Net effect: two edits inside step 3, both within lines 38-39 of the current file (one new bullet, one amended bullet). No other step (1, 2, 4-9) is touched. No agent definitions in `.claude/agents/` change — Agent B_i keeps its existing `implementation-planner` subagent_type and sonnet tier; this only adds a behavioral rule to what it's asked to check and what the orchestrating command does with that output.

## Design-decision fidelity check (against the ADR)
- Confirmed: no changes proposed to `/idea_intake` or `/whiteboard_mode`. The ADR's rejection of Option A (grep-based triage) and Option C (linguistic self-check gate) is preserved as-is; this plan does not reopen that decision.
- Confirmed: the trigger is scoped to Agent B_i's *interpretive* judgment (sonnet-tier reasoning during real per-task planning), not a mechanical keyword or line-count gate — consistent with the ADR's Industry Standard Validation finding that real triage logic is sonnet-shaped, not haiku-shaped, and consistent with why the ADR rejected bolting triage onto haiku-tier `/idea_intake`.
- Confirmed: the trigger condition text ("clearly too large... order of magnitude bigger... or the plan itself concludes the work cannot complete in one pass") is deliberately concrete and high-bar, not a vague "sounds big" heuristic. This matters because the ADR's own false-positive stress test showed vocabulary-based triggers (words like "audit"/"sweep"/"across") wrongly flag genuinely bounded tasks (`epic/red-team-audit`, `debt/eslint-warnings-sweep`, both `debt/legacy-audit-*` tasks, etc.). The chosen wording does not key on vocabulary at all — it keys on Agent B_i's own quantitative/qualitative conclusion during real planning, so it inherits none of that false-positive surface.
- Risk noted, not re-litigated (per task instructions): there is a milder, structurally different version of the same asymmetric risk — an overly cautious Agent B_i could over-declare "Roadmap" sections on tasks that are merely *somewhat* larger than expected but still one-batch-resolvable. This is a judgment-call risk inherent to any sonnet-tier discretion, not a re-triggering of the rejected front-door options (there is no historical evidence of it happening, and the wording's two concrete anchors — "order of magnitude" and "plan concludes it cannot complete in one pass" — are deliberately narrower than "this feels big"). The ADR already accepted this class of trade-off deliberately (asymmetric bet: accept some imprecision in exchange for zero added friction on ordinary tasks). No wording change needed to shrink this further; flagging it here only for the record, not as a HALT-blocking ambiguity.

## CLAUDE.md side-effect check
- `.claude/commands/bucketlist.md` frontmatter `model: sonnet` (line 2) is unaffected — this change adds a behavioral rule to existing step 3 content; it does not add a new command, subagent, or invocation path that would need its own tier classification.
- CLAUDE.md §Model & Effort Tiering's subagent list is unaffected: `implementation-planner` stays pinned sonnet in `.claude/agents/`; this change doesn't touch that file.
- CLAUDE.md §Subagent mandates → "Pre-task research swarm (required for every bucket list task)" (CLAUDE.md lines 125-131) is a generic, high-level restatement of the swarm concept for any bucket-list task, not a verbatim mirror of `/bucketlist`'s own step-3 wording — it doesn't currently reference "Batch N/N" narration or roadmap concepts either way, so it isn't rendered inaccurate by this change. **No CLAUDE.md edit required.**

## Files Touched
- `.claude/commands/bucketlist.md` — single amendment (one new bullet + one amended bullet, both within existing step 3, lines 38-39 of the current file; no other steps, no other files).

## Security / Schema / UX Checklist (all N/A)
- XSS guards: N/A — this is a Markdown command-definition file, never parsed or rendered by the running application (no `innerHTML`/`insertAdjacentHTML`/DOM sinks involved).
- RLS / schema: N/A — no Supabase table/column/policy touched.
- Vanilla JS constraints: N/A — no JS written or edited.
- 4-state UX / UI mutex / zero-refresh: N/A — no render surface, no button, no mutation.
- Mermaid Architectural Blueprint (Topological integrity rule): N/A — no button/modal/UI element created, deleted, or moved.

## Risk
Very low. Single markdown file, additive text only (one new bullet, one amended bullet), no behavior change to any other command, to `/bucketlist`'s existing steps 1-2 and 4-9, or to any named subagent's own definition/model tier. The change only affects what `/bucketlist` prints at its existing HALT gate in the case scope turns out to be much bigger than declared — it does not change when or whether that gate fires, and does not add any new gate.

## Clarifying questions
None. Requirements, insertion point, and exact wording are all confirmed against the live file; no ambiguity blocks implementation.
