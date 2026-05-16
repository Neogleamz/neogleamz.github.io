# Implementation Plan: Sandbox Engine Immersive Refactor

Upgrade the "Net Profit Sandbox Engine" to a full-screen immersive terminal with strict metric color-coding to improve financial forensic clarity.

### Design Decisions & Rationale
To transform the Math Simulator into a high-fidelity forensic tool, we need to eliminate "visual noise." Moving to a full-screen immersive view (`100vw/100vh`) forces focus on the logic. By assigning strict, unique hex-codes to every financial metric, we allow the eye to instantly correlate the UI state cards with the complex math strings in the console logs. I chose a high-contrast palette (Rose/Amber/Emerald/Sky) to signify distinct stages of the profit waterfall.

## User Review Required

> [!IMPORTANT]
> **Full-Screen Transition**: This will change the modal from a windowed view to a 100vw/100vh immersive experience.
> **Color Standard**: Every financial metric will now have a dedicated, unique color that persists across both the UI cards and the console logs.

## Proposed Changes

### [Component] index.html

#### [MODIFY] [index.html](file:///d:/GitHub/neogleamz.github.io/index.html)
- Refactor `#math-simulator-modal .massive-container` to use `width: 100vw; height: 100vh; max-width: none; border-radius: 0;`.
- Remove rounded corners and border-radius from the container.

### [Component] sales-module.js

#### [MODIFY] [sales-module.js](file:///d:/GitHub/neogleamz.github.io/sales-module.js)
- **Define Color Palette Constants**:
  - `COLOR_CAPTURE = "#0ea5e9"` (Sky)
  - `COLOR_FEE = "#f43f5e"` (Rose)
  - `COLOR_SHIP = "#f59e0b"` (Amber)
  - `COLOR_COGS = "#fb7185"` (Salmon)
  - `COLOR_REFUND = "#8b5cf6"` (Purple)
  - `COLOR_NET = "#10b981"` (Emerald)
- **Update `renderMathSimulator`**: Apply colors to the "Live Engine Calcs" row.
- **Update `recomputeSimulator`**: Sync the console log span colors to match the UI metrics.

## Verification Plan

### Manual Verification
- Open REVENUEZ -> ORDERZ.
- Click "ACTUAL NET" -> "RUN SIMULATION".
- Verify the modal covers the entire screen.
- Load an order and confirm that "Engine Capture" (Sky) in the UI matches the "Capture Eq" color in the console.
- Confirm "Final Net Profit" (Emerald) is consistent throughout.
