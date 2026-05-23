# Observation
- **M1 (ViewBox Scaling):** The scaling logic resides in `assets/js/labelz-module.js` around line 258 (`zoomLabelzCanvas()`). It currently applies `transform: scale(${currentZoom})` to the `#labelzCanvasContainer` DOM element. Because the internal canvas is generated at 300 PPI (e.g., a 4x6 label is 1200x1800 physical pixels), the unscaled flexbox dimensions heavily overflow the parent wrapper, causing flexbox's `justify-content: center` to clip the top and left of the canvas once scaled.
- **M2 (Print CSS & Phantom Elements):** The global print CSS is defined in `index.html` line 550. It effectively hides the app via `body > *:not(#printableBarcodeArea) { display: none !important; }`. However, `#printableBarcodeArea` is used heavily by the Batch Spooler (`executeBatchPrint()`), which injects raw `JsBarcode` SVGs and `bwipjs` Canvases. If `innerHTML` is not strictly managed before/after print events, previous print jobs persist as "phantom" QR/Barcodes. Furthermore, there is no dynamic `@page` sizing implemented in the PDF Preview workflow.
- **M3 (Orientation Rotation):** There is currently no UI element for orientation. The optimal insertion point is `index.html` line 2689, adjacent to the existing `labelzDesignerSize` dropdown inside the `labelzDesignerModal` top nav bar.
- **M4 (PDF Preview):** The "PDF PREVIEW" button is located in `index.html` at line 2744, utilizing the `data-click="click_exportLabelzPDF"` delegate. The `exportLabelzPDF()` function in `labelz-module.js` line 939 currently relies on the external `jsPDF` library to generate a blob and opens it in a new popup window, entirely bypassing the native OS print spooler.

# Logic Chain
1. **Resolving M1:** To properly decouple the physical layout scaling from the internal Canvas PPI, we must abandon CSS `transform: scale()`. Fabric.js supports direct CSS dimension decoupling. By replacing the transform with `fCanvas.setDimensions({ width: fCanvas.width * currentZoom + 'px', height: fCanvas.height * currentZoom + 'px' }, { cssOnly: true });`, the canvas container will physically shrink in the DOM layout without altering internal 300 PPI coordinates, allowing flexbox to center it perfectly.
2. **Resolving M4 & M2:** We must deprecate `jsPDF` in `exportLabelzPDF()`. We will extract `fCanvas.toDataURL()`, target `#printableBarcodeArea`, and inject both the image and a dynamic `<style>@page { size: ${w}in ${h}in; margin: 0; }</style>` block. This forces the browser's native print spooler to default to exact thermal dimensions. Calling `window.print()` natively handles the PDF generation.
3. **Addressing Phantom Elements (M2):** We must proactively clear `#printableBarcodeArea.innerHTML = ''` both immediately before injecting the preview image and 1.5 seconds after `window.print()` fires to guarantee destruction of any leftover DOM elements.
4. **Resolving M3:** By injecting a `<select id="labelzOrientation">` toggle in `index.html` (Portrait/Landscape), we can read its state during `exportLabelzPDF()`. Thermal hardware expects fixed paper feeds (e.g. 4x6). To rotate, we maintain the strict `@page` size but dynamically append `transform: rotate(90deg); transform-origin: center;` to the injected `<img />` payload.

# Caveats
- `setTimeout` delays around `window.print()` vary by browser. A 500ms delay before print ensures the base64 image paints to the DOM, and a 1500ms cleanup delay ensures the OS has captured the spooler snapshot before we wipe `#printableBarcodeArea`.
- The rotation assumes the thermal printer hardware feed is strictly vertical (Portrait). A 90-degree CSS rotation forces the image sideways to fit a Landscape design onto a Portrait physical feed.

# Conclusion
The Labelz Module requires precise architectural rewrites to `zoomLabelzCanvas()` and `exportLabelzPDF()` in `assets/js/labelz-module.js`. We must swap CSS transform scaling for Fabric's native `{cssOnly: true}` dimensioning. The PDF Preview workflow must shift from `jsPDF` blobs to native `window.print()` injections utilizing the `#printableBarcodeArea` and dynamic `@page` CSS. We will introduce a new HTML `<select>` orientation toggle to control the CSS `transform: rotate(90deg)` logic on the injected print image.

# Verification Method
1. Modify `zoomLabelzCanvas` in `assets/js/labelz-module.js`. Launch the web app, open a 4x6 Label in the Designer, and rapidly click `+` and `-` zoom toggles. Verify the canvas remains perfectly centered without left/top clipping.
2. Open the Labelz Designer, add a barcode, and click the "PDF PREVIEW" button.
3. Verify the native browser Print Dialog opens instead of a blocked popup.
4. Verify the default paper size in the print dialog dynamically matches the selected dropdown size (e.g., 2.25x1.25).
5. Toggle "Landscape" on the new UI element, re-click PDF Preview, and verify the image is rotated 90 degrees in the print preview window.
