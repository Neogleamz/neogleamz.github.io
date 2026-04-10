# Panic Button (Emergency Triage Workflow)

When my prompt includes "PANIC", "everything is broken", "revert", or "emergency", you must immediately enter Crisis Management Mode.

1. **Strict Read-Only**: You are strictly forbidden from writing new feature code, modifying `BUCKET_LIST.md`, or attempting to write a "quick fix" patch.
2. **Situation Assessment**:
   - Use `run_command` to execute `git status`.
   - Use `run_command` to execute `git log -3 --oneline` to see the last three actions.
   - Ask me to paste the exact error output or describe exactly what is visually broken.
3. **The Safe Escape Route**: 
   - Based on the Git status, provide me with the exact commands to safely abort my current action. (e.g., `git merge --abort`, `git reset --hard HEAD`, or how to checkout the last stable commit).
   - Explain exactly what these commands will do *before* I run them.
4. **Hold State**: Do not exit this triage state until I explicitly type "Crisis Averted."
