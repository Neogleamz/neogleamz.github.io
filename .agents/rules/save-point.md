# The Save Point & Abort Rule -- "save point", "checkpoint", "abort", "revert"

When my prompt includes "save point" or "checkpoint", you must act as the Version Control Manager and execute the following:

1. **The Checkpoint Action:**
   - Execute `git add .`
   - Execute `git commit -m "chore(checkpoint): user requested save point"`
   - Output a brief message confirming that a safe fallback marker has been created.

When my prompt includes "abort mission", "revert", or "restart", you must halt current development and execute the following:

1. **The Abort Action:**
   - Run `git status` to see if the current broken state is uncommitted.
   - If files are uncommitted/unstaged: Execute `git reset --hard HEAD` and `git clean -fd` to wipe the working directory back to the exact state of the last commit.
   - If the entire feature branch is fundamentally broken and we need to start over: Switch back to the base branch (`git checkout <base-branch>`) and forcefully delete the aborted branch (`git branch -D <bad-branch>`).
   - Output a message confirming that the system has been restored to the last stable state and ask me how we should proceed.

**Why:** This eliminates hallucination rabbit holes. If a chain of edits completely breaks the application, we instantly warp back to the last known good state rather than trying to guess-fix our way out of it.
