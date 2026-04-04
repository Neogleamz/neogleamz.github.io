---
description: Mandatory UI Design and Layout Protocol for Neogleamz Web Platform
---

# Neogleamz UI Development Standards

**⛔ CRITICAL DIRECTIVE: Every modification, new hub, module, page, or component added to this application MUST strictly adhere to these standards. If you are an AI generating or modifying code, violation of these rules is a critical failure.**

---

## 1. Global CSS Variable Strictness

*   **Absolutely No Hardcoded Hex Colors for Backgrounds/Text.** You must rely strictly on the unified token system:
    *   `var(--bg-body)` - Global backing map.
    *   `var(--bg-glass)` - High-blur translucent panels (major overlays).
    *   `var(--bg-panel)` - Primary solid cards/blocks.
    *   `var(--bg-input)` - Form elements/dropdowns.
    *   `var(--border-color)`, `var(--border-input)` - Strict border colors.
    *   `var(--text-heading)`, `var(--text-main)`, `var(--text-muted)` - Strict typography coloring.
*   **Aesthetics Exception:** You may use explicit hex branding colors (e.g., `#F79320`, `#3b82f6`, `#10b981`) selectively for *buttons, badges, icons, and chart elements ONLY*, as long as they provide passing contrast ratios on both light and dark backgrounds.

---

## 2. Structural & Layout Mandates

*   **Use CSS Flexbox or Grid for Everything.**
*   **No Hardcoded `px` for layout sizing.** Use fluid units instead:
    *   `clamp(min, preferred, max)` — for font sizes, padding, gaps
    *   `%`, `vw`, `vh`, `fr` — for widths, heights, gaps
    *   *Fixed `px` is ONLY permitted for icons, badges, small decorative elements, and border widths (1px, 2px).*
*   **Zero Inline Overrides unless impossible.** All standard margins and padding should defer to external CSS classes where possible.

---

## 3. Scrollbar & Overflow Governance

*   **Never Declare `::-webkit-scrollbar` Locally.** The `index.html` file governs scrollbars globally. Forbidden from overriding inside module CSS unless explicitly hiding via `display: none` (e.g., `.sub-nav`).
*   Use standard `overflow-y: auto` to let the global scrollbar bind.
*   **Global scrollbar spec (single source of truth in `index.html`):**
    *   Width: `8px` — Color: Teal `rgba(45,212,191,0.45)` idle — Orange `rgba(247,147,32,0.85)` on hover
*   **No `custom-scroll` or `custom-scrollbar` classes.** These have been purged. All scrollable elements inherit the global framework automatically.

---

## 4. Resizer Dividers

*   **All split-pane drag dividers MUST use `class="h-resizer"` or `class="v-resizer"`.** No inline styles, no local color overrides, no JS `onmouseover` hover hacks.
*   **Global resizer spec (single source of truth in `index.html`):**
    *   Color: Teal `#2dd4bf` — Width: `12px` (h-resizer), Height: `10px` (v-resizer)
    *   Drag indicator: `⋮` unicode character via CSS `::after` with teal glow on hover
*   **Template:**
    ```html
    <div class="h-resizer" onmousedown="initMyResize(event)"></div>
    ```

---

## 5. Pane Header Bar (MANDATORY for ALL Executive Panes)

Every `executive-pane` **MUST** use a single `.pane-header-bar` as its first child. This replaces the old floating `.pane-title` pattern which wasted vertical space.

### Golden Rule
One compact flex row. Title on the left. Action buttons on the right. No separate button row below. No fixed heights.

### CSS Spec

```css
.pane-header-bar    → flex row, clamp() padding, border-bottom, bg-glass
.pane-header-title  → orange #FF8C00, uppercase, clamp() font-size and letter-spacing
.pane-header-actions → flex wrap, gap via clamp(), justify flex-end
.pane-header-actions button → width:auto !important, clamp() padding and font-size
```

### Mandatory HTML Template

```html
<!-- Title only (no actions) -->
<div class="executive-pane">
    <div class="pane-header-bar">
        <span class="pane-header-title">PAGENAME</span>
    </div>
    <div class="nav-zone left" onclick="..."><i>‹</i></div>
    <div class="nav-zone right" onclick="..."><i>›</i></div>
    <div class="bom-layout" style="flex-grow:1; min-height:0;">
        ...content...
    </div>
</div>

<!-- With action buttons -->
<div class="executive-pane">
    <div class="pane-header-bar">
        <span class="pane-header-title">PAGENAME</span>
        <div class="pane-header-actions">
            <button class="btn-blue">⚙️ ACTION</button>
            <button class="btn-green">📦 ACTION</button>
        </div>
    </div>
    <div class="nav-zone left" onclick="..."><i>‹</i></div>
    <div class="nav-zone right" onclick="..."><i>›</i></div>
    <div class="bom-layout" style="flex-grow:1; min-height:0;">
        ...content...
    </div>
</div>
```

### Rules
*   **NEVER** use `position: absolute` on the pane title.
*   **NEVER** add a separate button row div below the header bar.
*   **NEVER** add a fixed `height` or `min-height` to `.pane-header-bar`.
*   Button sizing inside `.pane-header-actions` is auto-governed by the CSS class. Do not add inline `padding` or `font-size` overrides.
*   The `.pane-title` class is **deprecated for layout use** — it no longer has `position:absolute`. It is kept as a pure style token only. Use `.pane-header-title` inside `.pane-header-bar` going forward.

---

## 6. Standard Utility Classes

Always reuse these provided classes before writing inline CSS:

| Class | Purpose |
|---|---|
| `.pane-header-bar` | Standard executive pane header container (flex row) |
| `.pane-header-title` | Orange uppercase pane title within `.pane-header-bar` |
| `.pane-header-actions` | Flex container for action buttons in header |
| `.h-resizer` | Horizontal split-pane drag divider (teal, with drag icon) |
| `.v-resizer` | Vertical split-pane drag divider (teal) |
| `.modal-overlay` | Standardized glassmorphic full-screen fixed backdrop for popups |
| `.btn-orange`, `.btn-blue`, `.btn-green`, `.btn-red` | Standard colored action buttons |
| `.icon-btn` | Small circular icon button |
| `.empty-state` | Formatting for empty tables/carts/data rows |
| `.section-hdr` | Orange section headers within pane content |
| `.bom-layout` | Standard two-column layout (sidebar + main) inside panes |

---

## 7. New Hub / Module Checklist

When creating any new hub, sub-pane, or feature module, verify ALL of the following before committing:

- [ ] All pane headers use `.pane-header-bar` + `.pane-header-title` template
- [ ] All split-pane dividers use `.h-resizer` or `.v-resizer`
- [ ] No `custom-scroll`, `custom-scrollbar`, or local `::-webkit-scrollbar` declarations
- [ ] No fixed `px` heights on layout containers (use `clamp()` or flex)
- [ ] All button colors use `btn-*` classes, no inline hover JS hacks
- [ ] All background/text colors use `var(--*)` tokens (not hardcoded hex)
- [ ] New modals use `.modal-overlay` class
