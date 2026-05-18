### Design Decisions & Rationale

We are modifying the Vanilla JS `task-engine.js` module to dynamically inherit the project's color for its task sections (cycles) when viewing a specific project dashboard. By leveraging the existing `taskEngineDB.projectz` state cache to cross-reference the active project (`window.teActiveProjectId`), we can natively inject the project's `color_hex` into the section's DOM rendering cycle without any additional Supabase calls or heavy CSS overrides.

### 🎨 UI & Browser Strategy

- **Internal Desktop Target:** This primarily impacts the widescreen Task Engine layout where distinct project contexts require clear visual delineation.
- **Vanilla DOM Execution:** The fix safely modifies the local state object generated before DOM injection, natively feeding the new color into the existing Flexbox-based layout string literals.

## Proposed Changes

---

### Task Engine UI Module

#### [MODIFY] [task-engine.js](file:///d:/GitHub/neogleamz.github.io/assets/js/task-engine.js)
- Target the cycle grouping logic inside `teRenderTaskGrid()` around line 351.
- Detect if we are in a Project context by checking `!isPersonalView && window.teActiveProjectId`.
- Intercept the section's color assignment (`cColor`) and overwrite it using the active project's `color_hex` property from the local cache.

## Verification Plan

### Automated Tests
- `npm test` to ensure existing `neogleamz-engine.js` math and core features remain undamaged.
- `npx eslint .` to verify no syntax errors were introduced.

### Manual Verification
- Navigate to the "GLOWZ" project in the Task Engine.
- Verify that sections like "PRODUCTION AND MANUFACTURING" now have their text color and bottom-border correctly mapped to the GLOWZ project color instead of the default green or blue.
