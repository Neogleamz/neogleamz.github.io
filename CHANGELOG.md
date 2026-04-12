# SK8Lytz Application Changelog

## [1.0.4] - 2026-04-12

### Features & Refactors
- **Sitewide Button State Feedback**: Standardized the overarching A.I. Application's core button functionality to visually reflect progress and loading states globally across the webapp. Integrated the new Async state handler `executeWithButtonAction` to guarantee precise visual feedback (Saving..., Synced!) for everything from `EXPORT BACKUP` commands in the Nexuz system to complex SOP modification states.

## [1.0.3] - 2026-04-12

### Features & Refactors
- **Inventory Data Grid & ROP Management**: Added a robust live search/filtering feature to the DATAZ/EDITZ ledgers. Architected a dynamic Reorder Point (ROP) tracking system, allowing global supplier lead thresholds to be overridden on a per-item basis for highly granular component procurement alerts.

## [1.0.2] - 2026-04-11

### Features & Refactors
- **WebRTC Cycle Scanner Integration**: Built an iPhone camera-compatible WebRTC cycle count scanner directly into the STOCKZ module to allow rapid warehouse cycle counts using natively accessible camera hardware.
- **Scanner Standardization & Dual-Card Layout**: Standardized the Cycle Count camera scanner engine with the SOP editor scanner. Completely eliminated the full-screen blackout modal layout in favor of a sleek side-by-side Dual-Card flex matrix. Implemented robust cross-platform stability checks for iOS Safari, native Android, and PC Webcams (`aspectRatio: 1.0` handling for 280x280 constraints) including dynamic auto-selection of the form upon successful QR barcode locking. 

## [1.0.1] - 2026-04-11

### Features & Refactors
- **Diagnostic Telemetry Upgrade**: Eliminated silent failures across the app. Implemented robust UI traces for database syncing, parser evaluation, and error catching directly to the local application UI nodes rather than hidden debug consoles.
- **Salez Order Sync Enhancements**: Modified the CSV Parser to bypass raw local deduplication until Post-Sanitation review allows users to securely examine all raw file rows inside the Sandbox Modal visually without overwriting existing data.
- **UI Architecture Unification**: Formatted the Salez Order Sync UI flex layout and terminal structures to strictly match the visual architecture of the Orderz and Parcelz Engine traces.

### Cleanups & Bug Fixes
- Restored missing specific progress feedback to all generic operation buttons using `executeWithButtonAction` API routing.
