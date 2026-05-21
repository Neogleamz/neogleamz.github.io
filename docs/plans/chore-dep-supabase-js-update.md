# Dependency Update: `@supabase/supabase-js`

Update the Supabase client library to the latest stable minor version.

## Design Decisions & Rationale
We are bumping `@supabase/supabase-js` from `2.105.4` to `2.106.1` as identified in our security and technical debt health check. This minor version update brings the latest improvements and patches without introducing breaking changes, maintaining the stability of our Vanilla JS data integration.

## Proposed Changes

### Configuration (Package JSON)

#### [MODIFY] [package.json](file:///d:/GitHub/neogleamz.github.io/package.json)
- Update `@supabase/supabase-js` dependency to `^2.106.1` via standard npm installation.

## Verification Plan
1. Run `npm install @supabase/supabase-js@2.106.1` to apply the update and sync `package-lock.json`.
2. Run `npm test` to ensure our core Vanilla data integration (Supabase calls) pass all existing unit tests without regression.
3. Run `npx eslint .` to guarantee zero syntax issues were introduced.
