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

The true power of this system is that it physically hooks into the existing Neogleamz architecture.

- **Inventory (DATAZ/EDITZ):** If a product hits its `minimum_stock_level`, the system auto-spawns a High Priority task: *"Restock SKU-123"*. Clicking the task opens the EDITZ modal instantly.
- **Production Manager:** Converting a Custom Order into a Work Order auto-generates a task timeline (Assembly -> QA -> Boxing).
- **A.I. CFO:** The system schedules automated, recurring tasks on the 1st of every month to *"Review Previous Month True Profit Waterfall"*.

---

## Finalized Decisions

> [!SUCCESS]
> **Brainstorming Concluded**
> 1. **Task Creation Form:** We will implement a massive, fully-featured screen takeover for the initial build to ensure maximum capability. We can iterate towards a rapid-entry method later.
> 2. **Automations:** We will build the foundational architecture to support "If X, then Y" rules, leaving the specific trigger definitions open for future configuration as business needs arise.
