# Fix Socialz ESLint Warnings

Resolve 3 persistent ESLint warnings in `socialz-module.js` to bring our code debt down.

## Design Decisions & Rationale
To fix the warnings natively, we will explicitely bind `IntersectionObserver` to the `window` object to satisfy the global namespace rule, remove the completely unused `ig` variable declaration in the avatar fallback logic, and destructure only the `error` object from the Supabase storage upload response. This keeps the file perfectly clean without needing ad-hoc ESLint ignore comments.

## Proposed Changes

### Assets (JS)

#### [MODIFY] [socialz-module.js](file:///d:/GitHub/neogleamz.github.io/assets/js/socialz-module.js)
- **Line 34**: Change `new IntersectionObserver(...)` to `new window.IntersectionObserver(...)` to fix the `no-undef` warning.
- **Line 62**: Remove `ig = img.getAttribute('data-ig'),` from the variable declarations in `handleAvatarError()` since it is never used in the fallback chain.
- **Line 966**: Change `const { data, error } = ...` to `const { error } = ...` since `data` is never consumed after the upload.

## Verification Plan
1. Run `npx eslint .` to verify zero warnings and errors.
