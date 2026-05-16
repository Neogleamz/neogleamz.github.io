### Design Decisions & Rationale
We are injecting strict JSDoc (`/** @typedef */`) blocks at the top of ALL core database sync modules rather than attempting a TypeScript migration. This surgically enforces payload schema strictness in the IDE and AI context while cleanly maintaining our lightweight, zero-build Vanilla JS architecture.

*Note on `index.html`:* This will NOT require modifying `index.html`. Because the VS Code/IDE language server natively reads JSDoc declarations across the entire workspace, injecting the types solely at the top of their respective `.js` files automatically protects the HTML script blocks and global execution environments without cluttering the markup!

---

## Proposed Changes

### `sales-module.js`
1. Inject a top-level `@typedef {Object} SalesLedgerRow`.
2. Annotate the global `salesDB` array with `/** @type {SalesLedgerRow[]} */`.

### `inventory-module.js`
1. Inject a top-level `@typedef {Object} InventoryConsumptionRow`.
2. Annotate the global `inventoryDB` object dictionary with `/** @type {Object<string, InventoryConsumptionRow>} */`.

### `production-module.js` (MAKERZ)
1. Inject `@typedef {Object} WorkOrderRow`.
2. Inject `@typedef {Object} ProductionSopRow`.
3. Annotate `activeWorkOrders` array.

### `print-module.js` & `labelz-module.js` (LABELZ)
1. Inject `@typedef {Object} PrintQueueRow`.
2. Define custom label payload typings for thermal execution.

### `socialz-module.js` (CRM)
1. Inject `@typedef {Object} SocialzAudienceRow`.

### `system-tools-module.js` & `system-event-delegator.js` (Core Systems)
1. Inject `@typedef {Object} AppSettingsRow`.
2. Type the core event delegation mapping tokens.

### `analytics-module.js` & `ceo-module.js` (Financial Engines)
1. Inject `@typedef {Object} TrueNetWaterfallToken` to perfectly structure the inputs going into the CFO canvas charts.

### `bom-module.js` & `neogleamz-engine.js` (Cost Calculators)
1. Inject `@typedef {Object} FullLandedCostRow` mapping to the Supabase pricing engine.
2. Type the core recursive recipe data structures (BOM trees).

### `packerz-module.js`, `barcodz-module.js`, `orders-module.js` (Logistics)
1. Inject `@typedef {Object} PackerzShipmentPayload` to strictly define the fulfillment tokens.
2. Type the QR Code configuration structures.



---

## Verification Plan

### Automated Checks
* Execute the newly installed `npm run lint` script to ensure JSDoc injection hasn't tripped any new syntax violations.

### Manual Verification
* Visually inspect the `.js` files to ensure all attributes match the active `SK8Lytz_App_Master_Reference.md` schema references.
* Hovering over `salesDB` or `inventoryDB` in supported environments will structurally validate the typedefs.
