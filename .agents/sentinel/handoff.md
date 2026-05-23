# Observation
- Checked `assets/js/labelz-module.js` to empirically verify the `exportLabelzPDF` function.
- **jsPDF Replacement**: Observed that `exportLabelzPDF` no longer initializes `jsPDF` or calls `doc.addImage(...)`. Instead, it generates a base64 image representation of the canvas (`fCanvas.toDataURL`) and creates an `<img>` tag wrapped in an `@page` styled context, ultimately invoking `window.print()` after a 500ms delay to allow DOM render.
- **Orientation Toggle**: Verified that the function queries `labelzOrientation`. If set to `Landscape`, it defines `imgStyle = 'transform: rotate(90deg); transform-origin: center;'` and correctly applies this string to the `style` attribute of the injected `<img>`.
- **Phantom UI Eradication**: Observed that immediately following the `window.print()` invocation, a nested `setTimeout` is triggered to execute `printArea.innerHTML = '';` after 1500ms, effectively sweeping the UI clean of any print artifacts.

# Logic Chain
1. The absence of `new jsPDF(...)` and the explicit presence of `window.print()` directly validates the assertion that the third-party PDF generation dependency was bypassed in favor of native OS thermal printing routing.
2. The conditional logic (`if (orientation === 'Landscape')`) effectively modifies the inline CSS injected into the printable container, fulfilling the request to enforce a 90-degree pivot for thermal label alignment.
3. The 1500ms delayed clearance of `#printableBarcodeArea` guarantees that the generated DOM artifacts (the image and `@page` rules) are eradicated shortly after the print dialog engages, mitigating visual bugs ("phantom UI") upon returning to the main dashboard.

# Caveats
- The 500ms DOM-render wait and 1500ms eradication delay rely on arbitrary timing. Slower browsers or massive canvas sizes might occasionally cause `window.print()` to capture an empty DOM if the eradication triggers too quickly, though this is rare.
- Although `jsPDF` is no longer actively used inside `exportLabelzPDF`, the `deleteLabelzDesign` function immediately above it still possesses a stale comment: `// EXPORT TO PDF VIA jsPDF`.

# Conclusion
The requested logic modifications are verifiably present in `assets/js/labelz-module.js`. The thermal print output is routed through `window.print()`, landscape orientation is mapped via CSS `transform`, and post-print phantom artifacts are wiped correctly.

# Verification Method
Run `git diff main assets/js/labelz-module.js` or inspect `exportLabelzPDF` in `assets/js/labelz-module.js` at line 938. You can also run the mock DOM validation script written in `tests/run-labelz-test.js` to verify DOM injection logic.
