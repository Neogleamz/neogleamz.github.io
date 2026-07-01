---
description: The primary project engine. Automates branching, planning, execution, and documentation for the next item on the Bucket List.
allowed-tools: Bash(git*), Bash(npm*), Bash(npx*), Read, Edit, Write, Grep, Glob
---

# Auto-Branching Execution Workflow

When the user instructs you to start the next task (e.g., "what's next"), you must act as the Lead Engineer and execute this sequence exactly:

1. **Read Status**: 
   - Parse `@tools/SK8Lytz_Bucket_List.md` (use chunking if needed).
   - Identify the very first incomplete item (marked with `- [ ]`).
   - Scan upwards from that item to find the nearest section header formatted as `### Target: <branch-name>`. The value inside the backticks is your `<target-base-branch>`.

2. **Branch Creation**:
   - Extract the specific branch slug for the task.
   - Run `git branch --list <extracted-branch-slug>`. If the branch already exists locally, execute `git checkout <extracted-branch-slug>` to resume it.
   - If the branch does NOT exist, check if `<target-base-branch>` exists. If the target epic branch also does NOT exist, run `git status`. If the active tree has uncommitted modifications, **HALT** and warn the user. If clean, execute `git checkout main; git pull; git checkout -b <target-base-branch>`.
   - Now safely standing on the epic base branch, execute `git checkout -b <extracted-branch-slug>`.
   - **CRITICAL SAFETY RULE**: YOU ARE STRICTLY FORBIDDEN from ever using the `-B` flag inside `git checkout`. Forcing a branch recreation via `-B` wipes out unmerged user commits and destroys local history. Never guess; check if the branch exists before creating.

3. **Pre-Task Intelligence Swarm (MANDATORY — spawn all agents in parallel before writing any code)**:

   Dispatch the following agents simultaneously using the Agent tool in a single message:

   - **Agent A — Touch-Point Mapper (Explore):** Read every file that this task will modify or that calls the affected function/component. Map DOM IDs, Supabase table names, module imports, and event-delegator tokens involved. Return a complete touch-point inventory.
   - **Agent B — Implementation Planner (Plan):** Using the touch-point map, the task description, all rules in CLAUDE.md, and the Master Reference, generate a detailed plan covering: security (XSS guards, RLS), Vanilla JS constraints (no frameworks, no `var`), 4-state UX pattern, UI mutex for mutations, zero-refresh re-render, and any schema changes. Save to `docs/plans/<extracted-branch-slug>.md`.
   - **Agent C — Security Scout (always required for XSS/security tasks):** Run `node scripts/xss-audit.js --warn` and enumerate every violation in the target file(s) that this task must resolve. If the task is not security-related, skip this agent.

   Once all agents return, synthesize their outputs, present the plan to the user, and:
   - **HALT ALL ACTION.** Ask: *"Pre-task intelligence complete. Review the plan above. Type 'proceed' to execute, or provide feedback."* Do not write code until approved.

4. **Discovery & Clarification Phase**:
   - If Agent A or B surfaces ambiguities or missing information, **HALT.** Output a numbered list of clarifying questions. Wait for answers before proceeding.
   - If requirements are clear: proceed to Execute.

5. **Execute Work**:
   - Once the user types "proceed", implement exactly as outlined in the approved plan.
   - For XSS fixes: use only the allowed patterns from CLAUDE.md §DOM security. After each file edit, confirm that the specific violation line is gone before moving to the next file.

6. **Post-Implementation Validation Swarm (MANDATORY — spawn all agents in parallel before committing)**:

   Dispatch the following agents simultaneously:

   - **Agent V1 — XSS Validator:** Run `node scripts/xss-audit.js --warn` on the full codebase. Confirm: (a) every violation this task was responsible for is no longer present, (b) no new violations were introduced by the implementation. Return a before/after violation count.
   - **Agent V2 — Test + Lint Runner:** Run `npm test` and `npx eslint .`. Return: test pass/fail counts, ESLint error/warning counts, and any specific failures with file:line details.
   - **Agent V3 — Manual Test Guide Generator:** Given the list of changed files and the task description, generate a fully detailed manual testing guide using the exact format specified in CLAUDE.md §Subagent mandates. Cover: happy path, error/edge cases, regression checks on nearby features, and Supabase DB verification steps.

   **HALT if V1 or V2 returns failures.** Present the failures and ask the user whether to fix or abort. Do not commit until both pass (or user explicitly accepts).

7. **Self-Review Report**:
   - Synthesize outputs from V1/V2/V3 into a single "Validation Report":
     - XSS violations removed: N / introduced: 0
     - Tests: N/N pass
     - ESLint: 0 errors, N warnings
     - Code Review: list any security/performance issues noticed during implementation
   - If all clean: state "Validation Passed — ready to commit."

8. **Commit & Sync Phase**:
   - Check if your changes affected Supabase schemas, Web Bluetooth logic, or core system architecture.
   - If so, autonomously trigger the *Corporate Memory Synchronization Rule* to update `@tools/SK8Lytz_App_Master_Reference.md`.
   - Stage your specific file changes (avoid blind `git add .` if there are untracked files).
   - Execute: `git commit -m "feat(<scope>): complete <extracted-branch-slug>"`

9. **Update Tracking, Archive & Halt**:
   - **LEDGER HYDRATION GATE:** Before modifying the ledger, you MUST execute `git checkout main && git pull origin main && git checkout -` to ensure your local `SK8Lytz_Bucket_List.md` is not stale.
   - Change the checkbox for this item to `- [x]`.
   - **Enforce Archiving Protocol**: Scan the surrounding epic `### Target:` block. If every single item in this specific Epic is now marked as `[x]` (or if it was a single-task Epic to begin with), you MUST autonomously cut the entire block (the `### Target:` header, the `*(Epic...)*` subheader, and all the `[x]` tasks) and paste it at the absolute bottom of the file under the `🗄️ Completed & Archived Epics` section to keep the active list clean. **NEVER DELETE THE RAW TASKS**. The Bucket List is an immutable ledger.
   - If the Epic block was just fully completed and archived, output the appropriate warning:
     - **Single-Task Epic on `main`**: Run `[/ship_it]` → `[/release]`.
     - **Multi-Part Epic on `epic/*`**: Run `[/ship_it]` → `[/finalize_epic]`.
   - **Output the Manual Testing Guide from Agent V3** in full — do not abbreviate it. It must follow the format in CLAUDE.md §Subagent mandates exactly: Browser, Environment, Prerequisites, Happy Path (numbered steps), Error & Edge Cases, Regression Checks, DB Verification.
   - Output the Validation Report summary (XSS / tests / lint counts).
   - Output a confirmation that the branch is ready for `/ship-it`. Do not automatically start the next task.
