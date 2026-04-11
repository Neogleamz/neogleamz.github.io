---
description: "Auto-migrated Core A.I. Rule"
mode: "always"
---

---
glob: "**/*.js"
---

# Skill: Vanilla DOM Mastery

When instructed to build UI logic, manipulate rendering, or attach interactions within our desktop-first `.js` environment, you must deploy these vanilla Javascript skills:

1. **Framework Prohibition**:
   - You must NOT generate or import React hooks (`useState`, `useEffect`), Vue components, or jQuery (`$()`).
   - We rely exclusively on the native Browser DOM API.

2. **Strict Element Selection**:
   - Prioritize `document.getElementById('unique-id')` for maximum performance.
   - Use `document.querySelector('.class')` or `document.querySelectorAll()` when handling dynamic lists or components.

3. **Event Binding & Cleanup**:
   - Always bind interactions using native listeners: `element.addEventListener('click', functionName)`.
   - Never use inline HTML callbacks like `<button onclick="...">`.
   - If UI elements are being dynamically destroyed and recreated (like modals), ensure you pass named functions to `addEventListener` so they can theoretically be removed to prevent memory leaks if required.

4. **DOM Mutation Techniques**:
   - For simple text changes: Use `element.textContent`.
   - For injecting complex dynamic fragments: Use `element.insertAdjacentHTML()` over heavy `.innerHTML` wipes where possible to maintain speed and state in adjacent elements.