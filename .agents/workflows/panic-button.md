---
name: panic_button
description: "Triggers a strict read-only diagnostic mode for when the project is broken but the user doesn't know why."
trigger: "/panic, PANIC, everything is broken, emergency"
---

# Panic Button (Emergency Triage Workflow)

When the user invokes `/panic` (or says "PANIC", "everything is broken", or "emergency"), you must immediately enter Crisis Management Mode.

1. **Strict Read-Only (Halt All Edits)**: You are strictly forbidden from writing new feature code, modifying `@/tools/SK8Lytz_Bucket_List.md`, or attempting to write a "quick fix" patch. You are now a Read-Only Diagnostic tool.
2. **Situation Assessment**:
   - Use `run_command` to execute `git status`.
   - Use `run_command` to execute `git log -3 --oneline` to see the last three actions.
   - Ask the user to paste the exact error output from their browser console, or describe exactly what is visually broken.
3. **The Safe Escape Route**: 
   - Based on the Git status and the user's error logs, provide the user with the exact commands to safely abort their current action or fix the state (e.g., `git merge --abort`, or stepping through a merge conflict).
   - Explain exactly what these commands will do *before* the user runs them. Do not execute destructive commands yourself.
4. **Hold State**: Do not exit this read-only triage state until the user explicitly types "Crisis Averted" or triggers the `/abort` workflow to nuke the branch.

---

## 🛑 MANDATORY OUTPUT FORMAT (ALL MODELS MUST FOLLOW)

> [!CAUTION]
> **STRICT LINKING MANDATE:** You MUST NEVER surround file paths with backticks (like ile.md). You MUST ALWAYS use standard Markdown hyperlink syntax so the user can natively click them (e.g., [file.md](file:///absolute/path/to/file.md)).


When presenting the Situation Assessment (Steps 2-3), you MUST render the following structured output. Do NOT output a plain text paragraph. Every model (Claude, Gemini, GPT) must produce this exact structure:

### 🚨 PANIC — Emergency Triage Report

#### Situation Assessment Card
Render a compact metadata table:
```
| Field | Value |
|---|---|
| 🌿 Current Branch | `<branch name>` |
| 🌳 Working Tree | Clean / ⚠️ N uncommitted files |
| 🔖 Last 3 Commits | `abc1234` — msg1 / `def5678` — msg2 / `ghi9012` — msg3 |
| 🔀 Merge State | Normal / ⚠️ MERGE IN PROGRESS / ⚠️ REBASE IN PROGRESS |
```

#### 🔴 Diagnosed Problem
Render a `> [!CAUTION]` block explaining the most likely root cause based on Git state analysis.

#### 🛟 Safe Escape Routes
Render each escape option as a `> [!IMPORTANT]` block containing:
- The exact command(s) to run
- What the command will do (in plain English)
- What data might be lost (if any)

Example:
```
> [!IMPORTANT]
> **Option 1: Abort the merge**
> Command: `git merge --abort`
> Effect: Reverts the working tree to the state before the merge started. No committed work is lost.
> Risk: None — this is completely safe.
```

#### 🔒 Read-Only Lock Reminder
Render a `> [!NOTE]` block: "I am in **Read-Only Crisis Mode**. I will not edit any files until you type **'Crisis Averted'** or invoke `/abort`."