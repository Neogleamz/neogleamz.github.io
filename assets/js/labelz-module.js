/**
 * @typedef {Object} LabelPayload
 * @property {string} product_name
 * @property {string|null} emoji
 * @property {string|null} label_size
 * @property {string} canvas_json
 */
// ============================================================
// LABELZ MODULE — Neogleamz Custom Label Manager (Canvas)
// ============================================================
// Manages custom thermal-printed labels using Fabric.js and bwip-js.
// Integrated with Catalog for barcode mappings.
// ============================================================

const _LABEL_STORAGE_BUCKET = 'sop-media';

let labelzDB = [];
let _labelzCurrentEdit = null;

// Fabric Canvas Instance Variables
let fCanvas = null;
let currentZoom = 1;
const PPI = 300; // High-res internal pixels per inch for crisp printing/scaling

// History State Management
let lblzHistory = [];
let lblzHistoryProg = -1;
let isHistoryLocked = false;

function saveLabelzHistory() {
    if (isHistoryLocked || !fCanvas) return;
    const json = fCanvas.toJSON(['isBarcode', 'barcodeOpts', 'isDynamic']);
    lblzHistory = lblzHistory.slice(0, lblzHistoryProg + 1);
    lblzHistory.push(JSON.stringify(json));
    lblzHistoryProg++;
    if (lblzHistory.length > 30) {
        lblzHistory.shift();
        lblzHistoryProg--;
    }
}

window.lblzUndo = function() {
    if (lblzHistoryProg > 0) {
        lblzHistoryProg--;
        loadLabelzHistory(lblzHistory[lblzHistoryProg]);
    }
};

window.lblzRedo = function() {
    if (lblzHistoryProg < lblzHistory.length - 1) {
        lblzHistoryProg++;
        loadLabelzHistory(lblzHistory[lblzHistoryProg]);
    }
};

function loadLabelzHistory(jsonStr) {
    if (!jsonStr || !fCanvas) return;
    isHistoryLocked = true;
    fCanvas.loadFromJSON(jsonStr, function() {
        fCanvas.renderAll();
        // Restore dynamic regenerations
        fCanvas.getObjects().forEach(o => {
            if (o.isBarcode && o.barcodeOpts) {
                regenerateBarcodeImage(o, o.barcodeOpts.text, o.barcodeOpts.bcid);
            }
        });
        isHistoryLocked = false;
    });
}



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
    try {
        const grid = document.getElementById('labelzGrid');
        if (!grid) return;
        const search = document.getElementById('labelzSearch')?.value.toLowerCase() || '';

        const filtered = labelzDB.filter(l => l.product_name.toLowerCase().includes(search));

        if (filtered.length === 0) {
            grid.innerHTML = window.safeHTML(`
                <div style="text-align:center;padding:60px;color:var(--text-muted);font-style:italic;">
                    <div style="font-size:48px;margin-bottom:12px;">🏷️</div>
                    ${search ? 'No labels match your search.' : 'No custom labels yet. Click <strong>+ NEW LABEL</strong> to create your first one.'}
                </div>
            `);
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
                <div class="hover-border-primary" style="background:var(--bg-panel); border:1px solid var(--border-color); border-radius:8px; padding:10px; display:flex; flex-direction:column; box-shadow:0 2px 4px rgba(0,0,0,0.1); transition:border-color 0.2s;">
                    
                    <div style="display:grid; grid-template-columns:auto 1fr auto; align-items:center; margin-bottom:8px; gap:8px;">
                        <!-- Emoji Top Left -->
                        <div style="font-size:18px; line-height:1; display:flex; align-items:center; justify-content:center; width:24px; height:24px; background:var(--bg-input); border-radius:6px;">${safeEmoji}</div>
                        
                        <!-- Type Pills Centered -->
                        <div style="display:flex; justify-content:center; align-items:center; height:100%; gap:4px;">
                            <span style="display:inline-block; font-size:8px; font-weight:800; background:rgba(14,165,233,0.1); color:#0ea5e9; padding:2px 6px; border-radius:8px; text-transform:uppercase; letter-spacing:0.5px; line-height:1.2;">${safeSize}"</span>
                            <span style="display:inline-block; font-size:8px; font-weight:800; background:${stockBg}; color:${stockColor}; padding:2px 6px; border-radius:8px; text-transform:uppercase; letter-spacing:0.5px; line-height:1.2;">STOCK: ${stockQty}</span>
                        </div>
                        
                        <!-- Spool Button Top Right -->
                        <button class="btn-white" data-click="click_addLabelzToSpool" data-name="${cleanName}" data-emoji="${safeEmoji}" style="padding:4px 8px; font-size:10px;"><i style="margin-right:2px; font-style:normal;">➕</i> Spool</button>
                    </div>
                    
                    <!-- Content & Edit Base -->
                    <div style="padding-top:6px; border-top:1px solid var(--border-color); text-align:center; display:flex; flex-direction:column; flex:1;">
                        <div style="font-size:13px; font-weight:900; color:var(--text-heading); margin-bottom:8px; line-height:1.2; word-break:break-word; min-height:15px; display:flex; justify-content:center; align-items:center; flex:1;">${label.product_name}</div>
                        
                        <button class="btn-orange" data-click="click_openEditLabelModal" data-name="${cleanName}" style="width:100%; padding:4px 0; font-size:10px; display:flex; justify-content:center; align-items:center;"><i style="margin-right:4px; font-style:normal;">✏️</i> Edit Label</button>
                    </div>
                </div>
            `;
        });

        html += '</div>';
        grid.innerHTML = window.safeHTML(html);
    } catch(e) { sysLog('Labelz grid render error: ' + e.message, true); }
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
        saveLabelzHistory();
        fCanvas.renderAll();
        onCanvasSelection(e);
    });
    
    fCanvas.on('object:added', (_e) => { saveLabelzHistory(); });
    fCanvas.on('object:removed', (_e) => { saveLabelzHistory(); });

    // Global copy/paste & keyboard listener cleanup and injection
    window.removeEventListener('paste', handleLabelzPaste);
    window.removeEventListener('keydown', handleLabelzKeyboard);
    window.addEventListener('paste', handleLabelzPaste);
    window.addEventListener('keydown', handleLabelzKeyboard);
}

function handleLabelzKeyboard(e) {
    const modal = document.getElementById('labelzDesignerModal');
    if (!modal || modal.style.display === 'none') return;
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    // Delete
    if (e.key === 'Delete' || e.key === 'Backspace') {
        const obj = fCanvas.getActiveObject();
        if(obj) { fCanvas.remove(obj); fCanvas.discardActiveObject(); e.preventDefault(); }
    }
    // Duplicate
    else if (e.ctrlKey && e.key === 'd') {
        lblzDuplicateSelected();
        e.preventDefault();
    }
    // Undo/Redo
    else if (e.ctrlKey && e.key === 'z') { lblzUndo(); e.preventDefault(); }
    else if (e.ctrlKey && e.key === 'y') { lblzRedo(); e.preventDefault(); }
    // Arrow Nudging
    else if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) {
        const obj = fCanvas.getActiveObject();
        if (obj) {
            e.preventDefault();
            const px = e.shiftKey ? 10 : 1;
            if(e.key === 'ArrowUp') obj.top -= px;
            if(e.key === 'ArrowDown') obj.top += px;
            if(e.key === 'ArrowLeft') obj.left -= px;
            if(e.key === 'ArrowRight') obj.left += px;
            fCanvas.renderAll();
            saveLabelzHistory();
            onCanvasSelection();
        }
    }
}

function updateLabelCanvasSize() {
    if (!fCanvas) initFabricCanvas();
    
    let sizeStr = document.getElementById('labelzDesignerSize').value;
    let pObj = {w: 2.25, h: 1.25};
    try { pObj = JSON.parse(sizeStr); } catch(e) { console.error(e); }
    
    let pxWidth = pObj.w * PPI;
    let pxHeight = pObj.h * PPI;
    
    // Store active metadata back so print engine knows
    document.getElementById('labelzDesignerSize').dataset.customSize = `${pObj.w}x${pObj.h}`;



    fCanvas.setWidth(pxWidth);
    fCanvas.setHeight(pxHeight);
    
    // Resize container visually via CSS so it fits nicely
    const _wrapper = document.getElementById('labelzCanvasWrapper');
    const _container = document.getElementById('labelzCanvasContainer');
    
    // Reset zoom
    currentZoom = 1;
    if (typeof updateLabelCanvasOrientation === 'function') {
        updateLabelCanvasOrientation();
    } else {
        zoomLabelzCanvas('fit');
    }
}

window.updateLabelCanvasOrientation = function() {
    const orientation = document.getElementById('labelzOrientation') ? document.getElementById('labelzOrientation').value : 'Portrait';
    const container = document.getElementById('labelzCanvasContainer');
    
    if (container) {
        if (orientation === 'Landscape' || orientation === '90') {
            container.style.transform = 'rotate(90deg)';
        } else {
            container.style.transform = 'rotate(0deg)';
        }
    }
    
    zoomLabelzCanvas('fit');
};

function zoomLabelzCanvas(delta) {
    if(delta === 'fit') {
        const wrapper = document.getElementById('labelzCanvasWrapper');
        const padding = 60;
        const orientation = document.getElementById('labelzOrientation') ? document.getElementById('labelzOrientation').value : 'Portrait';
        
        let cWidth = fCanvas.width;
        let cHeight = fCanvas.height;
        if (orientation === 'Landscape' || orientation === '90') {
            cWidth = fCanvas.height;
            cHeight = fCanvas.width;
        }

        let scaleW = (wrapper.offsetWidth - padding) / cWidth;
        let scaleH = (wrapper.offsetHeight - padding) / cHeight;
        currentZoom = Math.min(scaleW, scaleH);
        if(currentZoom > 2) currentZoom = 2; // cap max initial fit zoom
    } else {
        currentZoom += delta;
        if(currentZoom < 0.2) currentZoom = 0.2;
        if(currentZoom > 5) currentZoom = 5;
    }
    
    fCanvas.setDimensions({ width: fCanvas.width * currentZoom + 'px', height: fCanvas.height * currentZoom + 'px' }, { cssOnly: true });
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

window.addLabelzRect = function() {
    disableLabelzDrawingMode();
    const rect = new fabric.Rect({
        left: fCanvas.width / 2, top: fCanvas.height / 2,
        originX: 'center', originY: 'center',
        width: 100, height: 10,
        fill: '#000000'
    });
    fCanvas.add(rect);
    fCanvas.setActiveObject(rect);
}

window.addLabelzCircle = function() {
    disableLabelzDrawingMode();
    const circ = new fabric.Circle({
        left: fCanvas.width / 2, top: fCanvas.height / 2,
        originX: 'center', originY: 'center',
        radius: 50,
        fill: '#0ea5e9'
    });
    fCanvas.add(circ);
    fCanvas.setActiveObject(circ);
}

function disableLabelzDrawingMode() {
    if(fCanvas) fCanvas.isDrawingMode = false;
    const btn = document.getElementById('lblzBrushBtn');
    if(btn) btn.style.background = 'var(--bg-input)';
}

window.toggleLabelzDrawingMode = function(btnObj) {
    if(!fCanvas) return;
    fCanvas.isDrawingMode = !fCanvas.isDrawingMode;
    if(fCanvas.isDrawingMode) {
        fCanvas.freeDrawingBrush.color = '#ef4444';
        fCanvas.freeDrawingBrush.width = 5;
        if(btnObj) btnObj.style.background = '#ef4444';
    } else {
        if(btnObj) btnObj.style.background = 'var(--bg-input)';
    }
};

window.addLabelzLine = function() {
    disableLabelzDrawingMode();
    const line = new fabric.Line([50, 50, 200, 50], {
        stroke: '#000000',
        strokeWidth: 2
    });
    fCanvas.add(line);
    fCanvas.setActiveObject(line);
}

window.addLabelzDynamicText = function(templateContent = '[Item Name]') {
    disableLabelzDrawingMode();
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

window.addLabelzImage = function() {
    disableLabelzDrawingMode();
    document.getElementById('labelzImageUpload').click();
}

window.handleLabelzImageUpload = function(e) {
    const file = e.target.files[0];
    if(!file) return;

    const ext = file.name.split('.').pop().toLowerCase();
    if (['doc', 'docx', 'pdf', 'xml', 'txt'].includes(ext)) {
        alert("⚠️ UNSUPPORTED FORMAT ⚠️\n\nThe Canvas Designer cannot natively read Word Documents (.docx) or PDFs directly because their formatting is proprietary.\n\nHOW TO MIGRATE YOUR LABELS:\n1. Open your Word document.\n2. Use the Windows Snipping Tool (Win + Shift + S) to take a snapshot of your label.\n3. Come back to this screen and press Ctrl+V to paste the image directly onto the canvas!");
        e.target.value = ''; // clear
        return;
    }

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

function handleLabelzPaste(e) {
    // Only intercept clipboard if the Labelz Designer modal is visibly open
    const modal = document.getElementById('labelzDesignerModal');
    if (!modal || modal.style.display === 'none') return;
    
    // Give priority to native input boxes (let users paste text into properties panel)
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    if (!e.clipboardData || !e.clipboardData.items) return;
    
    for (let i = 0; i < e.clipboardData.items.length; i++) {
        let item = e.clipboardData.items[i];
        if (item.type.indexOf("image") !== -1) {
            let blob = item.getAsFile();
            const reader = new FileReader();
            reader.onload = function(f){
                const data = f.target.result;
                fabric.Image.fromURL(data, function(img){
                    img.scaleToWidth(fCanvas.width * 0.5);
                    img.set({left: fCanvas.width/2, top: fCanvas.height/2, originX: 'center', originY: 'center'});
                    if(fCanvas) {
                        fCanvas.add(img);
                        fCanvas.setActiveObject(img);
                    }
                });
            };
            reader.readAsDataURL(blob);
            e.preventDefault(); // Stop browser from attempting to display image
            break;
        }
    }
}


function addLabelzBarcode(codeStr = '1234567890', format = 'code128') {
    disableLabelzDrawingMode();
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
            img.scaleToWidth(fCanvas.width * 0.6);
            fCanvas.add(img);
            fCanvas.setActiveObject(img);
        });
    } catch(e) {
        sysLog('Fabric Barcode Gen Error: ' + e.message, true);
        tmpCanvas.width = 150; tmpCanvas.height = 30;
        const ctx = tmpCanvas.getContext('2d');
        ctx.fillStyle = '#ff0000'; ctx.fillRect(0,0,150,30);
        ctx.fillStyle = '#ffffff'; ctx.font = '12px Arial'; ctx.textAlign = 'center'; ctx.fillText('INVALID FORMAT', 75, 20);
        fabric.Image.fromURL(tmpCanvas.toDataURL('image/png'), function(img) {
            img.set({
                left: fCanvas.width / 2, top: fCanvas.height / 2,
                originX: 'center', originY: 'center',
                isBarcode: true,
                barcodeOpts: { bcid: format, text: codeStr }
            });
            img.scaleToWidth(fCanvas.width * 0.6);
            fCanvas.add(img);
            fCanvas.setActiveObject(img);
        });
        alert('Could not render barcode: ' + e.message);
    }
}

window.addLabelzQR = function(codeStr = 'NEOGLEAMZ') {
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
            img.scaleToWidth(fCanvas.width * 0.3);
            fCanvas.add(img);
            fCanvas.setActiveObject(img);
        });
    } catch(e) {
        sysLog('Fabric QR Gen Error: ' + e.message, true);
        alert('Could not render QR: ' + e.message);
    }
}

// Regenerates a barcode image if its text or format changes
function regenerateBarcodeImage(obj, text, format) {
    if(!obj || !obj.isBarcode) return;
    const tmpCanvas = document.getElementById('labelzBwipjsRenderer');
    try {
         let drawOpts = {
            bcid: format,
            text: text,
            scale: 3,
            includetext: format !== 'qrcode',
            textxalign: 'center',
        };
        if (format !== 'qrcode') drawOpts.height = 10;
        bwipjs.toCanvas('labelzBwipjsRenderer', drawOpts);
        
        obj.setSrc(tmpCanvas.toDataURL('image/png'), function() {
            obj.set({ barcodeOpts: { bcid: format, text: text }});
            fCanvas.renderAll();
        });
    } catch(e) {
        sysLog('Fabric Barcode Regen Error: ' + e.message, true);
        // Draw visual error indicator
        tmpCanvas.width = 150; tmpCanvas.height = 30;
        const ctx = tmpCanvas.getContext('2d');
        ctx.fillStyle = '#ff0000'; ctx.fillRect(0,0,150,30);
        ctx.fillStyle = '#ffffff'; ctx.font = '12px Arial'; ctx.textAlign = 'center'; ctx.fillText('INVALID FORMAT', 75, 20);
        obj.setSrc(tmpCanvas.toDataURL('image/png'), function() {
            obj.set({ barcodeOpts: { bcid: format, text: text }});
            fCanvas.renderAll();
        });
        alert('Format Constraint Violation: \n' + e.message);
    }
}

// ============================================================
// CANVAS SELECTION & PROPERTIES PANEL
// ============================================================

function onCanvasSelectionCleared() {
    const pnl = document.getElementById('labelzPropertiesPanel');
    pnl.innerHTML = window.safeHTML(
        '<div style="text-align:center; color:var(--text-muted); margin-top:20px; font-style:italic;">Select an element to edit properties.</div>'
    );
}

function onCanvasSelection(_e) {
    const obj = fCanvas.getActiveObject();
    if (!obj) { onCanvasSelectionCleared(); return; }
    
    const pnl = document.getElementById('labelzPropertiesPanel');
    let html = `<h3 style="margin:0; font-size:12px; color:var(--text-heading); text-transform:uppercase; margin-bottom:10px;">${obj.type} PROPERTIES</h3>`;
    html += `<div style="display:flex; flex-direction:column; gap:10px;">`;
    
    // Common Position/Size
    html += `
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px;">
            <div><label style="font-size:10px;">X</label><input type="number" data-app-change="lblzUpdObj" data-key="left" data-type="float" value="${Math.round(obj.left)}" style="width:100%; padding:4px; font-size:11px; background:var(--bg-input); border:1px solid var(--border-color); color:white;"></div>
            <div><label style="font-size:10px;">Y</label><input type="number" data-app-change="lblzUpdObj" data-key="top" data-type="float" value="${Math.round(obj.top)}" style="width:100%; padding:4px; font-size:11px; background:var(--bg-input); border:1px solid var(--border-color); color:white;"></div>
            <div><label style="font-size:10px;">Scale W%</label><input type="number" data-app-change="lblzUpdObj" data-key="scaleX" data-type="float100" value="${Math.round(obj.scaleX*100)}" style="width:100%; padding:4px; font-size:11px; background:var(--bg-input); border:1px solid var(--border-color); color:white;"></div>
            <div><label style="font-size:10px;">Scale H%</label><input type="number" data-app-change="lblzUpdObj" data-key="scaleY" data-type="float100" value="${Math.round(obj.scaleY*100)}" style="width:100%; padding:4px; font-size:11px; background:var(--bg-input); border:1px solid var(--border-color); color:white;"></div>
        </div>
        <div>
            <label style="font-size:10px;">Rotation</label>
            <input type="range" min="0" max="360" value="${obj.angle || 0}" data-app-input="lblzUpdObjSync" data-key="angle" data-type="float" data-sync-id="lblzRotDisp" style="width:100%;">
            <span id="lblzRotDisp" style="font-size:10px;">${obj.angle||0}</span>°
        </div>
        <div>
            <label style="font-size:10px;">Opacity</label>
            <input type="range" min="0" max="100" value="${(obj.opacity || 1)*100}" data-app-input="lblzUpdObjSync" data-key="opacity" data-type="float100" data-sync-id="lblzOpDisp" data-sync-suffix="%" style="width:100%;">
            <span id="lblzOpDisp" style="font-size:10px;">${Math.round((obj.opacity||1)*100)}%</span>
        </div>
        
        <!-- PRO Layer Controls -->
        <div style="display:flex; gap:6px;">
            <button data-click="click_labelzBringForward" style="flex:1; padding:4px; background:rgba(255,255,255,0.05); border:1px solid var(--border-color); border-radius:4px; color:white; font-size:11px; cursor:pointer;" title="Bring Forward">🔼 Up</button>
            <button data-click="click_labelzSendBackward" style="flex:1; padding:4px; background:rgba(255,255,255,0.05); border:1px solid var(--border-color); border-radius:4px; color:white; font-size:11px; cursor:pointer;" title="Send Backward">🔽 Down</button>
            <button data-click="click_lblzDuplicateSelected" style="flex:1; padding:4px; background:var(--bg-input); border:1px solid var(--border-color); border-radius:4px; color:#10b981; font-size:11px; font-weight:bold; cursor:pointer;" title="Duplicate Element (Ctrl+D)">📄 Copy</button>
        </div>
    `;

    // Text specific
    if (obj.type === 'text' || obj.type === 'textbox' || obj.type === 'i-text') {
        html += `
            <div><label style="font-size:10px;">Text Value</label><input type="text" data-app-input="lblzUpdObj" data-key="text" data-type="string" value="${obj.text}" style="width:100%; padding:4px; font-size:11px; background:var(--bg-input); border:1px solid var(--border-color); color:white;"></div>
            <div><label style="font-size:10px;">Font Size</label><input type="number" data-app-change="lblzUpdObj" data-key="fontSize" data-type="float" value="${obj.fontSize}" style="width:100%; padding:4px; font-size:11px; background:var(--bg-input); border:1px solid var(--border-color); color:white;"></div>
            <div style="display:flex; gap:10px;">
                <div style="flex:1;"><label style="font-size:10px;">Color</label><input type="color" data-app-change="lblzUpdObj" data-key="fill" data-type="string" value="${obj.fill}" style="width:100%; height:24px; border:none; padding:0;"></div>
                <div style="flex:1;"><label style="font-size:10px;">Weight</label><select data-app-change="lblzUpdObj" data-key="fontWeight" data-type="string" style="width:100%; padding:4px; font-size:11px; background:var(--bg-input); border:1px solid var(--border-color); color:white;"><option value="normal" ${obj.fontWeight==='normal'?'selected':''}>Normal</option><option value="bold" ${obj.fontWeight==='bold'?'selected':''}>Bold</option></select></div>
            </div>
            <div style="display:flex; gap:4px; margin-top:4px;">
               <button data-click="click_lblzUpdObj" data-key="textAlign" data-val="left" style="flex:1; padding:4px 8px; font-size:14px; background:var(--bg-input); border:1px solid var(--border-color); color:white; border-radius:4px; cursor:pointer; font-weight:bold;">⇤</button>
               <button data-click="click_lblzUpdObj" data-key="textAlign" data-val="center" style="flex:1; padding:4px 8px; font-size:14px; background:var(--bg-input); border:1px solid var(--border-color); color:white; border-radius:4px; cursor:pointer; font-weight:bold;">⇥⇤</button>
               <button data-click="click_lblzUpdObj" data-key="textAlign" data-val="right" style="flex:1; padding:4px 8px; font-size:14px; background:var(--bg-input); border:1px solid var(--border-color); color:white; border-radius:4px; cursor:pointer; font-weight:bold;">⇥</button>
            </div>
        `;
    }

    // Barcode specific
    if (obj.isBarcode) {
        let opts = obj.barcodeOpts || { bcid: 'code128', text: '' };
        html += `
            <div><label style="font-size:10px; color:#0ea5e9;">Barcode Format</label>
            <select id="lblzBcFormat" data-app-change="lblzUpdBc" style="width:100%; padding:4px; font-size:11px; background:var(--bg-input); border:1px solid var(--border-color); color:white;">
                <option value="code128" ${opts.bcid==='code128'?'selected':''}>CODE 128 (Universal)</option>
                <option value="qrcode" ${opts.bcid==='qrcode'?'selected':''}>QR Code</option>
                <option value="code39" ${opts.bcid==='code39'?'selected':''}>CODE 39</option>
            </select></div>
            <div>
                <label style="font-size:10px; color:#0ea5e9;">Encoded Data</label>
                <input type="text" id="lblzBcVal" data-app-change="lblzUpdBc" value="${opts.text}" style="width:100%; padding:4px; font-size:11px; background:var(--bg-input); border:1px solid var(--border-color); color:white;">
                <p style="font-size:10px; color:var(--text-muted); margin:4px 0 0 0;">Search catalog to auto-link this.</p>
            </div>
        `;
    }

    // Rect/Line/Circle/Brush specific
    if (obj.type === 'rect' || obj.type === 'line' || obj.type === 'circle' || obj.type === 'path') {
        html += `
            <div style="display:flex; gap:10px;">
                <div style="flex:1;"><label style="font-size:10px;">Color</label><input type="color" data-app-change="lblzUpdObjDouble" data-key1="fill" data-key2="stroke" data-type="string" value="${obj.fill || obj.stroke}" style="width:100%; height:24px; border:none; padding:0;"></div>
            </div>
        `;
    }

    // Locking tool
    html += `
        <div style="margin-top:10px; display:flex; gap:6px;">
           <button data-click="click_lblzToggleLock" data-locked="${!!obj.lockMovementX}" style="flex:1; background:${obj.lockMovementX ? '#ef4444' : 'var(--bg-bar)'}; color:white; border:1px solid var(--border-color); padding:4px; font-size:10px; border-radius:4px; cursor:pointer;">
             ${obj.lockMovementX ? '🔒 UNLOCK' : '🔓 LOCK POS'}
           </button>
           <button data-click="click_lblzDeleteSelected" class="btn-red" style="padding:4px; flex:1; font-size:11px;">🗑️ Delete</button>
        </div>
    `;
    html += `</div>`;
    pnl.innerHTML = window.safeHTML(html);
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
    if(fCanvas.getActiveObject()) {
        fCanvas.remove(fCanvas.getActiveObject());
        fCanvas.discardActiveObject();
    }
};
window.lblzDuplicateSelected = function() {
    const act = fCanvas.getActiveObject();
    if(!act) return;
    act.clone(function(cloned) {
        cloned.set({
            left: act.left + 20,
            top: act.top + 20,
            evented: true
        });
        // clone nested props if needed
        if(act.isDynamic) cloned.isDynamic = true;
        if(act.isBarcode) {
            cloned.isBarcode = true;
            cloned.barcodeOpts = JSON.parse(JSON.stringify(act.barcodeOpts));
        }
        fCanvas.add(cloned);
        fCanvas.setActiveObject(cloned);
    });
};

window.updateLabelCanvasBg = function() {
    if(!fCanvas) return;
    fCanvas.backgroundColor = document.getElementById('labelzBgColor').value;
    fCanvas.renderAll();
}
window.clearLabelCanvasBg = function() {
    if(!fCanvas) return;
    document.getElementById('labelzBgColor').value = '#ffffff';
    fCanvas.backgroundColor = '';
    fCanvas.renderAll();
}

// ============================================================
// CATALOG CONNECTOR
// ============================================================

window.searchLabelzCatalog = function() {
    try {
        const q = document.getElementById('labelzCatalogSearch').value.toLowerCase();
        const resDiv = document.getElementById('labelzCatalogResults');
        if(!q || q.length < 2) { resDiv.innerHTML = window.safeHTML(
            '<div style="text-align:center; padding:20px; color:var(--text-muted); font-size:11px; font-style:italic;">Search to link items...</div>'
        ); return; }

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

        if(results.length === 0) { resDiv.innerHTML = window.safeHTML(
            '<div style="text-align:center; padding:20px; color:var(--text-muted); font-size:11px;">No results found.</div>'
        ); return; }

        let html = '';
        results.slice(0, 15).forEach(r => {
            let safeName = r.name.replace(/'/g, "\\'").replace(/"/g, '&quot;');
            let safeVal = String(r.val).replace(/'/g, "\\'").replace(/"/g, '&quot;');
            html += `
                <div class="hover-border-primary" style="background:rgba(255,255,255,0.03); border:1px solid var(--border-color); border-radius:6px; padding:8px; cursor:pointer; transition:0.2s;" data-click="click_applyCatalogData" data-name="${safeName}" data-val="${safeVal}" data-cogs="${r.cogs}">
                    <div style="font-size:11px; font-weight:bold; color:var(--text-heading); margin-bottom:2px;">${r.name}</div>
                    <div style="display:flex; justify-content:space-between; font-size:9px; color:var(--text-muted);">
                        <span>[${r.source}] ${r.spec}</span>
                        <span>Cost: $${r.cogs.toFixed(2)}</span>
                    </div>
                </div>
            `;
        });
        resDiv.innerHTML = window.safeHTML(html);
    } catch(e) { sysLog('Labelz Catalog Search error: ' + e.message, true); }
}

window.applyCatalogData = function(name, bcValue, _cost) {
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

window.toggleLabelzEmojiPicker = function() {
    const p = document.getElementById('labelzDesignerEmojiPicker');
    if(p) p.style.display = p.style.display === 'none' ? 'flex' : 'none';
}
function assignLabelzDesignerEmoji(emoji) {
    document.getElementById('labelzDesignerEmojiVal').value = emoji;
    document.getElementById('labelzDesignerEmojiBtn').innerHTML = window.safeHTML(emoji + ' <span style="font-size:10px">▼</span>');
    const p = document.getElementById('labelzDesignerEmojiPicker');
    if(p) p.style.display = 'none';
}

// Bind emoji clicks safely for dynamic modals
document.body.addEventListener('click', (e) => {
    // If they click inside the picker container, but not the container itself
    if (e.target.closest('#labelzDesignerEmojiPicker') && e.target.tagName !== 'DIV') {
        assignLabelzDesignerEmoji(e.target.innerText.trim());
    }
});

window.openCreateLabelModal = function() {
    initFabricCanvas();
    _labelzCurrentEdit = null;
    document.getElementById('labelzDesignerName').value = '';
    assignLabelzDesignerEmoji('🏷️');
    
    document.getElementById('labelzDesignerModal').style.display = 'flex';
    document.getElementById('labelzDesignerSize').value = '2.25x1.25';
    updateLabelCanvasSize();
    fCanvas.clear();
    fCanvas.backgroundColor = '#ffffff';
    document.getElementById('labelzBgColor').value = '#ffffff';
    
    lblzHistory = [];
    lblzHistoryProg = -1;
    saveLabelzHistory();
}

window.openEditLabelModal = function(name) {
    initFabricCanvas();
    const l = labelzDB.find(x => x.product_name === name);
    if(!l) return;
    
    _labelzCurrentEdit = l;
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
            lblzHistory = [];
            lblzHistoryProg = -1;
            saveLabelzHistory();
        });
    } else {
        fCanvas.clear();
        fCanvas.backgroundColor = '#ffffff';
        lblzHistory = [];
        lblzHistoryProg = -1;
        saveLabelzHistory();
    }
    
    document.getElementById('labelzDesignerModal').style.display = 'flex';
}

function closeLabelzDesigner() {
    document.getElementById('labelzDesignerModal').style.display = 'none';
    _labelzCurrentEdit = null;
}


// ============================================================
// SAVE & EXPORT
// ============================================================

window.saveLabelzDesign = async function() {
    await executeWithButtonAction('btnSaveLabelz', 'SAVING...', '✅ SAVED!', async () => {
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

        await loadLabelzData();
        if(typeof renderProductList === 'function') renderProductList();
        setTimeout(() => closeLabelzDesigner(), 1000);
    });
}

// EXPORT TO NATIVE PRINT
window.deleteLabelzDesign = async function() {
    await executeWithButtonAction('btnDeleteLabelz', 'DELETING...', '✅ DELETED!', async () => {
        const name = document.getElementById('labelzDesignerName').value.trim();
        if(!name) return alert('No label loaded to delete.');
        
        if(!confirm(`Are you sure you want to permanently delete the custom label '${name}'?`)) return;
        
        const { error: err1 } = await supabaseClient.from('label_designs').delete().eq('product_name', name);
        if (err1) throw err1;
        
        await supabaseClient.from('product_recipes').delete().eq('product_name', name);
        
        if(typeof productsDB !== 'undefined' && productsDB[name]) {
            delete productsDB[name];
        }
        if(typeof labelzDB !== 'undefined') {
            labelzDB = labelzDB.filter(x => x.product_name !== name);
        }
        
        await loadLabelzData();
        if(typeof renderProductList === 'function') renderProductList();
        if(typeof renderBarcodzGrid === 'function') renderBarcodzGrid(true);
        setTimeout(() => closeLabelzDesigner(), 1000);
    });
}

window.exportLabelzPDF = function() {
    if(!fCanvas) return;
    
    if(fCanvas.getObjects().length === 0) {
        alert("Cannot print an empty label. Please add elements first.");
        return;
    }

    fCanvas.discardActiveObject();
    fCanvas.renderAll();

    let sizeStr = document.getElementById('labelzDesignerSize').dataset.customSize || document.getElementById('labelzDesignerSize').value;
    let w = 2.25, h = 1.25;
    try {
        if (sizeStr.includes('{')) {
            let pObj = JSON.parse(sizeStr);
            w = pObj.w; h = pObj.h;
        } else if (sizeStr.includes('x')) {
            w = parseFloat(sizeStr.split('x')[0]);
            h = parseFloat(sizeStr.split('x')[1]);
        }
    } catch(e) { console.error(e); }
    
    const b64 = fCanvas.toDataURL({ format: 'png', multiplier: 1 });
    const printArea = document.getElementById('printableBarcodeArea');
    printArea.innerHTML = '';

    const orientation = document.getElementById('labelzOrientation') ? document.getElementById('labelzOrientation').value : 'Portrait';
    
    let pageW = w;
    let pageH = h;
    let imgStyle = '';

    if (orientation === 'Landscape' || orientation === '90') { // Check whatever value the select uses
        pageW = h;
        pageH = w;
        imgStyle = 'transform-origin: top left; transform: rotate(90deg) translateY(-100%);';
    }

    const img = new Image();
    img.onload = function() {
        printArea.innerHTML = window.safeHTML(`
            <style>@page { size: ${pageW}in ${pageH}in; margin: 0; }</style>
            <img src="${b64}" style="width: ${w}in; height: ${h}in; display: block; ${imgStyle}" />
        `);
        window.print();
    };
    img.src = b64;

    const cleanupPrint = function() {
        printArea.innerHTML = '';
        window.removeEventListener('afterprint', cleanupPrint);
    };
    window.addEventListener('afterprint', cleanupPrint);
}

// ============================================================
// BARCODZ CACHE INTEGRATION
// ============================================================
window.getLabelzForBarcodz = function() {
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

window.initLabelzPane = function() {
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

// ============================================================
// EVENT DELEGATOR REGISTRATION (LOCAL)
// ============================================================
document.addEventListener('change', (e) => {
    if (e.target.dataset.appChange === 'lblzUpdObj') {
        const key = e.target.dataset.key;
        let val = e.target.value;
        if (e.target.dataset.type === 'float') val = parseFloat(val);
        if (e.target.dataset.type === 'float100') val = parseFloat(val) / 100;
        if (typeof window.updObj === 'function') window.updObj(key, val);
    } else if (e.target.dataset.appChange === 'lblzUpdBc') {
        if (typeof window.updBc === 'function') window.updBc();
    } else if (e.target.dataset.appChange === 'lblzUpdObjDouble') {
        const key1 = e.target.dataset.key1;
        const key2 = e.target.dataset.key2;
        let val = e.target.value;
        if (typeof window.updObj === 'function') {
            window.updObj(key1, val);
            window.updObj(key2, val);
        }
    }
});

document.addEventListener('input', (e) => {
    if (e.target.dataset.appInput === 'lblzUpdObjSync') {
        const key = e.target.dataset.key;
        let val = e.target.value;
        
        const syncId = e.target.dataset.syncId;
        const syncSuffix = e.target.dataset.syncSuffix || '';
        if (syncId) {
            const syncEl = document.getElementById(syncId);
            if (syncEl) syncEl.innerText = val + syncSuffix;
        }

        if (e.target.dataset.type === 'float') val = parseFloat(val);
        if (e.target.dataset.type === 'float100') val = parseFloat(val) / 100;
        
        if (typeof window.updObj === 'function') window.updObj(key, val);
    } else if (e.target.dataset.appInput === 'lblzUpdObj') {
        const key = e.target.dataset.key;
        let val = e.target.value;
        if (typeof window.updObj === 'function') window.updObj(key, val);
    }
});

