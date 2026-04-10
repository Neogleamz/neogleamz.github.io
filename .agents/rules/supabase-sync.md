---
trigger: always_on
---

# Supabase Schema Sync Rule

Whenever you are instructed to alter a Supabase Database table, modify RLS logic, or run a Supabase MCP server migration command (`apply_migration`):

1. Execute your DB change schema or MCP tool action.
2. **Immediately** execute the `generate_typescript_types` tool from the supabase-mcp-server.
3. Use your code editing tools to save/overwrite the newly generated type definitions into `src/types/supabase.ts` (or the equivalent local types file).
4. Do not wait for me to request this TypeScript sync; it must be a mandatory, automatic reaction to any database schema modification to ensure the frontend never falls out of sync.
