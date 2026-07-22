---
model: haiku
description: Safely parses and prunes local Git branches that have already been merged. (triggers: /repo_cleanup, /cleanup, clean up the repository, clean up repo)
allowed-tools: Bash(git*), Bash(npm*), Bash(npx*), Read, Edit, Write, Grep, Glob
---

# Repository Cleanup Workflow

When the user invokes `/cleanup` (or asks to "clean up the repository"), immediately dispatch the entire task to the **`git-cleanup-agent`** subagent (`model: haiku`) — this workflow is fully deterministic and needs no prior conversation context. Do not perform the branch-pruning steps yourself in the main conversation.

Relay the subagent's returned report verbatim as your response. Do not summarize, shorten, or reformat it.
