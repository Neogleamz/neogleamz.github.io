---
model: haiku
description: Triggers when the user requests to log a new idea, feature, or bug to the backlog without interrupting their current workflow. (triggers: /idea_intake, add this idea, add to bucket list, log this task)
allowed-tools: Bash(git*), Bash(npm*), Bash(npx*), Read, Edit, Write, Grep, Glob
---

# The Passive Idea Intake Protocol

When the user requests to log an idea or task for later, you must execute the following sequence to securely record the idea without hijacking their Git context:

1. **The Intercept**: Acknowledge the request by stating: *"Logging idea to the Bucket List..."*
2. **Mandatory Pre-Planning Gate**:
   - Before logging the task, you MUST check if a High-Level Architectural Document was generated during a preceding `/whiteboard_mode` session (e.g., at `docs/architecture/<slug>.md`).
   - If it exists, use that documentation to generate a highly detailed, fully documented Implementation Plan artifact. The plan must translate the high-level hierarchy and agent validations into strict technical approaches (covering security, flexbox UI, performance, and Vanilla JS standards). If no architectural doc exists, build the Implementation Plan from scratch based on the user's prompt.
   - **Files Touched (required):** The plan MUST include a `## Files Touched` section listing every file the task will modify (e.g., `assets/js/barcodz-module.js`, `index.html`). This is used by `/bucketlist` to automatically group tasks into parallel execution batches.
   - Write this Implementation Plan to `docs/plans/<slug>.md`.
3. **Triaging & Injection**: 
   - Analyze the request. If it relates to an active Epic, assign it there. Otherwise, assign it to `### Target: main`.
   - Inject the task as a `- [ ]` markdown item into @tools/SK8Lytz_Bucket_List.md.
   - **Crucial Linkage**: The new task line MUST explicitly reference the pre-compiled plan AND append a `[Files: ...]` tag listing every file from the plan's `## Files Touched` section. Format: `- [ ] feat/xxx : **Feature Name** - Description. (Plan: [docs/plans/feat/xxx.md](docs/plans/feat/xxx.md)) [Files: assets/js/foo-module.js, index.html]`
   - The `[Files:]` tag is machine-readable metadata that `/bucketlist` uses to auto-group non-overlapping tasks into parallel execution batches. Always include it — even for single-file tasks.

4. **The Background Sync**:
   - Immediately execute `git add tools/SK8Lytz_Bucket_List.md docs/plans/ docs/architecture/`
   - Execute `git commit -m "chore(ledger): [/idea_intake] log new task and implementation plan"`
   - This safely tracks the new idea and its plan within their active branch history.
5. **Hard Stop (Context Preservation)**:
   - Provide a brief confirmation using the mandatory output format below.
   - **CRITICAL RULE**: You are strictly forbidden from executing `git checkout`, `git stash`, `git merge`, or changing the current working tree context. Let the user continue working uninterrupted.

---

## 🛑 MANDATORY OUTPUT FORMAT (ALL MODELS MUST FOLLOW)

> [!CAUTION]
> **STRICT LINKING MANDATE:** You MUST NEVER surround file paths with backticks (like ile.md). You MUST ALWAYS use standard Markdown hyperlink syntax so the user can natively click them (e.g., [file.md](file:///absolute/path/to/file.md)).

You MUST render the confirmation as a compact card. Do NOT output a plain text paragraph. Every model (Claude, Gemini, GPT) must produce this exact structure:

Render a `> [!NOTE]` block:
```
> [!NOTE]
> 📥 **Idea & Plan Logged** — `<branch-slug>`
> - **Task:** <1-sentence description>
> - **Assigned To:** `### Target: <section>`
> - **Plan Generated:** `docs/plans/<slug>.md`
> - **Commit:** `abc1234` — `chore(ledger): [/idea_intake] log new task and implementation plan`
> - **Context Preserved:** ✅ No branch changes made
```
