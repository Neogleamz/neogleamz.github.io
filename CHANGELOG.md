# SK8Lytz Application Changelog

## [Unreleased]
### Features & Refactors
- **Sandbox UI Typography & Layout Refactor**: Applied a uniform sizing structure to the numbers in the raw database snapshot and CSV row to improve readability, shrank the vertical height of the main header, and applied inline flex formatting with explicit dataset headers.

## [1.0.29] - 2026-05-04
### Features & Refactors
- **Sandbox Engine Immersive Refactor**: Transformed the "Net Profit Sandbox Engine" into a full-screen immersive terminal with strict metric color-coding, overhauled the mathematical inheritance for Exchange logic, and patched the cash-basis net profit calculations.

## [1.0.28] - 2026-05-04
### Features & Refactors
- **Cycle Count Snapshots & Restoration**: Implement a system to capture "point-in-time" snapshots of cycle counts, enabling history tracking and the ability to restore inventory state to a previous snapshot.
- **Work Order Pipeline Stabilization**: Resolved a persistent 400 Bad Request error by migrating the ghost 'materials_pulled' column into the `wip_state` JSONB object and standardizing native JSON transmission for `routing` and `wip_state`.
- **Telemetry Parameter Correction**: Fixed a UI bug where passing color hex strings to `sysLog` caused the status bar to turn red (due to truthy boolean coercion); corrected the function signature to properly handle success/error states.


## [1.0.27] - 2026-05-03
### Features & Refactors
- **Legacy var → let/const Upgrade**: Systematically upgrade all legacy `var` declarations to block-scoped `let`/`const` across all 16 production modules, verifying no hoisting-dependent logic breaks.
- **Event Listener Memory Leak Audit**: Add `removeEventListener` cleanup to the 10 modules missing it (task-engine, sales, scraper, orders, labelz, inventory, ceo, bom, barcodz, analytics) to prevent memory leaks on view re-renders.
- **Absolute Position Purge**: Systematically purged legacy `position: absolute` styling across 7 core modules (Socialz, Production, Packerz, Scraper, Inventory, Task-Engine, System-Tools), migrating to standardized `grid-stack` and flex-based layout patterns.
- **Orphan Script Relocation**: Relocated 6 loose utility scripts (`check_ids.js`, `check_openapi.js`, `check_schema.js`, `test-fetchall.js`, `test-supabase.js`, `test.js`) from the project root to the `scripts/` directory and refactored `test-supabase.js` to remove hardcoded API keys.

## [1.0.26] - 2026-05-03
### Features & Refactors
- **Purge Inline onclick Handlers (production-module.js)**: Migrate all ~40 inline `onclick=` handlers to `data-click` delegators registered in `system-event-delegator.js`.
- **Purge Inline onclick Handlers (print-module.js)**: Migrate all ~15 inline `onclick=` handlers to `data-click` delegators.
- **Purge Inline onclick Handlers (packerz-module.js)**: Migrate all ~10 inline `onclick=` handlers to `data-click` delegators.
- **Purge Inline onclick Handlers (labelz-module.js)**: Migrate all ~10 inline `onclick=` handlers to `data-click` delegators.
- **Purge Inline onclick Handlers (system-tools-module.js)**: Migrate all ~8 inline `onclick=` handlers to `data-click` delegators.
- **Purge Inline onclick Handlers (sales, ceo, barcodz, analytics, task-engine)**: Migrate remaining ~17 inline `onclick=` handlers across 5 smaller modules.
- **DOMPurify Coverage Expansion**: Wrap all unguarded `.innerHTML =` assignments through `window.safeHTML()` in the 10 unprotected modules (socialz, scraper, print, packerz, orders, labelz, ceo, bom, barcodz, analytics).

## [1.0.25] - 2026-05-03
### Features & Refactors
- **Task Engine Board View Interactions**: Enable full interaction, opening, and working of individual tasks directly from within the Kanban Board view.
- **Status Selector Refactor**: Replace the click-to-cycle logic on task status pills with a native dropdown/selector menu for precise status assignments, and replaced the obsolete Blocked view with an active In-Progress view.
- **Task Engine Archive**: Implement the ability to soft-delete/archive tasks, cycles, and teams, and build a dedicated Archive UI view.
- **Task Sorting & Prioritization**: Implement the ability to sort tasks globally and prioritize them (e.g., via drag-and-drop) within specific cycles.
- **List View Column Sorting**: Enable dynamic sorting by clicking on any column header within the List/Row view (Owner, Status, Timeline, Priority).
- **Task Timelines & Calendar Sync**: Implement date picking/timelines for individual tasks and map them to render dynamically on the Calendar view.
- **Task Engine UI Colorization**: Inject more vibrant colors into the left sidebar pane and the top navigation of the right pane (List/Board/Calendar) to create clearer visual distinction for active states.
## [1.0.24] - 2026-05-02
### Features & Refactors
- **Phase 7 (Communication & Inbox)**: Implement the Universal Inbox triage system, nested progress rollups, and rich-text activity feeds.
- **Phase 6 (Automations & Kanban Ecosystem)**: Built a dynamic CSS Grid Calendar matrix, integrated `SortableJS` for buttery smooth Kanban drag-and-drop operations, and deployed the Deep Context Flyout Automations dropdown to instantly spawn cross-module work orders (Batchez, Layerz).
- **Phase 5 (Embedded UI Payloads)**: Wired up the cross-module hooks and implemented the Supabase data pipeline for the Task Engine (dynamic sidebar, caching, `task_activity` logging, and status mutation logic).
- **Phase 4 (Deep UX Synthesis & Command Palette)**: Implemented global Cmd+K palette and Asana/Monday-style grid architectures for the Task Engine Command Center.
- **Phase 3 (The UI Takeover)**: Built the fullscreen glassmorphism modal, the split-pane layout, and the slide-out Context Panel (Anti-Modal) for the Task Engine Command Center.
- **Phase 1 (Multi-User Identity)**: Integrated Supabase Auth for Chris, Andy, and Tyson, natively building the identity capture logic and dynamic UI header rendering to track active sessions across the Command Center.
- **Phase 2 (Database Schema)**: Executed SQL migrations for `taskz`, `cyclez`, `task_templates`, and `task_activity` tables with full `authenticated_full_access` RLS policies, establishing the multi-user relational backend framework.
## [1.0.23] - 2026-05-02
### Features & Refactors
- **Buildz Step Time Tracking**: Built capability to track time spent on individual Buildz steps, log durations to Supabase, and display metrics natively in the Work Orders archive. Addressed global UI instability by removing aggressive CSS hover jumps from modal close buttons.

## [1.0.22] - 2026-04-29
### Features & Refactors
- **Stripe Fee Decoupling Logic**: Resolved Gateway fee inflation anomalies and ghost revenue by actively decoupling voided and replacement transactions during Sandbox processing. Added an `orderRefund` reduction check to `trueOrderFee` baseline extraction to prevent negative revenue projections.
- **Export Backup Fix**: Ensured the 'EXPORT BACKUP' button in the NEXUZ command center correctly displays progress tracking strings during execution.
- **Actual Net Matrix Verification**: Built an interactive Math Simulator modal inside the Orderz UI to validate Net Profit algorithms natively across complex order combinations (Pre-Ship exchanges, Post-Ship replacements, etc.). [🤖 AI Model] [🧠 TBD / 10k] [💸 TBD / $0.05]
- **UI Enhancements**: Changed the SALEZ hub card to remove 'Unmapped Etsy' and 'Unmapped Shopify', replacing them with 'Orders (30D)' and 'Actual Net (30D)' for accurate 30-day performance tracking. [🤖 AI Model] [🧠 TBD / 5k] [💸 TBD / $0.02]
- **Hub Card Math Validation**: Validated all mathematical algorithms for all hubs, fixing a geometric inflation bug in the IMPORTZ card's Total Goods Cost computation by implementing robust Set-based deduplication logic for global Parcel/Order tracking. [🤖 AI Model] [🧠 TBD / 10k] [💸 TBD / $0.05]
- **Shopify Tag Parser**: Developed a forward-looking Webhook/Sync module to automatically extract "order type" and "shipping label cost" directly from Shopify Order Tags as they are generated, eliminating the need for future manual CSV imports. [🤖 Gemini 3.1 Pro] [🧠 15k / 25k] [💸 $0.05 / $0.08]
- **Shopify Flow Automation**: Investigated building a Shopify Flow that automatically tags orders with the `Label: <price>` format when a shipping label is purchased or printed, feeding natively into the webhook parser. (Finding: Impossible, relying on CSV) [🤖 Gemini 3.1 Pro] [🧠 10k / 5k] [💸 $0.03 / $0.02]
## [1.0.21] - 2026-04-28
### Features & Refactors
- **Shopify Historical Backfill Engine**: Built a frontend CSV importer on the CEO dashboard to ingest manual Shopify Billing exports (Billing -> Charges -> Shipping fees) and automatically match label costs to historical orders in the `sales_ledger`. [🤖 AI Model] [🧠 TBD / 25k] [💸 TBD / $0.08]
## [1.0.20] - 2026-04-28
### Features & Refactors
- **Shopify Historical Backfill Engine**: Architected a historical data sync engine using Shopify Custom Dev App (Admin API) to securely extract past operational data (tracking numbers, exact label costs, and carrier details) via Client Credentials OAuth flow without fragile screen scraping, integrating it idempotently into the Supabase `sales_ledger`. [🤖 AI Model] [🧠 TBD / 25k] [💸 TBD / $0.08]

## [1.0.19] - 2026-04-28
### Features & Refactors
- **Revenuez Fulfillment Expansion**: Intercepted Shopify webhooks (orders/updated and fulfillments/create) and executed GraphQL fetches to extract tracking numbers, carriers, and exact label costs. Updated the Supabase `sales_ledger` schema and modified the Revenuez UI data grid to surface operational data with clickable tracking links and warnings. [🤖 AI Model] [🧠 40k / 25k] [💸 $0.15 / $0.08]
- **Sitewide Mathematical Verification Audit**: Audited recursive BOM cost roll-ups, item-level net profit algorithms, global CFO waterfall mathematics, and Reorder Point (ROP) inventory velocity calculations for strict mathematical fidelity. Validated LTV/CAC predictive cohort simulator math and integrated robust Jest unit test suites for continuous autonomous verification. [🤖 Gemini 3.1 Pro] [🧠 105k / 100k] [💸 $0.23 / $0.27]
- **Dependency Bumps**: Updated `@supabase/supabase-js` to `2.105.0`, `supabase` CLI to `2.95.5`, `eslint` to `10.2.1`, and `prettier` to `3.8.3`. [🤖 Gemini 3.1 Pro] [🧠 5k / 5k] [💸 $0.02 / $0.02]
- **Inventory Column Filters**: Added ability to filter columns in DATAZ and EDITZ ledgers. [🤖 AI Model] [🧠 25k / 5k] [💸 $0.08 / $0.02]

## [1.0.18] - 2026-04-21

### Features & Refactors
- **Orderz Sorting & Duplicates**: Fixed the bug in Revenuez where ORDERZ columns cannot be sorted, and resolved duplicated Shopify order (#1039) via webhook upsert logic. [🤖 AI Model] [🧠 TBD / 5k] [💸 TBD / $0.02]
- **Socialz UI Hotfixes**: Investigated and fixed the issue where the Socialz tab rendered a completely blank screen instead of the expected UI. Re-engineered event delegation targeting, natively injected brand SVGs to bypass missing FontAwesome libraries, expanded inputs to fit viral URLs, and built a global error capture listener to prevent DOMPurify from purging avatar error-fallback states. [🤖 AI Model] [🧠 40k / 5k] [💸 $0.15 / $0.02]

## [1.0.17] - 2026-04-20

### Features & Refactors
- **Batchez UI Fixes**: Fix the bug in Batchez where SOP rows cannot be expanded or collapsed, and row-level print/edit buttons are unresponsive. Restored Stage 2 Pick List interactions and fixed empty print lists. [🤖 AI Model] [🧠 TBD / 5k] [💸 TBD / $0.02]

## [1.0.16] - 2026-04-14

### Features & Refactors
- **Safe Database Defibrillation**: Developed the `[/schema_diff]` workflow. To eliminate database mutation anxiety, the workflow is rigidly scoped to Strict Read-Only Mode to natively diff local `/supabase/migrations` against remote instances. All state-mutating execution (e.g. `supabase migration repair`) is now completely isolated behind a secondary, mandatory *"Defibrillate"* user-authorization gate.
- **Agentic Orchestration Overhaul**: Architected and permanently deployed the unifying `[/finalize_epic]` deploy script to mitigate manual 3-step DevOps merge collision loops. Restructured the `[/bucketlist]` branch mapping engine to aggressively prevent Phantom Ledger Divergences, and enacted the global `active_context_lock.md` structural algorithm. The AI now actively rejects cross-branch context contamination (Option A: Ticket & Toss) while supporting a native show-stopper backdoor (Option C: Commit & Detour).
- **Agentic Evolutionary Tooling**: Built and deployed the `[/red_team]` workflow to enforce a strict persona shift where the AI acts as a malicious Penetration Tester to proactively scan Vanilla JS modules for DOM clobbering, injection vectors, and construct string exploits before code triggers deployments to production.
- **Agentic Evolutionary Tooling**: Built and deployed the `[/ui_xray]` native diagnostic workflow, granting the AI the capability to autonomously inject layout-bounding CSS macros and physically view DOM structural collisions to resolve flexbox overlap bugs.
- **Security Architecture Audit & Hardening**: Executed a comprehensive repository-wide security audit utilizing `xss-risk-map.js`. Discovered and systematically remediated 230 injection vectors by wrapping them dynamically with a strict `window.safeHTML()` protocol that preserves vanilla JS UI functionality. Deployed a system-wide Content-Security-Policy (CSP) across the infrastructure locking down DOM mutations directly natively.

## [1.0.15] - 2026-04-14

### Features & Refactors
- **Framework Immutability Upgrades**: Rewrote the core Release Manager AI workflow rule to successfully tag and archive past records with `[🚀]` flags rather than routinely pruning them, establishing a mathematically impenetrable Immutable Ledger. Synthesized global metadata tracking hooks throughout the core operational workflows (Intake, Code Debt Hunts, and Product Alignment protocols), automatically enforcing metadata injections to explicitly track lifecycle AI token operations.
- **CSS Layout Physics**: Declassified the legacy `index.html` margin hacks into `PATTERN:` flags, validating safe margin-auto flexbox architecture without triggering tech-debt anomaly alerts.

## [1.0.14] - 2026-04-14

### Features & Refactors
- **Agentic Framework Telemetry**: Established a visible tracking convention for LLM API token spend vs. expected spend budget directly on the Bucket List tasks and epics to precisely monitor AI operational costs. Deployed a Global Odometer header macro to permanently track cumulative project token burn natively within the Markdown tracker. (`[🤖 Gemini 3.1 Pro] [🧠 25k/50k] [💸 $0.08/$0.15]`).

## [1.0.13] - 2026-04-14

### Features & Refactors
- **Cohort Intelligence Ledger Matrix**: Rebuilt the LTV modal into a forensic transaction ledger supporting bidirectional alphanumeric drag-to-sort functionality. Deployed custom logic blocking pseudo-returns and zero-intent orders (Warranty, Gifts, Post-Ship Exchanges) from improperly flagging accounts as Repeat Buyers. Injected the encrypted PII hashes directly into the data matrix, enabling physical grouping of multi-order accounts upon column sort. Mathematically verified line-item true capture rates to prevent Total / Net revenue inflation metrics caused by Shopify's raw exports. 
- **Automated Testing Engine Integration**: Successfully integrated a robust, zero-build Jest/JSDOM automated matrix to natively evaluate algorithm parity. Validated mathematical fidelity mathematically testing recursive BOM extraction arrays (`calculateProductBreakdown`), core Stripe fee thresholds, baseline 3D printing durations, and multi-variable sales computations via the `getHistoricalNetProfit` method. Tested predictive parameters mapping dynamically to `calculateTrailingVelocity` forecasting limits and `calculateDynamicROP`.

## [1.0.12] - 2026-04-14

### Features & Refactors
- **Vertical Layout Media Query Fix**: Addressed a critical bug where the main header's `.tabs` wrapper collapsed to `0px` height when the viewport scaled below `1024px`. Extracted inline JS flex logic into a unified `.nav-tabs-wrapper` CSS class to allow strict media query overrides (`flex: 0 0 auto !important`), seamlessly preserving natural row block heights upon single-column flex-wrap inversions.
- **Dependency Audit**: Verified 0 native system vulnerabilities and bumped `supabase` CLI to version `2.90.0`.

## [1.0.11] - 2026-04-13

### Features & Refactors
- **Cohort Simulator Formatting**: Condensed the top 6 KPIs to a single row to save vertical space. Relocated the "View Cohort Intelligence" button to the top right header. Refactored order-count logic to accurately use unique Order IDs instead of raw line items. Expanded the LTV modal to include a 'Total Buyers' stat, enlarged its viewing area, and applied drag-to-sort logic to the data table.
- **Header Responsive Architecture Patch**: Enforced mathematically perfect flex symmetry while strictly protecting fixed UI elements from leftward-spillage. Replaced manual `min-width` parameters with `min-content` on side containers to guarantee controls are never squeezed beyond physical boundaries. Applied `flex: 1 1 0` symmetrically on the JS wrapper to ensure correct allocation of center horizontal squeeze factor, completely eliminating the tab-overlapping bug on browser resize.

## [1.0.10] - 2026-04-13

### Features & Refactors
- **Widescreen Navbar Scroll Integration**: Restructured the top header into a single horizontal row on widescreen displays (>1200px) with dedicated hub tabs (`.tabs`) mapped to freely scroll horizontally via intuitive swiper arrows. System collapses automatically back to a stacked 3-row GUI configuration on smaller viewports.
- **Pure Flexbox Layout Architecture**: Completely rebuilt the structural GUI engine for global `.pane-header-bar` and `.modal-close-btn` components. Eradicated all structural absolute positioning overrides in favor of a 100% fluid flexbox system. This perfectly mitigates overlapping text layouts and UI element collisions dynamically across the entire web application and internal sandbox modals.

## [1.0.9] - 2026-04-12

### Features & Refactors
- **Nexuz Importer UI Compact Refactor**: Standardized all NEXUZ importer cards (Orderz, Parcelz, Salez, Backup & Restore, Force Recalculation, SKU Alias Manager) into a high-density 2-column flexbox architecture. This structure drastically reduces vertical scroll clearance while retaining 80% Engine Trace visibility horizontally. Formatted text headers for strict visual alignment and updated nomenclature titles for explicit workflow designations (e.g. SUPERBUY ORDERZ, SHOPIFY ORDERZ).
- **Backup & Restore Sandbox Protocol**: Upgraded the authoritative Database Vault with a 3-stage sandbox protection pipeline. Implemented "Test Mode" UI constraints forcing users to preview raw `.xlsx` inbound payload strings structurally before manually targeting specific operational tables and initiating live destruct/restore sequences. Included functional "Cancel" fallback routing.

## [1.0.8] - 2026-04-12

### Features & Refactors
- **Full-Repo Legacy Audit (Final Phase)**: Successfully completed the legacy HTML/DOM audit by eradicating inline event handlers and technical debt from `index.html`, `neogleamz-engine.js`, `system-tools-module.js`, `system-version.js`, `inventory-module.js`, `bom-module.js`, and `packerz-module.js`. These core modules now reliably utilize centralized Vanilla JS event delegator matrices.
- **Comprehensive UI & System Layout Documentation**: Conducted a granular, sitewide architectural documentation audit. Mapped the entire DOM structural layout, modular grid boundaries, and critical hub definitions (STOCKPILEZ, MAKERZ, FULFILLZ, REVENUEZ, SOCIALZ, NEXUZ) into the core `SK8Lytz_App_Master_Reference` knowledgebase to ensure perfectly synchronized AI agent context logic in future developments.

## [1.0.7] - 2026-04-12

### Features & Refactors
- **Sitewide Code Quality Audit**: Performed a full sitewide audit of current coding practices across JS modules, aligning them against industry standard best practices.
- **Full-Repo Legacy Audit**: Successfully executed the legacy audit protocol against `analytics-module.js`, `production-module.js`, `sales-module.js`, `orders-module.js`, `barcodz-module.js`, `labelz-module.js`, `print-module.js`, `socialz-module.js`, and `ceo-module.js`, eradicating technical debt, verifying DOM structures, and enforcing strict error boundaries.

## [1.0.6] - 2026-04-12

### Features & Refactors
- **Tailwind Modal Migration**: Migrated the SOCIALZ Add/Edit Skater modal, LTV Metrics Modal, and Analytics Dashboard Modal from Tailwind utility classes to native Vanilla CSS / `var(--*)` tokens to enforce consistency with the rest of the terminal UI.

## [1.0.5] - 2026-04-12

### Features & Refactors
- **Inventory UI State Management**: Decoupled the inventory column sorting configurations. Separated the `DATAZ` and `EDITZ` ledgers into independent isolated tracking objects so dynamically mutating UI sorting on one grid does not unintentionally bleed over to the other.

## [1.0.4] - 2026-04-12

### Features & Refactors
- **Sitewide Button State Feedback**: Standardized the overarching A.I. Application's core button functionality to visually reflect progress and loading states globally across the webapp. Integrated the new Async state handler `executeWithButtonAction` to guarantee precise visual feedback (Saving..., Synced!) for everything from `EXPORT BACKUP` commands in the Nexuz system to complex SOP modification states.

## [1.0.3] - 2026-04-12

### Features & Refactors
- **Inventory Data Grid & ROP Management**: Added a robust live search/filtering feature to the DATAZ/EDITZ ledgers. Architected a dynamic Reorder Point (ROP) tracking system, allowing global supplier lead thresholds to be overridden on a per-item basis for highly granular component procurement alerts.

## [1.0.2] - 2026-04-11

### Features & Refactors
- **WebRTC Cycle Scanner Integration**: Built an iPhone camera-compatible WebRTC cycle count scanner directly into the STOCKZ module to allow rapid warehouse cycle counts using natively accessible camera hardware.
- **Scanner Standardization & Dual-Card Layout**: Standardized the Cycle Count camera scanner engine with the SOP editor scanner. Completely eliminated the full-screen blackout modal layout in favor of a sleek side-by-side Dual-Card flex matrix. Implemented robust cross-platform stability checks for iOS Safari, native Android, and PC Webcams (`aspectRatio: 1.0` handling for 280x280 constraints) including dynamic auto-selection of the form upon successful QR barcode locking. 

## [1.0.1] - 2026-04-11

### Features & Refactors
- **Diagnostic Telemetry Upgrade**: Eliminated silent failures across the app. Implemented robust UI traces for database syncing, parser evaluation, and error catching directly to the local application UI nodes rather than hidden debug consoles.
- **Salez Order Sync Enhancements**: Modified the CSV Parser to bypass raw local deduplication until Post-Sanitation review allows users to securely examine all raw file rows inside the Sandbox Modal visually without overwriting existing data.
- **UI Architecture Unification**: Formatted the Salez Order Sync UI flex layout and terminal structures to strictly match the visual architecture of the Orderz and Parcelz Engine traces.

### Cleanups & Bug Fixes
- Restored missing specific progress feedback to all generic operation buttons using `executeWithButtonAction` API routing.
