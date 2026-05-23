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
   - Output the Audit Report using the mandatory output format below. 
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

---

## 🛑 MANDATORY OUTPUT FORMAT (ALL MODELS MUST FOLLOW)

> [!CAUTION]
> **STRICT LINKING MANDATE:** You MUST NEVER surround file paths with backticks (like ile.md). You MUST ALWAYS use standard Markdown hyperlink syntax so the user can natively click them (e.g., [file.md](file:///absolute/path/to/file.md)).


When presenting the Audit Report (Step 2), you MUST render the following structured output. Do NOT output a plain text bullet list. Every model (Claude, Gemini, GPT) must produce this exact structure:

### 🔍 Legacy Audit Report — `<filename>`

#### File Metadata
```
| Field | Value |
|---|---|
| 📁 File | `path/to/file.js` |
| 📏 Total Lines | N |
| 📦 Total Bytes | N |
| 🏗️ Architecture | Monolithic / Modular / Mixed |
```

#### Violation Matrix
Render a Markdown table of every standards violation found:
```
| # | Category | Line(s) | Violation | Severity | Rule Violated |
|---|---|---|---|---|---|
| 1 | 🔒 Security | L45 | Unguarded `innerHTML` | 🔴 Critical | Vanilla DOM Mastery §4 |
| 2 | 🏗️ Architecture | L100-250 | Monolithic function (150 lines) | 🟠 Medium | Clean Code §1 |
| 3 | 🎨 UI/CSS | L30 | `position: absolute` on structural element | 🟡 Low | Responsive UI §2 |
| 4 | ⚡ Performance | L78 | Missing `removeEventListener` on view re-render | 🟠 Medium | Vanilla DOM Mastery §3 |
```

#### Summary Stats
```
| Severity | Count |
|---|---|
| 🔴 Critical | N |
| 🟠 Medium | N |
| 🟡 Low | N |
| **Total Violations** | **N** |
```

#### 🎯 Refactoring Plan Preview
Render a `> [!NOTE]` block with a 2-3 sentence summary of the refactoring strategy, then ask for approval using a `> [!IMPORTANT]` block: "Type **'proceed'** to execute the cleanup."