# 🦅 Neogleamz Command Center: Master Roadmap

This document serves as the permanent, living blueprint for scaling the Command Center from an MVP into an interconnected, enterprise-grade ERP, MES, and CRM ecosystem. 

Work your way down these blocks. You can check off items `[x]`, edit them, or add new steps continuously.

---

## 🟢 Phase 1: Precision & Foundation
*Goal: Ensure baseline data is 100% accurate and prevent hidden margin bleed.*

### MAKERZ (Print Farm & Production)
- [ ] **Feature:** Scrap & Yield Rate Logging
  - *Why:* True hardware cost is hidden inside failed 3D prints (spaghetti/warp). You MUST track this.
  - *Steps Needed:*
    - [ ] Add a "Scrap/Failure" button next to "Pull" inside Work Orders.
    - [ ] Update `production-module.js` to log failures to Supabase.
    - [ ] Add algorithm: `(Successful Prints / Total Prints) = Yield Rate`.

### STOCKZ (Inventory Management)
- [ ] **Feature:** Dynamic Reorder Points (ROP) & Safety Stock Alerts
  - *Why:* Running out of filament halts production. Over-stocking traps cash flow.
  - *Steps Needed:*
    - [ ] In `inventory-module.js`, calculate daily velocity of filament usage.
    - [ ] Hardcode a "Supplier Lead Time" (e.g., 5 days for Amazon Prime).
    - [ ] Build a red warning banner that flashes when stock hits `(Velocity * Lead Time) + 10% Safety`.

---

## 🟡 Phase 2: Logistics & Tracking
*Goal: Automate human-labor choke points and deeply understand product profitability.*

### NEXUZ (Fulfillment & Logistics)
- [ ] **Feature:** Direct Shopify API Sync (Replace CSV/Excel Imports)
  - *Why:* End-of-day manual CSV imports delay production visibility, risk corrupted formatting, and require human labor.
  - *Architectural Overhaul & Deprecation Strategy:*
    - [ ] **1. Deprecate Front-End File Readers:** Strip out the `SheetJS (XLSX)` parsing functions hitting `NEWORDERS.xlsx` and `ShopifySales.csv` currently sitting inside `sales-module.js` and `system-tools-module.js`.
    - [ ] **2. Auth & App Security:** Generate Private Custom App keys in the Shopify Admin. Store them strictly as encrypted `.env` variables inside Supabase.
    - [ ] **3. `orders/create` Inbound Edge Function:** Write `supabase/functions/shopify-webhook/index.ts`. It must catch the raw webhook, verify Shopify's HMAC 256 signature (for security against payload spoofing), and map the JSON cleanly.
    - [ ] **4. Payload Normalization:** Parse Shopify's deep nested objects into flat Neogleamz SQL structures: Extract `line_items` (SKUs & Quantities), `shipping_address` (Name, Street, City, Zip), Financials (Subtotal, Tax, Shipping Paid, Discounts), and `id` (the true Shopify database ID).
    - [ ] **5. Idempotent Database Insert:** Update the Supabase `orders` table to enforce Shopify's unique `id` as the Primary Key or a Unique Constraint. Write the Edge Function query with `.upsert()` so if a webhook fires twice, it just updates the existing row instead of double-counting revenue.
    - [ ] **6. Reverse Fulfillment Push:** Build an outbound API hook triggered directly from `NEXUZ`. When a packer clicks "Mark as Fulfilled", fire a specialized Edge Function that runs a `POST /admin/api/2023-10/orders/{order_id}/fulfillments.json` back to Shopify, passing the tracking number and carrier name so Shopify emails the customer automatically.
    - [ ] **7. Bi-directional Hardware Deduction:** Ensure the successful order insert triggers the STOCKZ Bill of Materials logic instantly upon creation, dynamically subtracting raw filament/hardware from the system the second a customer checks out.
- [ ] **Feature:** Dimensional Weight (DIM) Shipping Router
  - *Why:* Shipping lightweight but physically large boxes kills profit margins if the wrong carrier is chosen.
  - *Steps Needed:*
    - [ ] Log physical dimensions (L x W x H) for every finished board config.
    - [ ] Write a script that checks USPS Ground Advantage vs UPS Priority based on the `(L*W*H) / DIM Divisor` formula.
    - [ ] Visually highlight the cheapest carrier for the warehouse packer.

### SOCIALZ (Influencer CRM)
- [ ] **Feature:** Engagement Yield API Dashboard
  - *Why:* Sponsoring a skater with 2M followers but no real engagement is lost money.
  - *Steps Needed:*
    - [ ] Connect a low-cost social scraping API (like PhantomBuster or Apify).
    - [ ] Auto-pull likes/comments on their last 10 posts.
    - [ ] Display an "Engagement vs. Vanity" metric score on the skater cards.

---

## 🔴 Phase 3: The A.I. CFO
*Goal: Predictive modeling and complete financial mastery.*

### REVENUEZ / CEO TERMINAL
- [ ] **Feature:** True Profit Waterfall Chart
  - *Why:* You currently track "Net Profit", but hiding the specific breakdown hurts decision-making.
  - *Steps Needed:*
    - [ ] In `ceo-module.js` (Chart.js block), build a Waterfall Chart.
    - [ ] Map Gross Sales → minus COGS → minus Gateway Fees (Shopify takes 2.9% + 30c) → minus Shipping Costs → minus Social Ads.
- [ ] **Feature:** Customer Acquisition Cost (CAC) & Lifetime Value (LTV)
  - *Why:* Determines exactly how much you can afford to spend on acquiring a new rider.
  - *Steps Needed:*
    - [ ] Pull historical Shopify orders to find out how many people buy twice.
    - [ ] Compare total ad spend (Meta/TT) to new customers acquired.

---

## 🟣 Expansion Sandbox (Brainstorming)
*Drop ideas in here that aren't prioritized yet but could be massive.*

- [ ] **WebRTC Physical Barcode App:** A scanner using your iPhone camera connected natively to STOCKZ to do warehouse cycle counts rapidly.
- [ ] **Outreach Kanban Pipeline for SOCIALZ:** Moving skaters through columns matching your negotiation states (Discovered → DM'd → Contract Sent → Sponsored).
- [ ] **Automated Label Printing:** Direct Shippo/EasyPost API integration so clicking "Fulfilled" automatically prints a PDF layout to an attached Zebra thermal printer.
