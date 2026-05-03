# 🦅 Task Engine Phase 3: The UI Takeover

This plan outlines the architecture for the frontend visualization of the Task Engine. We are building a massive, premium glassmorphism modal that overtakes the screen, providing a split-pane layout and a slide-out Context Panel without triggering nested modals.

## 🧠 Design Decisions & Rationale
To maintain strict adherence to the Vanilla JS / Zero-Build rule, the entire Task Engine UI will be constructed using native DOM nodes styled via `index.html`'s global CSS block. The layout leverages pure Flexbox and CSS Grid for the split-pane mechanics and responsive scaling. The sliding Context Panel utilizes hardware-accelerated CSS transforms (`translateX`) instead of JavaScript width animations to ensure 60fps micro-interactions on both desktop and mobile views. The entire system hooks into our existing `system-event-delegator.js` using strict `data-click` tokens to prevent memory leaks.

> [!IMPORTANT]
> **User Review Required**
> Please review the proposed HTML injection zones and architectural strategy. If approved, I will immediately execute the HTML, CSS, and JS wiring.

## ❓ Open Questions

> [!WARNING]
> 1. Do you want the left-side Navigation Spine inside the Task Planner to be manually resizable using our standard `.h-resizer` logic, or strictly locked at a fixed width (e.g., 250px)?
> 2. What specific shade/gradient do you want for the massive glassmorphism backdrop? I plan to use `rgba(10, 10, 10, 0.85)` with `backdrop-filter: blur(12px)`.

---

## 🛠️ Proposed Changes

### 1. `index.html` (DOM Injection)
#### [MODIFY] `index.html`
- **The Trigger:** Inject `<button id="taskPlannerBtn" class="top-action-btn" data-click="click_openTaskPlanner">🎯 Tasks <span class="badge-red-neon" style="display:none;"></span></button>` into the `.top-controls` block near the user badge.
- **The Screen Takeover:** Inject the massive `<div id="taskPlannerModal" class="modal-overlay task-engine-overlay">` just before the closing `</body>` tag.
- **The Split-Pane Canvas:** Inside the modal, structure a `<div class="bom-layout">` housing a 250px sidebar (`.task-sidebar`), an `.h-resizer`, and a massive flex canvas (`.task-canvas`).
- **The Context Panel:** Inside the `.task-canvas` wrapper, add a right-anchored `<div id="taskContextFlyout" class="task-flyout hidden">` that slides in over the canvas when a task is clicked.
- **The CSS Block:** Inject native CSS rules into the `<style>` block for `.task-engine-overlay`, `.task-sidebar`, `.task-canvas`, `.task-flyout`, and the `.badge-red-neon` micro-animations.

---

### 2. `task-engine.js` (The New Core Module)
#### [NEW] `task-engine.js`
- Create a dedicated module to encapsulate Task Engine rendering logic to avoid bloating `ceo-module.js` or `app.js`.
- Export initialization functions and attach them to the global `window` object for the Event Delegator.

---

### 3. `system-event-delegator.js` (Interaction Wiring)
#### [MODIFY] `system-event-delegator.js`
- Add `click_openTaskPlanner` to cleanly display the modal and trigger an initial render cycle.
- Add `click_closeTaskPlanner` to purge the DOM state and hide the modal.
- Add `click_openTaskContext` to toggle the `.task-flyout` visibility.

---

### 4. `app.js` (Keyboard Architecture)
#### [MODIFY] `app.js`
- Bind a global `document.addEventListener('keydown')` interceptor.
- If the user presses `T` (and is not currently typing in an input field), trigger `click_openTaskPlanner`.
- If the user presses `C` while the Task Planner is open, immediately focus the "New Task" input field to mimic Linear's keyboard-first architecture.

---

## 🧪 Verification Plan

### Automated Tests
- Run `npx eslint .` to guarantee no syntax errors or unused variables.

### Manual Verification
- We will visually verify the glassmorphism styling in the browser.
- We will trigger the modal using the `T` key to ensure the global keyboard listener functions natively.
- We will trigger the Context Slide-out to ensure CSS transitions execute smoothly.
