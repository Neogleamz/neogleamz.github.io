---
model: haiku
description: Gracefully updates the Bucket List ledger and internal CHANGELOG.md directly after a /ship_it without triggering formal version bumps or tags. (triggers: /release_silent, silent release, silent sync)
allowed-tools: Bash(git*), Bash(npm*), Bash(npx*), Read, Edit, Write, Grep, Glob
---

# Silent Release Workflow

When the user invokes `/release_silent` (or instructs you to do a "silent release"), immediately dispatch the entire task to the **`silent-release-agent`** subagent (`model: haiku`) — this workflow is fully deterministic (ledger scan, tag transition, changelog append, ghost commit) and needs no prior conversation context. Do not perform the ledger/changelog edits yourself in the main conversation.

Relay the subagent's returned confirmation verbatim as your response. Do not summarize, shorten, or reformat it.
