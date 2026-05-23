# Original User Request

## Initial Request â€” 2026-05-22T19:12:52-05:00

# Teamwork Project Prompt â€” Draft

> Status: Launched
> Goal: Execute the delegated teamwork tasks

Revamp the Labelz Designer web application for the internal warehouse team's production use. The project must fix ViewBox scaling inconsistencies between different label dimensions, forcefully hide phantom UI elements during printing, enable CSS-based landscape/portrait rotation, and wire up the PDF Preview engine.

Working directory: d:\GitHub\neogleamz.github.io
Integrity mode: development

## Requirements

### R1. Dynamic ViewBox Scaling
Decouple the viewport scale from the physical print payload. Ensure that all label dimensions (e.g., 2.25x1.25", 4x6") fit optimally within the center of the UI canvas without exceeding viewport boundaries or shrinking unreadably small, utilizing standard Vanilla JS and CSS mapping.

### R2. Phantom QR Code Eradication
Hijack the browser's native print spooler using dynamically injected `@page` rules and `@media print` blocks. Ensure that when `window.print()` is triggered, absolutely all UI elements (including default barcodes) are hidden, leaving only a 1:1 representation of the active label payload on the designated physical dimensions.

### R3. Native Label Rotation
Provide a native mechanism to rotate the label payload between Landscape and Portrait orientations using CSS `transform: rotate(90deg)` to ensure compatibility with standard unidirectional thermal printers.

### R4. PDF Preview Integration
Wire up the existing "PDF PREVIEW" UI button to trigger the browser's native `window.print()` engine, allowing the user to utilize the browser's built-in "Save as PDF" functionality.

## Acceptance Criteria

### R1 Verification (ViewBox Scaling)
- [ ] A 4x6" label fits 100% within the viewport without triggering scrollbars or massive overflow.
- [ ] A 2.25x1.25" label renders large enough to be easily readable and editable without manually zooming to 200%.

### R2 Verification (Phantom QR Codes)
- [ ] Printing a blank label results in a 100% blank page with zero ghost UI elements or unassigned barcodes.
- [ ] The browser print dialog defaults to the exact dimensions of the active label (e.g., 4x6) instead of 8.5x11 Letter size.

### R3 Verification (Rotation)
- [ ] Triggering rotation applies a CSS transform that visually flips the canvas 90 degrees.

### R4 Verification (PDF Preview)
- [ ] Clicking the "PDF PREVIEW" button successfully opens the native browser print spooler dialog.

## Follow-up — 2026-05-22T19:29:39-05:00

# Teamwork Project Prompt — Draft (Avatar Engine)

> Status: Launched
> Goal: Execute the delegated teamwork tasks

Recommission the Avatar Migration Engine to fetch missing skater avatars from unavatar.io, permanently upload the image blob to Supabase Storage, and update the database URL to completely remove external API reliance.

Working directory: d:\GitHub\neogleamz.github.io
Integrity mode: development

## Requirements

### R1. Storage Bucket Upload
The migration loop must download the avatar binary blob from unavatar.io and natively upload it to the Supabase `avatars` storage bucket.

### R2. Database Sync
After successful upload, the script must retrieve the `getPublicUrl()` from Supabase and immediately update the `avatar_url` column in the `socialz_audience` database table.

### R3. Engine Decommission
Once the `socialz_audience` table is 100% hydrated with `supabase.co` image links, the engine must safely close its connection and report completion.

### R4. The Bucketlist Override (MANDATORY)
You must execute the `[/bucketlist]` workflow for this task. Your very first action must be to research the codebase and generate the `implementation_plan.md` artifact (and dual-sync it to `docs/plans/feat/unavatar-supabase-sync.md`). **YOU MUST HALT AND REQUEST USER APPROVAL.** You are strictly forbidden from writing code until the user approves the plan.

## Acceptance Criteria

### Execution Verification
- [ ] You generated the `implementation_plan.md` and halted execution to await the user's "proceed" command.
- [ ] Running the Avatar Migration Engine successfully fetches 100% of missing avatars and uploads them to the `avatars` bucket.
- [ ] No skaters in the `socialz_audience` table have `unavatar.io` as their `avatar_url` after completion.
- [ ] No external libraries or bloated Node.js modules are used; all fetching and uploading relies strictly on the native Vanilla JS `fetch()` and `window.supabaseClient`.
