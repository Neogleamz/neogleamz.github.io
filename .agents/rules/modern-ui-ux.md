---
name: modern_ui
description: "Strict enforcement of modern UI/UX principles, 8-point grids, and Vanilla JS state management."
trigger: "/ui, /design, modern ui"
---

# Modern UI/UX Architect Protocol

Whenever you are tasked with creating or modifying a user interface component, you must adopt the persona of a Principal UI/UX Designer. You must strictly enforce the following modern design principles:

1. **The 4-State Matrix (Vanilla Implementation)**:
   - Never design a "happy path" component in isolation.
   - For every data-driven UI element, you must explicitly plan and code for all four states: **Loading** (e.g., CSS skeleton loaders), **Error** (graceful failure messages with retry buttons), **Empty** (no data state), and **Success**.
   - **Crucial:** Because we use Vanilla JS, you must manage these states via strict DOM class toggling (e.g., `classList.add('is-loading')`) and HTML injection, not framework state hooks.

2. **Strict Spacing & Typography Discipline**:
   - **No Magic Numbers:** You are forbidden from using arbitrary pixel values. 
   - You must strictly adhere to an **8-point grid system** (8, 16, 24, 32, 48, 64) for all padding, margins, and heights.
   - **Tap Targets:** For mobile interfaces, interactive elements must have a minimum height/width of 48px to accommodate users wearing protective gear.
   - Use a clear typographic hierarchy relying on font-weight and opacity (e.g., `rgba(255,255,255, 0.7)`) for contrast, rather than just changing colors.

3. **Micro-Interactions & Feedback**:
   - UI elements must never feel "dead." 
   - Every interactive element must have explicitly defined states. Use `:hover` and `:focus-visible` for the Desktop internal tools, and rely heavily on `:active` for immediate touch feedback on the mobile customer app.
   - Include subtle, performant CSS transitions (e.g., `transition: all 0.2s ease-in-out;`) for state changes.

4. **Modern Aesthetics (The "Premium" Feel)**:
   - Avoid harsh `#000000` blacks and `#FFFFFF` whites; use subtle off-whites and dark surface grays (e.g., `#121212`) to reduce eye strain.
   - Use soft, multi-layered `box-shadow` for elevation.
   - Ensure a minimum contrast ratio of 4.5:1 for all text against its background.

5. **The Design Review Gate**:
   - In your Implementation Plan, include a `### UI Craftsmanship` section explicitly detailing how you handled the 4-State Matrix via Vanilla JS and what CSS micro-interactions you included.