# Dependency Update: `supabase` CLI

Update the Supabase local development CLI tool to version 2.101.0.

## Design Decisions & Rationale
We are bumping the `supabase` CLI package from `2.98.2` to `2.101.0` as identified in our security and technical debt health check. This version update brings improved local database emulation, stronger migration tracking, and enhanced TypeScript generation, ensuring our local development environment stays parity-synced with our remote project.

## Proposed Changes

### Configuration (Package JSON)

#### [MODIFY] [package.json](file:///d:/GitHub/neogleamz.github.io/package.json)
- Update `supabase` devDependency to `^2.101.0` via standard npm installation.

## Verification Plan
1. Run `npm install supabase@2.101.0 --save-dev` to apply the update and sync `package-lock.json`.
2. Run `npm test` to ensure our core test suites pass without regression.
3. Run `npx eslint .` to guarantee zero syntax issues were introduced.
