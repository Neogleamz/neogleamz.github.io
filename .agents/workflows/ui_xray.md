---
name: ui_xray
description: "A strict diagnostic workflow to visually analyze and correct Vanilla DOM layout collisions by structurally highlighting boundaries."
trigger: "/ui_xray, /xray, debug css layout, show boundaries"
---

# UI X-Ray Debugger Workflow 

When the user invokes `/ui_xray` (or says "debug this layout", "show boundaries"), you must act as the UI Diagnostic Debugger and execute the following sequence:

1. **The Core Hook (Visual Injection)**:
   - Identify the primary structural file being debugged (usually `@/index.html`).
   - Use your code tools to inject the following exact string block precisely before the `</head>` closing tag:
     ```html
     <!-- X-RAY MACRO -->
     <style id="ui-xray-debugger">
       * { 
         outline: 1px solid rgba(255, 0, 0, 0.5) !important; 
         background: rgba(0, 255, 0, 0.05) !important;
       }
       div { outline: 1px solid rgba(0, 150, 255, 0.8) !important; }
       span { outline: 1px solid rgba(255, 100, 0, 0.8) !important; }
       button, svg { outline: 1px solid rgba(255, 255, 0, 0.8) !important; }
     </style>
     ```
     *(This CSS bypasses internal application state hooks to visually force every flex container, span, and button into stark relief).*

2. **Scanner Integration (Observation)**:
   - Request the user to reload the local application `http://127.0.0.1:5500` (or whichever port is active).
   - If you have access to a `browser_subagent` terminal natively, launch it to view the page. Otherwise, explicitly ask the user for a **full screenshot** of the affected UI element.
   - Wait for the user to provide the image data.

3. **Analysis & Diagnosis**:
   - Analyze the X-Ray macro outlines shown in the screenshot.
   - Identify the exact flexbox logic conflict (e.g., rigid absolute margins fighting `justify-content`, or missing `min-content` clamps squeezing a title bar).
   - Draw a short Mermaid `graph TD` diagram illustrating the current nested DOM structure versus what it SHOULD be formatted as natively.
   - Present your theory on the exact CSS bug. wait for user approval.

4. **The Tear-Down**:
   - Once the user agrees with the diagnosis, immediately use your tools to **remove the X-Ray Macro** from `index.html`.
   - Implement the approved Vanilla CSS fixes utilizing fluid flexbox scaling (`min-content`, `max-content`, `wrap`) in place of dirty hacks, exactly as defined by the application's Master Reference architecture. 

5. **Re-Scan and Confirm**:
   - Confirm the macro tag is deleted and the CSS is patched. Wait for the user to confirm the visual fix on their end.
