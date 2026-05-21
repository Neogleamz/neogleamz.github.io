# Hide 3D Printed SOPs in Stage 3

### Design Decisions & Rationale
We are modifying `production-module.js` where the `sopGroups` array is populated during Stage 3 (In Production). Since Batchez workers assemble products using 3D printed parts (which are manufactured in the Layerz module), they do not need to see the 3D printer operation SOPs, even if the routing engine detects a stock shortage and flags the 3D part to be "built". We will simply intercept the `is3D` flag during the SOP aggregation loop and `return` early, omitting 3D printed components from the Batchez UI.

## User Review Required
> [!NOTE]
> This will only hide 3D printed sub-assemblies from the SOP list. The parts will still appear in the Pick List (Stage 2) so workers know they need them, and the routing engine will still correctly flag them as needing to be built (for Layerz to handle). 

## Open Questions
> [!TIP]
> Should I also explicitly hide the Main Assembly SOP if the *entire* work order happens to be for a single 3D printed part? (Usually, those WOs are handled entirely inside the Layerz tab, but let me know if we should enforce the block there too just in case).

## Proposed Changes

### Production Module

#### [MODIFY] [production-module.js](file:///d:/GitHub/neogleamz.github.io/assets/js/production-module.js)
- **Target:** `renderActiveWO()` around line 1338.
- **Change:** Inject `if (is3D) return;` immediately after the `is3D` boolean check inside the `wo.routing` loop. This will prevent 3D printed sub-assemblies from being added to the `sopGroups` array for Batchez Stage 3.
- **Change:** Also wrap the Main Assembly SOP injection logic in an `if (!mainIs3D)` block to prevent edge cases where a pure 3D print work order is accidentally opened in the Batchez tab.

## Verification Plan

### Automated Tests
- Run `npm test` and `npx eslint .` to ensure syntax integrity and zero regressions.

### Manual Verification
- Ask the user to open a Batchez work order that contains a 3D printed sub-assembly requiring a "build" in its routing map, and verify that the 3D printed SOP does not clutter the Stage 3 UI.
