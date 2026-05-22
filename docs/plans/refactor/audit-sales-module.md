# 🧹 Sales Module Legacy Audit

### Design Decisions & Rationale
To strictly enforce our Vanilla DOM security and architectural hygiene, I am mapping all inline `onfocus`, `onblur`, `onchange`, and `onclick` handlers in `sales-module.js` to the global `system-event-delegator.js`. Furthermore, every raw `.innerHTML` assignment will be securely wrapped with `window.safeHTML()` to eradicate any potential DOM clobbering or XSS injection vectors.

## Proposed Changes

### `sales-module.js`
#### [MODIFY] [sales-module.js](file:///d:/GitHub/neogleamz.github.io/assets/js/sales-module.js)
- Map `onfocus="storeOldVal(this)"` to `data-focus="focus_storeOldVal"`.
- Map `onblur="updateSaleCell(...)"` to `data-blur="blur_updateSaleCell"` passing parameters via data attributes.
- Map `onchange="updateSaleType(...)"` to `data-change="change_updateSaleType"`.
- Map `onclick="renderSimulatorOrder(...)"` to `data-click="click_renderSimulatorOrder"`.
- Wrap over 20+ instances of `.innerHTML = ...` with `.innerHTML = window.safeHTML(...)` to comply with the Anti-Hallucination Legacy Ban.

### `system-event-delegator.js`
#### [MODIFY] [system-event-delegator.js](file:///d:/GitHub/neogleamz.github.io/assets/js/system-event-delegator.js)
- Add switch cases for the aforementioned actions inside the `focus`, `blur`, `change`, and `click` event listeners.

## Verification Plan
### Automated Tests
- Execute `npm test` to guarantee the underlying mathematical logic remains mathematically perfect.
- Execute `npx eslint .` to check for syntax validity post-refactor.

### Manual Verification
- We will visually confirm the Math Simulator sandbox and Sales Grid still accurately accept cell edits within the REVENUEZ hub.
