### Design Decisions & Rationale

> [!NOTE]
> To maintain project hygiene and adhere to a strict modular architecture, all one-shot utility scripts (`*.py`) from previous workflows must be archived away from the core `tools/` directory. Testing modules must be isolated in `tests/`, and documentation fragments must be filed in `docs/archive/`. This ensures the active workspace remains clean, preventing technical debt from polluting file search operations.

### Proposed Changes

#### `scripts/archive/`
- **[NEW]** Move `tools/*.py` (6 scripts) here. These are old patch utilities that shouldn't clutter the active agentic tools directory.

#### `tests/`
- **[NEW]** Move `test-dompurify.js` (from root) here.
- **[NEW]** Move `tools/test_supabase.js` here.

#### `docs/archive/`
- **[NEW]** Move `tools/Whydidthishappen.md` here. It's an ad-hoc debugging file that shouldn't reside next to core agent rules.

### Verification Plan
- Verify no tests fail when executed locally via `npm test`.
- Verify the working tree cleanly captures the `git mv` operations.
- Ensure the `tools/` folder only contains active Markdown rules and operational JS.
