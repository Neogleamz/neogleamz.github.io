# High-Level Architecture: Fix Unescaped Quotes in DOM Interpolation

### 1. Context & Objectives
**Business Problem:** Users are unable to interact with Custom Labels, 3D Prints, or Sub-Assemblies in the Recipez pane if the item name contains a double-quote character (e.g., `Glossy 4" x 6"`). 
**Scope:** Identify and patch all instances of unescaped double quotes inside HTML attribute string interpolation, specifically targeting `data-name` attributes in the Vanilla JS rendering functions.

### 2. Architectural Overview (Context Level)
This patch directly impacts the UI rendering engines within the SK8Lytz ecosystem, primarily the `bom-module.js` (Recipez/BOM pane), `ceo-module.js`, and potentially `labelz-module.js`. It ensures that database records retrieved from Supabase containing special characters do not corrupt the local DOM structure when rendered.

### 3. Industry Standard Validation
- **Security & Performance:** *DOM Bug Hunter Agent* validated that injecting a raw `"` into a template literal like `data-name="${name}"` prematurely closes the HTML attribute. This is technically a mild Cross-Site Scripting (XSS) / DOM-clobbering vector, though in this context it simply breaks the UI.
- **Vanilla JS & Data Flow:** Because we are using Vanilla JS string interpolation instead of a Virtual DOM (like React) that auto-escapes attributes, we must manually encode special characters (`"` to `&quot;` and `'` to `\'`).
- **UI/UX Strategy:** Ensures complete stability of the Glanceable UI, allowing users to use natural imperial measurements (like `4"`) in their product names.

### 4. Design Decisions & Trade-offs
- **Decision:** Implement a regex-based string replacement `.replace(/"/g, '&quot;')` alongside the existing single-quote escaping `.replace(/'/g, "\\'")` on all `data-*` attribute interpolations.
- **Trade-off:** Minimal performance overhead during rendering loops, but entirely necessary given the lack of a frontend framework handling sanitization.
