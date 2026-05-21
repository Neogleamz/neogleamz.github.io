# Legacy Audit: `bom-module.js` (Vanilla JS Enforcement)

### Design Decisions & Rationale
Upon scanning the `bom-module.js` structure, I identified several violations of our Vanilla JS and Security protocols within the Recipe Manager Staging logic:
1. A legacy inline `onblur` handler injected dynamically into the template payload (`onblur="if(typeof window.renderRecipeManager==='function') window.renderRecipeManager()"`).
2. Two instances of unsafe `innerHTML` assignments (`tbody.innerHTML = html;` and `statusTd.innerHTML = isFixed ? ...`) that bypass our strict `window.safeHTML()` sanitization wrapper.

I will surgically strip the inline handler and properly bind it dynamically post-render using Native JS `addEventListener`. I will also wrap the unprotected `innerHTML` injections inside `window.safeHTML()` to permanently close the XSS vectors.

## Proposed Changes

### `assets/js/bom-module.js`
- **[MODIFY]** Line 663: Strip the inline `onblur` handler from the `<input>` text box template string.
- **[MODIFY]** Line 677: Secure `tbody.innerHTML = html;` by wrapping it securely with `window.safeHTML(html)`.
- **[MODIFY]** Line 695: Secure `statusTd.innerHTML = isFixed ? ...` by wrapping the payload with `window.safeHTML()`.
- **[MODIFY]** Line 678+: Directly beneath the `tbody.innerHTML` injection, add a Native JS `querySelectorAll` loop to safely attach the `blur` event listener to all generated inputs.

## Verification Plan

### Manual Verification Actions
Once the refactor is approved and merged, please verify the following in the UI:
1. Open the BOM Engine and click `Recipe Manager` (Staging Sandbox).
2. Click on a component's "New Assigned Key" to edit the text input.
3. Click away from the input (triggering the `blur` event).
4. Verify the UI updates correctly and evaluates if the typed key is "Valid" or "Orphaned", ensuring the Native DOM event binding successfully replaced the inline handler!
