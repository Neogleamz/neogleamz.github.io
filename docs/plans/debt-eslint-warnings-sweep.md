# ESLint Warnings Sweep (158x no-unused-vars)

The Vanilla JS codebase currently reports ~158 `no-unused-vars` warnings across 15 modules. While these are warnings and don't halt execution, cleaning them up hardens the module scopes and restores pristine CI logs.

### Design Decisions & Rationale
We are operating in a pure Vanilla JS environment with a Zero-Trust explicit global routing architecture (`system-event-delegator.js`). 
1. **Global Function Handlers:** Functions defined at the top level (e.g. `function closeMediaModal()`) that are only invoked dynamically via `data-app-click` appear "unused" to ESLint because it doesn't parse the HTML or the dynamic `window[action]()` execution. Instead of suppressing these with `// eslint-disable`, we will explicitly map them to the `window` object (e.g. `window.closeMediaModal = function() { ... }`). This resolves the warning while technically reinforcing our explicit global routing architecture.
2. **Unused Catch/Callback Parameters:** Variables like `catch (e)` or `const { data, error }` where the variable is genuinely not used will be prefixed with an underscore (e.g. `catch (_e)`). We will update `.eslintrc.json` to natively ignore `^_` parameters.
3. **Dead Code Elimination:** Genuinely unused local variables (`let test = ...`) that are orphaned will be deleted outright per the Boy Scout protocol.

## User Review Required

> [!IMPORTANT]
> **Architecture Endorsement**
> I plan to convert floating top-level event functions (e.g., `function execRT()`) into explicit window attachments (e.g., `window.execRT = function()`) across the targeted modules. This guarantees they are globally accessible for the event delegator while simultaneously satisfying ESLint. Does this align with your vision for the Vanilla JS structure?

## Proposed Changes

### `/.eslintrc.json`
#### [MODIFY] `.eslintrc.json`
- Update the `no-unused-vars` rule to:
  `["warn", { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_", "caughtErrorsIgnorePattern": "^_" }]`

### Global Modules (15 files)
#### [MODIFY] `assets/js/*.js`
- **`production-module.js` (30 warnings)**
- **`packerz-module.js` (27 warnings)**
- **`labelz-module.js` (26 warnings)**
- **`socialz-module.js` (18 warnings)**
- **`barcodz-module.js` (12 warnings)**
- **`ceo-module.js` (9 warnings)**
- **And 9 smaller modules (~36 warnings)**
- Convert floating click/UI functions to `window.funcName = function() {}`
- Rename unused `catch(e)` to `catch(_e)`
- Delete dead internal let/const blocks.

## Verification Plan

### Automated Tests
- Run `npx eslint .` to verify that we reach **0 warnings and 0 errors**.
- Run `npm test` to ensure our automated Math and Ledger validation suites still pass with 100% success.
- Perform a manual build/UI check to ensure the UI routing (buttons clicking) has not degraded.
