# Implementation Plan — Agent Model & Effort Tiering

**Branch:** `chore/agent-model-tiering`
**Type:** Infrastructure / Agent-config optimization
**Origin:** `/idea_intake` — 2026-07-01 discussion (model: Opus 4.8)
**Strategy chosen:** **Balanced** tiering, implemented via **frontmatter `model:` pins + named `.claude/agents/` subagents**

---

## Problem Statement

No command, skill, or subagent in `.claude/` declares a `model:`. Every workflow therefore runs on the ambient session model (`/model`), and every subagent a workflow spawns inherits the parent or defaults. Consequences:

- Mechanical checklist commands (`/save-point`, `/status-update`, `/gitcleanup`) burn whatever tier the session is on — currently Opus 4.8.
- `/bucketlist` fans out Explore + Plan + Security-Scout + N implementers + 3 validators with **zero per-role model control** — the highest-frequency, highest-parallelism spend in the system is unmanaged.
- No `.claude/agents/` directory exists, so swarm dispatches use generic built-in agent types with no pinned tier.

## Goal

Assign every workflow and every recurring subagent role a deliberate model tier under the **Balanced** philosophy:

| Tier | Model | When |
|---|---|---|
| Mechanical | `haiku` | Deterministic git/file/checklist ops, text transforms |
| Structured judgment | `sonnet` | Gate-driven workflows needing diff/pass-fail judgment |
| Deep / adversarial | `opus` | Creative, critical, architecture, or security reasoning |

---

## Critical Constraint — Entry-Point Fan-Out

The `model:` that governs a slash command is set by **the file the user actually invokes**, not the canonical file it delegates to. Three entry points can launch the same workflow:

1. Canonical command — `.claude/commands/ship-it.md`
2. Alias command — `.claude/commands/ship_it.md` (delegates to canonical)
3. Skill — `.claude/skills/ship-it/SKILL.md` (auto-triggers, delegates to canonical)

**The `model:` pin must be added to ALL THREE entry-point files for each workflow**, or invoking the alias/skill silently runs on the wrong tier. Alias/skill files currently carry only `description:` (aliases) or `name:`+`description:` (skills) — we add `model:` alongside, without altering their delegation body.

---

## Tier Assignments

### 🟢 Mechanical → `model: haiku`
| Workflow | Files to pin (command + alias + skill) |
|---|---|
| save-point | `commands/save-point.md`, `skills/save-point/SKILL.md` |
| gitcleanup | `commands/gitcleanup.md` |
| silent-release | `commands/silent-release.md`, `commands/release_silent.md`, `skills/silent-release/SKILL.md` |
| status-update | `commands/status-update.md`, `commands/status_update.md`, `skills/status-update/SKILL.md` |
| active_context_lock | `commands/active_context_lock.md`, `skills/active_context_lock/SKILL.md` |
| echo_protocol | `commands/echo_protocol.md` |
| finalize_epic | `commands/finalize_epic.md` |
| schema_diff | `commands/schema_diff.md` |
| idea_intake (log step) | `commands/idea_intake.md`, `commands/intake.md`, `commands/zero_bypass_intake.md`, `skills/idea_intake/SKILL.md` |
| jargon_brake | `commands/jargon_brake.md`, `skills/jargon_brake/SKILL.md` |

### 🟡 Structured judgment → `model: sonnet`
| Workflow | Files to pin |
|---|---|
| ship-it | `commands/ship-it.md`, `commands/ship_it.md`, `skills/ship-it/SKILL.md` |
| release-manager | `commands/release-manager.md`, `commands/release.md`, `skills/release-manager/SKILL.md` |
| wind-down | `commands/wind-down.md`, `commands/wind_down.md`, `skills/wind-down/SKILL.md` |
| bucketlist | `commands/bucketlist.md`, `skills/bucketlist/SKILL.md` |
| dependency_diet | `commands/dependency_diet.md` |
| tech-debt-janitor | `commands/tech-debt-janitor.md`, `skills/tech-debt-janitor/SKILL.md` |
| legacy-audit | `commands/legacy-audit.md`, `commands/legacy_audit.md` |
| health_check | `commands/health_check.md` |
| ui_xray | `commands/ui_xray.md` |
| supabase_sync | `commands/supabase_sync.md`, `commands/supabase_schema_sync.md` |
| test_driven_development | `commands/test_driven_development.md` |
| isolated-test | `commands/isolated-test.md`, `commands/isolated_test_and_verify.md` |
| simulated-user | `commands/simulated-user.md`, `commands/simulate_ux.md`, `skills/simulated-user/SKILL.md` |
| product_alignment | `commands/product_alignment.md`, `commands/product_alignment_check.md` |
| teamwork_preview | `commands/teamwork_preview.md` |

### 🔴 Deep / adversarial → `model: opus`
| Workflow | Files to pin |
|---|---|
| brainstorm | `commands/brainstorm.md` |
| whiteboard_mode | `commands/whiteboard_mode.md` |
| devils-advocate | `commands/devils-advocate.md`, `commands/devils_advocate.md` |
| red_team | `commands/red_team.md`, `skills/red_team/SKILL.md` |
| product_teardown | `commands/product_teardown.md` |
| debug-drill | `commands/debug-drill.md`, `commands/debug_drill.md` |
| bug-hunter | `commands/bug-hunter.md`, `commands/bug_hunter.md`, `skills/bug-hunter/SKILL.md` |
| panic-button | `commands/panic-button.md`, `commands/panic_button.md`, `skills/panic-button/SKILL.md` |
| meta_evolution | `commands/meta_evolution.md` |

### ⚠️ Judgment-call (resolve during execution)
- **rubber_duck / rubber_duck_eli5 / skill** — ELI5 re-explanation leans Mechanical (`haiku`), but rubber-ducking to surface bugs leans Structured (`sonnet`). **Proposed: `haiku`** (it's an explanation aid, not a debugger — `/debug-drill` and `/bug-hunter` own real debugging). Confirm at execution.

---

## Named Subagents (new `.claude/agents/*.md`)

Create pinned-model definitions so swarm dispatches stop inheriting the parent tier. Each file: `---\nname: <n>\ndescription: <when to use>\nmodel: <tier>\n---` + role prompt.

| Agent file | Model | Role (used by) |
|---|---|---|
| `.claude/agents/explore-mapper.md` | `haiku` | Touch-point mapping / file reading (bucketlist Agent A, teamwork_preview) |
| `.claude/agents/test-lint-runner.md` | `haiku` | Runs `npm test` + `npx eslint .`, reports counts (bucketlist V2) |
| `.claude/agents/security-scout.md` | `sonnet` | Runs `node scripts/xss-audit.js --warn`, enumerates violations (bucketlist Agent C) |
| `.claude/agents/implementation-planner.md` | `sonnet` | Generates detailed implementation plans (bucketlist Agent B) |
| `.claude/agents/xss-validator.md` | `sonnet` | Before/after XSS violation diff (bucketlist V1) |
| `.claude/agents/test-guide-generator.md` | `sonnet` | Manual testing guide generation (bucketlist V3) |
| `.claude/agents/implementer.md` | `sonnet` | Default implementation agent; **dispatch-site `model: opus` override for security-critical files** (bucketlist Execute) |

Then update the prose in `bucketlist.md`, `teamwork_preview.md`, and `red_team.md` to dispatch these **named** agents instead of the generic `Explore`/`Plan`/`general-purpose` types.

---

## Files Touched (summary)

- **~40 command files** in `.claude/commands/` — add `model:` frontmatter line
- **16 skill files** in `.claude/skills/*/SKILL.md` — add `model:` frontmatter line
- **7 new agent files** in `.claude/agents/` — create with pinned models
- **3 orchestrator command bodies** (`bucketlist.md`, `teamwork_preview.md`, `red_team.md`) — reprose to reference named agents
- **CLAUDE.md** — add a `## Model & Effort Tiering` section documenting the taxonomy so future command authors pick a tier
- **tools/SK8Lytz_App_Master_Reference.md** — optional: note the agent-tiering convention

## Execution Approach

1. Batch 1 (mechanical, no overlap): add `model:` to all Mechanical-tier files.
2. Batch 2: Structured-tier files.
3. Batch 3: Opus-tier files.
4. Batch 4: create the 7 `.claude/agents/` definitions.
5. Batch 5: reprose the 3 orchestrators to call named agents.
6. Document in CLAUDE.md.
7. Restart Claude Code (new agent files + frontmatter need a picker/config reload — see `[[feedback-command-picker-restart]]`).

## Validation

- Grep `^model:` across `.claude/` → confirm every command/skill/agent has exactly one tier.
- Confirm no alias/skill entry point was missed (each canonical's twins share its tier).
- Sanity: invoke one command per tier and confirm it reports the intended model.
- No app code touched → `npm test` / `xss-audit` unaffected (regression-safe).

## Risks / Notes

- **Alias drift** is the main failure mode — mitigated by the per-workflow file lists above.
- **Session override still wins?** Verify whether an explicit `/model` session setting overrides command frontmatter or vice-versa; document the precedence in CLAUDE.md so behavior is predictable.
- **Fable 5** is available but omitted from the Balanced tiers; revisit if a creative-writing workflow emerges.
- This is config-only; zero runtime/app impact, fully reversible via git.
