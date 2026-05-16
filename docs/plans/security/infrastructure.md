# Security & Infrastructure Hardening Plan
**Target Branch:** `security/infrastructure`

### Design Decisions & Rationale
To lock down the production environment, I have chosen a two-layer Vanilla JS-native defense strategy. First, we will deploy a strict `Content-Security-Policy` (CSP) header into `index.html` to act as a system-wide firewall against unauthorized external scripts or connections. Second, we will aggressively close Cross-Site Scripting (XSS) vectors by routing the highest-risk dynamic `.innerHTML` assignments (discovered via our `xss-risk-map.js`) directly through our existing `window.safeHTML()` DOMPurify wrapper. This approach secures the application completely without introducing any bloated Node dependencies.

## User Review Required
> [!CAUTION]
> The Content-Security-Policy must strictly allow Supabase and existing CDNs. If we introduce new remote image sources or libraries in the future, the CSP will block them by default.

## Proposed Changes

### Configuration Layer
#### [MODIFY] [index.html](file:///d:/GitHub/neogleamz.github.io/index.html)
- Inject a strict `<meta http-equiv="Content-Security-Policy">` directly into the `<head>`.
- Allow rules for `self`, Supabase APIs, specifically parsed CDNs (FontAwesome, JS libraries), and `unsafe-inline` styles (necessary for dynamic layout swaps).

### Presentation & Business Logic (XSS Remediation)
#### [MODIFY] [inventory-module.js](file:///d:/GitHub/neogleamz.github.io/inventory-module.js)
- Target and `window.safeHTML()` wrap the dynamic loop rendering elements handling Supabase returns (`line 1043`, `line 1609`, `line 1635`).

#### [MODIFY] [socialz-module.js](file:///d:/GitHub/neogleamz.github.io/socialz-module.js)
- Target and `window.safeHTML()` wrap the `sortedStyles.map`, `sortedRegions.map`, and `sortedTypes.map` `.innerHTML` assignments to prevent malicious user profiles from executing DOM breaks.

#### [MODIFY] [system-tools-module.js](file:///d:/GitHub/neogleamz.github.io/system-tools-module.js)
- Target and `window.safeHTML()` wrap database-driven template arrays (e.g. `renderPaperProfileTable`).

#### [MODIFY] [production-module.js](file:///d:/GitHub/neogleamz.github.io/production-module.js)
- Ensure the `generateEditableSOPRow` dynamically rendered logic is passed through DOMPurify since it renders user-written Markdown SOPs into raw HTML.

### Documentation Layer
#### [NEW] [security-audit-report-v2.md](file:///d:/GitHub/neogleamz.github.io/docs/reports/security-audit-report-v2.md)
- Generate a formal Markdown report acknowledging 0 active Supabase vulnerabilities and detailing the new DOMPurify logic matrix.

## Verification Plan

### Automated Tests
- Re-run `node scripts/xss-risk-map.js` to mathematically confirm all dynamic vector variables have been wrapped with `safeHTML(${...})`.

### Manual Verification
- Render the local environment and verify Supabase API calls pass the new CSP header freely.
