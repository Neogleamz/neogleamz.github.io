# Refactor & Audit Socialz Module

This plan outlines the refactoring of `socialz-module.js` to enforce strict Vanilla JS rules, specifically focusing on DOM security and removing inline/legacy event handlers.

### Design Decisions & Rationale
We are migrating all inline `onmouseover`/`onmouseout` styles to a centralized CSS class to enforce strict CSP adherence and reduce DOM bloating. Similarly, stray `addEventListener` calls and inline `onchange` attributes will be rerouted through our global `system-event-delegator.js` using data attributes. Finally, all unprotected `innerHTML` assignments in the terminal output logic will be wrapped in `window.safeHTML()` to eliminate XSS hallucination vectors.

## User Review Required

> [!IMPORTANT]
> The `socialz-module.js` contains a large number of dynamic HTML grid/list template literals. I will remove all inline `onmouseover` and `onmouseout` handlers and replace them with standard hover CSS classes (`hover:bg-[var(--bg-input)]`, etc.) using pure CSS to maintain visual fidelity without script injection.

## Proposed Changes

---

### UI & Event Refactor

#### [MODIFY] [socialz-module.js](file:///d:/GitHub/neogleamz.github.io/assets/js/socialz-module.js)
- **Remove `addEventListener`**: Remove `document.getElementById('search-input').addEventListener('input', renderSkaters)` and instead rely on the `data-input="input_renderSkaters"` attribute handled via the Delegator.
- **Remove Inline `onchange`**: Convert `<input type="checkbox" onchange="handleStyleToggle(...)">` to use `data-change="change_handleStyleToggle_this"` with the skater's style string embedded cleanly via `data-style`.
- **Remove Inline `onmouseover`/`onmouseout`**: Purge all `onmouseover="this.style.background=..."` styles in the table/grid templates and inject corresponding `.socialz-hover-bg` CSS classes instead.
- **Secure `innerHTML`**: Wrap the unprotected `term.innerHTML` assignments (lines 738, 751, 755, 775) in `window.safeHTML()`.

#### [MODIFY] [system-event-delegator.js](file:///d:/GitHub/neogleamz.github.io/assets/js/system-event-delegator.js)
- Add `input_renderSkaters` to the `data-input` delegator switch.
- Add `change_handleStyleToggle_this` to the `data-change` delegator switch to handle the style checkboxes dynamically.

#### [MODIFY] [index.css](file:///d:/GitHub/neogleamz.github.io/index.css)
- Add the necessary `.socialz-hover-bg` or `.hover-bright` style rules to replicate the `onmouseover` JS behavior natively in the CSSOM.
- Ensure the hover logic uses pure CSS for the link cards.

## Verification Plan

### Automated Tests
- `npm test` to ensure core logical algorithms are unbroken.
- `npx eslint .` to ensure the module is fully compliant with security rules and contains no inline HTML handler violations.

### Manual Verification
- We will visually verify the **SOCIALZ** module inside the live 127.0.0.1 browser by clicking the style filters and ensuring the UI properly repaints natively via the global event delegator.
