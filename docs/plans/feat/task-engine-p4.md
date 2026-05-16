### Design Decisions & Rationale
We are transforming the generic list view into a rigid Monday.com-style spreadsheet matrix utilizing a pure CSS Grid layout (`display: grid`) to ensure columns align perfectly across rows without fixed-pixel width hacks. The Cmd+K Command Palette will be a centralized vanilla JS event listener tied to the global `document.addEventListener('keydown')`, overlaying a glassmorphic search input with instant visual feedback. The Context Flyout's Activity feed will adopt an Asana-inspired vertical timeline using native CSS `border-left` connectors and interleaved chat/system pill boxes.

## Proposed Changes

### 1. Global Command Palette (Cmd+K)
- **[NEW] `neoCommandPalette` DOM Structure**: Introduce a new `#neoCommandPalette` div in `index.html` acting as an absolute modal overlay (z-index: 20000).
- **[MODIFY] Keyboard Event Listener**: Update `neogleamz-engine.js` to map `Ctrl+K` and `Cmd+K` (via `event.metaKey || event.ctrlKey`) to toggle the visibility of the palette, instantly preventing default browser search (`event.preventDefault()`) and calling `.focus()` on the input.
- **[NEW] CSS Styling**: A sleek, centered search bar with frosted glass background (`backdrop-filter`) and a dropdown list of simulated "Quick Actions" (e.g., *Go to Inbox*, *Create Task*).

### 2. Monday.com Spreadsheet Grid Refactor
- **[MODIFY] CSS Grid Engine**: Refactor `.task-row` in `index.html` (style block) from `display: flex` to `display: grid` with explicit column definitions (e.g., `grid-template-columns: minmax(250px, 1fr) 50px 120px 100px 100px;`).
- **[NEW] Header Row**: Inject a new `.task-grid-header` row directly above the tasks inside the `.task-canvas` with column titles: Task, Owner, Status, Timeline, Priority.
- **[MODIFY] Status Pills**: Replace raw text states with standardized color-coded flex pills matching the design system:
  - `Done` (Neon Green background)
  - `Blocked` (Neon Red background)
  - `In Progress` (Neon Blue background)
  - `To Do` (Muted Gray)

### 3. Asana-Style Activity Timeline
- **[NEW] Timeline CSS**: Create a `.task-timeline-container` in the Context Flyout Activity section. Use a left-hand border (`border-left: 2px solid rgba(255,255,255,0.1); padding-left: 15px; margin-left: 10px;`) to draw the vertical connecting line.
- **[MODIFY] Node Rendering**: Render system events (e.g., *Chriviper changed status to In Progress*) as small, muted dots positioned relatively over the timeline line, and user comments as larger chat bubble blocks, matching Asana's distinct UX density.

## Verification Plan

### Automated / Browser Checks
1. **Cmd+K Testing**: Press `Cmd+K` (Mac) or `Ctrl+K` (Windows). Verify the global palette appears and auto-focuses the input field. Press `Esc` to safely close.
2. **Grid Layout Check**: Open the Task Engine (`T` hotkey). Verify the task rows align structurally perfectly with the top header columns regardless of viewport width.
3. **Timeline Inspection**: Click a task to open the Context Flyout. Scroll to "ACTIVITY" and verify the visual presence of a continuous vertical timeline connecting the system events and chat bubbles.
