// ============================================================
// LABELZ MODULE — Neogleamz Custom Label Manager (Canvas)
// ============================================================
// Manages custom thermal-printed labels using Fabric.js, bwip-js,
// and jsPDF. Integrated with Catalog for barcode mappings.
// ============================================================

const LABEL_STORAGE_BUCKET = 'sop-media';

let labelzDB = [];
let labelzCurrentEdit = null;

// Fabric Canvas Instance Variables
let fCanvas = null;
let currentZoom = 1;
const PPI = 300; // High-res internal pixels per inch for crisp printing/scaling

// Template Definitions
const labelzTemplates = {
    basic_product: {"version":"5.3.0","objects":[{"type":"textbox","version":"5.3.0","originX":"center","originY":"top","left":108,"top":15,"width":160,"height":20.34,"fill":"#000000","text":"Product Name","fontSize":18,"fontWeight":"bold","fontFamily":"Arial","textAlign":"center","editable":true},{"type":"image","version":"5.3.0","originX":"center","originY":"top","left":108,"top":45,"width":150,"height":40,"scaleX":1,"scaleY":1,"barcodeOpts":{"bcid":"code128","text":"PRD-001","scale":2,"height":10,"includetext":true},"isBarcode":true,"crossOrigin":"anonymous"}]},
    barcode_only: {"version":"5.3.0","objects":[{"type":"image","version":"5.3.0","originX":"center","originY":"center","left":108,"top":60,"width":150,"height":60,"scaleX":1,"scaleY":1,"barcodeOpts":{"bcid":"code128","text":"1234567890","scale":3,"height":15,"includetext":true,"textxalign":"center"},"isBarcode":true,"crossOrigin":"anonymous"}]},
    shipping: {"version":"5.3.0","objects":[{"type":"textbox","version":"5.3.0","originX":"left","originY":"top","left":20,"top":20,"width":300,"height":22.6,"fill":"#000000","text":"SHIP TO:","fontSize":20,"fontWeight":"bold","fontFamily":"Arial"},{"type":"textbox","version":"5.3.0","originX":"left","originY":"top","left":20,"top":55,"width":300,"height":67.8,"fill":"#000000","text":"John Doe\n123 Logistics Way\nWarehouse District, NY 10001","fontSize":16,"fontFamily":"Arial"},{"type":"image","version":"5.3.0","originX":"center","originY":"bottom","left":192,"top":550,"width":300,"height":80,"barcodeOpts":{"bcid":"code128","text":"TRACK123456789","scale":3,"height":15,"includetext":true},"isBarcode":true}]}
};

// ============================================================
// DATA LAYER
// ============================================================

async function loadLabelzData() {
    try {
        const { data, error } = await supabaseClient
            .from('label_designs')
            .select('*')
            .order('product_name', { ascending: true });
        if (error) throw error;
        labelzDB = data || [];
        renderLabelzGrid();
        if(typeof buildBarcodzCache === 'function') buildBarcodzCache();
    } catch(e) {
        sysLog('LABELZ load error: ' + e.message, true);
    }
}

function renderLabelzGrid() {
    const grid = document.getElementById('labelzGrid');
    if (!grid) return;
    const search = document.getElementById('labelzSearch')?.value.toLowerCase() || '';

    const filtered = labelzDB.filter(l => l.product_name.toLowerCase().includes(search));

    if (filtered.length === 0) {
        grid.innerHTML = `<div style="text-align:center;padding:60px;color:var(--text-muted);font-style:italic;">
            <div style="font-size:48px;margin-bottom:12px;">🏷️</div>
            ${search ? 'No labels match your search.' : 'No custom labels yet. Click <strong>+ NEW LABEL</strong> to create your first one.'}
        </div>`;
        return;
    }

    let html = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:14px;">';

    filtered.forEach(label => {
        // Correct FGI Stock Calculation from inventoryDB
        const invKey = 'RECIPE:::' + label.product_name;
        const invData = typeof inventoryDB !== 'undefined' ? inventoryDB[invKey] : null;
        let stockQty = 0;
        if(invData) {
            stockQty = (invData.produced_qty || 0) - (invData.sold_qty || 0);
        }
        
        const lowThreshold = 10;
        const stockColor = stockQty === 0 ? '#ef4444' : stockQty < lowThreshold ? '#f59e0b' : '#10b981';
        const stockBg = stockQty === 0 ? 'rgba(239,68,68,0.1)' : stockQty < lowThreshold ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)';

        const cleanName = label.product_name.replace(/'/g,"\\'").replace(/"/g,'&quot;');
        const safeEmoji = label.emoji || '🏷️';
        const safeSize  = label.label_size || '2.25x1.25';

        html += `
            <div style="background:var(--bg-panel); border:1px solid var(--border-color); border-radius:8px; padding:10px; display:flex; flex-direction:column; box-shadow:0 2px 4px rgba(0,0,0,0.1); transition:border-color 0.2s;" onmouseover="this.style.borderColor='var(--primary-color)'" onmouseout="this.style.borderColor='var(--border-color)'">
                
                <div style="display:grid; grid-template-columns:auto 1fr auto; align-items:center; margin-bottom:8px; gap:8px;">
                    <!-- Emoji Top Left -->
                    <div style="font-size:18px; line-height:1; display:flex; align-items:center; justify-content:center; width:24px; height:24px; background:var(--bg-input); border-radius:6px;">${safeEmoji}</div>
                    
                    <!-- Type Pills Centered -->
                    <div style="display:flex; justify-content:center; align-items:center; height:100%; gap:4px;">
                        <span style="display:inline-block; font-size:8px; font-weight:800; background:rgba(14,165,233,0.1); color:#0ea5e9; padding:2px 6px; border-radius:8px; text-transform:uppercase; letter-spacing:0.5px; line-height:1.2;">${safeSize}"</span>
                        <span style="display:inline-block; font-size:8px; font-weight:800; background:${stockBg}; color:${stockColor}; padding:2px 6px; border-radius:8px; text-transform:uppercase; letter-spacing:0.5px; line-height:1.2;">STOCK: ${stockQty}</span>
                    </div>
                    
                    <!-- Spool Button Top Right (Matched to Barcodz Blue) -->
                    <button onclick="addLabelzToSpool('${cleanName}', '${safeEmoji}')" style="background:#3b82f6; color:white; border:none; padding:4px 8px; border-radius:4px; font-weight:bold; font-size:10px; cursor:pointer; display:flex; align-items:center; transition:transform 0.2s;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'"><i style="margin-right:2px; font-style:normal;">➕</i> Spool</button>
                </div>
                
                <!-- Content & Edit Base -->
                <div style="padding-top:6px; border-top:1px solid var(--border-color); text-align:center; display:flex; flex-direction:column; flex:1;">
                    <div style="font-size:13px; font-weight:900; color:var(--text-heading); margin-bottom:8px; line-height:1.2; word-break:break-word; min-height:15px; display:flex; justify-content:center; align-items:center; flex:1;">${label.product_name}</div>
                    
                    <button onclick="openEditLabelModal('${cleanName}')" style="width:100%; background:var(--bg-bar); color:var(--text-main); border:1px solid var(--border-color); padding:4px 0; border-radius:4px; font-size:10px; font-weight:bold; cursor:pointer; display:flex; justify-content:center; align-items:center; transition:background 0.2s;" onmouseover="this.style.background='var(--border-color)'" onmouseout="this.style.background='var(--bg-bar)'"><i style="margin-right:4px; font-style:normal;">✏️</i> Edit Canvas</button>
                </div>
            </div>
        `;
    });

    html += '</div>';
    grid.innerHTML = html;
}

// ============================================================
// CANVAS INITIALIZATION & SIZING
// ============================================================

function initFabricCanvas() {
    if (fCanvas) return;
    const canvasEl = document.getElementById('labelzFabricCanvas');
    fCanvas = new fabric.Canvas(canvasEl, { preserveObjectStacking: true });

    fCanvas.on('selection:created', onCanvasSelection);
    fCanvas.on('selection:updated', onCanvasSelection);
    fCanvas.on('selection:cleared', onCanvasSelectionCleared);
    
    // Live update the properties panel when an object is being dragged or resized
    const updateProps = (e) => onCanvasSelection(e);
    fCanvas.on('object:moving', updateProps);
    fCanvas.on('object:scaling', updateProps);
    fCanvas.on('object:rotating', updateProps);
    
    fCanvas.on('object:modified', (e) => {
        fCanvas.renderAll();
        onCanvasSelection(e);
    });
}

function parseSize(sizeStr) {
    if(!sizeStr || sizeStr === 'custom') return {w: 2.25, h: 1.25};
    let parts = sizeStr.toLowerCase().split('x');
    if(parts.length !== 2) return {w: 2.25, h: 1.25};
    return {w: parseFloat(parts[0]), h: parseFloat(parts[1])};
}

function updateLabelCanvasSize() {
    if (!fCanvas) initFabricCanvas();
    let sizeStr = document.getElementById('labelzDesignerSize').value;
    if(sizeStr === 'custom') {
        let cw = parseFloat(prompt('Width in inches:', '2.25'));
        let ch = parseFloat(prompt('Height in inches:', '1.25'));
        if(isNaN(cw) || isNaN(ch)) return alert('Invalid dimensions');
        document.getElementById('labelzDesignerSize').options[document.getElementById('labelzDesignerSize').selectedIndex].text = `Custom ${cw}" x ${ch}"`;
        sizeStr = `${cw}x${ch}`;
        document.getElementById('labelzDesignerSize').value = 'custom';
        document.getElementById('labelzDesignerSize').dataset.customSize = sizeStr;
    } else {
        document.getElementById('labelzDesignerSize').dataset.customSize = sizeStr;
    }
    
    let {w, h} = parseSize(document.getElementById('labelzDesignerSize').dataset.customSize);

    let pxWidth = w * PPI;
    let pxHeight = h * PPI;

    fCanvas.setWidth(pxWidth);
    fCanvas.setHeight(pxHeight);
    
    // Resize container visually via CSS so it fits nicely
    const wrapper = document.getElementById('labelzCanvasWrapper');
    const container = document.getElementById('labelzCanvasContainer');
    
    // Reset zoom
    currentZoom = 1;
    zoomLabelzCanvas('fit');
}

function zoomLabelzCanvas(delta) {
    if(delta === 'fit') {
        const wrapper = document.getElementById('labelzCanvasWrapper');
        const padding = 60;
        let scaleW = (wrapper.offsetWidth - padding) / fCanvas.width;
        let scaleH = (wrapper.offsetHeight - padding) / fCanvas.height;
        currentZoom = Math.min(scaleW, scaleH);
        if(currentZoom > 2) currentZoom = 2; // cap max initial fit zoom
    } else {
        currentZoom += delta;
        if(currentZoom < 0.2) currentZoom = 0.2;
        if(currentZoom > 5) currentZoom = 5;
    }
    
    document.getElementById('labelzCanvasContainer').style.transform = `scale(${currentZoom})`;
    document.getElementById('labelzZoomReadout').innerText = `${Math.round(currentZoom * 100)}%`;
}

// ============================================================
// CANVAS ELEMENT ADDITION
// ============================================================

function addLabelzText() {
    const text = new fabric.Textbox('New Text', {
        left: fCanvas.width / 2, top: fCanvas.height / 2,
        originX: 'center', originY: 'center',
        width: 150,
        fontSize: 14,
        fontFamily: 'Arial',
        fill: '#000000',
        editable: true,
        isDynamic: false
    });
    fCanvas.add(text);
    fCanvas.setActiveObject(text);
}

function addLabelzRect() {
    const rect = new fabric.Rect({
        left: fCanvas.width / 2, top: fCanvas.height / 2,
        originX: 'center', originY: 'center',
        width: 100, height: 10,
        fill: '#000000'
    });
    fCanvas.add(rect);
    fCanvas.setActiveObject(rect);
}

function addLabelzLine() {
    const line = new fabric.Line([50, 50, 200, 50], {
        stroke: '#000000',
        strokeWidth: 2
    });
    fCanvas.add(line);
    fCanvas.setActiveObject(line);
}

function addLabelzDynamicText(templateContent = '[Item Name]') {
    const text = new fabric.Textbox(templateContent, {
        left: fCanvas.width / 2, top: fCanvas.height / 2,
        originX: 'center', originY: 'center',
        width: 150,
        fontSize: 14,
        fontFamily: 'Arial',
        fill: '#0ea5e9',
        editable: true,
        isDynamic: true // custom flag
    });
    fCanvas.add(text);
    fCanvas.setActiveObject(text);
}

function addLabelzImage() {
    document.getElementById('labelzImageUpload').click();
}

function handleLabelzImageUpload(e) {
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = function(f){
        const data = f.target.result;
        fabric.Image.fromURL(data, function(img){
            // Scaled down to fit canvas
            img.scaleToWidth(fCanvas.width * 0.5);
            img.set({left: fCanvas.width/2, top: fCanvas.height/2, originX: 'center', originY: 'center'});
            fCanvas.add(img);
            fCanvas.setActiveObject(img);
        });
    };
    reader.readAsDataURL(file);
    e.target.value = ''; // clear
}

function addLabelzBarcode(codeStr = '1234567890', format = 'code128') {
    // We use an offscreen canvas to render with bwipjs, then drop it into fabric as an image
    const tmpCanvas = document.getElementById('labelzBwipjsRenderer');
    try {
        bwipjs.toCanvas('labelzBwipjsRenderer', {
            bcid: format,
            text: codeStr,
            scale: 3,
            height: 10,
            includetext: true,
            textxalign: 'center',
        });
        
        fabric.Image.fromURL(tmpCanvas.toDataURL('image/png'), function(img) {
            img.set({
                left: fCanvas.width / 2, top: fCanvas.height / 2,
                originX: 'center', originY: 'center',
                isBarcode: true,
                barcodeOpts: { bcid: format, text: codeStr } // store state for regeneration
            });
            img.scaleToWidth(Math.min(150, fCanvas.width * 0.8));
            fCanvas.add(img);
            fCanvas.setActiveObject(img);
        });
    } catch(e) {
        console.error(e);
        alert('Could not render barcode: ' + e.message);
    }
}

function addLabelzQR(codeStr = 'NEOGLEAMZ') {
    const tmpCanvas = document.getElementById('labelzBwipjsRenderer');
    try {
        bwipjs.toCanvas('labelzBwipjsRenderer', {
            bcid: 'qrcode',
            text: codeStr,
            scale: 3,
        });
        
        fabric.Image.fromURL(tmpCanvas.toDataURL('image/png'), function(img) {
            img.set({
                left: fCanvas.width / 2, top: fCanvas.height / 2,
                originX: 'center', originY: 'center',
                isBarcode: true,
                barcodeOpts: { bcid: 'qrcode', text: codeStr }
            });
            img.scaleToWidth(Math.min(80, fCanvas.width * 0.5));
            fCanvas.add(img);
            fCanvas.setActiveObject(img);
        });
    } catch(e) {
        console.error(e);
        alert('Could not render QR: ' + e.message);
    }
}

// Regenerates a barcode image if its text or format changes
function regenerateBarcodeImage(obj, text, format) {
    if(!obj || !obj.isBarcode) return;
    const tmpCanvas = document.getElementById('labelzBwipjsRenderer');
    try {
         bwipjs.toCanvas('labelzBwipjsRenderer', {
            bcid: format,
            text: text,
            scale: 3,
            height: format === 'qrcode' ? undefined : 10,
            includetext: format !== 'qrcode',
            textxalign: 'center',
        });
        
        obj.setSrc(tmpCanvas.toDataURL('image/png'), function() {
            obj.set({ barcodeOpts: { bcid: format, text: text }});
            fCanvas.renderAll();
        });
    } catch(e) {
        console.warn('Barcode gen error:', e);
        alert('Barcode gen error: ' + e.message);
    }
}

// ============================================================
// CANVAS SELECTION & PROPERTIES PANEL
// ============================================================

function onCanvasSelectionCleared() {
    const pnl = document.getElementById('labelzPropertiesPanel');
    pnl.innerHTML = '<div style="text-align:center; color:var(--text-muted); margin-top:20px; font-style:italic;">Select an element to edit properties.</div>';
}

function onCanvasSelection(e) {
    const obj = fCanvas.getActiveObject();
    if (!obj) { onCanvasSelectionCleared(); return; }
    
    const pnl = document.getElementById('labelzPropertiesPanel');
    let html = `<h3 style="margin:0; font-size:12px; color:var(--text-heading); text-transform:uppercase; margin-bottom:10px;">${obj.type} PROPERTIES</h3>`;
    html += `<div style="display:flex; flex-direction:column; gap:10px;">`;
    
    // Common Position/Size
    html += `
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px;">
            <div><label style="font-size:10px;">X</label><input type="number" onchange="updObj('left', parseFloat(this.value))" value="${Math.round(obj.left)}" style="width:100%; padding:4px; font-size:11px; background:var(--bg-input); border:1px solid var(--border-color); color:white;"></div>
            <div><label style="font-size:10px;">Y</label><input type="number" onchange="updObj('top', parseFloat(this.value))" value="${Math.round(obj.top)}" style="width:100%; padding:4px; font-size:11px; background:var(--bg-input); border:1px solid var(--border-color); color:white;"></div>
            <div><label style="font-size:10px;">Scale W%</label><input type="number" onchange="updObj('scaleX', parseFloat(this.value)/100)" value="${Math.round(obj.scaleX*100)}" style="width:100%; padding:4px; font-size:11px; background:var(--bg-input); border:1px solid var(--border-color); color:white;"></div>
            <div><label style="font-size:10px;">Scale H%</label><input type="number" onchange="updObj('scaleY', parseFloat(this.value)/100)" value="${Math.round(obj.scaleY*100)}" style="width:100%; padding:4px; font-size:11px; background:var(--bg-input); border:1px solid var(--border-color); color:white;"></div>
        </div>
        <div>
            <label style="font-size:10px;">Rotation</label>
            <input type="range" min="0" max="360" value="${obj.angle || 0}" oninput="document.getElementById('lblzRotDisp').innerText=this.value; updObj('angle', parseFloat(this.value))" style="width:100%;">
            <span id="lblzRotDisp" style="font-size:10px;">${obj.angle||0}</span>°
        </div>
    `;

    // Text specific
    if (obj.type === 'text' || obj.type === 'textbox' || obj.type === 'i-text') {
        html += `
            <div><label style="font-size:10px;">Text Value</label><input type="text" oninput="updObj('text', this.value)" value="${obj.text}" style="width:100%; padding:4px; font-size:11px; background:var(--bg-input); border:1px solid var(--border-color); color:white;"></div>
            <div><label style="font-size:10px;">Font Size</label><input type="number" onchange="updObj('fontSize', parseFloat(this.value))" value="${obj.fontSize}" style="width:100%; padding:4px; font-size:11px; background:var(--bg-input); border:1px solid var(--border-color); color:white;"></div>
            <div style="display:flex; gap:10px;">
                <div style="flex:1;"><label style="font-size:10px;">Color</label><input type="color" onchange="updObj('fill', this.value)" value="${obj.fill}" style="width:100%; height:24px; border:none; padding:0;"></div>
                <div style="flex:1;"><label style="font-size:10px;">Weight</label><select onchange="updObj('fontWeight', this.value)" style="width:100%; padding:4px; font-size:11px; background:var(--bg-input); border:1px solid var(--border-color); color:white;"><option value="normal" ${obj.fontWeight==='normal'?'selected':''}>Normal</option><option value="bold" ${obj.fontWeight==='bold'?'selected':''}>Bold</option></select></div>
            </div>
            <div style="display:flex; gap:4px; margin-top:4px;">
               <button onclick="updObj('textAlign', 'left')" style="flex:1; padding:4px 8px; font-size:14px; background:var(--bg-input); border:1px solid var(--border-color); color:white; border-radius:4px; cursor:pointer; font-weight:bold;">⇤</button>
               <button onclick="updObj('textAlign', 'center')" style="flex:1; padding:4px 8px; font-size:14px; background:var(--bg-input); border:1px solid var(--border-color); color:white; border-radius:4px; cursor:pointer; font-weight:bold;">⇥⇤</button>
               <button onclick="updObj('textAlign', 'right')" style="flex:1; padding:4px 8px; font-size:14px; background:var(--bg-input); border:1px solid var(--border-color); color:white; border-radius:4px; cursor:pointer; font-weight:bold;">⇥</button>
            </div>
        `;
    }

    // Barcode specific
    if (obj.isBarcode) {
        let opts = obj.barcodeOpts || { bcid: 'code128', text: '' };
        html += `
            <div><label style="font-size:10px; color:#0ea5e9;">Barcode Format</label>
            <select id="lblzBcFormat" onchange="updBc()" style="width:100%; padding:4px; font-size:11px; background:var(--bg-input); border:1px solid var(--border-color); color:white;">
                <option value="code128" ${opts.bcid==='code128'?'selected':''}>CODE 128 (Universal)</option>
                <option value="qrcode" ${opts.bcid==='qrcode'?'selected':''}>QR Code</option>
                <option value="ean13" ${opts.bcid==='ean13'?'selected':''}>EAN-13 (Retail)</option>
                <option value="upca" ${opts.bcid==='upca'?'selected':''}>UPC-A</option>
            </select></div>
            <div>
                <label style="font-size:10px; color:#0ea5e9;">Encoded Data</label>
                <input type="text" id="lblzBcVal" onchange="updBc()" value="${opts.text}" style="width:100%; padding:4px; font-size:11px; background:var(--bg-input); border:1px solid var(--border-color); color:white;">
                <p style="font-size:10px; color:var(--text-muted); margin:4px 0 0 0;">Search catalog to auto-link this.</p>
            </div>
        `;
    }

    // Rect/Line specific
    if (obj.type === 'rect' || obj.type === 'line') {
        html += `
            <div style="display:flex; gap:10px;">
                <div style="flex:1;"><label style="font-size:10px;">Color</label><input type="color" onchange="updObj('fill', this.value); updObj('stroke', this.value);" value="${obj.fill || obj.stroke}" style="width:100%; height:24px; border:none; padding:0;"></div>
            </div>
        `;
    }

    html += `<hr style="border-color:var(--border-color); margin:10px 0;"><button onclick="lblzDeleteSelected()" class="btn-red" style="padding:4px; width:100%; font-size:11px;">🗑️ Delete Element</button>`;
    html += `</div>`;
    pnl.innerHTML = html;
}

// Global update handlers for property panel inputs
window.updObj = function(key, val) {
    const obj = fCanvas.getActiveObject();
    if(obj) { obj.set(key, val); fCanvas.renderAll(); }
};
window.updBc = function() {
    const obj = fCanvas.getActiveObject();
    if(obj && obj.isBarcode) {
        let f = document.getElementById('lblzBcFormat').value;
        let v = document.getElementById('lblzBcVal').value;
        regenerateBarcodeImage(obj, v, f);
    }
};
window.lblzDeleteSelected = function() {
    fCanvas.remove(fCanvas.getActiveObject());
    onCanvasSelectionCleared();
};

function updateLabelCanvasBg() {
    if(!fCanvas) return;
    fCanvas.backgroundColor = document.getElementById('labelzBgColor').value;
    fCanvas.renderAll();
}
function clearLabelCanvasBg() {
    if(!fCanvas) return;
    document.getElementById('labelzBgColor').value = '#ffffff';
    fCanvas.backgroundColor = '';
    fCanvas.renderAll();
}

// ============================================================
// CATALOG CONNECTOR
// ============================================================

function searchLabelzCatalog() {
    const q = document.getElementById('labelzCatalogSearch').value.toLowerCase();
    const resDiv = document.getElementById('labelzCatalogResults');
    if(!q || q.length < 2) { resDiv.innerHTML = '<div style="text-align:center; padding:20px; color:var(--text-muted); font-size:11px; font-style:italic;">Search to link items...</div>'; return; }

    let results = [];
    
    // Search productsDB
    if(typeof productsDB !== 'undefined') {
        Object.keys(productsDB).forEach(pName => {
            if(pName.toLowerCase().includes(q)) {
                let pd = productsDB[pName];
                let is3d = pd.is_3d_print;
                let loc = (typeof isSubassemblyDB !== 'undefined' && isSubassemblyDB[pName]) ? 'Sub-Assembly' : (is3d ? '3D Print' : 'Retail Product');
                let bcVal = typeof getItemBarcodeValue === 'function' ? getItemBarcodeValue(pName, true) : 'RECIPE:::'+pName;
                results.push({ name: pName, spec: loc, source: 'Recipe', val: bcVal, cogs: typeof getEngineTrueCogs ==='function' ? getEngineTrueCogs(pName) : 0 });
            }
        });
    }

    // Search catalogCache
    if(typeof catalogCache !== 'undefined') {
        Object.keys(catalogCache).forEach(k => {
            let c = catalogCache[k];
            if ((c.neoName||"").toLowerCase().includes(q) || (c.itemName||"").toLowerCase().includes(q)) {
                results.push({ name: c.neoName||c.itemName, spec: c.spec||'Raw Mat', source: 'Catalog', val: k, cogs: c.avgUnitCost||0 });
            }
        });
    }

    if(results.length === 0) { resDiv.innerHTML = '<div style="text-align:center; padding:20px; color:var(--text-muted); font-size:11px;">No results found.</div>'; return; }

    let html = '';
    results.slice(0, 15).forEach(r => {
        let safeName = r.name.replace(/'/g, "\\'").replace(/"/g, '&quot;');
        let safeVal = String(r.val).replace(/'/g, "\\'").replace(/"/g, '&quot;');
        html += `
            <div style="background:rgba(255,255,255,0.03); border:1px solid var(--border-color); border-radius:6px; padding:8px; cursor:pointer; transition:0.2s;" onmouseover="this.style.borderColor='#0ea5e9'" onmouseout="this.style.borderColor='var(--border-color)'" onclick="applyCatalogData('${safeName}', '${safeVal}', ${r.cogs})">
                <div style="font-size:11px; font-weight:bold; color:var(--text-heading); margin-bottom:2px;">${r.name}</div>
                <div style="display:flex; justify-content:space-between; font-size:9px; color:var(--text-muted);">
                    <span>[${r.source}] ${r.spec}</span>
                    <span>Cost: $${r.cogs.toFixed(2)}</span>
                </div>
            </div>
        `;
    });
    resDiv.innerHTML = html;
}

window.applyCatalogData = function(name, bcValue, cost) {
    const obj = fCanvas.getActiveObject();
    if(!obj) {
        // If nothing selected, drop both a text and barcode element linked
         addLabelzText();
         setTimeout(()=> {
             let txt = fCanvas.getActiveObject();
             if(txt) txt.set({text: name});
             fCanvas.discardActiveObject();
             addLabelzBarcode(bcValue, 'code128');
         }, 50);
        return;
    }

    if(obj.isBarcode) {
        let f = obj.barcodeOpts ? obj.barcodeOpts.bcid : 'code128';
        regenerateBarcodeImage(obj, bcValue, f);
    } else if(obj.type === 'text' || obj.type === 'textbox' || obj.type === 'i-text') {
        obj.set({text: name});
        fCanvas.renderAll();
    }
    onCanvasSelection({target: obj}); // refresh properties panel
};

// ============================================================
// MODAL CONTROLS & LIFECYCLE
// ============================================================

function toggleLabelzEmojiPicker() {
    const p = document.getElementById('labelzDesignerEmojiPicker');
    p.style.display = p.style.display === 'none' ? 'flex' : 'none';
}
function assignLabelzDesignerEmoji(emoji) {
    document.getElementById('labelzDesignerEmojiVal').value = emoji;
    document.getElementById('labelzDesignerEmojiBtn').innerHTML = emoji + ' <span style="font-size:10px">▼</span>';
    toggleLabelzEmojiPicker();
}

// Bind emoji clicks
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('labelzDesignerEmojiPicker')?.addEventListener('click', (e) => {
        if(e.target.tagName === 'DIV') return;
        assignLabelzDesignerEmoji(e.target.innerText);
    });
});


function openCreateLabelModal() {
    initFabricCanvas();
    labelzCurrentEdit = null;
    document.getElementById('labelzDesignerName').value = '';
    assignLabelzDesignerEmoji('🏷️');
    
    document.getElementById('labelzDesignerModal').style.display = 'flex';
    document.getElementById('labelzDesignerSize').value = '2.25x1.25';
    updateLabelCanvasSize();
    fCanvas.clear();
    fCanvas.backgroundColor = '#ffffff';
    document.getElementById('labelzBgColor').value = '#ffffff';
}

function openEditLabelModal(name) {
    initFabricCanvas();
    const l = labelzDB.find(x => x.product_name === name);
    if(!l) return;
    
    labelzCurrentEdit = l;
    document.getElementById('labelzDesignerName').value = name;
    assignLabelzDesignerEmoji(l.emoji || '🏷️');
    
    document.getElementById('labelzDesignerModal').style.display = 'flex';
    document.getElementById('labelzDesignerSize').value = l.label_size || '2.25x1.25';
    updateLabelCanvasSize();
    
    if(l.layout_json) {
        fCanvas.loadFromJSON(l.layout_json, function() {
            fCanvas.renderAll();
            // Need to regenerate barcode images because Data URLs from JSON often break or get stale cross-origin
            fCanvas.getObjects().forEach(o => {
                if(o.isBarcode && o.barcodeOpts) {
                    regenerateBarcodeImage(o, o.barcodeOpts.text, o.barcodeOpts.bcid);
                }
            });
        });
    } else {
        fCanvas.clear();
        fCanvas.backgroundColor = '#ffffff';
    }
    
    document.getElementById('labelzDesignerModal').style.display = 'flex';
}

function closeLabelzDesigner() {
    document.getElementById('labelzDesignerModal').style.display = 'none';
    labelzCurrentEdit = null;
}

function loadLabelzTemplate(tName) {
    if(!tName) return;
    if(!labelzTemplates[tName]) return;
    if(!confirm("Loading a template will overwrite current canvas. Continue?")) {
        document.getElementById('labelzTemplateSelect').value = '';
        return;
    }
    
    // Auto-set size roughly based on template type if needed, or keep current
    if(tName === 'shipping') {
        document.getElementById('labelzDesignerSize').value = '4x6';
        updateLabelCanvasSize();
    }

    fCanvas.loadFromJSON(labelzTemplates[tName], function() {
        fCanvas.renderAll();
        // Fire regen for barcodes inside template
        fCanvas.getObjects().forEach(o => {
            if(o.isBarcode && o.barcodeOpts) {
                regenerateBarcodeImage(o, o.barcodeOpts.text, o.barcodeOpts.bcid);
            }
        });
    });
    document.getElementById('labelzTemplateSelect').value = '';
}

// ============================================================
// SAVE & EXPORT
// ============================================================

async function saveLabelzDesign() {
    const name = document.getElementById('labelzDesignerName').value.trim();
    if(!name) return alert('Label name is required.');
    
    const emoji = document.getElementById('labelzDesignerEmojiVal').value || '🏷️';
    const size = document.getElementById('labelzDesignerSize').value;
    
    fCanvas.discardActiveObject(); // deselect handles before saving JSON
    const layout = fCanvas.toJSON(['isBarcode', 'barcodeOpts']); // keep custom props

    const payload = {
        product_name: name,
        emoji,
        label_size: size,
        layout_json: layout,
        updated_at: new Date().toISOString()
    };

    try {
        setMasterStatus('Saving label design...', 'mod-working');
        const { error } = await supabaseClient.from('label_designs').upsert(payload, { onConflict: 'product_name' });
        if (error) throw error;
        
        // Ensure product_recipes has is_label
        const { error: prErr } = await supabaseClient.from('product_recipes').upsert({
            product_name: name,
            components: (typeof productsDB!=='undefined' && productsDB[name]) ? productsDB[name] : [],
            is_label: true,
            label_emoji: emoji,
            is_subassembly: false,
            is_3d_print: false,
            labor_time_mins: 0,
            labor_rate_hr: 0,
            msrp: 0,
            wholesale_price: 0,
            print_time_mins: 0
        }, { onConflict: 'product_name', ignoreDuplicates: false });
        if(prErr) sysLog("Labelz Error: " + prErr.message, true);

        if(typeof productsDB!=='undefined') {
             if(!productsDB[name]) {
                 productsDB[name] = [];
                 productsDB[name].msrp = 0;
             }
             productsDB[name].is_label = true;
             productsDB[name].label_emoji = emoji;
        }

        setMasterStatus('Label saved!', 'mod-success');
        setTimeout(() => setMasterStatus('Ready.', 'status-idle'), 2000);
        closeLabelzDesigner();
        await loadLabelzData();
        if(typeof renderProductList === 'function') renderProductList();
    } catch(e) {
        sysLog('saveLabel: ' + e.message, true);
        setMasterStatus('Error saving', 'mod-error');
    }
}

// EXPORT TO PDF VIA jsPDF
async function deleteLabelzDesign() {
    const name = document.getElementById('labelzDesignerName').value.trim();
    if(!name) return alert('No label loaded to delete.');
    
    if(!confirm(`Are you sure you want to permanently delete the custom label '${name}'?`)) return;
    
    try {
        setMasterStatus('Deleting label design...', 'mod-working');
        
        const { error: err1 } = await supabaseClient.from('label_designs').delete().eq('product_name', name);
        if (err1) throw err1;
        
        await supabaseClient.from('product_recipes').delete().eq('product_name', name);
        
        if(typeof productsDB !== 'undefined' && productsDB[name]) {
            delete productsDB[name];
        }
        if(typeof labelzDB !== 'undefined') {
            labelzDB = labelzDB.filter(x => x.product_name !== name);
        }
        
        setMasterStatus('Label deleted!', 'mod-success');
        setTimeout(() => setMasterStatus('Ready.', 'status-idle'), 2000);
        
        closeLabelzDesigner();
        await loadLabelzData();
        if(typeof renderProductList === 'function') renderProductList();
        if(typeof renderBarcodzGrid === 'function') renderBarcodzGrid(true);
    } catch(e) {
        sysLog('deleteLabelz: ' + e.message, true);
        setMasterStatus('Error deleting', 'mod-error');
    }
}

function exportLabelzPDF() {
    if(!fCanvas) return;
    if(typeof window.jspdf === 'undefined') return alert('jsPDF library not loaded.');
    
    fCanvas.discardActiveObject();
    fCanvas.renderAll();

    const { jsPDF } = window.jspdf;
    let {w, h} = parseSize(document.getElementById('labelzDesignerSize').dataset.customSize || document.getElementById('labelzDesignerSize').value);
    
    // Create PDF targeting exact dimensions in inches
    const doc = new jsPDF({
        orientation: w > h ? 'landscape' : 'portrait',
        unit: 'in',
        format: [w, h]
    });

    // Get high-res snapshot of canvas
    const imgData = fCanvas.toDataURL({ format: 'png', multiplier: 3 });
    
    doc.addImage(imgData, 'PNG', 0, 0, w, h);
    
    // We open in new tab so user can print, ensuring they know to check 'Fit to Scale / 100%'
    const blobUrl = doc.output('bloburl');
    const win = window.open(blobUrl, '_blank');
    if(!win) alert('Popup blocked! Please allow popups to open PDF preview.');
}

// ============================================================
// BARCODZ CACHE INTEGRATION
// ============================================================
function getLabelzForBarcodz() {
    return labelzDB.map(l => ({
        name: l.product_name,
        slug: l.product_name.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '').toUpperCase().substring(0, 30),
        type: 'Custom Labelz',
        icon: l.emoji || '🏷️',
        isCatalog: false,
        isLabel: true,
        fileUrl: l.file_url || null, // legacy
        layout: l.layout_json
    }));
}

function initLabelzPane() {
    // Already populated on boot, just ensure layout wrapper displays cleanly
    if(labelzDB.length === 0) loadLabelzData();
}

// Initial pull triggered on script load if supabase available
setTimeout(() => { if(typeof supabaseClient !== 'undefined') loadLabelzData(); }, 3000);

// ============================================================
// SPOOL INTEGRATION
// ============================================================
window.addLabelzToSpool = function(name, emoji) {
    if(typeof addBarcodzToSpool === 'function') {
        const slug = name.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '').toUpperCase().substring(0, 30);
        addBarcodzToSpool(name, slug, emoji || '🏷️', 'Custom Labelz');
    } else {
        alert('Barcodz subsystem not loaded yet. Try again.');
    }
};
