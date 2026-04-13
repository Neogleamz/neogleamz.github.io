---
name: vanilla_dom
description: "Strictly enforced coding standard for all UI logic and rendering."
trigger: always_on
---

# Vanilla DOM Mastery

When instructed to build UI logic, manipulate rendering, or attach interactions within our client-side `.js` environment, you must strictly adhere to these vanilla Javascript constraints:

1. **Framework Prohibition**:
   - You must NOT generate or import React hooks (`useState`, `useEffect`), Vue components, or jQuery (`$()`).
   - Rely exclusively on the native Browser DOM API.

2. **Strict Element Selection**:
   - Prioritize `document.getElementById('unique-id')` for maximum performance.
   - Use `document.querySelector('.class')` or `document.querySelectorAll()` when handling dynamic lists or components.

3. **Event Binding & Cleanup (Memory Leak Prevention)**:
   - Always bind interactions using native listeners: `element.addEventListener('click', functionName)`.
   - NEVER use inline HTML callbacks (e.g., `<button onclick="...">`).
   - When attaching events to UI elements that will be dynamically destroyed and recreated, you must pass named functions to `addEventListener` and provide the explicit logic to `removeEventListener` prior to element destruction.

4. **DOM Mutation Techniques**:
   - For simple text changes: Use `element.textContent`.
   - For injecting complex dynamic fragments: Use `element.insertAdjacentHTML()` over heavy `.innerHTML` wipes to maintain speed and preserve state in adjacent elements.

5. **Pure Flex Architecture (No Rigid Hacks)**:
   - You MUST design every page, modal, popup, text element, and button as purely fluid and dynamically scalable using Native Flexbox (`display: flex`).
   - You are explicitly FORBIDDEN from using `position: absolute`, fixed height integers (`height: 26px`), or negative margins to forcefully center structural UI elements.
   - Trust natural document flow: use `justify-content` and `align-items` uniformly, and allow containers to gracefully wrap into new rows or columns when squeezed on mobile viewports.
