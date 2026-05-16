# Phase 5: The Supabase Data Pipeline (Read/Write)

## Goal Description
The objective of Phase 5 is to transition the Task Engine from a static HTML/CSS UI shell into a dynamic, data-driven application. We will wire up the Supabase Client (`window.supabaseClient`) to execute CRUD operations against the `taskz`, `cyclez`, `teams`, and `task_activity` tables. This ensures tasks can be created, statuses can be updated with audit trails, and the sidebar actively reflects live configuration data.

## Design Decisions & Rationale
To align with the Vanilla JS Zero-Build architecture and avoid heavy framework reactivity, we will implement a centralized memory cache (`let taskEngineDB = { taskz: [], cyclez: [], teams: [] }`). The `initTaskEngine()` function will securely fetch payloads from Supabase on boot and render the DOM. All subsequent mutations (like adding a task or updating a status) will proactively update Supabase first, then patch the local cache and trigger specific UI re-renders, preventing the need for costly full-page reloads.

> [!IMPORTANT]
> **User Review Required**
> 1. **New Task Flow**: When clicking `+ New Task`, should it immediately insert an "Untitled Task" into Supabase and slide open the Context Flyout for the user to fill out, or should it trigger a quick prompt/mini-modal to grab the title first?
> 2. **Board & Calendar Views**: We need to "verify switching to Board and Calendar views successfully filters and sorts the live database payloads." Are the physical HTML layouts for the Kanban Board and Calendar already constructed, or should I scaffold basic CSS Grid representations for them in this phase?
> 3. **Activity Ledger**: When a user changes a task status, we write to `task_activity`. Do you want these logs to be globally visible (e.g. "System: Chris changed Task X to In Progress"), or localized strictly inside that specific task's flyout?

## Proposed Changes

---

### Task Engine Javascript (`task-engine.js`)
We will inject the core asynchronous Supabase data pipeline into the main logic controller.

#### [MODIFY] [task-engine.js](file:///d:/GitHub/neogleamz.github.io/task-engine.js)
*   **Init Bootstrapper**: Add an `async function fetchTaskEngineData()` that pulls `taskz`, `cyclez`, and `teams` via `supabaseClient.from(...)`.
*   **Sidebar Rendering**: Add logic to dynamically inject `<li>` elements into the `.sidebar-section` targeting Cyclez and Teams, replacing static placeholders.
*   **Task Grid Rendering**: Add a `renderTaskGrid()` function that loops through the local `taskEngineDB.taskz` cache and physically builds the spreadsheet grid rows using `window.safeHTML()`.
*   **Creation Hook**: Bind the `+ New Task` button to an async function that inserts a new row into `public.taskz` and re-renders the grid.
*   **Status Mutation Hook**: Implement a status dropdown/pill click handler that updates `public.taskz` and concurrently inserts an audit row into `public.task_activity`.

## Verification Plan

### Automated Tests
*   Run `npx eslint task-engine.js` to verify zero syntactical debt or ES6 violations.

### Manual Verification
*   **Data Fetching**: Verify the sidebar properly displays Teams and Cyclez sourced from Supabase.
*   **Task Creation**: Click `+ New Task`, refresh the page, and verify the task persisted.
*   **Audit Trail**: Change a task status, open the Context Flyout, and verify the `task_activity` system log rendered in the timeline.
