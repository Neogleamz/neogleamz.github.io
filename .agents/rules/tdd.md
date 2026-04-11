---
trigger: always_on
---

# Test-First Standard

Whenever you are tasked with creating a new utility function, data calculation, or hardware logic service, you must follow Test-Driven Development (TDD) principles:

1. **Write the Test First**: Before modifying any application code, write a unit test (using our project's testing framework) that defines the expected behavior.
2. **Fail State**: Output the test code to the chat and confirm that, in its current state, this test would fail.
3. **Implementation**: Write the actual feature code designed specifically to make that test pass.
4. **Verification**: If possible, use your terminal tools to run the test suite and confirm it passes before asking me for further instructions.
