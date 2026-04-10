---
trigger: always_on
---

# Mobile-First & Cross-Platform Standards Rule

Whenever you are tasked with generating an Implementation Plan, writing code, or refactoring anything involving User Interface (UI), frontend components, or device-specific APIs, you must strictly adhere to the following standards:

1. **Absolute Responsiveness**:
   - Never use hardcoded pixel values for widths, heights, or positioning. 
   - You must use flexible layout systems (like Flexbox or Grid) and relative units (%, vw, vh, rem) to ensure the UI scales fluidly from small mobile screens to large tablets.
   - You must account for device "Safe Areas" (notches, dynamic islands, and bottom gesture bars) to prevent UI elements from being clipped.

2. **Cross-Platform Parity (iOS & Android)**:
   - The codebase must compile and render natively on both iOS and Android. 
   - Avoid platform-exclusive UI libraries unless absolutely necessary. 
   - If a feature requires platform-specific native code (e.g., Bluetooth LE permissions for the lighting controller), you must implement conditional logic to handle both the iOS and Android execution paths gracefully without crashing.

3. **Touch-First Design**:
   - All interactive elements (buttons, sliders, wheel selectors) must have a minimum touch target size of 44x44 points.
   - Incorporate visual feedback (active states, ripples, or opacity changes) for all touch interactions.

4. **Planning Phase Requirement**:
   - When drafting your Implementation Plan (as dictated by the Auto-Branching Rule), you must add a subsection under your Rationale titled `### UI & Platform Strategy`.
   - In this section, briefly explain how your proposed code ensures responsive scaling and handles any iOS/Android differences.
