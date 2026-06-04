# High-Level Architecture Document: Mobile Audit Console Sync & Fullscreen Modal

## 1. Context & Objectives
The current "Cycle Count Modal" (Stockz Audit & Planning Console) is constrained as a small floating window on the PC, limiting visibility. Additionally, the mobile remote scanner (`remote-scanner.html`) acts as a "dumb" barcode string dispatcher rather than a true companion app. The objective is to:
1. Expand the PC Audit Console to a true full-screen overlay (removing modal constraints).
2. Upgrade the mobile remote scanner to be a 1:1 functional clone of the PC Audit Console.
3. Fix the WebRTC/Camera preview sync bug where the PC doesn't render the phone's camera feed.
4. Auto-trigger the PC Audit Console logic instantaneously when the phone scans an item.

## 2. Architectural Overview (Context Level)
The new architecture bridges `inventory-module.js` and `remote-scanner.html` via the existing Supabase Realtime `syncChannel`. 
- **PC Side**: The DOM structure of `#stockzAuditLayoutWrapper` will be overhauled from a constrained modal window to a CSS Grid `100vw/100vh` absolute overlay. 
- **Mobile Side**: `remote-scanner.html` will inherit a "Bottom Sheet" overlay design, porting over the "Quick Delta" and "Physical Audit" UI templates from the PC. It will utilize the exact same `ccMobileItemSelect` logic but augmented to compute deltas locally.

## 3. Industry Standard Validation

### Security & Performance
- **Camera Frame Optimization**: Subagent analysis revealed that `remote-scanner.html` is NOT using true WebRTC Peer-to-Peer tracks. It is using a hidden `<canvas>` to draw frames, compress them to 35% Base64 JPEG, and blast them over Supabase WebSockets. This is inherently laggy and why the PC feed fails. We must maintain aggressive throttling (e.g., max 15 FPS) to prevent WebSocket buffer overflows, or transition to a true WebRTC `RTCPeerConnection` for the `MediaStreamTrack`.
- **Memory Leaks**: When making the PC modal full-screen, we must ensure that closing it completely destroys the DOM listeners and stops the webcam tracks (`Html5Qrcode` teardown) so the browser doesn't bleed memory in the background.

### Vanilla JS & Data Flow
- **Event Forwarding**: When the phone fires `REMOTE_BARCODE_SCAN` to the PC, the PC currently just receives the text. We will implement an event listener in `inventory-module.js` that intercepts this payload and immediately invokes `window.click_openStockzAuditModal()` programmatically, ensuring the PC screen updates to the exact item the phone just scanned.
- **State Hydration**: On connection (`SESSION_TRANSFER`), the PC will transmit the `catalogCache` and `inventoryDB` metadata over the WebSocket so the phone can render the Audit Console UI (Expected Stock, Scrapped) without doing heavy Supabase queries itself.

### UI/UX Strategy
- **Glanceable UI (Flexbox)**: The PC will adopt a dual-pane CSS Grid layout. The floating `.massive-container` borders will be removed so content snaps flush to the viewport.
- **Mobile Bottom-Sheet**: To fit the Audit Console onto a phone while keeping the camera visible, a swipeable Bottom Sheet UI (fixed to the bottom of the viewport) will be implemented. Operators can swipe down to see the camera, and swipe up to perform Quick Delta adjustments using large tactile `+` / `-` buttons.

## 4. Design Decisions & Trade-offs
- **WebSocket Video vs. True WebRTC**: True WebRTC is incredibly complex to build in Vanilla JS without a library like SimplePeer, requiring STUN/TURN servers. We have opted to *keep* the WebSocket Base64 Canvas hack for the camera preview because it bypasses NAT firewalls easily, but we will optimize the canvas resolution and compression ratio to ensure it renders reliably on the PC.
- **Client-Side Hydration vs Direct DB Queries**: Rather than the phone querying Supabase directly for inventory data, we decided the PC will act as the "Server" and pass its local memory cache to the phone. This prevents race conditions and ensures the PC and Phone are looking at the exact same ledger state instantly.
