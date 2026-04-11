---
trigger: always_on
description: "Auto-migrated Core A.I. Rule"
---

# Bug Hunter Workflow

When my prompt contains a raw stack trace, an error message, or starts with "Fix this error:", you must execute the following diagnostic workflow:

1. **Root Cause Analysis (Halt & Report)**: 
   - Analyze the stack trace and the codebase to identify the exact file and line causing the failure.
   - Do NOT immediately start rewriting code. 
   - Output a brief summary explaining *why* the crash occurred (e.g., "The Zengge Bluetooth service is timing out because the MAC address variable is undefined").
2. **Propose the Fix**: 
   - Provide a snippet of the corrected code.
   - Wait for me to say "apply fix".
3. **Execution**: 
   - Once approved, apply the fix.
   - Add a comment above the fixed code explaining what was patched.