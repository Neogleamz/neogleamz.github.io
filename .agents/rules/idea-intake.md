---
description: "Auto-migrated Core A.I. Rule"
mode: "always"
trigger: "always_on"
---

# Idea Intake Workflow Rule -- "add to:", "new task:", or "idea:"

When my prompt starts with "add to:", "new task:", or "idea:", you must act as the Project Manager and execute the following workflow:

1. **Analyze the Request**: Extract the core requirement from my natural language prompt.
2. **Generate Branch Slug**: Create a standard, git-friendly branch slug for the task using these prefixes:
   - `fix/...` for bugs, errors, or broken features.
   - `feat/...` for new modules, UI elements, or logic.
   - `chore/...` for updates, refactoring, or maintenance.
   - `hw-test/...` for hardware/Bluetooth experiments.
3. **Format the Item**: Draft the new bucket list item exactly like this: `- [ ] \`<generated-slug>\` : <Clear, professional description of the task>`
4. **Determine Placement**: Read `tools/SK8Lytz_Bucket_List.md` to see the current active epics and categories.
   - If the task clearly belongs to an active `### Target: epic/...`, insert it at the bottom of that section.
   - If it is a bug fix, general chore, or doesn't fit an active epic, insert it at the bottom of the `### Target: main` section.
5. **Update File**: Use your code-editing tools to insert the newly formatted item into the correct section of `tools/SK8Lytz_Bucket_List.md`.
6. **Confirm & Halt**: Output a message confirming the addition. For example: "Added \`fix/rgn-slider-crew-hub\` to the **main** target section." Do not start working on the task. Wait for me to say "what's next".
7. **Override (Zero-Bypass Integration)**: If my prompt includes an urgent directive along with the idea (e.g. "idea: change the font right now" or "add to: fix spacing up next"), you must skip the Halt step and immediately trigger the **Zero-Bypass Protocol** to checkout the branch and draft the plan.
