---
trigger: always_on
---

# Web Browser-First & Responsive Standards Rule

Whenever you are tasked with generating an Implementation Plan, writing code, or refactoring anything involving User Interface (UI) components or web views, you must strictly adhere to the following standards:

1. **Browser-First Responsiveness**:
   - The application is a web portal first and foremost. Prioritize desktop browser layouts and ensure they logically collapse/stack gracefully on smaller screens.
   - Never use hardcoded pixel values for structural layout widths, heights, or positioning. 
   - You must heavily utilize flexible layout systems (Flexbox or CSS Grid) and relative units (%, vw, vh, rem) to ensure the UI scales fluidly from massive desktop screens all the way down to small mobile browsers.

2. **Web Capabilities vs Native Assumptions**:
   - The codebase must run cleanly in all modern web browsers (Chrome, Safari, Edge). 
   - Avoid treating this as a compiled native iOS/Android application. Do not enforce rigid native app constructs (e.g., restricted ViewControllers or strict native mobile Safe Areas) that conflict with fluid web layouts.
   - Web APIs should be preferred (e.g., Web Bluetooth API) with graceful fallbacks. Do not write conditional native bridging code (Swift/Kotlin) since the environment is strictly web-based.

3. **Touch-Friendly Mobile Web Design**:
   - While prioritizing the browser, mobile interactions must remain seamless. All interactive elements (buttons, sliders, dropdowns) must have a minimum touch target size of 44x44 points to prevent "fat-finger" errors on mobile views.
   - Incorporate visual web feedback (CSS `:active` states, `:hover` states, or opacity changes) for all click/touch interactions to mimic high-end app responsiveness.

4. **Planning Phase Requirement**:
   - When drafting your Implementation Plan (as dictated by the Auto-Branching Rule), you must add a subsection under your Rationale titled `### UI & Scaling Strategy`.
   - In this section, briefly explain how your proposed CSS and layout will scale gracefully from Desktop down to Mobile browsers natively.
