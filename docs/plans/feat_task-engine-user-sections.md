# Task Engine Personal Sections & Auth Module Rollout

This plan has been expanded to address both the implementation of user-specific sections for personal views (Inbox, My Tasks) and the integration of the Full Supabase Auth Module, replacing the legacy "Spoofed Identity" system.

## Design Decisions & Rationale

**1. Full Authentication Integration:**
Since all user accounts are provisioned, we will intercept the application boot sequence. If `supabaseClient.auth.getSession()` returns null, we will block the UI and display the `.login-container` overlay. Successful login via `signInWithPassword` will store the secure session and proceed to boot the application. 

**2. Transition to UUIDs (Removing Spoofing):**
Because we will now have a verified `auth.users(id)`, we will completely deprecate `localStorage.getItem('neogleamz_current_user')` and `metadata.spoofed_owner`. All queries for "My Tasks" or personal sections will accurately use `assigned_to_id === session.user.id`.

**3. Personal Sections Architecture:**
We will introduce a lightweight `personal_cycle_id` column to `taskz`. Personal sections will be `cyclez` records with no `project_id` and their `assigned_to_id` explicitly set to the user's UUID. The unified Vanilla JS `Sortable` library will allow dynamic drag-and-drop reparenting of tasks between global project cycles, personal cycles, and subtasks.

> [!NOTE]
> **Security Protocol:** The login UI will be strictly native HTML/JS. Environment variables or keys are only used safely on the client side according to the Vanilla JS security rules.

## User Review Required

> [!IMPORTANT]
> **Database Migration:** We will add `personal_cycle_id UUID REFERENCES cyclez(id)` to the `taskz` table.
> **Auth Dependency:** Because we are turning on full Auth, anyone without a password will be locked out of the sandbox. You mentioned you have the passwords ready, so please confirm this hard-gate is acceptable.

## Proposed Changes

### Supabase Database
#### [NEW] `d:\GitHub\neogleamz.github.io\supabase\migrations\20260516110000_personal_sections.sql`
- Add column `personal_cycle_id` to `taskz` referencing `cyclez(id)`.
- Ensure `assigned_to_id` on `cyclez` is accurately utilized to map personal sections to UUIDs instead of the old JSON `metadata.spoofed_owner`.

### Frontend Engine
#### [MODIFY] `d:\GitHub\neogleamz.github.io\index.html`
- Activate the `AUTHORITY LOGIN OVERLAY` logic. If no active session exists on load, prevent `#appUI` rendering and show the login card.
- Add `<script src="auth-module.js"></script>` to the head.

#### [NEW] `d:\GitHub\neogleamz.github.io\auth-module.js`
- Create the authentication service using Vanilla JS to handle `supabaseClient.auth.signInWithPassword()` and `signOut()`.
- Add global listeners for the login button and enter key.

#### [MODIFY] `d:\GitHub\neogleamz.github.io\task-engine.js`
- **Deprecate Spoofing:** Replace all `localStorage.getItem('neogleamz_current_user')` references with the true UUID fetched via `window.currentUserSession.id`.
- **Section Grouping Logic:** Update `teRenderTaskGrid()` so personal views (Inbox/My Tasks) group by `personal_cycle_id` and fetch `cyclez` where `assigned_to_id === window.currentUserSession.id`.
- **Drag-and-Drop Reparenting:** Unify `SortableJS` groups between tasks and subtasks to dynamically alter `parent_task_id`, `cycle_id`, or `personal_cycle_id` upon drop.

## Verification Plan

### Manual Verification
- Load `index.html` locally. Verify the screen is locked by the Login Overlay.
- Enter your Supabase Auth credentials. Verify successful login boots the Command Center.
- Switch to "Inbox" and click "Add section". Verify a personal section is created mapped to your UUID.
- Drag tasks natively into subtasks, and verify the hierarchy shifts properly.
