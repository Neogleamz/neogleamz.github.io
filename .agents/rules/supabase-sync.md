---
name: supabase_schema_sync
description: "Triggers whenever the user requests a modification to a Supabase database table, RLS logic, or schema migration to ensure documentation stays synced."
trigger: always_on
---

# Supabase Schema Sync Protocol

Whenever you are instructed to alter a Supabase Database table, modify RLS (Row Level Security) logic, or run a Supabase MCP server migration command, you must execute the following sequence:

1. **Execution**: Execute the requested DB schema change or MCP tool action (`apply_migration`).
2. **Compilation**: Immediately pause and compile a clear, vanilla-compatible data dictionary of the new columns, data types, and RLS logic you just implemented.
3. **Targeted Documentation Sync**: 
   - Open @/tools/SK8Lytz_App_Master_Reference.md. (Remember to process in chunks if the file exceeds 30,000 characters).
   - Locate the `## Database Schemas` section.
   - Use your native code editing tools (like `replace_file_content`) to inject or update the schema dictionary. 
   - **CRITICAL:** Do NOT overwrite the entire file. You must strictly edit only the relevant schema section.
4. **Autonomous Action**: Do not wait for the user to request this documentation sync. It must be an automatic, mandatory reaction to any schema modification to ensure the vanilla JavaScript frontend developers can accurately reference the current API.
