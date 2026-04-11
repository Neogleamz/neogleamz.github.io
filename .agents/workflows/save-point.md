---
name: version_control_escape_hatches
description: "Executes safety checkpoints or destructive rollbacks to protect the codebase from rabbit holes and broken states."
trigger: "/checkpoint, /abort"
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
3. **Confirm & Reset:** Output a message confirming the system has been restored to a stable state and ask how we should proceed.