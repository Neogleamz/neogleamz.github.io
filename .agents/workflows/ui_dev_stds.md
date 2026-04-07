---
description: Mandatory UI Design and Layout Protocol for Neogleamz Web Platform
---

# UI Development Standards for Neogleamz

This workflow establishes the mandatory structural rules for building, modifying, and updating User Interfaces within the Neogleamz application ecosystem. Any AI agent modifying the UI MUST follow these protocols.

## Executive Pane Layout Standards
When building or restructuring top-level module dashboards (e.g., `DATAZ`, `PACKERZ`, `BATCHEZ`, `STATZ`):
- All executive panes **MUST** utilize `<div class="pane-header-bar">` and anchor their module titles inside `<span class="pane-header-title">`.
- **Absolute Title Centering:** To prevent horizontal and vertical baseline jumping between modules with varying command buttons, `.pane-header-title` elements must strictly use full geometric centering (`left: 50%; top: 50%; transform: translate(-50%, -50%);`).
- **Header Structure:** `.pane-header-bar` wrappers handling interactive flex content MUST apply fixed minimal bounds (e.g., `min-height: clamp(35px, 4vh, 45px);`) to strictly enforce a static vertical center.
- **Prohibited Aesthetics:** Structural wrappers handling internal core content (such as `.bom-layout`) **MUST NOT** deploy full horizontal boundaries (e.g. `border-top: 1px solid var(--border-color);`) beneath the pane index. The intended look is a borderless, floating content area directly beneath the large title.
- Responsive padding should be configured centrally via CSS `clamp()` bounds on layout wrappers, avoiding hardcoded pixel values.

## Scope of Rules
**IMPORTANT:** The Button Positioning rules below apply **EXCLUSIVELY** to SOP Editor Modals (e.g. `BATCHEZ`, `LAYERZ`, `PACKERZ` SOP editing interfaces). General website pages and modals (e.g., standard work order generation, sales dashboards) should not have their existing positioning structures forcibly modified unless specifically requested by the user.

## Button Positioning (SOP Editors Only)
When building or modifying SOP Interfaces (Inline Edit Modes, Modal Editors):
- All command buttons (e.g., "Print SOP", "SAVE MASTER BLUEPRINT", "🔒 EDIT") must be anchored strictly to the **top-right** corner of their respective container or modal header.
- Left-side header real estate must be reserved exclusively for titles, module descriptions, or breadcrumbs.

## Form and Telemetry Elements (Sitewide)
- Checkboxes, Radio toggles, and any adjacent dynamic text must be styled as a singular `flex` line. 
- You MUST ensure textual wrappers use `flex: 1` rather than absolute widths like `width: 100%`. This guarantees text grows organically alongside the toggle button, rather than aggressively wrapping underneath it and ruining the list structure.
- Naming Conventions: Use strict terminology. "Audited Telemetry Checklist" is to be referred to simply as `CHECKLIST`, and Live Previews must be labeled `CHECKLIST PREVIEW`.

## Deletion of Ghost Modules / Legacy Code
If you encounter UI components (e.g., empty `<input>` bars, useless `<button>` objects) that do not possess functionally mapped JavaScript payloads:
1. **DO NOT auto-delete.**
2. **Checks and Balances Protocol:** You must alert the user that a ghost element was found. Present the name/ID of the ghost module and ask for explicit permission to prune it from the file.
3. Keep a logged record of the component before proceeding with the removal to ensure the user is aware of what structural properties were just altered.
