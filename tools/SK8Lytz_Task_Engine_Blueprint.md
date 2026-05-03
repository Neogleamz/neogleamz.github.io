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
- `assigned_to_id` (UUID, Foreign Key -> `auth.users`)
- `assigned_team_id` (UUID, Foreign Key -> `teams.id`)
- `created_by_id` (UUID, Foreign Key -> `auth.users`)
- `metadata` (JSONB, for Monday.com style dynamic custom fields)

### `teams` & `team_members` Tables (Group Identity)
- **`teams`**: `id` (UUID), `name` (Text, e.g., "3D Print Creators"), `color_hex` (Text)
- **`team_members`**: `team_id` (UUID), `user_id` (UUID, -> `auth.users`)

### `task_dependencies` Table (Asana Blocker Engine)
- `task_id` (UUID, Foreign Key -> `taskz.id`)
- `blocked_by_id` (UUID, Foreign Key -> `taskz.id`)

### `task_comments` Table (Jira/Asana Threading)
- `id` (UUID, Primary Key)
- `task_id` (UUID, Foreign Key -> `taskz.id`)
- `author_id` (UUID, Foreign Key -> `auth.users`)
- `content` (Text, Rich Markdown)
- `created_at` (Timestampz)

### `cyclez` Table (Linear's "Milestones")
- `id` (UUID, Primary Key)
- `title` (Text, e.g., "Cycle 12: Holiday Prep")
- `start_date` (Timestampz)
- `end_date` (Timestampz)
- `color_hex` (Text, for Monday.com style UI styling)

---

## 2. UI/UX Craftsmanship (The Executive Polish)

To ensure this feels like a premium, enterprise-grade tool rather than a generic to-do list, we will strictly enforce the following UI/UX architecture natively within Vanilla JS:

### The Premium Entry Point & Glassmorphism
- **Header Button & Notification Badge:** A persistent button sitting in the top right of the main App Header. If an automated task is generated, a sleek `.badge-red-neon` bubble pulsates subtly to draw attention without breaking focus.
- **The Screen Takeover:** Clicking the button instantly summons the `.modal-overlay`. We will use deep `backdrop-filter: blur(12px)` over a dark `#0A0A0A` gradient to create a massive, floating glassmorphism workspace that feels distinct from the background modules.

### The Split-Pane Canvas (Layout Geometry)
Inside the massive modal, we will utilize Neogleamz's standard `<div class="bom-layout">` separated by an `.h-resizer`:
- **Left Sidebar (The Navigation Spine):** A narrow, 250px column housing your Filters ("My Tasks", "Due Today"), standard Cycles, and Template generators. 
- **Right Canvas (The View Engine):** The massive area where the tasks actually render. It instantly swaps between three native Vanilla JS render functions:
  1. **Triage Dashboard (List View):** Clean, horizontally stacked rows.
  2. **Kanban Board:** Pure CSS Flexbox columns (Todo -> In Progress -> Done).
  3. **Calendar Grid:** A responsive CSS Grid mapping deadlines visually.

### The Sliding Context Panel (Zero Context Switching)
- **The Anti-Modal Rule:** When you click a specific Task to view its details, it does **not** open another modal on top of the modal. 
- **The Flyout:** Instead, a sleek Context Panel slides in from the right edge of the screen (CSS `transform: translateX(0); transition: 0.3s ease;`).
- **The Payload:** This right-side panel houses the description, the Subtask checklists, the "Start Timer" button, and crucially, the **Embedded Actionable Modals** (like the Cycle Count scanner). You can interact with the embedded tools while still seeing the main task list to your left.

### Micro-Interactions & The 4-State Matrix
- **Hover Elevations:** Every task row/card uses subtle CSS transitions (`box-shadow: 0 4px 12px rgba(0,0,0,0.5); transform: translateY(-1px);`) on hover.
- **Quick Actions:** Hovering over a task row subtly reveals Ghost Buttons (`.btn-ghost-green` for Complete, `.btn-ghost-red` for Delete) that remain hidden otherwise to keep the UI clean.
- **The 4-State Compliance:** The engine will explicitly render beautiful states for **Loading** (pulsing CSS skeleton blocks), **Empty** (a clean illustration with a neon "Create First Task" button), **Error** (API failure bounds), and **Success**.

### Keyboard Speed (Linear Architecture)
- We will bind native Javascript `keydown` listeners to the `document`.
- Hit `T` from anywhere in the app to instantly open the Task Planner modal.
- Once inside, hit `C` to instantly focus a new task creation input line, bypassing the mouse entirely.

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

### Neogleamz-Specific Operations (The ERP Command Center)

- **FULFILLZ (Embedded Packing & Printing):** When a high-priority Custom Order comes in, a task is created to "Pack & Ship Order #1042". The task itself renders the `PACKERZ` checklist (with `[SCAN]` and `[IMG]` validation tokens) and embeds the `manualPrintModal` controls. You scan the final item, click "Print Label", it fires to your PrintNode API, and the task auto-completes.
- **SOCIALZ (CRM Auto-Triage):** For managing sponsored skaters or key customers in the SOCIALZ Roster, you can set a rule: "Remind me to follow up with John Doe in 30 days." The task physically renders the `.skater-card` for John Doe (including his Lifetime Value metrics) inside the task body so you can reach out without losing context.
- **IMPORTZ (Sandbox Reconciliation):** A recurring monthly task is generated for financial reconciliation. Inside that task, we physically embed the `sandboxDataModal`. You can drag-and-drop the Shopify CSV right into the task. The task intelligently verifies that the `customCommitFn` succeeded before it allows you to mark the task as `Done`.
- **MAKERZ (Intelligent SOP Checklists):** When creating a task for an employee to "Build 50 Sub-Assemblies", the task pulls the specific JSON array from the `production_sops` table and renders the exact step-by-step checklist inside the task. By leveraging the `actual_minutes` tracker, the task records exact execution time for A.I. CFO labor calculations.

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

## 6. Multi-User Identity & Team Assignment Engine

To support true task delegation, the application must transition from a "single global login" to distinct user identities leveraging **Supabase Auth**, alongside a powerful Group/Team structure.

### Supabase Authentication & Teams
- **The Core Roster:** We will initialize distinct Supabase Auth user accounts for the owners (Chris, Andy, Tyson). 
- **The Teams Architecture:** We will create logical Groups (e.g., "3D Print Creators", "Fulfillment Team", "Founders"). A user can belong to multiple teams.
- **Session Caching:** Upon login, the user's UUID, Profile Data (Name, Color Hex, Avatar), and their `team_ids` will be cached securely in `localStorage` to avoid unnecessary DB reads.

### Task & Milestone Assignment Mechanics
- **Dual Assignment Capabilities:** A task can be assigned directly to an individual (`assigned_to_id`) OR to a whole team (`assigned_team_id`). 
- **Inbox Routing:** If a task like "Design New Deck" is assigned to the "3D Print Creators" team, it will instantly hit the Universal Inbox of *both* Chris and Andy. The first one to acknowledge and start it can optionally take ownership of the task.
- **The UI Avatars:** Task rows and Kanban cards will display the Assignee's Avatar (e.g., a green circle with 'C' for Chris), or an overlapping multi-avatar icon if assigned to a Team.
- **Personalized Dashboards:** The "My Tasks" filter mathematically queries `taskz` where `assigned_to_id === currentUser.id` OR `assigned_team_id IN (currentUser.team_ids)`.
- **The True Audit Trail:** The `task_activity` table will accurately log exactly *who* inside the team took the action (e.g., "Andy (3D Print Creators) moved this to Done").

---

## 7. Deep Tracking & Communication Engine (The Industry Standards)

To rival the deep functionality of Jira and Monday.com, we must implement these tracking and communication pillars:

### The Universal Inbox (Linear/Asana)
- **The Problem:** Tasks assigned to you get lost in massive backlogs.
- **The Solution:** A dedicated "Inbox" tab. When Chris assigns Andy a task, or someone comments on a task Andy follows, it hits the Inbox. The Inbox serves as a triage center. Once Andy reads the comment or updates the task, he hits `E` to "Archive/Clear" the notification, keeping the Inbox strictly at Inbox Zero.

### Infinite Subtask Nesting & Visual Rollups (Monday.com)
- **The Problem:** A parent task like "Launch New Deck Graphic" has 15 steps. Tracking progress is binary (Done/Not Done), which is inaccurate.
- **The Solution:** Because `taskz.parent_task_id` allows infinite nesting, we will dynamically calculate a parent's completion percentage. If 3 of 5 subtasks are completed, the UI renders a massive, Monday.com-style progress bar at `60%`. 
- **Metrics Tracking:** As subtask actual_minutes are logged, the parent task dynamically aggregates the total labor hours spent on the entire Epic, visible at a glance.

### Activity Feeds & Rich Text Comments (Jira)
- **The Problem:** Team communication happens in Slack/Text, entirely disconnected from the actual work context.
- **The Solution:** The `task_comments` table. The bottom of the Context Slide-out Panel will be a real-time chat thread specific to that task. 
- **Rich Context:** The input field will support Markdown (bolding, lists, and code blocks like Notion). You can @mention other users to immediately trigger an Inbox notification for them.

### Custom Saved Views (Jira JQL)
- **The Problem:** Operations requires viewing the data differently (e.g., Andy only wants to see his tasks; Chris wants to see all High Priority blocked tasks).
- **The Solution:** The sidebar will feature "Saved Views". We will serialize complex filter logic into `localStorage`. You can build a view for "Tasks > Due This Week > In Progress > Assigned to Tyson" and pin it to the navigation spine for instant 1-click access.

---

## Finalized Decisions

> [!SUCCESS]
> **Brainstorming Concluded**
> 1. **Task Creation Form:** We will implement a massive, fully-featured screen takeover for the initial build to ensure maximum capability. We can iterate towards a rapid-entry method later.
> 2. **Automations:** We will build the foundational architecture to support "If X, then Y" rules, leaving the specific trigger definitions open for future configuration as business needs arise.
