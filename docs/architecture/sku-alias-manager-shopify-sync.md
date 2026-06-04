# Architecture Decision Record: SKU Alias Manager Shopify Sync Stabilization

## 1. Context & Objectives
The SKU Alias Manager is currently experiencing critical data mapping issues: duplicating alias entries, missing barcode values ("None"), and misidentifying full product titles (e.g., "SK8Lytz SOULZ - Black") as the system SKUs. This issue originates from the Supabase Edge Functions (`shopify-webhook` and `shopify-force-sync`) mistakenly using the highly mutable Product Title as the unique conflict resolution key (`product_sku`) within the `storefront_aliases` database table. The objective is to stabilize the data model to definitively prevent orphaned aliases, accurately ingest Shopify SKUs, and ensure barcodes are properly mapped for physical fulfillment scanners.

## 2. Architectural Overview (Context Level)
The SKU Alias Manager serves as the crucial translation bridge between external Shopify storefront orders and the internal "Recipes" (manufactured units) managed in `index.html`. 
* **Ingestion Points**: The `shopify-webhook` function handles real-time event-driven orders, while `shopify-force-sync` acts as a catalog reconciliation backup. 
* **The Fix**: This update requires a schema paradigm shift within `storefront_aliases` to align with Shopify's true unique identifiers, coupled with updates to both edge functions and the Vanilla JS DOM rendering logic to decouple the human-readable product name from the system's mapping logic.

## 3. Industry Standard Validation
The **Shopify API Validator** subagent was dispatched and confirmed the following industry standards and payload behaviors:
* **Vanilla JS & Data Flow**: The `orders/create` webhook payload natively includes the true `sku` field within the `line_items` array. However, it **does not** natively include the `barcode` field. The missing barcode in the UI is a direct result of Shopify's REST webhook constraints.
* **Security & Performance**: Shopify explicitly warns against using the Product Title as a primary identifier because it is highly mutable (frequently changed by SEO apps) and not guaranteed to be unique. 
* **UI/UX Strategy**: The UI should display the Product Title for human glanceability, but all underlying state mutations (e.g., the UNMAP and SAVE BARCODE buttons) must be structurally bound to the immutable `variant_id` or the actual business `sku`.

## 4. Design Decisions & Trade-offs
* **Decision 1: Switch Primary Identifier to Variant SKU (`sku`)**
  * *Approach*: Refactor `storefront_aliases` so that the actual Shopify Variant SKU is used as the unique `product_sku` constraint. A new column (or payload) will be dedicated to `storefront_name` to store the human-readable title strictly for the UI.
  * *Trade-off*: Existing legacy aliases mapped via product titles will need a one-time migration or cleanup script to prevent them from lingering as permanent orphans.
  * *Why*: This definitively eliminates the "multiplication glitch" where a single product generates endless aliases every time its SEO title is updated.
* **Decision 2: Asynchronous Barcode Hydration**
  * *Approach*: Because the Shopify Order webhook lacks the barcode, we will not force a blocking API call inside the webhook execution (which risks Shopify timing out and killing the webhook delivery). 
  * *Trade-off*: Barcodes will temporarily display as "None" for brand new, never-before-seen variants hitting the webhook for the first time.
  * *Why*: The `shopify-force-sync` catalog sync job will be designated as the authoritative mechanism to hydrate missing barcodes asynchronously via the Shopify Products API, maintaining hyper-fast webhook response times.
