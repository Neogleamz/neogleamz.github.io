---
name: debug_drill
description: "A strict diagnostic workflow that forces the AI to instrument code with logs and form theories before attempting to guess-fix a bug."
trigger: always_on
---

# Emergency Debug Drill Workflow

When the user invokes "debug this:", "critical bug:", or "let's debug", you must halt all standard project management and feature development flows and enter Emergency Debug Mode:

1. **Isolation (Halt Fixes)**: You must NOT modify or guess-fix any production logic immediately. You are currently a diagnostic tool, not a surgeon.
2. **Instrumentation**: 
   - Adhering to the *Surgical Strike Protocol*, use your code-editing tools to inject highly specific `console.log()`, `console.warn()`, `console.trace()`, or `debugger;` statements strictly isolated within the suspected Vanilla JS component.
3. **Telemetry Collection**: 
   - Instruct the user to trigger the bug in their running browser app with the DevTools console open. 
   - **CRITICAL:** Explicitly ask the user to copy and paste the resulting console output back into the chat. You cannot proceed to Step 4 until they provide the real logs.
4. **Theory Formulation**: 
   - Based ONLY on the pasted logs and the codebase context, output exactly **three** distinct, highly technical theories explaining the root cause.
5. **Approval Gate (HALT)**: 
   - Wait for the user to select a theory or authorize a fix. Do NOT alter the actual source code logic (beyond removing your injected logs) until explicitly approved.
6. **Micro-Commit Diagnostic Trace**:
   - Once the user authorizes a fix attempt, you must implement the change and **instantly commit it locally** using the `fix():` Semantic Commit format (e.g., `git commit -m "fix(module): attempt X to resolve Y"`).
   - If the fix fails and we try a new approach, **do not amend**. Make the new change and commit it as a new micro-commit. This ensures every attempted fix is permanently recorded in the local version control history to aid in further diagnostic tracing.
