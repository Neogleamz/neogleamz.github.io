# Task Engine Legacy `var` Migration

Migrate the legacy `var` declaration in `task-engine.js` to block-scoped ES6 standard syntax.

## Design Decisions & Rationale
We are migrating the legacy `var r = ...` statement in the `generateUUID` function to use `const`. Since the random value and conditional bitwise operations are evaluated once per character replacement and never re-assigned within that closure, `const` is the most strict and appropriate block-scoped declarative to use, preventing any accidental hoisting or memory leaks.

## Proposed Changes

### Assets (JS)

#### [MODIFY] [task-engine.js](file:///d:/GitHub/neogleamz.github.io/assets/js/task-engine.js)
- **Line 8**: Change `var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);` to `const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);`

## Verification Plan
1. Run `npx eslint .` to ensure the new syntax is fully compliant and no other issues are introduced.
2. The UI will continue to function properly since block scoping inside the replace callback is perfectly isolated.
