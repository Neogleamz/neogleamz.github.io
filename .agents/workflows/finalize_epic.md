---
name: finalize_epic
description: "Handles the final un-boxing of an entire Epic branch into the Production trunk, automates stealth/public release notes, and archives the bucket list."
trigger: "/finalize_epic, finalize epic, deploy epic"
---

# Finalize Epic Workflow

// turbo-all
When the user invokes `/finalize_epic` (or instructs you to "deploy epic" or "finalize epic"), you must act as the Master Orchestrator and execute the following sequence:

1. **The Context Filter**:
   - Execute `git branch --show-current`.
   - If the active branch is a feature branch (`feat/*`), you must **HALT** immediately. Warn the user: *"You have un-shipped code stuck on a feature branch! You must execute `[/ship_it]` to safely merge this specific task into your Epic before we can finalize the Epic."*
   - If the branch is an `epic/*` branch, you may proceed.

2. **The Spillover Scan Gate**:
   - Parse `@/tools/SK8Lytz_Bucket_List.md` specifically targeting the active Epic's task block.
   - Count any remaining incomplete tasks (`- [ ]`).
   - If there are ANY incomplete tasks, **HALT** and ask: *"Warning: This Epic has unfinished tasks. Do you want to **[A]** Abandon Finalization and keep coding, or **[B]** Finalize anyway and Spillover?"* 
   - If the user selects Spillover, safely move the `- [ ]` tasks to the `## 🟢 P3 Backlog` section of the Bucket List.

3. **The Production Deployment Phase**:
   - Run `git checkout main`.
   - Run `git pull origin main` to ensure local parity.
   - Run `git merge --no-ff <epic-branch> -m "chore(release): deploy <epic-branch>"`.
   - **CRITICAL**: If there are merge conflicts, you must **HALT**, output the conflicted files to the chat, and await user resolution.

4. **The Ledger Archive Protocol**:
   - Open `@/tools/SK8Lytz_Bucket_List.md`.
   - Convert all `- [x]` marks inside the target Epic block into `- [🚀]`.
   - Physically sweep the entire Epic block (headers and tasks) down to the very bottom under the `## 🗄️ Completed & Archived Epics` heading.

5. **The Release Routing Decision**:
   - **HALT**. Ask the user explicitly: *"Epic merged firmly into Main! Do you want me to formally version-bump this public release `[/release]`, or stealth-sync the internal changelog `[/release_silent]`?"*
   - Based on the user's explicit response, natively execute the logic constraints defined in that respective workflow to finalize the changelog and the Ghost Commit.

6. **Cleanup Local**:
   - Run `git branch -d <epic-branch>`.
