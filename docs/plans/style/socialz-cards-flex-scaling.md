# Implementation Plan - Socialz Cards Flex & Scaling Fix

Provide a robust, responsive flexbox/grid architecture for the SOCIALZ audience list to ensure cards scale smoothly, snap perfectly to columns, and never chop off on the right across any viewport widths.

## Design Decisions & Rationale
We chose to refactor the grid system using a modern, fluid CSS Grid layout based on standard media queries and clean element-level constraints (`min-width: 0`). Wiping out and overriding the grid classes with hardcoded Tailwind-like shims in JS resulted in missing CSS rules (like `md:grid-cols-2` and `xl:grid-cols-3` clashing with `socialz-roster-grid`) and container overflow. By retaining the dedicated `socialz-roster-grid` class, simplifying `toggleViewMode` in JS, and injecting `min-width: 0` to break the grid item minimum-content size calculations, we ensure the cards scale dynamically and scroll gracefully.

## Proposed Changes

### [Component Name] SOCIALZ CRM Layout & Styles

#### [MODIFY] [index.html](file:///d:/GitHub/neogleamz.github.io/index.html)
- Clean up and standardize the `.socialz-roster-grid` class in the CSS section:
  - Add explicit column spans and gap sizing for responsive widths.
  - Simplify and align the media query boundaries (`768px` for 2 columns, `1150px` for 3 columns, and `1600px` for 4 columns) to fit cards smoothly.
  - Fix any layout combinators (like replacing `#socialz-tab > .executive-pane > .bom-layout > .grid` with descendant selectors that match correctly).

#### [MODIFY] [socialz-module.js](file:///d:/GitHub/neogleamz.github.io/assets/js/socialz-module.js)
- Update `toggleViewMode` function:
  - When switching to grid view, apply the clean and descriptive class `socialz-roster-grid transition-all duration-300 min-w-full` instead of fragile utility overrides.
- Update `renderSkaters` rendering function:
  - Inject `min-width: 0;` to the `.socialz-influencer-card` container style to break grid-cell minimum size constraints.
  - Set `min-width: 0; width: 100%;` on the inner card wrapper flex container.
  - Adjust the social bar flex styles to handle overflowing buttons gracefully.

## Verification Plan

### Automated Tests
- Run `npm test` and `npx eslint .` to ensure no javascript regressions or syntax flaws.

### Manual Verification
- Deploy locally using Live Server.
- Open the SOCIALZ audience tab in the browser.
- Resize the browser window from `320px` up to widescreen `1920px`.
- Verify the cards scale down dynamically, snap to 2 and 3 columns smoothly without any overlapping, and that the right side is never chopped off.
