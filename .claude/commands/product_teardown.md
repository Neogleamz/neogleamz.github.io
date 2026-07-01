---
model: opus
description: Workflow: product_teardown
---

# The Passive Product Teardown Protocol

Whenever the user requests to inspect a competitor app, reverse-engineer a UI pattern, or requests a "teardown" before starting an Epic, you must execute this mapping sequence.

1. **Ingestion & Reconnaissance**: 
   - Analyze user-provided screenshots or HTML fragments.
   - If a live URL is accessible (or the user's browser context has an active authenticated session), deploy the `browser_subagent` to explore the specific DOM architecture, CSS flexbox strategies, and event listener behaviors (e.g. click to edit, blur to save).
2. **Deconstruction (The 4-State Matrix)**: 
   - Ensure the teardown accounts for Loading, Error, Empty, and Success states.
   - Break down how the UI manages state without a framework (e.g., hidden inputs, `contenteditable`, localized CSS class toggles).
3. **Artifact Generation**:
   - Create an AI-readable Markdown artifact named `[Product]_Teardown_Map.md` (e.g., `Asana_Teardown.md`).
   - The map MUST include:
     - **UI Architecture**: Explicit HTML structure patterns.
     - **CSS Topology**: How flexbox/grid is utilized.
     - **Interaction Logic**: The exact Vanilla JS logic needed to mimic the behavior (e.g. `element.addEventListener('focusout', ...)`).
4. **Hard Stop (Passive Mode)**:
   - Provide the roadmap artifact to the user.
   - **CRITICAL RULE**: Do not write the actual feature code yet. Present the roadmap and wait for the user to trigger the formal Epic planning workflow (like `[/bucketlist]`) to implement it into the project.
