# Legacy Audit: `barcodz-module.js` (Vanilla JS Enforcement)

### Design Decisions & Rationale
Upon scanning the `barcodz-module.js` structure, I identified numerous legacy `on...` inline event handlers (e.g., `ondragstart`, `onmouseover`, `onchange`, `ontoggle`) attached to dynamically generated HTML elements. These violate our strict DOM security policies and Content Security Policy (CSP). Additionally, there are a few instances of `outerHTML` manipulation which bypass our `window.safeHTML()` zero-trust sanitization wrapper.

I will execute a surgical strike to completely eradicate these inline bindings. All hover interactions will be offloaded to pure CSS utility classes injected into `index.html`. All drag-and-drop and input state logic will be decoupled from the HTML templates and bound dynamically in pure JS after the DOM renders. Finally, all `outerHTML` logic will be safely converted to sanitized `innerHTML` manipulations to close the XSS vectors.

## Proposed Changes

### `index.html`
- **[MODIFY]** Inject missing hover utility classes into the `<style>` block (e.g., `.barcodz-card-hover`, `.spool-remove-hover`) to facilitate pure CSS state management for the Barcodz UI without inline JS.

### `assets/js/barcodz-module.js`
- **[MODIFY]** Line 132: Strip the inline `ontoggle` listener from `<details>` and replace it with post-render Vanilla JS event delegation inside `renderBarcodzGrid()`.
- **[MODIFY]** Line 142: Strip `onmouseover` and `onmouseout` and replace with `.barcodz-card-hover` CSS class.
- **[MODIFY]** Line 273: Strip all inline HTML5 Drag-and-Drop listeners (`ondragstart`, `ondragover`, `ondrop`, `ondragend`) and `onmousedown`/`onmouseup` from the spool items. Bind them gracefully after `renderBarcodzSpool()` completes.
- **[MODIFY]** Line 284: Strip `onchange` and attach it safely post-render.
- **[MODIFY]** Line 286: Strip `onmouseover`/`onmouseout` and replace with `.spool-remove-hover`.
- **[MODIFY]** Lines 367, 384, 397: Convert unsafe `.outerHTML` reassignments into sanitized `.innerHTML` updates on the parent container, securely wrapped by `window.safeHTML()`.

## Verification Plan

### Manual Verification Actions
Once the refactor is approved and merged, please verify the following in the UI:
1. Open the `BARCODZ` or `LABELZ` printing modal/pane.
2. Hover over a barcode card in the grid to ensure the border still turns blue (CSS hover intact).
3. Expand and collapse a category header (e.g., "Retail Products"). Reload the page and ensure the category remembers if it was open or closed (state tracking intact).
4. Add items to the Print Spool. Drag and drop to reorder them, and change the quantity number manually to ensure the DOM events fired successfully without inline mapping!
