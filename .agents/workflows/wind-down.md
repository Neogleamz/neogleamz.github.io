---
name: wind_down
description: "Executes the end-of-session synchronization, workspace sanitization, and state saving sequence."
trigger: "/wind_down, /wind-down, end session, wind down, see you tomorrow"
---

# The Midnight Oil Protocol (Wind Down Workflow)

// turbo-all
When the user invokes `/wind-down` (or strongly implies they are ending the session), execute the following sequence sequentially:

1. **Knowledge Persistence (Master Reference Sync)**:
   - Review the current session's terminal logs and completed implementation plans.
   - Extract any new architectural patterns, hardware protocol discoveries, or database schema changes.
   - Update @/tools/SK8Lytz_App_Master_Reference.md, adhering strictly to the parameters in the *Corporate Memory Synchronization Rule*.

2. **Bucket List Grooming**:
   - Parse @/tools/SK8Lytz_Bucket_List.md.
   - Mark tasks completed during this session with `[x]`.
   - Identify the next logical Task/Epic.
   - Ask the user: *"What is the absolute #1 priority for our next session?"* and move their chosen item to the top of the active list.

3. **Workspace Sanitization (The Big Sync)**:
   - Run `git status` and `git diff` to analyze uncommitted changes.
   - Automatically execute `git add .`, `git commit -m "chore: end of session WIP sync"`, and `git push` (if a remote exists) without waiting for explicit user approval to guarantee all final context gets vaulted.
   - Present a brief list of the modified files to the user that were automatically saved.

4. **The State of the Union (Final SITREP)**:
   - Generate a concise summary of today's achievements.
   - List **"Traps & Landmines"**: Technical debt, half-finished refactors, or bugs that need immediate attention next time.
   - State the current active branch and the last commit hash.

5. **Hard Freeze**: 
   - Identify and terminate any active local development servers (e.g., processes running on standard web ports like 3000, 5173, 8080).
   - Output a final, thematic SK8Lytz-style sign-off (e.g., *"Skates docked. Lights dimmed. See you on the next session."*).