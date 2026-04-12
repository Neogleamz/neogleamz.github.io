# Security Audit Implementation Plan

### Design Decisions & Rationale
This task is a critical `P1` infrastructure priority. The application relies entirely on client-side Vanilla JS communicating directly with a Supabase PostgreSQL backend. Because our logic executes in the browser sandbox, security is heavily dependent on Database row-level security (RLS) policies to prevent unauthorized data mutation, and ensuring that no sensitive secrets (like service_role keys) are accidentally bundled or hardcoded into the client source code. 

### Execution Plan

1. **Static Analysis (Client-Side Escapes):**
   - Execute a `grep_search` across all HTML and JS files for high-risk string patterns (e.g., `service_role`, `sk_live`, secret keys, `.env` exposure).
   - Audit the application's Auth Gate logic in `neogleamz-engine.js` for bypass vulnerabilities. 
   - Ensure all Supabase initialization relies strictly on anonymous keys (`anon_key`) combined with robust JWT validations.

2. **Supabase RLS & Network Audit:**
   - I will utilize the Supabase MCP Server (`mcp_supabase_get_advisors`) to query real-time security advisory notices.
   - I will check the `get_publishable_keys` and verify no over-permissioned legacy keys are exposed.
   - I will also inspect user-input paths (e.g. `SOCIALZ` kanban input, `PACKERZ` QA inputs) to confirm we are safely transmitting values to Supabase, which intrinsically mitigates SQL injection, but we must verify no raw DOM `.innerHTML` insertion paths exist for XSS vulnerabilities.

3. **Remediation & Reporting Phase:**
   - Any exposed hardcoded keys or disabled RLS policies will be immediately revoked/patched via precise surgical edits or Supabase API commands.
   - An official `security-audit-report.md` will be generated, logging all checks passed and any actions taken.
