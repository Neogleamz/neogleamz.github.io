# 🦅 Neogleamz Master Bucket List

This document acts as the permanent, living task tracker integrated directly with your autonomous AI development agents. 

> [!NOTE]
> **Archiving Protocol:** When all items in an Epic are marked `[x]`, the entire block is moved to the **🗄️ Completed & Archived Epics** section at the bottom of this file. This provides a clean active workspace while preserving a permanent historical record of our accomplishments!

> [!IMPORTANT]
> **Prioritization Protocol:** The AI executes tasks top-to-bottom. 
> * **🟢 Phase 1 (Foundation):** Highest priority. Core math, data integrity, and physical realities (e.g. Inventory limits). Without this, the business breaks.
> * **🟡 Phase 2 (Logistics):** Medium priority. Automating repetitive labor, API syncs, and shipping automation.
> * **🔴 Phase 3 (The CFO):** Low priority / High impact. Data aggregation, historical analysis, and long-term planning (e.g. Lifetime Value).
> * **🟣 Sandbox:** Brainstorming queue. Future ideas not yet greenlit for active development.

---

## 🟢 Phase 1: Precision & Foundation

*(All current Phase 1 Epics have been completed and archived.)*

---

## 🟡 Phase 2: Logistics & Tracking

### Target: `epic/shopify-sync-v2`
- [x] `feat/auth-app-security` : Auth & App Security
- [x] `feat/orders-create-hook` : `orders/create` Inbound Edge Function
- [x] `feat/payload-normalization` : Payload Normalization
- [x] `feat/idempotent-db-insert` : Idempotent Database Insert
- [ ] `feat/reverse-fulfillment-push` : Build an outbound API hook triggered directly from `NEXUZ`. When a packer clicks "Mark as Fulfilled", fire a specialized Edge Function that runs a `POST` back to Shopify.
- [ ] `feat/bi-directional-bom` : Bi-directional Hardware Deduction. Ensure successful order inset triggers STOCKZ BOM logic instantly.
- [ ] `feat/shippo-dimensional-weight` : Dimensional Weight (DIM) Shipping Router logic to compare USPS Ground vs UPS Priority based on `(L*W*H) / DIM Divisor`.


### Target: `epic/socialz-yield-api`
- [ ] `feat/social-scraping-api` : Connect a low-cost social scraping API (like PhantomBuster or Apify).
- [ ] `feat/auto-pull-engagement` : Auto-pull likes/comments on their last 10 posts.
- [ ] `feat/engagement-vanity-score` : Display an "Engagement vs. Vanity" metric score on the skater cards.

---

## 🔴 Phase 3: The A.I. CFO

### Target: `epic/ltv-cac-metrics`
- [x] `feat/historical-ltv-analysis` : Pull historical Shopify orders to find out how many people buy twice.
- [ ] `feat/cac-adspend-comparison` : Compare total ad spend (Meta/TT) to new customers acquired.

---

## 🟣 Expansion Sandbox (Brainstorming)

### Target: `epic/webrtc-barcode-app`
- [ ] `feat/webrtc-cycle-counts` : A scanner using your iPhone camera connected natively to STOCKZ to do warehouse cycle counts rapidly.

### Target: `epic/socialz-kanban`
- [ ] `feat/socialz-outreach-kanban` : Outreach Kanban Pipeline for SOCIALZ: Moving skaters through columns matching your negotiation states (Discovered → DM'd → Contract Sent → Sponsored).

### Target: `epic/automated-shippo-printing`
- [ ] `feat/shippo-auto-print` : Automated Label Printing: Direct Shippo/EasyPost API integration so clicking "Fulfilled" automatically prints a PDF layout to an attached Zebra thermal printer.

---

## 🗄️ Completed & Archived Epics

### Target: `epic/stockz-rop-alerts`
- [x] `feat/inventory-velocity` : In `inventory-module.js`, calculate daily velocity of filament usage.
- [x] `feat/supplier-lead-time` : Hardcode a "Supplier Lead Time" (e.g., 5 days for Amazon Prime).
- [x] `feat/rop-warning-banner` : Build a red warning banner that flashes when stock hits `(Velocity * Lead Time) + 10% Safety`.

### Target: `epic/stockz-velocity-dashboard`
- [x] `feat/velocityz-button` : Create a "Velocityz" button next to the Low Stockz Report.
- [x] `feat/velocity-forecasting-modal` : Build a forecasting modal that visualizes mathematical reorder constraints based on current raw sales velocity.
- [x] `feat/velocity-filters` : Add filters to slice and analyze velocity by day, week, and month.
- [x] `feat/sandbox-manipulation` : Enable "sandbox" manipulation where users can overwrite sold amounts to forecast hypothetical demand spikes, while strictly retaining the raw real sold velocity data unharmed.

### Target: `epic/cfo-waterfall`
- [x] `feat/cfo-waterfall-chart` : In `ceo-module.js` (Chart.js block), build a Waterfall Chart.
- [x] `feat/cfo-waterfall-mapping` : Map Gross Sales → minus COGS → minus Gateway Fees (Shopify takes 2.9% + 30c) → minus Shipping Costs → minus Social Ads.

### Target: `epic/agentic-skills-evaluation`
- [x] `chore/audit-to-skills` : Go back through all .md files and decide if any need to be migrated to `.agents/skills/`.
- [x] `feat/frontend-skills` : Investigate and create new .md skill files specifically tailored to a desktop-first browser-based HTML/JS application environment.

### Target: `epic/system-dependency-audit`
- [x] `chore/parse-dependencies` : Scan all 41 rule/workflow/skill `.md` files for references to uncreated files or folders (e.g., Cross-Reference TXTs, Master References).
- [x] `feat/bootstrap-missing-files` : Create the missing dependencies with as much actual payload data as expected (DB schemas, button UI tokens, etc.) to securely strap the agent to the current app state.

### Target: `epic/legacy-data-migration`
- [x] `chore/git-history-scan` : Search git history to recover contents of `ui_dev_stds.md` and `roadmap.md`.
- [x] `feat/legacy-data-integration` : Integrate recovered UI tokens into `tools/SK8Lytz_App_Master_Reference.md` and migrate roadmap ideas into `tools/SK8Lytz_Bucket_List.md`.

### Target: `epic/redundant-tools-cleanup`
- [x] `chore/audit-agents-tools` : Inspect `.agents/tools/` for outdated duplicates.
- [x] `feat/consolidate-tools` : Compare files with root `tools/` directory to resolve data divergence, delete the redundant folder, and update pointers.
