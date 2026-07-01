---
model: sonnet
description: Executes the end-of-session synchronization, workspace sanitization, and state saving sequence. (triggers: /wind_down, /wind-down, end session, wind down, see you tomorrow)
allowed-tools: Bash(git*), Bash(npm*), Bash(npx*), Read, Edit, Write, Grep, Glob
---

# The Midnight Oil Protocol (Wind Down Workflow)

When the user invokes `/wind-down` (or strongly implies they are ending the session), execute the following sequence sequentially:

1. **Knowledge Persistence (Master Reference Sync)**:
   - Review the current session's terminal logs and completed implementation plans.
   - Extract any new architectural patterns, hardware protocol discoveries, or database schema changes.
   - Update @tools/SK8Lytz_App_Master_Reference.md, adhering strictly to the parameters in the *Corporate Memory Synchronization Rule*.

2. **Bucket List Grooming (Zero-Trust Ledger Sync)**:
   - Parse @tools/SK8Lytz_Bucket_List.md.
   - Mark tasks completed during this session with `[x]`.
   - **CRITICAL (Stray Task Sweep):** Run a global scan of the document using the `Read` tool (NOT grep/bash — emoji regex is unreliable). Read every line above the `🗄️ Completed & Archived Epics` heading and apply BOTH checks:
     - **Individual orphan check:** Any single task marked `[x]` or `[🚀]` that is not inside an active Epic block must be moved to the Archived section.
     - **Section completion check:** If an entire named sub-section (e.g. `### 🔴 Security: Unguarded innerHTML`, `### 🟡 Stale Packages`) has ALL of its tasks marked `[🚀]` with none remaining open, the ENTIRE sub-section block must be moved into the Archived section as a named Epic and replaced with the clean-sweep message. Do NOT leave fully-completed sub-sections in the active area just because each individual task has already been tagged `[🚀]`.
     - You are forbidden from declaring the sweep clean until BOTH checks pass. Failing this step causes the ledger to accumulate phantom completed sections that confuse future sessions.
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

---

## 🛑 MANDATORY OUTPUT FORMAT (ALL MODELS MUST FOLLOW)

> [!CAUTION]
> **STRICT LINKING MANDATE:** You MUST NEVER surround file paths with backticks (like ile.md). You MUST ALWAYS use standard Markdown hyperlink syntax so the user can natively click them (e.g., [file.md](file:///absolute/path/to/file.md)).

After completing all 5 steps above, you MUST render the following structured sections. Do NOT output a plain text summary. Do NOT skip any section. Every model (Claude, Gemini, GPT) must produce this exact structure:

### 1. Session Gate Checklist
Render a Markdown table showing the status of each wind-down step:

```
| Gate | Result | Detail |
|---|---|---|
| 📚 Master Reference Sync | ✅ | Added Section N — [topic] |
| 📋 Bucket List Grooming | ✅ | N task(s) marked, 0 orphans found |
| 🧹 Stray Task Sweep | ✅ | 0 phantom `[x]`/`[🚀]` tasks remaining |
| 💾 Workspace Sync | ✅ | N file(s) committed and pushed |
| 🔌 Hard Freeze | ✅ | No active dev servers found |
```

### 2. Achievements Table
Render a Markdown table summarizing all major items accomplished this session:

```
| Epic / Task | Status | Files Touched |
|---|---|---|
| `feat/example-feature` | 🚀 Shipped | `module.js`, `index.html` |
| Boy Scout cleanup | ✅ | `delegator.js` |
```

### 3. 🪤 Traps & Landmines
You MUST proactively scan for and report the following items using `> [!WARNING]` alert blocks. Do NOT skip this section even if you think nothing is noteworthy. Actively hunt for:
- **Orphaned utility scripts** in `tools/` or the project root that were committed as one-shot patches
- **`test-*.js` files** in the root that should be in `scripts/`
- **Pre-existing ESLint warnings/errors** that weren't addressed
- **Cross-browser rendering risks** (especially Mobile Safari)
- **Half-finished refactors** or TODO comments introduced during the session
- **Uncommitted ledger updates** (Master Reference, Bucket List)

If after scanning you genuinely find zero issues, render a single `> [!TIP]` block stating: "Clean session — no traps detected."

### 4. 📡 Final State Card
Render a compact Markdown table with the session's final metadata:

```
| Field | Value |
|---|---|
| 🌿 Branch | `main` |
| 🏷️ Tag | `vX.Y.Z` (if released) |
| 🔖 Last Commit | `abc1234` — `commit message` |
| 🕰️ System Version | `v.YYYY.MM.DD.HHMM` |
| 🧪 Test Suite | N/N ✅ |
| 🔒 Workspace | Clean / Dirty |
```

### 5. 🎯 Next Session Prompt
Render a `> [!IMPORTANT]` block asking the user for their next session priority. Suggest 2-3 candidates from the active Bucket List queue.

### 6. 🛹 Sign-Off
End with a thematic SK8Lytz sign-off line in *italics*.
