# SOP Editor Photo Button & Save Integrity Fixes

We are resolving the non-functional photo button on the checklist side of all SOP editors, fixing the deep-seated DOM element ID conflicts in the Packerz SOP editor, and fixing the save logic where empty rich-text rows with media attachments were discarded during extraction. This ensures full functional parity and error-free execution across all fullscreen and inline SOP configurations.

## User Review Required

> [!IMPORTANT]
> **Packerz SOP Editor Bug Discovery & Resolution**: During our rigorous code audit, we discovered that the Packerz SOP editor was completely unable to render or save steps due to hardcoded DOM element IDs (`sopMasterEditorArea` vs. `packerzSopEditorArea`) inside `buildUnifiedSopLayoutHTML`. We are resolving this mismatch by dynamically injecting correct IDs, click attributes, and event handlers based on the active `sopType`.
> 
> **Master Modal Integration**: We also identified that `saveMasterSOP` in the fullscreen Master SOP Modal was hardcoded to query `'sopMasterEditorArea'`. We will update this to dynamically use `'packerzSopEditorArea'` when `currentSopMode === 'packerz'`, guaranteeing saving works seamlessly in the fullscreen editor as well as the inline admin dashboards.

## Proposed Changes

### Centralized SOP Layout Engine

#### [MODIFY] [system-tools-module.js](file:///d:/GitHub/neogleamz.github.io/assets/js/system-tools-module.js)
Refactor `buildUnifiedSopLayoutHTML` to dynamically assign all layout configuration parameters, DOM IDs, and event handlers rather than hardcoding Batchez-specific values:
- **Dynamic Textarea & Preview IDs**: 
  - `qaTextareaId` is mapped to `packerzAdminQA` if `sopType === 'packerz'`, otherwise `productionAdminQA`.
  - `qaPreviewId` is mapped to `packerzAdminQAPreview` if `sopType === 'packerz'`, otherwise `productionAdminQAPreview`.
  - `rowsWrapperId` is mapped to `packerzSopEditorArea` if `sopType === 'packerz'`, otherwise `sopMasterEditorArea`.
- **Dynamic Buttons & Handlers**:
  - `photoBtn` action is mapped to `click_openSOPSnapshotCamera_packerz` if `sopType === 'packerz'`, otherwise `click_openSOPSnapshotCamera_production`.
  - `uploadBtn` targets the dynamic `${qaTextareaId}` as `data-target-textarea`.
  - `mainInputHandler` is mapped to `input_renderPackerzTelemetryPreview` if `sopType === 'packerz'`, otherwise `input_renderDashboardTelemetryPreview`.
  - `addRowClickAttr` is mapped to `click_addPackerzSOPRow` if `sopType === 'packerz'`, otherwise `click_addDashboardSOPRow`.

---

### Production Assembly Module

#### [MODIFY] [production-module.js](file:///d:/GitHub/neogleamz.github.io/assets/js/production-module.js)
Update step row extraction and save functions to fully support empty rich-text boxes containing attachments, and dynamic container extraction:
1. **Dynamic Step Extraction Container**:
   In `saveMasterSOP`, dynamically retrieve step data from the correct container:
   ```javascript
   const targetContainer = currentSopMode === 'packerz' ? 'packerzSopEditorArea' : 'sopMasterEditorArea';
   let steps = extractSOPDataFromUI(targetContainer);
   ```
2. **Inclusive Step Row Extraction**:
   Refactor `extractSOPDataFromUI` to check:
   ```javascript
   if (t && (t.innerHTML.trim() || attachments.length > 0)) {
       steps.push({ text: t.innerHTML.trim(), attachments: attachments });
   }
   ```
   This ensures step rows containing attachments (such as captured photos or uploaded media URLs) are successfully preserved and saved even if no manual text instructions have been written in the rich text box.

## Verification Plan

### Automated Tests
- Run `npm test` to verify zero regressions across the codebase:
  ```powershell
  npm test
  ```

### Manual Verification
1. **Batchez Checklist Photo Test**: 
   - Open **Batchez** SOP Editor, type some steps on the left pane.
   - Click the **Photo** button on the checklist side and verify it triggers WebRTC camera access.
2. **Empty Rich-Text Save Test**:
   - Create a new procedure step row, leave the rich-text box empty, but upload/take a photo to populate its attachments.
   - Click **Save** and verify the step with its attachment is successfully saved to the database and reloads correctly.
3. **Packerz Checklist Editor Test**:
   - Open **Packerz** SOP Editor, select a recipe, and verify steps now render correctly (no longer blocked by the `null` selector bug).
   - Verify typing in the checklist pane renders previews in real-time, and that the checklist **Photo** button successfully launches WebRTC.
