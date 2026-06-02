---
name: health_check
description: "Scans the codebase for vulnerabilities and technical debt, then triages findings into the bucket list."
trigger: "/health_check, /health-check, run health check, clean the house"
---

# Tech Debt Janitor Workflow

When the user invokes `/health-check` (or uses phrases like "run health check" or "clean the house"), execute this maintenance sweep:

1. **Dependency Audit**: 
   - Run `npm outdated` and `npm audit` in the terminal.
   - Analyze the output. Prioritize vulnerabilities in "dependencies" (production code) over "devDependencies".
   - Note major version updates that might break the Vanilla JS/Browser environment.

2. **The Code Quality & Security Hunt**: 
   - Use the `grep_search` tool to scan the codebase for explicitly marked debt: `TODO:`, `FIXME:`, and `HACK:`.
   - **CRITICAL ZERO-TRUST SCAN:** Use `grep_search` to actively hunt for `.innerHTML` and `.insertAdjacentHTML`. If the target node is receiving dynamic data that is NOT explicitly wrapped in `window.safeHTML()` or `DOMPurify.sanitize()`, you must instantly flag it.
   - **LINTER AUDIT:** Run `npx eslint .` in the terminal. Parse the output to count warnings and errors (especially `no-undef`, `no-unused-vars`). If the output is massive, just aggregate the totals by rule.
   - **HARDCODED SECRETS SCAN:** Use `grep_search` to scan `.js` files for risky patterns like `sk_live_`, `Bearer `, `password =`, or hardcoded MAC addresses.
   - **LEGACY SCOPE SCAN:** Use `grep_search` to find instances of `var ` declarations, flagging them for upgrade to `let/const`.
   - **ORPHAN SCRIPT SCAN:** Use `list_dir` to check the project root for any misplaced `test-*.js`, `check-*.js`, or one-shot utility scripts that should be in `scripts/` or `tools/`.
   - **DEAD CODE SCAN:** Use `grep_search` to find unreferenced `function` declarations and unused `const`/`let` exports across modules.
   - Extract the file path, line number, and a brief snippet of context for each discovery.

3. **Bucket List Integration**: 
   - Open @/tools/SK8Lytz_Bucket_List.md.
   - If the file exceeds 30,000 characters, process the edit in parts.
   - Format findings into `- [ ]` tasks. Example: `- [ ] \`debt/security\` : Update noble library.`
   - Append these to a section titled `## 🧹 Technical Debt` at the bottom of the file.

4. **SITREP**: Output the results using the mandatory output format below.

---

## 🛑 MANDATORY OUTPUT FORMAT (ALL MODELS MUST FOLLOW)

> [!CAUTION]
> **STRICT LINKING MANDATE:** You MUST NEVER surround file paths with backticks (like ile.md). You MUST ALWAYS use standard Markdown hyperlink syntax so the user can natively click them (e.g., [file.md](file:///absolute/path/to/file.md)).


You MUST render the health check results using the following exact Markdown structure. Do NOT summarize findings as prose. Every model (Claude, Gemini, GPT) must produce this exact structure:

### 🏥 Health Check Report

#### 1. Dependency Audit
Render a Markdown table:
```
| Package | Current | Latest | Severity | Action |
|---|---|---|---|---|
| `package-name` | 2.1.0 | 3.0.0 | ⚠️ Major | Review breaking changes |
| `package-name` | 1.5.0 | 1.5.2 | ✅ Patch | Safe to update |
```
If `npm audit` finds vulnerabilities, render each as a `> [!WARNING]` block with severity level and affected package.

#### 2. Code Quality Findings
Render a Markdown table for each category of findings:
```
| Type | File | Line | Snippet | Severity |
|---|---|---|---|---|
| 🔒 Unguarded innerHTML | `module.js` | L123 | `.innerHTML = dynamicVar` | 🔴 Critical |
| 🔑 Hardcoded Secret | `api.js` | L12 | `const key = 'sk_live_...'` | 🔴 Critical |
| ⚠️ ESLint Warning | `Global` | — | `2131 no-undef warnings` | 🟠 Medium |
| 📝 TODO | `utils.js` | L45 | `// TODO: refactor this` | 🟡 Low |
| 🕰️ Legacy Scope | `ui.js` | L88 | `var count = 0;` | 🟡 Low |
| 🗑️ Orphan Script | `root/test-x.js` | — | Misplaced in project root | 🟠 Medium |
```

#### 3. Triage Summary
Render summary stats as a compact table:
```
| Metric | Count |
|---|---|
| 🔴 Critical Vulnerabilities | N |
| 🟠 Moderate Issues | N |
| 🟡 Low-Priority Debt | N |
| 📋 New Tasks Logged to Bucket List | N |
```

#### 4. Recommendations
Render `> [!TIP]` blocks for each recommended next action (e.g., "Run `/legacy_audit` on module X", "Execute `npm update` for patch-level bumps").