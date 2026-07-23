---
model: sonnet
description: The primary project engine. Automates branching, planning, execution, and documentation for the next item on the Bucket List.
allowed-tools: Bash(git*), Bash(npm*), Bash(npx*), Read, Edit, Write, Grep, Glob
---

# Auto-Branching Execution Workflow

When the user instructs you to start the next task (e.g., "what's next"), you must act as the Lead Engineer and execute this sequence exactly:

1. **Read Status & Parallelization Analysis**:
   - Parse `@tools/SK8Lytz_Bucket_List.md` (use chunking if needed).
   - Identify the very first incomplete item (marked with `- [ ]`).
   - Scan upwards to find the nearest `### Target: <branch-name>` header — that is your `<target-base-branch>`.
   - **Parallelization scan:** Read ALL remaining `- [ ]` tasks in the same `### Target:` block (not just the first).
   - For each task, extract the primary file(s) it modifies — look for markdown file links like `[filename.js:N]` in the description, or a `[Files: ...]` tag if present.
   - Build a **parallel batch**: the largest set of tasks whose file sets share no common files. Tasks that share a file with any other batch member are queued for the next `/bucketlist` pass.
   - **Announce the batch** before spawning any agents: list each task with its file target, mark which run NOW (parallel) and which are QUEUED (next pass). Do not ask for approval on the batch plan — proceed automatically.

2. **Branch Creation**:
   - Extract the specific branch slug for the task.
   - Run `git branch --list <extracted-branch-slug>`. If the branch already exists locally, execute `git checkout <extracted-branch-slug>` to resume it.
   - If the branch does NOT exist, check if `<target-base-branch>` exists. If the target epic branch also does NOT exist, run `git status`. If the active tree has uncommitted modifications, **HALT** and warn the user. If clean, execute `git checkout main; git pull; git checkout -b <target-base-branch>`.
   - Now safely standing on the epic base branch, execute `git checkout -b <extracted-branch-slug>`.
   - **CRITICAL SAFETY RULE**: YOU ARE STRICTLY FORBIDDEN from ever using the `-B` flag inside `git checkout`. Forcing a branch recreation via `-B` wipes out unmerged user commits and destroys local history. Never guess; check if the branch exists before creating.

3. **Pre-Task Intelligence Swarm (MANDATORY — spawn all agents in parallel before writing any code)**:

   Dispatch the following agents simultaneously using the Agent tool in a **single message** — one Agent A + one Agent B per task in the parallel batch, plus one shared Agent C. Use the **named subagents** below (defined in `.claude/agents/`); each carries a pinned model tier via its own frontmatter, so do NOT pass a `model` override unless explicitly noted:

   For **each task `i`** in the parallel batch:
   - **Agent A_i — Touch-Point Mapper** (`subagent_type: explore-mapper` · haiku): Read every file that task `i` will modify or that calls the affected function/component. Map DOM IDs, Supabase table names, module imports, and event-delegator tokens. Return a complete touch-point inventory for that specific task.
   - **Agent B_i — Implementation Planner** (`subagent_type: implementation-planner` · sonnet): Using Agent A_i's map, the task description, CLAUDE.md rules, and the Master Reference, generate a detailed plan for task `i` covering: security (XSS guards, RLS), Vanilla JS constraints (no `var`), 4-state UX, UI mutex for mutations, zero-refresh re-render, and schema changes. Save to `docs/plans/<extracted-branch-slug>-<i>.md`.

   Plus one shared agent for the entire batch:
   - **Agent C — Security Scout** (`subagent_type: security-scout` · sonnet; required for XSS/security tasks): Run `node scripts/xss-audit.js --warn` focused on ALL target files in the batch. Enumerate every violation across all files that the batch must resolve. If no tasks are security-related, skip.

   Once all agents return, synthesize outputs into a **combined batch plan**, then:
   - **Scope-explosion escape valve:** If Agent B_i's independent verification finds a task's true remaining scope is clearly too large for this batch to resolve in full (e.g. the touch-point count is an order of magnitude bigger than the ledger's description, or the plan itself concludes the work cannot complete in one pass), do not silently scope down to "this batch only" without comment. The combined batch plan must include a short forward-looking **Roadmap** section: a rough grouping of the remaining work into likely future batches/phases (not a precise count), stated once here — not narrated reactively batch-by-batch after the fact.
   - **HALT ALL ACTION.** Ask: *"Pre-task intelligence complete for [N] parallel tasks. Review the batch plan above. Type 'proceed' to execute all, or provide feedback."* Do not write code until approved. If a scope-explosion Roadmap is included above, say so explicitly in the prompt — e.g. append: *"This batch is expected to be the first of several; review the roadmap alongside the batch plan before typing 'proceed.'"*

4. **Discovery & Clarification Phase**:
   - If Agent A or B surfaces ambiguities or missing information, **HALT.** Output a numbered list of clarifying questions. Wait for answers before proceeding.
   - If requirements are clear: proceed to Execute.

5. **Execute Work (parallel)**:
   - Once the user types "proceed", dispatch one `implementer` subagent (`subagent_type: implementer` · sonnet) per task in the batch **simultaneously** in a single message. For any task whose target file is **security-critical** (auth, RLS-adjacent, payment/webhook, or a heavy XSS refactor), pass a `model: opus` override on that specific dispatch.
   - Each agent receives its specific approved plan (from Agent B_i) and edits ONLY its designated file(s). Since each agent targets different files, concurrent writes are safe — no worktrees needed.
   - For XSS fixes: each agent uses only the allowed patterns from CLAUDE.md §DOM security and confirms its specific violation line is gone before returning.
   - Wait for all implementation agents to return before proceeding.

6. **Post-Implementation Validation Swarm (MANDATORY — runs ONCE for the entire batch before committing)**:

   Dispatch the following agents simultaneously:

   - **Agent V1 — XSS Validator** (`subagent_type: xss-validator` · sonnet): Run `node scripts/xss-audit.js --warn` on the full codebase. Confirm: (a) every violation across ALL files the batch was responsible for is no longer present, (b) no new violations were introduced. Return a before/after violation count.
   - **Agent V2 — Test + Lint Runner** (`subagent_type: test-lint-runner` · haiku): Run `npm test` and `npx eslint .`. Return: test pass/fail counts, ESLint error/warning counts, and any failures with file:line details.
   - **Agent V3 — Manual Test Guide Generator** (`subagent_type: test-guide-generator` · sonnet): Given all changed files and task descriptions in the batch, generate a combined testing guide using the exact format in CLAUDE.md §Subagent mandates. Cover each surface changed by the batch: happy path, error/edge cases, regression checks, and Supabase DB verification where applicable.

   **HALT if V1 or V2 returns failures.** Present the failures and ask the user whether to fix or abort. Do not commit until both pass (or user explicitly accepts).

7. **Self-Review Report**:
   - Synthesize outputs from V1/V2/V3 into a single "Validation Report":
     - XSS violations removed: N / introduced: 0
     - Tests: N/N pass
     - ESLint: 0 errors, N warnings
     - Code Review: list any security/performance issues noticed during implementation
   - If all clean: state "Validation Passed — ready to commit."

8. **Commit & Sync Phase**:
   - Check if any batch changes affected Supabase schemas, Web Bluetooth logic, or core system architecture.
   - If so, autonomously trigger the *Corporate Memory Synchronization Rule* to update `@tools/SK8Lytz_App_Master_Reference.md`.
   - Stage ALL files changed by the batch (avoid blind `git add .` if there are untracked files).
   - Execute a single commit for the entire batch: `git commit -m "fix(<scope>): [batch] <summary of all tasks fixed>"`

9. **Update Tracking, Archive & Halt**:
   - **LEDGER HYDRATION GATE:** Before modifying the ledger, you MUST execute `git checkout main && git pull origin main && git checkout -` to ensure your local `SK8Lytz_Bucket_List.md` is not stale.
   - Mark **every completed batch task** `- [x]` (not just the first one).
   - **Enforce Archiving Protocol**: Scan the surrounding epic `### Target:` block. If every single item in this Epic is now marked as `[x]`, cut the entire block and paste it under `🗄️ Completed & Archived Epics`. **NEVER DELETE THE RAW TASKS**.
   - If the Epic block was just fully completed and archived, output the appropriate warning:
     - **Single-Task Epic on `main`**: Run `[/ship_it]` → `[/release]`.
     - **Multi-Part Epic on `epic/*`**: Run `[/ship_it]` → `[/finalize_epic]`.
   - **Output the combined Manual Testing Guide from Agent V3** in full — one guide covering all surfaces changed by the batch. Format per CLAUDE.md §Subagent mandates: Browser, Environment, Prerequisites, Happy Path, Error & Edge Cases, Regression Checks, DB Verification.
   - Output the Validation Report summary (XSS before/after counts / tests / lint).
   - Output a confirmation that the branch is ready for `/ship-it`. Do not automatically start the next task.
