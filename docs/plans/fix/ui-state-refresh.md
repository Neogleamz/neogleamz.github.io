# Goal Description
Resolve the system-wide UI state bug where clicking action buttons (like "Add Row" in EDITZ) triggers an unintended full page reload and resets the user's active view to the default hub.

### Design Decisions & Rationale
Because the entire application is a Vanilla JS Single Page Application (SPA), we rely on `system-event-delegator.js` to handle all click interactions. If a `<button>` or `<a>` element is clicked without explicitly calling `event.preventDefault()`, the browser may execute its native behavior (e.g., submitting a hidden form context or navigating to a `#` anchor). By enforcing `event.preventDefault()` inside the core delegator exclusively for interactive tags (while allowing `<input>` and `<textarea>` elements to remain untouched so they can retain focus), we guarantee that no manual CRUD action will ever trigger a page reload again.

## User Review Required
Please review the proposed change below. Type 'proceed' to execute.

## Proposed Changes

### Core Event System
We will update the master event delegator to intercept and prevent default browser behaviors for all actionable elements that are wired into our `data-click` system.

#### [MODIFY] [system-event-delegator.js](file:///d:/GitHub/neogleamz.github.io/system-event-delegator.js)
- Insert `if (el.tagName === 'BUTTON' || el.tagName === 'A' || el.tagName === 'FORM') { event.preventDefault(); }` at the top of the main `click` event listener (around line 19).

## Verification Plan
### Automated Tests
- Run `npm test` and `npx eslint .` to ensure no syntax flaws or regressions.

### Manual Verification
- Start local server (`127.0.0.1:5500`).
- Open the EDITZ page.
- Fill out the "Add Manual Record" inputs.
- Click `+ Add Row` and verify the data saves, the table updates, and the page remains exactly where it is without a reload.
