# Legacy Audit: `task-engine.js` (Vanilla JS Enforcement)

### Design Decisions & Rationale
We are executing the `/legacy_audit` sweep on `task-engine.js` to bring it into strict compliance with our Vanilla JS philosophy. This file primarily renders the complex Task Engine UI. Since `onclick` handlers were already successfully migrated to `data-click` tokens in a previous refactor, our focus here is strictly on security and layout integrity. 
We will wrap all `innerHTML` assignments with the `window.safeHTML()` protocol to prevent XSS payloads if a user injects scripts into task titles or descriptions. Furthermore, we will strip all legacy `onmouseover`, `onmouseout`, `onfocus`, and `onblur` inline handlers, replacing them with fluid CSS classes (`hover-bg-white`, `hover-opacity`, etc.) to guarantee responsive, flicker-free rendering.

> [!WARNING]
> **User Review Required**
> Please review the verification plan closely. You will need to manually interact with various parts of the Task Engine to ensure the hover effects and layouts didn't regress when moved to CSS classes.

## Proposed Changes

### `assets/js/task-engine.js`
- **[MODIFY]** Strip all inline hover effects (`onmouseover="this.style.opacity=1"` etc.) and replace them with standard utility classes like `.te-hover-opacity`, `.te-hover-bg`, and `.te-focus-border`.
- **[MODIFY]** Wrap all 22+ instances of `.innerHTML = ` string generation in `window.safeHTML ? window.safeHTML(...) : ...` to enforce zero-trust data rendering.
- **[MODIFY]** Ensure tags and sections inputs use proper CSS for focus states instead of inline DOM manipulation.

### `index.html`
- **[MODIFY]** Inject the missing Task Engine specific CSS utility classes into the global `<style>` block (e.g. `.te-hover-opacity:hover { opacity: 1 !important; }`).

## Verification Plan

### Manual Verification Actions (To Test)
Once the code is written, you will need to open `http://127.0.0.1:5500` and manually test the following zones in the Task Engine (Press `T` or open Tasks via the hub):

1. **Hover Effects on UI Elements:**
   - Hover over the **Project list items** (specifically the close `X` icons) to verify they light up correctly without throwing errors.
   - Hover over the **Cycle Groups (Sections)** expand/collapse arrows and delete buttons.
   - Hover over the **"Create New Task"** inline addition rows.
   - Hover over **Tags** inside the task detail modal.

2. **Focus States on Inputs:**
   - Click to edit a **Tag Name** in the Manage Tags modal; verify the border lights up blue (`#3b82f6`) on focus and resets on blur.

3. **Data Rendering Security (`innerHTML`):**
   - Create a test task with a basic title like `<b>Bold Task</b>`. Ensure it renders safely and doesn't unexpectedly break the layout or execute scripts.
   - Open a project, switch between views (List, Board, Calendar), and ensure the data loads properly into the DOM without `safeHTML` syntax errors.
