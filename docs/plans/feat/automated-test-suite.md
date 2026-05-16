### Design Decisions & Rationale
We are choosing **Jest** because it natively supports `jsdom`, which is absolutely critical for evaluating our browser-bound Vanilla JS architecture (where variables and logic live natively on the `window` object). By spinning up an invisible browser context in Node, we can natively test complex mathematical algorithms (like `calculateProductBreakdown` and True COGS logic) with milliseconds-fast response times, zero build overhead, and no need to launch external browser drivers.

### Proposed Architecture

#### 1. Test Runner Configuration
- Modify `package.json` to inject `"test": "jest"` and initialize local Jest coverage.
- Create `jest.config.js` with `testEnvironment: 'jsdom'` mapped natively to our vanilla ES6 setup.

#### 2. Environment Simulation (`tests/setup.js`)
- Our engine math (`neogleamz-engine.js`) relies directly on cached global DBs. We will create a `tests/setup.js` file loaded automatically by Jest that seeds memory with a lightweight, static version of `productsDB`, `catalogCache`, and `inventoryDB`. 
- This enforces deterministic mathematics natively across all test runs.

#### 3. Core Engine Math Suite (`tests/math-engine.test.js`)
- Create our first suite directly targeting `neogleamz-engine.js`.
- Use native `eval()` or `eval(fs.readFileSync(...))` inside the JSDOM context so the entire codebase can be hooked effortlessly without refactoring it into Node.js CommonJS `require()` exports.
- **Example Assertion:** Validate that deeply recursive sub-assembly calculations properly sum the exact Raw Material cost + Labor thresholds mapped out in our test-database schema.

### Clarifying Questions
- Are you comfortable formally installing `jest` and `jest-environment-jsdom` as local `devDependencies` (which will temporarily touch the `package.json` lock files)?
