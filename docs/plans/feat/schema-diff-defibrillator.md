# Implement Disaster Recovery Workflow (`/schema_diff`)

The goal of this task is to configure the Agent to function safely as a Database Administrator mapping deployment drift between local environments and remote production.

## User Review Required

Please review the proposed execution sequence for the `[/schema_diff]` workflow.

## Proposed Changes

### Configuration (`.agents/workflows/schema_diff.md`)

#### [NEW] [schema_diff.md](file:///d:/GitHub/neogleamz.github.io/.agents/workflows/schema_diff.md)
I will build a new agent workflow file that enforces the following sequence when `/schema_diff` is called:
1. **Persona Shift Integration**: The AI will immediately halt all code editing behaviors and adopt a "Strict Read-Only Database Administrator" persona. Mutating commands like `supabase db push` or `supabase migration repair` are explicitly blocked natively during phase 1.
2. **Schema Drift Analysis**: The AI uses its tools to parse the local `/supabase/migrations` directory and cross-references them against the active remote schema using available `npx supabase` read commands (e.g., `supabase migration list`) or the built-in MCP `list_migrations` tool.
3. **Diff Report Generation**: The AI produces a detailed, tabular report highlighting EXACTLY which SQL files are applied remotely vs locally, highlighting out-of-sync migrations or missing history nodes.
4. **Defibrillation Prompt**: The AI waits for humans to authorize a resolution sequence (the actual state-mutating execution). The user must explicitly type *"Defibrillate"* to authorize any destructive or repair actions (e.g., `supabase migration repair`).

### Design Decisions & Rationale
We are designing this workflow specifically around "Safety First Database Management." Given the fact that free-tier Supabase does not have automated backups, executing blind `supabase db push` commands can irrevocably destroy tracking history if local states are out of sync. By forcing the AI to execute a Read-Only Diff and output a visual table *before* ever writing data, we remove the anxiety of database corruption and enforce manual human gates for DB state modifications.

## Open Questions

None currently.

## Verification Plan

### Manual Verification
- We will visually verify the Markdown syntax logic of the newly constructed Agent file in Visual Studio Code.
