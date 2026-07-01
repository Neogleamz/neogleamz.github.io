---
model: opus
description: A strict diagnostic workflow that forces the AI to instrument code with logs and form theories before attempting to guess-fix a bug. (triggers: /emergency_debug_drill, debug this:, critical bug:, let's debug)
allowed-tools: Bash(git*), Bash(npm*), Bash(npx*), Read, Edit, Write, Grep, Glob
---

# Emergency Debug Drill Workflow

When the user invokes "debug this:", "critical bug:", or "let's debug", you must halt all standard project management and feature development flows and enter Emergency Debug Mode:

1. **Isolation (Halt Fixes)**: You must NOT modify or guess-fix any production logic immediately. You are currently a diagnostic tool, not a surgeon.
2. **Instrumentation (Deep Telemetry)**: 
   - Adhering to the *Surgical Strike Protocol*, use your code-editing tools to inject our native deep object serializer `sysLog(msg, color, payload)` into the suspected Vanilla JS component.
   - **CRITICAL:** You are strictly forbidden from injecting basic `console.log()` statements. You must extract actual state using the payload parameter (e.g., `sysLog('Cart Check', 'orange', { cartArray })`).
3. **Telemetry Collection**: 
   - Instruct the user to trigger the bug in their running browser app with the DevTools console open. 
   - **CRITICAL:** Explicitly ask the user to copy and paste the resulting `sysLog` output back into the chat. You cannot proceed to Step 4 until they provide the real logs.
4. **Theory Formulation**: 
   - Based ONLY on the pasted logs and the codebase context, output exactly **three** distinct, highly technical theories explaining the root cause.
5. **Approval Gate (HALT)**: 
   - Wait for the user to select a theory or authorize a fix. Do NOT alter the actual source code logic (beyond removing your injected logs) until explicitly approved.
6. **Micro-Commit Diagnostic Trace**:
   - Once the user authorizes a fix attempt, you must implement the change and **instantly commit it locally** using the `fix():` Semantic Commit format (e.g., `git commit -m "fix(module): attempt X to resolve Y"`).
   - If the fix fails and we try a new approach, **do not amend**. Make the new change and commit it as a new micro-commit. This ensures every attempted fix is permanently recorded in the local version control history to aid in further diagnostic tracing.

---

## 🛑 MANDATORY OUTPUT FORMAT (ALL MODELS MUST FOLLOW)

> [!CAUTION]
> **STRICT LINKING MANDATE:** You MUST NEVER surround file paths with backticks (like ile.md). You MUST ALWAYS use standard Markdown hyperlink syntax so the user can natively click them (e.g., [file.md](file:///absolute/path/to/file.md)).

When presenting the Theory Formulation (Step 4), you MUST render the following structured output. Do NOT output theories as a simple numbered list. Every model (Claude, Gemini, GPT) must produce this exact structure:

### 🔬 Debug Drill — Theory Matrix

#### Instrumentation Summary
Render a compact table showing what was instrumented:
```
| sysLog Injection | File | Line | Payload Tracked |
|---|---|---|---|
| `sysLog('Cart Check', ...)` | `module.js` | L45 | `{ cartArray }` |
| `sysLog('Auth State', ...)` | `auth.js` | L12 | `{ session, user }` |
```

#### Theory Cards
For EACH of the 3 theories, render a separate `> [!WARNING]` block structured as:
```
> [!WARNING]
> **Theory 1: [Descriptive Title]**
> - **Root Cause:** [Exact technical explanation citing variable names and line numbers]
> - **Evidence:** [What in the sysLog output supports this theory]
> - **Fix Approach:** [1-sentence description of the surgical fix]
> - **Confidence:** 🔴 High / 🟡 Medium / 🟢 Low
```

#### 🎯 Approval Gate
Render a `> [!IMPORTANT]` block: "Select a theory (1, 2, or 3) to authorize the fix attempt, or describe your own theory."
