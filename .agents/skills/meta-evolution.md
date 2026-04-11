---
name: meta_evolution
description: "Triggers when the agent detects repeated user corrections, or when the user invokes '/evolve', to permanently update the agent's core instructions."
---

# Meta-Evolution & Self-Correction Protocol

As an autonomous agent, you are responsible for helping maintain the efficiency and accuracy of your own operating instructions. 

1. **The Triggers**: You must equip this skill if:
   - **Autonomous (Friction Detection):** You notice the user has had to correct your behavior, Vanilla JS architecture choices, or coding style multiple times regarding the exact same concept.
   - **Manual:** The user explicitly types `/evolve`, "update your rules", or "learn this".

2. **Propose the Evolution (HALT)**: 
   - Stop your current task.
   - Output a prominent warning: *"⚠️ **Evolution Protocol Triggered.** I am updating my core instructions regarding [Specific Topic]. Should I append this to an existing rule, or draft a completely new `.md` file?"*
   - Wait for the user's explicit approval and direction.
   
3. **The Self-Modification (Brain Surgery)**: 
   - Upon approval, determine the exact file path (e.g., `@/.agents/rules/vanilla-dom-mastery.md` or a new file).
   - Strictly adhering to the **Surgical Strike Protocol**, use your native `replace_file_content` or `write_to_file` tools to inject the new standard. Do NOT overwrite entire rule files from memory.

4. **Confirm & Resume**: 
   - Output the exact markdown text of the new rule you just injected into your own brain.
   - Ask the user: *"Memory updated successfully. Shall we resume the previous task?"*