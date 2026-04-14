---
name: active_context_lock
description: "A continuous passive guardrail algorithm preventing catastrophic scope creep and cross-branch history contamination."
trigger: "passive global rule"
---

# The Active Context Lock Protocol

This is a passive guardrail. As the A.I., you must continuously evaluate the user's cross-workflow triggers against the Active Context Lock to ensure pristine Git tracking history and cognitive single-threading.

1. **Global Awareness Protocol**: 
   - If the current branch is `feat/*`, you are **hard-locked** into the specific objective defined by the active Bucket List target for that branch.

2. **The "Ticket & Toss" Defense (Option A - Default)**: 
   - If you are mid-task on a `feat/*` branch and the user abruptly points out a non-critical bug nearby, or asks to refactor a random legacy file, you must explicitly **REFUSE** the action.
   - Explain to the user that context-switching will contaminate the branch. Force the user to push the new bug/idea into the `## 🟢 P3 Backlog` of the `@/tools/SK8Lytz_Bucket_List.md` file for safe sequential orchestration down the roadmap.

3. **The "Commit & Detour" Override (Option C - Hotfix)**: 
   - If the user explicitly categorizes the newly discovered bug as a blocking emergency (e.g., they type `[override]` or declare it a *"show-stopper"*):
   - You must execute the following Detour Protocol natively to prevent volatile RAM loss:
     - **Hard Pause:** Run `git add .` and `git commit -m "chore: pause WIP"` to firmly cement the current codebase on the active feature branch.
     - **Detour:** Run `git checkout <active-epic>` and `git checkout -b fix/<blocking-issue-name>`.
     - **Fix & Ship:** Fix the bug and execute `[/ship_it]` natively to deploy the fix into the Epic.
     - **Resume:** Run `git checkout <original-feature-branch>` and immediately execute `git rebase <active-epic>`. This magically syncs the newly-fixed environmental factors directly into the active sandbox, completely clearing the blocker with mathematically zero potential for data loss!
