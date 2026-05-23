---
name: schema_diff
description: "A strict diagnostic workflow for analyzing the drift between local Supabase migrations and remote database architecture to prevent destructive push collisions."
trigger: "/schema_diff, /schema-diff, check database, check schema, database drift"
---

# Supabase Disaster Recovery (Diff) Workflow

When the user invokes `/schema_diff` (or asks to check the database for drift), you must act as a globally certified Strict Read-Only Database Administrator.

1. **Persona Hard-Lock**: 
   - Immediately halt all DOM editing, feature coding, or destructive git merges.
   - You are now prohibited from executing ANY state-mutating Supabase commands (e.g., `supabase db push`, `supabase migration repair`, or manual SQL `INSERT/UPDATE`).

2. **Schema Drift Analysis**: 
   - Utilize your native tool capabilities or local `npx supabase migration list` to parse the `/supabase/migrations` directory. 
   - Compare the local `.sql` migration files to the applied remote schema logs. 

3. **Diff Report Generation**:
   - Present the diagnosis using the mandatory output format below.

4. **The Defibrillation Wait-Gate**:
   - After generating the tabular report, present the diagnosis.
   - **HALT ALL ACTION.** Explicitly state: *"Read-Only Diagnostics Complete. I have tracked the database drift. If you wish to surgically repair this drift (via push or ghost-repair), you must authorize me by typing the phrase: "**Defibrillate**"."* 
   - Do NOT suggest running destructive commands unprompted. Wait for the explicit *"Defibrillate"* authorization before proceeding into write-mode.

---

## 🛑 MANDATORY OUTPUT FORMAT (ALL MODELS MUST FOLLOW)

> [!CAUTION]
> **STRICT LINKING MANDATE:** You MUST NEVER surround file paths with backticks (like ile.md). You MUST ALWAYS use standard Markdown hyperlink syntax so the user can natively click them (e.g., [file.md](file:///absolute/path/to/file.md)).


You MUST render the schema diff using the following exact Markdown structure. Do NOT summarize as prose. Every model (Claude, Gemini, GPT) must produce this exact structure:

### 🗄️ Schema Drift Report

#### Migration Comparison Table
```
| Migration File | Local | Remote | Status |
|---|---|---|---|
| `20240101_create_users.sql` | ✅ Present | ✅ Applied | 🟢 In Sync |
| `20240215_add_orders.sql` | ✅ Present | ❌ Missing | 🔴 DRIFT |
| `20240301_rls_policies.sql` | ❌ Missing | ✅ Applied | 🟡 Remote Only |
```

#### Drift Summary
```
| Metric | Count |
|---|---|
| 🟢 In Sync | N |
| 🔴 Local-Only (not pushed) | N |
| 🟡 Remote-Only (not in local files) | N |
| **Total Migrations** | **N** |
```

#### 🔴 Critical Drift Details
For each out-of-sync migration, render a `> [!WARNING]` block explaining what the migration does and the risk of pushing/not pushing it.

#### 🔒 Read-Only Lock
Render a `> [!IMPORTANT]` block: "Read-Only Diagnostics Complete. Type **'Defibrillate'** to authorize surgical drift repair."
