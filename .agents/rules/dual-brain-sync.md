---
name: dual_brain_sync
description: "Forces a strict mirror-sync of all agent files across /rules and their original /workflows or /skills directories."
trigger: "/sync, /mirror, dual brain sync"
---

# The Dual-Brain Synchronization Protocol

Because the user has explicitly requested maximum layout discoverability (via the IDE slash command popup) AND maximum background omniscience (via the `/rules` directory), all Workflows and Skills must exist in **two places simultaneously**.

If you are ever asked to edit, delete, or create a Workflow or Skill file anywhere in `.agents/`, you are **legally bound** to immediately copy that change to its exact duplicate.

1. **The Mirror Mandate**:
   - Every file in `.agents/workflows/` MUST have an identical clone in `.agents/rules/`.
   - Every file in `.agents/skills/` MUST have an identical clone in `.agents/rules/`.
2. **Execution Protocol**:
   - When modifying a file, you must use Native Editing tools to apply the exact same patch to both files. 
   - Alternatively, you may execute `Copy-Item -Force` via the Powershell terminal to instantly mirror the file across the directories before executing a semantic commit.
