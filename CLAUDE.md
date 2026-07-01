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
- **Topological integrity:** never create, delete, or move any button, modal, or UI element without simultaneously updating the Mermaid Architectural Blueprint in [tools/SK8Lytz_App_Master_Reference.md](tools/SK8Lytz_App_Master_Reference.md).
- **Trunk hydration:** on long-running `feat/*`/`epic/*` branches, periodically run `git merge main` to absorb parallel completed tasks and prevent integration debt.
- **Ledger hydration gate:** before editing [tools/SK8Lytz_Bucket_List.md](tools/SK8Lytz_Bucket_List.md), pull the latest `main` first to prevent overwriting another session's `[🚀]` release tags, then re-read the ledger before editing.
- **Swarm lock:** before dispatching any subagent via `/teamwork-preview`, mark the target task `[/]` in the ledger first. Do not invoke any subagent tool until the ledger write is confirmed.
- **Discovery mode:** when charting undocumented protocols not found in the Master Reference, explicitly declare "Discovery Mode" so the user knows that the next steps are based on logical deduction rather than confirmed reference data.

## DOM security (XSS)

### Canonical scanner
Run `node scripts/xss-audit.js` for any security scan. **Never use grep with negative-lookahead patterns** — they silently fail on long lines and produce false negatives. The script reads every line of every file and catches 100% of violations.

### ✅ Allowed patterns (only these)
```js
element.innerHTML = window.safeHTML(html);                          // direct call — correct
element.insertAdjacentHTML('pos', window.safeHTML(html));           // direct call — correct
document.body.insertAdjacentHTML('beforeend', window.safeHTML(h));  // direct call — correct
// For print windows: sanitize the assembled string first
const safe = DOMPurify.sanitize(html);
printWin.document.write(safe);
// For static/empty strings — no wrapper needed
element.innerHTML = '';
element.innerHTML = '<span>static literal only</span>';
```

### 🚫 Forbidden patterns (never write these)
```js
// ❌ BANNED — ternary fallback exposes raw HTML if engine.js fails to load
element.innerHTML = window.safeHTML ? window.safeHTML(x) : x;

// ❌ BANNED — dynamic data with no guard
element.innerHTML = `...${dbValue}...`;
element.insertAdjacentHTML('beforeend', `...${msg}...`);
element.outerHTML = `...${e.message}...`;

// ❌ BANNED — document.write with DB-sourced strings unescaped
win.document.write(`...${s.text}...`);   // s.text is a DB column

// ❌ BANNED — inline event handlers in HTML strings or static markup
element.innerHTML = `<button onclick="fn()">`;  // use data-click token
// In static HTML: <select onchange="fn()">      // use data-change token
```

### Why the ternary is specifically banned
`window.safeHTML` is always defined by `neogleamz-engine.js` (it has its own `innerText` escape fallback inside). The ternary's false branch (`x`) is never needed and creates an XSS gate if the engine module fails to load. Unconditional `window.safeHTML(x)` is both safer and simpler.

### Active scan mandate
During any code review, `/legacy-audit`, or `/health_check`:
1. Run `node scripts/xss-audit.js` first — its output is ground truth
2. Manually read every raw hit (do not filter with regex); confirm each is SAFE / GUARDED / UNGUARDED
3. Any UNGUARDED assignment with dynamic data is a **Critical** finding — block the PR
4. Track all findings in [tools/SK8Lytz_Bucket_List.md](tools/SK8Lytz_Bucket_List.md) §🧹 Technical Debt

## Coding preferences
- **4-state UX:** every data component handles `Loading` / `Error` (with fallback) / `Empty` / `Success`.
- **8-point grid:** `clamp()` scaling, min `48px` tap zones.
- **UI mutex:** any button triggering a DB mutation must lock against double-submit via `window.executeWithButtonAction('btnId','LOADING...','✅ SAVED', async () => {...})`.
- **Zero-refresh:** after an async mutation resolves, immediately re-invoke the affected render functions (e.g. `renderInventoryTable()`); propagate to all affected views — never make the user refresh.
- **ChartJS:** `.destroy()` existing instances before repaint to avoid ghosting.
- **Caching:** prefer `localStorage` (prefix `sk8lytz_`) over heavy Supabase round-trips for session config.
- **Boy Scout rule:** while in `feat/*` or `refactor/*`, fix exactly one piece of nearby debt. Disable this during bug fixes.
- **Workflow output format:** when executing any structured workflow command (`/ship-it`, `/release-manager`, `/wind-down`, `/status-update`, etc.), render output using the file's `MANDATORY OUTPUT FORMAT` section if present — Gate Results Tables (✅/❌/⏭️ per gate), `> [!WARNING]` blocks for traps, `> [!TIP]` for next-step suggestions, Final State Card at the end. Never summarize a workflow result as plain prose.
- **Interrupt recovery:** if output is interrupted by a background task notification (UI flash), fully reconstruct and re-emit the entire lost explanation and next steps. Never emit a short "ready for next command" placeholder.
- **Micro-commit cadence:** after editing any source file, stage and commit immediately using semantic format (`feat:`, `fix:`, `refactor:`). Do not accumulate large batches of uncommitted changes.
- **Ledger exemption:** do NOT include [tools/SK8Lytz_Bucket_List.md](tools/SK8Lytz_Bucket_List.md) or [tools/SK8Lytz_App_Master_Reference.md](tools/SK8Lytz_App_Master_Reference.md) in per-task micro-commits. These sync naturally during `/wind-down`.
- **Corporate brain sync:** whenever a Supabase schema, table, or RLS rule changes, immediately update the `## Database Schemas` section of [tools/SK8Lytz_App_Master_Reference.md](tools/SK8Lytz_App_Master_Reference.md) as part of the same task — do not wait for the user to ask.
- **Planning bypass override:** FORBIDDEN from skipping the implementation-plan + halt-for-approval step for any task originating from [tools/SK8Lytz_Bucket_List.md](tools/SK8Lytz_Bucket_List.md), no matter how small.
- **UI testing guide:** after completing any implementation or ad-hoc fix requiring user verification, output a testing guide naming the exact Hub tab (STOCKPILEZ, MAKERZ, FULFILLZ, REVENUEZ, etc.), the specific sub-pane, and the precise button or modal the user must interact with to confirm the change.
- **Proactive workflow suggestion:** when the user is brainstorming, planning an Epic, or appears confused about next steps, proactively suggest the most relevant `/command` and explain in one sentence why it is the optimal route.
- **Anti-idle:** never launch background `echo` or `sleep` terminal commands to stand by for the user. Simply stop calling tools and wait. Idle loops cause interrupt storms that destroy in-flight output.
- **Layout context:** apply mobile-first layout (high contrast, single-column, large tap zones) for hardware controller views. Apply desktop-first layout (widescreen modular rows, data-dense) for executive dashboards.

## Database engineering (backend-first)
The database is the source of truth. When frontend logic needs fuzzy matching / guessing / fallback "bandages," STOP — that signals a schema gap. Fix it at the root with explicit UUIDs, foreign keys, and direct column mappings instead of sloppy frontend heuristics. Always read the current Supabase schema and constraints first — before writing any data logic — to know the absolute source of truth before touching queries or frontend data mapping.

## UI design standards
- **Close buttons:** NEVER use "X" / "✕" / "&times;". Always the explicit word **"Close"** (styled red, e.g. `btn-red`). This supersedes stylistic preference.
- **Button progress:** action buttons must show state — `Save` → `Saving...` → `Saved!`.
- No arbitrary new utility classes; enforce Master Reference UI standards.
- **Button bounding boxes:** all buttons must have clear visual bounding boxes. Never use floating text as a button unless it is explicitly part of a contextual header design.

## Verification mandate
No unverified "it's fixed." Prove it — run Node/scripts to check data structures, parse DOM/SVG coords for layout, show the receipts. Write throwaway verification scripts to `scratch/` (gitignored).

## Model & Effort Tiering

Every command, skill, and subagent declares a `model:` in its frontmatter (Balanced strategy). Effort *is* model tier — pick the tier by cognitive load, not by how important the task feels. When authoring a new command/skill, add a `model:` line:

- **`haiku` — Mechanical:** deterministic git/file/checklist ops and text transforms with near-zero reasoning (`/save-point`, `/status-update`, `/gitcleanup`, `/silent-release`, `/idea_intake` log step, `/jargon_brake`, `/rubber_duck`).
- **`sonnet` — Structured judgment:** gate-driven workflows needing real diff/pass-fail judgment (`/ship-it`, `/release`, `/wind-down`, `/bucketlist`, `/tech-debt-janitor`, `/legacy-audit`, `/health_check`, `/dependency_diet`).
- **`opus` — Deep / adversarial:** creative, critical, architecture, or security reasoning where quality dominates cost (`/brainstorm`, `/whiteboard_mode`, `/devils-advocate`, `/red_team`, `/product_teardown`, `/debug-drill`, `/bug-hunter`, `/panic-button`, `/meta_evolution`).

**Alias/skill twins must match:** a command, its `_`/`-` alias, and its skill are separate entry points; the model is set by whichever file is invoked. Pin the same tier on all twins or they drift.

**Named subagents** live in `.claude/agents/` and each carries a pinned model — dispatch them by `subagent_type` and do NOT pass a `model` override unless escalating an `implementer` to `opus` for a security-critical file: `explore-mapper` (haiku), `test-lint-runner` (haiku), `security-scout` (sonnet), `implementation-planner` (sonnet), `xss-validator` (sonnet), `test-guide-generator` (sonnet), `implementer` (sonnet).

**Precedence caveat:** an explicit `/model` session setting may override command frontmatter. If you need a command to run at its declared tier, avoid forcing a conflicting session model. Verify current precedence behavior before relying on it for cost-sensitive swarms.

## Subagent mandates

### Pre-task research swarm (required for every bucket list task)
Before writing any implementation code, spawn these agents **in parallel** (use the pinned named subagents in `.claude/agents/`):
1. **Explore agent** (`explore-mapper` · haiku) — map every file and line that the task will touch. Include callers, imports, DOM IDs, Supabase table names. Returns the full touch-point map.
2. **Plan agent** (`implementation-planner` · sonnet) — using the explore agent's map plus the task description, CLAUDE.md rules, and the Master Reference, generate a detailed implementation plan covering: security considerations (XSS, RLS), Vanilla JS constraints, 4-state UX, UI mutex where needed, and any schema changes. Save to `docs/plans/<branch>.md`.
3. **Security scout** (`security-scout` · sonnet; required for any XSS/security fix) — run `node scripts/xss-audit.js --warn` focused on the target file(s); enumerate every violation that the task must resolve so nothing is missed mid-implementation.

HALT and present the plan to the user before writing any code.

### Post-task validation swarm (required after every implementation)
After editing files but **before committing**, spawn these agents **in parallel** (use the pinned named subagents in `.claude/agents/`):
1. **XSS validator** (`xss-validator` · sonnet) — run `node scripts/xss-audit.js --warn` and confirm: (a) the violations the task was supposed to fix are gone, (b) no new violations were introduced.
2. **Test + lint runner** (`test-lint-runner` · haiku) — run `npm test` and `npx eslint .`; capture counts and any failures.
3. **Manual test guide generator** (`test-guide-generator` · sonnet) — produce a fully detailed testing guide (see format below) for every changed surface, covering happy path, error states, regression checks, and Supabase/DB verification steps.

Do not commit until all three agents have returned and their results are clean or explicitly accepted by the user.

### Manual testing guide format (always required at task end)
Every completed bucket list task must end with a guide in this exact structure:

```
### 🧪 Manual Testing Guide — <task name>

**Browser:** Chrome 120+ (required — Web Bluetooth + DOMPurify CSP)
**Environment:** http://127.0.0.1:5500 (local) or https://neogleamz.github.io (live)
**Prerequisites:** [login state / Supabase seed data / BLE device needed / none]

#### ✅ Happy Path
1. Navigate to **[HUB TAB]** → **[Sub-pane or section name]**
2. [Exact action: click button / fill input / scan barcode]
3. Expected result: [what the UI should show — loading state → success state]

#### ❌ Error & Edge Cases
1. [How to trigger the error] → Expected: [exact error message or UI state]
2. [Edge case e.g. empty field, duplicate entry] → Expected: [UI response]

#### 🔁 Regression Checks (nearby features — verify nothing broke)
- [Feature 1 to spot-check and how]
- [Feature 2 to spot-check and how]

#### 🗄️ Database Verification (if DB write occurred)
- Supabase dashboard → Table: **[table_name]**
- Verify: [specific row/column/value that should have changed]
```

## Workflows
Workflow commands live in [.claude/commands/](.claude/commands) (e.g. `/ship-it`, `/bucketlist`, `/release`); flagship ones also auto-trigger as skills in `.claude/skills/`. The Gemini originals stay in [.agents/workflows/](.agents/workflows).
