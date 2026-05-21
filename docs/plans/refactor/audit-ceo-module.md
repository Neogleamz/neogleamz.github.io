# CEO Module Legacy Audit Plan

Provide a brief description of the problem, any background context, and what the change accomplishes.
The `ceo-module.js` still contains raw inline `oninput` and `ondrag*` HTML event bindings embedded inside template literals (specifically in `renderCeoTerminal()`). While the module already contains proper `document.addEventListener` delegations at the bottom of the file (e.g. `document.addEventListener('dragstart', ...)`), the HTML generation was never updated to emit the `data-*` attributes (`data-slider-idx`, `data-vol-idx`, `ceo-vol-listen`) required by those delegators. This plan replaces the hardcoded inline events with standard data attributes to fully comply with our strict CSP and Vanilla JS event delegation standards.

### Design Decisions & Rationale
By fully migrating to `data-slider-idx` and `data-vol-idx`, we completely remove `on*` injection vulnerabilities from DOM rendering without having to touch global architecture. The pre-existing listeners at the bottom of the file will instantly pick up the elements once the DOM correctly tags them.

## User Review Required
> [!IMPORTANT]
> The only interactive components touched are the CEO Terminal sorting sliders and the volume input boxes. I will execute tests post-migration to verify these still slide and save correctly. Please review the plan below.

## Proposed Changes

---

### ceo-module.js (Event Delegation Migration)

#### [MODIFY] [ceo-module.js](file:///D:/GitHub/neogleamz.github.io/assets/js/ceo-module.js)
- **Line 224**: Strip `ondragstart="ceoDragStart(event, ${index})" ondragover="ceoDragOver(event)" ondrop="ceoDrop(event, ${index})" ondragend="ceoDragEnd(event)"`
  - *Replace with*: `data-slider-idx="${index}"`
- **Line 235**: Strip `oninput="document.getElementById('ceo-vol-${index}').value=this.value; updateCeoEngine();"`
  - *Append*: `class="ceo-vol-listen"` (and preserve `ceo-sync-input`) and add `data-vol-idx="${index}"`.

## Verification Plan

### Automated Tests
- Run `npm test` to verify math engine regressions.
- Run `npx eslint .` to verify no syntactic breaks.

### Manual Verification
- Will open `127.0.0.1:5500` and visually check the browser console.
- Simulate dragging and dropping the CEO sliders.
- Simulate editing the volume input and ensuring it triggers a DOM redraw (`updateCeoEngine()`).
