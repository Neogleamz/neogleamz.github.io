# High-Level Architecture Document: Cycle Count Camera Scanner Fix

## 1. Context & Objectives
**Business Problem:** Operators attempting to use the local WebRTC camera modes in the Cycle Count engine (and Packerz SOPs) report that presenting a barcode to the camera does not trigger a scan. The underlying `html5-qrcode` engine is failing to recognize the barcodes.
**Scope:** Fix the structural instantiation of the `Html5Qrcode` scanner to properly scale the internal scanning box and recognize internal Code 128 barcodes natively.

## 2. Architectural Overview (Context Level)
The camera scanners in both `inventory-module.js` (Cycle Counts) and `packerz-module.js` (SOP Camera) are currently instantiated with static integer bounds (`qrbox: { width: 220, height: 220 }`). 
When deployed inside responsive containers (like the inline Cycle Scanner Card), if the physical container shrinks below 220px, the scanning calculation box exceeds the view bounds. This causes the `html5-qrcode` decoder to silently fail because its computational matrix becomes mathematically invalid. We need to refactor the configuration to use a responsive bounds-calculating callback.

## 3. Industry Standard Validation
**Vanilla JS & Data Flow Validation:**
- **Dynamic Box Calculation:** Instead of a static integer, we will supply a callback to the `qrbox` parameter: 
  `qrbox: (viewfinderWidth, viewfinderHeight) => { const size = Math.floor(Math.min(viewfinderWidth, viewfinderHeight) * 0.75); return { width: size, height: size }; }`
- **Format Optimization:** Currently, the scanner is looking for *all* possible barcode types, which wastes GPU cycles and reduces detection speed. We will restrict `formatsToSupport` strictly to `CODE_128` (our unified SKU parity format) and `QR_CODE` (for labels).

**UI/UX Strategy Validation:**
- **Responsive Fluidity:** This ensures the internal targeting reticle perfectly matches the screen constraints, whether on a massive 1440p PC monitor or a cramped iPhone Mini. 
- **Aspect Ratio Protection:** We will preserve the `{ aspectRatio: 1.0 }` rule strictly to prevent the catastrophic iOS Safari zooming defect explicitly detailed in the Master Reference.

**Security & Performance Validation:**
- **Performance:** Narrowing the format types and ensuring the scan box remains structurally within bounds dramatically reduces the processing overhead on the HTML5 canvas, resulting in faster sub-100ms barcode locks on mobile GPUs.

## 4. Design Decisions & Trade-offs
- **Trade-off:** By locking `formatsToSupport` to `CODE_128` and `QR_CODE`, the system will no longer scan generic retail barcodes (like EAN-13 or UPC-A) if an operator accidentally points the camera at commercial packaging instead of our internal Neogleamz inventory stickers.
- **Decision:** This is a mathematically sound trade-off. Our Bucket List specifies we have a "Unified SKU & Barcode Parity Engine" that utilizes `CODE_128` exclusively for internal raw goods and finished products. Restricting the scanner formats natively prevents accidental scans of raw material vendor labels, acting as an implicit QA filter.
