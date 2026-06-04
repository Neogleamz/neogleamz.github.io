# Project: Fail-Safe Backup Pipeline

## Architecture
- **Frontend**: `assets/js/system-tools-module.js` contains the backup logic (`executeExport`, `commitLiveRestore`).
- **Backend**: Supabase PostgreSQL database. Needs a new migration defining `get_active_schema_tables` RPC function.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | RPC Migration | Create Supabase migration with `SECURITY DEFINER` RPC `get_active_schema_tables` querying `pg_class` | none | DONE |
| 2 | Backup Guardrail | Refactor `executeExport` and `commitLiveRestore` to enforce `APP_TABLES` & `IGNORED_TABLES` | M1 | DONE |

## Interface Contracts
### Frontend ↔ Backend
- `supabaseClient.rpc('get_active_schema_tables')` returns array of strings (table names).

## Code Layout
- Frontend JS: `assets/js/system-tools-module.js`
- Database Migrations: `supabase/migrations/`
