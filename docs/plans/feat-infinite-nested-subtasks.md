# Infinite Nested Subtasks Implementation Plan

### Design Decisions & Rationale
To enable infinite subtask nesting in a pure Vanilla JS architecture, we will convert the flat rendering loop inside `teRenderTaskGrid` into a recursive algorithm. This natively structures parent-child DOM nodes dynamically, leveraging `SortableJS` on every nested `.te-sortable-subtask-list` container. We will also introduce recursive ancestor and descendant tracking in the filtering logic to ensure deeply nested subtasks remain visible and properly indented, no matter how deep the user builds the hierarchy.

> [!TIP]
> This approach natively leverages the existing `parent_task_id` schema relationship in Supabase without requiring any backend or database modifications.

![Task Engine Infinite Nesting Concept](/C:/Users/Chriviper/.gemini/antigravity/brain/e7991174-136b-4bc0-902d-83a73d2a8b6f/task_engine_infinite_subtasks_concept_1779317859000.png)

## User Review Required
> [!IMPORTANT]
> The UI will use a cumulative `24px` left padding per depth level to visually indicate hierarchy. Does this meet your expectations for the visual layout, or would you prefer a different geometric offset for deeper subtasks?

## Proposed Changes

### Task Engine UI & Hierarchy Logic

#### [MODIFY] [task-engine.js](file:///d:/GitHub/neogleamz.github.io/assets/js/task-engine.js)
- **Recursive Rendering (`teRenderTaskGrid`)**:
  - Extract the row-building logic from the `group.tasks.forEach` loop into a new function: `function renderRecursiveTask(t, displayTasks, depth)`.
  - The function will render the task's row, find its children, and then recursively call `renderRecursiveTask` for each child, nesting them inside the `.te-sortable-subtask-list` wrapper.
  - Call `renderRecursiveTask` inside the cycle loop to seed the top-level tasks.
- **Recursive Hierarchy Gathering**:
  - Replace the 1-level `children.forEach` logic at the top of `teRenderTaskGrid` with a recursive `getAllDescendants(taskId)` and `getAllAncestors(taskId)` to ensure the full tree is populated when filters (like search or 'My Tasks') are applied.
- **Visual Polish (`teBuildTaskRowHTML`)**:
  - Add an optional visual indicator (like a smaller font weight or subtle connector line) if `depth > 0` to enhance the nested hierarchy feel.

## Verification Plan

### Automated Tests
- `npm run lint` and `npx eslint .` to ensure no syntax flaws or unused variables.

### Manual Verification
1. Open the Task Engine UI.
2. Create a top-level task.
3. Add a subtask via the inline UI or flyout panel.
4. Drag a third task into the subtask (creating a sub-subtask).
5. Verify the dropzones expand correctly and the UI indents cumulatively.
6. Refresh the page to verify the DB perfectly persisted the infinite hierarchy relationship.
