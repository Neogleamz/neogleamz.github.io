---
name: responsive_ui
description: "Strict UI layout constraints, separating internal desktop tools from mobile customer apps."
trigger: always_on
---

# UI Architecture & Browser Standards Rule

Whenever you are tasked with generating an Implementation Plan, writing code, or refactoring anything involving User Interface (UI), you must strictly adhere to the following standards based on the feature's context:

1. **Context-Aware Layout Execution**:
   - **For Internal Business Tools (e.g., Production Manager):** Execute a **Desktop-First** strategy. Prioritize wide-aspect ratio layouts, data-dense tables, and robust sidebar navigation over mobile patterns.
   - **For the Customer-Facing App (e.g., Skate Light Controller):** Execute a **Mobile-First** strategy. Prioritize single-column layouts, massive tap targets (for skaters with wrist guards), high contrast, and bottom-anchored controls.

2. **Vanilla HTML/CSS/JS Exclusivity**:
   - You are explicitly prohibited from injecting React, Vue, TypeScript, or heavy Node-based framework build-chains.
   - All styling and DOM interactions must execute cleanly using native Javascript and linked `.css` stylesheets.

3. **Fluid Responsiveness**:
   - Whether targeting desktop or mobile, the UI must gracefully scale. Use flexible layout systems (like Flexbox or CSS Grid) and relative units (`%`, `vw`, `vh`, `rem`) to manage window resizing and different screen sizes without breaking the layout.

4. **Implementation Plan Requirement**:
   - When drafting an Implementation Plan, you must add a subsection under your Rationale titled `### UI & Browser Strategy`.
   - In this section, briefly explain whether the feature targets Internal Desktop or Customer Mobile, and how your proposed code maintains standard browser compatibility within our vanilla HTML/JS ethos.
