# 📘 SK8Lytz App Master Reference

This is the Canonical Source of Truth. This document must be consulted before making architectural assumptions or database modifications.

---

## 🏛️ 1. Project Architecture (Vanilla JS)
* **Zero-Build Stack:** This application is entirely built on Vanilla HTML, CSS, and JS. There is NO Node.js build step, NO Webpack, and NO TypeScript.
* **Component Location:** There is no `src/` directory. All core JavaScript modules live directly in the Root Directory.
  * e.g., `inventory-module.js`, `ceo-module.js`, `production-module.js`, `sales-module.js`, etc.

---

## 🎨 2. UI & Front-End Architecture Standards
The CSS system is hardcoded into the massive `index.html` style block using native CSS Variables.

### A. The Z-Index Authority Hierarchy
* **0-1**: Base DOM Elements
* **10**: Drag Resizers (`.h-resizer`, `.v-resizer`)
* **20**: Sticky Table Headers (`<th>`)
* **50**: Custom `.pane-header-bar`
* **500**: Custom Dropdown Panels (Multi-Select wrappers)
* **10000+**: `.modal-overlay` wrappers (Ensures Modals ALWAYS win over dropsdowns)

### B. Global Action Button Matrix
Buttons follow a 3-intensity system (Muted, Ghost/Standard, Neon). Use the following semantic colors:
* **🟢 Green (`.btn-green`)**: Positive commits, saves, submits, creations.
* **🔴 Red (`.btn-red`)**: Destructive actions, resets, closes, deletes.
* **🟠 Orange (`.btn-orange`)**: Inline properties, editing modes, and configuration tools.
* **🔵 Blue (`.btn-blue`)**: Neutral tools, nav, safe auxiliary tasks.
* **Special Rules:** All async Database/API buttons MUST inject tactile loading via the global wrapper `executeWithButtonAction('btnId', 'SYNCING...', '✅ SAVED!', async () => { ... })`. Silent payloads are strictly forbidden.

### C. Executive Panes & Layout Geometry
* **Split-Panes:** All split interfaces MUST use `<div class="bom-layout">` separated by an `.h-resizer` that explicitly binds to `onmousedown="initNeoSidebarResizer(event)"`.
* **Zero-Padding Headers:** Executive headers (`.pane-header-bar`) must be bound tightly to `height: 26px`, `padding: 0 10px` so that `.pane-header-title` remains absolutely centered (`left: 50%; transform: translate(-50%, -50%)`) without visual jumping.
* **No Spacers:** Do NOT use empty HTML `<div>` elements as visual spacers or layout controls. Unused blocks must be explicitly set to `display: none;`.

### D. Master Emojis & Item Archetypes
Consistently map these tokens globally across dropdowns, tables, and Hub cards:
* 📦 Retail Products
* ⚙️ Sub-Assemblies
* 🖨️ 3D Prints
* 🏷️ Custom Labelz
* 🔩 Raw Materials

### E. SOP Editor Standardization (Batchez, Layerz, Packerz)
* **Button Anchoring:** All command buttons ("SAVE", "EDIT", "PRINT") must anchor exclusively to the **top-right** of the header `.pane-header-actions`. Left-side is reserved strictly for breadcrumbs.
* **Unified Telemetry Parsing:** ALL checklist previews MUST utilize `parseProductionTelemetryLine` logic to process `# Headers`, `> Subtext`, `[INPUT]`, `[SCAN]`, `[IMG]`, `[BARCODE]`, and `[QR]`.
* **Multi-Select Panels:** Never use raw `<select multiple>`. Use absolute-positioned custom `.ms-panel` wrappers with checkboxes to maintain aesthetic continuity.

### F. Explorer Memory & Immutability
* **Source-Aware Accounting:** Financial webhook data (Shopify, Parcels) is fundamentally Read-Only. Users cannot manually "type over" original ingested strings. Corrections must be derived algorithmically via engine transaction tags.
* **Archive Explorer:** All archived/deleted records must use the `.archive-card` expandable accordion. Hard-delete UI nodes must utilize `stopPropagation()` to shield them from misclicks.
* **Data Table Memory:** Header sorting events must hook into `window.saveSort()` and initialize with `window.getSavedSort()` to persist grid layouts across caching refreshes.
* **Version Bumping:** When altering core logic, `system-version.js` MUST be bumped manually to purge live `.com` clients.

---

## 🗄️ 3. Database Schemas (Supabase)
Known verified tables currently in active use across the JavaScript modules:

### Core Ledgers
- `sales_ledger`: Tracks order hashes, COGS, and sales mapping.
- `inventory_consumption`: Tracks recipe components deducted per sale (`item_key`, `consumed_qty`, `manual_adjustment`).

### Products & Costs
- `full_landed_costs`: Calculates absolute profitability (`parcel_no`, `di_item_id`, `neogleamz_product`, `quantity`, `lot_multiplier`).
- `storefront_aliases`: Maps external platform SKUs to internal recipe names.

### Manufacturing (Cofoundry)
- `work_orders`: Production tracking (`wo_id`, `materials_pulled`, `wip_state`, JSON state tracking).
- `production_sops`: Step-by-step instructions (`product_name`, `steps`).
- `print_queue`: Tracking active label prints for Work Orders.

### Utilities
- `app_settings`: Global configurations (e.g. `paper_profiles`).
- `raw_orders`, `raw_parcel_summary`, `raw_parcel_items`: Webhook inbound raw data caches.
- `socialz_audience`: Outreach CRM for skaters (`name`, `is_favorite`).

---

## 🛡️ 4. Supabase Disaster Recovery & Backups
* **Automated Point-in-Time Recovery (PITR):** Supabase inherently takes daily physical database backups. A full catastrophic state can be restored via the Supabase Hub.
* **Hard Data Exports (Monthly CSV):** Core master ledgers (`sales_ledger`, `inventory_consumption`, `product_recipes`) should be exported manually to CSV once a month and stored in `OneDrive - Neogleamz`. This acts as an un-locked local safety net away from enterprise SAAS constraints.
