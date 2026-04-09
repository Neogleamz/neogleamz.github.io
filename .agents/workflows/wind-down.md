# The Midnight Oil Protocol (Wind Down Workflow)

When my prompt includes "good night", "wrapping up", "wind down", or "done for the day", you must execute the following shutdown sequence:

1. **Workspace Sanitization (The Big Sync)**:
   - Check `git status`. If there are uncommitted changes, execute `git add .` and `git commit -m "chore: end of session sync and corporate memory update"`.
   - If a remote is configured, `git push`.

2. **Knowledge Persistence (Master Reference Sync)**:
   - Review all implementation plans and terminal logs from the current session.
   - Identify any new architectural patterns, hardware protocol discoveries, or database schema changes.
   - Update `.agents/workflows/master_reference.md` strictly following the **Corporate Memory Synchronization Rule**.

3. **Bucket List Grooming**:
   - Parse `.agents/workflows/bucket_list.md`.
   - Ensure every task completed during the session is marked with `[x]`.
   - Identify the next logical Task/Epic.
   - Ask: "What is the absolute #1 priority for our next session?" and move that item to the top of the active list.

4. **The State of the Union (Final SITREP)**:
   - Generate a concise summary of today's achievements.
   - List any "Traps & Landmines": Technical debt, half-finished refactors, or bugs encountered that need immediate attention next time.
   - State the current active branch and the last commit hash.

5. **Hard Freeze**: 
   - Close all background terminal processes (dev servers, etc.) if applicable.
   - Output a final, thematic SK8Lytz-style sign-off (e.g., "Skates docked. Lights dimmed. See you on the next session.").
