# Legacy Audit Implementation Plan: `inventory-module.js`

### Design Decisions & Rationale
We will migrate the legacy inline `onclick` and `oninput` string template handlers in `inventory-module.js` to utilize the existing `data-app-*` paradigm. This hardens the module against DOM XSS vectors and enforces a strict separation of concerns. Additionally, we will methodically wrap the 17 unprotected `.innerHTML` assignments inside `window.safeHTML()` to ensure absolute DOMPurify coverage as per our vanilla JS security standards. No functional changes will be made to the inventory mathematics.

## User Review Required
> [!IMPORTANT]
> Please review the proposed changes below. Once approved, I will systematically execute the replacements and verify the module's integrity.

## Proposed Changes

### Inventory Module (`assets/js/inventory-module.js`)

#### [MODIFY] `assets/js/inventory-module.js`
**1. Inline Handler Purge:**
*   Line 628: Change `onclick="window.previewInventorySnapshot('${s.id}')"` to `data-app-click="previewInventorySnapshot" data-id="${s.id}"`.
*   Line 629: Change `onclick="window.deleteInventorySnapshot('${s.id}')"` to `data-app-click="deleteInventorySnapshot" data-id="${s.id}"`.
*   Line 1030: Change `oninput="window.updateVelocityzForecast('${pName.replace(/'/g, "\\'")}', this.value)"` to `data-app-input="updateVelocityzForecast" data-name="${pName.replace(/'/g, "&apos;")}"`.
*   Add a local click/input delegator at the bottom of the file (or verify if `system-event-delegator.js` handles these natively) to listen for `previewInventorySnapshot`, `deleteInventorySnapshot`, and `updateVelocityzForecast`.

**2. `window.safeHTML()` Coverage Expansion:**
Wrap the right-hand side of all unprotected `.innerHTML = ` assignments with `window.safeHTML()`.
*   Line 161: `wrap.innerHTML = window.safeHTML(h);`
*   Line 246: `wrap.innerHTML = window.safeHTML(h + '</tbody></table>');`
*   Line 475: `previewArea.innerHTML = window.safeHTML('...');`
*   Line 499: `previewArea.innerHTML = window.safeHTML('...');`
*   Line 550: `previewArea.innerHTML = window.safeHTML(...);`
*   Line 587: `previewArea.innerHTML = window.safeHTML(html);`
*   Line 597: `previewArea.innerHTML = window.safeHTML(...);`
*   Line 617: `listWrap.innerHTML = window.safeHTML('...');`
*   Line 621: `listWrap.innerHTML = window.safeHTML(data.map(...).join(''));`
*   Line 1000: `tbody.innerHTML = window.safeHTML('...');`
*   Line 1036: `tbody.innerHTML = window.safeHTML(html);`
*   Line 1149: `outContainer.innerHTML = window.safeHTML(html);`
*   Line 1309: `dropdown.innerHTML = window.safeHTML(window.cachedCcMngrOptions);`
*   Line 1314: `dropdown.innerHTML = window.safeHTML(window.cachedCcMngrOptions);`
*   Line 1326: `dropdown.innerHTML = window.safeHTML('...');`
*   Line 1415: `document.getElementById('ccMngrDropdown').innerHTML = window.safeHTML(finalHtml);`
*   Line 1416: `select.innerHTML = window.safeHTML(finalNativeHtml);`

## Verification Plan

### Automated Tests
- Run `npx eslint .` to guarantee no syntactical flaws were introduced.
- Run `npm test` to ensure the mathematical test suite remains unbroken.

### Manual Verification
- Render the FGI table to ensure FGI DOM construction isn't broken.
- Render the Stock table to ensure raw inventory DOM construction isn't broken.
- Test previewing and deleting an inventory snapshot.
- Test the velocityz forecast input inside the Velocityz Forecast modal.
