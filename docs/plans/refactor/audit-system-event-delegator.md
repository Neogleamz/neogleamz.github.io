# Refactor & Audit System Event Delegator

This plan outlines the refactoring of `system-event-delegator.js` to enforce strict Vanilla JS rules and patch edge-case crash vulnerabilities. 

### Design Decisions & Rationale
During my initial analysis, I discovered that the `keyup`, `mousedown`, and the first `change` event delegators were completely missing the `typeof event.target.closest !== 'function'` safety check. This is the exact root cause of the hallucinated DOM text node crash (`e.target.closest is not a function`) that previously broke our UI during drag-and-drop or rapid click sequences. I also found two separate `change` event listeners bound to `document.body`, which violates DRY principles and fragments our event routing. We will merge these into a single unified `change` delegator and deploy the safety checks universally to all delegators.

## User Review Required

> [!IMPORTANT]
> The `system-event-delegator.js` is the absolute central nervous system of this web application. I will be surgically merging the two fragmented `change` listeners into one and patching the missing `.closest()` safety checks on the `keyup` and `mousedown` listeners.

## Proposed Changes

---

### UI & Event Refactor

#### [MODIFY] [system-event-delegator.js](file:///d:/GitHub/neogleamz.github.io/assets/js/system-event-delegator.js)
- **Patch `keyup` Delegator**: Add `if (!event.target || typeof event.target.closest !== 'function') return;` at line 1370.
- **Patch `mousedown` Delegator**: Add `if (!event.target || typeof event.target.closest !== 'function') return;` at line 1415.
- **Merge `change` Delegators**: 
  - Combine the `change` delegator at line 1465 with the `change` delegator at line 1784.
  - Apply the `.closest()` safety check to the newly merged `change` delegator.
  - Delete the duplicate listener block.

## Verification Plan

### Automated Tests
- `npm test` to ensure core logical algorithms are unbroken.
- `npx eslint .` to ensure the module is fully compliant.

### Manual Verification
- We will visually verify the web application by clicking around and ensuring basic inputs, dropdowns, and buttons still function across different Hubs (especially since `change` impacts dropdowns).
