---
description: Mandatory UI Design and Layout Protocol for Neogleamz Web Platform
---

# Neogleamz UI Development Standards

**⛔ CRITICAL DIRECTIVE: Every modification, new hub, module, page, or component added to this application MUST strictly adhere to these standards. If you are an AI generating or modifying code, violation of these rules is a critical failure.**

## 1. Global CSS Variable Strictness
*   **Absolutely No Hardcoded Hex Colors for Backgrounds/Text.** You must rely strictly on the unified token system:
    *   `var(--bg-body)` - Global backing map.
    *   `var(--bg-glass)` - High-blur translucent panels (major overlays).
    *   `var(--bg-panel)` - Primary solid cards/blocks.
    *   `var(--bg-input)` - Form elements/dropdowns.
    *   `var(--border-color)`, `var(--border-input)` - Strict border colors.
    *   `var(--text-heading)`, `var(--text-main)`, `var(--text-muted)` - Strict typography coloring.
*   **Aesthetics Exception:** You may use explicit hex branding colors (e.g., `#F79320`, `#3b82f6`, `#10b981`) selectively for *buttons, badges, icons, and chart elements ONLY*, as long as they provide passing contrast ratios on both light and dark backgrounds.

## 2. Structural & Layout Mandates
*   **Use CSS Flexbox or Grid for Everything.** 
*   **Zero Hardcoded Width/Height for Layout Containers.** Modals, sidebars, and panels must be defined fluidly (e.g., `width: clamp(320px, 90vw, 800px)`). 
    *   *Hardcoded sizes (`px`) are ONLY permitted for icons, badges, and small buttons.*
*   **Zero Inline Overrides unless impossible.** All standard margins and padding should defer to external CSS classes where possible. Do not clutter DOM injected via JS with generic inline styles if a class handles it.

## 3. Scrollbar & Overflow Governance
*   **Never Declare `::-webkit-scrollbar` Locally.** The `index.html` file governs scrollbars globally at the highest level of the DOM. You are forbidden from overriding global scrollbars inside targeted module CSS unless absolutely architecturally required (e.g., totally hiding a specific scrollbar via `display: none`). 
*   Use standard `overflow-y: auto / overflow-y: overlay` to let the global scrollbar bind.

## 4. Standard Utility Classes
*   Always reuse the provided classes before writing inline CSS:
    *   `.custom-scrollbar` - Safely assigns the globally defined scrollbar parameters.
    *   `.modal-overlay` - Safely provides the standardized glassmorphic full-screen fixed backdrop for popups/modals.
    *   `.btn-sm`, `.btn-xs`, `.btn-icon-sq` - Standard action sizing.
    *   `.empty-state` - Formatting for empty tables/carts/data rows.
    *   `.section-hdr` - Orange section headers.
