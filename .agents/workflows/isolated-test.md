---
name: isolated_test_and_verify
description: "Executes a strict QA workflow to verify recent changes, utilizing manual browser steps for UI/Bluetooth and isolated tests for DB logic."
trigger: "/test, test this, check the browser, verify the change"
---

# Isolated Test & Verify Protocol

When the user invokes `/test` (or asks to "test this", "check the browser", or "verify the change"), you must immediately halt development and execute the following QA workflow:

1. **Scope Containment (The Diff Check)**:
   - Use the `run_command` tool to execute `git diff HEAD`.
   - Read the output to understand *exactly* which lines of code were just modified or added. You are strictly forbidden from evaluating or refactoring code outside of this specific diff during this test.

2. **Environment Boot**:
   - If the local development server (e.g., Vite) is not already running, use your tools to start it (e.g., `npm run dev`). 
   - Note the local port (usually `http://localhost:5173`).

3. **Execution & Verification (Context Branching)**:
   - **If the change was strictly Database/Supabase API logic:** - Autonomously write a temporary, isolated `curl` command (using Supabase REST endpoints) or a Vanilla JS browser console snippet to verify the data mutation. 
     - Analyze the output to prove the logic works.
   - **If the change was UI, DOM logic, or Hardware/Web Bluetooth:** - *Crucial Context:* Web Bluetooth requires physical human gestures. You cannot automate hardware tests.
     - Output the exact `localhost` URL the user needs to open.
     - Write a strict, step-by-step "Manual Test Script" for the user to execute (e.g., *"1. Go to /lights. 2. Tap the 'Connect' button to trigger the browser BLE prompt. 3. Verify the skates turn blue."*).

4. **Halt & Await Feedback**:
   - Ask the user: *"Please run the test above and report back. Did it pass, or did you see an error/visual bug?"*
   - **Do not commit the code** and do not move on to the next Bucket List item.

5. **Targeted Self-Healing (Micro-Commit Enforcement)**:
   - If the user reports an error, you must fix it by *only* modifying the specific lines identified in Step 1. Do not rewrite the entire file or introduce new architectural changes just to fix a typo.
   - **Crucial:** You must immediately commit the experimental fix locally (e.g., `git commit -m "fix(scope): targeted self-healing attempt X"`) before running the next test. This locks the isolated change into the local history as a permanent diagnostic record.