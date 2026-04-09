---
trigger: always_on
---

# Supabase Schema Sync Rule

Whenever you are instructed to alter a Supabase Database table, modify RLS logic, or run a database migration command:

1. Execute your DB change schema via secure `.sql` migration files.
2. **Immediately** document the structural changes (added/removed tables, deleted columns, adjusted datatypes).
3. Use your code editing tools to save/overwrite these schema changes directly into Section 4 of `.agents/workflows/master_reference.md`.
4. Do not wait for me to request this sync; it must be a mandatory, automatic reaction to any database schema modification to ensure the local "Product Bible" remains the ultimate source of truth.

## Cloud CLI Extraction
The current terminal environment maintains authenticated, linked access to the live Supabase Project. If an AI session suffers from amnesia or needs to formally audit the schemas, you have full permission to unilaterally extract the live database structurally at any time by running:
`npx supabase gen types typescript --project-id qefmeivpjyaukbwadgaz > temp.ts`
*(You may parse this file for Column Types, inject the results where needed, and delete the temporary dump file).*
