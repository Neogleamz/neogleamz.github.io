# 🦅 Neogleamz Master Bucket List

This document acts as the permanent, living task tracker integrated directly with your autonomous AI development agents. 

> [!NOTE]
> **Archiving Protocol:** When all items in an Epic are marked `[x]`, the entire block is moved to the **🗄️ Completed & Archived Epics** section at the bottom of this file. This provides a clean active workspace while preserving a permanent historical record of our accomplishments!

> [!IMPORTANT]
> **Prioritization Protocol:** The AI executes tasks strictly top-to-bottom to guarantee stability.
> * **🔴 P0 Critical:** System blockers, hotfixes, data corruption risks. Drop everything to fix.
> * **🟠 P1 High Priority:** Core application features, necessary infrastructure, and major business logic. 
> * **🟡 P2 Medium Priority:** UI enhancements, workflow automations, and quality-of-life updates.
> * **🟢 P3 Backlog:** Approved ideas and long-term targets pending active development.

---

## 🔴 P0 Critical (Blockers & Hotfixes)
*(No active blockers).*

---

## 🟠 P1 High Priority (Core Features)

### Target: `main`
*(Epic: WebRTC Scanner Integration)*
- [ ] `feat/webrtc-cycle-counts` : A scanner using your iPhone camera connected natively to STOCKZ to do warehouse cycle counts rapidly.

---

## 🟡 P2 Medium Priority (Enhancements)

### Target: `main`
*(Epic: Automated Shippo Printing)*
- [ ] `feat/shippo-auto-print` : Automated Label Printing: Direct Shippo/EasyPost API integration so clicking "Fulfilled" automatically prints a PDF layout to an attached Zebra thermal printer.

### Target: `main`
*(Epic: Socialz Outreach Kanban)*
- [ ] `feat/socialz-outreach-kanban` : Outreach Kanban Pipeline for SOCIALZ: Moving skaters through columns matching your negotiation states (Discovered → DM'd → Contract Sent → Sponsored).

---

## 🟢 P3 Backlog (Ideas & Sandbox)
*(No active backlog items).*

---

## 🗄️ Completed & Archived Epics

### Target: `epic/ltv-cac-metrics`
- [x] `feat/historical-ltv-analysis` : Pull historical Shopify orders to find out how many people buy twice.
- [x] `feat/repeat-customer-engine` : Implement backend logic to digest the historical Shopify dataset and track repeat customers using anonymized metrics.
- [x] `feat/ltv-metrics-modal` : Design and build a new UI modal (or integrate into the CEO Terminal) to visualize Repeat Customer Rates and Lifetime Value insights.

### Target: `epic/shopify-sync-v2`
- [x] `feat/auth-app-security` : Auth & App Security
- [x] `feat/orders-create-hook` : `orders/create` Inbound Edge Function
- [x] `feat/payload-normalization` : Payload Normalization
- [x] `feat/idempotent-db-insert` : Idempotent Database Insert

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
