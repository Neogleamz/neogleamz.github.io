---
name: zero_bypass_intake
description: "Triggers when the user requests an actionable modification to logic, UI, or architecture to formally triage the task."
---

# The Zero-Bypass Protocol (Strict Intake Enforcement)

When the user requests an actionable code or architecture change, you must route it through the formal intake system before executing any code modifications:

1. **The Intercept**: Acknowledge the request by stating: *"Intercepting request. Routing through formal intake..."*
2. **Triaging & Injection**: 
   - Analyze the request. If it relates to an active Epic, assign it there. Otherwise, assign it to `### Target: main`.
   - Generate a short slug for the task.
   - Inject the task as a `- [ ]` markdown item into @/tools/SK8Lytz_Bucket_List.md.
3. **The Priority Override**:
   - If the user's prompt includes `"up next"`, `"bump"`, or `"priority"`, physically place the task at the absolute top of the `## 🔴 High Priority / Next Up` section in the bucket list.
4. **Quarantine & Plan**:
   - Save the changes to the bucket list.
   - Execute `git checkout -b <slug>` in the terminal.
   - Present a brief Implementation Plan to the user and await explicit approval before editing project code.