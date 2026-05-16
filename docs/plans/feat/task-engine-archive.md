# Task Engine Archive Implementation Plan

### Design Decisions & Rationale
We are implementing a soft-delete mechanism by injecting an `is_archived` boolean across the `taskz`, `cyclez`, and `teams` tables in Supabase. This prevents accidental data loss, protects our zero-trust ledger, and maintains historical fidelity across task activity and dependencies. The UI will introduce a dedicated "Archive" tab under "My Views", which will render segmented tables for archived items, exposing strict "Restore" and "Permanently Delete" actions via Vanilla JS event delegation.

## User Review Required

> [!WARNING]
> This plan changes the existing hard-delete behavior for Cycles and Teams into soft-deletes (archiving). When a user clicks the "X" to delete a cycle or team, it will now be archived instead, and can only be permanently deleted from the dedicated Archive View. Let me know if this behavior is correct.

## Proposed Changes

---

### Supabase Database Schema

#### [NEW] `supabase/migrations/20260503000000_add_archive_flags.sql`
- Add `is_archived BOOLEAN DEFAULT false` column to `public.taskz`, `public.cyclez`, and `public.teams`.

---

### UI Structure (`index.html`)

#### [MODIFY] `index.html`
- **Sidebar Menu**: Inject a new `<div class="task-nav-link" data-click="click_teSwitchView_archive">🗄️ Archive</div>` item underneath the "Completed" tab in the "MY VIEWS" sidebar section.
- **Context Flyout**: Inject an "Archive" button (e.g., a trash can or archive box icon) into the `#taskContextFlyout` header next to the close button.
- **Archive Wrapper**: Create a new DOM container (`#te-archive-view-wrapper`) sibling to the `#te-task-rows-wrapper`. This will house three separate flexbox grids for "Archived Tasks", "Archived Cycles", and "Archived Teams".

---

### Task Engine Core Logic (`task-engine.js`)

#### [MODIFY] `task-engine.js`
- **Filtering Logic**: 
  - Update `teRenderSidebar()` to exclude any cycles and teams where `is_archived === true`.
  - Update `teRenderTaskGrid()` to exclude `is_archived` tasks from all standard views (Inbox, List, My Tasks, etc.).
- **View Routing**: 
  - Update `teSwitchView(viewId)` to toggle visibility between `#te-task-rows-wrapper` and `#te-archive-view-wrapper`. When `viewId === 'archive'`, trigger the new `teRenderArchiveView()` function.
- **Archive Renderer (`teRenderArchiveView`)**: 
  - Build a function that iterates through `taskEngineDB` and dynamically injects HTML rows for every item flagged as `is_archived: true`.
  - Each row will contain the item's name/title, type (Task/Cycle/Team), and two action buttons: `Restore` and `Permanently Delete`.
- **Supabase Mutations**: 
  - Add `teArchiveEntity(type, id)`, `teRestoreEntity(type, id)`, and `teHardDeleteEntity(type, id)` to execute the `UPDATE` or `DELETE` queries against Supabase, update the local `taskEngineDB`, and re-render the UI.

---

### Event Management (`system-event-delegator.js`)

#### [MODIFY] `system-event-delegator.js`
- Add case statements for the new archive actions:
  - `click_teSwitchView_archive` -> Calls `teSwitchView('archive')`
  - `click_teArchiveTask` -> Calls `teArchiveEntity('task', id)`
  - `click_teRestoreEntity` -> Extracts `type` and `id`, calls `teRestoreEntity(type, id)`
  - `click_teHardDeleteEntity` -> Extracts `type` and `id`, calls `teHardDeleteEntity(type, id)`
- Remap the existing `click_teDeleteCycle` and `click_teDeleteTeam` cases to trigger `teArchiveEntity` instead of hard deletion.

## Verification Plan

### Automated Tests
- Run `npm test` and `npx eslint .` to guarantee zero syntax regressions and that existing Engine tests continue to pass.

### Manual Verification
- Execute `npx supabase db push` to synchronize the schema.
- Create a dummy Task, Cycle, and Team.
- Archive them via the UI to ensure they disappear from the active views.
- Navigate to the Archive tab to confirm they appear correctly.
- Restore them to verify they return to the active state.
- Permanently delete them to verify they are purged from the database.
