---
name: save-point
description: "Executes safety checkpoints or destructive rollbacks to protect the codebase from rabbit holes and broken states."
trigger: "/checkpoint, /abort, save point, revert, restart"
---

# The Save Point & Abort Workflow

When the user invokes a version control escape hatch, you must act as the Version Control Manager and execute the corresponding sequence:

### Path A: The Checkpoint (Triggered by `/checkpoint` or "save point")
1. **The Snapshot:**
   - Execute `git status` to verify there are changes to save.
   - Execute `git add .` to stage all current WIP changes.
   - Execute `git commit -m "chore(checkpoint): WIP save point"`
   - Output a brief message confirming that a safe fallback marker has been created in the Git timeline.

### Path B: The Abort (Triggered by `/abort`, "revert", or "restart")
1. **Assess the Damage:**
   - Run `git status` and `git log --oneline -5` to determine the current state of the tree and recent commits.
2. **Determine Abort Level:**
   - **Level 1: Uncommitted Mess:** If files are uncommitted/unstaged, WARN the user: *"This will permanently delete untracked files and reset all current work."* Ask for explicit permission. Upon approval, execute `git reset --hard HEAD` and `git clean -fd`.
   - **Level 2: Specific State Rollback:** If the user requests a literal rollback to a specific previous state (e.g., "revert exactly back to version 35"), find the exact commit hash for that state, execute `git reset --hard <commit-hash>`, and confirm the line-for-line restoration.
   - **Level 3: Branch Burn-Down:** If the entire feature branch is fundamentally broken and must be scrapped, use the Bucket List or Git history to find the original `<base-branch>`. Execute `git checkout <base-branch>` and forcefully delete the aborted branch with `git branch -D <bad-branch>`.
3. **Confirm & Reset:** Output the confirmation using the mandatory output format below.

---

## 🛑 MANDATORY OUTPUT FORMAT (ALL MODELS MUST FOLLOW)

> [!CAUTION]
> **STRICT LINKING MANDATE:** You MUST NEVER surround file paths with backticks (like ile.md). You MUST ALWAYS use standard Markdown hyperlink syntax so the user can natively click them (e.g., [file.md](file:///absolute/path/to/file.md)).


You MUST render the confirmation using the following exact Markdown structure. Every model (Claude, Gemini, GPT) must produce this exact structure:

### For Path A (Checkpoint):
Render a `> [!NOTE]` block:
```
> [!NOTE]
> 💾 **Checkpoint Saved** — Commit `abc1234` on branch `feat/xxx`
> N file(s) staged and committed. You can safely return to this point using `git reset --hard abc1234`.
```

### For Path B (Abort):
Render a `> [!CAUTION]` block with:
```
> [!CAUTION]
> 🔥 **Abort Level N Executed**
> - **Action Taken:** `git reset --hard HEAD` / `git branch -D xxx`
> - **Data Lost:** N uncommitted file(s) discarded
> - **Current State:** Branch `main`, commit `abc1234`
> - **Working Tree:** Clean
```

Then render a `> [!TIP]` block suggesting the next logical workflow (e.g., `/status_update` or `/bucketlist`).
