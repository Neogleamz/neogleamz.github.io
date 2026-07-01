---
model: sonnet
name: ship-it
description: Finalize and merge a feature branch — runs the QA-gated Release Manager sequence (tests, lint, ledger, merge). Use when the user says "ship it", "merge this branch", "finalize branch", or "ship the feature".
---

# Ship It (skill)

The user wants to finalize and merge the current feature branch. Execute the full Release Manager workflow defined in [.claude/commands/ship-it.md](.claude/commands/ship-it.md) — that file is the single source of truth for the steps and the mandatory Gate Results Table output.

Do not duplicate the steps here; read and follow that command file so the command and skill never drift.
