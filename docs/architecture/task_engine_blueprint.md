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

## 🗺️ Redefined Execution Phases

Because of this audit, the roadmap is now strictly defined:

- ✅ **Phase 1:** Architecture & Ledger Sync
- ✅ **Phase 2:** Supabase Relational Schema
- ✅ **Phase 3:** The Base UI Shell (Modal, Split-Pane, Flyout)
- 🟡 **Phase 4: The Deep UX Synthesis** (Injecting the Monday.com Grid, the Asana Activity Feed, and the Linear `Cmd+K` Palette).
- ⏳ **Phase 5: The Supabase Data Pipeline** (Wiring the `teams`, `cyclez`, and `taskz` to the UI via JS fetch calls).
- ⏳ **Phase 6: The Process Street Engine** (Building the Template spawner).
