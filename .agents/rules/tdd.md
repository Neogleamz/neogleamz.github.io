---
name: test_driven_development
description: "Triggers when the user asks to create a new utility function, data calculation, or pure logic service to enforce TDD principles."
trigger: always_on
---

# Test-First Standard

Whenever tasked with creating new pure logic, data calculations, or utility functions, you must execute the following Test-Driven Development (TDD) sequence:

1. **Context Check**: Verify if the requested logic requires Browser DOM APIs (`window`, `document`) or physical hardware ports. If it does, ask the user if they have a mock environment (like JSDOM) set up before proceeding. If it is pure Javascript logic, proceed to Step 2.
2. **Write the Test First**: Before writing any implementation code, write a unit test using [INSERT YOUR FRAMEWORK HERE, e.g., Vitest / Jest] that defines the expected behavior.
3. **The Red Phase (Fail State)**: 
   - Save the test file.
   - Use your terminal tools to run the specific test. 
   - Output the terminal result to the chat to prove the test currently fails (since the feature doesn't exist).
4. **The Green Phase (Implementation)**: Write the actual feature code designed strictly to make that specific test pass. Do not over-engineer beyond the test parameters.
5. **Verification**: Run the test suite again via the terminal. Once the test passes, present the final, working code to the user.
