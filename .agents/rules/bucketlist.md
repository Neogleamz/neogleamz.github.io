---
description: "Auto-migrated Core A.I. Rule"
mode: "always"
---

---
trigger: always_on
---

# Auto-Branching Workflow Rule -- "start working on the bucket list", "start bucket list", "what's next", "what's next on the list?"

When I instruct you to do ANY of the following:

- "start working on the bucket list"
- "start bucket list"
- "what's next"
- "what's next on the list?"

You must execute the following workflow sequentially:

1. **Read Status**: Parse the `tools/SK8Lytz_Bucket_List.md` file.
   - Identify the very first incomplete item (marked with `- [ ]`).
   - Scan upwards from that item to find the nearest section header formatted as `### Target: <branch-name>`. The value inside the backticks is your `<target-base-branch>`.

2. **Isolate Branch Name**: Extract the branch slug located in the backticks for that specific task.

3. **Branch Creation**:
   - Use the `run_command` tool to execute `git checkout <target-base-branch>` to ensure you are on the correct source of truth.
   - Execute `git pull` to fetch the latest changes.
   - Execute `git checkout -b <extracted-branch-slug>` to create the isolated workspace.

4. **Discovery & Clarification Phase (NEW)**:
   - Analyze the bucket list requirement.
   - Determine if you have 100% of the information required to build a perfect implementation plan.
   - If requirements are ambiguous, **HALT ALL ACTION.** Output a numbered list of clarifying questions for me. (e.g., "1. What specific layout do you want for the UI?", "2. Should the API route use POST or PUT?"). Wait for my answers before proceeding to the next step.

5. **Planning & Mandatory Review Gate**:
   - Using the initial requirement and my answers from the Discovery Phase, generate a detailed Implementation Plan using the `write_to_file` tool with the `IsArtifact` flag set to `true`.
   - **Crucial:** Your plan MUST start with a section titled `### Design Decisions & Rationale`. In this section, provide a brief, high-level summary (2-3 sentences max) explaining *why* you chose the specific approach, libraries, or architecture you are about to propose. Omit internal backtracking or overly detailed intermediate steps; just give me the direct, final reasoning for your choices.

- Ensure the artifact's `request_feedback` flag is set to `true`.
  - Additionally, save a physical copy of this plan to the codebase at `docs/plans/<extracted-branch-slug>.md`.
  - Use the `run_command` tool to execute `cat docs/plans/<extracted-branch-slug>.md` to display  the plan in the terminal log. Do NOT print the plan raw text into the chat.
  - **HALT ALL ACTION.** You must explicitly ask me: "I have generated the plan artifact. Review the plan above. Type 'proceed' to execute, or provide feedback." Do not write any code or execute any further commands until I give you permission to proceed.

1. **Execute Work**: Once I type "proceed" or give explicit approval, use your code-editing tools to write the code and implement the module exactly as outlined in the approved plan.

6.5. **Self-Review & Refactor Phase**:

- Before committing, you must act as a Senior Security & Performance Engineer.
- Review the code you just wrote. Look for: hardcoded credentials, inefficient loops, memory leaks, missing error handling, or poor naming conventions.
- Output a brief "Code Review Report" to the chat detailing any flaws you found in your own code.
- If flaws are found, refactor the code to fix them. If the code is pristine, state "Code Review Passed" and proceed to the Commit Phase.

1. **Commit Phase**: Once you have fully implemented and verified the module:
   - Check if your changes affected any API routes, Bluetooth commands, or core system architecture.
   - If so, autonomously update the `README.md` or `docs/API_REFERENCE.md` to reflect the new endpoints, expected payloads, and responses.
   - Execute `git add .` in the terminal.
   - Execute `git commit -m "feat: complete <extracted-branch-slug> and sync documentation"`

2. **Update Tracking**: Modify `tools/SK8Lytz_Bucket_List.md` using your editing tools and change the checkbox for this item to `- [x]`.

3. **Display Status and Halt**: Use the `run_command` tool to execute `cat tools/SK8Lytz_Bucket_List.md` to print the updated status to the terminal log. Do NOT print the raw contents to the chat. Do not take any further action. Wait for me to explicitly tell you to begin the next item.

**Note:** Always add items we are currently working on or have been suggested in conversations to the bucket list in order of priority. All changes from security, performance, or functionality reviews must be added to this list.