### Design Decisions & Rationale
To align `scraper-module.js` with the global Vanilla JS architecture, we must eliminate all inline `.addEventListener()` calls nested inside the module. By delegating these strictly to `data-click` and `data-change` attributes mapping back to `system-event-delegator.js`, we prevent localized memory leaks and enforce a single source of truth for global event handling.

## Proposed Changes

### `assets/js/scraper-module.js`

- **[MODIFY] [scraper-module.js](file:///d:/GitHub/neogleamz.github.io/assets/js/scraper-module.js)**
  - Purge the explicit `_scraperBindEvents()` function and the `AbortController` payload.
  - Refactor the dynamic HTML generated inside `openScraperFoundry()` to use `data-click` and `data-change` attributes instead of raw IDs (`id="scraperCloseBtn"` -> `data-click="click_closeScraperFoundry"`).
  - Expose internal functions globally (e.g. `window.closeScraperFoundry`, `window.scraperIngestFileChange`, `window.scraperSetContainerBounds`) so they can be securely triggered by the global delegator.

### `assets/js/system-event-delegator.js`

- **[MODIFY] [system-event-delegator.js](file:///d:/GitHub/neogleamz.github.io/assets/js/system-event-delegator.js)**
  - Inject a new `switch/case` block for all `click_` triggers bridging to the new globally exposed functions for the Scraper Foundry.
  - Ensure the new `data-change` handler gracefully passes the native `event` payload over so the file ingest engine can successfully extract `event.target.files[0]`.

## Verification Plan

### Automated Tests
- Run `npm test` and `npx eslint .` to guarantee zero regressions.

### Manual Verification
- Launch the Scraper Foundry from NEXUZ.
- Load an arbitrary `.html` file and verify X-Ray bindings appear perfectly.
- Set boundaries, extract children elements, export a live dataset, and verify button responsiveness.
