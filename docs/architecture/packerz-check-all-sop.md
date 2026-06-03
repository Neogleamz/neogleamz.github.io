# High-Level Architecture Document: Packerz SOP "Check All"

## 1. Context & Objectives
**Business Problem:** Operators in the FULFILLZ/PACKERZ pipeline currently have to manually click each individual QA checkbox during the SOP procedure. For large, complex orders or highly repetitive tasks, this introduces friction and slows down fulfillment KPIs.
**Scope:** Introduce a "Check All" utility within the Packerz SOP Viewer Modal specifically for the Mandatory Quality Checklist section, allowing operators to bulk-clear standard textual QA checks.

## 2. Architectural Overview (Context Level)
This feature will integrate directly into the existing SK8Lytz ecosystem, specifically targeting the FULFILLZ node (`packerz-module.js`). 
The SOP Viewer Modal dynamically renders QA checks based on Supabase DB configurations. A new DOM element (the "Check All" button) will be injected into the SOP UI header for the QA section. Clicking this button will utilize a Vanilla JS DOM traversal function to find all unchecked `.packerz-qa-check` inputs, toggle them to `checked`, and trigger the global `sopSignoffCheck()` state validation hook to unlock the final assembly button.

## 3. Industry Standard Validation
**UI/UX Strategy Validation:**
- **Glanceable UI:** The "Check All" button should be styled consistently with existing UI elements (e.g., small, ghost-blue or ghost-green pill button) and placed intuitively right next to the "MANDATORY QA CHECKS" header inside the active SOP modal split-view.
- **Feedback Loop:** Upon clicking, the checkboxes should visibly animate to the checked state, providing immediate visual confirmation to the operator.

**Security & Performance Validation:**
- **XSS Prevention:** The button injection must utilize the existing `window.safeHTML()` DOMPurify wrapper to prevent any injection vectors.
- **Memory/Performance:** Iterating over checkboxes via `document.querySelectorAll('.packerz-qa-check:not([disabled])')` is highly performant in Vanilla JS and does not introduce memory leaks. Event listener attachment will use the established `data-app-click` delegator pattern rather than inline `onclick`.

**Vanilla JS & Data Flow:**
- **Strict Scope Boundaries:** The "Check All" logic must **ONLY** apply to boolean checkboxes (`.packerz-qa-check`). It **MUST NOT** bypass or auto-fill interactive inputs (`[INPUT]`) or mandatory barcode/QR scans (`[SCAN:]`). Physical verification mechanisms must remain protected.
- **State Sync:** After toggling the DOM elements, the system must forcefully invoke `window.sopSignoffCheck()` to ensure the backend validation array is recalculated and the "COMPLETE QA" signoff button is correctly unlocked.

## 4. Design Decisions & Trade-offs
- **Trade-off:** Bulk-checking boxes inherently reduces the physical friction that forces an operator to read every line, slightly increasing the risk of human error during packing.
- **Decision:** To mitigate this risk, the "Check All" function is strictly limited to boolean checkboxes. Mandatory barcode scans and text inputs will purposefully ignore the "Check All" command, ensuring that critical physical checks (like verifying a specific serial number or scanning a high-value item) are never accidentally bypassed.
- **Decision:** We will use event delegation (`data-app-click="checkAllPackerzQA"`) instead of attaching direct event listeners, adhering to the project's Boy Scout Vanilla JS architecture standards.
