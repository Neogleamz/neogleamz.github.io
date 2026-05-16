### Design Decisions & Rationale

We are completely eliminating inline `onclick=` handlers from `production-module.js` to fortify the frontend against XSS attacks and align with strict Vanilla DOM standards. By migrating to a `data-click` event delegation model handled centrally by `system-event-delegator.js`, we establish a single source of truth for DOM interaction routing, preventing memory leaks caused by ghost listeners on dynamically injected DOM fragments.

> [!IMPORTANT]  
> This migration targets ~32 occurrences. Many of these dynamically generated buttons pass context strings or numbers (e.g., indexes or IDs). These parameters will be converted into strict `data-*` attributes (e.g., `data-index`, `data-wo-id`) that the delegator reads to fire the respective global functions.

## Open Questions

None at this time. The mapping is straightforward and based on the existing event delegator patterns.

## Proposed Changes

---

### `production-module.js`

We will modify `production-module.js` to replace all `onclick="..."` with `data-click="..."` and corresponding data parameters:

#### [MODIFY] [production-module.js](file:///d:/GitHub/neogleamz.github.io/production-module.js)
- `closeMediaModal()` → `data-click="click_closeMediaModal"`
- `moveSOPUp(this)` → `data-click="click_moveSOPUp"`
- `moveSOPDown(this)` → `data-click="click_moveSOPDown"`
- `addSOPRow(this)` → `data-click="click_addSOPRow"`
- `removeSOPRow(this)` → `data-click="click_removeSOPRow"`
- `removeBatchItem(${index})` → `data-click="click_removeBatchItem" data-index="${index}"`
- The complex inline `toggleRouteChildren` block → `data-click="click_toggleRouteChildren" data-route="${safeK}"`
- `sortReportTable(this, col, desc)` → `data-click="click_sortReportTable" data-col="col" data-desc="desc"`
- `selectWO('${wo.wo_id}')` → `data-click="click_selectWO" data-wo-id="${wo.wo_id}"`
- `editWOQty('${wo.wo_id}')` → `data-click="click_editWOQty" data-wo-id="${wo.wo_id}"`
- `openMediaManager('telemetry')` → `data-click="click_openMediaManager" data-context="telemetry"`
- `openSOPTokenGuide()` → `data-click="click_openSOPTokenGuide"`
- `toggleHorizontalPreview('inlineLeftPane_${grp.id}', ...)` → `data-click="click_toggleHorizontalPreview" data-pane="inlineLeftPane_${grp.id}" data-preview="inlinePreviewContainer_${grp.id}"`
- `addInlineSOPRow('${grp.id}')` → `data-click="click_addInlineSOPRow" data-grp-id="${grp.id}"`
- `toggleInlineEditor('${grp.id}')` → `data-click="click_toggleInlineEditor" data-grp-id="${grp.id}"`
- `saveInlineSopBlock('${grp.id}', ...)` → `data-click="click_saveInlineSopBlock" data-grp-id="${grp.id}" data-grp-name="${grp.rawName.replace(/'/g, \"&apos;\")}"`
- `deleteAllArchive()` → `data-click="click_deleteAllArchive"`
- `window.open('${safe}','_blank')` → `data-click="click_openExternalLink" data-url="${safe}"`
- `openMediaModal('${safe}', 'vid'/'img')` → `data-click="click_openMediaModal" data-url="${safe}" data-type="vid/img"`

---

### `system-event-delegator.js`

#### [MODIFY] [system-event-delegator.js](file:///d:/GitHub/neogleamz.github.io/system-event-delegator.js)
- Register all new `click_*` cases in the main switch statement.
- Map the event triggers to their respective global functions, extracting `data-*` attributes where necessary.

## Verification Plan

### Automated Tests
- Run `npx eslint .` to guarantee syntax health.
- Run `npm test` to ensure zero regressions across Jest suites.

### Manual Verification
- Deploy UI on localhost port `5500`.
- Open Production Module. 
- Verify SOP editor controls (Up/Down/Add/Delete) operate perfectly.
- Validate sorting on material and assembly tables.
- Validate Media playback and attachments modal popup logic.
