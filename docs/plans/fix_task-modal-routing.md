### Design Decisions & Rationale
We are utilizing the existing `system-event-delegator.js` event-bus architecture to capture clicks from the global Command Palette without polluting the DOM with inline listeners or complex state hooks. The "Go to Inbox" routing leverages the existing `click_teSwitchView_inbox` token, while "Create New Task" will introduce a new `click_teOpenTaskPlanner` token directly mapped to the globally scoped `window.openTaskPlanner` function, maintaining our strict Vanilla JS component boundaries.

### UI Craftsmanship
This fix strictly enforces the Vanilla DOM Mastery rules by simply adding data-attribute tokens to existing semantic HTML structures. No framework dependencies or heavy re-renders are required, preserving the instant, lightweight micro-interactions already styled in the Command Palette.

### Proposed Changes

#### [MODIFY] [index.html](file:///d:/GitHub/neogleamz.github.io/index.html)
- Inject `data-click="click_teSwitchView_inbox"` onto the `cmd-palette-item` wrapper for "Go to Inbox".
- Inject `data-click="click_teOpenTaskPlanner"` onto the `cmd-palette-item` wrapper for "Create New Task".

#### [MODIFY] [assets/js/system-event-delegator.js](file:///d:/GitHub/neogleamz.github.io/assets/js/system-event-delegator.js)
- Add a new `case 'click_teOpenTaskPlanner':` inside the central switch statement.
- Wire it to execute `if (typeof window.openTaskPlanner === 'function') window.openTaskPlanner();`.

### Verification Plan
1. **Automated Tests**: Execute `npx eslint .` to guarantee no syntax debt was introduced.
2. **Manual Verification**: Run the local server, press `CTRL+K` to open the palette, and verify clicking both the Inbox and Create Task options perfectly trigger the respective functions and close the palette contextually.
