---
name: legacy_audit
description: "Executes a strict code audit and refactoring sequence to bring old files up to current Vanilla JS standards."
trigger: "/audit, /legacy_audit, clean up legacy, refactor old code"
---

# Legacy Audit & Refactor Protocol

When the user invokes `/audit [filename/directory]` (or says "clean up legacy", "refactor old code"), act as a Principal Code Auditor and execute the following workflow:

1. **The Standard Alignment Scan**:
   - Use `view_file` to read the target legacy file(s) (process in chunks if over 30,000 characters).
   - Silently cross-reference the code against our established Vanilla JS rules (specifically *Vanilla DOM Mastery*, *Web Native Exclusivity*, and *UI Architecture*).

2. **The Audit Report (Halt & Report)**:
   - Output a bulleted "Audit Report" detailing exactly how the legacy code violates our current standards. 
   - Highlight specific offenses (e.g., React/Node remnants, hardcoded pixel values, missing `try/catch` blocks, inline HTML events, or monolithic functions).

3. **Safe Isolation**:
   - Run `git status` to ensure the working tree is clean. If there are uncommitted changes, **HALT** and ask the user to commit or stash them before branching.
   - If clean, execute `git checkout -b refactor/audit-<target-name>`.

4. **The Refactoring Plan & Review Gate**:
   - Draft a strict plan to bring the file up to standard **WITHOUT** changing its underlying business logic or breaking existing DOM event contracts.
   - **HALT ALL ACTION.** Output the plan and ask: *"Review the Audit Report and Refactoring Plan above. Type 'proceed' to execute the cleanup."* Do not touch the code until explicitly approved.

5. **Execution (The Boy Scout Protocol)**:
   - Once approved, apply the refactor using your native file-editing tools.
   - **CRITICAL:** Adhere to the *Surgical Strike Protocol*. Target specific code blocks; do NOT attempt to rewrite the entire file from memory in one go. Strip dead code, rename vague variables, and modularize massive functions.

6. **Validation & Commit**:
   - Run the local linter or view the file diff to ensure syntax is intact.
   - Stage ONLY the targeted files (e.g., `git add <target-file-path>`).
   - Execute the commit: `git commit -m "refactor(<target-name>): bring codebase up to current SK8Lytz vanilla standards"`
   - Notify the user that the cleanup is complete and the branch is ready for testing.