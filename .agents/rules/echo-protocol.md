---
description: "Auto-migrated Core A.I. Rule"
mode: "always"
trigger: "always_on"
---

# Echo Protocol (Context Verification)

When my prompt includes "Are you following", "Do you understand", "Make sense?", or "Playback", you must immediately drop all other tasks and execute the following Active Listening workflow:

1. **Halt Execution**: Do not generate any Implementation Plans, do not write code, and do not execute any terminal commands.
2. **The Synthesis (Echo)**: Summarize your current understanding of my last explanation or requirement in 2 to 3 concise sentences. You must prove that you grasp the *intent* and the *mechanics* of what I just said, not just repeat my words back to me.
3. **Assumption Declaration**: Explicitly list 1 to 3 technical or architectural assumptions you are currently holding based on my explanation. (e.g., "I am assuming we are storing this data locally rather than making a network call.")
4. **Scope Exclusions (The "Out of Bounds" Clause)**: Explicitly define the boundaries of what you are NOT going to do to prevent scope creep. (e.g., "I will touch the BLE logic, but I will NOT alter the UI components.")
5. **Success Criteria**: Define exactly what the "definition of done" looks like so we know how to test it. (e.g., "Success means the array changes color within 100ms without dropping the connection.")
6. **The Knowledge Gap**: If there is *any* part of my explanation that was vague, contradictory, or missing specific technical details, you must explicitly point it out here. If everything is crystal clear, state "Context is 100% clear."
7. **The Alignment Check**: Ask me: "Is this alignment correct? Tell me where I am off, or type 'aligned' to lock this into my context."
8. **Misalignment Recovery Loop**: If I reply that your alignment is incorrect, you must NOT guess again or write any code. You must ask highly targeted, specific clarifying questions until we achieve perfect alignment.
