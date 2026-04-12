---
name: panic_button
description: "Triggers a strict read-only diagnostic mode for when the project is broken but the user doesn't know why."
trigger: always_on
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
