# Bump Outdated Dependencies (`debt/deps`)

### Design Decisions & Rationale
We are executing a minor/patch version bump for our core dependencies to clear the `npm outdated` technical debt log. Since this involves no major version transitions, the risk of breaking the Vanilla JS browser environment or Supabase compatibility is extremely low. We will update `package.json` with the new versions and execute `npm install` to regenerate the lockfile.

## Proposed Changes

### Configuration
#### [MODIFY] [package.json](file:///d:/GitHub/neogleamz.github.io/package.json)
- Update `@supabase/supabase-js` to `^2.105.0`
- Update `supabase` CLI to `^2.95.5`
- Update `eslint` to `^10.2.1`
- Update `prettier` to `^3.8.3`

## Verification Plan

### Automated Tests
- Run `npm install` and verify a clean exit without dependency conflicts.
- Run `npm audit` to ensure no new vulnerabilities were introduced.
