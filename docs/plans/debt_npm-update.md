### Design Decisions & Rationale

> [!NOTE]
> We will execute `npm update` to bump `dompurify`, `eslint`, `jest`, and `supabase` to their latest patch and minor versions. Since these are non-breaking updates (`^` caret constraints in `package.json`), this maintains our framework-free Vanilla JS architecture with up-to-date security patches and development tools without risking major API changes. 

### Proposed Changes

#### `package.json` / `package-lock.json`
- **[MODIFY]** Execute `npm update` to safely bump the dependencies.

### Verification Plan
- Verify no tests fail when executed locally via `npm test`.
- Verify `npx eslint .` completes with 0 errors to ensure the `eslint` bump didn't break our formatting rules.
