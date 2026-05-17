---
name: bug_hunter
trigger: "/bug_hunter, fix this error, fix this crash, fix this bug"
description: "A strict diagnostic workflow for analyzing stack traces, formulating theories, and awaiting authorization before writing code."
---

# Bug Hunter Workflow

When my prompt contains a raw stack trace, an error message, or starts with "Fix this error:", you must execute the following diagnostic workflow:

1. **Root Cause Analysis (Halt & Report)**: 
   - Analyze the stack trace and the codebase to identify the exact file and line causing the failure.
   - Do NOT immediately start rewriting code. 
   - **Deep Telemetry Check:** If the stack trace is ambiguous, you must inject `sysLog('CRASH CONTEXT', 'red', { stateObject })` to pull full Supabase payloads and Hex arrays. You are strictly forbidden from using basic `console.log()`.
   - Output a brief summary explaining *why* the crash occurred (e.g., "The Zengge Bluetooth service is timing out because the MAC address variable is undefined").
2. **Propose the Fix**: 
   - Provide a snippet of the corrected code.
   - Wait for me to say "apply fix".
3. **Execution**: 
   - Once approved, apply the fix.
   - Add a comment above the fixed code explaining what was patched.

---

## 🛑 MANDATORY OUTPUT FORMAT (ALL MODELS MUST FOLLOW)

When presenting the Root Cause Analysis (Step 1), you MUST render the following structured output. Do NOT output a plain text paragraph. Every model (Claude, Gemini, GPT) must produce this exact structure:

### 🐛 Bug Hunter Diagnosis

#### Crash Summary Card
Render a compact metadata table:
```
| Field | Value |
|---|---|
| 🔴 Error Type | `TypeError` / `ReferenceError` / `SyntaxError` / etc. |
| 📁 Source File | `path/to/file.js` |
| 📍 Line Number | L123 |
| 🔗 Stack Depth | N frames deep |
| 🌿 Active Branch | `feat/xxx` |
```

#### Root Cause Analysis
Render a `> [!WARNING]` block explaining exactly WHY the crash occurred, citing specific variable names, function calls, and line numbers from the source code.

#### Proposed Fix
Render the corrected code inside a fenced code block with the language specified. Above the code block, render a `> [!NOTE]` block explaining what the fix changes and why.

#### 🎯 Approval Gate
Render a `> [!IMPORTANT]` block: "Type **'apply fix'** to authorize the patch, or describe an alternative approach."