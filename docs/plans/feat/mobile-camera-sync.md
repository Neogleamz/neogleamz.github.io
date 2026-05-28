# Implementation Plan - Live Mobile Camera Preview & Physical Capture Sync

### Design Decisions & Rationale
We will engineer a decoupled, dual-button interface that supports both PC-guided webcam capture (e.g. using Phone Link/DroidCam virtual camera drivers) and a zero-friction remote phone shutter (using Supabase Realtime). 
To circumvent mobile browser security policies that block programmatic camera launches without a direct physical gesture, the remote phone shutter will use a real-time event pipeline: when triggered from the PC, the phone tab vibrates, plays a chirp sound, and displays a pulsing fullscreen tap target. Clicking this target activates the phone's native built-in camera application via `<input capture="environment">`, utilizing the phone's native zoom, flash, and physical volume shutter keys. Once snapped, the image is automatically uploaded to Supabase Storage and synced back to the PC screen in <100ms.

---

## Proposed Changes

### 1. Unified Interface Layout

#### [MODIFY] [index.html](file:///d:/GitHub/neogleamz.github.io/index.html)
- Integrate a decoupled button bar in the SOP media capture UI:
  - `[ 🖥️ PC Webcam Mode ]` (triggers local `getUserMedia` WebRTC camera stream showing preview on PC, exactly like the current flow).
  - `[ 📱 Remote Mobile Capture ]` (activates the real-time cross-device remote shutter loop).
- Add the native hidden input for OS camera capture on mobile:
  ```html
  <input type="file" id="nativeMobileCameraInput" accept="image/*" capture="environment" style="display:none;" data-change="change_handleNativeMobileCameraCapture">
  ```
- Build the **Pulsing Shutter Handoff Overlay** inside the main page. When the phone tab receives the socket command:
  - It overlays a beautiful, glassmorphic fullscreen button: `[ 📸 TAP TO SNAP PHOTO ]` with a camera emoji.
  - Tapping this button programmatically triggers `nativeMobileCameraInput.click()`, opening the phone's native camera.

### 2. Real-Time Broadcast & Media Upload Pipeline

#### [MODIFY] [packerz-module.js](file:///d:/GitHub/neogleamz.github.io/assets/js/packerz-module.js)
- **Supabase Realtime Channel Registration:**
  - Standardize a real-time sync channel `neogleamz-camera-sync` scoped to the active operator ID.
  - PC listens for `REMOTE_CAPTURE_COMPLETE` events. When received, it pulls the `imageUrl`, stops loading indicators, and stages the photo in the target textarea or worker card.
  - Mobile phone listens for `LAUNCH_MOBILE_SHUTTER` events. When received, it wakes the screen, vibrates using `navigator.vibrate([100, 50, 100])`, plays a shutter beep, and displays the fullscreen tap overlay.
- **Capture and Upload Event Handler:**
  - Implement `change_handleNativeMobileCameraCapture(event)` to read the high-resolution photo file returned by the phone OS.
  - Automatically invoke `uploadSOPMedia(file)`. Once uploaded, broadcast `REMOTE_CAPTURE_COMPLETE` containing the public Supabase URL to the PC.
- **Decoupled Fallbacks:**
  - Preserve `openSOPSnapshotCamera()` and `click_captureSOPSnapshot()` as the standard "PC Webcam Mode" falling back to local WebRTC streaming.

### 3. Native Dynamic Event Handlers

#### [MODIFY] [system-event-delegator.js](file:///d:/GitHub/neogleamz.github.io/assets/js/system-event-delegator.js)
- Register delegator cases for:
  - `click_openSOPSnapshotCamera_remoteMobile`: Dispatches the socket activation signal.
  - `click_openSOPSnapshotCamera_pcWebcam`: Launches the existing webcam media stream modal.
  - `change_handleNativeMobileCameraCapture`: Maps input change to the mobile upload and broadcast routine.

---

## Verification Plan

### Automated Tests
- Run `npm test` to ensure that our addition of real-time event handlers does not degrade standard SOP and packerz layout parsing models.
- Run `npx eslint .` to verify zero `no-undef` warnings are raised for Supabase real-time channel references.

### Manual Verification
1. **Desktop Webcam Mode:**
   - Log into `http://127.0.0.1:5500/` on PC.
   - Open SOP editor and click `[ 🖥️ PC Webcam Mode ]`.
   - Verify local camera stream launches and snaps frame successfully.
2. **Asynchronous Mobile Sync Mode:**
   - Open Neogleamz on both PC and mobile phone (logged into the same account).
   - On PC, click `[ 📱 Remote Mobile Capture ]`.
   - Verify phone vibrates, plays a chime, and displays the pulsing glassmorphic `[ 📸 TAP TO SNAP PHOTO ]` overlay.
   - Tap the overlay on the phone. Verify the phone's native system camera launches.
   - Take a picture. Confirm.
   - Verify the photo instantly uploads, the phone overlay closes, and the captured image dynamically appears in the PC staging area without a page refresh!
