# Goal Description
Fix unguarded `.innerHTML` assignments in `index.html` to prevent Cross-Site Scripting (XSS) vulnerabilities. We are specifically targeting locations where dynamically generated error strings (`error.message`) are injected directly into the DOM without sanitization.

### Design Decisions & Rationale
We will wrap the vulnerable string assignments using our globally established `window.safeHTML` protocol. To ensure backward compatibility with our automated test suite (which may mock or lack the `window` object extensions), we will implement the standard conditional fallback: `window.safeHTML ? window.safeHTML(payload) : payload`. This adheres strictly to our Vanilla JS constraints and the Zero-Trust DOM security architecture outlined in the Master Reference.

## Proposed Changes

### Core Security Updates

#### [MODIFY] [index.html](file:///d:/GitHub/neogleamz.github.io/index.html)
- **Supabase Connectivity Check**: Update the error state rendering (`btn.innerHTML = ...`) to safely sanitize the `e.message` payload.
- **Tipz Board Loading**: Update the fetch failure block (`container.innerHTML = ...`) to safely sanitize the `error.message` payload.
- **Tipz Board Exception Catch**: Update the outer `catch (error)` block (`container.innerHTML = ...`) to safely sanitize the `error.message` payload.

## Verification Plan

### Automated Tests
- Execute `npm test` to verify that the conditional safeHTML checks do not break the test suite.
- Execute `npx eslint .` to confirm zero syntax regressions.

### Manual Verification
- N/A — This is a pure security patch wrapping existing logic. No behavioral changes should be visible to end users.
