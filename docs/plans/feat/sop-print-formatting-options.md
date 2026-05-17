# SOP Print Formatting Options Implementation Plan

### Design Decisions & Rationale
To provide granular print options without cluttering the UI, we will intercept the existing `Print SOP` delegators and route them to a new Vanilla JS action modal (`sop-print-options-modal`). This modal will offer three distinct paths: Checklist Only, Rich Text Only, and Full SOP. To ensure the printed checklist is "pretty" and matches the UI, we will pipe the raw checklist strings through the global `parseProductionTelemetryLine()` engine and inject the corresponding CSS classes (`.telemetry-header`, `.telemetry-subtext`) directly into the print window's `<style>` payload.

## Proposed Changes

### `index.html`
- **[NEW] Modal Structure:** Create `<div id="sop-print-options-modal" class="modal-overlay hidden">` with a centralized dialog box containing three primary action buttons (`data-click="click_executeSopPrint_checklist"`, `_richtext`, `_full`) and a Cancel button.

### `assets/js/system-event-delegator.js`
- **[MODIFY] Event Routing:** Update `click_window_printSOP`, `click_window_openPrintSOP_currentPri`, and `click_printPackerzSOP` to launch the new `openSopPrintModal()` instead of directly executing the print immediately.
- **[NEW] Handlers:** Add cases for the three new execution paths that close the modal and call `executeSopPrint(type)`.

### `assets/js/production-module.js` (and related modules)
- **[MODIFY] `printSOP()` Engine:** Refactor `printSOP()` (or create `executeSopPrint(type)`) to accept `type` ('checklist', 'richtext', 'full'). 
- **[MODIFY] Print HTML Generation:** 
  - If `checklist` or `full`, iterate over the steps array and run `parseProductionTelemetryLine(step)` instead of rendering a flat text string. Include custom CSS in the `<head>` of the print window to beautifully render headers and subtext.
  - If `richtext` or `full`, parse and append the `sop_richtext` column data from the active SOP.
  - Include empty `[ ]` checkbox squares next to checklist items so they are physically usable on paper.

## Open Questions / Clarifications
1. Do you want actual empty checkbox squares `[ ]` printed next to the checklist items so workers can physically check them off with a pen?
2. Should this modal replace the print button functionality universally across ALL hubs (Production, Packerz, Printz), or just within the active SOP editor?
