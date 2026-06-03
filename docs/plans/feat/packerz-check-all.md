# Implementation Plan: Packerz SOP "Check All"

## High-Level Architecture Reference
[packerz-check-all-sop.md](file:///d:/GitHub/neogleamz.github.io/docs/architecture/packerz-check-all-sop.md)

## Objective
Introduce a "Check All" button within the Packerz SOP Viewer Modal specifically for the Mandatory Quality Checklist section, allowing operators to bulk-clear standard textual QA checks without bypassing mandatory scans.

## Technical Approach

### 1. DOM Injection & UI
- **Target File:** `d:\GitHub\neogleamz.github.io\assets\js\packerz-module.js`
- **Location:** Inside `window.loadActiveSOP` (or `window.buildUnifiedSopLayoutHTML` where the `qaChecks` header is built).
- **Implementation:**
  Inject a button into the "MANDATORY QA CHECKS" header:
  ```html
  <button data-app-click="checkAllPackerzQA" class="btn-ghost-green" style="float:right; padding: 4px 8px; font-size: 11px; border-radius: 4px; border: 1px solid #10b981; color: #10b981; background: transparent; cursor: pointer;">☑️ Check All</button>
  ```
- **Styling:** Must use existing ghost pill styles or inline styles that align with the Vanilla JS flexbox UI.

### 2. Event Delegation
- **Target File:** `d:\GitHub\neogleamz.github.io\assets\js\system-event-delegator.js` (or similar delegator file, if the project delegates events globally) or inside `packerz-module.js` if it has its own delegated listener system. Given Boy Scout rules, if `data-app-click` is handled centrally, we add `checkAllPackerzQA` to the switch case. If handled in the module, implement the logic there.
- **Logic:**
  ```javascript
  window.checkAllPackerzQA = function(btnElement) {
      // 1. Find all checkboxes in the SOP viewer that are NOT disabled
      const checkboxes = document.querySelectorAll('#sopViewerQAList .packerz-qa-check:not([disabled])');
      
      let changed = false;
      checkboxes.forEach(cb => {
          if (!cb.checked) {
              cb.checked = true;
              changed = true;
          }
      });
      
      // 2. If any were changed, trigger the global signoff validation
      if (changed && typeof window.sopSignoffCheck === 'function') {
          window.sopSignoffCheck();
      }
      
      // 3. Optional: animate the button to show success
      btnElement.innerText = '✅ Checked!';
      setTimeout(() => btnElement.innerText = '☑️ Check All', 1500);
  };
  ```

### 3. Security & Validation Boundaries
- **Strict Selector:** The query selector `querySelectorAll('.packerz-qa-check')` naturally excludes `.packerz-qa-input` (`[INPUT]`) and barcode/QR scanners (`[SCAN:]` and `[BARCODE:]`) which do not use the `packerz-qa-check` class. This perfectly satisfies the architectural requirement to only bulk-check boolean values.
- **Safe HTML:** Use `window.safeHTML()` when injecting the new button DOM, as established in the architecture doc.
- **State Validation Hook:** Forcefully triggering `sopSignoffCheck()` recalculates the final "COMPLETE QA" button state, ensuring the system natively respects the newly checked values exactly as if the operator clicked them manually.

## Execution Steps
1. Modify `packerz-module.js` to inject the `☑️ Check All` button when rendering `qaChecks`.
2. Add `checkAllPackerzQA` to the global scope or event delegator.
3. Test inside the 127.0.0.1:5500 environment to ensure scanners and text inputs are bypassed properly.
4. Verify `sopSignoffCheck()` unlocks the COMPLETE QA signoff button successfully.
