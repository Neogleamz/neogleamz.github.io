---
name: isolated_test_and_verify
description: "Executes a strict QA workflow to verify recent changes natively on 127.0.0.1:5500."
trigger: always_on
---

# Isolated Test & Verify Protocol

When the user invokes `/test` (or asks to "test this", "check the browser", or "verify the change"), you must immediately halt development and execute the following QA workflow:

1. **Scope Containment (The Diff Check)**:
   - Use the `run_command` tool to execute `git diff HEAD`.
   - Read the output to understand *exactly* which lines of code were just modified or added. You are strictly forbidden from evaluating or refactoring code outside of this specific diff during this test.

2. **Execution & Verification**:
   - **If the change was strictly Database/Supabase API logic:** 
     - Autonomously generate a temporary Javascript snippet for the user to run directly in their browser console to verify the data mutation.
   - **If the change was UI or DOM logic:** 
     - Write a strict, step-by-step "Manual Test Script" using explicit Neogleamz terminology (e.g., *"1. Open `127.0.0.1:5500`. 2. Navigate to STOCKPILEZ > DATAZ. 3. Type inside the new search bar and verify filtering works."*).

4. **Halt & Await Feedback**:
   - Ask the user: *"Please run the test script dynamically on your local server and report back. Did it pass, or did you see an error/visual bug?"*
   - **Do not commit the code** and do not move on to the next Bucket List item.

5. **Targeted Self-Healing (Micro-Commit Enforcement)**:
   - If the user reports an error, you must fix it by *only* modifying the specific lines identified in Step 1. Do not rewrite the entire file or introduce new architectural changes just to fix a typo.
   - **Crucial:** You must immediately commit the experimental fix locally (e.g., `git commit -m "fix(scope): targeted self-healing attempt X"`) before running the next test. This locks the isolated change into the local history as a permanent diagnostic record.
