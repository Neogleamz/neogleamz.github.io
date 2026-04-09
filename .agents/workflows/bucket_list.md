# 🦅 Neogleamz Master Bucket List

This document acts as the permanent, living task tracker integrated directly with your autonomous AI development agents. 

---

## 🟢 Phase 1: Precision & Foundation
*Goal: Ensure baseline data is 100% accurate and prevent hidden margin bleed.*

### Target: `feature-stockz-rop-alerts`
*STOCKZ (Inventory Management): Dynamic Reorder Points (ROP) & Safety Stock Alerts*
*Why:* Running out of filament halts production. Over-stocking traps cash flow.
- [ ] In `inventory-module.js`, calculate daily velocity of filament usage.
- [ ] Hardcode a "Supplier Lead Time" (e.g., 5 days for Amazon Prime).
- [ ] Build a red warning banner that flashes when stock hits `(Velocity * Lead Time) + 10% Safety`.

---

## 🟡 Phase 2: Logistics & Tracking
*Goal: Automate human-labor choke points and deeply understand product profitability.*

### Target: `feature-shopify-sync-v2`
*NEXUZ (Fulfillment & Logistics): Direct Shopify API Sync (Replace CSV Imports)*
*Why:* End-of-day manual CSV imports delay production visibility, risk corrupted formatting, and require human labor.
- [ ] **1. Deprecate Front-End File Readers:** Strip out the `SheetJS (XLSX)` parsing functions hitting `NEWORDERS.xlsx` and `ShopifySales.csv` currently sitting inside `sales-module.js` and `system-tools-module.js`.
- [x] **2. Auth & App Security**
- [x] **3. `orders/create` Inbound Edge Function**
- [x] **4. Payload Normalization**
- [x] **5. Idempotent Database Insert**
- [ ] **6. Reverse Fulfillment Push:** Build an outbound API hook triggered directly from `NEXUZ`. When a packer clicks "Mark as Fulfilled", fire a specialized Edge Function that runs a `POST /admin/api/2023-10/orders/{order_id}/fulfillments.json` back to Shopify, passing the tracking number and carrier name so Shopify emails the customer automatically.
- [ ] **7. Bi-directional Hardware Deduction:** Ensure the successful order insert triggers the STOCKZ Bill of Materials logic instantly upon creation, dynamically subtracting raw filament/hardware from the system the second a customer checks out.

### Target: `feature-dim-weight-router`
*Dimensional Weight (DIM) Shipping Router*
*Why:* Shipping lightweight but physically large boxes kills profit margins if the wrong carrier is chosen.
- [ ] Log physical dimensions (L x W x H) for every finished board config.
- [ ] Write a script that checks USPS Ground Advantage vs UPS Priority based on the `(L*W*H) / DIM Divisor` formula.
- [ ] Visually highlight the cheapest carrier for the warehouse packer.

### Target: `feature-socialz-yield-api`
*SOCIALZ (Influencer CRM): Engagement Yield API Dashboard*
*Why:* Sponsoring a skater with 2M followers but no real engagement is lost money.
- [ ] Connect a low-cost social scraping API (like PhantomBuster or Apify).
- [ ] Auto-pull likes/comments on their last 10 posts.
- [ ] Display an "Engagement vs. Vanity" metric score on the skater cards.

---

## 🔴 Phase 3: The A.I. CFO
*Goal: Predictive modeling and complete financial mastery.*

### Target: `feature-cfo-waterfall`
*REVENUEZ / CEO TERMINAL: True Profit Waterfall Chart*
*Why:* You currently track "Net Profit", but hiding the specific breakdown hurts decision-making.
- [ ] In `ceo-module.js` (Chart.js block), build a Waterfall Chart.
- [ ] Map Gross Sales → minus COGS → minus Gateway Fees (Shopify takes 2.9% + 30c) → minus Shipping Costs → minus Social Ads.

### Target: `feature-ltv-cac-metrics`
*Customer Acquisition Cost (CAC) & Lifetime Value (LTV)*
*Why:* Determines exactly how much you can afford to spend on acquiring a new rider.
- [ ] Pull historical Shopify orders to find out how many people buy twice.
- [ ] Compare total ad spend (Meta/TT) to new customers acquired.

---

## 🟣 Expansion Sandbox (Brainstorming)
*Drop ideas in here that aren't prioritized yet but could be massive.*

### Target: `feature-webrtc-barcode-app`
- [ ] A scanner using your iPhone camera connected natively to STOCKZ to do warehouse cycle counts rapidly.

### Target: `feature-socialz-kanban`
- [ ] Outreach Kanban Pipeline for SOCIALZ: Moving skaters through columns matching your negotiation states (Discovered → DM'd → Contract Sent → Sponsored).

### Target: `feature-automated-shippo-printing`
- [ ] Automated Label Printing: Direct Shippo/EasyPost API integration so clicking "Fulfilled" automatically prints a PDF layout to an attached Zebra thermal printer.
