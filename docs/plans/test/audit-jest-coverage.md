# Jest Test Coverage Audit Implementation Plan

Provide a brief description of the problem, any background context, and what the change accomplishes.
The current `npm test` suite relies on `fs.readFileSync()` combined with `eval()` to execute Vanilla JS modules within the JSDOM test environment. Because the code is executed anonymously via `eval`, Jest's coverage tools (Istanbul/v8) cannot natively parse, trace, or map the lines, resulting in 0% test coverage being reported. This plan refactors the test suite to use standard Node `require()` statements to load the Vanilla JS files into the JSDOM environment, allowing Jest to correctly instrument the code and calculate true coverage metrics across the platform.

## Design Decisions & Rationale
We are switching from `eval()` to Node's native `require()` for importing our Vanilla JS files into the Jest JSDOM environment. Since JSDOM provides the `window` object and our JavaScript is browser-native (no ES imports/exports), `require()` executes the scripts in the current context perfectly while allowing Jest to natively track line-by-line coverage metrics. We will also update the Jest configuration to actively scan the entire `assets/js` directory so untested files correctly report as 0% coverage instead of being ignored.

## User Review Required
> [!IMPORTANT]
> Please review the planned refactoring of the test suite. Transitioning to `require()` might expose strict mode violations or scoping differences that `eval()` masked. Are you comfortable proceeding with testing these changes?

## Proposed Changes

### Configuration Updates
#### [MODIFY] jest.config.js
- Add `collectCoverage: true` to default enable coverage reporting.
- Add `collectCoverageFrom: ['assets/js/**/*.js']` to ensure all production JS files are tracked, even if they currently lack tests.

### Test Refactoring
#### [MODIFY] tests/ceo-engine.test.js
- Replace `fs.readFileSync` and `eval` with `require('../assets/js/ceo-module.js')` (and dependencies).

#### [MODIFY] tests/fulfillment-engine.test.js
- Replace `fs.readFileSync` and `eval` with `require('../assets/js/sales-module.js')` (and dependencies).

#### [MODIFY] tests/math-engine.test.js
- Replace `fs.readFileSync` and `eval` with `require('../assets/js/neogleamz-engine.js')` (and dependencies).

#### [MODIFY] tests/production-engine.test.js
- Replace `fs.readFileSync` and `eval` with `require('../assets/js/production-module.js')` (and dependencies).

#### [MODIFY] tests/sales-engine.test.js
- Replace `fs.readFileSync` and `eval` with `require('../assets/js/neogleamz-engine.js')` (and dependencies).

#### [MODIFY] tests/inventory-engine.test.js
- Finalize the `require()` transition (already partially tested).

## Verification Plan
### Automated Tests
- `npm test -- --coverage`
- Verify that 0 test regressions occur.
- Verify that the coverage matrix accurately populates with line data for `neogleamz-engine.js` and other modules.
