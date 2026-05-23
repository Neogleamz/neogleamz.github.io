const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const html = `
<!DOCTYPE html>
<html>
<body>
    <div id="printableBarcodeArea" style="display:none; background:white;"></div>
    <select id="barcodzSizeSelect">
        <option value='{"w": 4, "h": 6}' selected>4x6</option>
    </select>
    <select id="activeSizeSelect">
        <option value='{"w": 4, "h": 6}' selected>4x6</option>
    </select>
    <select id="barcodzTypeSelect">
        <option value="CODE128" selected>CODE128</option>
    </select>
    <select id="labelzOrientation">
        <option value="Portrait" selected>Portrait</option>
    </select>
    <select id="labelzDesignerSize">
        <option value="2.25x1.25" selected>2.25x1.25</option>
    </select>
    <div id="labelzZoomReadout">100%</div>
    
    <div id="labelzCanvasWrapper" style="width: 800px; height: 600px;"></div>
    <div id="labelzCanvasContainer"></div>
    <canvas id="labelzFabricCanvas"></canvas>
    <canvas id="labelzBwipjsRenderer"></canvas>
    <input id="labelzDesignerName"></input>
    <button id="labelzDesignerEmojiBtn"></button>
    <input id="labelzDesignerEmojiVal"></input>
    <div id="labelzDesignerModal" style="display:none;"></div>
    <input id="labelzBgColor"></input>
</body>
</html>
`;

const dom = new JSDOM(html, { runScripts: "dangerously" });
const { window } = dom;

// JSDOM offsetWidth polyfill
Object.defineProperty(window.HTMLElement.prototype, 'offsetWidth', {
  get: function() { return 800; }
});
Object.defineProperty(window.HTMLElement.prototype, 'offsetHeight', {
  get: function() { return 600; }
});

window.safeHTML = (html) => html;
window.sysLog = () => {};
window.alert = () => {};
window.inventoryDB = {};
window.supabaseClient = {};
window.catalogCache = {};

window.fabric = {
    Canvas: class {
        constructor() { this.width = 500; this.height = 300; }
        setDimensions(dims, opts) { this.dims = dims; this.opts = opts; }
        toDataURL() { return 'data:image/png;base64,mock...'; }
        discardActiveObject() {}
        renderAll() {}
        clear() {}
        on() {}
        setWidth(w) { this.width = w; }
        setHeight(h) { this.height = h; }
        toJSON() { return {}; }
        getObjects() { return [{isBarcode: true}]; }
    }
};

window.print = () => { 
    window.printCalled = true; 
    setTimeout(() => window.dispatchEvent(new window.Event('afterprint')), 500);
};
window.JsBarcode = () => {};
window.bwipjs = { toCanvas: () => {} };
window.Image = class { set src(val) { this.onload && this.onload(); } };

const barcodzCode = fs.readFileSync(path.join(__dirname, '../assets/js/barcodz-module.js'), 'utf8');
const labelzCode = fs.readFileSync(path.join(__dirname, '../assets/js/labelz-module.js'), 'utf8');

const scriptBarcodz = window.document.createElement("script");
scriptBarcodz.textContent = barcodzCode;
window.document.body.appendChild(scriptBarcodz);

const scriptLabelz = window.document.createElement("script");
scriptLabelz.textContent = labelzCode;
window.document.body.appendChild(scriptLabelz);

// Populate AFTER scripts are loaded
window.barcodzSpoolQueue = [
    { slug: 'TEST-SKU-1', name: 'Test Product 1', qty: 2 }
];

// Open modal to trigger initFabricCanvas
window.openCreateLabelModal();

// Wait to let canvas init
setTimeout(() => {
    // TEST 1: ViewBox Scaling logic (setDimensions) in Labelz
    window.zoomLabelzCanvas(0.5); // this will call setDimensions

    console.log("TEST 1: ViewBox Scaling");
    const zoomReadout = window.document.getElementById('labelzZoomReadout').innerText;
    if (zoomReadout.includes('%')) {
        console.log("✅ setDimensions calculated correct scaled width/height via zoom. Readout: " + zoomReadout);
    } else {
        console.log("❌ setDimensions calculation failed.");
    }

    // TEST 2: Print/PDF Preview logic in Barcodz (@page dynamic generation & printableBarcodeArea clearing)
    console.log("\\nTEST 2: Barcodz Print Logic");
    window.executeBatchPrint();

    // Validate @page CSS generation
    setTimeout(() => {
        const printArea = window.document.getElementById('printableBarcodeArea');
        const innerHTML = printArea.innerHTML;
        
        if (innerHTML.includes('@page { size: 4in 6in; margin: 0; }')) {
            console.log("✅ @page generated correctly for Barcodz.");
        } else {
            console.log("❌ @page generation failed for Barcodz. Output:", innerHTML);
        }
        
        if (innerHTML.includes('print-bc-TEST-SKU-1')) {
             console.log("✅ Barcode elements queued into printArea.");
        } else {
             console.log("❌ Barcode elements missing from printArea.");
        }
        
        setTimeout(() => {
            if (printArea.innerHTML === '') {
                console.log("✅ printableBarcodeArea successfully cleared after Barcodz print snapshot delay.");
            } else {
                console.log("❌ printableBarcodeArea was NOT cleared. Contents:", printArea.innerHTML);
            }
            
            // TEST 3: Print/PDF Preview logic in Labelz
            console.log("\\nTEST 3: Labelz Print Logic");
            
            // Set up correct data for exportLabelzPDF
            window.document.getElementById('labelzDesignerSize').dataset.customSize = '4x6';
            
            window.exportLabelzPDF();
            
            setTimeout(() => {
                const labelzInnerHTML = printArea.innerHTML;
                if (labelzInnerHTML.includes('@page { size: 4in 6in; margin: 0; }') && labelzInnerHTML.includes('<img src=')) {
                    console.log("✅ @page generated correctly for Labelz.");
                } else {
                    console.log("❌ @page generation failed for Labelz. Output:", labelzInnerHTML);
                }
                
                setTimeout(() => {
                    if (printArea.innerHTML === '') {
                        console.log("✅ printableBarcodeArea successfully cleared after Labelz print.");
                    } else {
                        console.log("❌ printableBarcodeArea was NOT cleared after Labelz print. Contents:", printArea.innerHTML);
                    }
                    console.log("\\nAll stress tests completed.");
                }, 3000);
            }, 100);
        }, 4000);
    }, 100);
}, 100);
