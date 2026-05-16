# List View Column Sorting & Prioritization

Implement global task sorting by columns and enable drag-and-drop prioritization within cycles in the List View.

## User Review Required

> [!WARNING]
> Drag-and-drop prioritization requires restructuring how task rows are rendered. To ensure subtasks travel with their parent tasks when dragged, we must wrap both the parent row and its subtask container inside a unified `<div class="task-group-container">`. This is a structural DOM change, but will not affect the visual layout.
> 
> Also, column sorting and drag-and-drop prioritization are inherently conflicting states. If you sort a column alphabetically by Owner, the manual prioritization order is overridden until you clear the sort. 

### Design Decisions & Rationale
We are utilizing the already bundled `SortableJS` library to enable drag-and-drop on the List View (similar to the Kanban board). To persist priorities, we will inject a new `metadata.sort_order` integer into the Supabase JSONB payload rather than writing a new database migration. For column sorting, we will rely on a new Vanilla JS local state variable `window.teCurrentSort` to re-render the view dynamically without excessive server roundtrips.

## Proposed Changes

### Task Engine Core Logic

#### [MODIFY] [task-engine.js](file:///d:/GitHub/neogleamz.github.io/task-engine.js)
- **DOM Restructure:** In `teRenderTaskGrid`, wrap the parent task row and its associated `<div id="te-subtasks-wrapper-...">` in a master `<div class="te-list-sortable-item" data-id="${t.id}">`.
- **SortableJS Initialization:** After setting the `innerHTML` of the grid, query all `#te-cycle-group-*` elements and initialize `new Sortable()` on each.
- **Priority Persistence:** Add an `onEnd` callback to the Sortable instance that loops through the DOM children, extracts their `data-id`s, assigns them an incremental `metadata.sort_order`, and executes a bulk Supabase `UPDATE` to save the new order.
- **List View Default Sorting:** Update the data filtering loop in `teRenderTaskGrid` to `sort()` the `group.tasks` array by `t.metadata.sort_order` (ascending) by default.
- **Column Sorting Logic:** Introduce `window.teCurrentSort = { col: null, dir: 'asc' };`. Update `teRenderTaskGrid` to override the default `sort_order` if `teCurrentSort.col` is active.
- **Column Click Handlers:** Add `teSortColumn(columnName)` logic to the global namespace.

#### [MODIFY] [system-event-delegator.js](file:///d:/GitHub/neogleamz.github.io/system-event-delegator.js)
- **Event Binding:** Map `click_teSortColumn` to the new sorting function.

#### [MODIFY] [index.html](file:///d:/GitHub/neogleamz.github.io/index.html)
- **Header Interactivity:** Update the List View header row (Task, Owner, Status, Timeline, Priority) to include `cursor: pointer;` and `data-click="click_teSortColumn"` attributes.
- **Visual Feedback:** Inject dynamic sort indicators (e.g., `▲`/`▼`) based on active sort state.

## Verification Plan

### Automated Tests
- Run `npm test` and `npx eslint .` to ensure no JS regressions.

### Manual Verification
1. Click the "Owner" and "Status" headers to verify the tasks re-sort alphabetically natively.
2. Grab a task row in the List View and drag it above another task. Drop it, and verify the position persists across page reloads.
