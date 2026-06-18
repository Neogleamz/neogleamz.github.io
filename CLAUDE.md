# Neogleamz OS — Project Guide (Claude Code)

Internal business-ops platform for Neogleamz / SK8Lytz (skate LED hardware). Pure **vanilla-JS** SPA served on **public GitHub Pages** (the repo root *is* the live site; pushing `main` auto-deploys). Backend is **Supabase** (project `qefmeivpjyaukbwadgaz`). There is no build step for the runtime.

> These rules are the Claude-Code-adapted port of the Gemini ruleset in [.agents/rules/](.agents/rules). That folder remains the source of truth for Gemini; this file is the equivalent for Claude Code. Gemini-specific bits (absolute `file:///` links, `> [!SUCCESS]` blocks, `write_to_file`/`view_file` tool names, `// turbo` directives, `generate_image`) have been adapted or dropped.

## Architecture
- [index.html](index.html) (~650 KB, inline `<script>`/`<style>`) — shell, login, Supabase init; loads ~22 modules from [assets/js/](assets/js) `*-module.js` plus CDN libs.
- Backend: Supabase, 61 tables, RLS-gated. Edge functions: `shopify-webhook` (HMAC order ingest → `sales_ledger`), `shopify-force-sync`.
- **Source-of-truth docs** (read these; do not assume): [tools/SK8Lytz_App_Master_Reference.md](tools/SK8Lytz_App_Master_Reference.md) (schemas, BLE payloads, canonical UI labels/DOM targets) and [tools/SK8Lytz_Bucket_List.md](tools/SK8Lytz_Bucket_List.md) (task ledger).

## Hard constraints (non-negotiable)
- **Vanilla only** — no React/Vue/jQuery/TypeScript. DOM via native JS.
- **Web Bluetooth only** (`navigator.bluetooth`); no Node shims.
- **Responsive Flexbox** (`vh`/`vw`/`%`/`calc`) — no `position:absolute` structural hacks or negative margins.

## Core safety protocols
- **Branching:** feature/fix code goes on `feat/*`/`fix/*`/`chore/*` branches and merges via `/ship-it`. Only administrative `chore:` commits (tags, doc syncs) may go directly to `main`. Mid-session bug? Quietly `git checkout -b fix/...`, write the fix, await user testing, then `/ship-it`.
- **Never** read/edit/delete files in `.git/hooks/`.
- **Secrets:** never read or edit `.env` directly; use `.env.example` placeholders. Never hardcode credentials in JS/HTML.
- **Surgical edits:** verify file structure with `Read` before `Edit`; never blind-overwrite. Check `git diff` after edits; roll back unrelated damage.
- **Root whitelist:** never write loose scratch/diagnostic files to the repo root. Use `scratch/`, `scripts/`, or `diagnostics/`. Allowed root files only: configs (`.gitignore`, `.env.example`, eslint/prettier/jest configs, `package*.json`), `index.html`, `qa-dashboard.html`, `README.md`, `CHANGELOG.md`, `CLAUDE.md`. (Enforced by [.githooks/pre-commit](.githooks/pre-commit).)
- **Anti-hallucination:** verify payloads/schemas/UI labels against the Master Reference. Cite line numbers/hex/proof. If the Reference contradicts live code, HALT and ask.

## DOM security (XSS)
- Never assign dynamic data via `.innerHTML` / `.insertAdjacentHTML` / `document.write` without wrapping the payload in `window.safeHTML()` (DOMPurify).
- No inline event handlers (`onclick=`, etc.) — use `data-click` tokens bound to [assets/js/system-event-delegator.js](assets/js/system-event-delegator.js).

## Coding preferences
- **4-state UX:** every data component handles `Loading` / `Error` (with fallback) / `Empty` / `Success`.
- **8-point grid:** `clamp()` scaling, min `48px` tap zones.
- **UI mutex:** any button triggering a DB mutation must lock against double-submit via `window.executeWithButtonAction('btnId','LOADING...','✅ SAVED', async () => {...})`.
- **Zero-refresh:** after an async mutation resolves, immediately re-invoke the affected render functions (e.g. `renderInventoryTable()`); propagate to all affected views — never make the user refresh.
- **ChartJS:** `.destroy()` existing instances before repaint to avoid ghosting.
- **Caching:** prefer `localStorage` (prefix `sk8lytz_`) over heavy Supabase round-trips for session config.
- **Boy Scout rule:** while in `feat/*` or `refactor/*`, fix exactly one piece of nearby debt. Disable this during bug fixes.

## Database engineering (backend-first)
The database is the source of truth. When frontend logic needs fuzzy matching / guessing / fallback "bandages," STOP — that signals a schema gap. Fix it at the root with explicit UUIDs, foreign keys, and direct column mappings instead of sloppy frontend heuristics. Know the current schema before writing data logic.

## UI design standards
- **Close buttons:** NEVER use "X" / "✕" / "&times;". Always the explicit word **"Close"** (styled red, e.g. `btn-red`). This supersedes stylistic preference.
- **Button progress:** action buttons must show state — `Save` → `Saving...` → `Saved!`.
- No arbitrary new utility classes; enforce Master Reference UI standards.

## Verification mandate
No unverified "it's fixed." Prove it — run Node/scripts to check data structures, parse DOM/SVG coords for layout, show the receipts. Write throwaway verification scripts to `scratch/` (gitignored).

## Workflows
Workflow commands live in [.claude/commands/](.claude/commands) (e.g. `/ship-it`, `/bucketlist`, `/release`); flagship ones also auto-trigger as skills in `.claude/skills/`. The Gemini originals stay in [.agents/workflows/](.agents/workflows).
