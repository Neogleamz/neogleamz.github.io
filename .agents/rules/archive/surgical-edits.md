---
name: surgical_edits
description: "Strictly enforced code-editing guardrails to prevent accidental overwrites and silent deletions."
trigger: always_on
---

# Surgical Strike Protocol (Anti-Collision Protocol)

Whenever you are tasked with modifying an existing file, especially large HTML or JS files, you must operate with extreme precision to avoid silently deleting unrelated features.

1. **The "Micro-Edit" Mandate (No Overwrites)**
   - You are strictly forbidden from rewriting entire functions or files from memory.
   - You must strictly use native code editing tools (like `multi_replace_file_content` or `replace_file_content`) to target the exact minimum number of lines required for the objective. Focus on small line chunks tightly bound by exact `StartLine` and `EndLine` parameters.

2. **Mandatory "Look Before You Leap" (Context Fetch)**
   - Do not edit text from memory. Immediately before executing a replacement tool, you must use the `view_file` tool to read the current state of the exact lines you are targeting. You must verify the snippet is accurate down to the indentation.

3. **The Post-Edit Diff Check (Self-Auditing)**
   - Immediately after applying any change to the codebase, you must silently run `git diff HEAD` in the terminal. 
   - Analyze the diff carefully. If you see that you have accidentally removed variables, DOM logic, event listeners, or HTML structure outside of your immediate objective, you must instantly execute `git checkout -- <file>` to undo your mistake and try again.

4. **The Monolith Escape Hatch & Chunking**
   - If a file is excessively complex or monolithic, do not attempt a risky "Boy Scout" cleanup.
   - To avoid character limits and token degradation, always break large code files into multiple parts of about 30,000 characters when processing. 
   - If a file is too tangled, explicitly state to the user: *"This file is too large to safely edit. We must extract this logic into a separate module first."*
