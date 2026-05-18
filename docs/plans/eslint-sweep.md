# Global ESLint Hardening (no-undef Audit)

This epic addresses the 2,131 `no-undef` warnings that currently pollute our CI/CD terminal output when executing `npx eslint .`.

## Design Decisions & Rationale
Because this application runs on a pure Vanilla JS architecture, our `.js` files are loaded via `<script>` tags in `index.html`. This means functions and variables defined in one file (e.g., `sysLog` in `utils.js`) are implicitly attached to the global `window` object and consumed by others (e.g., `dashboard.js`). ESLint parses each file independently, throwing `no-undef` errors because it is unaware of this shared global context.

To resolve this while adhering to our **Vanilla DOM Mastery** rule, we will *not* refactor the codebase into Node-style ES Modules (`import`/`export`), as that would destabilize the existing architecture. Instead, we will extract the exact list of 271 known, intentional global bindings and map them into the `globals` directive of our `eslint.config.mjs` file.

This establishes a strict namespace boundary: it silences the false positives for our legitimate cross-file functions, while ensuring ESLint will immediately flag any *new* typos or truly undefined variables in the future.

> [!NOTE]
> **The Audit Discovery**
> During the initial scan, I ran a regex over the ESLint output and extracted a distinct list of exactly 271 unique cross-file references (including `sysLog`, `currentProduct`, `Chart`, `productsDB`, and `storeOldVal`). I will inject these into the flat config.

## Open Questions

> [!IMPORTANT]
> **Are you okay with locking the Global Namespace?**
> By explicitly defining these 271 globals in `eslint.config.mjs`, we are telling ESLint "these are the only allowed global variables." If you create a *new* global function in the future, you will either need to add it to the ESLint config, or prefix it with `window.` (e.g. `window.newFunction = ...`). Is this acceptable?

## Proposed Changes

### `eslint.config.mjs`
Update the flat configuration file to include the full dictionary of our active global variables under `languageOptions.globals`.

#### [MODIFY] [eslint.config.mjs](file:///d:/GitHub/neogleamz.github.io/eslint.config.mjs)
- Read the generated `undefs.txt` file from the workspace.
- Inject all 271 extracted variables as `"readonly"` or `"writable"` into the `globals` object.
- Retain the existing DOM globals (`window`, `document`, `localStorage`, etc.).

### `package.json`
#### [MODIFY] [package.json](file:///d:/GitHub/neogleamz.github.io/package.json)
- Add a `lint` script command if it does not already exist, standardizing the execution to `eslint .` so we can run `npm run lint` natively.

### `tools/SK8Lytz_App_Master_Reference.md`
#### [MODIFY] [SK8Lytz_App_Master_Reference.md](file:///d:/GitHub/neogleamz.github.io/tools/SK8Lytz_App_Master_Reference.md)
- Inject a new documentation section explaining the Global Namespace rule: "Any new cross-file global function or variable created must be registered in `eslint.config.mjs` under `globals` to prevent `no-undef` warnings."

## Verification Plan

### Automated Tests
- Execute `npx eslint .` in the terminal.
- Verify that the total warning count drops from ~2,131 down to near zero (or exactly zero for `no-undef`).

### Manual Verification
- Ensure the application still compiles and runs without issues on `127.0.0.1:5500`. (The ESLint config changes only affect the linter, not the browser runtime).
