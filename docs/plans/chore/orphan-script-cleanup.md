# Relocate Orphan Root Scripts

Relocate 6 loose utility scripts from the project root to the `scripts/` directory to maintain repository hygiene and modularity.

## User Review Required

> [!IMPORTANT]
> **Hardcoded Keys**: `test-supabase.js` contains a hardcoded publishable key. This is a security risk. As part of the relocation, I will refactor it to use `.env.local` or environment variables, similar to `tools/test_supabase.js`.

## Proposed Changes

### Scripts Relocation

#### [MOVE] [check_ids.js](file:///d:/GitHub/neogleamz.github.io/check_ids.js) -> `scripts/check_ids.js`
#### [MOVE] [check_openapi.js](file:///d:/GitHub/neogleamz.github.io/check_openapi.js) -> `scripts/check_openapi.js`
#### [MOVE] [check_schema.js](file:///d:/GitHub/neogleamz.github.io/check_schema.js) -> `scripts/check_schema.js`
#### [MOVE] [test-fetchall.js](file:///d:/GitHub/neogleamz.github.io/test-fetchall.js) -> `scripts/test-fetchall.js`
#### [MOVE] [test-supabase.js](file:///d:/GitHub/neogleamz.github.io/test-supabase.js) -> `scripts/test-supabase.js`
#### [MOVE] [test.js](file:///d:/GitHub/neogleamz.github.io/test.js) -> `scripts/test.js`

## Verification Plan

### Automated Tests
- Run `npm test` to ensure no regressions in core logic (though these scripts are independent utilities).
- Run `npx eslint .` to verify paths and syntax.

### Manual Verification
- Verify the files are moved using `ls`.
- Verify the root is clean of these specific orphans.
