---
description: 💥 CRITICAL: YOU MUST READ THIS WORKFLOW FILE BEFORE WRITING ANY UI, HTML, CSS, OR JS MODIFICATIONS. THIS IS NEVER OPTIONAL.
---

# UI Development Standards for Neogleamz

This workflow establishes the mandatory structural rules for building, modifying, and updating User Interfaces within the Neogleamz application ecosystem. Any AI agent modifying the UI MUST follow these protocols.

## Executive Pane Layout Standards
When building or restructuring top-level module dashboards (e.g., `DATAZ`, `PACKERZ`, `BATCHEZ`, `STATZ`):
- All executive panes **MUST** utilize `<div class="pane-header-bar">` and anchor their module titles inside `<span class="pane-header-title">`.
- **Absolute Title Centering:** To prevent horizontal and vertical baseline jumping between modules with varying command buttons, `.pane-header-title` elements must strictly use full geometric centering (`left: 50%; top: 50%; transform: translate(-50%, -50%);`).
- **Header Structure:** `.pane-header-bar` wrappers handling interactive flex content MUST apply fixed exact bounds (e.g., `height: 26px; min-height: 26px; max-height: 26px;`) with ZERO vertical padding (`padding: 0 10px;`) to strictly enforce a static vertical center. Elements inside `.pane-header-actions` must be tightly bound (e.g., `height: 24px !important; margin: 0 !important; font-size: 11px !important;`) to fit mathematically inside this bar. This guarantees the absolute centered title NEVER jumps vertically across pages, and achieves a universally unified, ultra-compact aesthetic.
- **Prohibited Aesthetics:** Structural wrappers handling internal core content (such as `.bom-layout`) **MUST NOT** deploy full horizontal boundaries (e.g. `border-top: 1px solid var(--border-color);`) beneath the pane index. The intended look is a borderless, floating content area directly beneath the large title.
- **Strict Spatial Economy:** Do NOT use empty HTML `<div>` elements as visual spacers or layout controls (such as empty `.control-panel` blocks with `margin-bottom` hacks), as they create dead-zones in the UI layout when unpopulated. Any non-populated or placeholder block element MUST be explicitly initialized with `display: none;` until required by its DOM injection logic. Likewise, dynamic DOM injections (e.g., repeating category headers) should use localized looping logic to prevent `margin-top` gaps on the very first child against a parent container roof.
- Responsive padding should be configured centrally via CSS `clamp()` bounds on layout wrappers, avoiding inline hardcoded pixel values (e.g., explicitly scrub `style="padding: 20px;"` from `.bom-main` instances in favor of central core CSS).

## Scope of Rules
**IMPORTANT:** The Button Positioning rules below apply **EXCLUSIVELY** to SOP Editor Modals (e.g. `BATCHEZ`, `LAYERZ`, `PACKERZ` SOP editing interfaces). General website pages and modals (e.g., standard work order generation, sales dashboards) should not have their existing positioning structures forcibly modified unless specifically requested by the user.

## Button Positioning (SOP Editors Only)
When building or modifying SOP Interfaces (Inline Edit Modes, Modal Editors):
- All command buttons (e.g., "Print SOP", "SAVE MASTER BLUEPRINT", "🔒 EDIT") must be anchored strictly to the **top-right** corner of their respective container or modal header.
- Left-side header real estate must be reserved exclusively for titles, module descriptions, or breadcrumbs.

## Form and Telemetry Elements (Sitewide)
- Checkboxes, Radio toggles, and any adjacent dynamic text must be styled as a singular `flex` line. 
- You MUST ensure textual wrappers use `flex: 1` rather than absolute widths like `width: 100%`. This guarantees text grows organically alongside the toggle button, rather than aggressively wrapping underneath it and ruining the list structure.
- Naming Conventions: Use strict terminology. "Audited Telemetry Checklist" is to be referred to simply as `CHECKLIST`, and Live Previews must be labeled `CHECKLIST PREVIEW`.

## Deletion of Ghost Modules / Legacy Code
If you encounter UI components (e.g., empty `<input>` bars, useless `<button>` objects) that do not possess functionally mapped JavaScript payloads:
1. **DO NOT auto-delete.**
2. **Checks and Balances Protocol:** You must alert the user that a ghost element was found. Present the name/ID of the ghost module and ask for explicit permission to prune it from the file.
3. Keep a logged record of the component before proceeding with the removal to ensure the user is aware of what structural properties were just altered.

## Global Modal Patterns
- **Close Button Alignment:** Modal or Dialog "Close" buttons must follow a strict "Icon Left, Text Right" layout structure (`<i class="fa-solid fa-times"></i> Close`). Do not position the "X" symbol to the right of the word "Close" or position the symbol randomly above the text by using unchecked flex-wrap containers. Implement `.btn-red-muted` alongside horizontal centering (`display:flex; align-items:center; gap:6px;`) to guarantee the layout format never breaks.

## Globally Standardized Button Utility Classes
When adding action buttons across the software, you MUST adhere to the global 6-color functional mapping palette. Buttons are divided into solid counterparts (e.g., `.btn-green`) and ghost variants (`.btn-ghost-emerald`). 
1. **🟢 Emerald/Green (`.btn-green` / `.btn-ghost-emerald`)**: *Positive Commits & Creation*. Use for saving ledgers, submitting forms, or adding rows (e.g. `SAVE MASTER BLUEPRINT`).
2. **🔵 Blue (`.btn-blue` / `.btn-ghost-blue`)**: *Neutral Tools & Navigation*. Use for toggling views, opening tools, or basic system utility (e.g. `BATCHEZ SOP EDITOR`).
3. **🟠 Orange/Brand (`.btn-orange` / `.btn-ghost-brand`)**: *High-Level Engine Execution*. The system identity color. Use for major sync operations and database pushes (e.g. `🚀 INITIATE SYNC`).
4. **🔴 Red (`.btn-red` / `.btn-ghost-red`)**: *Destructive Actions & Overrides*. Use for wiping configurations, deleting rows, or force resets (e.g. `⚠️ RESET STOCK LEVELS`).
5. **🟣 Purple (`.btn-purple`)**: *A.I. Intelligence & Smart Mapping*. Use for intelligent data generation or cross-referencing utilities (e.g. `✨ AUTO-FILL LEDGER`).
6. **⚪ Slate/Grey (`.print-btn` / `.btn-ghost-slate`)**: *Physical Reporting & Documentation*. Strictly reserved for triggering browser print dialogs or viewing static files (e.g. `🖨️ PRINT SOP`).

**Special Allowances:** Structural buttons building the global web shell (`.login-btn`, `.tab-btn`, `.top-action-btn`) and specific UI micro-icons (`.icon-btn`) are exempt from forced color mapping. Do NOT attempt to rewrite the isolated `SOCIALZ` Tailwind strings.

## Fulfillz Core Layout Standardization
When modifying or adding new panels for the Fulfillz execution suite:
1. **The Grid Base:** You MUST use `<div class="bom-layout">` as the foundational wrapper to construct the vertical/horizontal grid. Do NOT manually construct flex or padding properties for main wrappers that deviate from this class. It mathematically ties edge gaps and vertical bounds to the viewport globally.
2. **Sidebars:** Navigational left-columns must apply `class="bom-sidebar"`.
3. **Memory Integrity:** When establishing a new sidebar with a resizer grip, you MUST register the sidebar's CSS `id` inside `neogleamz-engine.js` within the `idsToRestore` array. Failure to do this means the user's dragged widths are immediately wiped out on refresh.

## Command Center KPI Normalization
- All Module Cards rendering data arrays on the Fulfillz Home Hub MUST use the `.kpi-row` hierarchy structurally.
- **Prohibited Aesthetics:** DO NOT apply inline arbitrary text-colors (like `color: #F59E0B;`) to primary metric quantities. They must default strictly to `var(--text-heading)` to maintain a disciplined, neutral visual environment.

## Kanban Active Selection Protocol
When applying active selection states to kanban objects or operational rows:
- **Zero Partial Borders:** Do not highlight the item with a single "left-edge" border strip. You must cast a full geometric outline around the object (e.g., `border: 1px solid var(--primary-color)`).
- **Depth Preservation:** Highlight states MUST also feature ambient `box-shadow` glows matching the border. Critically, ensure that "deselected" or inactive items still maintain their underlying dark shadow depths so the UI does not flatten out when shifting focus.

## AI Automation Best Practices
- **Priority Native Inline Editors:** Always prioritize utilizing native workspace file editing tools (`replace_file_content`) over routing operations through external terminal shells, Python snippets, or PowerShell lookups. Directly rewriting text locally inside the IDE eliminates subprocess ping times and ensures instantaneous UI injections.
- **Temporary Scripts for Dom Parsing:** When making extensive, cross-file DOM manipulations or regex replacements inside large Javascript template literals that native string replacement cannot accurately hit, the AI may write temporary executable scripts locally, run them, and then **IMMEDIATELY DELETE** them.
  - **Tool Selection (Crucial):** Always prefer **Python** (`.py` files utilizing `re`) over Node.js for these macros. Python triple-quotes (`"""`) provide absolute impunity from template syntax collisions.
  - **PowerShell Precautions:** Do not attempt complex string-based `Select-String` lookups directly in the terminal if HTML contains nested quotes. Use the built-in `grep_search` or `view_file` tool to isolate line numbers safely.

## SOP Editor Standardization Framework
When modifying or creating new SOP Editor interfaces (whether Full Master Modals or Live Inline Editors like those in Batchez, Layerz, or Packerz), complete UI and logic parity MUST be maintained:
1. **Unified Telemetry Parsing:** ALL checklist previews MUST utilize the global `parseProductionTelemetryLine` logic (or its exact architectural equivalent) to process `# Headers`, `> Subtext`, `[INPUT]`, `[SCAN]`, `[IMG]`, `[BARCODE]`, and `[QR]` tokens. Do not write local, stripped-down clone functions for telemetry parsing.
2. **Token Syntax Legend:** A full UI cheatsheet/token legend detailing the definitions of telemetry markdown MUST be embedded above every single Read/Write checklist interface. The legend must contain the complete standard set (including interactive guide buttons) to ensure floor operators have a reference.
3. **Crush-Proof Layouts:** All SOP split-pane architectures MUST include the `h-resizer` component for dynamic width adjustment. However, layout bounds and standard padding must enforce a minimum width safety threshold to prevent editors or previews from being "crushed" or visually broken during resize.

## Supabase Backup & Disaster Recovery Protocol

This document satisfies Audit Requirement **7c (Backup Strategy Documented)**. It outlines the disaster recovery architecture for the Neogleamz Supabase backend.

### 1. Automated Point-in-Time Recovery (PITR)
Neogleamz is hosted exclusively on Supabase, leveraging its managed PostgreSQL infrastructure.

**Default Safety Blanket:**
- Supabase inherently takes daily physical database backups of the entire cluster.
- Every database manipulation (via `packerz-module.js` or `sales-module.js`) is natively transaction-logged automatically.

**How to Restore from a Catastrophic Deletion:**
1. Log in to the [Supabase Dashboard](https://app.supabase.com/).
2. Navigate to your defined Neogleamz Project.
3. Select the **Database** icon from the left navigation pane.
4. Go to **Backups**.
5. You will see a list of physical daily snapshots. Click **Restore** on the most recent known healthy state.
*(Note: A full DB restore creates a temporary read-only lock while the database volume physically rebuilds).*

### 2. Hard Data Exports (The local safety net)
Because Neogleamz thrives on independent access without relying on enterprise SAAS locked data, you should perform a manual logical extraction once a month.

**Monthly CSV Export Procedure:**
1. Open the Supabase Dashboard -> **Table Editor**.
2. Select the core master ledgers one-by-one: `product_recipes`, `sales_ledger`, `inventory_consumption`.
3. In the top right corner of the grid, click **Export to CSV**.
4. Store these files natively on your `OneDrive - Neogleamz` under `Accounting - General\Database Backups`.

### 3. High-Concurrency Transaction Racing (Audit Item 3a) 
In evaluating Audit Item **3a**, the system determined that strict distributed lock mechanisms (like `SELECT FOR UPDATE` or Optimistic Concurrency Control) are unnecessary architectural overhead. Because Neogleamz operates as a single-admin logistics suite, true multi-agent race conditions (two instances writing to the same row at the exact same millisecond) simply do not exist.  

If a partial network drop occurs in the middle of a `renameCurrentProduct` multi-batch call, the `.catch()` hooks (implemented in Phase 3) will log the structural failure locally, allowing safe manual repair without locking up the user interface.
