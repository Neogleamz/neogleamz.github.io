---
name: coding_preferences
description: "Strict Vanilla architecture, State Handling, UI paradigms, and active code maintenance rules."
trigger: always_on
---

# Optimal Coding Preferences (Ultra-Dense)

### 1. Vanilla Exclusivity & Frontend Rules
- **Pure Web-Native:** No Node.js modules or native app shims. Data uses standard `fetch()` or Supabase Client. Hardware relies *strictly* on standard Web Bluetooth APIs.
- **Framework Banishment:** Absolutely no React, Vue, jQuery, or TypeScript logic injections permitted. DOM elements modified strictly via pure native JS (`getElementById`, `insertAdjacentHTML`).
- **Data Caching Flow:** Avoid heavy Supabase round-trips for session logic. Store configuration locally using prefixed serialization (`localStorage.setItem('sk8lytz_prefs', JSON.stringify())`).
- **Third-Party Bloat (ChartJS):** When touching charts, *always* execute a `.destroy()` loop on existing instances before re-painting to stop CSS ghosting. Evolve live chart data by pointing at active arrays, rather than nuking canvases.

### 2. UI/UX Geometric Philosophy
- **Dynamic 4-State UX:** Every data component must accommodate four pure CSS toggled states: `Loading`, `Error` (w/ fallback buttons), `Empty`, and `Success`.
- **Fluid Layout Topology:** Strict prohibition on rigid CSS `position: absolute` or structural negative margins. Architecture must flow naturally via 100% responsive Flexbox logic (`vh`, `vw`, `%`, `calc`).
- **Proportional 8-Point Grids:** Instead of arbitrary fixed pixels, align whitespace to 8-point multiples utilizing CSS scaling clamps (e.g., `clamp(16px, 2vw, 24px)`) ensuring minimum `48px` tap zones for extreme contexts.
- **Context Awareness:** Execute *Mobile-First* mapping on hardware controllers (heavy contrast, single-column bottoms), and *Desktop-First* on interior Executive dashboards (widescreen modular rows).

### 3. Continuous Hygiene & Archiving
- **The Boy Scout Mandate:** While touching code files (exclusively in `/feat` or `/refactor` paths), you must hunt down and eradicate *exactly one* piece of existing debt (orphaned vars, missing JSDoc logic, ghost listeners). Ban this sweep entirely during Bug Fix sequences.
- **Always-On Micro-Commits:** Continuously execute instant `git add/commit` actions dynamically using Semantic string logic (`feat:`, `fix:`) directly after altering any files. 
- **Ledger Exemption:** Do NOT auto-commit tracking logs (like `SK8Lytz_Bucket_List.md` or `Master_Reference`). Let those batch naturally for `/wind_down` syncs.
- **Corporate Brain Synchronization:** Whenever modifying Supabase APIs, immediately jump to the `SK8Lytz_App_Master_Reference.md` Schema section and surgically inject the new definitions in 30k byte chunks. Delete explicitly invalidated concepts.

### 4. Deepmind Documentation OS
- **Visual Artifacting & Directives:** You MUST universally leverage rich UI syntax (like `> [!NOTE]` or `> [!IMPORTANT]` GitHub alerts) for ALL chat responses, especially when asking the user questions or prompting them for their next command. Never make the user guess what they need to do next; box the required command inside an alert.
- **Architecture Mapping:** When proposing complex code structures or DB schemas, enforce the use of `Mermaid` flowcharts and entity-relationship diagrams over text walls.
- **UI Prototyping First:** Use the native `generate_image` tool to spawn visual concept artifacts for complex UI interactions before committing to raw DOM logic.
