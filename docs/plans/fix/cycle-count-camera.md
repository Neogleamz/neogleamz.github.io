# Implementation Plan: Cycle Count Camera Scanner Fix

## 1. Goal Description
The objective of this task is to fix a critical UI geometry and performance bug preventing the local WebRTC barcode scanner (`html5-qrcode`) from locking onto internal Neogleamz barcodes during Cycle Counts and Packerz SOPs. The current static integer initialization logic for `qrbox` mathematically breaks the decoding boundary on responsive mobile screens, causing the camera feed to display without actually processing incoming frames. 

By replacing the static dimensions with a responsive boundary callback and explicitly declaring target code formats, we will guarantee instant target-locks on all mobile layouts.

## 2. Proposed Changes

### [Component: Inventory & Packerz Scanner Engine]

#### [MODIFY] [inventory-module.js](file:///d:/GitHub/neogleamz.github.io/assets/js/inventory-module.js)
- **Target Location**: Inside `window.startLocalCycleCount()` and `window.startLocalScannerWithDevice()`.
- **Change**: Locate the `Html5Qrcode.start()` configuration object currently set to `{ fps: 12, qrbox: { width: 220, height: 220 }, aspectRatio: 1.0 }`.
- **Implementation**: 
  - Change the static `qrbox` integer matrix to a dynamic callback:
    ```javascript
    qrbox: function(viewfinderWidth, viewfinderHeight) {
        var minEdgeSize = Math.min(viewfinderWidth, viewfinderHeight);
        var qrboxSize = Math.floor(minEdgeSize * 0.75); // 75% fluid scaling
        return { width: qrboxSize, height: qrboxSize };
    }
    ```
  - Append the explicit format constraints inside the options matrix to optimize processing load:
    ```javascript
    formatsToSupport: [ Html5QrcodeSupportedFormats.QR_CODE, Html5QrcodeSupportedFormats.CODE_128 ]
    ```
  - Ensure `aspectRatio: 1.0` remains absolutely untouched to preserve iOS Safari anti-zoom behavior.

#### [MODIFY] [packerz-module.js](file:///d:/GitHub/neogleamz.github.io/assets/js/packerz-module.js)
- **Target Location**: Inside `openCameraScanner()`.
- **Change**: Apply the exact same dynamic `qrbox` callback and `formatsToSupport` optimization matrix to the `_html5QrScanner.start()` initialization block to guarantee parity between the SOP Scanner and Cycle Count engines.

## 3. Security, Performance & UX Compliance
- **Security / Dependency Diet**: No external libraries are introduced. The fix relies strictly on the native internal `Html5Qrcode` instance already in place.
- **Vanilla JS Architecture**: We are preserving the direct inline `window.start...` initialization logic required by the `<script>` architecture context without injecting bundlers or build steps.
- **UI Performance**: Restricting the active GPU scanning algorithms natively to `CODE_128` and `QR_CODE` will drastically cut computational overhead and increase FPS scanning efficiency on legacy mobile hardware. 

## 4. Verification Plan
- Launch the application locally and navigate to the Cycle Count engine.
- Initialize the Local Camera Mode and shrink the Chrome DevTools viewport to a 320px width (e.g., iPhone SE equivalent).
- Verify the physical `qrbox` targeting square dynamically recalculates rather than blowing out the flex boundaries.
- Present a generated CODE_128 barcode; verify the scanner achieves a sub-100ms target lock.
