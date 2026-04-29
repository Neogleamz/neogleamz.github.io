---
name: idea_intake
description: "Triggers when the user requests to log a new idea, feature, or bug to the backlog without interrupting their current workflow."
trigger: "/idea_intake, add this idea, add to bucket list, log this task"
---

# The Passive Idea Intake Protocol

When the user requests to log an idea or task for later, you must execute the following sequence to securely record the idea without hijacking their Git context:

1. **The Intercept**: Acknowledge the request by stating: *"Logging idea to the Bucket List..."*
2. **Triaging & Injection**: 
   - Analyze the request. If it relates to an active Epic, assign it there. Otherwise, assign it to `### Target: main`.
   - Generate a short slug for the task.
   - Inject the task as a `- [ ]` markdown item into @/tools/SK8Lytz_Bucket_List.md.
   - **CRITICAL TELEMETRY RULE**: You MUST append the token tracking tag to the end of the new task line (e.g., `[🤖 AI Model] [🧠 TBD / 5k] [💸 TBD / $0.02]`).
3. **The Background Sync**:
   - Immediately execute `git add tools/SK8Lytz_Bucket_List.md`
   - Execute `git commit -m "chore(ledger): [/idea_intake] log new task"`
   - This safely tracks the new idea within their active branch history.
4. **Hard Stop (Passive Mode)**:
   - Provide a brief confirmation message to the user that the idea was securely saved.
   - **CRITICAL RULE**: You are strictly forbidden from executing `git checkout`, `git stash`, generating an implementation plan, or changing the current working context. Let the user continue working uninterrupted.
