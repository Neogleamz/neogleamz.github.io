---
description: "Auto-migrated Core A.I. Rule"
mode: "always"
---

---
trigger: always_on
---

# Legacy Audit & Refactor Protocol

When I instruct you to "audit [filename/directory]", "clean up legacy", or "refactor old code", you must act as a Principal Code Auditor and execute the following workflow:

1. **The Standard Alignment Scan**:
   - Read the target legacy file(s).
   - Silently cross-reference the code against our established `.agents/rules/coding-standards.md` and `.agents/rules/mobile-ui-standards.md` files (or equivalent principles if they don't exist yet).

2. **The Audit Report (Halt & Report)**:
   - Output a bulleted "Audit Report" detailing exactly how the legacy code violates our current standards. 
   - Highlight specific offenses (e.g., monolithic functions, hardcoded pixel values instead of Flexbox, missing `try/catch` blocks on asynchronous calls, or commented-out junk code).

3. **Safe Isolation**:
   - Use the `run_command` tool to execute `git checkout main` (or the current epic branch), pull the latest, and execute `git checkout -b chore/audit-<target-name>`.

4. **The Refactoring Plan & Review Gate**:
   - Draft a strict plan to bring the file up to standard **WITHOUT** changing its underlying business logic or breaking existing API contracts.
   - **HALT ALL ACTION.** Output the plan and ask: "Review the Audit Report and Refactoring Plan above. Type 'proceed' to execute the cleanup." Do not touch the code until approved.

5. **Execution (The Boy Scout Protocol)**:
   - Once I type "proceed", rewrite the file using your code-editing tools. 
   - Apply the rules aggressively: strip dead code, rename vague variables (e.g., change `x` to `wheelColorHex`), and break down massive functions into modular helpers.

6. **Validation & Commit**:
   - Run the project's linter or build command to ensure the refactored code compiles. Self-heal any syntax errors you introduced.
   - Execute `git add .`
   - Execute `git commit -m "chore: refactor <target-name> to meet current SK8Lytz engineering standards"`
   - Notify me that the cleanup is complete.