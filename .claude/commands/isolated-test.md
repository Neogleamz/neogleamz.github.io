---
description: Executes a strict QA workflow to verify recent changes natively on 127.0.0.1:5500. (triggers: always_on)
allowed-tools: Bash(git*), Bash(npm*), Bash(npx*), Read, Edit, Write, Grep, Glob
---

# Isolated Test & Verify Protocol

When the user invokes `/test` (or asks to "test this", "check the browser", or "verify the change"), you must immediately halt development and execute the following QA workflow:

1. **Scope Containment (The Diff Check)**:
   - Use the `run_command` tool to execute `git diff HEAD`.
   - Read the output to understand *exactly* which lines of code were just modified or added. You are strictly forbidden from evaluating or refactoring code outside of this specific diff during this test.

2. **Server Initialization**:
   - Use the `run_command` tool to autonomously start the local development server by executing `npx serve -l 5500` (or the equivalent local server command) in the background. **Do not wait** for the user to ask you to start the server.

3. **Execution & Verification**:
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

## 🛑 MANDATORY OUTPUT FORMAT (ALL MODELS MUST FOLLOW)

> [!CAUTION]
> **STRICT LINKING MANDATE:** You MUST NEVER surround file paths with backticks (like ile.md). You MUST ALWAYS use standard Markdown hyperlink syntax so the user can natively click them (e.g., [file.md](file:///absolute/path/to/file.md)).

Every model (Claude, Gemini, GPT) must produce this exact structure when executing `/isolated_test_and_verify`. You are strictly forbidden from summarizing as plain prose paragraphs.

> [!NOTE]
> 🧠 **Scope Containment (Diff Check)**
> *(Brief summary of the specific lines or files that were modified, confirming scope containment.)*

> [!SUCCESS]
> 🛠️ **Server Initialized**
> *(Confirmation that the local server is actively running via npx serve or similar.)*

> [!IMPORTANT]
> 🚨 **Manual Test Script Authorization Required**
> 
> Please run the following manual test sequence dynamically on your local server to verify the modifications. **Do not proceed with any other changes until this is confirmed.**
> 
> **The Test Protocol:**
> 1. Open `127.0.0.1:5500` in your browser.
> 2. *(Step 2)*
> 3. *(Step 3)*
> 
> **Report Back:**
> Please run this test and report back. Did it pass seamlessly, or did you encounter visual ghosting, layout collisions, or contrast errors?
