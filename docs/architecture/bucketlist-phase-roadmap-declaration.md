# ADR: Declare a Phase/Batch Roadmap When `/bucketlist` Discovers Scope Explosion

*Whiteboard session — 2026-07-23*

## 1. Context & Objectives

**Business problem:** After completing the Nomenclature Audit Engine epic, the user's experience was "it kept doing phases upon phases for each task" — the sense that scope kept growing reactively rather than being sized once upfront. The initial hypothesis was that `/idea_intake` (the haiku-tier, single-pass idea-logging command) was too shallow to size epic-scale ideas correctly, and needed either automatic footprint triage or a linguistic "is this an epic?" self-check before writing a plan.

**Actual finding (this session):** that hypothesis is false for this specific epic. Git history shows a genuine `/whiteboard_mode` session ran *before* intake (commit `c4fc83b`), producing [docs/architecture/nomenclature-audit-engine.md](nomenclature-audit-engine.md), which already measured the scope correctly: *"Total drift: LARGE (150+ hard findings), systemic across 4 of 6 hubs"* and laid out Phases 0-4 explicitly. `/idea_intake` ran 7 minutes later (commit `8b80e94`) and faithfully logged all 5 phased branches with `[Files:]` tags. The safety valve (whiteboard-first for architecture-scale ideas) was used, and it worked correctly.

**Where the actual pain came from:** Phase 3 of that epic (`debt/nomenclature-remediation`) was *already flagged in the ADR as large* — but its execution inside `/bucketlist` still expanded to 11 sequential batches, discovered and narrated one at a time ("Batch 1/N done," "Batch 2/N done," ...) with no upfront statement of "this will likely take roughly N passes, organized like this." That reactive, batch-by-batch narration — not a sizing failure at intake — is what produced the "phases upon phases" feeling.

**Revised objective:** don't change `/idea_intake` (no evidence it's broken). Instead, fix `/bucketlist`'s execution-time behavior: when a pre-task swarm discovers that a phase's true scope is much bigger than what a single batch can resolve, force it to declare an explicit roadmap of the remaining work up front, instead of only ever describing the current batch and letting the total count emerge organically over many sessions.

## 2. Architectural Overview (Context Level)

This changes exactly one existing pipeline stage: `/bucketlist`'s **Pre-Task Intelligence Swarm** (step 3 of [.claude/commands/bucketlist.md](../../.claude/commands/bucketlist.md)). Nothing about `/idea_intake`, `/whiteboard_mode`, or the ledger's task-injection format changes. The trigger condition is scoped narrowly: only when the implementation-planner's independent verification finds the touch-point count or required-work estimate is an order of magnitude (or otherwise clearly) larger than what a single batch can execute — the same signal that, in the historical batches, was already being noticed and narrated (e.g. Batch 4's discovery that the `cc*` cluster was live, not dead; Batch 6's "the entire packerz cluster" scope reveal) but never turned into a forward-looking statement.

## 3. Industry Standard Validation

**Workflow Tooling Architecture Validator findings:**
- Confirmed `/idea_intake` is pinned haiku specifically because CLAUDE.md classifies it as "mechanical, near-zero reasoning," and its own text (`idea_intake.md:27-29`) explicitly protects "let the user continue working uninterrupted" — an auto-refuse/HALT gate at intake would itself be the interruption it's designed to avoid.
- Any interpretive triage step (grep-count → threshold → refuse) is structurally closer to `security-scout` (pinned **sonnet**) than to a haiku mechanical transform — so bolting real triage onto intake would silently require a tier bump anyway, undermining intake's whole reason for being cheap.
- Confirmed a real, currently-undocumented gap: `/bucketlist`'s parallel-batching logic depends on every logged task declaring an exact `[Files: ...]` set (`idea_intake.md:15,20-21`, `bucketlist.md:16-17`). An epic scaffold with placeholder/unknown files (what Option A/C would produce) has no defined fallback in either file.
- Confirmed Option D fills a genuine, real gap: `bucketlist.md`'s Discovery/Clarification step (lines 41-43) only covers ambiguity; its Single-Task-vs-Multi-Part-Epic classification (step 9) only happens *retroactively* at archive time. Nothing currently declares a roadmap *forward* the moment scope-explosion is discovered.

**Cost & Friction Validator findings:**
- Direct historical evidence: the one true epic in the ledger was already correctly whiteboard-scoped before intake ever touched it (see §1). There is no recoverable case in this ledger of `/idea_intake` mis-sizing a raw pitch — the failure mode being solved for doesn't have a historical instance at the intake layer.
- False-positive stress test: `epic/red-team-audit`, `epic/legacy-code-janitor`, `debt/documentation-consolidation`, `debt/eslint-warnings-sweep` (×2), and both `debt/legacy-audit-*` tasks all use "audit"/"sweep"/"across"/"system-wide" language and all resolved as ordinary single-pass work. A linguistic gate keyed on that vocabulary (Option C) would false-positive on the large majority of legitimately bounded tasks.
- Structural blind spot: grep-based footprint triage (Option A) cannot detect scope for "build a new system" tasks (querying for something that doesn't exist yet returns zero hits) — which is exactly the shape of this epic's Phase 1-2. It would have missed the one real case for a different reason than C's false-positive problem.
- Conclusion: neither front-door option has a validated failure case to fix, and both carry real risk of relocating the failure mode rather than resolving it.

## 4. Design Decisions & Trade-offs

**Decision:** No changes to `/idea_intake`. The evidence does not support Option A (grep-based auto-triage) or Option C (linguistic self-check gate) — both were designed to solve a failure that didn't actually occur at that layer, and both carry structural blind spots (A: can't see unbuilt systems; C: drowns in false positives from ordinary bounded "audit/sweep" tasks) with no historical case validating them.

**Decision:** Amend `/bucketlist.md`'s Pre-Task Intelligence Swarm (step 3) with a new rule: *if the implementation-planner's independent verification finds the true remaining scope is clearly too large for the current batch to resolve, synthesize a short forward-looking roadmap (rough batch/phase grouping, not a precise count) and present it alongside the batch plan at the HALT-for-approval gate — before executing anything — rather than only ever narrating the current batch after the fact.*

**Trade-off accepted:** this doesn't make batch-count estimates accurate (the ADR already called Phase 3 "LARGE" and it still took 11 passes) — it only makes the *shape* of the remaining grind visible earlier, so "there will likely be several more passes, roughly grouped by X/Y/Z" is said once upfront instead of discovered one "Batch N/N" at a time. Given the false-positive/blind-spot risk quantified above, this asymmetric bet (accept imprecise phase estimates in exchange for zero added friction on the 99% of ideas that are genuinely small) is the better fit than adding front-door triage to `/idea_intake`.

**Explicitly out of scope:** re-litigating whether `/whiteboard_mode` → `/idea_intake` handoff strength should be increased. The evidence shows it already worked correctly for the one case that mattered; no changes recommended there either.
