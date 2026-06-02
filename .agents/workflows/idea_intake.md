---
name: idea_intake
description: "Triggers when the user requests to log a new idea, feature, or bug to the backlog without interrupting their current workflow."
trigger: "/idea_intake, add this idea, add to bucket list, log this task"
---

# The Passive Idea Intake Protocol

When the user requests to log an idea or task for later, you must execute the following sequence to securely record the idea without hijacking their Git context:

1. **The Intercept**: Acknowledge the request by stating: *"Logging idea to the Bucket List..."*
2. **Mandatory Pre-Planning Gate**:
   - Before logging the task, you MUST generate a highly detailed, fully documented Implementation Plan artifact outlining the technical approach (covering security, flexbox UI, performance, and Vanilla JS standards).
   - Write this plan to `docs/plans/<slug>.md`.
3. **Triaging & Injection**: 
   - Analyze the request. If it relates to an active Epic, assign it there. Otherwise, assign it to `### Target: main`.
   - Inject the task as a `- [ ]` markdown item into @/tools/SK8Lytz_Bucket_List.md.
   - **Crucial Linkage**: The new task line MUST explicitly reference the pre-compiled plan (e.g., `- [ ] feat/xxx : **Feature Name** - Description. (Plan: [docs/plans/feat/xxx.md](file:///d:/GitHub/neogleamz.github.io/docs/plans/feat/xxx.md))`).

4. **The Background Sync**:
   - Immediately execute `git add tools/SK8Lytz_Bucket_List.md docs/plans/<slug>.md`
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
