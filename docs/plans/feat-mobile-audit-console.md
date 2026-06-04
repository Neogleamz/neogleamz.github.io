# Implementation Plan: Mobile Audit Console Sync & Fullscreen Modal

## 1. Goal Description
The objective is to overhaul the Inventory Audit workflow for both PC and Mobile. Currently, the PC Audit Console is a constrained modal, and the Mobile scanner is a basic barcode dispatcher. This plan will transform the PC console into a full-screen viewport overlay, upgrade the Mobile scanner to a 1:1 bottom-sheet clone of the PC Audit Console, fix the camera preview stream logic, and ensure physical phone scans automatically trigger the PC interface.

## 2. Technical Approach

### 2.1 PC Full-Screen Modal (`index.html` & `inventory-module.js`)
- **DOM Restructuring:** Modify `#stockzAuditLayoutWrapper` from a fixed `max-width: 1150px` modal to a CSS Grid `width: 100vw; height: 100vh` absolute overlay. Remove border-radius and box-shadow from the inner `.massive-container` elements.
- **Event Forwarding (Scan Hook):** In `inventory-module.js`, listen for the `REMOTE_BARCODE_SCAN` payload. Upon receiving a valid barcode from the phone, immediately invoke `window.click_openStockzAuditModal()` programmatically, ensuring the PC syncs to the newly scanned item.

### 2.2 Mobile Bottom-Sheet Console (`remote-scanner.html`)
- **UI Architecture:** Implement a "Bottom Sheet" overlay (e.g., `position: fixed; bottom: 0; width: 100%; border-radius: 20px 20px 0 0;`) that sits atop the active camera background.
- **Console Parity:** Port the "Quick Delta Offset" HTML/CSS from the PC side (massive `+`/`-` tactile buttons) directly into `remote-scanner.html`.
- **State Hydration:** When the phone connects, intercept the `SESSION_TRANSFER` WebSocket envelope. The PC will attach `catalogCache` and `uuidMap` payloads. The phone will cache this data locally to render item names and compute valuation deltas instantly without making independent Supabase calls.

### 2.3 WebRTC Canvas Optimization (`remote-scanner.html`)
- **Streaming Pipeline Fix:** Keep the existing WebSocket Base64 mechanism for cross-network compatibility, but explicitly hook into `REMOTE_FRAME_STREAM` on the PC side when "PC Only" or "Both" routing is selected. Throttle the hidden `<canvas>` `requestAnimationFrame` loop on the phone to 15 FPS with 0.35 JPEG compression to ensure the WebSocket channel doesn't drop frames.

## 3. Implementation Steps
1. [ ] Update `index.html` and `style.css` (or inline styles) for `#stockzAuditLayoutWrapper` to achieve 100vw/100vh grid layout.
2. [ ] Modify `inventory-module.js` to trigger `window.click_openStockzAuditModal` upon receiving `REMOTE_BARCODE_SCAN`.
3. [ ] Edit `remote-scanner.html` to include the Bottom-Sheet HTML structure, tactile +/- buttons, and CSS animations.
4. [ ] Wire the `SESSION_TRANSFER` event in both modules to broadcast the `catalogCache` metadata payload.
5. [ ] Refactor the `remote-scanner.html` WebRTC canvas capture loop to ensure proper resolution and throttling for `REMOTE_FRAME_STREAM`.
6. [ ] Test cross-device synchronization and memory leak prevention during teardown.
