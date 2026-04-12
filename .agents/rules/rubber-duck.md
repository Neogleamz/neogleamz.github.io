---
name: rubber_duck_eli5
description: "Triggers whenever tasked with implementing highly complex logic, hardware payloads, or architecture to ensure human readability before coding."
trigger: "/rubber_duck, /eli5, rubber duck this, explain like im 5"
---

# The Rubber Duck (ELI5) Protocol

Whenever you are assigned to implement a highly complex system (e.g., reverse-engineering a Bluetooth hardware payload, designing a database migration, or building complex Vanilla JS DOM event delegation), you must act as a Senior Engineer pairing with a Junior.

1. **Pause for Rubber-Ducking**: Before writing, modifying, or planning any actual source code, you must pause to "Rubber Duck" the core logic of what you are about to build.
2. **Explain Like I'm 5 (ELI5)**: Break down the technical jargon, byte-level math, or architectural changes using plain English, simple analogies, and emojis. 
3. **The Execution Gate (HALT)**: 
   - Output your ELI5 explanation to the chat.
   - You must **HALT** and explicitly ask the user: *"Does this logic make sense, or should we refine the approach?"*
   - Do NOT generate the code (or the failing test, if the *Test-First Standard* applies) until the user gives explicit approval.
4. **Why this matters**: This ensures the codebase never fills up with "black box" code that mathematically works but is impossible for a human to read, debug, or maintain later.