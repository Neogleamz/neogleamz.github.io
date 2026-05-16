# Socialz & Global Modals Tailwind Purge

Cleanly replacing residual Tailwind utility classes with standard SK8Lytz Vanilla HTML/CSS variables across the three designated modals.

### Design Decisions & Rationale
Currently, `#skater-modal`, `#ltv-metrics-modal`, and `#analytics-modal` are heavily reliant on hardcoded `.hidden`, `flex`, `grid`, `w-full` tailwind utility classes, which violate our strictly zero-build Vanilla JS rule. Since no Tailwind compiler runs on the project, these classes are either falling back to a massive polyfill block inside `<style>` or causing visual inconsistencies. To fix this, we will rip out all Tailwind strings and replace them with standard DOM `<div class="modal-overlay">` mapping, using standard inline flex styling or custom `.css` rules to standardize spacing globally.

## User Review Required
> [!WARNING]
> Because the Skater Modal uses `grid md:grid-cols-3` to handle mobile responsiveness, replacing it with Vanilla CSS flex-wraps or defined grid templates via an inline `<style id="socialz-css">` tag will be required. Please confirm this raw CSS injection is acceptable.

## Proposed Changes

### `index.html`

#### [MODIFY] `index.html` (Styles Header)
- Remove the `/* TAILWIND SHIM POLYFILL FOR CARDS... */` polyfill block containing the `.rounded-2xl`, `.shadow-sm` hacks to shed weight.
- Inject a tiny explicit block for `.socialz-grid-layout` utilizing native `display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr))` to elegantly replace Tailwind's media queries for the skater modal inputs.

#### [MODIFY] `index.html` (Body Layouts)
- **`#skater-modal`**: Convert the `<div class="fixed inset-0...">` to `<div class="modal-overlay" id="skater-modal" style="display:none...">`. Convert the header back to `.pane-header-bar` / `.pane-header-actions` structure. Remove all `p-4`, `text-slate-500` tailwind attributes, swapping them out with native `<br>`, padded `<div>`s, and `color: var(--text-color)`.
- **`#ltv-metrics-modal`**: Convert the outer wrapper to standard `.modal-overlay`. Strip `flex`, `gap-3`, and replace with `style="display:flex; flex-direction:column; gap:10px;"`.
- **`#analytics-modal`**: Strip the Tailwind completely, mapping it back to a standard modal shell.

## Verification Plan

### Manual Verification
1. I will boot `127.0.0.1:5500` in isolated testing mode and attempt to open SOCIALZ -> `+ ADD SKATER`. 
2. We will confirm the modal looks identically clean on desktop without any Tailwind dependencies.
3. We will do the same for the LTV Metrics popout.
