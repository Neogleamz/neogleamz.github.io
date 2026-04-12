---
name: ship_it
description: "Executes the code audit, documentation check, and git merge sequence to finalize a feature branch."
trigger: always_on
---

# Ship It Workflow

When the user invokes `/ship-it` (or says "ship it", "merge task", or "finalize branch"), you must act as the Release Manager and execute the following sequence:

1. **Verify Context**: Run `git branch --show-current` to ensure we are currently on a feature branch (e.g., `feature/...`, `fix/...`, or `chore/...`).
2. **Find Base**: If you remember the Epic Target from the bucket list context, use it. If unable to determine the base branch, explicitly ask the user which branch to merge into (e.g., `epic/device-registration` or `main`).
3. **Pre-Flight Code Audit**: Act as a Senior Vanilla JS Engineer. Review the critical files changed on this feature branch for:
   - Security flaws (e.g., hardcoded secrets, unhandled exceptions).
   - Performance bottlenecks (e.g., memory leaks from uncleared native event listeners, expensive DOM reflows, unoptimized loops).
   - Code cleanliness and proper modular architecture.
   *If any issues are flagged, list them out and **HALT**. Wait for permission to either fix them or proceed.*
4. **Knowledge Audit Gate**: Evaluate if this feature branch established new critical knowledge (DB tables, Bluetooth commands, global contexts). If yes, ensure it is documented in @/tools/SK8Lytz_App_Master_Reference.md using your standard editing tools before proceeding.
5. **Merge Routine & Conflict Check**:
   - Run `git checkout <base-branch>`.
   - Run `git merge --no-ff <feature-branch> -m "chore(merge): integrate <feature-branch>"`.
   - **CRITICAL:** Run `git status`. If there are merge conflicts, you must **HALT**, output the conflicted files to the chat, and wait for the user to resolve them. Do NOT proceed to step 6.
6. **Push to Remote**: If the merge was clean, run `git push origin <base-branch>` (if a remote is configured).
7. **Clean Local**: Run `git branch -d <feature-branch>`.
8. **Halt and Confirm**: State that the merge was successful and the local feature branch was cleaned up. Ask the user what the next priority is.
