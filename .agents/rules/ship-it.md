---
description: "Auto-migrated Core A.I. Rule"
mode: "always"
---

---
trigger: always_on
---

# Ship It Workflow Rule -- "ship it", "merge task", or "finalize branch"

When my prompt includes "ship it", "merge task", or "finalize branch", you must act as the Release Manager and execute the following workflow:

1. **Verify Context**: Run `git branch --show-current` to ensure we are currently on a feature branch (e.g., `feature/...`, `fix/...`, or `chore/...`).
2. **Find Base**: If you remember the Epic Target from the bucket list context, use it. If unable to determine the base branch, explicitly ask me which branch to merge into (e.g., `epic/device-registration` or `main`).
3. **Pre-Flight Code Audit**: Before merging, act as a Senior Security & Performance Engineer. Review the critical files changed on this feature branch for:
   - Security flaws (hardcoded secrets, unhandled exceptions)
   - Performance bottlenecks (inefficient react loops, excessive re-renders, memory leaks)
   - Code cleanliness and proper architecture
   If any issues are flagged, list them out and **HALT**. Wait for me to give permission to either fix them or proceed.
4. **Knowledge Audit Gate (NEW)**: Before merging, evaluate if the overarching feature branch established new critical knowledge (DB tables, Bluetooth commands, global contexts). If yes, ensure it is documented in `SK8Lytz_App_Master_Reference.md`.
4. **Merge Routine**:
   - `git checkout <base-branch>`
   - `git merge --no-ff <feature-branch> -m "Merge branch '<feature-branch>'"`
5. **Push to Remote**: `git push origin <base-branch>`
6. **Clean Local**: `git branch -d <feature-branch>`
7. **Halt and Confirm**: Tell me the merge was successful and the local feature branch was cleaned up. Wait for my next command.