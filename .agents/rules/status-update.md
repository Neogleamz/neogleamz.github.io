---
name: status_update
description: "Generates a Situation Report (SITREP) based on current Git context and the Bucket List."
trigger: always_on
---

# Status Update Workflow

When the user invokes `/status` (or asks "whats up", "status update", "where are we", "what's happening"), you must act as the Project Manager and execute the following sequence:

1. **Gather Git Context**:
   - Use the `run_command` tool to execute `git branch --show-current` to find the active branch.
   - Use the `run_command` tool to execute `git log -1 --pretty=%B` to get the most recent commit message.
   - Use the `run_command` tool to execute `git status --short` to see if there are uncommitted changes.

2. **Parse the Bucket List**: 
   - Read @/tools/SK8Lytz_Bucket_List.md (use chunking if the file exceeds 30,000 characters).
   - Locate the highest `### Target:` section that currently contains active, incomplete tasks.
   - Calculate the Epic Progress by counting how many items are `[x]` versus the total number of items under that specific header.
   - Identify the most recently checked-off item (`- [x]`).
   - Identify the very next pending items (`- [ ]`).

3. **Generate the Dashboard**: Synthesize the data into a clean Markdown status report formatted exactly like this:

   ### 📊 Project Status Report

   **Current Branch:** `<result from git branch>`
   **Working Tree:** `<Clean OR 'Uncommitted Changes Detected'>`
   **Active Epic/Target:** `<the nearest ### Target header>`
   📈 **Epic Progress:** `<X> / <Y> Tasks Completed (<Z>%)`

   ✅ **Last Completed Action:** `<the last commit message OR the last checked-off bucket list item>`

   ⏳ **Currently Pending (Next Up):**
   1. `<the very next - [ ] task>`
   2. `<the following - [ ] task>`

4. **Halt**: Output the dashboard to the chat and wait for my next command. Do not take any further action.
