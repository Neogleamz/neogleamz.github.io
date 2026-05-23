---
name: gitcleanup
description: "Safely parses and prunes local Git branches that have already been merged."
trigger: "/repo_cleanup, /cleanup, clean up the repository, clean up repo"
---

# Repository Cleanup Workflow

// turbo-all
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

4. **Halt & Report**: Present the results using the mandatory output format below.

---

## 🛑 MANDATORY OUTPUT FORMAT (ALL MODELS MUST FOLLOW)

> [!CAUTION]
> **STRICT LINKING MANDATE:** You MUST NEVER surround file paths with backticks (like ile.md). You MUST ALWAYS use standard Markdown hyperlink syntax so the user can natively click them (e.g., [file.md](file:///absolute/path/to/file.md)).


You MUST render the cleanup report using the following exact Markdown structure. Do NOT output a plain text summary. Every model (Claude, Gemini, GPT) must produce this exact structure:

### 🧹 Repository Cleanup Report

#### Protected Branches
Render a `> [!NOTE]` block listing every branch that was explicitly protected and NOT deleted (e.g., `main`, `epic/*`, current branch).

#### Deleted Branches
Render a Markdown table:
```
| # | Branch Name | Status |
|---|---|---|
| 1 | `feat/old-feature` | 🗑️ Deleted |
| 2 | `fix/auth-crash` | 🗑️ Deleted |
```

If no branches were eligible for deletion, render a `> [!TIP]` block: "Repository is already clean — no stale merged branches found."

#### Summary
```
| Metric | Count |
|---|---|
| 🛡️ Protected | N |
| 🗑️ Deleted | N |
| 📊 Total Branches | N |
```
