---
model: haiku
description: Handles the final un-boxing of an entire Epic branch into the Production trunk, automates stealth/public release notes, and archives the bucket list. (triggers: /finalize_epic, finalize epic, deploy epic)
allowed-tools: Bash(git*), Bash(npm*), Bash(npx*), Read, Edit, Write, Grep, Glob
---

# Finalize Epic Workflow

When the user invokes `/finalize_epic` (or instructs you to "deploy epic" or "finalize epic"), you must act as the Master Orchestrator and execute the following sequence:

1. **The Context Filter**:
   - Execute `git branch --show-current`.
   - If the active branch is a feature branch (`feat/*`), you must **HALT** immediately. Warn the user: *"You have un-shipped code stuck on a feature branch! You must execute `[/ship_it]` to safely merge this specific task into your Epic before we can finalize the Epic."*
   - If the branch is an `epic/*` branch, you may proceed.

2. **The Ledger Reconciliation**:
   - Open `@tools/SK8Lytz_Bucket_List.md`. 
   - Perform a global sweep of all active queues (P0, P1, P2). Did any of the recently merged work accidentally or intentionally fulfill other orphaned `[ ]` tasks sitting in different Epics? Check them off (`[x]`) to ensure the ledger is fully accurate before we begin archiving.

3. **The Spillover Scan Gate**:
   - Parse `@tools/SK8Lytz_Bucket_List.md` specifically targeting the active Epic's task block.
   - Count any remaining incomplete tasks (`- [ ]`).
   - If there are ANY incomplete tasks, **HALT** and ask: *"Warning: This Epic has unfinished tasks. Do you want to **[A]** Abandon Finalization and keep coding, or **[B]** Finalize anyway and Spillover?"* 
   - If the user selects Spillover, safely move the `- [ ]` tasks to the `## 🟢 P3 Backlog` section of the Bucket List.

4. **The Production Deployment Phase**:
   - Run `git checkout main`.
   - Run `git pull origin main` to ensure local parity.
   - Run `git merge --no-ff <epic-branch> -m "chore(release): deploy <epic-branch>"`.
   - **CRITICAL**: If there are merge conflicts, you must **HALT**, output the conflicted files to the chat, and await user resolution.

5. **The Ledger Archive Protocol**:
   - Open `@tools/SK8Lytz_Bucket_List.md`.
   - Convert all `- [x]` marks inside the target Epic block into `- [🚀]`.
   - Physically sweep the entire Epic block (headers and tasks) down to the very bottom under the `## 🗄️ Completed & Archived Epics` heading.
   - **CRITICAL (Stray Task Sweep):** Perform a global document scan for any orphaned `- [x]` tags sitting outside the Epic block (specifically inside `## 🧹 Technical Debt`). Move any discovered strays into their own block under `🗄️ Completed & Archived Epics`, and convert them to `- [🚀]`.

6. **The Release Routing Decision**:
   - **HALT**. Ask the user explicitly: *"Epic merged firmly into Main! Do you want me to formally version-bump this public release `[/release]`, or stealth-sync the internal changelog `[/release_silent]`?"*
   - Based on the user's explicit response, natively execute the logic constraints defined in that respective workflow to finalize the changelog and the Ghost Commit.

7. **Cleanup Local**:
   - Run `git branch -d <epic-branch>`.

8. **Present the Final SITREP** using the mandatory output format below.

---

## 🛑 MANDATORY OUTPUT FORMAT (ALL MODELS MUST FOLLOW)

> [!CAUTION]
> **STRICT LINKING MANDATE:** You MUST NEVER surround file paths with backticks (like ile.md). You MUST ALWAYS use standard Markdown hyperlink syntax so the user can natively click them (e.g., [file.md](file:///absolute/path/to/file.md)).

After the Epic is fully merged and archived, you MUST render the following structured output. Do NOT summarize as prose. Every model (Claude, Gemini, GPT) must produce this exact structure:

### 🏁 Epic Finalization SITREP

#### Gate Results Table
```
| Gate | Result | Detail |
|---|---|---|
| 🔍 Context Filter | ✅ | Confirmed `epic/*` branch |
| 📋 Ledger Reconciliation | ✅ | N orphaned tasks swept |
| ⚠️ Spillover Scan | ✅ | 0 incomplete tasks (or N spilled to P3) |
| 🔀 Production Merge | ✅ | Clean merge, no conflicts |
| 🚀 Ledger Archive | ✅ | N tasks tagged `[🚀]`, Epic block archived |
| 🧹 Stray Task Sweep | ✅ | 0 orphaned `[x]` found outside Epic |
| 🧹 Branch Cleanup | ✅ | `epic/xxx` deleted locally |
```

#### 📦 Epic Contents (Archived)
Render a bulleted list of every task that was part of this Epic, with its final `[🚀]` status.

#### 🪤 Post-Merge Warnings
Render `> [!WARNING]` blocks for any of the following detected issues:
- Spillover tasks that were moved to P3 Backlog
- Stray `[x]` tasks found and auto-archived
- Uncommitted files in the working tree after merge
- Feature branches still referencing the deleted Epic branch

If none found, render a `> [!TIP]` block: "Clean finalization — no post-merge issues detected."

#### 🎯 Release Routing Prompt
Render a `> [!IMPORTANT]` block asking: "Epic merged into Main! Execute `[/release]` for a formal version bump, or `[/release_silent]` for a stealth changelog sync?"
