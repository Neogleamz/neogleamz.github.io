# Socialz Missing Avatars

Update the Socialz page logic to properly pull and display an avatar for each skater by iterating through their available social media links if the primary one is missing.

### Design Decisions & Rationale
We will utilize a pure Vanilla JS attribute-driven fallback chain (`data-provider`, `data-ig`, `data-tt`, etc.) on the `<img>` elements. By binding the global `error` event listener to `handleAvatarError`, we gracefully degrade the `unavatar.io` image source from Instagram -> TikTok -> YouTube -> Facebook, guaranteeing that if a skater has *any* valid social media presence, their avatar will eventually resolve without polluting the DOM with broken image icons.

## Proposed Changes

### Socialz Module
#### [MODIFY] [socialz-module.js](file:///d:/GitHub/neogleamz.github.io/assets/js/socialz-module.js)
1. **Update `handleAvatarError(img)`**
   - Add `ig` to the dataset extraction.
   - Implement the full fallback chain: `instagram` -> `tiktok` -> `youtube` -> `facebook`.
2. **Update `renderSkaters()` (Grid View & List View)**
   - Extract `igHandle` via `cleanH(s.handles.ig)`.
   - Update the initial `src` generator to start with `instagram` if available, then fallback to `tiktok`, etc.
   - Inject `data-ig="${igHandle}"` into the `<img ...>` template string.

## Verification Plan

### Manual Verification
- The user will open the Command Center -> Socialz Hub.
- The user will verify that the skaters (specifically the first 6 mentioned) now successfully display an avatar.
- The user can inspect the network tab to verify that if `instagram` 404s, the image `src` correctly updates to `tiktok`, etc., until an avatar loads.
