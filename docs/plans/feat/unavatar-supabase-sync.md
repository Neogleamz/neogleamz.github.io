# Implementation Plan: Avatar Migration Engine

## Objective
Recommission the Avatar Migration Engine to fetch missing skater avatars from unavatar.io, permanently upload the image blob to Supabase Storage (`avatars` bucket), and update the database URL (`socialz_audience` table) to remove external API reliance.

## Scope
1. **R1: Storage Bucket Upload** - Download avatar binary blob from unavatar.io using native `fetch()` and upload to Supabase `avatars` bucket using `window.supabaseClient.storage.from('avatars').upload()`.
2. **R2: Database Sync** - Retrieve `getPublicUrl()` from Supabase and update the `avatar_url` column in the `socialz_audience` table.
3. **R3: Engine Decommission** - Safely close connection and report completion once 100% hydration is achieved.

## Step-by-Step Execution Plan

### Step 1: Initialize Migration Loop
- Identify the correct script file for the Avatar Migration Engine (likely `socialz-module.js` or a dedicated migration script).
- Query `socialz_audience` for records where `avatar_url` contains `unavatar.io`.

### Step 2: Fetch and Upload (R1)
- For each record, execute a native `fetch(avatar_url)` to download the blob.
- Convert the response to a Blob/File object.
- Upload to Supabase using:
  ```javascript
  const { data, error } = await window.supabaseClient
    .storage
    .from('avatars')
    .upload(`public/${record.id}.jpg`, blob, { upsert: true });
  ```

### Step 3: Database Synchronization (R2)
- Upon successful upload, fetch the public URL:
  ```javascript
  const { data: publicUrlData } = window.supabaseClient
    .storage
    .from('avatars')
    .getPublicUrl(`public/${record.id}.jpg`);
  ```
- Update the database:
  ```javascript
  await window.supabaseClient
    .from('socialz_audience')
    .update({ avatar_url: publicUrlData.publicUrl })
    .eq('id', record.id);
  ```

### Step 4: Decommission (R3)
- Loop continuously until no more `unavatar.io` strings are found in the query.
- Once complete, terminate the engine loop safely and output a completion message to the system log or UI.
- No third-party Node.js modules will be used; entirely vanilla JS.

## Review & Approval
This plan strictly follows the `[/bucketlist]` protocol. Execution is halted pending user approval.
