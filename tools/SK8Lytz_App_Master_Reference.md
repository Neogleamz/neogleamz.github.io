# 📘 SK8Lytz App Master Reference

This is the Canonical Source of Truth. This document must be consulted before making architectural assumptions or database modifications.

---

## 🏛️ 1. Project Architecture (Vanilla JS)
* **Zero-Build Stack:** This application is entirely built on Vanilla HTML, CSS, and JS. There is NO Node.js build step, NO Webpack, and NO TypeScript.
* **Component Location:** There is no `src/` directory. All core JavaScript modules live directly in the Root Directory.
  * e.g., `inventory-module.js`, `ceo-module.js`, `production-module.js`, `sales-module.js`, etc.

---

## 🎨 2. UI / Styling Definitions
The CSS system is hardcoded into the massive `index.html` style block using native CSS Variables.

**Button Matrix (3-Intensity Hue System)**
Always use the standardized CSS classes for buttons. Available colors are `emerald`, `blue`, `red`, `brand` (orange), `purple`, `amber`, and `slate`.
* **Tier 1 (Muted)**: Dimmer, low priority actions (e.g. Cancel). Class: `.btn-orange-muted`
* **Tier 2 (Ghost/Standard)**: The sleek glassy default. Class: `.btn-orange` or `.btn-ghost-orange`
* **Tier 3 (Neon)**: High-stakes / Macro executions. Contains custom box shadows. Class: `.btn-orange-neon`

**Pane/Panel Structure**
* Executive Panes have header bars styled with `.pane-header-bar` and titles `.pane-header-title`.
* **Absolute Title Centering:** To prevent horizontal and vertical baseline jumping between modules with varying command buttons, `.pane-header-title` elements must strictly use full geometric centering (`left: 50%; top: 50%; transform: translate(-50%, -50%);`).
* **Strict Spatial Economy:** Do NOT use empty HTML `<div>` elements as visual spacers or layout controls. Unused blocks must be `display: none;`.
* Resizers are designated with `.v-resizer` and `.h-resizer` with custom indicator accents (e.g., teal `#2dd4bf` drag points and `⋮` indicator).

**SOP Editor Standardization (Batchez, Layerz, Packerz)**
* **Button Positioning:** All command buttons (e.g., "Print SOP", "SAVE MASTER BLUEPRINT") must be anchored strictly to the **top-right** corner of their respective container or modal header. Left side reserved for titles.
* **Form & Telemetry Syntax:** ALL checklist previews MUST utilize the global macro tokens to read instructions: `# Headers`, `> Subtext`, `[INPUT]`, `[SCAN]`, `[IMG]`, `[BARCODE]`, and `[QR]`.

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
