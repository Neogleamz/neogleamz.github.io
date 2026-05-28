# SK8Lytz Application Changelog

## [Unreleased]

## [1.2.0] - 2026-05-28

### ✨ Features & Bug Fixes
- **High-Fidelity Remote Mobile Camera Sync & Preview** (`feat/mobile-camera-sync`): Overhauled the remote camera framework to deliver direct camera and gallery fallback support for the SOP Editors and Cycle Count managers, resolving device-side capture timing bugs.
  - **Dynamic Shutter & Selector Controls**: Segmented switchers between direct CAMERA (`capture="environment"`) and GALLERY fallback modes.
  - **Phone Staging Queue**: Scrollable haptic thumbnail cards on the phone portal with preview popups and delete clicks.
  - **Supabase Storage Deletes**: Initiator-driven garbage collection pipelines that purge discarded files from `sop-media` storage buckets.
  - **Double-Lock Security & Reconnections**: Zero-rescan automatic reconnect wake-ups and clean PC socket tear-downs on modal close or dashboard initiator changes.
  - **Startup Sound Suppression**: Robust DOM element inspection checks to completely silence start-up capture dings and beep notifications on dashboard loading.
  - **Aesthetic Polishing**: Dynamic local IP override card hiding, redundant pulsing phone emoji removal, and load screen version telemetry.
- **Login Theme Synchronization & Persistence** (`bug/login-theme-sync-issue`): Resolved the issue where the login card and progress overlay were locked in dark mode even if a light theme preference was saved. Transformed styles to consume dynamic CSS variables (`var(--bg-body)`, `var(--bg-glass)`, `var(--text-main)`) and updated the Neogleamz logo to dynamically swap orange/white vectors on theme change.
- **Login Boot Progress Modal** (`feat/login-boot-progress-modal`): Prevented operators from interacting with the main dashboard during system boot sequences by introducing a gorgeous glassmorphism loading overlay inside the login card. Added dynamic linear track animations, monospaced micro-diagnostic logs reporting parallel ledger synces in real-time, and blocked raw view entry until assets are 100% computed.
- **SOP Editor Checklist Photo & Add Step Fixes** (`bug/sop-editor-photo-checklist`): Resolved the non-functional photo buttons on the checklist side of all SOP editors (Batchez, Layerz, Packerz) by dynamically routing event delegators, fixed the broken bottom "+ ADD PROCEDURE STEP" button `TypeError` and `ReferenceError` crashes, and overhauled the step data extractor to cleanly save empty rich-text rows when valid media attachments are present.

## [1.1.2] - 2026-05-24

### ✨ Features & Bug Fixes
- **Socialz Cards Flex & Scaling Fix** (`style/socialz-cards-flex-scaling`): Refactored the SOCIALZ audience grid and cards to scale fluidly, snap perfectly to columns, and never chop off on the right across all viewport widths by using clean `minmax(0, 1fr)` and card-level flex bounds.

### 🛡️ Security & Audits
- **Red Team Security Pentest** (`epic/red-team-audit`): Dispatched Teamwork Swarm background workers to perform static analysis and dynamic input audits. Verified that 100% of DOM injection points are properly secured using window.safeHTML or DOMPurify, resulting in 0 vulnerable pathways.
- **Legacy Code Audit & Refactor** (`epic/legacy-code-janitor`): System-wide review of core active template files to ensure compliance with modern block-scoping variables, event delegators, and the absolute elimination of inline event handlers.

### 🧹 Chores & Cleanup
- **Orphan Scripts Relocation** (`debt/orphan-scripts-root`): Relocated `dump_buttons.py` and `trace3.py` from the root directory to the scripts/ directory using standard git mv to maintain perfect rename tracking and history.
- **Documentation & Visual Asset Relocation** (`debt/documentation-consolidation`): Consolidated loose root documentation (`nomenclature_dictionary.md`, `task_engine_evolution.md`, `test_shared.md`) and compiled vector SVGs (`diagram-1.svg`) into the `/docs/` subdirectory. Safely deleted legacy rotated barcode test snippet `test_print.html` and updated all system whitelists in the pre-commit hooks, core safety rules, and the App Master Reference to enforce absolute root isolation (Core Safety Protocol 6).

## [1.1.1] - 2026-05-24

### ✨ Features & Bug Fixes
- **Recommission Avatar Engine** (`feat/unavatar-supabase-sync`): Re-enabled the Avatar Migration Engine to fetch skater avatars from unavatar.io, upload them to Supabase, and resolve external reliance.
- **Avatar Upload Storage Fix** (`fix/socialz-avatar-upload`): Restored `avatars` storage bucket constraints and manual upload form inputs to prevent profile save failures.
- **ESLint Warnings Sweep & Bidirectional Rotation Sync** (`debt/eslint-warnings-sweep`): Resolved all static linter warnings, deployed a Canvas prototype baseline hotfix for Fabric.js CDN compatibility, and built inline slider-number input widgets with bidirectional binding for the FULFILLZ -> LABELZ Pane designer.

### 🧹 Chores & Cleanup
- **Hub Hierarchy & Nomenclature Audit** (`chore/hub-hierarchy-nomenclature-audit`): Mapped canonical schema boundaries and nomenclature across Hubz, Panes, and Modals, auditing the repository to align with SK8Lytz App standards.
- **Task Engine Competitive Analysis** (`research/task-engine-competitive-analysis`): Conducted detailed competitive architectural studies against Monday/Asana to plan next-generation features.
- **Orphan Scripts Relocation** (`debt/cleanup`): Pruned and organized loose root scripts, moving `check_syntax.js` to the `scripts/` directory.
- **HTML DOM Hardening** (`debt/security`): Secured inline scripts and iframe parsing configurations inside `qa-dashboard.html` with safeHTML wrappers.
- **Safety and Persona Protocols Evolved** (`chore/core-safety-evolution`, `chore/coding-preferences-evolution`): Codified strict bug-branching requirements, clickable hyperlinks, and standard alertPersonas.

## [1.1.0] - 2026-05-22
### ✨ Features & Bug Fixes
- **Responsive Flex QA Framework** (`feat/responsive-flex-qa-framework`): Develop a standardized testing protocol and/or automated toolset to test every page and full-screen modal at varying desktop and mobile resolutions, ensuring 100% adherence to pure Flex standards without clipping headers, buttons, or elements.
## [1.0.57] - 2026-05-22
### ✨ Features & Bug Fixes
- **Global Error Telemetry Wrapper** (`feat/global-error-telemetry`): Implemented a global execution wrapper in the system event delegator to catch, log, and surface 100% of UI events, interactions, and silent errors directly to the Diagnostics Console with full stack traces and subtle styling.

## [1.0.56] - 2026-05-22
### 🧪 Automated Testing
- **Jest Test Coverage Audit** (`test/audit-jest-coverage`): Refactored the testing framework to use standard `require()` instead of `eval()`, unlocking accurate Istanbul coverage matrices for math, sales, inventory, production, and CEO engines. Mocked `DOMPurify` to ensure clean terminal output.

## [1.0.55] - 2026-05-22
### 🧹 Chores & Cleanup
- **Legacy Audit File-by-File Sequence**: Executed `/legacy_audit` and systematically eradicated technical debt, absolute positioning, inline onclick handlers, and enforced modern ES6 Vanilla JS standards across the following modules:
  - `scraper-module.js` (`refactor/audit-scraper-module`)
  - `socialz-module.js` (`refactor/audit-socialz-module`)
  - `system-event-delegator.js` (`refactor/audit-system-event-delegator`)
  - `system-realtime-sync.js` (`refactor/audit-system-realtime-sync`)
  - `system-tools-module.js` (`refactor/audit-system-tools-module`)
  - `system-version.js` (`refactor/audit-system-version`)

## [1.0.54] - 2026-05-21
### 🧹 Chores & Cleanup
- **Legacy Audit File-by-File Sequence**: Executed `/legacy_audit` and systematically eradicated technical debt, absolute positioning, inline onclick handlers, and enforced modern ES6 Vanilla JS standards across the following modules:
  - `sales-module.js` (`refactor/audit-sales-module`)
- **ESLint Config Fixes**: Migrated legacy `.eslintignore` logic directly into `eslint.config.mjs` to resolve the persistent `ignores` deprecation warning.

## [1.0.53] - 2026-05-21
### 🧹 Chores & Cleanup
- **Legacy Audit File-by-File Sequence**: Executed `/legacy_audit` and systematically eradicated technical debt, absolute positioning, inline onclick handlers, and enforced modern ES6 Vanilla JS standards across the following modules:
  - `production-module.js` (`refactor/audit-production-module`)

## [1.0.52] - 2026-05-21
### 🧹 Chores & Cleanup
- **Legacy Audit File-by-File Sequence**: Executed `/legacy_audit` and systematically eradicated technical debt, absolute positioning, inline onclick handlers, and enforced modern ES6 Vanilla JS standards across the following modules:
  - `print-module.js` (`refactor/audit-print-module`)

## [1.0.51] - 2026-05-21
### ✨ Features & Bug Fixes
- **SOP Live Telemetry & Nested Sync Fixes** (Ad-Hoc): Mapped the missing `input_renderDashboardTelemetryPreview` event listener natively to the telemetry render engine to enable live real-time UI previews in all SOP checklist editors. Refactored the `saveMasterSOP` Batchez refresh logic to recursively search `currentWO.routing` objects, guaranteeing that modifying nested sub-assembly recipes natively forces an immediate DOM redraw of the parent Work Order UI.

## [1.0.50] - 2026-05-21
### ✨ Features & Bug Fixes
- **Task Engine 'T' Shortcut Fix** (`bug/task-engine-shortcut-t-regression`): Fix the regression where pressing 'T' in the task engine no longer starts creating a new task under the "No Section" bucket for rapid-fire task entry, and correctly route users from other hubs natively without triggering DOM node exceptions on Escape.

### 🧹 Chores & Cleanup
- **Legacy Audit File-by-File Sequence**: Executed `/legacy_audit` and systematically eradicated technical debt, absolute positioning, inline onclick handlers, and enforced modern ES6 Vanilla JS standards across the following modules:
  - `index.html` (`refactor/audit-index`)
  - `task-engine.js` (`refactor/audit-task-engine`)
  - `analytics-module.js` (`refactor/audit-analytics-module`)
  - `barcodz-module.js` (`refactor/audit-barcodz-module`)
  - `bom-module.js` (`refactor/audit-bom-module`)
  - `ceo-module.js` (`refactor/audit-ceo-module`)
  - `inventory-module.js` (`refactor/audit-inventory-module`)
  - `labelz-module.js` (`refactor/audit-labelz-module`)
  - `neogleamz-engine.js` (`refactor/audit-neogleamz-engine`)
  - `orders-module.js` (`refactor/audit-orders-module`)
  - `packerz-module.js` (`refactor/audit-packerz-module`)

## [1.0.49] - 2026-05-21
### ✨ Features & Bug Fixes
- **Hide 3D Printed SOPs in Stage 3** (`feat/batchez-hide-3dprint-sops-stage3`): Ensure 3D printed SOPs do not display in Stage 3 of the Batchez work order process.
- **Socialz "System Fault" on Save** (`bug/socialz-system-fault-error`): Suppressed cross-origin and Chrome Extension noise (e.g. LastPass DOM scanning crashes) from triggering the global "System Fault: Unknown Error" UI popups.

### 🧹 Chores & Cleanup
- **Socialz ESLint Cleanup** (`debt/socialz-eslint-warnings`): Resolved 3 ESLint warnings in `socialz-module.js` to achieve zero warnings in the module.
- **Task Engine Legacy Variable Refactor** (`debt/task-engine-legacy-var`): Migrated legacy `var` declarations in `task-engine.js` to block-scoped `const` to enforce modern ECMAScript standards.
- **Supabase JS Update** (`chore/dep-supabase-js-update`): Updated `@supabase/supabase-js` from 2.105.4 to 2.106.1.
- **DOMPurify Update** (`chore/dep-dompurify-update`): Updated `dompurify` from 3.4.4 to 3.4.5.
- **Supabase CLI Update** (`chore/dep-supabase-cli-update`): Updated `supabase` CLI from 2.98.2 to 2.101.0.

## [1.0.48] - 2026-05-21
### Features & Bug Fixes
- **System Version Telemetry Restoration**: Fixed a critical telemetry disconnect where the "System Ready Unknown" message was being rendered in the Command Center logs. Refactored the `NEOGLEAMZ_VERSION` parsing logic in the global sandbox to strictly utilize `window.NEOGLEAMZ_VERSION` payload mapping, bypassing aggressive ESLint namespace destruction and properly displaying live versions.
- **Pre-Commit Hook Engine Patched**: Updated the `bump-system-version.js` regex parser to flawlessly mutate the new `window.*` syntax on commits, re-establishing continuous integration parity.
## [1.0.47] - 2026-05-21
### Features & Bug Fixes
- **Recursive Subtask Rendering**: Implemented a recursive `renderTaskTree()` function in the Task Engine to elegantly render infinite N-depth nested subtasks, directly fixing a bug where dragging a task into another subtask's wrapper caused its descendants to become invisible.
- **Master Checkbox Glassmorphism Sync**: Systematically upgraded the master "Select All" table headers and the unified Archive view rows to match the modern `border-radius: 4px` glassmorphism aesthetic utilized by inline tasks, ensuring 100% UI checkbox parity.
## [1.0.46] - 2026-05-21
### Features & Bug Fixes
- **Socialz Missing Avatars** (`bug/socialz-missing-avatars`): Updated the Socialz page logic to properly pull and display an avatar for each skater by iterating through their available social media links if the primary one is missing. Implemented a native manual upload UI for edge-case skaters blocked by Unavatar rate limits, storing images directly to Supabase Storage.

## [1.0.45] - 2026-05-21
### Features & Bug Fixes
- **Layerz Stage 3 Cleaning Timers & Independent Yield Tracking**: Overhauled the Cleaned/Post-Processing Stage (Stage 3) to accurately track its own independent yield and time, separating it from the Bed Run Manager. Added Live Timer Control (start, pause, resume) and Context-Aware Part Count calculations. Integrated automatic Recovery Print generation without double-charging raw material inventory.
- **Inventory Reset Stock Levels Button Fix**: Fixed the orphaned "⚠️ Reset Stock Levels" button by re-implementing the missing `window.resetInventoryConsumption()` logic to properly wipe the `inventory_consumption` table and correctly refresh the local UI caches.

## [1.0.44] - 2026-05-20
### Features & Bug Fixes
- **Always Render Empty "No Section" Bucket** (`feat/task-engine-always-show-no-section`): Task Engine: Ensure that an empty "No Section" bucket (with the "+ Add Task..." dropzone) is always rendered natively in all views (Inbox, My Tasks, Projects, etc.), even if there are zero tasks currently without a section. This allows users to instantly create a task without having to create a section first. Also tightened UI rendering logic to fix phantom padding gaps on empty section lists.

## [1.0.43] - 2026-05-20
### Features & Bug Fixes
- **Shopify Missing Order Sync** (`bug/shopify-missing-order-sync`): Restored Shopify webhook integration by removing strict JWT verification on edge functions. Built a secure native Edge Function and a visual UI modal (`shopify-force-sync`) to manually ingest dropped Shopify JSON payloads cleanly into the database.
- **Purge Inline onclick Handlers (bom-module.js)** (`refactor/audit-bom-module`): Migrated all inline `onclick`, `onmouseover`, and `onmouseout` handlers in the Recipe Manager UI to `data-app-click` delegators registered in `system-event-delegator.js`. Replaced inline hover styles with standard Vanilla DOM classes to enforce Vanilla DOM Mastery standards and resolve XSS risk vectors.
- **Fix Task Modal Inbox Routing** (`fix/task-modal-routing`): When using CTRL+K to open the global task modal, clicking the "go to inbox" and "create new task" buttons failed to route the user. Refactored `system-event-delegator.js` logic to chain visibility states, hiding the Command Palette and explicitly forcing the Task Planner to open and switch views correctly.
- **Task Engine Project Section Colors** (`feat/task-engine-project-section-colors`): Updated the task engine UI so that when viewing a project, the sections dynamically inherit the color assigned to that project.
- **Infinite Nested Subtasks & UI Auto-Fit Density** (`feat/infinite-nested-subtasks`): Supported infinite nested subtasks (n-level hierarchy) and drag-and-drop subtask repositioning in the Task Engine. Implemented an extreme Auto-Fit UI rendering trap (`width: 0px` table layout override) to globally force tight data density and elegant ellipsis truncation across all modular data grids.

### Chores & Maintenance
- **Resolve Legacy no-undef Warnings**: Systematically audited and resolved the ~2,131 `no-undef` ESLint warnings globally across the Vanilla JS codebase to harden module architectures and enforce strict browser-sandbox scoping.
- **Resolve Persistent no-unused-vars Warnings**: Systematically audited and resolved the 158 persistent `no-unused-vars` ESLint warnings across multiple modules to harden the application and achieve a strict 0 Errors, 0 Warnings ESLint status.

## [1.0.42] - 2026-05-17
### Security & Hotfixes
- **Unguarded innerHTML Assignments**: Wrapped all dynamic `error.message` injections in `index.html` with the `window.safeHTML()` protocol to strictly prevent Cross-Site Scripting (XSS) payloads.

### Chores & Maintenance
- **Workflow Orchestration Refinement**: Updated the `bucketlist` workflow rules to explicitly differentiate between Single-Task Epics and Multi-Part Epics, correctly suggesting `[/ship_it]` and `[/release]` for single-tasks rather than trapping the user in a `[/finalize_epic]` conflict loop.

## [1.0.41] - 2026-05-17
### Features & Bug Fixes
- **Fix Light/Dark Mode Button & Tasks UI**: Removed duplicate toggleTheme function that broke the dark mode button, and restyled the Tasks button/badge to purple to distinguish from Logout red.

## [1.0.40] - 2026-05-17
### Features & Bug Fixes
- **Webhook Idempotency Race Condition Fix**: Refactored the Shopify `orders/create` Edge Function to aggregate identical line items organically, and implemented a strict `UNIQUE(order_id, storefront_sku)` constraint to the PostgreSQL `sales_ledger`. This guarantees mathematical parity during millisecond-simultaneous webhook triggers and totally eliminates duplicate record generation inside the financial trace pipeline.

## [1.0.39] - 2026-05-17
### Chores & Maintenance
- **Orphan Script Cleanup**: Cleaned up orphaned utility scripts and tests (Python scripts in `tools/`, `test-dompurify.js` in root, `test_supabase.js` and `Whydidthishappen.md` in `tools/`). Relocated or purged them to maintain project hygiene.
- **Dependency Hardening**: Executed `npm update` to safely bump `dompurify`, `eslint`, `jest`, and `supabase` to their latest patch/minor versions.
## [1.0.38] - 2026-05-17
### Features & Bug Fixes
- **SOP Print Formatting Options**: Replaced the static "Print SOP" button with a 3-mode print modal allowing users to choose between Checklist, Rich Text, or Full SOP output. Applied proper print styling to checklists (`#Headers` → formatted section headings, `> Subtexts` → styled callout blocks). Standardized all 4 SOP button bars (Master Production, Master Packerz, Inline Packerz, Inline Batchez) into compact, responsive single-row pill layouts. Fixed Rich Text toolbar flex overflow — `rt-toolbar` now wraps gracefully at narrow widths, the font-size select is clamped to `max-width:100px`, and the PHOTO/UPLOAD/NEW URL action row uses `flex-wrap:wrap` with `white-space:nowrap` per button.

### Chores & Cleanup (Boy Scout)
- **Duplicate Case Label Elimination**: Removed 2 dead duplicate `no-duplicate-case` ESLint errors in `system-event-delegator.js`. Renamed `click_window_openPrintSOP_currentPri` → `click_window_openLayerzPrintSOP_currentPri` (3D Layerz-specific SOP handler) and `click_printPackerzSOP` → `click_printPackerzSOP_legacy` (legacy pre-modal handler) to restore correct event routing and eliminate unreachable dead code.

## [1.0.37] - 2026-05-17
### Features & Bug Fixes
- **SOP Direct File Upload**: Implemented direct file uploading to Supabase Storage for both checklist items and rich text attachments. Replaced the non-functional "MEDIA" button in the checklist to utilize this new upload flow.

## [1.0.36] - 2026-05-17
### Features & Bug Fixes
- **WebRTC Camera Integration for SOPs**: Integrate the WebRTC camera functionality (currently used for cycle counts) into the SOP editor and active SOP worker views. Allow users to natively take physical photos of their work in progress, automatically upload the image assets to Supabase Storage, and inject the direct image link into the active SOP document/step.

### Chores
- **Project Structure Cleanup & Organization**: Cleaned up and organized the whole project structure. Ensured that leftover/test files in the root were either deleted or moved to proper directories, and established a clear folder structure for everything to prevent random files accumulating in the root.

## [1.0.35] - 2026-05-17
### Features & Bug Fixes
- **Intelligent Recipe Repair Suite**: Finalized the "Auto-Repair" workbench for the Recipe Integrity Manager. Implemented a seamless global "Fix All" bulk-repair command to easily reconcile orphaned component keys. Optimized the UI for improved responsiveness with precise Red-to-Green visual feedback during recipe association corrections, and stabilized all staging and commitment workflows.

## [1.0.34] - 2026-05-16
### Features & Refactors
- **Implement Sitewide Supabase Websockets**: Expanded real-time synchronization globally across the entire application. Wired up `supabaseClient.channel` to listen to all core tables for `postgres_changes`. Updated local DB caches in real-time and injected UI redraws. Handled project-level section logic across personal task views.

## [1.0.33] - 2026-05-16
### Features & Refactors
- **Personalized Task Sections & Drag-and-Drop Re-parenting**: Make task sections unique per user in personal views (Inbox, My Tasks, In Progress, Completed) while keeping them uniform in organization-wide projects. Unassigned tasks (with proper section/project context) must remain visible in the Inbox. Assigned tasks and completed assigned tasks must be visible in My Tasks. Enable creating tasks under a "non assigned" section, and allow drag-and-drop to reorder tasks across sections or dynamically re-parent tasks as subtasks.

## [1.0.32] - 2026-05-16
### Bug Fixes
- **UI State Refresh Prevention**: Fixed the bug where creating a new item in EDITZ caused a full page refresh and redirected to the Stockpilez hub. Prevented default form submission behaviors across the application to ensure the user stays on the current page during manual CRUD operations.

### Features & Refactors
- **EDITZ Bulk Edit Modal**: Created a "Bulk Edit" button in the EDITZ tab that opens a fullscreen modal, letting the user search and mass edit all items. It functions like the sandbox staging environments for imports in NEXUZ, allowing the user to view and verify all changes before committing and approving the final upload.
- **Global Column Truncation Standard**: Ensured all columns in data grids properly truncate with ellipsis (...) when resized too small, preventing text from overlapping adjacent columns. Documented this as a global UI standard in the Master Reference and applied across all pages.
- **Asana-style Inline Task Creation**: Refactored the Task Engine UI to support creating tasks and sections directly inline via rapid-entry rows, similar to Asana, without requiring modals or top-level dropdowns. Also removed auto-assignment logic and added a horizontal resizer to the right side task details flyout.


## [1.0.31] - 2026-05-07
### Features & Refactors
- **Live Staging DB Diff Highlighting**: Implement visual highlighting in the CSV Live Staging Sandbox for fields/totals that differ from existing database records.

## [1.0.30] - 2026-05-07
### Features & Refactors
- **Orderz Mathematical Parity Audit**: Centralized authoritative math into `neogleamz-engine.js` and verified parity across modules via `Math_Validator.js`.
- **Strict Mathematical Unification Mandate**: Eradicated local math engines in `sales-module.js` and `analytics-module.js`.
- **Sandbox UI Transformation Audit**: Refactored the Sandbox UI into a strict 4-Tier matrix mapping literal DB schema columns to their CSV origin headers. Eliminated "ghost value" data stripping bugs to accurately map raw shipping metrics, successfully restoring exact conditional pass logic for complex exchanges.
- **Sandbox UI Typography & Layout Refactor**: Applied a uniform sizing structure to the numbers in the raw database snapshot and CSV row to improve readability, shrank the vertical height of the main header, and applied inline flex formatting with explicit dataset headers.
- **Shopify Webhook Missing Data Integration**: Audited the Edge Function deployment versus local code, deployed the fix to the active Shopify App/Webhook pipeline to capture missing PII hashes and `fulfillment_status`, and established a full backfill mechanism for missing historical data.

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
