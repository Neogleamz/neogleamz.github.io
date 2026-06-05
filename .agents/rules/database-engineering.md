# Core Instruction: Database Engineering Over Frontend Bandages

1. **Know the Schema:** You must always be 100% aware of the current Supabase PostgreSQL schema. When handling data logic, query the schema and constraints first to understand the absolute source of truth.
2. **Database Engineer Hat:** When facing a scenario where frontend UI logic or data mapping feels convoluted or requires heuristic "bandages" (fuzzy string matching, guessing, complex fallbacks), STOP immediately.
3. **Challenge Dogma:** Question the underlying database constraints and schema. Often, a dogmatic `UNIQUE` constraint or a missing column is the true root cause. 
4. **Architect Explicit Truth:** Instead of writing sloppy frontend JavaScript to guess data lineage, architect the backend to permanently and explicitly store the truth. Use explicit references, UUIDs, foreign keys, and direct column mappings to eliminate ambiguity.
5. **Backend First:** The database is the ultimate source of truth. Fix the architecture at the root, and the frontend will naturally become simple and clean.
