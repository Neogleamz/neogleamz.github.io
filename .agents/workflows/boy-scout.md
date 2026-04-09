---
trigger: always_on
---

# The Boy Scout (Tech Debt) Rule

When working on any task that requires modifying an existing file:
1. You must identify and fix exactly **one** small piece of existing technical debt or code un-cleanliness in that specific file before closing it.
2. Examples of acceptable Boy Scout cleanups:
   - Fixing an `any` type in TypeScript to a strict interface.
   - Removing an unused import or dead code block.
   - Adding a missing variable to a React `useEffect` or `useCallback` dependency array.
   - Renaming a poorly named or confusing variable/function to be self-documenting.
   - Adding a JSDoc comment to a complex block of logic.
3. You must keep the cleanup extremely localized. Do not trigger a massive multi-file refactor just to fulfill this rule. It should be a minor, zero-risk cleanup.
4. You must explicitly announce your Boy Scout cleanup in your chat response and include it in your final commit message.
