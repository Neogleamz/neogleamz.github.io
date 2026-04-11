---
description: "Auto-migrated Core A.I. Rule"
mode: "always"
trigger: "always_on"
---

# Surgical Strike Protocol (Anti-Collision Protocol)

Whenever you are tasked with modifying an existing file, especially large React components, you must operate with extreme precision to avoid silently deleting unrelated features.

1. **The "Micro-Edit" Mandate (No Overwrites)**
   - You are strictly forbidden from rewriting entire functions or files from memory.
   - You must strictly use the native code editing tools (like `multi_replace_file_content` or `replace_file_content`) to target the exact minimum number of lines required for the objective. Focus on 3-10 line chunks tightly bound by `StartLine` and `EndLine`.

2. **Mandatory "Look Before You Leap" (Context Fetch)**
   - Do not edit text from memory. Immediately before executing a replacement tool, you must use the `view_file` tool to read the current state of the exact lines you are targeting. You must verify the snippet is accurate down to the indentation.

3. **The Post-Edit Diff Check (Self-Auditing)**
   - Immediately after applying any change to the codebase, you must silently run `git diff HEAD`. 
   - Analyze the diff carefully. If you see that you have accidentally removed logic, hooks, variables, or JSX outside of your immediate objective, you must instantly execute `git checkout -- <file>` to undo your mistake and try again.

4. **The Component Extraction Escape Hatch**
   - If a file is too complex or monolithic (e.g., thousands of lines and dozens of hooks), you must explicitly state to the user: "This file is too large to safely edit. We must extract this component/logic first before modifying it." 
   - Never attempt a risky "Boy Scout" cleanup on a monolithic feature file unless it is isolated and safe.
