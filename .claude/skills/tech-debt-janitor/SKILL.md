---
model: sonnet
name: tech-debt-janitor
description: Full codebase health check: audit dependencies, hunt TODO/FIXME/HACK, scan for unguarded innerHTML, check for hardcoded secrets and legacy var declarations, triage findings into the bucket list. Use when the user says "health check", "audit the codebase", or "/health-check".
---

# tech-debt-janitor (skill)

Execute the workflow defined in [.claude/commands/tech-debt-janitor.md](.claude/commands/tech-debt-janitor.md) — that command file is the single source of truth for the steps and output format. Read and follow it; do not duplicate the steps here.
