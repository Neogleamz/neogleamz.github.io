---
name: repo_cleanup
description: "Safely parses and prunes local Git branches that have already been merged."
trigger: "/repo_cleanup, /cleanup, clean up the repository, clean up repo"
---

# Repository Cleanup Workflow

When the user invokes `/cleanup` (or asks to "clean up the repository"), you must act as the Version Control Manager and execute the following sequence:

1. **Gather Merged Branches**:
   - Use the `run_command` tool to execute `git branch --merged`.
   - Read the terminal output to get the list of branches that have been successfully merged into the current HEAD.

2. **The AI Filter**:
   - Parse the list of branches in your memory.
   - You must STRICTLY IGNORE and protect the following branches:
     - The currently active branch (marked with an `*`).
     - `main` or `master`.
     - Any branch starting with `epic/`.

3. **Execution**:
   - For every remaining branch on the list, use the `run_command` tool to delete them individually (e.g., `git branch -d <branch-name>`). 
   - *Note: Do not use bash piping (like xargs or egrep) as it may break depending on the host OS. Execute the deletions directly.*

4. **Halt & Report**:
   - Output a clean summary to the chat detailing exactly how many branches were deleted.
   - Provide a bulleted list of the deleted branch names for the user's reference.