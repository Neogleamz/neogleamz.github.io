# UI Design Standards

> [!CAUTION]
> **ABSOLUTE RULE:** Do NOT use "X" or "✕" or "✖" or "&times;" for close buttons under any circumstances.
> All close buttons MUST use the explicit word "Close" or "CLOSE". 
> The user is absolutely sick of having to correct this. This rule supersedes any stylistic preference.

## Button State Feedback
> [!IMPORTANT]
> **ACTION BUTTONS MUST SHOW PROGRESS:** Any button that triggers a backend action, database write, API call, or long-running process (e.g., Save, Update, Sync, Export) MUST visually reflect its state.
> - Before action: `Save`
> - During action: `Saving...` or `Updating...`
> - After success: `Saved!` or `Completed!`
> Never leave the user wondering if a button click registered.

## Typography and Verbiage
- Never use symbol-based closures for Modals, Panes, or Overlays.
- Use explicit text (e.g. "Close", "Cancel").
- Buttons should have clear bounding boxes (do not use "floating text" with no background unless it is part of a specific contextual header).

## Consistency
- Enforce the Master Reference UI standards.
- Do not introduce arbitrary new UI utility classes when creating elements.
