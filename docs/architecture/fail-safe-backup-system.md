# Architecture Decision Record: Fail-Safe Backup System

## 1. Context & Objectives
The existing backup system relied on a brittle structure of hardcoded sheet names (e.g. mapping `Inventory` to specific queries). When the database architecture evolved and new tables were added (like `inventory_adjustments_log`), they were completely missed during regular exports. The objective is to build a foolproof database backup pipeline that ensures 100% data coverage of the core application without capturing unrelated project tables.

## 2. Architectural Overview (Context Level)
The new system introduces a **Strict Categorization Guardrail**. Rather than blindly backing up every table dynamically, the backup execution script maintains an explicit whitelist:
- `APP_TABLES`: Tables actively utilized and backed up for this core app.
- `IGNORED_TABLES`: Known tables in the database that belong to unrelated projects.

Prior to executing a backup, the system queries the Supabase `public` schema. If it detects *any* active table that does not exist in either array, it throws a Fatal Error and refuses to run, forcing the developer to explicitly categorize the new table.

## 3. Industry Standard Validation
The **Database Architect Subagent** validated this architecture and flagged critical edge cases in standard PostgreSQL implementations:
- **Views & Partitions:** Standard `information_schema` queries return views, materialized views, and partitioned child tables, which would false-trigger the fatal error. 
  - *Mitigation:* The script will query `pg_class` where `relkind = 'r'` and `relispartition = false` to guarantee only root data tables are evaluated.
- **Cross-Schema References:** If `APP_TABLES` have foreign keys pointing to `IGNORED_TABLES` or `auth.users`, restoring them standalone could fail constraint checks. 
  - *Mitigation:* The backup script must disable triggers/constraints during restoration or ensure topological dependency sorting.
- **Extensions:** Enabling extensions like PostGIS automatically spawns tables like `spatial_ref_sys` in the `public` schema. 
  - *Mitigation:* Known extension tables will be permanently added to `IGNORED_TABLES`.

## 4. Design Decisions & Trade-offs
- **Why a whitelist/blacklist instead of dynamic wildcarding?** While wildcard scraping is zero-maintenance, it pollutes backups with unrelated data and creates security/compliance risks if sensitive unrelated tables are downloaded locally. The fail-closed whitelist trades minor developer friction (updating an array) for guaranteed data integrity and zero missed tables.
