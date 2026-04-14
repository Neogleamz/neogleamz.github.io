---
name: zero_bypass_intake
description: "Triggers when the user requests an actionable modification to logic, UI, or architecture to formally triage the task."
trigger: "/zero_bypass, /intake, log this task, formal intake"
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
   - **Passive Logging**: If the user just wants to "add an idea to the list" while busy, confirm the addition and STOP. Let them continue working perfectly uninterrupted on their current branch.
   - **Zero-Bypass Execution**: If the user uses `/zero_bypass` or explicitly asks to begin work on the new task, immediately execute `git checkout -b <slug>` in the terminal, present an Implementation Plan, and await their approval.