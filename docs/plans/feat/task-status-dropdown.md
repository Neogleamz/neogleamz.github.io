# Status Selector Refactor

This plan details the process of migrating the Task Engine's task status controls from a click-to-cycle sequence to an explicit contextual dropdown menu utilizing Vanilla JS DOM manipulation.

### Design Decisions & Rationale
To preserve the 100% Vanilla JS architecture without creating performance bottlenecks, we will build a single, globally-shared absolute-positioned dropdown (`#te-status-dropdown`). Instead of injecting identical dropdown DOM nodes into hundreds of individual task rows, clicking any status pill will dynamically calculate its `getBoundingClientRect()` and snap the shared overlay cleanly below the active element. This maintains fluid, native performance while granting precise mutation control.

![Task Status Dropdown Mockup](file:///C:/Users/Chriviper/.gemini/antigravity/brain/80a8f76e-60c9-4040-a89a-c5bab3b309da/task_status_dropdown_mockup_1777785526901.png)

## User Review Required

> [!IMPORTANT]
> The single, global dropdown approach uses `overflow` manipulation internally but relies on the user clicking the pill again or clicking off the element to close the context panel. This is identical to the current `Assignee` selector.

## Proposed Changes

---

### `system-event-delegator.js`

We will re-map the existing status action token to intercept clicks and route them to our new native dropdown orchestrator instead of the legacy cycle logic.

#### [MODIFY] [system-event-delegator.js](file:///d:/GitHub/neogleamz.github.io/system-event-delegator.js)
- Update `case 'click_teCycleStatus'` (or add new token) to dynamically extract the `taskId` and execute `window.teOpenStatusDropdown(taskId, el)`.
- Inject a new `case 'click_teSetStatus'` that extracts the target status from a `data-status` attribute on the dropdown child elements, and triggers the `window.teSetStatus(status)` database logic.

### `task-engine.js`

We will implement the DOM manipulation engine and refactor the backend mutation calls to accept explicit statuses.

#### [MODIFY] [task-engine.js](file:///d:/GitHub/neogleamz.github.io/task-engine.js)
- **Delete** `window.teCycleStatus` and its legacy index-stepping array loop.
- **Implement** `window.teOpenStatusDropdown`:
  - Dynamically spawn `<div id="te-status-dropdown">` and append it directly to `document.body` if it does not exist.
  - Calculate `getBoundingClientRect` of the clicked pill and assign precise `top` and `left` pixel coordinates to overlay smoothly.
  - Inject four contextual, hover-reactive DOM nodes representing `Todo`, `In Progress`, `Blocked`, and `Done` using the existing styling classes (`status-todo`, `status-blocked`, etc.).
- **Implement** `window.teSetStatus`:
  - Read the temporarily stored `taskId` from the dropdown component.
  - Port over the previous `isSubtask` metadata traversal logic to ensure the proper Supabase column (`metadata` vs `status`) and `task_activity` logs are correctly generated.
  - Trigger `renderTE()` to gracefully update the view without refreshing.

## Verification Plan

### Automated Tests
- Run `npm test` to ensure existing math matrices are untouched.
- Run `npm run lint` to enforce ESLint strict scoping rules.

### Manual Verification
- Test status changes on parent tasks in Row, Kanban, and Board views.
- Test status changes on deeply nested subtasks within the Context Flyout to verify the JSON structure updates cleanly.
- Verify the global click-off event successfully hides the absolute-positioned dropdown.
