---
description: "Auto-migrated Core A.I. Rule"
mode: "always"
---

---
trigger: always_on
---

# Emergency Debug Drill Rule - "debug this:", "critical bug:", "let's debug"

When my prompt includes "debug this:", "critical bug:", or "let's debug", you must halt all standard PM tracking flows and enter Emergency Debug Mode:

1. **Isolation**: You must NOT modify or guess-fix any production logic immediately.
2. **Instrumentation**: Use your code-editing tools to inject highly specific `AppLogger.log`, `console.warn`, or `console.trace` calls strictly isolated within the suspected component.
3. **Telemetry Validation**: Tell me to trigger the bug in the running app demo. Once triggered, analyze the latest output.
4. **Theory Formulation**: Based ONLY on the logs, output exactly **three** distinct, highly technical theories explaining the root cause.
5. **Approval Gate**: Wait for me to select a theory or authorize a fix before you are allowed to alter the actual source code logic.