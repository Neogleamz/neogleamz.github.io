# Implementation Plan - Login Boot Progress Modal

### Design Decisions & Rationale
We will intercept the application's boot sequence at `window.onload` and `handleLogin`. Instead of immediately rendering `#appUI` and hiding `#loginUI` while assets load asynchronously, we will display an immersive glassmorphism progress modal within the login container. This ensures that the user is never exposed to an uninitialized main application interface, preventing interaction clicks during active network fetches and state hydration.

## Proposed Changes

### [Component Name]

#### [MODIFY] [index.html](file:///d:/GitHub/neogleamz.github.io/index.html)
- Add a CSS transitions and styling for `#bootProgressArea` to match the neon orange Neogleamz visual hierarchy.
- Inject a `#bootProgressArea` overlay inside the `.login-card` next to `#loginFormArea` to show linear animation, loading state text, and micro-diagnostics console substatus.
- Define a global `setBootProgress(percent, statusText, substatusText)` utility.
- Add `startBootSequence()` function to cleanly transition the `.login-card` to boot status, trigger the application `launchApp()`, and swap UI displays only upon 100% completion.
- Refactor `window.onload` and `handleLogin()` to utilize the `startBootSequence` control wrapper instead of direct immediate showing of `#appUI`.
- Inject progress telemetry calls (`setBootProgress`) at key lifecycle milestones inside `launchApp` and `loadData` modules.

---

## Verification Plan

### Automated Tests
- Since the login state relies on active Supabase Auth sessions, we will run the dev server and verify visually using Edge DevTools.
- Verify through console log inspections that no async errors or unhandled rejections are introduced.

### Manual Verification
1. Run `http://127.0.0.1:5500/` in the browser.
2. If already logged in, verify the gorgeous progress loader displays on boot and gracefully routes to the `stockpilez` tab once completed.
3. Log out to return to the login interface.
4. Input credentials and hit Authenticate.
5. Verify the login card transitions to the system booting view, shows real-time progress text ("Configuring client settings", "Syncing database", "Caching inventory", "Compiling formulas"), and opens the Command Center smoothly.
