---
name: dependency_diet
description: "Triggers whenever the AI attempts to add an external library, forcing a justification check and prioritizing native Browser APIs."
trigger: "/dependency_diet, /dependencies, verify dependencies, check dependencies"
---

# Dependency Diet & Anti-Bloat Protocol

Whenever your Implementation Plan requires adding a new external library, package, or script dependency (whether via `npm install` or a CDN `<script>` tag), you must pause the execution workflow and execute the following justification check:

1. **Native Alternative Check (Browser Exclusivity)**: Can this problem be solved using native Browser Web APIs (e.g., standard ES6+ JavaScript, CSS3, `fetch`, `window.crypto`, DOM manipulation) without importing a library? 
   - If yes, you are strictly forbidden from suggesting the external library. Write the native Vanilla JS code instead.
2. **The 3-Point Justification**: If an external library is absolutely unavoidable to save significant development time, you must present a "Dependency Proposal" to the user containing:
   - **Weight**: The approximate unpacked/minified size of the library in kilobytes.
   - **Activity**: When was the last commit to this library's repository? (Is it abandoned?)
   - **Necessity**: Why our native browser code cannot realistically handle this.
3. **The Micro-Alternative**: Always propose a smaller, zero-dependency, or micro-library alternative alongside the heavy standard choice (e.g., suggesting native `Intl` or `date-fns` instead of `moment.js`).
4. **Approval Gate (HALT)**: You must **HALT** and explicitly ask: *"Do I have permission to add this dependency to our project?"* Do not run any install commands or inject CDN links until the user explicitly approves.