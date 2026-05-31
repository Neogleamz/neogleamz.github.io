# Relocation of Orphan Root Files (Whitelist Hardening)

To strictly enforce repository isolation and whitelisting standards, we will relocate `remote-capture.html` and `remote-scanner.html` from the repository root to the `/tools/` directory. We will update all dynamic JavaScript references pointing to these files and clean the Git pre-commit hook whitelist of these and other obsolete root files.

## Design Decisions & Rationale

> [!NOTE]
> Moving `remote-capture.html` and `remote-scanner.html` to `/tools/` keeps the repository root strictly isolated for core configuration and template files, satisfying Core Safety Protocol 6.
> Because the local web server serves the entire workspace, updating URL pathways to point to `/tools/remote-capture.html` and `/tools/remote-scanner.html` will dynamically load and execute the remote interfaces on mobile devices exactly as before, with zero functionality loss.

## Proposed Changes

### Root Whitelist and Path Standardization

---

#### [MODIFY] [pre-commit](file:///d:/GitHub/neogleamz.github.io/.githooks/pre-commit)

1. **Remove Obsolete Whitelist Entries:**
   Remove `test_print.html`, `diagram-1.svg`, `remote-capture.html`, and `remote-scanner.html` from the allowed root whitelist set (line 8).

---

#### [MODIFY] [packerz-module.js](file:///d:/GitHub/neogleamz.github.io/assets/js/packerz-module.js)

1. **Update URL Path:**
   In [packerz-module.js](file:///d:/GitHub/neogleamz.github.io/assets/js/packerz-module.js#L2717), update the `remoteUrl` assignment string to point to `/tools/remote-capture.html`:
   ```javascript
   const remoteUrl = `${window.location.protocol}//${host}/tools/remote-capture.html?session=${sessionId}${folderParam}`;
   ```

---

#### [MODIFY] [inventory-module.js](file:///d:/GitHub/neogleamz.github.io/assets/js/inventory-module.js)

1. **Update URL Path:**
   In [inventory-module.js](file:///d:/GitHub/neogleamz.github.io/assets/js/inventory-module.js#L1625), update the `remoteUrl` assignment string to point to `/tools/remote-scanner.html`:
   ```javascript
   const remoteUrl = `${window.location.protocol}//${host}/tools/remote-scanner.html?session=${window.ccSessionId}`;
   ```

---

#### [MOVE] [remote-capture.html](file:///d:/GitHub/neogleamz.github.io/remote-capture.html) -> [remote-capture.html](file:///d:/GitHub/neogleamz.github.io/tools/remote-capture.html)

1. Relocate the file using Git move (`git mv`) to preserve the entire revision history.

---

#### [MOVE] [remote-scanner.html](file:///d:/GitHub/neogleamz.github.io/remote-scanner.html) -> [remote-scanner.html](file:///d:/GitHub/neogleamz.github.io/tools/remote-scanner.html)

1. Relocate the file using Git move (`git mv`) to preserve the entire revision history.

---

## Verification Plan

### Automated Tests
- Run `npm test` to verify zero functional regressions are introduced.
- Run `npx eslint .` to verify clean syntax globally.

### Manual Verification
1. Launch the local web server.
2. Go to **FULFILLZ** -> **PACKERZ**, click a scanning step, and verify that the generated QR code launches the camera session with the new `/tools/remote-capture.html` path.
3. Go to **STOCKZ** -> **VELOCITYZ** / Cycle Counts, generate the QR code, and verify that it launches with the new `/tools/remote-scanner.html` path.
4. Verify that the files render on mobile or in the browser exactly as before.
