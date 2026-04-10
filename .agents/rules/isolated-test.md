# Isolated Test & Verify Protocol

When my prompt includes "test this", "check the browser", "verify the change", or "does this work?", you must immediately halt development and execute the following QA workflow:

1. **Scope Containment (The Diff Check)**:
   - Use the `run_command` tool to execute `git diff HEAD`.
   - Read the output to understand *exactly* which lines of code were just modified or added. You are strictly forbidden from evaluating or refactoring code outside of this specific diff during this test.

2. **Environment Boot**:
   - If the local development server is not already running, use your tools to start it (e.g., `npm run dev` or `npm start`). 
   - Note the local port (e.g., `http://localhost:3000`).

3. **Execution & Verification (Branching Logic)**:
   - **If the change was Backend/API/Hardware logic:** - Autonomously write a temporary, isolated test script (or use `curl`) to ping the exact endpoint or function you just modified. 
     - Execute the test. Analyze the terminal output to prove the logic works.
   - **If the change was UI/Frontend:** - Output the exact `localhost` URL I need to open in my browser.
     - Write a strict, 3-step "Manual Test Script" for me to execute. (e.g., "1. Go to /skate-view. 2. Tap the top-left wheel. 3. Verify it highlights blue.")

4. **Halt & Await Feedback**:
   - Ask me: "Please run the test above and report back. Did it pass, or did you see an error/visual bug?"
   - **Do not commit the code** and do not move on to the next bucket list item.

5. **Targeted Self-Healing**:
   - If I report an error, you must fix it by *only* modifying the lines identified in Step 1. Do not rewrite the entire file or introduce new architectural changes to fix a typo.
