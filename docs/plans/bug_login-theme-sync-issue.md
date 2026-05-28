# Implementation Plan - Login Theme Synchronization & Persistence

### Design Decisions & Rationale
We will modify the `.login-container` and `.login-card` CSS structures to consume standard CSS variables (`var(--bg-body)`, `var(--bg-glass)`, `var(--border-color)`, `var(--text-main)`) instead of hardcoded dark slate colors. This allows the AUTHORITY ACCESS login interface to automatically inherit and apply the operator's saved theme preference immediately upon boot, keeping visual styling unified across logout/login transitions.

## Proposed Changes

### [Component Name]

#### [MODIFY] [index.html](file:///d:/GitHub/neogleamz.github.io/index.html)
- Relocate hardcoded colors in `.login-container` from `#020617` to `var(--bg-body)`.
- Update `.login-card` style definitions to use the unified glassmorphic variables `var(--bg-glass)`, `border: 1px solid var(--glass-border)` (or `--border-color`), and `color: var(--text-main)`.
- Transition `.login-field input` to use `var(--bg-input)`, `var(--border-input)`, and `var(--text-main)`.
- Configure `.login-logo` to dynamically swap assets using `content: url('assets/images/neo_logo_orange.png')` for light mode and swap to white logo `neo_logo_white.png` when `[data-theme="dark"]` is active.
- Verify that `#bootProgressArea` elements (`#bootStatusText`, progress tracks) inherit the proper theme colors dynamically.

---

## Verification Plan

### Automated Tests
- Execute `npm run lint` and `npm run test` to verify no regressions in other modules or layout elements.

### Manual Verification
1. Run the local dev server.
2. In the browser, toggle the theme button (e.g. from dark to light mode).
3. Log out to return to the AUTHORITY ACCESS login screen.
4. Verify that the login screen immediately displays in the beautiful light mode theme (soft grey-blue background, light glassmorphic card, dark text, orange logo).
5. Toggle theme, log back in, and ensure it functions cleanly across both states.
