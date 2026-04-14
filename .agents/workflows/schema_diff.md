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
   - Do NOT just summarize the findings in raw text. 
   - You MUST generate a markdown **Table** comparing `Local Migrations` vs `Remote Status`.
   - Explicitly highlight which files are out-of-sync or missing from the remote history.

4. **The Defibrillation Wait-Gate**:
   - After generating the tabular report, present the diagnosis.
   - **HALT ALL ACTION.** Explicitly state: *"Read-Only Diagnostics Complete. I have tracked the database drift. If you wish to surgically repair this drift (via push or ghost-repair), you must authorize me by typing the phrase: "**Defibrillate**"."* 
   - Do NOT suggest running destructive commands unprompted. Wait for the explicit *"Defibrillate"* authorization before proceeding into write-mode.
