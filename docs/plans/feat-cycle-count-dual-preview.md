# Cycle Count Dual-Preview Live Sync

### Design Decisions & Rationale
We utilize the phone's camera as the single authoritative scanning device. To provide a live view on the desktop without complex WebRTC peer connections, the phone portal decodes barcodes instantly on-device using `html5-qrcode` and, if PC preview is enabled, captures the local video stream, downsamples the frames to an optimized 240x240 WebP base64 string, and broadcasts them at 5-8fps over the Supabase Realtime channel. The PC receives this frame stream and renders it inside an image element, delivering a synchronized real-time view of what the phone is pointing at. Barcode decoding remains entirely on-device, guaranteeing sub-100ms instant barcode locking.

---

## User Review Required

> [!NOTE]
> **Dynamic Preview Routing Modes**: The operator can toggle where the live video preview is shown:
> 1. **📱 Phone Only**: Live camera view is rendered only on the phone portal. Frame broadcasting to the PC is turned off to optimize network bandwidth.
> 2. **💻 PC Only**: Live camera view is rendered only on the PC Cycle Count modal (the phone screen remains dim or displays status trackers to save battery).
> 3. **🔄 Both Screens**: Simultaneous live video streams are displayed on both the PC monitor and the phone screen.
>
> **On-Device Manual Input**: A premium glassmorphic slide-up panel on the phone allows the operator to manually type and submit a barcode/SKU if warehouse lighting is extremely poor.

---

## Open Questions
*No active open questions — fully aligned with user preferences!* ✅

---

## Proposed Changes

### Core System Assets

#### [NEW] [remote-scanner.html](file:///d:/GitHub/neogleamz.github.io/remote-scanner.html)
- A mobile-first WebRTC barcode portal designed for remote inventory counts.
- Loads `html5-qrcode` to decode barcodes locally on the phone's GPU/CPU.
- Houses the Preview Router selector (Phone Only, PC Only, Both).
- Integrates a frame-grabber loop: captures the `<video>` element, draws to a hidden canvas, downsamples, and broadcasts the frame as a lightweight WebP/JPEG string to the PC at a throttled interval (e.g. 150ms).
- Emits `REMOTE_BARCODE_SCAN` immediately upon successful scan, plays a local chirp, and triggers a haptic shake.
- Includes a collapsible manual text entry tray to manually submit SKU values.

#### [MODIFY] [index.html](file:///d:/GitHub/neogleamz.github.io/index.html)
- Refactor the Cycle Count scanner card layout inside STOCKPILEZ:
  - Remove PC webcam code.
  - Insert a high-fidelity QR Code block containing the secure remote-scanner link.
  - Insert an `<img>` element `#ccRemotePreviewScreen` to render incoming live frame streams from the phone.
  - Insert the preview routing selector buttons so the PC operator can also control the live stream destination dynamically.
- Add dynamic connection status subtexts and a beautiful flash indicator upon scan success.

#### [MODIFY] [inventory-module.js](file:///d:/GitHub/neogleamz.github.io/assets/js/inventory-module.js)
- Wire up the PC-side Realtime listener on the cycle-count session channel.
- Handle `REMOTE_FRAME_STREAM` events: update the `#ccRemotePreviewScreen` `src` attribute with the incoming base64 stream.
- Handle `REMOTE_BARCODE_SCAN` events:
  - Play the scanner beep on the PC.
  - Auto-select the item key (e.g., `RECIPE:::PartName`) in `#ccMngrItemSelect`.
  - Trigger `window.updateCcMngrStock()` to load inventory metrics.
  - Smoothly scroll to and focus `#ccMngrQtyInput`.
- Clean up all listeners and channel subscriptions on modal close to guarantee zero memory leaks.

---

## Verification Plan

### Automated Tests
- Run our linter and Jest tests to verify syntax and logic:
  `npm run lint`
  `npm run test`

### Manual Verification
1. Open the Cycle Count Manager modal on the PC.
2. Scan the secure QR code using a mobile device to launch `remote-scanner.html`.
3. Toggle between **Phone Only**, **PC Only**, and **Both Screens** modes.
4. Verify the PC screen displays the phone's camera stream live when PC or Both modes are active.
5. Point the phone at an item barcode or enter a SKU manually on the phone screen.
6. Verify the PC instantly decodes, beeps, selects the correct item, and focuses the quantity box.
