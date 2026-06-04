# Original User Request

## Initial Request â€” 2026-05-22T22:47:02Z

Analyze the current Neogleamz Task Engine codebase and architecture, perform a blind and unbiased market comparison against industry-leading project management software (e.g., Asana, Jira, Linear), and architect a comprehensive upgrade proposal including Supabase schema designs and Vanilla JS UI mockups.

Working directory: d:\GitHub\neogleamz.github.io
Integrity mode: development

## Requirements

### R1. Unbiased Market Gap Analysis
The swarm must independently research modern task management platforms and compare their core philosophies, UI/UX paradigms, and data structures against the current `task-engine.js` implementation to identify critical missing features.

### R2. Strict Architectural Adherence
The swarm must act as Lead Architects. When proposing solutions, they are strictly bound by the Neogleamz Core Safety Protocols: 100% Vanilla JS (zero frameworks), zero reliance on Node.js modules, and strict adherence to the existing `SK8Lytz_App_Master_Reference.md` design patterns.

### R3. Tangible Design Assets
For the highest-priority missing features, the swarm must design the required Supabase PostgreSQL schema migrations and map out the raw Vanilla JS DOM structures (e.g., how the UI will render). They should utilize Mermaid diagrams for database relations and standard markdown/images for UI mockups.

## Acceptance Criteria

### Verification & Deliverables
- [ ] A final report artifact (`task_engine_evolution.md`) is successfully generated in the project root or docs folder.
- [ ] The report contains a clear Feature Comparison Matrix against at least 3 major industry competitors.
- [ ] The report includes at least one Mermaid Entity-Relationship Diagram (ERD) detailing how the new proposed features will integrate natively with the existing `taskz`, `cyclez`, and `task_templates` tables.
- [ ] The report includes concrete Vanilla JS DOM layout structures for the proposed UI enhancements, strictly avoiding any React/Vue/jQuery syntax.

## Follow-up — 2026-05-22T22:55:53Z

Map a comprehensive Mermaid hierarchy chart of all Hubz, Pagez, and Modalz, establish an official nomenclature dictionary, and systematically refactor the front-end repository using strict string replacements to purge legacy references.

Working directory: d:\GitHub\neogleamz.github.io
Integrity mode: development

## Requirements

### R1. Comprehensive Hierarchy Mapping
The swarm must deeply audit the Vanilla JS files and HTML DOM to map out every single active Hub, Page, and Modal. They must output a Mermaid hierarchy diagram that visually represents the entire application architecture.

### R2. Strict Nomenclature Standardization
The swarm must establish an official canonical naming dictionary (e.g., explicitly defining the new names for all Hubz, Pagez, and Modalz) to replace any old, confusing development terms. They MUST inject this dictionary directly into the `SK8Lytz_App_Master_Reference.md` file to ensure the AI and user never use legacy terms in future sessions.

### R3. Front-End Safe Refactoring (No DB Impact)
The swarm must execute strict, surgical string replacements across the frontend (`.html` and `.js` files) to update all textual references, IDs, or comments to the new nomenclature. **CRITICAL GUARDRAIL:** The swarm is strictly forbidden from modifying any Supabase Edge Functions, backend routing, or PostgreSQL DB Schemas.

## Acceptance Criteria

### Verification & Deliverables
- [ ] A `nomenclature_dictionary.md` artifact is successfully generated containing both the visual Mermaid Hierarchy Chart and the explicit Legacy-to-Canonical mapping table.
- [ ] The `SK8Lytz_App_Master_Reference.md` file is successfully updated to include the new official Nomenclature Dictionary.
- [ ] Refactoring is completed solely via safe string-replacements, and running `git status` verifies that zero backend or database files were touched.

## Follow-up — 2026-06-04T05:08:59Z

# Teamwork Project Prompt — Draft

> Status: Launched
> Goal: Craft prompt ? get user approval ? delegate to teamwork_preview

Build a Fail-Safe Backup pipeline in the native Vanilla JS browser application that explicitly enforces a Strict Categorization Guardrail to ensure no newly created application tables are ever accidentally forgotten in future backups.

Working directory: d:\GitHub\neogleamz.github.io
Integrity mode: development

## Requirements

### R1. Strict Categorization Guardrail (Frontend)
The existing backup system in `assets/js/system-tools-module.js` (`executeExport` and `commitLiveRestore`) must define two static arrays: `APP_TABLES` (tables we want to backup) and `IGNORED_TABLES` (unrelated tables we intentionally skip).

### R2. Schema Integrity RPC (Backend)
Since the frontend Supabase client cannot query `information_schema` directly, create a Supabase database migration (SQL file) that defines a `SECURITY DEFINER` RPC function (e.g., `get_active_schema_tables`). This function must dynamically query `pg_class` in the `public` schema (filtering out views, materialized views, and partitioned tables) and return a clean array of active base tables.

### R3. Pre-Flight Validation
Before `executeExport` runs its export loop, it must call `supabaseClient.rpc(...)` to get all live tables. If a base table is found that exists in NEITHER `APP_TABLES` nor `IGNORED_TABLES`, the system must throw a FATAL alert to the user in the UI (e.g., `Unrecognized table "xyz" found! Explicitly add it to APP_TABLES or IGNORED_TABLES in the codebase.`) and abort the backup completely.

### R4. Automated Dynamic Export
If the schema check passes, the `executeExport` loop must dynamically iterate through `APP_TABLES` to fetch and append the sheets to the XLSX workbook, rather than strictly hardcoding the `addSheet` calls sequentially. Ensure all existing JSON-parsing logic for specific tables (like `product_recipes` and `work_orders`) is preserved in a modular way during the dynamic loop.

## Acceptance Criteria

### Script Execution & Validation
- [ ] Running the backup via the `BRAINZ` UI against a database with a rogue table correctly halts execution and throws an alert identifying the rogue table.
- [ ] Running the backup with all tables correctly mapped completes successfully without error.
- [ ] The SQL RPC correctly filters out SQL views and extension tables.
- [ ] The existing JSON parsing logic for complex tables during export and restore remains perfectly intact.
