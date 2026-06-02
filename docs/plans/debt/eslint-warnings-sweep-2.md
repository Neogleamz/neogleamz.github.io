# Debt: ESLint Warnings Sweep 2

## Objective
Resolve the remaining 13 ESLint warnings across the Vanilla JS codebase to achieve a completely silent terminal output during CI/CD checks, enforcing a strict zero-warning baseline.

## Technical Details
- **Issue**: ESLint warnings do not produce non-zero exit codes, meaning they slip through standard `npm test` or `npx eslint .` gates in `/ship_it` unless manually checked or configured to fail.
- **Affected Files**:
  - `assets/js/packerz-module.js`
  - `assets/js/production-module.js`
  - `assets/js/system-realtime-sync.js`
- **Mitigation Strategy**: 
  - Standardized the usage of `/* global */` declaration blocks at the top of files (e.g., `system-realtime-sync.js`) to define expected cross-module global functions.
  - Used `eslint-disable-next-line` for specific known global helpers where a full file block was unnecessary.
  - Added the `scratch/` directory to the `eslint.config.mjs` ignores list to prevent orphaned AI sandbox scripts from triggering false positive warnings.

## Architectural Decision
The decision was made to strictly suppress or resolve all warnings to maintain a pristine, silent terminal. This ensures that any future output from `npx eslint` is immediately actionable and not lost in the noise of known globals.
