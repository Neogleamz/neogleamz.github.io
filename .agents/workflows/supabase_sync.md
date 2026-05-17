---
name: supabase_schema_sync
description: "Triggers whenever the user requests a modification to a Supabase database table, RLS logic, or schema migration to ensure documentation stays synced."
trigger: "/sync_db, /supabase_sync, sync the database, update schema docs"
---

# Supabase Schema Sync Protocol

Whenever you are instructed to alter a Supabase Database table, modify RLS (Row Level Security) logic, or run a Supabase MCP server migration command, you must execute the following sequence:

1. **Infrastructure-as-Code Mandate**: 
   - **BANNED:** You and the user are strictly forbidden from copying `.sql` file contents and running them manually in the Supabase Cloud browser dashboard. This destroys the tracking ledger and causes migration drift.
   - **MANDATORY:** All database modifications MUST be executed by running `npx supabase db push` in the terminal to ensure the Git repository remains the 100% source of truth.
2. **Compilation**: Immediately pause and compile a clear, vanilla-compatible data dictionary of the new columns, data types, and RLS logic you just implemented.
3. **Targeted Documentation Sync**: 
   - Open @/tools/SK8Lytz_App_Master_Reference.md. (Remember to process in chunks if the file exceeds 30,000 characters).
   - Locate the `## Database Schemas` section.
   - Use your native code editing tools (like `replace_file_content`) to inject or update the schema dictionary. 
   - **CRITICAL:** Do NOT overwrite the entire file. You must strictly edit only the relevant schema section.
4. **Autonomous Action**: Do not wait for the user to request this documentation sync. It must be an automatic, mandatory reaction to any schema modification to ensure the vanilla JavaScript frontend developers can accurately reference the current API.

---

## 🛑 MANDATORY OUTPUT FORMAT (ALL MODELS MUST FOLLOW)

After completing the schema sync, you MUST render the following structured output. Every model (Claude, Gemini, GPT) must produce this exact structure:

### 🗄️ Schema Sync Confirmation

#### Migration Applied
Render a compact table:
```
| Field | Value |
|---|---|
| 📁 Migration File | `supabase/migrations/xxx.sql` |
| 🗄️ Table(s) Modified | `table_name` |
| 🔒 RLS Updated | ✅ Yes / ⏭️ No changes |
| 📚 Master Reference | ✅ Synced to `## Database Schemas` |
| 💾 Push Status | ✅ `npx supabase db push` executed |
```

#### Schema Changes
Render a Markdown table showing the exact columns/types added or modified:
```
| Column | Type | Nullable | Default | Change |
|---|---|---|---|---|
| `new_column` | `text` | ✅ | `null` | ➕ Added |
| `old_column` | `integer` | ❌ | — | ✏️ Modified |
```

#### 🎯 Next Steps
Render a `> [!TIP]` block suggesting verification steps (e.g., "Run `/schema_diff` to confirm remote parity").