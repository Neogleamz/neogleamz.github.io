---
model: haiku
description: Executes safety checkpoints or destructive rollbacks to protect the codebase from rabbit holes and broken states. (triggers: /checkpoint, /abort, save point, revert, restart)
allowed-tools: Bash(git*), Bash(npm*), Bash(npx*), Read, Edit, Write, Grep, Glob
---

# The Save Point & Abort Workflow

When the user invokes a version control escape hatch, act as the Version Control Manager and execute the corresponding sequence:

### Path A: The Checkpoint (Triggered by `/checkpoint` or "save point")
Immediately dispatch the entire task to the **`checkpoint-agent`** subagent (`model: haiku`) — this is a fully mechanical git snapshot with no interactivity. Do not perform the git add/commit yourself in the main conversation. Relay the subagent's returned confirmation verbatim.

### Path B: The Abort (Triggered by `/abort`, "revert", or "restart")
**Do NOT delegate this path to a subagent** — it involves destructive operations that require a live, in-conversation permission gate from the user. Execute directly:

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
> **STRICT LINKING MANDATE:** You MUST NEVER surround file paths with backticks (like ile.md). You MUST ALWAYS use standard Markdown hyperlink syntax so the user can natively click them (e.g., [file.md](file:///absolute/path/to/file.md)).

For Path A, relay the `checkpoint-agent` subagent's output verbatim (it already renders the `> [!NOTE]` confirmation block).

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
