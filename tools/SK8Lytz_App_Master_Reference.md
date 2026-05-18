# 📘 SK8Lytz App Master Reference

This is the Canonical Source of Truth. This document must be consulted before making architectural assumptions or database modifications.

---

## 🏛️ 1. Project Architecture (Vanilla JS)
* **Zero-Build Stack:** This application is entirely built on Vanilla HTML, CSS, and JS. There is NO Node.js build step, NO Webpack, and NO TypeScript.
* **Component Location:** There is no `src/` directory. All core JavaScript modules live directly in the Root Directory.
  * e.g., `inventory-module.js`, `ceo-module.js`, `production-module.js`, `sales-module.js`, etc.

### ESLint & Global Namespace Boundary
* **No-Undef Rule:** Because we use a `<script>` tag-based architecture, any functions or variables declared in the global scope of a `.js` file become implicitly available on the `window` object.
* **The Registration Mandate:** To maintain a strict boundary and prevent `no-undef` warnings, **ANY new cross-file global function or variable created must be manually registered in `eslint.config.mjs` under the `languageOptions.globals` object.** ESLint parses each file independently, so it requires this explicit dictionary to understand our architecture.

### Dynamic Event Delegation
* **Global Interaction Controller**: Rather than inline DOM handlers (`onclick="..."`) scattered throughout the HTML, the application utilizes a centralized, native `system-event-delegator.js`.
* **Action Tokens**: All interactive elements MUST be tagged with native data attributes like `data-click`, `data-change`, or `data-input` containing specific string tokens (e.g., `data-click="closeModal"`).
* **The Intercept**: The delegator bounds to `document.body` and natively catches all bubbled interactions. It maps the `data-*` tokens directly to legacy functions within standard `switch()` matrices, providing maximum DOM performance and mitigating memory leaks.

### Sitewide Real-Time Synchronization (Zero-Cache Protocol)
* **Global Websocket Channel**: `system-realtime-sync.js` initializes a global Supabase Realtime channel (`neogleamz-global-sync`) listening to all exposed PostgreSQL tables for `INSERT`, `UPDATE`, and `DELETE` payloads.
* **Active Focus Guard**: To prevent the UI from aggressively re-rendering while the user is actively typing, the sync module monitors standard DOM focus events (`input`, `textarea`, `[contenteditable]`). If focused, updates are buffered; once blurred, the accumulated payload is processed and the DOM is repainted.
* **In-Memory Caches**: Rather than triggering massive `fetch()` sweeps, real-time broadcasts inject or modify the targeted object directly inside the global state arrays (e.g., `taskEngineDB`, `productionDB`) before calling the contextual `render()` function.

### DOM Security & Injection (safeHTML)
* **The safeHTML Protocol**: All dynamically generated HTML strings MUST be injected using `window.safeHTML(string)`. This relies on DOMPurify to strip away XSS vectors.
* **Inline Handlers Scrubbed**: `DOMPurify` will violently scrub all inline JavaScript execution attributes (`onclick`, `onchange`, `ondragstart`, etc.) from HTML strings.
* **The Solution**: When generating complex dynamic DOM elements (like lists or SOP groups), you MUST assign explicit CSS classes or `data-*` attributes within the template string. Immediately following the `innerHTML = window.safeHTML(html)` assignment, you MUST natively attach event handlers via `querySelectorAll` and `addEventListener()`. Relying on inline string execution will result in dead UI components.

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
Buttons follow a 3-intensity system (Muted, Standard/Ghost, Neon). Use the following semantic colors and intensity suffixes to maintain UI coherence:

**Color Semantics:**
* **🟢 Green**: Positive commits, saves, submits, creations.
* **🔴 Red**: Destructive actions, resets, closes, deletes.
* **🟠 Orange / Brand**: Inline properties, editing modes, and configuration tools.
* **🔵 Blue / Slate**: Neutral tools, nav, safe auxiliary tasks.

**The 3-Intensity Bordered System:**
* **Neon (`.btn-[color]-neon`)**: Highest priority. Solid vibrant background. Use for primary call-to-actions (e.g. `btn-green-neon` for "Save Profile").
* **Standard Ghost (`.btn-[color]`)**: Neutral priority. Translucent background with a corresponding solid outline border (e.g. `.btn-red` for "Delete"). NOTE: `.btn-ghost-[color]` classes (e.g. `.btn-ghost-red`) strictly govern color schemes but omit border mapping. To render properly, they MUST be paired with `.btn-ghost-base` in the HTML class array to draw the physical boundary box.
* **Muted Ghost (`.btn-[color]-muted`)**: Lowest priority. Translucent background with a lighter translucent outline border. Perfect for secondary cancel flows (e.g. `.btn-red-muted` for "Cancel").

* **Special Rules:** All async Database/API buttons MUST inject tactile loading via the global wrapper `executeWithButtonAction('btnId', 'SYNCING...', '✅ SAVED!', async () => { ... })`. Silent payloads are strictly forbidden.

### C. Executive Panes & Layout Geometry
* **Split-Panes:** All split interfaces MUST use `<div class="bom-layout">` separated by an `.h-resizer` that explicitly binds to `onmousedown="initNeoSidebarResizer(event)"`.
* **⚠️ Inline Resize Listener Pattern (Memory Safety):** When resize logic is injected via dynamic `<script>` blocks (e.g. inside `renderActivePrintJob`, `renderWOList`), `document.addEventListener('mousemove'/'mouseup')` MUST use **named function declarations**, never anonymous arrow functions. Anonymous functions cannot be passed to `removeEventListener`, causing compounding listener accumulation on every re-render. Canonical pattern:
  ```js
  function doXyzResize(e) { /* resize logic */ }
  function stopXyzResize() {
      isDragging = false;
      document.removeEventListener('mousemove', doXyzResize);
      document.removeEventListener('mouseup', stopXyzResize);
  }
  document.addEventListener('mousemove', doXyzResize);
  document.addEventListener('mouseup', stopXyzResize);
  ```
* **Pure Flex Fluid Headers:** Executive headers (`.pane-header-bar`) must be structured organically utilizing pure Flexbox. Titles (`.pane-header-title`) and action blocks (`.top-controls`) must naturally flow as standard flex items and are strictly forbidden from utilizing `position: absolute` or translation hacks. To mathematically prevent UI overlapping during horizontal squeeze, rigid containers containing buttons or text must enforce `min-width: max-content` boundries, forcing the flexible center wrappers to assume 100% of the flex-shrink burden cleanly. The header must expand vertically (`height: auto`) and wrap when content collides, ensuring perfect scaling dynamically at any view width.
* **No Spacers:** Do NOT use empty HTML `<div>` elements as visual spacers or layout controls. Unused blocks must be explicitly set to `display: none;`.

### J. Dynamic HTML Event Exception
* **The `onclick=` Exemption:** While the primary UI components in `index.html` strictly adhere to the Vanilla Event Delegator pattern via `data-click` and `data-change` attributes (Rule §1), **dynamically injected HTML via JS template literals** (e.g., dynamically built table rows, dynamic checklist generation) are explicitly exempt. They may utilize inline `onclick="functionName()"` bindings.
* **Rationale:** Since the `system-event-delegator.js` matrix relies on precompiled `switch` tokens, managing dynamic tokens on the fly is highly fragile. Safely scoping localized events inside dynamic layout injection blocks is acceptable and mathematically sound compared to attempting complex mutation observers.

### K. Modal Table Sorting & Data Matrix Standards
* **Data Matrix Layout:** For data-dense modals (e.g., `ltv-metrics-modal`), rely on `display: grid` with `grid-template-columns` utilizing `fr` units (e.g., `repeat(4, 1fr)`) to render KPI summary blocks efficiently across the top horizontal axis without relying on heavy flex constraints. Modal containers must expand horizontally via `max-width: 1000px; max-height: 90vh` to properly accommodate dense analytical tables.
* **Modal Sort Flags:** Unlike main Executive Panes that rely on global persistent configurations, Modal table headers MUST use locally isolated custom state sort flags (e.g., `window._ltvSortKey`, `window._ltvSortAsc`) triggered strictly by dedicated native data tokens (e.g., `data-ltvsort`). Overloading existing Pane tokens (like `data-ceosort`) risks cross-contaminating view states between the background and the overlay.
* **Cohort Intelligence Ledger:** The LTV Metrics Modal acts as a granular, order-level transaction ledger. It MUST NOT sum pseudo-returns, zero-intent orders (Warranty, Gifts, ignored rows) or purely physical exchanges (Exchange Replacements) into a customer's repeat trajectory. Additionally, the decrypted short PII hash reference (e.g., `[a3c9b1f]`) MUST be explicitly rendered and bound to bidirectional sorting logic (`data-ltvsort="pii"`) so operators can linearly align distinct purchases originating from the same anonymous client.

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
* **Direct File Uploads:** All file attachments natively route through `triggerSopDirectUpload()`. Files are safely uploaded to the Supabase `sop-media` bucket utilizing dynamic context paths (`sops/{sop_type}/{product_id}/{timestamp}_{filename}`) and their resulting public URLs are injected back into the checklist natively via `[IMG:url]` or `[MEDIA:url]` tokens.

### F. Explorer Memory & Immutability
* **Source-Aware Accounting:** Financial webhook data (Shopify, Parcels) is fundamentally Read-Only. Users cannot manually "type over" original ingested strings. Corrections must be derived algorithmically via engine transaction tags.
* **Mathematical Idempotency (Hub Cards):** All metrics requiring aggregate mathematical summation across the entire application (e.g., Total Orderz, Total Goods Cost) MUST execute a strict JavaScript `Set()` based deduplication pre-flight gate. Iterating raw arrays containing multi-item orders will trigger geometric inflation of cost values if physical Order IDs are not successfully isolated prior to calculation.
* **Archive Explorer:** All archived/deleted records must use the `.archive-card` expandable accordion. Hard-delete UI nodes must utilize `stopPropagation()` to shield them from misclicks.
* **Data Table Memory:** Header sorting events must explicitly hook into isolated, pane-specific configuration objects (e.g., `currentDatazSort` vs `currentEditzSort`) rather than shared global ones, preventing layout bleeding. They must hook into `window.saveSort('keyName', obj)` and initialize with `window.getSavedSort('keyName')` to persist unique, decoupled grid layouts horizontally across caching refreshes.
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

### I. Scraper Foundry (Visual Extraction Engine)
* **Row Integrity Architecture:** The Scraper Foundry leverages a strict Two-Step Parent-Child bounding algorithm. 
* **Execution Constraint:** Global string queries (`document.querySelectorAll`) are forbidden for child fields to prevent cross-row layout corruption. The engine MUST identify the Parent Row wrapper first, count the rows, and then map all child elements *relative* to the specific instance of the outer wrapper. Missing DOM elements in anomalous rows will safely degrade to `""` rather than misaligning the underlying matrix array.

### I. WebRTC Scanner Layouts & iOS Compatibility
* **Dual-Card Architecture:** When building inline hardware camera scanners (like the Cycle Count engine), you must NEVER use abrasive full-screen blackout modals. You must deploy a responsive `flex-wrap` layout (`align-items: stretch`) where the Primary Form and the Scanner Card lock into a rigid side-by-side array natively.
* **Aspect Ratio Hardware Constraint (CRITICAL):** The actual live video feed (`#barcode-reader`) MUST be structurally restrained using `aspect-ratio: 1/1; width: 100%` within the DOM Card. Even more importantly, the instantiation script `Html5Qrcode.start()` MUST explicitly declare the configuration `{ aspectRatio: 1.0 }`. Failure to pass this specific flag into the runtime engine will result in catastrophic, un-fixable extreme zooming defects on iOS Safari devices.

### L. Hardened Layout Patterns (Zero-Trust)
* **The Stacking Pattern**: To eliminate `position: absolute` for layered UI (badges, overlays, buttons), use the project-standard `.grid-stack` architecture:
  ```css
  .grid-stack { display: grid; }
  .grid-stack > * { grid-area: 1 / 1; }
  ```
* **Utility Overlays**:
  - `.top-right-action-flex`: Absolute centering for top-right corner actions.
  - `.top-left-action-flex`: Absolute centering for top-left corner actions (badges).
  - `.overlay-center-flex`: Full centering overlay for media play buttons or status icons.
* **Dropdown Anchoring**: Utility classes like `.task-dropdown-menu` are used to standardize absolute coordinate anchoring for menus while keeping logic clean of inline `style` tags.

### M. Global Column Truncation Standard
* **Fluid Grid Constraints**: To prevent data-heavy columns (like Storefront SKU, Recipe Name, Source, Location) from blowing out the bounds of Flexbox or CSS Grid layouts, you MUST wrap their native `<td>` or container elements with the `.trunc-col` class.
* **Class Definition**: The `.trunc-col` class natively enforces `white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: clamp(100px, 15vw, 250px); cursor: pointer;`. 
* **Interaction**: Hovering or clicking (focus) natively overrides the constraint to `max-width: none !important; position: relative; z-index: 100;` displaying the full string in an elevated pop-out.

---

## 🗄️ 3. Database Schemas (Supabase)

Known verified tables currently in active use across the JavaScript modules:

### Core Ledgers
- `sales_ledger`: Tracks order hashes, COGS, and sales mapping.
- `inventory_consumption`: Tracks recipe components and stock levels. Fields: `item_key` (PK), `consumed_qty`, `produced_qty`, `sold_qty`, `scrap_qty`, `manual_adjustment`, `assembly_consumed_qty`, `production_consumed_qty`, `prototype_consumed_qty`, `prototype_produced_qty`, `rop_lead_time_days`, `min_stock`.

### Products & Costs
- `full_landed_costs`: Calculates absolute profitability (`parcel_no`, `di_item_id`, `neogleamz_product`, `quantity`, `lot_multiplier`).
- `storefront_aliases`: Maps external platform SKUs to internal recipe names.

### Manufacturing (Cofoundry)
- `work_orders`: Production tracking. Fields: `wo_id` (PK), `product_name`, `qty`, `status`, `started_at`, `completed_at`, `wip_state` (JSONB), `routing` (JSONB). **Standard**: Always store native JSON objects; never stringify. `materials_pulled` state is stored within `wip_state`.
- `production_sops`: Step-by-step instructions (`product_name`, `steps`).
- `print_queue`: Tracking active label prints for Work Orders.

### Utilities & Backups
- `inventory_snapshots`: Point-in-time recovery points. Fields: `id` (PK), `name`, `snapshot_data` (JSONB - full consumption array), `created_at`, `created_by`.
- `app_settings`: Global configurations (e.g. `paper_profiles`).
- `raw_orders`, `raw_parcel_summary`, `raw_parcel_items`: Webhook inbound raw data caches.
- `socialz_audience`: Outreach CRM for skaters (`name`, `is_favorite`).

### Task Engine (ERP Command Center)
- `projectz`: Top-level Asana-style hierarchical container for tracking initiatives. Fields: `title`, `color_hex`, `visibility`, `health_status`, `is_archived`.
- `teams`, `team_members`: Identity architecture grouping users for assignments. (`is_archived` flags soft-deleted states).
- `cyclez` (Sections): Repurposed as Asana-style "Sections" to vertically group tasks within a project or list. (`owner_id`, `start_date`, `end_date`, `assigned_team_id`, `metadata`, `is_archived`).
- `taskz`: Core dependency matrix linking tasks to physical modules (`project_id`, `cycle_id`, `personal_cycle_id`, `linked_module`, `estimated_minutes`, `is_archived`).
- `task_dependencies`, `task_comments`, `task_activity`: Relational hooks for blocking, rich text threading, and immutable state-change audits.
- `task_templates`, `template_subtasks`: Process Street scaffolding for generating dynamic SOPs.

---

## 🛡️ 4. Supabase Disaster Recovery & Backups
* **Native Client-Side Backups & Sandbox Restoration:** The NEXUZ `Brainz` panel houses a dedicated `Backup & Restore` UI. It allows generating `.xlsx` snapshot exports of all critical ledgers. Furthermore, it enforces a strict 3-stage restoration protocol:
  1. **Sandbox Staging (` importBackupFileTest `):** Backups must first be uploaded via the Test File input to render in the UI, allowing operators to visually inspect the payload data on screen without writing to the live DB.
  2. **Table Targeting:** The operator manually selects exactly which tables (e.g. `sales_ledger`, `inventory_consumption`) should be overwritten from the snapshot checkboxes.
  3. **Live Restore Execution (` click_executeRestore `):** The authoritative execution gate. Warning: This is an unrecoverable overwrite of the live Supabase tables based on the selected `.xlsx` sheets.
* **Automated Point-in-Time Recovery (PITR):** Supabase inherently takes daily physical database backups. A full catastrophic state can be restored via the Supabase Hub.
* **Hard Data Exports (Monthly CSV):** Core master ledgers (`sales_ledger`, `inventory_consumption`, `product_recipes`) should be exported manually to CSV once a month and stored in `OneDrive - Neogleamz`. This acts as an un-locked local safety net away from enterprise SAAS constraints.
* **CLI Migration Sync & Ghost Recovery:** If the remote Database tracks synthetic schemas generated directly from the Supabase Dashboard, `npx supabase db push` will fail with a "Remote migration versions not found" error. To synchronize local tracking without destroying data:
  1. Execute `npx supabase migration repair --status reverted <ghost_ids>` to detach UI-generated IDs from CLI tracking.
  2. Execute `npx supabase migration repair --status applied <local_ids>` to log manually created `.sql` files that were natively pasted into the Dashboard to prevent dual-execution.
  3. Subsequent `npx supabase db push` calls will now reliably sync the local `/supabase/migrations` stack correctly to the remote without dual-executing local databases. (To physically download missing Dashboard schema strings to your local disk, execute `npx supabase db pull dashboard_sync` if Docker Desktop is available).

---

## 🏗️ 5. Module & Hub Architecture Reference
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
  - Integrates the `Recipe Integrity Manager` (`recipeManagerModal`) which utilizes an intelligent "Fix All" bulk-predictions loop (`window.applyAllRecipeSuggestions`) to iteratively fuzzy-match and auto-repair orphaned Component Keys dynamically before committing changes back to the Supabase layer.
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

---

## 🌐 7. Edge Functions & Webhooks

### A. Active Shopify Webhook Infrastructure
The `shopify-webhook` Edge Function natively processes inbound JSON payloads directly from Shopify. Because Shopify requires OAuth Dev Apps for historical API pulls, this application relies **strictly** on live Webhook pushes for operational data.

**Required Shopify Admin Configuration:**
To ensure data flows correctly into the `sales_ledger`, the following Webhooks MUST be manually configured in the Shopify Admin Panel (Settings -> Notifications -> Webhooks) pointing to the Supabase Edge Function URL:
1. **Event:** `Order creation` (Pushes initial sales data, items, and estimated fees)
2. **Event:** `Fulfillment creation` (Pushes the actual Tracking Number and Carrier Name the moment a label is generated)
3. **Event:** `Order update` (Critical for mapping refunds, cancellations, and tag changes backwards into the ledger)

**Shopify Tag Parsing Logic:**
To bypass the limitation of Shopify's API not exposing exact label costs, the Edge Function algorithmically scans `order.tags` for specific syntaxes. If it finds `Label: <cost>` or `Type: <transaction_type>`, it actively overrides the True Net Profit shipping cost deductions and transaction types before inserting them into the database.

### B. Required Environment Variables
The Edge Function relies on the following secrets stored in Supabase (Settings -> Edge Functions -> Secrets):
* `SHOPIFY_WEBHOOK_SECRET`: The HMAC verification key provided by Shopify to prevent unauthorized POST requests.
* `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`: Native Supabase client bypass variables.

### C. Deduplication Logic & Financial Idempotency (`shopify-webhook`)
To prevent compounding data corruption from Shopify retries, the edge function MUST execute a manual pre-flight deduplication loop. It queries the `sales_ledger` for existing `order_id` values, strictly segregating rows into `insertRows` and `updateRows`, applying `.update()` to existing entities mapped strictly by the primary key `id` rather than blindly inserting duplicates. Furthermore, the upsert logic strictly enforces **Financial Idempotency**: it explicitly blocks Shopify payloads from overwriting existing `actual_shipping_cost` or manual COGS overrides with `null` or `0`, preserving local data integrity.

### D. Historical API Backfill Architecture (`backfill-shopify-operational-data.js`)
* **Execution:** A standalone Node.js script used to retroactively sync historical Shopify order data (tracking numbers, carriers, actual payouts, fulfillment statuses, and PII hashes) bypassing the 60-day read limit.
* **Authentication Matrix:** Due to Shopify deprecating static Admin API passwords, this script relies on a **Custom App Client Credentials OAuth Flow**. It natively exchanges `SHOPIFY_CLIENT_ID` and `SHOPIFY_CLIENT_SECRET` (stored securely in `.env.local`) for an ephemeral access token before executing GraphQL queries.
* **Permission Scopes:** The Custom App must explicitly be granted `read_orders`, `read_fulfillments`, and critically, `read_all_orders` (to access history beyond 60 days).
* **Payout Logic:** The `actual_payout` extraction specifically searches for `SALE` or `CAPTURE` transaction events within the order's history. It is a calculated field: `(Captured Amount) - (Shopify Payment Fees)`.
* **The Label Cost Limitation:** Due to structural API limitations, Shopify's public API does NOT expose specific shipping label costs purchased through Shopify Shipping. This is intentionally omitted from the backfill script; label costs must be calculated via internal COGS estimation or manually backfilled via the Shopify Billing CSV Importer in the CEO Dashboard, which maps raw charges to the `sales_ledger`.

---

## Security Patterns

### A. PII Hashing (`hashPII`)
- **Location**: `sales-module.js` L1 — called inside `processParsedSales()` during CSV import.
- **Algorithm**: SHA-256 via `window.crypto.subtle.digest()` (Web Cryptography API).
- **Constraint**: `crypto.subtle` is **only available in secure contexts (HTTPS or localhost)**. On plain HTTP it will throw `TypeError: Cannot read properties of undefined`.
- **Degradation behavior**: `hashPII()` is wrapped in `try/catch`. On failure it logs to `sysLog` and returns `null`. The upstream `processParsedSales` continues — customer hash fields will be `null` in the DB row rather than crashing the entire import.
- **Zero PII guarantee**: Raw email/phone/name/address values are NEVER stored. Only the SHA-256 hex digest is persisted.

### B. Client DOM Integrity & XSS Mitigation (`window.safeHTML`)
- **Location**: `neogleamz-engine.js` (L45) — globally accessible wrapper.
- **Algorithm**: The application architecture strictly maps all dynamic `.innerHTML` string evaluations through `window.safeHTML(...)` to sanitize injection payloads.
- **Execution Engine**: Utilizes **DOMPurify** internally natively enforcing a specialized structural configuration (`DOMPurify.addHook('uponSanitizeAttribute')`) designed to preserve legacy functional UI events (`onclick`, `onchange`) whilst surgically destroying disguised `javascript:` payload executions.
- **System Firewall**: The active web architecture globally utilizes a strict `Content-Security-Policy (CSP)` enforced explicitly at the `index.html` runtime via Meta Headers to sever untrusted script execution.

---

## 🧪 8. Automated Testing Architecture
* **Testing Framework**: The webapp relies on **Jest** combined natively with **jest-environment-jsdom** to simulate a browser execution environment from the terminal. 
* **Zero-Build Compatibility**: This ensures mathematical algorithms (e.g., `calculateProductBreakdown`, True COGS mapping) from the Vanilla `.js` stack can be run instantaneously via `npm test` without needing Webpack, browser drivers, or Node exports.
* **Mocks Setup**: `tests/setup.js` executes globally before tests, simulating native browser variables (`window.catalogCache`, `window.productsDB`, `window.inventoryDB`, `window.NEOGLEAMZ_CONFIG`) so mathematics execute deterministically during unit tests offline.
* **Core Suites Established**:
  1. `math-engine.test.js`: Validates True COGS, 3D Print Times, Stripe/eBay Fees, and Predictive LTV/CAC Metrics.
  2. `inventory-engine.test.js`: Validates Reorder Point (ROP) math, Trailing Velocity trailing averages, and Safety Stock calculations.
  3. `sales-engine.test.js`: Validates the complex revenue-shifting logic required to properly calculate the absolute True Net Profit when standard orders are chained to Pre-Ship Exchanges, Post-Ship Refunds, or Warranty claims.

### Static Code Analysis
* **ESLint Flat Config:** The project utilizes a modern ESLint v10 Flat Configuration (`eslint.config.mjs`) to strictly enforce Vanilla JS best practices and syntax sanitization. The `npm run lint` script performs algorithmic sanitization of the codebase pre-execution.

---

## 📡 9. Diagnostic Telemetry & Observability
* **Global `sysLog` Infrastructure**: The primary method for terminal telemetry is `sysLog(msg, color, payload)`.
* **Payload Deep Inspection**: The `sysLog` method has been natively upgraded to accept an optional third argument: `payload`. When passing deep JS objects or arrays (e.g., Supabase inbound hooks, database upsert mapping arrays), `sysLog` will intelligently serialize the payload and render it as a collapsible, monospaced `[Payload Data]` block natively within the Command Center terminal. This strictly negates the need to use `console.log()` for complex async state inspection.

## 💸 10. Financial Engine & Decoupling Architecture

### A. The Net Profit Sandbox (`sales-module.js`)
The core financial engine operates by aggregating raw data into logical blocks before executing final profit extraction. To prevent "ghost revenue" and double-counting during complex fulfillment flows (e.g., Post-Ship Exchanges), the system strictly decouples the Original Voided Transaction from the Replacement Transaction.

*   **Original Transaction (Voided)**: Visual aggregated properties (`r.total`, `r.exchAdj`) are explicitly zeroed out (`u.total = 0; u.exchAdj = 0;`). The system strictly retains its raw historical costs (Label Costs, Stripe Fees, COGS if un-restocked) to track the true loss of the transaction. It does NOT generate net revenue.
*   **Replacement Transaction**: The system actively transfers the original captured revenue (`r.total = u.total;`) and any Outstanding Balance (`r.exchAdj = u.exchAdj;`) to this node. During Sandbox mapping, the Outstanding Balance (`outBal`) is specifically appended to `rawNet` (`let net = rawNet + outBal;`) to guarantee the actual payment difference is reflected in the final Net Profit visualizer.

### B. Stripe/Gateway Fee Baseline Extraction
Gateway fees are dynamically calculated by subtracting `exactPayout` from `orderCaptured`. To prevent inflated fee estimations caused by downstream refunds, the system strictly injects an `orderRefund` reduction check directly into the aggregation loop (`group.reduce(...) - orderRefund`). By isolating the true net revenue before comparing it to the exact payout, the engine successfully avoids hallucinating massive negative fee structures when transactions are partially refunded.

### C. The Strict Parentheses Multiplication Rule
When calculating aggregate metrics like COGS or true revenue captures derived from dynamic fallback functions, the engine MUST enforce strict mathematical parentheses around ternary conditional operators before multiplying by quantity (`qty`). (e.g., `let liveCogs = (x.cogs_at_sale != null ? parseFloat(x.cogs_at_sale) : getEngineTrueCogs(x.recipe)) * qty;`). Failing to wrap the ternary blocks evaluates the multiplier against only the false condition, breaking multi-item order mathematics globally.

### D. Zero-Trust Ledger Protocol (Forensic Mappings)
All financial rendering and aggregation must strictly filter through the forensic payload generated by `neogleamz-engine.js`. The engine actively assigns an `isCostOnlyItem` boolean flag for `IGNORE`, `Cancelled`, `Warranty`, `Gift`, `NEEDS ATTENTION`, and `Partial Refund` orders. When `isCostOnlyItem` is true, the UI components and totals engines MUST zero-out the gross revenue (`forensic_sale_price`) and only compute the baseline COGS or physical shipping losses, preventing raw Shopify API data from artificially inflating global net profit views.

---

## 🛠️ 11. Task Engine Architecture
* **Command Palette (Cmd+K)**: The application utilizes a global Command Palette (ID: `#neoCommandPalette`) summoned via `Cmd+K` or `Ctrl+K` from any context. This serves as the primary navigation and action hub.
* **Spreadsheet Data Grid**: The task lists utilize a strict `display: grid` CSS layout to align `Task`, `Owner`, `Status`, `Timeline`, and `Priority` columns dynamically without `flex` wrapping failures.
* **List View Sorting & Prioritization**: Task ordering inside the List View is governed dynamically by `metadata.sort_order` integers. When users manually drag and drop rows via `SortableJS` inside a `.te-sortable-cycle-list` wrapper, the exact index sequence is mathematically persisted directly back to Supabase.
* **Global Column Sort Overrides**: Clicking list view headers (`data-col`) injects a dominant state into `window.teCurrentSort` (e.g., `{col: 'title', dir: 'asc'}`). This strictly overrides manual `sort_order` rendering until the column is clicked a third time to clear the sort state, seamlessly returning the DOM to the saved manual priority stack.
* **Kanban Board Mechanics**: The Board view implements dual-interaction logic for tasks. Native dragging automatically triggers state mutation via `SortableJS` handlers, while the `data-click` delegators strictly enforce opening the task Context Flyout and the inline Status Selector from the pill buttons without colliding with drag events.
* **Activity Timeline**: The Context Flyout uses a vertical CSS `border-left` connector (`.task-timeline-container`) combined with absolute-positioned `.task-timeline-node` dots to visualize the linear history of task interactions and user comments.
* **Flyout Context Resizer**: The right-side context flyout implements a native vanilla horizontal resizer (`initFlyoutResizer`) to allow the user to expand or collapse the context panel. It binds `mousemove` and `mouseup` to the document body to dynamically calculate the reverse horizontal inverse offset for fluid width adjustments, overriding standard width parameters and storing state preferences.

---

## 12. SOP Print Pipeline & Editor Architecture

### A. The 3-Mode Print Modal (openSopPrintModal)
The SOP print system was refactored from a direct window.print() call to a structured selection modal. The global function openSopPrintModal(context) accepts a context string ('production' or 'packerz') and injects a full-screen modal with 3 print mode buttons. Execution is handled by window.executeSopPrint(mode) where mode is one of:
* **checklist** � Renders only the checklist SOP rows. Markdown-formatted headers (# Header) are styled as <h3> section blocks. Block-quote subtexts (> text) are rendered as styled .sop-subtext callout spans. Checkboxes are stripped from header rows.
* **ichtext** � Renders only the Rich Text (contenteditable) SOP body, injecting white-space: pre-wrap to preserve operator-entered formatting during physical print output.
* **ull** � Renders both checklist and rich text sections sequentially in a single print document.

The modal is registered in system-event-delegator.js via the following data-click case labels:
* click_window_openSopPrintModal_prod ? openSopPrintModal('production')
* click_window_openSopPrintModal_pack ? openSopPrintModal('packerz')
* click_window_closeSopPrintModal ? closeSopPrintModal()
* click_executeSopPrint_checklist ? executeSopPrint('checklist')
* click_executeSopPrint_richtext ? executeSopPrint('richtext')
* click_executeSopPrint_full ? executeSopPrint('full')

### B. SOP Button Bar Responsive Standard
All SOP action button bars (Master Production, Master Packerz, Inline Packerz, Inline Batchez) must adhere to the following CSS architecture to ensure fluid layout when panes are resized via horizontal sliders:
`css
/* Outer wrapper */.sop-controls-container { display: flex; min-width: 0; overflow: hidden; }
/* Button bar row */ display: flex; flex-wrap: wrap; gap: 5px; align-items: center;
/* Each button */ white-space: nowrap; flex-shrink: 0; padding: 4px 10px; border-radius: 20px;
`
**CRITICAL:** lex-wrap: nowrap is FORBIDDEN on SOP button bar containers. All button rows must use lex-wrap: wrap to allow graceful vertical stacking at narrow viewport widths.

### C. Rich Text Toolbar (t-toolbar) Flex Rules
The Rich Text editor toolbar is generated by getRTToolbar() in production-module.js. To prevent overflow when the editor pane is compressed by the horizontal split resizer, the following constraints are mandatory:
* **Container:** display:flex; flex-wrap:wrap; overflow:hidden; gap:4px; min-width:0;
* **Font-size <select>:** max-width:100px; min-width:0; � prevents the select from expanding and blowing out the toolbar width.
* **Color <input type="color">:** lex-shrink:0; � prevents the color swatch from being squished into an unusable state.
* **Action row (PHOTO/UPLOAD/NEW URL):** display:flex; flex-wrap:wrap; gap:5px; � allows the 3 media action buttons to reflow to a second row at narrow widths.

### D. Event Delegator Case Label Naming Convention
To prevent 
o-duplicate-case ESLint errors in system-event-delegator.js, case label strings must be globally unique. Historical violations and their canonical resolutions:
* click_window_openPrintSOP_currentPri was ambiguous � the 3D Layerz print handler is now **click_window_openLayerzPrintSOP_currentPri** (calls window.openPrintSOP(currentPrintJob.part_name)).
* click_printPackerzSOP existed at L275 (new openSopPrintModal routing) and L897 (legacy printPackerzSOP()). The legacy handler is now **click_printPackerzSOP_legacy**. New DOM elements must only ever reference the L275 case.


## Serverless & Edge Functions

### Webhook Idempotency & Database Constraints
To prevent race conditions during simultaneous webhook transmissions (e.g. orders/create and orders/updated arriving on the same millisecond), the architecture employs a two-tier lock:
1. **Payload Aggregation**: Edge functions pre-aggregate duplicate line items (by storefront_sku) natively before pushing to the DB. This prevents false-flags of legitimate multiple cart additions.
2. **Database Constraints**: The sales_ledger table enforces a UNIQUE(order_id, storefront_sku) constraint. Simultaneous requests will trigger a Postgres constraint violation on the secondary payload, which causes the Edge Function to fail safely (HTTP 500). Shopify’s native retry algorithm then automatically delays and retries the webhook, which subsequently succeeds via an .update() bypass.
