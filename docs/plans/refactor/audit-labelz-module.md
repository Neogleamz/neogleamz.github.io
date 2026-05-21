# Legacy Audit Implementation Plan: `labelz-module.js`

### Design Decisions & Rationale
We will migrate the legacy inline `onmouseover`, `onmouseout`, `onchange`, and `oninput` handlers found in `labelz-module.js` to utilize our existing `data-app-*` and `data-click` delegated paradigm. This systematically hardens the interface against DOM-based XSS attacks. Additionally, we will secure all bare `.innerHTML` template injections using the `window.safeHTML()` protocol to ensure complete DOMPurify coverage as required by our strict Vanilla JS standards.

## User Review Required
> [!IMPORTANT]
> Please review the proposed changes below. Once approved, I will methodically execute the replacements, hook up the global delegators, and verify the Canvas engine's stability.

## Proposed Changes

### Labelz Module (`assets/js/labelz-module.js`)

#### [MODIFY] `assets/js/labelz-module.js`
**1. Inline Handler Purge:**
*   Lines 133, 737: Replace inline hover attributes (`onmouseover`, `onmouseout`) with CSS transitions via standard classes or by delegating `data-app-mouseover` if complex DOM traversal is needed, though simple hover styles are best handled via a CSS class (e.g., `hover-border-primary`).
*   Lines 559-562, 587, 589-590, 605, 612, 622: Replace `onchange` attributes on the Canvas Property Inputs with `data-app-change` tokens (e.g., `data-app-change="updObj"`).
*   Lines 566, 571, 586: Replace `oninput` attributes with `data-app-input` tokens (e.g., `data-app-input="updObj"` or `data-app-input="syncRotDisp"`).
*   Inject the appropriate global/local event listeners (change, input, mouseover) at the bottom of the module to route these actions into the `updObj` and `updBc` logic seamlessly.

**2. `window.safeHTML()` Protocol Validation:**
*   Review all `.innerHTML = ` assignments (e.g., Lines 101, 160, 543, 637, 699, 728, 746, 784). Ensure the right-hand side is universally and correctly wrapped in `window.safeHTML()`. Some lines are currently using a ternary `window.safeHTML ? window.safeHTML(...) : ...`; we will enforce the strict `window.safeHTML(...)` format as `window.safeHTML` is now universally globally defined.

## Verification Plan

### Automated Tests
- `npm test` will be executed to guarantee no downstream dependency flaws.
- `npx eslint .` will be executed to verify syntactical integrity.

### Manual UI Testing Instructions
> [!NOTE]
> Exact instructions and targeted Hub names will be provided post-execution in the final confirmation block.
