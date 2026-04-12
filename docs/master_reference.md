# Neogleamz Master Architecture & Reference

*The Canonical Source of Truth for the Neogleamz ecosystem.*

## 1. Product Philosophies & Anti-Goals
- **Browser-First Architecture**: We prioritize heavy, expansive desktop layouts utilizing pure css-grid and flexbox. We reject compiled Native-Mobile logic in favor of massively scalable Web UX interfaces.
- **Aggressive Edge Processing**: Data normalization and fulfillment triggers should happen on Edge Functions asynchronously so the UI terminal retains absolute responsiveness. 
- **Scope of UI Rules**: The Button Positioning rules below apply EXCLUSIVELY to SOP Editor Modals (e.g. BATCHEZ, LAYERZ, PACKERZ). General website pages should not have their existing positioning structures forcibly modified natively.
- **Deletion of Ghost Modules / Legacy Code**: If you encounter UI components that do not possess functionally mapped JavaScript payloads DO NOT auto-delete. You must alert the user that a ghost element was found and ask for explicit permission to prune it. Keep a logged record of the component before proceeding.

## 2. Global System Invariants

### Global Standardized Button Utility Classes
When adding action buttons across the software, you MUST adhere to the global 6-color functional mapping palette (`.btn-[color]-muted/standard/neon`). 

**Color Semantics:**
1. **🟢 Emerald/Green**: *Positive Commits & Creation*. (e.g. `SAVE MASTER BLUEPRINT`).
2. **🔵 Blue**: *Neutral Tools & Navigation*. (e.g. `BATCHEZ SOP EDITOR`).
3. **🟠 Orange/Brand**: *High-Level Engine Execution*. (e.g. `🚀 INITIATE SYNC`).
4. **🔴 Red**: *Destructive Actions & Overrides*. (e.g. `⚠️ RESET STOCK LEVELS`).
5. **🟣 Purple**: *A.I. Intelligence & Smart Mapping*. (e.g. `✨ AUTO-FILL LEDGER`).
6. **⚪ Slate/Grey**: *Physical Reporting*. (e.g. `🖨️ PRINT SOP`).

**The 3-Intensity Bordered System:**
* **Neon (`.btn-[color]-neon`)**: Highest priority. Solid vibrant background. Use for primary call-to-actions (e.g. `btn-green-neon` for "Save Profile").
* **Standard Ghost (`.btn-[color]`)**: Neutral priority. Translucent background with a corresponding solid outline border (e.g. `.btn-red` for "Delete"). NOTE: `.btn-ghost-[color]` classes (e.g. `.btn-ghost-red`) strictly govern color schemes but omit border mapping. To render properly, they MUST be paired with `.btn-ghost-base` in the HTML class array to draw the physical boundary box.
* **Muted Ghost (`.btn-[color]-muted`)**: Lowest priority. Translucent background with a lighter translucent outline border. Perfect for secondary cancel flows (e.g. `.btn-red-muted` for "Cancel").

### Executive Pane Layout Standards
- Dashboard module panes **MUST** utilize `<div class="pane-header-bar">` and anchor titles inside `<span class="pane-header-title">`.
- **Absolute Title Centering:** Elements must strictly use full geometric centering (`left: 50%; top: 50%; transform: translate(-50%, -50%);`).
- Structural wrappers handling internal core content **MUST NOT** deploy full horizontal boundaries beneath the pane index. The intended look is a borderless, floating content area.
- Do NOT use empty HTML `<div>` elements as visual spacers or layout controls. Responsive padding should be configured centrally via CSS `clamp()` bounds.

### Fulfillz Core Layout & Kanban Normalize
- **The Grid Base:** You MUST use `<div class="bom-layout">` as the foundational wrapper. Sidebars must apply `class="bom-sidebar"`.
- Modifying sidebars with a resizer grip MUST register the sidebar's CSS `id` inside `neogleamz-engine.js` within the `idsToRestore` array.
- Dashboard cards MUST use the `.kpi-row` hierarchy structurally. DO NOT apply arbitrary text-colors to primary metric quantities (use `var(--text-heading)`).
- Kanban active selections must cast a full geometric outline around the object ensuring "deselected" items still maintain their underlying dark shadow depths.


### Dynamic Paper Profiles & Canvas Rendering
- **No Hardcoded Dimensions:** Avoid hardcoded if/else logic for physical paper media. The global pp_settings : paper_profiles mapped to window.activePaperProfiles serves as the absolute source of truth.
- **Dynamic Geometry:** Canvas elements and @page rules must generate geometry dynamically by parsing the dimensional structure stored in the associated profile configuration. 

### SOP Editor Standardization Framework
- All command buttons must be anchored strictly to the **top-right** corner of their respective container or modal header.
- ALL checklist previews MUST utilize the global `parseProductionTelemetryLine` logic to process `# Headers`, `> Subtext`, `[INPUT]`, `[SCAN]`, `[IMG]`, `[BARCODE]`, and `[QR]` tokens.
- A full UI cheatsheet/token legend detailing the definitions of telemetry markdown MUST be embedded above every master interface.
- All SOP split-pane architectures MUST include the `h-resizer` component for dynamic width adjustment.

### Global Modal Patterns & Telemetry Elements
- Checkboxes, Radio toggles, and any adjacent dynamic text must be styled as a singular `flex` line using `flex: 1` rather than absolute widths.
- Modal "Close" buttons must follow a strict "Icon Left, Text Right" layout structure (`<i class="fa-solid fa-times"></i> Close`).

## 3. Persistent Hardware Tokens
- *(Empty: Reserved for future Bluetooth LE hex structures or Zebra TCP sockets)*

## 4. Current DB Schemas & Backup Protocol

### DB Row Level Security Matrix
The system natively deploys 16 tables. RLS explicitly dictates that **Authenticated Users** possess full universal bypass `USING (true) WITH CHECK (true)`, and **Anon Users** are strictly denied across the board WITHOUT exception. The `sop-media` Supabase Storage bucket specifically operates on a strict Zero-Trust policy: all INSERT, DELETE, and SELECT operations require an `authenticated` user token.

### Active Logical Tables (Schema Definitions)

#### `app_settings`
```sql
-- TABLE: app_settings
-- created_at: string
-- setting_key: string
-- setting_value: Json | null
```

#### `full_landed_costs`
```sql
-- TABLE: full_landed_costs
-- actual_chargeable_weight_g: number | null
-- actual_paid: number | null
-- actual_shipping_fee: number | null
-- alibaba_order: string | null
-- corner_protector: number | null
-- coupon_discount: number | null
-- created_at: string | null
-- custom_clearance_fee: number | null
-- di_item_id: string | null
-- discount_code: number | null
-- epe_loose_filling: number | null
-- final_cost_weight: number | null
-- first_tier_cost: number | null
-- fuel_surcharge: number | null
-- id: number
-- insurance: number | null
-- is_3d_print: boolean | null
-- is_filament: boolean | null
-- item_name: string | null
-- lot_multiplier: number | null
-- moister_barrier_bag: number | null
-- neogleamz_name: string | null
-- neogleamz_product: string | null
-- one_percent_discount: number | null
-- operating_cost: number | null
-- order_date: string | null
-- order_no: string | null
-- order_postage: number | null
-- order_total: number | null
-- order_unit_price: number | null
-- packing_video: number | null
-- parcel_no: string | null
-- points_discount: number | null
-- print_grams: number | null
-- print_time_mins: number | null
-- quantity: number | null
-- remote_area_surcharge: number | null
-- second_tier_cost: number | null
-- specification: string | null
-- storage_fee: number | null
-- tax: number | null
-- total_cost_weight: number | null
-- total_dist_weight_g: number | null
-- unit_china_landed_price: number | null
-- unit_ship_weight: number | null
-- unit_weight_g: number | null
```

#### `inventory_consumption`
```sql
-- TABLE: inventory_consumption
-- assembly_consumed_qty: number | null
-- consumed_qty: number | null
-- item_key: string
-- manual_adjustment: number | null
-- min_stock: number | null
-- produced_qty: number | null
-- production_consumed_qty: number | null
-- prototype_consumed_qty: number | null
-- prototype_produced_qty: number | null
-- rop_lead_time_days: number | null
-- scrap_qty: number | null
-- sold_qty: number | null
```

#### `label_designs`
```sql
-- TABLE: label_designs
-- created_at: string
-- emoji: string | null
-- file_name: string | null
-- file_url: string | null
-- id: string
-- label_size: string | null
-- layout_json: Json | null
-- product_name: string
-- updated_at: string
```

#### `pack_ship_sops` & `production_sops`
```sql
-- TABLE: pack_ship_sops
-- created_at: string | null
-- id: string
-- instruction_json: Json
-- internal_recipe_name: string
-- required_box_sku: string | null
-- updated_at: string | null
-- TABLE: production_sops
-- created_at: string
-- product_name: string
-- steps: Json | null
```

#### `print_queue`
```sql
-- TABLE: print_queue
-- completed_at: string | null
-- created_at: string | null
-- id: string
-- label: string | null
-- part_name: string
-- qty: number
-- started_at: string | null
-- status: string
-- wo_id: string | null
```

#### `product_recipes`
```sql
-- TABLE: product_recipes
-- affiliate_pct: number | null
-- components: Json | null
-- created_at: string | null
-- filament_item_key: string | null
-- is_3d_print: boolean | null
-- is_label: boolean | null
-- is_subassembly: boolean | null
-- label_emoji: string | null
-- labor_rate_hr: number | null
-- labor_time_mins: number | null
-- msrp: number | null
-- old_msrp: number | null
-- print_grams: number | null
-- print_time_mins: number | null
-- product_name: string
-- warranty_pct: number | null
-- wholesale_price: number | null
```

#### `raw_orders`, `raw_parcel_items`, `raw_parcel_summary`
```sql
-- TABLE: raw_orders
-- alibaba_order: string | null
-- di_item_id: string
-- item_name: string | null
-- order_date: string | null
-- order_no: string | null
-- order_total: number | null
-- postage: number | null
-- quantity: number | null
-- specification: string | null
-- unit_china_landed_price: number | null
-- unit_price: number | null
-- TABLE: raw_parcel_items
-- di_item_id: string | null
-- id: number
-- item_name: string | null
-- parcel_no: string | null
-- quantity: number | null
-- specification: string | null
-- total_dist_weight_g: number | null
-- unit_weight_g: number | null
-- TABLE: raw_parcel_summary
-- actual_chargeable_weight_g: number | null
-- actual_paid: number | null
-- actual_shipping_fee: number | null
-- corner_protector: number | null
-- coupon_discount: number | null
-- custom_clearance_fee: number | null
-- discount_code: number | null
-- epe_loose_filling: number | null
-- first_tier_cost: number | null
-- fuel_surcharge: number | null
-- insurance: number | null
-- moister_barrier_bag: number | null
-- one_percent_discount: number | null
-- operating_cost: number | null
-- packing_video: number | null
-- parcel_no: string
-- points_discount: number | null
-- remote_area_surcharge: number | null
-- second_tier_cost: number | null
-- storage_fee: number | null
-- tax: number | null
```

#### `sales_ledger`
```sql
-- TABLE: sales_ledger
-- actual_sale_price: number | null
-- assembly_completed_at: string | null
-- cogs_at_sale: number | null
-- created_at: string
-- currency: string | null
-- customer_email_hash: string | null
-- customer_phone_hash: string | null
-- discount: number | null
-- discount_amount: number | null
-- discount_code: string | null
-- exchange_value: number | null
-- financial_status: string | null
-- fulfillment_status: string | null
-- id: string
-- internal_fulfillment_status: string | null
-- internal_recipe_name: string | null
-- isFirstRow: boolean | null
-- lineitem_compare_at_price: number | null
-- lineitem_fulfillment_status: string | null
-- linked_order_id: string | null
-- net_profit: number | null
-- order_id: string
-- "Outstanding Balance": number | null
-- payment_method: string | null
-- qa_cleared_at: string | null
-- qty_sold: number | null
-- refunded_amount: number | null
-- risk_level: string | null
-- sale_date: string | null
-- shipping: number | null
-- shipping_address_hash: string | null
-- shipping_city: string | null
-- shipping_country: string | null
-- shipping_method: string | null
-- shipping_name_hash: string | null
-- shipping_province: string | null
-- shipping_zip: string | null
-- Source: string | null
-- storefront_sku: string | null
-- subtotal: number | null
-- tags: string | null
-- taxes: number | null
-- total: number | null
-- transaction_fees: number | null
-- transaction_type: string | null
```

#### `socialz_audience`
```sql
-- TABLE: socialz_audience
-- collab_status: string | null
-- collab_tier: string | null
-- contact_info: string | null
-- created_at: string
-- followers_fb: number | null
-- followers_ig: number | null
-- followers_tt: number | null
-- followers_yt: number | null
-- handle_fb: string | null
-- handle_ig: string | null
-- handle_tt: string | null
-- handle_yt: string | null
-- id: string
-- is_favorite: boolean | null
-- link_fb: string | null
-- link_ig: string | null
-- link_tt: string | null
-- link_yt: string | null
-- location: string | null
-- name: string
-- raw_followers: number | null
-- region: string | null
-- skater_type: string | null
-- style: string | null
-- summary: string | null
-- updated_at: string
-- viral_url: string | null
```

#### `storefront_aliases` & `tipz`
```sql
-- TABLE: storefront_aliases
-- created_at: string
-- internal_recipe_name: string | null
-- platform: string | null
-- storefront_sku: string
-- TABLE: tipz
-- created_at: string
-- id: number
-- priority: string | null
-- status: string | null
-- suggestion: string
-- user_email: string | null
```

#### `work_orders`
```sql
-- TABLE: work_orders
-- completed_at: string | null
-- created_at: string
-- label: string | null
-- product_name: string | null
-- qty: number | null
-- routing: Json | null
-- started_at: string | null
-- status: string | null
-- wip_state: Json | null
-- wo_id: string
```

### Supabase Backup & Disaster Recovery Protocol
1. **Automated Point-in-Time Recovery (PITR)**
 Supabase inherently takes daily physical database backups. To Restore: Log in to the Supabase Dashboard -> Navigate to Neogleamz Project -> Database -> Backups -> Click Restore on the most recent known healthy state.
2. **Hard Data Exports (The local safety net)**
 Perform a monthly manual logical extraction: Open Supabase Table Editor -> Select core ledgers (`product_recipes`, `sales_ledger`, `inventory_consumption`) -> Click Export to CSV -> Store natively on `OneDrive - Neogleamz`.
3. **High-Concurrency Racing Check**
 Strict distributed locks (`SELECT FOR UPDATE`) are unnecessary overhead. If a partial network drop occurs in a multi-batch call, local `.catch()` hooks will log the structural failure allowing safe manual UI repair.

## 5. AI Automation Best Practices
- **Priority Native Inline Editors:** Always prioritize utilizing native workspace file editing tools over routing operations through external terminals to eliminate subprocess ping times.
- **Temporary Scripts for Dom Parsing:** When making extensive cross-file DOM manipulations, the AI may write temporary executable `.py` scripts locally, run them, and then **IMMEDIATELY DELETE** them. Use python triple-quotes for impurity.
- **PowerShell Precautions:** Do not attempt complex string-based lookup in terminals if HTML contains nested quotes. Use the built-in search tools to isolate lines securely.


## 6. Page-by-Page Element Mechanics

### NEXUZ (Hub Landing)
**1. The Trinity Cards**:
- The main entry point to the NEXUZ executive console displaying three high-level navigation cards (`IMPORTZ`, `SALEZ`, `BRAINZ`).
- Displays live, real-time KPI grids (`statImpzSyncs`, `statSalzMap`, `statBrnzSync`, etc.) aggregated from across the system for top-level health monitoring.

### IMPORTZ
**1. Orderz & Parcelz Sync (The HTML Parsers):**
- Unlike standard systems that rely on APIs, this engine acts as an aggressive web-scraper running entirely within the local browser. It is designed to ingest raw, downloaded `.html` pages natively from overseas freight-forwarders (e.g., Superbuy).
- **The Execution:** The user feeds multiple raw `.html` files into the importer. The engine uses the native browser `DOMParser()` to invisibly construct a virtual DOM tree in RAM. 
- **The RegEx Dictionary:** Because vendor HTML interfaces constantly change, the engine does not rely on strict CSS classes to target data. Instead, it processes the raw `innerText` blocks sequentially using the highly customizable `PARSER_RULES` and `PARCEL_RULES` Regular Expression dictionaries to extract mathematical realities (Unit Cost, Make Up Fees, Actual Paid, Chargeable Weight).
- **Orderz Distributed Math:** For outbound supply chain orders, the engine explicitly hunts for "Make Up" fees and "Hidden Surcharges" embedded dynamically in the HTML and mathematically distributes those fees proportionally across the specific line items `[ (hiddenFee / totalQty) ]` to ensure flawless COGS parity.

**2. Test Mode (Sandbox):**
- As with SALEZ, the user has the explicit option to upload HTML packets directly into **Test Mode**. The engine will execute the full DOM extraction and math spread, but bypass the Supabase cloud connection entirely, rendering the final data structures as a visual table matrix in the sandbox modal for integrity verification.

**3. Engine Trace (The Diagnostics Box):**
- Because RegEx extraction is highly volatile against external code changes, the module includes a live **Engine Trace** readout below the importer. 
- During extraction, the engine actively strips away all `tr/td/div` HTML nodes, leaving a purified line-by-line plaintext summary of what the `DOMParser` actually saw. This provides the user with an exact diagnostic window to adjust their custom RegEx patterns without leaving the application.

### SALEZ
**1. The CSV Importer Mechanics:**
- Parses raw Shopify Order CSV exports directly in the browser via `XLSX.js`. 
- **First-Row Optimization:** Since Shopify CSVs duplicate shipping, tax, and order-level totals across every single line-item row, the engine creates an `orderFirstRowFlags` dictionary to extract the financial footprint ONLY on the first appearance of the order. This ensures accurate relational totals without inflations.
- **PII Securization Barrier:** Before finalizing the payload, the importer passes the `Email`, `Phone`, `Name`, and `Shipping Address` columns through a local SHA-256 `hashPII` function. The original plaintext data is permanently uncoupled; only the hashes hit the database.
- **Pre-Flight Sandbox Matrix:** The importer does NOT insert blindly. It generates the `pendingSalesRows` mapping and automatically fires the `Sandbox Modal`. This gives the user a visual terminal matrix to inspect the exact structure, test for formatting failures, and view duplicates before explicitly authorizing the Cloud Database push.

**2. SKU Alias Manager:**
- During ingestion, the engine cross-references the raw CSV `Lineitem name` against the master internal `productsDB`.
- If the name doesn't match an exact recipe, it checks the `storefront_aliases` database matrix.
- If it's an entirely new/unmapped product name from an external platform (like Etsy or a renamed Shopify variant), the system intercepts the sync and surfaces the **Alias Manager Modal**. It forces the user to manually map the foreign `storefront_sku` to an internal `internal_recipe_name`.
- Once saved, this mapping is permanently written to the database, ensuring the system intelligently "learns" the translation for all future imports.

**3. Sales Ledger Mechanics (Data Parsers):**
- **Ghost Revenue Immunity (Cancelled/Void Protocol):** 
In multi-item Shopify orders, if an item goes unfulfilled (pending), the engine natively declares it Cancelled (Void). To prevent double-penalizing the order's total Net Profit when parsing Shopify's global Refunded Amount column, the engine uses `voidedRevenueByOrder` to aggressively subtract the ghosted item's price out of the global refund penalty before it touches the primary fulfilled item.

- **Pre-Ship Exchange (Unshipped / Ghost Transfer):**
When a customer swaps an item before the box is ever packed, the engine shifts the original item's monetary payload (Net Revenue, Stripe Fees, Shipping, Discounts) directly to the **Exchange Replacement** item. The original item is completely zeroed out (COGS=0, Net=0), preventing double-revenue tracking and phantom COGS loss, since the old item never actually left the warehouse.

- **Post-Ship Exchange (Physical Reality Decoupling):**
When a customer returns an item after delivery to swap it, the engine shifts the original Customer Payment Revenue to the new **Exchange Replacement** item so gross sales aren't inflated. However, the original item is left isolated in the ledger as a **pure loss string**—it correctly eats the original outbound Shipping Cost and the Stripe Fee as sunk costs. COGS is zeroed out under the assumption the returned item is restocked.

- **Warranty Replacements:**
Flags the line item as a zero-revenue event that strictly incurs COGS and Shipping costs. It explicitly increments the `burdenUnits` tracking metric to evaluate hardware failure rates against total units shipped.

**5. IGNORE Token**:
Prevents the line item from incrementing the `totals.units` sold metric. Used for digital tips, shipping protection, or non-physical tokens that Shopify forces into the line-item CSV logic.

### BRAINZ
**1. Backup & Restore (Data Vault):**
- **Export Backup:** Triggers a native system operation to compile authoritative snapshots of the cloud database ledgers into a secure, downloadable `.xlsx` physical archive.
- **Restore Cloud:** Accepts `.xlsx` vault snapshots, providing a visual checklist of which tables to overwrite, and restores the live cloud database to a previous state in the event of corruption.

**2. Force Recalculation:**
- Manually triggers a complete mathematical reconciliation of all ledger balances. 
- It sequentially pulls down the entire live database (Operations Ledger, Materials Ledger, etc.), processes every record through the local Master Engine, and verifies alignment. Used to instantly correct mathematical drift or refresh local caching without dangerous overwrites.

### STOCKPILEZ (Hub Landing)
**1. The Trinity Cards**:
- The main entry point to the STOCKPILEZ inventory console, featuring `DATAZ`, `EDITZ`, and `STOCKZ`.
- Displays live, real-time KPI grids tracking logged parcel weights (`statDatazWt`), active components (`statEditzComps`), and raw/FGI valuations (`statStockzFgiVal`).

### DATAZ
**1. Operations Ledger Terminal:**
- Contains the central `results` logic wrapper mapping the absolute truth of all inbound stock events, material shipments, and manual additions.

### EDITZ
**1. Manual Entry Matrix:**
- Provides a high-speed CRUD interface for injecting specific "Neo Productz" and raw inventory events without requiring an overarching HTML parcel payload.
- **Auto-Fill Ledger:** Automatically extrapolates existing product profiles based on nomenclature input, dynamically fetching prior multiplier metrics and per-unit costs.
- Integrates dynamic column toggles (`colToggleContainer`) to customize view density.

### STOCKZ
**1. The Core Engines:**
- Features a highly functional split-pane architecture (`stockz-split-container`) simultaneously projecting **Finished Goods Inventory (FGI)** alongside **Raw Component Inventory**. 
- Uses an immediate DOM-based resizer (`stockz-h-resizer`) so users can scale partitioned views.
- **Cycle Counts:** Hooks directly into `openCycleCountManager()` for rigorous physical auditing and syncs adjustments.
- **Velocityz:** Loads the forecasting module (`openVelocityzModal()`) to predict run-out timelines based on historical ingestion and depletion velocity.

### MAKERZ (Hub Landing)
**1. The Trinity Cards**:
- The entryway to the Production console, defining `RECIPEZ`, `BATCHEZ`, and `LAYERZ`.
- Surfaces KPIs on global average margin, active assembly batches, and 3D print scrap rates.

### RECIPEZ
**1. Bill of Materials (BOM) & Labor Engine:**
- Permits the explicit definition of internal manufacturing recipes by linking raw `DATAZ` stockpile items to a final FGI target.
- **Categorization Toggles:** Flags items as `Sub-Assembly`, `3D Print`, or `Label` to dictate how routing logic behaves downstream.
- **Micro-Economics:** Dynamically calculates total BOM cost using live exact averages from the inventory ledger, then applies `Labor Time` and `Shop Rate` to output true production costs and auto-calculate margin against MSRP/Wholesale values.

### BATCHEZ
**1. Active Manufacturing Pipeline:**
- **Work Orders:** Sequences physical assembly into 4 discrete pipeline stages: `Queued`, `Picking Parts`, `In Production`, and `Completed`.
- **The Pick List:** In the "Picking" stage, operators can print a consolidated Pick List guiding them precisely on what components to pull from physical bins based on target yield.
- **Scrap & Completion:** Tracks manufacturing defects (`Scrap Tally`) during the Production phase. "Completion" explicitly triggers the database logic to universally deduct the consumed raw materials and inject the final quantity into the FGI ledger.

### LAYERZ
**1. 3D Print Farm Director:**
- Dedicated pipeline to isolate the physical machine runtime layer from physical human assembly `BATCHEZ`.
- Follows a 4-stage pipeline: `Queued`, `Start Print Job`, `Mark as Cleaned`, and `Completed`.
- Completing a print job correctly deducts raw filament/resin (`DATAZ`) and yields finished printed sub-assemblies for the parent BOM structure.

### FULFILLZ (Hub Landing)
**1. The Trinity Cards**:
- The logistical nerve center, surfacing `PACKERZ`, `BARCODZ`, and `LABELZ`.
- Tracks KPIs related to unfulfilled queue depth, scanner tether connections, and thermal API health.

### PACKERZ
**1. Quality Assurance Kanban:**
- **Pipeline Architecture:** Utilizes a rigid left-to-right flow (`AWAITING ASSEMBLY` → `IN PROGRESS`) to prevent fulfillment collision when multiple users are picking.
- **SOP Administrator:** Features a robust Blueprint Editor (`paneFulfillzSopAdmin`) to construct strict packing guidelines. When an order lands in `IN PROGRESS`, operators are subjected to the mapped SOP, forcing them to physically verify included components before moving to completion.
- **Completed Orders Archive:** A read-only historical ledger bridging closed Fulfillz events back to the parent Sales metrics.

### BARCODZ
**1. Global Catalog Spooler:**
- Maps the total inventory product directory and generates live barcode equivalents natively in the browser via `bwip-js`.
- **Symbology Matrix:** Supports switching output formats dynamically between `CODE128` (Universal 1D), `QR` (2D Square Camera-ready), and `CODE39` (Alphanumeric 1D) without round-tripping to a server.
- **Batch Print Spooler:** Users can click multiple items to load them into the `barcodzSpoolList` sidebar, configure the target thermal paper size, and trigger one massive concatenated payload (`executeBatchPrint()`).

### LABELZ
**1. Thermal Design Engine:**
- Replaces external subscription software (e.g., Rollo/Dymo designers) with a built-in vector layout tool (`labelzDesignerModal`).
- Includes a dedicated serialization GUI to mix text, barcodes, and emojis (`labelzDesignerEmojiPicker`).
- Generated label definitions are saved securely and can be pooled into the global Print Spooler just like `BARCODZ` for unified thermal execution.

### REVENUEZ (Hub Landing)
**1. The Trinity Cards:**
- The final financial nexus displaying `ORDERZ`, `STATZ`, and `SIMULATORZ`.

### ORDERZ
**1. Sales Ledger Terminal:**
- Displays the chronological passive review of all finalized outbound e-commerce sales successfully parsed by the `SALEZ` importer.

### STATZ
**1. Visual Analytics Engine:**
- Aggregates top-level financial metrics (`Gross Revenue`, `Pure Net Margin`) derived by deducting the Exact Raw Component values against the incoming CSV order cash flow.
- Maps interactive `Chart.js` components charting Revenue vs. Profit Trends, Profit Waterfall logic, and Expense Distribution.

### SIMULATORZ (A.I. CFO Executive Terminal)
**1. Global Master Levers:**
- Features dynamic range logic sliders (e.g., `Blended CAC`, `Global Affiliate`, `Warranty Return Rate`) to stress-test the margin structure globally.
- Instantly re-runs the entire `productsDB` against the simulated parameters vs real-world current numbers to output "Test Scenario Net Profit" and "Margin Squeeze" analytics.
- **Cohort Intelligence:** Tracks `Repeat Customer Rate` and calculates `Average Lifetime Value (LTV)` by mining the previously secured SHA-256 PII hashes, enabling highly accurate customer acquisition cost thresholds.

### SOCIALZ
**1. Audience Profile Ledger:**
- The CRM database for mapping Skater personas across multiple regions, skate-styles, and platforms (TikTok, IG, YouTube).
- Includes dynamic grid generation (`skater-grid`) supporting dual-view layouts (Card vs List), complex multi-select filtering logic (Style tag mapping), and live-sorting functionality.
- Direct CSV ingestion allows rapid bulk roster scaling.

