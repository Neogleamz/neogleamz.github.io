# Cohort Intelligence Modal Refactor

This Epic will overhaul the "Cohort Intelligence" modal into a fully native, granular ledger experience that matches the rest of the application's strict design principles, replacing the aggregated "Top 20 Whales" view with precise forensic transaction rendering.

## Design Decisions & Rationale
Currently, the Cohort Intelligence table maps unique PII hashes into a single aggregated row. By switching to a raw transactional ledger, we provide the user with the exact forensic breakdown of every dollar spent by repeat buyers. We will implement native `Sort Column` algorithms alongside the standard `<i class="fa-solid fa-sort"></i>` headers to match the Dataz and Editz ledgers.

## Proposed Changes

### UI Layer (`index.html`)
- **[MODIFY]** The `<div id="ltv-metrics-modal">` structure:
  - Replace the `<button><i class="fa-solid fa-xmark"></i></button>` with the standard `<button class="btn btn-red">Close</button>` rectangle element.
  - Expand the `<thead>` for the Whales Leaderboard to contain: `ORDER ID`, `DATE`, `ITEM`, `TOTAL`, `NET`.
  - Append `data-ltvsort="..."` tags to every column to enable multi-key sorting.
  
### State & Logic Layer (`ceo-module.js`)
- **[MODIFY]** `_syncCeoKPIs()` and `openLtvModal()`:
  - Currently, we loop over `salesDB` and aggregate orders into a `_ltvCustomerMap`. 
  - I will refactor the local memory array (`_ltvCachedWhales`) to store **individual transaction objects** for any customer hash that has `orders > 1`. 
- **[MODIFY]** `renderLtvWhalesTable()`:
  - Map over the individual transactions instead of the aggregated hashes.
  - Output the precise date format, the raw item name, the `sales total`, and the `actual net` per order.
- **[MODIFY]** `sortLtvModal()`:
  - Enhance the sorting logic to handle strings (Items/Dates), numericals (Net/Total), and alphanumeric hashes (Order IDs) so it acts flawlessly like the standard ledgers.

> [!WARNING]
> ## Open Questions For You
> 1. Right now, this table aggregates customers to show you the "Tops 20 Whales". You mentioned wanting `Order ID`, `Date`, and `What They Purchased`. This means I need to split those whales up and show **every single individual receipt/order** line-by-line. Are you 100% fine with completely replacing the "Top 20 Whales" leaderboard with a raw feed of every repeat purchase?
> 2. Should we keep the 4 colorful top blocks (`Total Unique Buyers`, `1-Time`, `2-Time`, `3-Time`) exactly as they are?
