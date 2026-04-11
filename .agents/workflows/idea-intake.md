---
name: idea_intake
description: "Captures natural language ideas and formats them into the project bucket list with structured git slugs."
trigger: "add to:, new task:, idea:"
---

# Idea Intake Workflow

When the user initiates a request with "add to:", "new task:", or "idea:", act as the Project Manager and execute this sequence:

1. **Analyze the Request**: Extract the core requirement and determine the appropriate category.
2. **Generate Branch Slug**: Create a git-friendly slug using these prefixes (aligned with Semantic Commit Rules):
   - `fix/` (bugs) | `feat/` (new logic/UI) | `chore/` (maintenance)
   - `perf/` (optimizations) | `docs/` (documentation) | `style/` (CSS/formatting)
   - `hw-test/` (Bluetooth/Hardware experiments)
3. **Format the Item**: Draft the entry: `- [ ] \`<generated-slug>\` : <Professional description of the task>`
4. **Determine Placement**: 
   - Parse @/tools/SK8Lytz_Bucket_List.md (using 30k character chunking if needed).
   - If the task includes "up next", "priority", or "now", place it at the absolute top of the `## 🔴 High Priority / Next Up` section.
   - Otherwise, append it to the bottom of the relevant `### Target:` section or the `main` section.
5. **Update File**: Use `replace_file_content` to inject the item. Strictly follow the *Surgical Strike Protocol* to avoid deleting existing tasks.
6. **Zero-Bypass Integration**:
   - If the request was marked as "urgent" or "up next", immediately trigger the `zero_bypass_intake` Skill: checkout the branch and present an Implementation Plan.
   - Otherwise, confirm the addition: *"Added `<slug>` to the `<section>` target."* and **HALT**.