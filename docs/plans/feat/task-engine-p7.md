# Phase 7: Communication & Inbox (Universal Triage)

The goal of this phase is to establish the communication and routing pipeline within the Task Engine, converting it from a basic tracking system into an active command center. 

## Design Decisions & Rationale
We are implementing a dual-feed architecture using Vanilla JS. 
1. **The Universal Inbox**: A global feed placed in the main sidebar that aggregates activity (comments, blockers) on tasks relevant to the user, allowing for "Inbox Zero" triage.
2. **Context Flyout Depth**: Deepening the slide-out task panel to recursively fetch and display subtasks (with `x/y` completion rollups) and a real-time chronology of both system `task_activity` logs and user `task_comments`. This avoids heavy full-page reloads and adheres to the SPA / zero-build ethos.

## User Feedback Addressed

> [!SUCCESS]
> **Identity Spoofer (Testing Mode)**
> As per your feedback, we will build a "Simulate User" dropdown directly into the Task Engine UI. This will write to `localStorage` (e.g. `neogleamz_current_user`), allowing you to open multiple browser tabs/profiles, set one to Chris, one to Andy, and test how the Universal Inbox routes tasks specifically to each logged-in identity!

## Proposed Changes

### `index.html`
- **[MODIFY]** Inject an `📥 Inbox` tab directly at the top of the Task Engine sidebar (`#task-manager-modal .neogleamz-sidebar`).
- **[MODIFY]** Inject a "Simulate User" `<select>` dropdown in the top header to mock Auth (Chris, Andy, Tyson) and write to `localStorage`.
- **[MODIFY]** Update the `#taskContextFlyout` HTML skeleton to house the dynamic `subtasks-container` and `activity-feed-container`.
- **[MODIFY]** Add a rich-text input field (a stylized `<textarea>`) and "Post Comment" button to the flyout.

### `task-engine.js`
- **[MODIFY]** Expand `teFetchAllData()` to also query `task_comments` and `task_activity`. Store them in `taskEngineDB.comments` and `taskEngineDB.activity`.
- **[MODIFY]** Implement `teSwitchView('inbox')` to render the global triage list, filtering events to those relevant to the spoofed `neogleamz_current_user`.
- **[MODIFY]** Implement `teChangeIdentity(userId)` to handle the "Simulate User" dropdown and refresh the views.
- **[MODIFY]** Implement `teOpenTaskContext(taskId)` to query `taskz.filter(t => t.parent_task_id === taskId)` and calculate the progress rollup (e.g., "2/5 Completed").
- **[MODIFY]** Implement `teRenderSubtasks(taskId)` to allow adding and toggling nested subtasks via Vanilla JS DOM manipulation.
- **[MODIFY]** Implement `teRenderActivityFeed(taskId)` to chronologically interleave system actions and user comments inside the flyout.
- **[MODIFY]** Implement `tePostComment(taskId)` to push raw text payloads to Supabase `task_comments`.

### `system-event-delegator.js`
- **[MODIFY]** Add global routing events for:
  - `click_teSwitchView_inbox`
  - `click_teAddSubtask`
  - `click_teToggleSubtask`
  - `click_tePostComment`

## Verification Plan

### Automated Tests
- Run `npm test` to ensure zero regressions across CEO, Inventory, and Production engines.
- Run `npx eslint .` to check syntax.

### Manual Verification
1. Open Task Engine, click the "Inbox" tab, and verify chronological event stacking.
2. Open a specific Task via the Context Flyout.
3. Add a subtask, mark it complete, and watch the `(1/1)` progress fraction natively rollup.
4. Type a comment, hit Post, and verify it instantly syncs to the Activity feed and Supabase.
