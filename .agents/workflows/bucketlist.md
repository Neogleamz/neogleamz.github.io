---
name: bucketlist
description: "The primary project engine. Automates branching, planning, execution, and documentation for the next item on the Bucket List."
trigger: "/bucketlist, /start_next, start working on the bucket list, start bucket list, what's next, what's next on the list?"
---

# Auto-Branching Execution Workflow

When the user instructs you to start the next task (e.g., "what's next"), you must act as the Lead Engineer and execute this sequence exactly:

1. **Read Status**: 
   - Parse `@/tools/SK8Lytz_Bucket_List.md` (use chunking if needed).
   - Identify the very first incomplete item (marked with `- [ ]`).
   - Scan upwards from that item to find the nearest section header formatted as `### Target: <branch-name>`. The value inside the backticks is your `<target-base-branch>`.

2. **Branch Creation**:
   - Extract the specific branch slug for the task.
   - Run `git branch --list <extracted-branch-slug>`. If the branch already exists locally, execute `git checkout <extracted-branch-slug>` to resume it.
   - If the branch does NOT exist, execute `git checkout <target-base-branch>`, perform `git pull`, and then carefully execute `git checkout -b <extracted-branch-slug>`.
   - **CRITICAL SAFETY RULE**: YOU ARE STRICTLY FORBIDDEN from ever using the `-B` flag inside `git checkout`. Forcing a branch recreation via `-B` wipes out unmerged user commits and destroys local history. Never guess; check if the branch exists before creating.

3. **Discovery & Clarification Phase**:
   - Analyze the bucket list requirement.
   - Determine if you have 100% of the information required to build a perfect Vanilla JS / Supabase implementation plan.
   - If requirements are ambiguous, **HALT ALL ACTION.** Output a numbered list of clarifying questions for the user (e.g., *"1. What specific flexbox layout do you want for this UI?", "2. Should this Supabase query be cached in localStorage?"*). Wait for answers before proceeding.

4. **Planning & Mandatory Review Gate (HALT)**:
   - Generate a detailed Implementation Plan using your file-editing tools to save a copy to `docs/plans/<extracted-branch-slug>.md`.
   - **Crucial:** Your plan MUST start with `### Design Decisions & Rationale`. Provide a brief summary (2-3 sentences max) explaining *why* you chose the specific Vanilla JS approach or Web Bluetooth architecture.
   - Read the file to display the plan in the chat.
   - **HALT ALL ACTION.** Explicitly ask: *"I have generated the plan artifact. Review the plan above. Type 'proceed' to execute, or provide feedback."* Do not write code until approved.

5. **Execute Work**: 
   - Once the user types "proceed", use your code-editing tools to implement the module exactly as outlined in the approved plan.

6. **Self-Review & Refactor Phase**:
   - Before committing, act as a Senior Security & Performance Engineer.
   - Review your newly written code. Look for: hardcoded Supabase keys, memory leaks (e.g., un-removed DOM event listeners), missing `try/catch` blocks, or poor naming conventions.
   - Output a brief "Code Review Report". If flaws are found, refactor them immediately. If pristine, state "Code Review Passed."

7. **Commit & Sync Phase**:
   - Check if your changes affected Supabase schemas, Web Bluetooth logic, or core system architecture.
   - If so, autonomously trigger the *Corporate Memory Synchronization Rule* to update `@/tools/SK8Lytz_App_Master_Reference.md`.
   - Stage your specific file changes (avoid blind `git add .` if there are untracked files).
   - Execute: `git commit -m "feat(<scope>): complete <extracted-branch-slug>"`

8. **Update Tracking, Archive & Halt**: 
   - Modify `@/tools/SK8Lytz_Bucket_List.md` and change the checkbox for this item to `- [x]`.
   - **Enforce Archiving Protocol**: Scan the surrounding epic `### Target:` block. If every single item in this specific Epic is now marked as `[x]`, you MUST autonomously cut the entire block (the `### Target:` header, the `*(Epic...)*` subheader, and all the `[x]` tasks) and paste it at the absolute bottom of the file under the `🗄️ Completed & Archived Epics` section to keep the active list clean.
   - Output a clean confirmation message to the chat that the task is complete and the branch is ready for testing. Do not automatically start the next task.
