# 🦅 Neogleamz Master Bucket List

This document acts as the permanent, living task tracker integrated directly with your autonomous AI development agents. 

---

## 🟢 Phase 1: Precision & Foundation

### Target: `epic/stockz-rop-alerts`
- [x] `feat/inventory-velocity` : In `inventory-module.js`, calculate daily velocity of filament usage.
- [x] `feat/supplier-lead-time` : Hardcode a "Supplier Lead Time" (e.g., 5 days for Amazon Prime).
- [x] `feat/rop-warning-banner` : Build a red warning banner that flashes when stock hits `(Velocity * Lead Time) + 10% Safety`.

### Target: `epic/stockz-velocity-dashboard`
- [x] `feat/velocityz-button` : Create a "Velocityz" button next to the Low Stockz Report.
- [x] `feat/velocity-forecasting-modal` : Build a forecasting modal that visualizes mathematical reorder constraints based on current raw sales velocity.
- [x] `feat/velocity-filters` : Add filters to slice and analyze velocity by day, week, and month.
- [x] `feat/sandbox-manipulation` : Enable "sandbox" manipulation where users can overwrite sold amounts to forecast hypothetical demand spikes, while strictly retaining the raw real sold velocity data unharmed.

---

## 🟡 Phase 2: Logistics & Tracking

### Target: `epic/shopify-sync-v2`
- [x] `feat/auth-app-security` : Auth & App Security
- [x] `feat/orders-create-hook` : `orders/create` Inbound Edge Function
- [x] `feat/payload-normalization` : Payload Normalization
- [x] `feat/idempotent-db-insert` : Idempotent Database Insert


### Target: `epic/socialz-yield-api`
- [ ] `feat/social-scraping-api` : Connect a low-cost social scraping API (like PhantomBuster or Apify).
- [ ] `feat/auto-pull-engagement` : Auto-pull likes/comments on their last 10 posts.
- [ ] `feat/engagement-vanity-score` : Display an "Engagement vs. Vanity" metric score on the skater cards.

---

## 🔴 Phase 3: The A.I. CFO

### Target: `epic/cfo-waterfall`
- [ ] `feat/cfo-waterfall-chart` : In `ceo-module.js` (Chart.js block), build a Waterfall Chart.
- [ ] `feat/cfo-waterfall-mapping` : Map Gross Sales → minus COGS → minus Gateway Fees (Shopify takes 2.9% + 30c) → minus Shipping Costs → minus Social Ads.

### Target: `epic/ltv-cac-metrics`
- [ ] `feat/historical-ltv-analysis` : Pull historical Shopify orders to find out how many people buy twice.
- [ ] `feat/cac-adspend-comparison` : Compare total ad spend (Meta/TT) to new customers acquired.

---

## 🟣 Expansion Sandbox (Brainstorming)

### Target: `epic/webrtc-barcode-app`
- [ ] `feat/webrtc-cycle-counts` : A scanner using your iPhone camera connected natively to STOCKZ to do warehouse cycle counts rapidly.

### Target: `epic/socialz-kanban`
- [ ] `feat/socialz-outreach-kanban` : Outreach Kanban Pipeline for SOCIALZ: Moving skaters through columns matching your negotiation states (Discovered → DM'd → Contract Sent → Sponsored).

### Target: `epic/automated-shippo-printing`
- [ ] `feat/shippo-auto-print` : Automated Label Printing: Direct Shippo/EasyPost API integration so clicking "Fulfilled" automatically prints a PDF layout to an attached Zebra thermal printer.
