# 📘 SK8Lytz App Master Reference

This is the Canonical Source of Truth. This document must be consulted before making architectural assumptions or database modifications.

---

## 🏛️ 1. Project Architecture (Vanilla JS)
* **Zero-Build Stack:** This application is entirely built on Vanilla HTML, CSS, and JS. There is NO Node.js build step, NO Webpack, and NO TypeScript.
* **Component Location:** There is no `src/` directory. All core JavaScript modules live directly in the Root Directory.
  * e.g., `inventory-module.js`, `ceo-module.js`, `production-module.js`, `sales-module.js`, etc.

### Local State Caching Matrix
* **Synchronous Speed Priority**: `localStorage` is used exclusively for global toggles, persistent states, and zero-latency configs.
* **Storage Keys**:
  * `neogleamz_default_lead_time`: Sets the global fallback ROP lead time (in days) if a raw good does not have a unique one set.
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

### G. Modal Close Button Standard
* **Positioning:** All modal headers must use `position: relative`. The close button is `position: absolute; top: 50%; right: 16px; transform: translateY(-50%)`.
* **Style:** MUST use `class="modal-close-btn"` with the explicit text `✕ CLOSE`.
* **Dimensions:** Standardized at `height: 32px` with `padding: 0 16px` to ensure a clear touch target and premium aesthetic.
* **Why:** Consistent with §2B (Red = destructive/close), and the absolute-position pattern ensures the title remains visually centered regardless of header padding.

### H. The Sandbox Preview Enforcer (`customCommitFn`)
* **The Rule:** Any CSV or JSON file uploaded that fundamentally modifies the core Ledgers (Salez, Orders, Parcels) MUST natively route through `openSandboxModal()`. 
* **The Architecture:** Raw data must *not* be de-duplicated or wiped by the parsing function beforehand. Let the Sandbox grid physically render all rows visually to the user.
* **The Commit Hook:** Execution logic and data deduplication must only occur inside the `customCommitFn` callback when the user clicks 'Upload & Sync'. This enforces explicit user consent before data hits the Supabase instance, preventing runaway blind overwrites.

### I. WebRTC Scanner Layouts & iOS Compatibility
* **Dual-Card Architecture:** When building inline hardware camera scanners (like the Cycle Count engine), you must NEVER use abrasive full-screen blackout modals. You must deploy a responsive `flex-wrap` layout (`align-items: stretch`) where the Primary Form and the Scanner Card lock into a rigid side-by-side array natively.
* **Aspect Ratio Hardware Constraint (CRITICAL):** The actual live video feed (`#barcode-reader`) MUST be structurally restrained using `aspect-ratio: 1/1; width: 100%` within the DOM Card. Even more importantly, the instantiation script `Html5Qrcode.start()` MUST explicitly declare the configuration `{ aspectRatio: 1.0 }`. Failure to pass this specific flag into the runtime engine will result in catastrophic, un-fixable extreme zooming defects on iOS Safari devices.

---

## 🗄️ 3. Database Schemas (Supabase)
Known verified tables currently in active use across the JavaScript modules:

### Core Ledgers
- `sales_ledger`: Tracks order hashes, COGS, and sales mapping.
- `inventory_consumption`: Tracks recipe components deducted per sale (`item_key`, `consumed_qty`, `manual_adjustment`, `rop_lead_time_days`).

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

---

## ?? 5. Module & Hub Architecture Reference
For a complete, canonical page-by-page and element-by-element breakdown of the A.I. Hub (NEXUZ, STOCKPILEZ, MAKERZ, FULFILLZ, REVENUEZ, SOCIALZ) and their underlying algorithms, please consult the dedicated architecture documentation at: docs/master_reference.md.

---

## 🏗️ 6. Comprehensive UI DOM Binding Dictionary (Element Authority)
To strictly enforce standard Vanilla JS interaction mapping within `index.html`, this directory outlines the precise intent of every functional DOM Pane, Modal Overlay, and Action button currently active. DO NOT duplicate these elements.

### A. Global Modals (Overlays) & Logic Matrix
*All modal overlays must use `class="modal-overlay"`, strict `z-index` layering, and absolute/fixed centering to ensure responsive execution.*
- `sandboxDataModal`: The primary safety gate for IMPORTZ. Must execute `customCommitFn` instead of blindly overwriting databases to guarantee explicit user staging.
- `cycleCountManagerModal`: The WebBluetooth/WebRTC scanner UI for STOCKZ. Requires physical `#barcode-reader` strictly typed with `{aspectRatio: 1.0}` to prevent iOS zoom malfunctions.
- `archiveExplorerModal`: Handles Soft-Delete recovery via nested `.archive-card` elements. Uses `.btn-red-muted` to prevent accidental hard wipes.
- `sopMasterModal`: The core editor for standard operating procedures (MAKERZ). Controls structural `#sopRowsContainer`.
- `velocityzModal`: The financial forecast UI embedded within STOCKZ grids.
- `aliasModal`: The data dictionary mapping modal translating 3rd-party Shopify SKUs to native internal representations.
- **A.I. CFO Simulation Modals**: `ceoAddModal`, `ceoBundleModal`, `ceoCustomModal`. Used exclusively inside REVENUEZ to append temporary theoretical nodes to the `true-profit-waterfall` canvas.
- **Print & Label Modals**: `manualPrintModal`, `finalizePrintModal`, `labelzDesignerModal`, `paperProfileModal`. Bridges the browser strictly to the external PrintNode API ecosystem.
- **Workflow & Fulfill Modals**: `newWOModal` (instantiates batches), `finalizeWoModal` (commits physical inventory deductions), `multiBatchOrderModal`, `batchOrderReportModal`.
- **CRM Modals**: `skater-modal` (Socialz CRM card), `ltv-metrics-modal` (lifetime value visualizer).
- **Documentation & Helper Modals**: `tipzModal`, `packerzArchiveModal`, `packerzSopViewerModal`, `sopCameraModal`, `sopTokenGuideModal`, `sopMediaPickerModal`, `sopAuditLogModal`, `globalRegexPlaygroundModalContainer`.

### B. Hub-by-Hub Structural Pane Directory
*The foundational Executive Panes `id="pane..."` that control visibility routing within the main workspace.*

#### 1. NEXUZ (The Command Center)
- **`paneNexuzBrainz` (A.I. Terminal)**:
  - Houses the `#agentTerminal` text UI. Controls strict system commands via `.btn-green` `EXECUTE` and `.btn-blue` `EXPORT BACKUP`.
- **`paneNexuzImportz` (Data Sync)**:
  - Contains distinct `.import-card` blocks. Forces uploaded payload data strings sequentially into the `sandboxDataModal` for deduplication.
- **`paneNexuzSalez` (Ledger)**:
  - Strictly Read-Only interface. Renders inbound logic via collapsible classes: `.salez-record` (Standard), `.replacement-row` (Warranty), and `.refund-row` (Ghost Revenue). 

#### 2. STOCKPILEZ (Inventory Logistics)
- **`panePipeline` (DATAZ)**:
  - The Raw Goods system of truth database. Uses `.btn-blue` forms to declare native SKU limits (`ROP`).
- **`paneSimple` (EDITZ)**:
  - Value adjuster matrix utilizing inline `.btn-orange` logic.
- **`paneInventory` (STOCKZ)**:
  - The real-time interactive lifecycle module. Triggers `cycleCountManagerModal` via standard scanner hardware, and integrates explicit `velocityzModal` charting.

#### 3. MAKERZ (Production Ecosystem)
- **`paneProdBuilder` (RECIPEZ)**:
  - Contains `recipeActionModal` triggers to actively map Raw Goods arrays against Final SKUs.
- **`paneProdControl` (BATCHEZ)**:
  - Controls work order states (Pending, Core Processing).
- **`paneProdPrint` (LAYERZ)**:
  - Top-tier logical progression managing SOP executions (`sopMasterModal`).

#### 4. FULFILLZ (Logistics Assembly)
- **`paneFulfillzPackerz` (PACKERZ)**:
  - Renders Read-Only arrays of `[IMG]` and `[BARCODE]` tokens driven by `#sopRowsContainer`.
- **`paneFulfillzBarcodz` (BARCODZ)**:
  - Centralizes native layout for QR and Code128 generation logic.
- **`paneFulfillzLabelz` (LABELZ)**:
  - Form routes the `labelzDesignerModal` visualizer.

#### 5. REVENUEZ (Financial Ops)
- **`paneSalezBridge` (ORDERZ)**:
  - High-level synchronization bridge mapping sales to physical tasks.
- **`paneSalezAnalyticz` (STATZ)**:
  - Strictly relies on `.chart-container` DOM wrappers enforcing Chart.js `destroy()` protocols to prevent graph ghosting leaks.
- **`paneSalezCommandz` (SIMULATORZ / A.I. CFO)**:
  - Global metric testbed utilizing independent calculation hooks (`ceoAddModal`) to simulate P&L without touching core localstorage or database values. Namespace enforced via `<canvas id="chart_cfo_waterfall">`.

#### 6. SOCIALZ (Outreach CRM)
- **`paneSocialzRoster` (ROSTER)**:
  - The unified client grid rendering individual `.skater-card` components. Integrates specific event delegations for `#skater-modal`.
