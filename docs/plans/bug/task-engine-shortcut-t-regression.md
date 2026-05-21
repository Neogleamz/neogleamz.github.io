# Fix Task Engine 'T' Shortcut Regression

Restore the 'T' shortcut behavior within the Task Engine so that pressing 'T' directly activates the inline task creation for the "No Section" bucket, instead of opening the Task Planner modal. 

### Design Decisions & Rationale

I chose to directly query the DOM for the `.te-inline-add-row[data-cycle-id=""] .te-inline-container` element which represents the "No Section" bucket inline add row. If this container exists, we trigger the existing `window.teActivateInlineTask()` function on it, safely converting the row into a textarea. This is a robust Vanilla JS approach that perfectly re-uses our existing task creation logic without mutating global state.

## Proposed Changes

### Task Engine

#### [MODIFY] [task-engine.js](file:///D:/GitHub/neogleamz.github.io/assets/js/task-engine.js)
- Update the global `keydown` event listener for the 'T' key.
- Replace the toggling of the Task Planner modal with a `querySelector` for the "No Section" inline add container (`.te-inline-add-row[data-cycle-id=""] .te-inline-container`).
- If found, invoke `window.teActivateInlineTask(noSectionContainer)`.
- If not found (e.g., on views without the list UI), gracefully fallback to opening the Task Planner modal.

## Verification Plan

### Manual Verification
- Navigate to the Task Engine List view.
- Press 'T' and verify that the "No Section" bucket transforms into an active text input.
- Type a task and hit Enter to confirm a task is created.
- Verify that standard inputs (like typing 't' inside a textbox) do not trigger this shortcut.
