# High-Level Architecture: Packerz Assembly Verification Modal

## 1. Context & Objectives
The Packerz process currently utilizes a native browser `window.confirm()` dialog when an operator clicks "Assembly Complete." This native popup lacks the capacity to display detailed information about the impending transaction. The objective is to replace this popup with a custom, rich Vanilla JS modal that explicitly breaks down the inventory actions (Standard Deductions, Ignored items, and Exchanges) so the operator can make a fully informed verification before confirming the final assembly.

## 2. Architectural Overview (Context Level)
This feature integrates directly into the `packerz-module.js` workflow. Currently, the `executePackerzCompletion` function pauses execution with `confirm()` and subsequently fetches `sales_ledger` data to process deductions. The new architecture will hoist the Supabase `sales_ledger` data fetch to occur *before* the prompt. The data will be categorized and passed into a dynamic, Promise-based modal that mimics the blocking behavior of `confirm()`, ensuring seamless integration with the existing Fulfillz/Packerz sync and mutation callbacks.

## 3. Industry Standard Validation
The idea was validated by our swarm of specialized agents:

* **UI/UX Strategy:** The UI/UX Enhancer verified that we can achieve a highly readable, glanceable layout using existing `index.css` classes (`modal-overlay`, `.glass-panel`, `.status-badge`). Items will be grouped into flex rows. Standard items will feature green "DEDUCTING" badges, while Ignored and Exchange items will use neutral/warning styles and faded text to clarify they are not deducting inventory.
* **Vanilla JS & Data Flow:** The Data Flow Validator confirmed that local DOM/variables are not a reliable source of truth for transaction types at this stage. Instead, the Supabase query must be hoisted to the top of `executePackerzCompletion`. The fetched `lineItems` will be categorized into `ignoredItems`, `standardItems`, and `exchangeItems` based on `transaction_type`. Once the modal resolves, the existing upsert logic will proceed, reusing the already-fetched `lineItems` payload to prevent redundant network calls.
* **Security & Performance:** The Security & Performance Validator identified that dynamically injecting `internal_recipe_name` into the DOM presents an XSS risk. All modal HTML will be wrapped using the globally available `window.safeHTML()` (DOMPurify). To prevent memory leaks, the modal will be constructed using `document.createElement()` and returning a `Promise`. Resolving the promise (Confirm/Cancel) will explicitly invoke `.remove()` on the modal container, ensuring automatic garbage collection of its event listeners.

## 4. Design Decisions & Trade-offs
* **Decision:** Hoisting the Supabase Fetch.
  * **Trade-off:** Adds slight network latency *before* the modal appears instead of after confirmation. However, this is absolutely necessary to guarantee the operator is confirming the true database state, preventing mismatches caused by asynchronous UI updates.
* **Decision:** Promise-based DOM Modal instead of inline hidden HTML.
  * **Trade-off:** Requires constructing and destroying DOM nodes on the fly. However, it perfectly replicates the synchronous blocking feel of `confirm()` within the `async/await` execution flow and avoids cluttering the permanent DOM with empty modal wrappers.
* **Decision:** Utilizing existing `.glass-panel` and CSS classes.
  * **Trade-off:** Less customizability than a bespoke styling approach, but guarantees design consistency with the rest of the app and minimizes CSS footprint.
