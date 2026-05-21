# Implementation Plan - Legacy Audit & Refactoring of packerz-module.js

This plan implements a strict security and hygiene refactoring of [packerz-module.js](file:///d:/GitHub/neogleamz.github.io/assets/js/packerz-module.js) on the active `refactor/audit-packerz-module` branch.

### Design Decisions & Rationale
We will surgically refactor [packerz-module.js](file:///d:/GitHub/neogleamz.github.io/assets/js/packerz-module.js) to enforce strict Vanilla JS compliance and robust security. By creating a unified, dynamically-injected CSS style block, we completely eradicate inline hover and interactive handlers (`onmouseover`/`onmouseout`), delegating dynamic clicks safely to the centralized [system-event-delegator.js](file:///d:/GitHub/neogleamz.github.io/assets/js/system-event-delegator.js). Furthermore, we purge redundant sanitizer checks in favor of authoritative, direct `window.safeHTML()` wrappers, and register a module-level lock `window.isPackerzListenerBound` to guarantee zero listener duplication leaks.

---

## User Review Required

> [!NOTE]
> All changes are backward-compatible and preserve original functional flows. No external libraries are added.

> [!IMPORTANT]
> The print button inside the SOP Editor modal will be cleanly migrated from an inline `onclick` handler to utilize the authoritative `click_window_openSopPrintModal_pack` event delegation route already supported by [system-event-delegator.js](file:///d:/GitHub/neogleamz.github.io/assets/js/system-event-delegator.js).

---

## Open Questions

> [!NOTE]
> No outstanding questions exist. The requirements are fully detailed, and the codebase parameters are 100% understood.

---

## Proposed Changes

### Fulfillz: Packerz Module

#### [MODIFY] [packerz-module.js](file:///d:/GitHub/neogleamz.github.io/assets/js/packerz-module.js)
- **Modular Stylesheet Injection:** Inject a CSS `<style>` block at the module entry point containing proper `.packerz-` classes with custom hover states, replacing all dynamic inline `onmouseover` and `onmouseout` attributes.
- **Direct safeHTML Wrapping:** Purge all ternary sanitizer checks `window.safeHTML ? window.safeHTML(html) : html` across the file, transforming them to direct, secure calls to `window.safeHTML(html)`.
- **Purge Inline onclick Handlers:** Convert the inline `onclick="window.openSopPrintModal('packerz')"` on the print button inside the SOP Editor modal to use `data-click="click_window_openSopPrintModal_pack"`.
- **Event Listener Duplication Guard:** Wrap all global event listener registrations (`click`, `change`, `input`, `keyup`, `mousedown`) in a strict Boolean state lock check `if (!window.isPackerzListenerBound) { ... window.isPackerzListenerBound = true; }` to eradicate listener leak bugs on hot reload or tab switching.
- **JSDoc Orchestration Typings:** Document all global functions (e.g. `fetchUnfulfilledOrders`, `openPackerzSopTerminal`, `loadPackerzActiveSOP`) using formal JSDoc blocks to establish code contracts.

---

## Verification Plan

### Automated Tests
- Run the Jest unit tests suite to ensure zero regressions:
  ```bash
  npm test
  ```
- Run ESLint to verify strict syntax and lint rule compliance:
  ```bash
  npx eslint assets/js/packerz-module.js
  ```

### Manual Verification
- Deploy the dev environment and launch the browser at `127.0.0.1:5500`.
- Navigate to the **📦 FULFILLZ** hub, click **PACKERZ**, select an active order card (e.g., Order 1043 or 1044), and launch the SOP Viewer.
- Verify checklist hovers work smoothly using the new injected stylesheet rules.
- Verify checkbox sign-offs and scanned item validations work cleanly, ensuring the "Complete Assembly" orange pill activates to green and registers in the Supabase audit logs correctly.
