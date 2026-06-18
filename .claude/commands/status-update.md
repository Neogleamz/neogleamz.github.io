---
description: Generates a Situation Report (SITREP) based on current Git context and the Bucket List. (triggers: /status, whats up, status update, where are we, what's happening)
allowed-tools: Bash(git*), Bash(npm*), Bash(npx*), Read, Edit, Write, Grep, Glob
---

# Status Update Workflow

When the user invokes `/status` (or asks "whats up", "status update", "where are we", "what's happening"), you must act as the Project Manager and execute the following sequence:

1. **Gather Git Context**:
   - Use the `run_command` tool to execute `git branch --show-current` to find the active branch.
   - Use the `run_command` tool to execute `git log -1 --pretty=%B` to get the most recent commit message.
   - Use the `run_command` tool to execute `git status --short` to see if there are uncommitted changes.

2. **Parse the Bucket List**: 
   - Read @tools/SK8Lytz_Bucket_List.md (use chunking if the file exceeds 30,000 characters).
   - Locate the highest `### Target:` section that currently contains active, incomplete tasks.
   - Calculate the Epic Progress by counting how many items are `[x]` versus the total number of items under that specific header.
   - Identify the most recently checked-off item (`- [x]`).
   - Identify the very next pending items (`- [ ]`).

3. **Generate the Dashboard**: Synthesize the data using the mandatory output format below.

4. **Halt**: Output the dashboard to the chat and wait for my next command. Do not take any further action.

---

## 🛑 MANDATORY OUTPUT FORMAT (ALL MODELS MUST FOLLOW)

> [!CAUTION]
> **STRICT LINKING MANDATE:** You MUST NEVER surround file paths with backticks (like ile.md). You MUST ALWAYS use standard Markdown hyperlink syntax so the user can natively click them (e.g., [file.md](file:///absolute/path/to/file.md)).

You MUST render the dashboard using the following exact Markdown structure. Do NOT output a plain text summary or rearrange the sections. Every model (Claude, Gemini, GPT) must produce this exact structure:

### 📊 Project Status Report

Render a **Status Card Table** with the following rows:

```
| Field | Value |
|---|---|
| 🌿 **Current Branch** | `<result from git branch>` |
| 🌳 **Working Tree** | `Clean` OR `⚠️ Uncommitted Changes Detected` |
| 🎯 **Active Epic/Target** | `<the nearest ### Target header>` |
| 📈 **Epic Progress** | `X / Y Tasks Completed (Z%)` |
| 🏷️ **Latest Version** | `vX.Y.Z` (from package.json) |
```

### ✅ Last Completed Action
Render a `> [!NOTE]` block containing the last commit message AND the last checked-off bucket list item (if different).

### ⏳ Next Up (Pending Queue)
Render a **numbered list** of the next 3 pending `- [ ]` tasks from the Bucket List. Each item should include its branch slug in backtick formatting.

### 🪤 Active Traps & Blockers
Scan the workspace for any active issues. Render `> [!WARNING]` blocks for:
- Uncommitted changes in the working tree
- Orphaned `[x]` tasks not yet archived with `[🚀]`
- Active feature branches that haven't been merged
- Any P0 Critical items in the Bucket List

If none found, render a single `> [!TIP]` block: "No active traps. Clear runway."

### 🎯 Suggested Workflow
Render a `> [!TIP]` block suggesting the most logical next workflow to execute based on the current context (e.g., `/bucketlist` to start next task, `/ship_it` to merge current work, `/wind_down` to end session).
