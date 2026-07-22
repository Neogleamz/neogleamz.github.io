---
model: haiku
description: Generates a Situation Report (SITREP) based on current Git context and the Bucket List. (triggers: /status, whats up, status update, where are we, what's happening)
allowed-tools: Bash(git*), Bash(npm*), Bash(npx*), Read, Edit, Write, Grep, Glob
---

# Status Update Workflow

When the user invokes `/status` (or asks "whats up", "status update", "where are we", "what's happening"), immediately dispatch the entire task to the **`status-reporter`** subagent (`model: haiku`) — this workflow is fully self-contained (reads live git + ledger state) and needs no prior conversation context. Do not gather the git context or parse the ledger yourself in the main conversation.

Relay the subagent's returned dashboard verbatim as your response. Do not summarize, shorten, or reformat it. After relaying it, wait for the user's next command — do not take any further action.
