# Neogleamz Task Engine (Architecture Blueprint)

This document serves as the master specification for the proposed Task Engine. It maps out how we will integrate advanced project management directly into the Vanilla JS ecosystem of the Neogleamz application, combining the best mechanics from Asana, Linear, and Monday.com.

> [!NOTE]
> **Brainstorming Document**
> This is a living blueprint for our whiteboard session. We will continuously refine this architecture before we move to the coding phase.

## 1. Core Architecture (Supabase Schema)

To support dependencies, infinite nesting, and cross-module hooks, our database must be strictly relational but highly flexible.

### `taskz` Table
- `id` (UUID, Primary Key)
- `title` (Text)
- `description` (Text)
- `status` (Enum: `Backlog`, `Todo`, `In Progress`, `Blocked`, `Done`, `Canceled`) *(Linear strict statuses)*
- `due_date` (Timestampz)
- `parent_task_id` (UUID, Foreign Key -> `taskz.id` for Subtask nesting)
- `cycle_id` (UUID, Foreign Key -> `cyclez.id` - replacing Milestones with Linear-style timeboxed sprints)
- `linked_module` (Enum: `inventory`, `sales`, `work_orders`, `cfo`, `general`)
- `linked_entity_id` (UUID, referencing specific rows in the target module)
- `estimated_minutes` (Integer, for labor cost forecasting)
- `actual_minutes` (Integer, updated by the Start Timer workflow)
- `metadata` (JSONB, for Monday.com style dynamic custom fields)

### `task_dependencies` Table (Asana Blocker Engine)
- `task_id` (UUID, Foreign Key -> `taskz.id`)
- `blocked_by_id` (UUID, Foreign Key -> `taskz.id`)

### `cyclez` Table (Linear's "Milestones")
- `id` (UUID, Primary Key)
- `title` (Text, e.g., "Cycle 12: Holiday Prep")
- `start_date` (Timestampz)
- `end_date` (Timestampz)
- `color_hex` (Text, for Monday.com style UI styling)

---

## 2. The UX & Navigation (The Vanilla JS Execution)

### The Entry Point
- **Header Button:** A persistent button sitting in the top right of the main App Header (next to Tipz/Settings).
- **The Red Badge (Notifications):** If an automated task is generated (e.g., Inventory Low Stock) or a blocker is removed, a small red notification bubble (like an unread text message) will appear on this header button, alerting you that something needs attention without interrupting your current workflow.
- **Fullscreen Modal:** Clicking the header button instantly summons a massive, fullscreen glassmorphism overlay containing the entire Task Engine. 

### Keyboard Shortcuts (Linear Speed)
- We will bind native Javascript `keydown` listeners to the `document`.
- Hit `T` from anywhere in the app to instantly open the Task Planner modal.
- Once inside the modal, hit `C` to create a new task instantly, bypassing mouse clicks.

### The 3-Way UI View Engine
Inside the modal, the UI will instantly swap between three native Vanilla JS render functions:

1. **The Triage Dashboard (List View):** 
   - A top-down list prioritizing tasks by `due_date`. Groups tasks into "Overdue", "Due Today", and "Upcoming".
2. **The Kanban Board (Status Flow):** 
   - Pure CSS Flexbox columns based on Linear's statuses (`Todo`, `In Progress`, `Done`). 
   - Uses Monday.com style visual "Status Pills" (bright, color-coded badges).
3. **The Calendar Grid (Deadline Map):** 
   - A responsive CSS Grid representation of the month.

---

## 3. The Feature Frankenstein (Asana + Linear + Monday)

### The Dependency Engine (Asana Blockers)
- The "Complete" button is disabled and replaced with a `> [!WARNING]` alert stating: *"Waiting on: [Blocked Task Name]"*.
- Completing the blocker automatically unlocks the dependent task.

### Fast, Rigid Statuses & Cycles (Linear Engine)
- Instead of open-ended, messy folders, we use strict "Cycles" (e.g., a 2-week block of time). This forces momentum and prevents tasks from sitting around forever.
- Strict statuses prevent scope creep. A task is either `Todo`, `In Progress`, or `Done`.

### Visual Toggles & Custom Fields (Monday.com Visuals)
- Leveraging the `metadata` JSONB column, we can build custom fields (Priority, Department). 
- We will render these as massive, bright, clickable pills that instantly swap states when clicked (e.g., clicking a yellow "Medium Priority" pill instantly flips it to a red "High Priority" pill without opening an edit menu).
- Progress roll-ups: Completing a subtask instantly updates a slick Monday.com style progress bar on the parent task.

---

## 4. Deep Module Integrations (Cross-Module Synergy)

The true power of this system is that it physically hooks into the existing Neogleamz architecture. We will transcend standard "To-Do" text lists by turning the tasks themselves into **Embedded UI Wrappers**.

### Actionable Task Payloads (Embedded Modals)
Tasks will not just link you to another page—they will physically embed the relevant tools *inside* the task view itself.
- **Recurring Cycle Counts:** A recurring monthly task called "Warehouse Cycle Count" is generated. When you open the task, it doesn't just say "go count stuff". The **Cycle Count Scanner UI** is physically embedded inside the task body. You use your phone camera to scan right there, and the task automatically marks itself as `Done` when the count is submitted.
- **Low Stockz Triggers:** When a Retail Product hits its `minimum_stock_level`, the automation generates a "Reorder Low Stock" task. When you open this task, the **Low Stockz Report** data-grid is physically injected into the task description area, letting you review exactly what needs ordering without navigating away to the Inventory Hub.

### Global Hooks

- **Inventory (DATAZ/EDITZ):** If a product hits its `minimum_stock_level`, the system auto-spawns a High Priority task: *"Restock SKU-123"*. Clicking the task opens the EDITZ modal instantly.
- **Production Manager:** Converting a Custom Order into a Work Order auto-generates a task timeline (Assembly -> QA -> Boxing).
- **A.I. CFO:** The system schedules automated, recurring tasks on the 1st of every month to *"Review Previous Month True Profit Waterfall"*.

---

## 5. Advanced Enterprise Mechanics (The Superpowers)

To elevate this from a simple tracker to a true Operations Engine, we will implement the following enterprise-grade features:

### A. The SOP Template Engine (Process Street / Asana)
Instead of creating tasks one by one, users can instantiate predefined "Templates".
- **Database Addition:** `task_templates` table defining parent tasks, and a `template_subtasks` table.
- **Workflow:** Clicking "Run Monthly Tax Prep" automatically spawns a Parent Task, generates the 15 required subtasks, and wires up the dependencies between them instantly.

### B. Time Cost vs. Actuals (Harvest / Jira)
Administrative tasks burn labor hours, which directly impacts Net Profit.
- **Database Addition:** Add `estimated_minutes` and `actual_minutes` (Integers) to the `taskz` table. (This logic will also be applied to the Buildz module to track time per assembly step).
- **Workflow:** A "Start Timer" button exists on the task UI. When clicked, it logs active time.
- **CFO Integration:** The A.I. CFO terminal can mathematically calculate exactly how much labor cost is being burned on administrative tasks versus physical product assembly by querying `actual_minutes`.

### C. The Immutable Audit Trail (Jira / Linear)
In complex automated systems, users need to know exactly *why* a task changed state.
- **Database Addition:** `task_activity` table (Columns: `task_id`, `actor_type` [System/User], `action_text`, `timestamp`).
- **Workflow:** Every time a task goes from `In Progress` to `Blocked`, or an automation triggers, the system logs it. The task UI displays a chronological feed (e.g., "System Automation blocked this task at 2:00 PM because SKU-123 ran out of stock").

### D. Dynamic Context Linking (Notion)
Tasks must deeply reference the physical world without clunky dropdowns.
- **Workflow:** When typing a task description, typing `#` triggers a Vanilla JS autocomplete dropdown querying the live database. 
- Typing `#BlackFil` generates a clickable blue pill for "Black Filament (SKU-123)". Clicking the pill from within the task instantly opens the Inventory EDITZ modal.

---

## Finalized Decisions

> [!SUCCESS]
> **Brainstorming Concluded**
> 1. **Task Creation Form:** We will implement a massive, fully-featured screen takeover for the initial build to ensure maximum capability. We can iterate towards a rapid-entry method later.
> 2. **Automations:** We will build the foundational architecture to support "If X, then Y" rules, leaving the specific trigger definitions open for future configuration as business needs arise.
