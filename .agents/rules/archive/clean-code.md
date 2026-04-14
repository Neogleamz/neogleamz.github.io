---
name: clean_code
description: "Strict enforcement of Vanilla JS modularity, ES6+ syntax, and code cleanliness."
trigger: always_on
---

# Coding Standards & Clean Code Rule

Whenever you generate an Implementation Plan, write code, or refactor an existing file, you must strictly adhere to the following Vanilla JS engineering standards:

1. **Architecture & Organization**:
   - **Modularity:** Never write monolithic files. Separate concerns strictly. For example, hardware/Web Bluetooth logic must be in isolated service modules (e.g., `services/zenggeController.js`), completely separate from DOM manipulation logic or Supabase data-fetching modules.
   - **Single Responsibility:** A function should do exactly one thing. If a function is longer than 50 lines, evaluate if it can be broken down into smaller, testable helper functions.

2. **Modern Syntax & Execution**:
   - Use modern ES6+ syntax consistently (e.g., destructuring, template literals, arrow functions, ES modules).
   - Prefer `async/await` over raw Promises or callbacks, especially for asynchronous Web Bluetooth communication or Supabase calls.
   - **Strict Error Handling:** Wrap all asynchronous operations in `try/catch` blocks. Never swallow errors silently; log them meaningfully to the console and pass them up to the UI so the user sees a graceful failure message.

3. **Cleanup & Readability (The Boy Scout Rule)**:
   - **No Dead Code:** Delete commented-out code blocks, unused imports, and obsolete variables immediately. Do not leave "just in case" code behind.
   - **Remove Debugging Artifacts:** Strip out all temporary `console.log` statements before committing (unless they are specifically part of an intentional `AppLogger` utility meant for production telemetry).
   - **Naming Conventions:** Use extremely descriptive, self-documenting variable and function names (e.g., `connectToSkateController()` instead of `connect()`, `wheelColorHex` instead of `color`).

4. **Self-Correction Mandate**:
   - If you are editing a file to add a new feature and you notice the surrounding code violates these standards, you must cleanly refactor the surrounding code as part of your commit. Leave the file cleaner than you found it.
