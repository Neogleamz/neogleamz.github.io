---
description: "Auto-migrated Core A.I. Rule"
mode: "always"
trigger: "always_on"
---

# Supabase Schema Sync Rule

Whenever you are instructed to alter a Supabase Database table, modify RLS logic, or run a Supabase MCP server migration command (`apply_migration`):

1. Execute your DB change schema or MCP tool action.
2. **Immediately** pause to compile a clear, vanilla-compatible data dictionary of the new columns, types, and logic you just implemented.
3. Use your code editing tools to save/overwrite the newly mapped architecture changes into `tools/SK8Lytz_App_Master_Reference.md` under the Database Schemas section.
4. Do not wait for me to request this documentation sync; it must be a mandatory, automatic reaction to any database schema modification to ensure our vanilla JavaScript frontend developers can accurately reference the current API schema.
