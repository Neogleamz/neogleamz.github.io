# 🏛️ Task Engine Master Blueprint

You are completely right to call me out. I was getting tunnel vision on the CSS layout and failing to architect the UI comprehensively against the massive Supabase schema we built in Phase 2. 

I have halted all UI code and audited the `20260502000000_task_engine_schema.sql` file. Here is the **Definitive Blueprint** mapping every single database table we created to its required UI feature. This will act as our North Star so nothing is forgotten.

---

## 1. Core Task Engine (`taskz` & `task_dependencies`)
*   **The Database:** Tracks title, status, due dates, estimated vs. actual minutes, and dependencies (`blocked_by_id`).
*   **The UI Mapping:**
    *   **The Views:** List Grid (Monday.com style), Kanban Board, and Calendar.
    *   **The Flyout:** Must contain inputs for `estimated_minutes` and a timer to calculate `actual_minutes`.
    *   **Dependencies:** The flyout must have a "Blocked By" section that prevents a task from being marked `Done` until its parent is complete.

## 2. Timeboxing & Sprints (`cyclez`)
*   **The Database:** Tracks start/end dates, colors, and assigned teams for milestones.
*   **The UI Mapping:**
    *   **The Sidebar:** Auto-generates navigation links under `ACTIVE CYCLES`.
    *   **The Milestone Dashboard:** Clicking a cycle replaces the main canvas with a Burn-Down Chart, aggregate completion percentage, and a list of all `taskz` bound to that `cycle_id`.

## 3. Group Identity (`teams` & `team_members`)
*   **The Database:** Tracks logical groupings of users (e.g., Design, Engineering).
*   **The UI Mapping:**
    *   **The Sidebar:** Auto-generates navigation links under `TEAMS`. Clicking one filters the canvas to show only tasks where `assigned_team_id` matches.
    *   **Avatars:** Task rows must display circular avatars generated from the assigned user's initials.

## 4. The Audit Ledger (`task_comments` & `task_activity`)
*   **The Database:** Tracks immutable system logs (e.g., status changes) and user-generated chat messages.
*   **The UI Mapping:**
    *   **Activity Feed:** The bottom of the Context Flyout must render a combined timeline. System actions (`task_activity`) appear as small grey text, while user comments (`task_comments`) appear as chat bubbles.

## 5. Process Street Engine (`task_templates` & `template_subtasks`)
*(This is the major feature I completely missed in my last plan)*
*   **The Database:** Scaffolding for repeatable operating procedures (SOPs).
*   **The UI Mapping:**
    *   **Template Library:** A dedicated view in the sidebar for managing SOPs.
    *   **Template Spawner:** When clicking `+ New Task`, the user must be prompted: "Blank Task or Use Template?". Choosing a template instantly spawns a parent task and all associated `template_subtasks`.

---

## 🗺️ Redefined Execution Phases & Testing Criteria

Because of this audit, the roadmap is now strictly defined with explicit testing gates to ensure no scope is missed:

### ✅ Phase 1 & 2: Architecture & Database Schema
*   **Status:** Complete.
*   **Testing Criteria:** Verify `20260502000000_task_engine_schema.sql` exists and contains 10 explicit tables with Zero-Trust RLS policies enabled.

### ✅ Phase 3: The Base UI Shell
*   **Status:** Complete.
*   **Testing Criteria:** 
    *   Verify the `T` hotkey opens/closes the modal.
    *   Verify the `.h-resizer` allows fluid dragging of the left sidebar.
    *   Verify clicking a task row triggers the slide-out Context Flyout (CSS animation).

### 🟡 Phase 4: Deep UX Synthesis & Command Palette
*   **Status:** Next.
*   **Testing Criteria:**
    *   Verify `Cmd+K` (or `Cmd+P`) toggles the global search palette.
    *   Verify the UI list view renders as a strict Monday.com-style spreadsheet grid.
    *   Verify status pills are color-coded (e.g., Green = Done, Red = Blocked).
    *   Verify the Context Flyout activity feed mimics Asana's timeline layout.

### ⏳ Phase 5: The Supabase Data Pipeline (Read/Write)
*   **Status:** Pending.
*   **Testing Criteria:**
    *   Verify clicking `+ New Task` writes a record to the `public.taskz` table in Supabase.
    *   Verify sidebar dynamically renders active `cyclez` and `teams` fetched from the database.
    *   Verify updating a task status triggers an automatic `task_activity` log insertion.
    *   Verify switching to `Board` and `Calendar` views successfully filters and sorts the live database payloads.

### ⏳ Phase 6: The Process Street Engine
*   **Status:** Pending.
*   **Testing Criteria:**
    *   Verify clicking `+ New Task` prompts for "Blank" vs "Template".
    *   Verify selecting a Template spawns a parent task and auto-generates child rows in `public.taskz` based on `template_subtasks`.
