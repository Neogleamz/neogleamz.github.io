# Project: Labelz Designer Revamp & Avatar Migration Engine

## Architecture
- **Labelz Module** (`assets/js/labelz-module.js`): Canvas scaling, print CSS, rotation.
- **Socialz Module** (`assets/js/socialz-module.js` or similar): Likely the place where the Avatar Migration Engine lives. Will use `supabaseClient` and native JS `fetch()`.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Labelz ViewBox & Print | Fix scaling, phantom UI, CSS rotation, PDF preview in `labelz-module.js` and `index.html`. | none | DONE |
| 2 | Avatar Migration Plan | Generate `implementation_plan.md` for fetching unavatar.io images, uploading to `avatars` bucket, updating `socialz_audience` table, and decommissioning engine. | none | PLANNED |
| 3 | Avatar Migration Impl | Write the migration script/logic natively using Vanilla JS `fetch()` and `window.supabaseClient`. | M2 (Approval) | PLANNED |

## Interface Contracts
- Canvas dimensions must correctly reflect physical dimensions scaled without overflowing the UI.
- `window.print()` must cleanly output only the active label canvas.
- Migration engine must use `fetch()` and Supabase storage `upload`, then Supabase DB `update`. No Node.js bloated modules.
