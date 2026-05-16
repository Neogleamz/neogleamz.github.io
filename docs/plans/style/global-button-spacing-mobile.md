# Global Button Spacing for Mobile (style/global-button-spacing-mobile)

Objective: Refactor global button spacing on all pages and modals to ensure visual balance and create massive tap targets matching the 48px constraint required for mobile interfaces (accommodating users with wrist protective gear).

### Design Decisions & Rationale
We are implementing a CSS strict minimum dimension mapping using a `@media screen and (max-width: 768px)` override to force all primary DOM interaction targets (`button`, `.btn-ghost-base`, `.tab-btn`, `.pane-header-actions button/select`, etc.) to exactly hit the 48px minimum height. This cleanly segregates the Desktop-First density needs of the internal tools from the chunky Mobile-First expectations of the handheld experience without needing any JavaScript reflows.

## Proposed Changes

### [MODIFY] index.html

We will surgically inject a new CSS `@media` block to globally capture and enforce mobile tap constraints on standard interactive components.

1. **Global Element Overrides**:
   - Force `.btn-ghost-base`, `button`, `.tab-btn`, `.sub-nav-btn`, `.top-action-btn`, and `.back-hub-btn` to inherit `min-height: 48px !important;` and `min-width: 48px !important;` under the `max-width: 768px` break point.
   - Adjust `font-size: 14px !important;` and `padding: 12px 16px !important;` to ensure text scales comfortably inside the enlarged touch boxes.

2. **Tight-Area Constraints (Pane Headers)**:
   - Expand `.pane-header-actions button, .pane-header-actions select, .pane-header-actions input` which are currently locked to `24px` on desktop. We will force them to `48px` height on mobile.
   - We will ensure `.pane-header-actions` wrapper uses `flex-wrap: wrap; gap: 12px;` so the enlarged elements do not shatter the flexbox container horizontally.
   - We will tweak the `.btn-action-dense` class (which currently sets a 44px height override) to hit the required `48px`.

## Verification Plan

### Automated Tests
- N/A - This is purely a CSS geometry change. 

### Manual Verification
1. Render the HTML and view the interface.
2. Shrink the browser below 768px width using Browser Developer Tools device emulator.
3. Ensure standard Ghost buttons, Tab buttons, and action buttons properly scale to 48px high.
4. Verify the Pane Headers wrap correctly and don't overflow the sides.
