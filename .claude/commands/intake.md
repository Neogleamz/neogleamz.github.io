---
model: haiku
description: The Zero-Bypass Protocol (Emergency Pivot & Defibrillator) — urgent pivot to a hotfix or major feature mid-session, interrupting the current workflow. (triggers: /zero_bypass_intake, pivot to this, fix this bug right now, emergency hotfix)
allowed-tools: Bash(git*), Bash(npm*), Bash(npx*), Read, Edit, Write, Grep, Glob
---

# The Zero-Bypass Protocol (Emergency Pivot & Defibrillator)

When the user requests to actively pivot their session and drop everything to fix a new bug or build an urgent feature, execute this sequence:

1. **The Intercept**: Acknowledge the request by stating: *"Emergency pivot initiated. Stashing active context and routing through zero-bypass..."*

2. **Mechanical Prep (delegated)**: Generate a short slug for the task (e.g. `fix/auth-crash`) and a one-line description from the user's request. Immediately dispatch the **`emergency-pivot-agent`** subagent (`model: haiku`) with that slug and description — it handles the WIP stash, P0 ledger injection, and branch reset entirely on its own; this portion is fully mechanical and needs no prior conversation context. Do not perform the git/ledger steps yourself in the main conversation. Relay the subagent's returned Gate Results Table and warning block verbatim.

3. **Implementation Planning (stays in the main conversation — NOT delegated)**: After the subagent returns, present a highly-detailed Implementation Plan for the bug fix/feature using the full context of the user's original request and this conversation, and await their approval to begin coding. This step requires live conversational context a cold subagent would not have, so it always runs here, not in a subagent dispatch.
