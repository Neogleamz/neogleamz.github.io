---
glob: "**/*.{html,css,js,ts,jsx,tsx}"
---

# Desktop-First Browser Standards Rule

Whenever you are tasked with generating an Implementation Plan, writing code, or refactoring anything involving User Interface (UI), frontend components, or layout structures, you must strictly adhere to the following standards:

1. **Desktop-First Execution**:
   - The primary consumption format for this application is a native Desktop Web Browser (e.g., Chrome/Edge/Firefox).
   - Prioritize wide-aspect ratio layouts, data-dense tables, and robust sidebar navigation over collapsed mobile hamburger menus.

2. **Vanilla HTML/CSS/JS Exclusivity**:
   - You are prohibited from injecting React, Vue, TypeScript, or any heavy Node-based framework build-chains.
   - All styling and DOM interactions must execute cleanly using native Javascript and linked `.css` stylesheets without requiring a pre-compiler.

3. **Fluid Desktop Responsiveness**:
   - While Desktop is the priority, the UI must still gracefully scale down for smaller browser windows or occasional tablet views.
   - Use flexible layout systems (like Flexbox or CSS Grid) and relative units (%, vw, vh) to manage window resizing.

4. **Planning Phase Requirement**:
   - When drafting your Implementation Plan, you must add a subsection under your Rationale titled `### UI & Browser Strategy`.
   - In this section, briefly explain how your proposed code ensures standard browser compatibility and maintains the vanilla HTML/JS ethos.
