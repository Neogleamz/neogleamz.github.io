# Resolve SOP Legacy Media Regression

This plan addresses the regression caused by the recent security overhaul where legacy media (Google Drive iframes, Native MP4/Webm videos) are completely stripped out of the SOP Viewer, and the SOP editor action buttons (move up, move down, add, remove) became non-functional.

## Design Decisions & Rationale

During the security refactor of `safeHTML`, DOMPurify was implemented to neutralize XSS vectors. However, DOMPurify defaults to aggressively stripping `<video>` and `<iframe>` tags, as well as `contenteditable` attributes. This wiped out all old media embeddings. Furthermore, migrating the SOP action buttons from inline `onclick` to the centralized event delegator missed the global exposure and `data-click` routing for the Row CRUD actions (Up/Down/Add/Remove). 

To resolve this purely within our Vanilla JS ethos, we will precisely whitelist the specific media elements inside `window.safeHTML`, and map the missing SOP Editor buttons directly to the delegator, ensuring both security and backward compatibility are maintained.

### Proposed Changes

#### [MODIFY] [neogleamz-engine.js](file:///d:/GitHub/neogleamz.github.io/assets/js/neogleamz-engine.js)
- Update `window.safeHTML` to configure DOMPurify's `ADD_TAGS` array with `['iframe', 'video', 'source']`.
- Update `ADD_ATTR` array to include `['target', 'allow', 'allowfullscreen', 'frameborder', 'scrolling', 'muted', 'playsinline', 'preload', 'autoplay', 'loop', 'data-url', 'data-click', 'data-mousedown', 'contenteditable']`.

#### [MODIFY] [production-module.js](file:///d:/GitHub/neogleamz.github.io/assets/js/production-module.js)
- Ensure the SOP editor row functions (`addSOPRow`, `removeSOPRow`, `moveSOPUp`, `moveSOPDown`) are explicitly bound to the global `window` object so the Event Delegator can dynamically invoke them.

#### [MODIFY] [system-event-delegator.js](file:///d:/GitHub/neogleamz.github.io/assets/js/system-event-delegator.js)
- Add switch cases in the `click` delegator for:
  - `click_moveSOPUp`
  - `click_moveSOPDown`
  - `click_addSOPRow`
  - `click_removeSOPRow`
- Map these explicitly to their `window.*` counterparts.

## UI & Browser Strategy

This fix ensures standard browser compatibility without external frameworks. By managing DOMPurify rules explicitly, we keep the XSS protection layer strong without breaking our established Vanilla HTML/CSS architecture.

## User Review Required

> [!WARNING]
> Please review this plan. This specifically addresses the **regression** from the camera task (making old videos/iframes appear again and fixing the up/down row buttons). The separate request for **"Direct File Uploading & Checklist Media"** will be executed in the next cycle, as per the strict Bucket List prioritization protocol.

## Verification Plan
### Automated Tests
- Run `npm test` and `npx eslint .`
### Manual Verification
- Render the SOP Editor and verify that existing Google Drive links or Videos appear as clickable thumbnails/iframes.
- Click the up/down arrows and '+' / '✕' buttons in the SOP editor to verify rows move and delete correctly.
