---
trigger: always_on
---

# Dependency Diet & Anti-Bloat Protocol

Whenever your Implementation Plan requires adding a new external library, package, or dependency (e.g., via `npm install`), you must pause the execution workflow and execute the following justification check:

1. **Native Alternative Check**: Can this problem be solved using native Node.js APIs, standard JavaScript (ES6+), or CSS without importing a library? 
   - If yes, you are forbidden from suggesting the external library. Write the native code instead.
2. **The 3-Point Justification**: If a library is absolutely unavoidable, you must present a "Dependency Proposal" to me containing:
   - **Weight**: The approximate unpacked size of the library.
   - **Activity**: When was the last commit to this library's repository? (Is it abandoned?)
   - **Necessity**: Why our native code cannot handle this.
3. **The Micro-Alternative**: Always propose a smaller, zero-dependency, or micro-library alternative alongside the heavy standard choice (e.g., suggesting `date-fns` or native `Intl` instead of `moment.js`).
4. **Approval Gate**: You must explicitly ask: "Do I have permission to add this dependency to our project?" Do not run the install command until I approve.
