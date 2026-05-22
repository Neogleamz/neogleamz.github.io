### Design Decisions & Rationale
We are executing the `/legacy_audit` on `production-module.js` to strictly enforce our Vanilla JS and Content Security Policy requirements. By migrating all inline `onmousedown`, `onchange`, `oninput`, and `onmouseover` handlers to our centralized `system-event-delegator.js`, we prevent XSS vectors and eliminate memory leaks, relying instead on pure CSS pseudo-classes for dynamic UI hover states.

# 🏭 Refactor & Audit Production Module

## Proposed Changes

### Components & Logic Separation

#### [MODIFY] `assets/js/production-module.js`
- **Purge Inline Event Handlers**:
  - `onmousedown="event.preventDefault(); execRT('bold')"` (and all RT Toolbar actions) -> migrate to `data-mousedown="mousedown_execRT_bold"` and `data-mousedown="mousedown_execRT_italic"`, etc.
  - `onchange="execRT('foreColor', this.value)"` -> `data-change="change_execRT_foreColor"`.
  - `onchange="execRT('fontSize', this.value)"` -> `data-change="change_execRT_fontSize"`.
  - `oninput="balanceRoute(...)"` -> `data-input="input_balanceRoute"` utilizing `data-safek`, `data-req`, `data-type`, and `data-maxpull` attributes.
- **Purge Inline Hover Styles**:
  - `onmouseover` and `onmouseout` used for hover states on Work Order UI checkboxes and Qty editing will be completely removed.
  - Replaced by inserting utility CSS classes (`.hover-bg-blue-light`, `.hover-bg-success-light`, `.hover-border-success`) which will be injected globally into `index.html`.
- **Validation**:
  - Confirmed zero `position: absolute` styling logic exists within JS rendering.
  - Confirmed zero legacy `var ` declarations remain.

#### [MODIFY] `assets/js/system-event-delegator.js`
- Map the new `data-mousedown` endpoints (`mousedown_execRT_bold`, etc.) and ensure they invoke `event.preventDefault()` correctly before calling `execRT()`.
- Map the new `data-change` endpoints (`change_execRT_foreColor`, `change_execRT_fontSize`).
- Map `data-input="input_balanceRoute"` to dynamically extract dataset attributes and execute the `balanceRoute()` logic.

#### [MODIFY] `index.html`
- Inject the specific UI hover utility classes into the primary `<style>` block to gracefully replace the JS-based `onmouseover` / `onmouseout` styling in the Production UI.

## Verification Plan

### Automated Tests
- Run `npm test` to verify zero math or routing regressions.
- Run `npx eslint .` to ensure perfect syntax and 0 warnings.

### Manual Verification
- After approval, I will execute the changes and provide you with an exact set of clicks to verify the RT Editor and Work Order routing states in the browser natively.
