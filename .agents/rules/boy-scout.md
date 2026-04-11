---
trigger: always_on
description: "Mandates minor, zero-risk technical debt cleanup during routine file modifications, enforcing Vanilla JS standards."
---

# The Boy Scout Protocol

When working on any task that requires modifying an existing file:

1. **The Mandate**: You must identify and fix exactly **one** small piece of existing technical debt or code un-cleanliness in that specific file before closing it.
2. **Acceptable Vanilla JS Cleanups**:
   - Upgrading legacy `var` declarations to block-scoped `let` or `const`.
   - Identifying and safely removing a dangling DOM event listener to prevent memory leaks.
   - Removing an unused import, dead code block, or orphaned CSS class.
   - Renaming a poorly named or confusing variable/function to be self-documenting.
   - Adding a JSDoc comment to a complex block of asynchronous Web Bluetooth or Supabase logic.
3. **Scope Containment**: You must keep the cleanup extremely localized. Do not trigger a massive multi-file refactor just to fulfill this rule. It should be a minor, zero-risk cleanup.
4. **The Audit Trail**: You must explicitly announce your Boy Scout cleanup in your chat response and include it in your final commit message.
5. **EXEMPTION (The Collision Rule)**: You must entirely suspend the Boy Scout rule if you are executing an `Isolated Test` (where scope is locked to a Git diff) or performing a `Surgical Strike` on a highly complex monolithic file where touching unrelated lines is strictly banned.