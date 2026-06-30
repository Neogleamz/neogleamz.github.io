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
// Global hotfix for Fabric.js text baseline Chrome/Edge enum warning
(function() {
    if (typeof window !== 'undefined' && window.CanvasRenderingContext2D) {
        const descriptor = Object.getOwnPropertyDescriptor(window.CanvasRenderingContext2D.prototype, 'textBaseline');
        if (descriptor && descriptor.set) {
            const originalSet = descriptor.set;
            Object.defineProperty(window.CanvasRenderingContext2D.prototype, 'textBaseline', {
                set: function(value) {
                    originalSet.call(this, value === 'alphabetical' ? 'alphabetic' : value);
                },
                configurable: true,
                enumerable: true
            });
        }
    }
})();

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
    let json;
    try {
        json = fCanvas.toJSON(['isBarcode', 'barcodeOpts', 'isDynamic', 'templateText']);
    } catch (e) {
        console.warn("Could not serialize canvas for history", e);
        return;
    }
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
    fCanvas.loadFromJSON(jsonStr).then(function() {
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

async function loadLabelzData(preloadedData = null) {
    try {
        if (!window.uuidToNameMap || Object.keys(window.uuidToNameMap).length === 0) {
            setTimeout(() => loadLabelzData(preloadedData), 500);
            return;
        }

        let data = [];
        if (preloadedData) {
            data = preloadedData;
        } else {
            const { data: dbData, error } = await supabaseClient
                .from('label_designs')
                .select('*');
            if (error) throw error;
            data = dbData || [];
        }
        
        if (data) {
            data.forEach(row => {
                if (window.uuidToNameMap && row.product_item_uuid) {
                    let mappedName = window.uuidToNameMap[row.product_item_uuid];
                    if (mappedName) {
                        row.product_name = mappedName.startsWith('RECIPE:::') ? mappedName.replace('RECIPE:::', '') : mappedName;
                    }
                }
                if (!row.product_name) row.product_name = 'Unnamed Label';
            });
        }
        
        // Merge labels from productsDB that don't have a design yet
        if (typeof productsDB !== 'undefined') {
            Object.keys(productsDB).forEach(pName => {
                if (productsDB[pName].is_label) {
                    const existing = data.find(r => r.product_name === pName);
                    if (!existing) {
                        data.push({
                            product_item_uuid: window.uuidMap ? window.uuidMap['RECIPE:::' + pName] : null,
                            product_name: pName,
                            emoji: productsDB[pName].label_emoji || '🏷️',
                            label_size: '2.25x1.25',
                            layout_json: null
                        });
                    }
                }
            });
        }
        
        data.sort((a,b) => (a.product_name||'').localeCompare(b.product_name||''));
        
        labelzDB = data;
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

        const filtered = labelzDB.filter(l => (l.product_name || 'Unnamed Label').toLowerCase().includes(search));

        if (filtered.length === 0) {
            grid.innerHTML = window.safeHTML(`
                <div style="text-align:center;padding:60px;color:var(--text-muted);font-style:italic;">
                    <div style="font-size:48px;margin-bottom:12px;">🏷️</div>
                    ${search ? 'No labels match your search.' : 'No custom labels yet. Click <strong>+ NEW LABEL</strong> to create your first one.'}
                </div>
            `);
            return;
        }

        // Group items by Type
        const grouped = {};
        filtered.forEach(label => {
            // Intelligently fallback to parent product context for display
            let displayContext = label.product_name;
            if (label.layout_json && label.layout_json.defaultContext) {
                displayContext = label.layout_json.defaultContext;
            } else if (label.product_name && (label.product_name || "").startsWith("Label - ")) {
                displayContext = label.product_name.replace("Label - ", "");
            }

            let type = 'Custom Labelz';
            let icon = label.emoji || '🏷️';
            
            if (typeof productsDB !== 'undefined' && productsDB[displayContext]) {
                const prod = productsDB[displayContext];
                if (prod.is_subassembly) {
                    type = 'Sub-Assembly';
                    icon = '⚙️';
                } else if (prod.is_3d_print) {
                    type = '3D Print';
                    icon = '🖨️';
                } else if (!prod.is_label) {
                    type = 'Retail Product';
                    icon = '📦';
                }
            } else if (typeof inventoryDB !== 'undefined' && inventoryDB[displayContext] && !(displayContext || "").startsWith("RECIPE:::")) {
                type = 'Raw Material';
                icon = '🔩';
            }
            
            label._computedType = type;
            label._computedIcon = icon;
            label._displayContext = displayContext;
            
            if(!grouped[type]) grouped[type] = [];
            grouped[type].push(label);
        });

        const typeOrder = ['Custom Labelz', 'Retail Product', 'Sub-Assembly', '3D Print', 'Raw Material'];
        const groupsToRender = Object.keys(grouped).sort((a,b) => typeOrder.indexOf(a) - typeOrder.indexOf(b));

        let savedState = null;
        try { savedState = JSON.parse(localStorage.getItem('labelzGroupState')); } catch(e){ console.error(e); }
        window.labelzGroupState = window.labelzGroupState || savedState || {};

        let html = '';

        groupsToRender.forEach(type => {
            let isOpen = window.labelzGroupState[type] !== false;
            html += `
            <details ${isOpen ? 'open' : ''} class="labelz-group-details" data-type="${type}" style="margin-bottom:20px; background:rgba(0,0,0,0.1); border-radius:12px; border:1px solid var(--border-color); grid-column: 1 / -1; width:100%;">
                <summary style="padding:14px 20px; cursor:pointer; font-weight:bold; font-size:14px; text-transform:uppercase; color:var(--text-heading); list-style:none; display:flex; align-items:center; border-bottom:1px solid var(--border-color); background:var(--bg-panel); border-radius:12px 12px 0 0;">
                    <span style="font-size:18px; margin-right:10px;">${grouped[type][0]._computedIcon}</span> 
                    ${type.endsWith('z') ? type : type + 's'} <span style="margin-left:10px; background:var(--bg-input); padding:2px 8px; border-radius:12px; font-size:10px; color:var(--text-muted);">${grouped[type].length}</span>
                </summary>
                <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(240px, 1fr)); gap:14px; padding:16px;">
            `;

            grouped[type].forEach(label => {
                // Correct FGI Stock Calculation from inventoryDB
                const invKey = 'RECIPE:::' + label.product_name;
                const invData = typeof inventoryDB !== 'undefined' ? inventoryDB[invKey] : null;
                let stockQty = 0;
                if(invData) {
                    let b = parseFloat(invData.produced_qty) || 0;
                    let pb = parseFloat(invData.prototype_produced_qty) || 0;
                    let sold = parseFloat(invData.sold_qty) || 0;
                    let c_prod = parseFloat(invData.production_consumed_qty) || 0;
                    let c_proto = parseFloat(invData.prototype_consumed_qty) || 0;
                    let scrap = parseFloat(invData.scrap_qty) || 0;
                    let adj = parseFloat(invData.manual_adjustment) || 0;
                    stockQty = b - sold - c_prod - scrap + adj - Math.max(0, c_proto - pb);
                }
                
                const lowThreshold = 10;
                const stockColor = stockQty === 0 ? '#ef4444' : stockQty < lowThreshold ? '#f59e0b' : '#10b981';
                const stockBg = stockQty === 0 ? 'rgba(239,68,68,0.1)' : stockQty < lowThreshold ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)';

                const cleanName = label.product_name.replace(/'/g,"\\'").replace(/"/g,'&quot;');
                const safeEmoji = label._computedIcon;
                const pillText = label._computedType;

                // Intelligently fallback to parent product context for display
                let displayContext = label.product_name;
                if (label.layout_json && label.layout_json.defaultContext) {
                    displayContext = label.layout_json.defaultContext;
                } else if (label.product_name && (label.product_name || "").startsWith("Label - ")) {
                    displayContext = label.product_name.replace("Label - ", "");
                }

                html += `
                    <div class="hover-border-primary" style="background:var(--bg-panel); border:1px solid var(--border-color); border-radius:8px; padding:10px; display:flex; flex-direction:column; box-shadow:0 2px 4px rgba(0,0,0,0.1); transition:border-color 0.2s;">
                        
                        <div style="display:grid; grid-template-columns:auto 1fr auto; align-items:center; margin-bottom:8px; gap:8px;">
                            <!-- Emoji Top Left -->
                            <div style="font-size:18px; line-height:1; display:flex; align-items:center; justify-content:center; width:24px; height:24px; background:var(--bg-input); border-radius:6px;">${safeEmoji}</div>
                            
                            <!-- Type Pills Centered -->
                            <div style="display:flex; justify-content:center; align-items:center; height:100%; gap:4px;">
                                <span style="display:inline-block; font-size:8px; font-weight:800; background:rgba(14,165,233,0.1); color:#0ea5e9; padding:2px 6px; border-radius:8px; text-transform:uppercase; letter-spacing:0.5px; line-height:1.2;">${pillText}</span>
                                <span style="display:inline-block; font-size:8px; font-weight:800; background:${stockBg}; color:${stockColor}; padding:2px 6px; border-radius:8px; text-transform:uppercase; letter-spacing:0.5px; line-height:1.2;">STOCK: ${stockQty}</span>
                            </div>
                            
                            <!-- Spool Button Top Right -->
                            <button class="btn-white" data-click="click_addLabelzToSpool" data-name="${cleanName}" data-emoji="${safeEmoji}" style="padding:4px 8px; font-size:10px;"><i style="margin-right:2px; font-style:normal;">➕</i> Spool</button>
                        </div>
                        
                        <!-- Content & Edit Base -->
                        <div style="padding-top:6px; border-top:1px solid var(--border-color); text-align:center; display:flex; flex-direction:column; flex:1;">
                            <div style="font-size:13px; font-weight:900; color:var(--text-heading); margin-bottom:2px; line-height:1.2; word-break:break-word; min-height:15px; display:flex; justify-content:center; align-items:center; flex:1;">${label._displayContext}</div>
                            <div style="font-size:11px; font-family:monospace; color:var(--text-main); padding:2px 0 0 0; word-break:break-all;">SKU: <span style="color:#38bdf8; font-weight:bold;">${typeof window.getItemSKUValue === 'function' ? window.getItemSKUValue(displayContext) : ''}</span></div>
                            <div style="font-size:10px; font-family:monospace; color:var(--text-muted); padding-bottom:8px;">Barcode: <span style="color:#f97316; font-weight:bold;">${typeof window.getItemBarcodeValue === 'function' ? window.getItemBarcodeValue(displayContext) : ''}</span></div>
                            
                            <button class="btn-orange" data-click="click_openEditLabelModal" data-name="${cleanName}" style="width:100%; padding:4px 0; font-size:10px; display:flex; justify-content:center; align-items:center;"><i style="margin-right:4px; font-style:normal;">✏️</i> Edit Label</button>
                        </div>
                    </div>
                `;
            });
            
            html += `
                </div>
            </details>
            `;
        });

        grid.style.display = 'block';
        grid.innerHTML = window.safeHTML ? window.safeHTML(html) : html;
        
        // Post-render bindings for details toggle
        grid.querySelectorAll('.labelz-group-details').forEach(el => {
            el.addEventListener('toggle', function() {
                const type = this.getAttribute('data-type');
                window.labelzGroupState[type] = this.open;
                localStorage.setItem('labelzGroupState', JSON.stringify(window.labelzGroupState));
            });
        });
    } catch(e) { sysLog('Labelz grid render error: ' + e.message, true); }
}

// ============================================================
// CANVAS INITIALIZATION & SIZING
// ============================================================

function initFabricCanvas() {
    if (fCanvas) return;
    const canvasEl = document.getElementById('labelzFabricCanvas');
    fCanvas = new fabric.Canvas(canvasEl, { preserveObjectStacking: true });
    fCanvas.backgroundColor = '#ffffff'; // Set default solid white background

    fCanvas.on('selection:created', onCanvasSelection);
    fCanvas.on('selection:updated', onCanvasSelection);
    fCanvas.on('selection:cleared', onCanvasSelectionCleared);
    
    // Live update the properties panel when an object is being dragged or resized
    const updateProps = (e) => onCanvasSelection(e);
    fCanvas.on('object:moving', updateProps);
    fCanvas.on('object:scaling', (e) => {
        const obj = e.target;
        if (obj.type === 'textbox' || obj.type === 'i-text' || obj.type === 'text') {
            const newFontSize = obj.fontSize * obj.scaleY;
            obj.set({
                fontSize: newFontSize,
                width: obj.width * obj.scaleX / obj.scaleY,
                scaleX: 1,
                scaleY: 1
            });
        }
        updateProps(e);
    });
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
    if (sizeStr) {
        try { pObj = JSON.parse(sizeStr); } catch(e) { console.error("Canvas Size Parse Error:", e.message); }
    }
    
    let pxWidth = pObj.w * PPI;
    let pxHeight = pObj.h * PPI;
    
    // Store active metadata back so print engine knows
    document.getElementById('labelzDesignerSize').dataset.customSize = `${pObj.w}x${pObj.h}`;



    fCanvas.setDimensions({ width: pxWidth, height: pxHeight });
    
    // Resize container visually via CSS so it fits nicely
    const _wrapper = document.getElementById('labelzCanvasWrapper');
    const _container = document.getElementById('labelzCanvasContainer');
    
    // Reset zoom
    currentZoom = 1;
    if (typeof window.updateLabelCanvasOrientation === 'function') {
        window.updateLabelCanvasOrientation();
    } else {
        zoomLabelzCanvas('fit');
    }
}

window.updateLabelCanvasOrientation = function() {
    const orientation = document.getElementById('labelzOrientation') ? document.getElementById('labelzOrientation').value : 'Portrait';
    const container = document.getElementById('labelzCanvasContainer');
    
    if (container) {
        if (orientation === 'Landscape' || orientation === '90') {
            container.style.transform = 'translate(-50%, -50%) rotate(90deg)';
        } else {
            container.style.transform = 'translate(-50%, -50%) rotate(0deg)';
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
        if(currentZoom > 1) currentZoom = 1; // cap max initial fit zoom to 100%
    } else {
        currentZoom += delta;
        if(currentZoom < 0.2) currentZoom = 0.2;
        if(currentZoom > 5) currentZoom = 5;
    }
    
    fCanvas.setDimensions({ width: fCanvas.width * currentZoom + 'px', height: fCanvas.height * currentZoom + 'px' }, { cssOnly: true });
    
    // Update Rotator Box to fix Flex Layout bounds
    const rotator = document.getElementById('labelzCanvasRotatorBox');
    if (rotator) {
        const orientation = document.getElementById('labelzOrientation') ? document.getElementById('labelzOrientation').value : 'Portrait';
        if (orientation === 'Landscape' || orientation === '90') {
            rotator.style.width = (fCanvas.height * currentZoom) + 'px';
            rotator.style.height = (fCanvas.width * currentZoom) + 'px';
        } else {
            rotator.style.width = (fCanvas.width * currentZoom) + 'px';
            rotator.style.height = (fCanvas.height * currentZoom) + 'px';
        }
    }
    
    // Force a complete repaint of the canvas buffer to prevent background transparency drops
    if (fCanvas) fCanvas.renderAll();
    
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
        fabric.Image.fromURL(data).then(function(img){
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
                fabric.Image.fromURL(data).then(function(img){
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


function addLabelzBarcode(codeStr = '1234567890', format = 'code128', templateText = null) {
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
        
        fabric.Image.fromURL(tmpCanvas.toDataURL('image/png')).then(function(img) {
            img.set({
                left: fCanvas.width / 2, top: fCanvas.height / 2,
                originX: 'center', originY: 'center',
                isBarcode: true,
                templateText: templateText,
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
        fabric.Image.fromURL(tmpCanvas.toDataURL('image/png')).then(function(img) {
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
        
        fabric.Image.fromURL(tmpCanvas.toDataURL('image/png')).then(function(img) {
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
        
        obj.setSrc(tmpCanvas.toDataURL('image/png')).then(function() {
            obj.set({ barcodeOpts: { bcid: format, text: text }});
            // Re-apply physical target bounds if this object was locked to a template grid
            if (obj.targetWPx && obj.width) {
                obj.scaleToWidth(obj.targetWPx);
            }
            if (obj.targetHPx && obj.height && obj.getScaledHeight() !== obj.targetHPx) {
                obj.set({ scaleX: obj.targetWPx / obj.width, scaleY: obj.targetHPx / obj.height });
            }
            fCanvas.renderAll();
        });
    } catch(e) {
        sysLog('Fabric Barcode Regen Error: ' + e.message, true);
        // Draw visual error indicator
        tmpCanvas.width = 150; tmpCanvas.height = 30;
        const ctx = tmpCanvas.getContext('2d');
        ctx.fillStyle = '#ff0000'; ctx.fillRect(0,0,150,30);
        ctx.fillStyle = '#ffffff'; ctx.font = '12px Arial'; ctx.textAlign = 'center'; ctx.fillText('INVALID FORMAT', 75, 20);
        obj.setSrc(tmpCanvas.toDataURL('image/png')).then(function() {
            obj.set({ barcodeOpts: { bcid: format, text: text }});
            if (obj.targetWPx && obj.width) {
                obj.scaleToWidth(obj.targetWPx);
            }
            if (obj.targetHPx && obj.height && obj.getScaledHeight() !== obj.targetHPx) {
                obj.set({ scaleX: obj.targetWPx / obj.width, scaleY: obj.targetHPx / obj.height });
            }
            fCanvas.renderAll();
        });
        alert('Format Constraint Violation: \n' + e.message);
    }
}

// ============================================================
// CANVAS SELECTION & PROPERTIES PANEL
// ============================================================

window.renderLabelzGrid = renderLabelzGrid;
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
            <div><label style="font-size:10px;">X Coord</label><input type="number" data-app-change="lblzUpdObj" data-key="left" data-type="float" value="${Math.round(obj.left)}" style="width:100%; padding:4px; font-size:11px; background:var(--bg-input); border:1px solid var(--border-color); color:white;"></div>
            <div><label style="font-size:10px;">Y</label><input type="number" data-app-change="lblzUpdObj" data-key="top" data-type="float" value="${Math.round(obj.top)}" style="width:100%; padding:4px; font-size:11px; background:var(--bg-input); border:1px solid var(--border-color); color:white;"></div>
            <div><label style="font-size:10px;">Scale W%</label><input type="number" data-app-change="lblzUpdObj" data-key="scaleX" data-type="float100" value="${Math.round(obj.scaleX*100)}" style="width:100%; padding:4px; font-size:11px; background:var(--bg-input); border:1px solid var(--border-color); color:white;"></div>
            <div><label style="font-size:10px;">Scale H%</label><input type="number" data-app-change="lblzUpdObj" data-key="scaleY" data-type="float100" value="${Math.round(obj.scaleY*100)}" style="width:100%; padding:4px; font-size:11px; background:var(--bg-input); border:1px solid var(--border-color); color:white;"></div>
        </div>
        <div>
            <label style="font-size:10px; display:block; margin-bottom:2px;">Rotation</label>
            <div style="display:flex; align-items:center; gap:8px;">
                <input type="range" id="lblzRotSlider" min="0" max="360" value="${Math.round(obj.angle || 0)}" data-app-input="lblzUpdObjSync" data-key="angle" data-type="float" data-sync-id="lblzRotInput" style="flex:1; margin:0;">
                <div style="display:flex; align-items:center; gap:2px;">
                    <input type="number" id="lblzRotInput" min="0" max="360" value="${Math.round(obj.angle || 0)}" data-app-input="lblzUpdObjSync" data-key="angle" data-type="float" data-sync-id="lblzRotSlider" style="width:50px; padding:4px; font-size:11px; background:var(--bg-input); border:1px solid var(--border-color); color:white; text-align:right;">
                    <span style="font-size:11px; color:var(--text-muted);">°</span>
                </div>
            </div>
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
    if(obj) { 
        if (key === 'text') obj.styles = {};
        obj.set(key, val); 
        fCanvas.renderAll(); 
    }
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
                    const labelName = c.neoName && c.neoName !== '-' ? c.neoName : c.itemName;
                    results.push({ name: labelName, spec: c.spec||'Raw Mat', source: 'Catalog', val: getItemBarcodeValue(labelName), cogs: c.avgUnitCost||0 });
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
        obj.styles = {};
        obj.set({text: name});
        fCanvas.renderAll();
        saveLabelzHistory();
        onCanvasSelection({target: obj}); // refresh properties panel
    }
};

window.populateLabelzPreviewContextDropdown = function() {
    const sel = document.getElementById('labelzDesignerPreviewContext');
    if (!sel) return;
    
    let html = '<option value="">-- No Preview Context --</option>';
    if (typeof productsDB !== 'undefined') {
        let sortedProducts = Object.keys(productsDB).sort((a,b) => { 
            let oa = productsDB[a]?.is_3d_print ? 3 : (isSubassemblyDB[a] ? 2 : 1); 
            let ob = productsDB[b]?.is_3d_print ? 3 : (isSubassemblyDB[b] ? 2 : 1); 
            return oa !== ob ? oa - ob : a.localeCompare(b); 
        });
        
        let retailProds = sortedProducts.filter(p => !isSubassemblyDB[p] && (!productsDB[p] || !productsDB[p].is_3d_print) && (!productsDB[p] || !productsDB[p].is_label));
        let subProds = sortedProducts.filter(p => isSubassemblyDB[p] && (!productsDB[p] || !productsDB[p].is_3d_print) && (!productsDB[p] || !productsDB[p].is_label));
        let printProds = sortedProducts.filter(p => productsDB[p] && productsDB[p].is_3d_print && !productsDB[p].is_label);
        let labelProds = sortedProducts.filter(p => productsDB[p] && productsDB[p].is_label);
        
        const mapOpts = (arr, char) => arr.map(p => `<option value="${String(p).replace(/"/g, '&quot;')}">${char} ${p}</option>`).join('');

        if (retailProds.length) html += `<optgroup label="📦 RETAIL PRODUCTS">${mapOpts(retailProds, '📦')}</optgroup>`;
        if (subProds.length) html += `<optgroup label="⚙️ SUB-ASSEMBLIES">${mapOpts(subProds, '⚙️')}</optgroup>`;
        if (printProds.length) html += `<optgroup label="🖨️ 3D PRINTS">${mapOpts(printProds, '🖨️')}</optgroup>`;
        if (labelProds.length) html += `<optgroup label="🏷️ CUSTOM LABELS">${mapOpts(labelProds, '🏷️')}</optgroup>`;
    }
    sel.innerHTML = window.safeHTML ? window.safeHTML(html) : html;
    sel.onchange = function() {
        if (typeof window.applyLabelzPreviewContext === 'function') {
            window.applyLabelzPreviewContext();
        }
    };
};

function getLabelzPreviewContextValues() {
    const sel = document.getElementById('labelzDesignerPreviewContext');
    let pName = sel ? sel.value : '';
    if (!pName) return { name: 'Product Name', sku: 'SKU-PREVIEW', barcode: '123456789' };
    
    let sku = typeof getItemSKUValue === 'function' ? getItemSKUValue(pName) : 'SKU-PREVIEW';
    let bcVal = typeof getItemBarcodeValue === 'function' ? getItemBarcodeValue(pName, true) : '123456789';
    return { name: pName, sku: sku, barcode: bcVal };
}

window.applyLabelzPreviewContext = function() {
    if(!fCanvas) return;
    const ctx = getLabelzPreviewContextValues();
    fCanvas.getObjects().forEach(obj => {
        if(obj.templateText) {
            let res = obj.templateText;
            res = res.replace(/\{\{PRODUCT_NAME\}\}/g, ctx.name);
            res = res.replace(/\{\{SKU\}\}/g, ctx.sku);
            res = res.replace(/\{\{BARCODE\}\}/g, ctx.barcode);
            
            if(obj.isBarcode) {
                let f = obj.barcodeOpts ? obj.barcodeOpts.bcid : 'code128';
                regenerateBarcodeImage(obj, res, f, obj.templateText);
            } else {
                obj.styles = {};
                obj.set({text: res});
            }
        }
    });
    fCanvas.renderAll();
};

window.click_labelzAddProductName = function() {
    const ctx = getLabelzPreviewContextValues();
    if(typeof disableLabelzDrawingMode === 'function') disableLabelzDrawingMode();
    const text = new fabric.Textbox(ctx.name, {
        left: fCanvas.width / 2, top: fCanvas.height / 2,
        originX: 'center', originY: 'center',
        width: 150, fontSize: 14, fontFamily: 'Arial', fill: '#000000',
        editable: true, isDynamic: false, fontWeight: 'bold', textAlign: 'center',
        templateText: '{{PRODUCT_NAME}}'
    });
    fCanvas.add(text);
    fCanvas.setActiveObject(text);
};

window.click_labelzAddSku = function() {
    const ctx = getLabelzPreviewContextValues();
    if(typeof disableLabelzDrawingMode === 'function') disableLabelzDrawingMode();
    const text = new fabric.Textbox(ctx.sku, {
        left: fCanvas.width / 2, top: fCanvas.height / 2 + 30,
        originX: 'center', originY: 'center',
        width: 150, fontSize: 10, fontFamily: 'Arial', fill: '#000000',
        editable: true, isDynamic: false, textAlign: 'center',
        templateText: '{{SKU}}'
    });
    fCanvas.add(text);
    fCanvas.setActiveObject(text);
};

window.click_labelzAddBarcodeContext = function() {
    const ctx = getLabelzPreviewContextValues();
    if(typeof disableLabelzDrawingMode === 'function') disableLabelzDrawingMode();
    if(typeof addLabelzBarcode === 'function') {
        addLabelzBarcode(ctx.barcode, 'code128', '{{BARCODE}}');
    }
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
    window.populateLabelzPreviewContextDropdown();
    
    const mainTplSel = document.getElementById('labelzTemplateSelect');
    const mainSizeSel = document.getElementById('labelzSizeSelect');
    
    let desTplSel = document.getElementById('labelzDesignerTemplateSelect');
    if (mainTplSel && desTplSel) desTplSel.value = mainTplSel.value;
    
    let sizeSel = document.getElementById('labelzDesignerSize');
    if (mainSizeSel && sizeSel) {
        sizeSel.value = mainSizeSel.value;
    } else if(sizeSel && sizeSel.options && sizeSel.options.length > 0) { 
        sizeSel.selectedIndex = 0; 
    }
    
    let tplIdToLoad = mainTplSel ? mainTplSel.value : "";
    
    // User requested "Default" to act as a clone of "Standard Template"
    if (!tplIdToLoad) {
        let std = window.ldState && window.ldState.templates ? window.ldState.templates.find(t => t.name.toLowerCase().includes('standard')) : null;
        if (std) tplIdToLoad = std.id;
    }
    
    if (desTplSel && tplIdToLoad) {
        const optExists = Array.from(desTplSel.options).some(o => o.value === tplIdToLoad);
        if (optExists) desTplSel.value = tplIdToLoad;
    }
    
    updateLabelCanvasSize();
    fCanvas.clear();
    fCanvas.backgroundColor = '#ffffff';
    document.getElementById('labelzBgColor').value = '#ffffff';
    
    if (tplIdToLoad && typeof window.click_labelzLoadTemplate === 'function') {
        window.click_labelzLoadTemplate(tplIdToLoad);
    } else {
        fCanvas.renderAll();
    }
    
    lblzHistory = [];
    lblzHistoryProg = -1;
    saveLabelzHistory();
}

window.click_labelzLoadTemplate = function(id) {
    if (!id) return;
    if (!window.ldState || !window.ldState.templates) return;
    const tpl = window.ldState.templates.find(t => t.id === id);
    if (!tpl) return;
    
    // Set size to match template if possible
    let _targetSizeStr = `${tpl.widthIn}x${tpl.heightIn}`;
    let sizeSel = document.getElementById('labelzDesignerSize');
    let matched = false;
    if (sizeSel && sizeSel.options) {
        for (let opt of sizeSel.options) {
            try {
                let oObj = JSON.parse(opt.value);
                if (oObj.w === tpl.widthIn && oObj.h === tpl.heightIn) {
                    sizeSel.value = opt.value;
                    matched = true;
                    break;
                }
            } catch(_e) {
                // ignore parsing errors on dropdown options
            }
        }
        if(!matched && sizeSel.options.length > 0) sizeSel.selectedIndex = 0;
    }
    updateLabelCanvasSize();
    
    fCanvas.clear();
    fCanvas.backgroundColor = '#ffffff';
    document.getElementById('labelzBgColor').value = '#ffffff';
    
    // Inject Elements translated from Barcodz
    tpl.elements.forEach(el => {
        let wPx = (el.width || 1.5) * PPI;
        let hPx = (el.height || 0.3) * PPI;
        let leftPx = (el.x * PPI) + (wPx / 2); // Center X
        let topPx = (el.y * PPI) + (hPx / 2); // Center Y
        
        let hasTemplate = el.value && el.value.includes('{{');
        
        if (el.type === 'text') {
            let exactFontSize = (el.fontSize || 12) * (300 / 72); // pt to px exact conversion
            let tObj = new fabric.Textbox(el.value, {
                left: leftPx, top: topPx,
                originX: 'center', originY: 'center',
                width: wPx,
                fontSize: exactFontSize,
                fontWeight: el.fontWeight || 'normal',
                textAlign: el.textAlign || 'center',
                fontFamily: 'Arial',
                fill: el.color || '#000000',
                isDynamic: hasTemplate,
                templateText: hasTemplate ? el.value : null
            });
            fCanvas.add(tObj);
        } else if (el.type === 'barcode' || el.type === 'qrcode') {
            let bcid = el.bcid || (el.type === 'qrcode' ? 'qrcode' : 'code128');
            
            // Generate the image immediately so we can scale it
            const tmpCanvas = document.getElementById('labelzBwipjsRenderer');
            try {
                let drawOpts = {
                    bcid: bcid,
                    text: el.value || '123456789',
                    scale: 3,
                    includetext: bcid !== 'qrcode',
                    textxalign: 'center'
                };
                if (bcid !== 'qrcode') drawOpts.height = 10;
                bwipjs.toCanvas('labelzBwipjsRenderer', drawOpts);
                
                fabric.Image.fromURL(tmpCanvas.toDataURL('image/png')).then(function(img) {
                    img.set({
                        left: leftPx, top: topPx,
                        originX: 'center', originY: 'center',
                        isBarcode: true,
                        isDynamic: hasTemplate,
                        templateText: hasTemplate ? el.value : null,
                        barcodeOpts: { text: el.value, bcid: bcid },
                        targetWPx: wPx,
                        targetHPx: hPx
                    });
                    
                    // Force the image to match the Barcodz box exactly
                    img.scaleToWidth(wPx);
                    if (hPx > 0 && img.getScaledHeight() !== hPx) {
                        img.set({ scaleX: wPx / img.width, scaleY: hPx / img.height });
                    }
                    
                    fCanvas.add(img);
                    
                    // We must apply preview context AFTER async load if we need to replace it
                    if (typeof window.applyLabelzPreviewContext === 'function') {
                        window.applyLabelzPreviewContext();
                    } else {
                        fCanvas.renderAll();
                    }
                });
            } catch(e) {
                console.error("Barcode gen error in template load", e);
            }
        }
    });
    
    if (typeof window.applyLabelzPreviewContext === 'function') {
        window.applyLabelzPreviewContext();
    } else {
        fCanvas.renderAll();
    }
    saveLabelzHistory();
};

window.openEditLabelModal = function(name) {
    initFabricCanvas();
    const l = labelzDB.find(x => x.product_name === name);
    if(!l) return;
    
    _labelzCurrentEdit = l;
    document.getElementById('labelzDesignerName').value = name;
    assignLabelzDesignerEmoji(l.emoji || '🏷️');
    
    document.getElementById('labelzDesignerModal').style.display = 'flex';
    window.populateLabelzPreviewContextDropdown();
    const sel = document.getElementById('labelzDesignerPreviewContext');
    if (sel) {
        // Intelligently fallback to the parent product if it's an auto-created label
        let defaultCtx = name;
        if (l.layout_json && l.layout_json.defaultContext) {
            defaultCtx = l.layout_json.defaultContext;
        } else if (name.startsWith("Label - ")) {
            defaultCtx = name.replace("Label - ", "");
        }
        
        // Ensure the option actually exists in the dropdown before setting it
        const optionExists = Array.from(sel.options).some(opt => opt.value === defaultCtx);
        sel.value = optionExists ? defaultCtx : name;
    }
    
    const desTplSel = document.getElementById('labelzDesignerTemplateSelect');
    
    const selSize = document.getElementById('labelzDesignerSize');
    if (selSize) {
        const sizeOptionExists = Array.from(selSize.options).some(opt => opt.value === l.label_size);
        if (sizeOptionExists) {
            selSize.value = l.label_size;
        } else {
            // Fallback to what they had picked on the labelz screen
            const mainSizeSel = document.getElementById('labelzSizeSelect');
            if (mainSizeSel && mainSizeSel.value) {
                selSize.value = mainSizeSel.value;
            } else if (selSize.options.length > 0) {
                selSize.selectedIndex = 0;
            }
        }
    } else {
        document.getElementById('labelzDesignerSize').value = l.label_size || '2.25x1.25';
    }
    
    // Resolve the effective template from the main screen — Default now carries Standard Template's UUID
    const _editMainTpl = document.getElementById('labelzTemplateSelect');
    const _editTplId = _editMainTpl ? _editMainTpl.value : '';
    const _editTplValid = _editTplId && window.ldState && window.ldState.templates && window.ldState.templates.some(t => t.id === _editTplId);

    updateLabelCanvasSize();

    if (_editTplValid) {
        // Template is selected (or Default = Standard Template): apply it to canvas
        if (desTplSel) desTplSel.value = _editTplId;
        window.click_labelzLoadTemplate(_editTplId);
        lblzHistory = [];
        lblzHistoryProg = -1;
        saveLabelzHistory();
    } else if(l.layout_json) {
        if (desTplSel) desTplSel.value = ""; // No template: load the label's saved custom design
        let safeJson = l.layout_json;
        try {
            if (typeof l.layout_json === 'string') {
                safeJson = JSON.parse(l.layout_json);
            } else {
                safeJson = JSON.parse(JSON.stringify(l.layout_json));
            }
            if (safeJson && safeJson.objects) {
                safeJson.objects.forEach(obj => {
                    if (obj.type === 'textbox' || obj.type === 'i-text' || obj.type === 'text') {
                        obj.styles = {};
                    }
                });
            }
        } catch(e) { console.error("JSON sanitize error", e); }

        fCanvas.loadFromJSON(safeJson).then(function() {
            if (typeof window.applyLabelzPreviewContext === 'function') {
                window.applyLabelzPreviewContext();
            } else {
                fCanvas.renderAll();
            }
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
        document.getElementById('labelzBgColor').value = '#ffffff';
        
        // It's a completely un-designed auto-generated label! Inherit template from main screen
        const mainTplSel = document.getElementById('labelzTemplateSelect');
        let tplIdToLoad = mainTplSel ? mainTplSel.value : "";
        
        // User requested "Default" to act as a clone of "Standard Template"
        if (!tplIdToLoad) {
            let std = window.ldState && window.ldState.templates ? window.ldState.templates.find(t => t.name.toLowerCase().includes('standard')) : null;
            if (std) tplIdToLoad = std.id;
        }
        
        if (desTplSel && tplIdToLoad) {
            const optExists = Array.from(desTplSel.options).some(o => o.value === tplIdToLoad);
            if (optExists) desTplSel.value = tplIdToLoad;
        }
        
        if (tplIdToLoad && typeof window.click_labelzLoadTemplate === 'function') {
            window.click_labelzLoadTemplate(tplIdToLoad);
        } else {
            fCanvas.renderAll();
        }
        
        lblzHistory = [];
        lblzHistoryProg = -1;
        saveLabelzHistory();
    }
    
    document.getElementById('labelzDesignerModal').style.display = 'flex';
}

function closeLabelzDesigner() {
    document.getElementById('labelzDesignerModal').style.display = 'none';
    _labelzCurrentEdit = null;
    if (typeof fCanvas !== 'undefined' && fCanvas) fCanvas.clear();
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
        const layout = fCanvas.toJSON(['isBarcode', 'barcodeOpts', 'isDynamic', 'templateText']); // keep custom props

        let pUuid = window.uuidMap['RECIPE:::' + name];
        if (!pUuid) throw new Error("UUID not found for label " + name);

        const payload = {
            product_item_uuid: pUuid,
            emoji,
            label_size: size,
            layout_json: layout,
            updated_at: new Date().toISOString()
        };

        const { data: existingLabel } = await supabaseClient.from('label_designs')
            .select('id').eq('product_item_uuid', pUuid).maybeSingle();
            
        if (existingLabel && existingLabel.id) {
            const { error } = await supabaseClient.from('label_designs')
                .update(payload).eq('id', existingLabel.id);
            if (error) throw error;
        } else {
            const { error } = await supabaseClient.from('label_designs')
                .insert([payload]);
            if (error) throw error;
        }
        
        // Ensure product_recipes has is_label
        const { error: prErr } = await supabaseClient.from('product_recipes').upsert({
            product_item_uuid: pUuid,
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
        }, { onConflict: 'product_item_uuid', ignoreDuplicates: false });
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
        
        let pUuid = window.uuidMap['RECIPE:::' + name];
        if (!pUuid) throw new Error("UUID not found for label " + name);
        
        const { error: err1 } = await supabaseClient.from('label_designs').delete().eq('product_item_uuid', pUuid);
        if (err1) throw err1;
        
        await supabaseClient.from('product_recipes').delete().eq('product_item_uuid', pUuid);
        
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

    if (window.ldState && window.ldState.activeTemplateId && typeof window.click_ldPrintState === 'function') {
        const name = document.getElementById('labelzDesignerName').value.trim() || 'Labelz Preview';
        const slug = name.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '').toUpperCase().substring(0, 30);
        
        const oldSpool = window.barcodzSpoolQueue ? [...window.barcodzSpoolQueue] : [];
        window.barcodzSpoolQueue = [{ name: name, slug: slug, qty: 1, type: 'Custom Labelz' }];
        
        window.click_ldPrintState();
        
        setTimeout(() => { window.barcodzSpoolQueue = oldSpool; }, 200);
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

    const img = new window.Image();
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
        slug: typeof window.getItemBarcodeValue === 'function' ? window.getItemBarcodeValue(l.product_name) : l.product_name.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '').toUpperCase().substring(0, 30),
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

// ============================================================
// SPOOL INTEGRATION
// ============================================================
window.addLabelzToSpool = function(name, emoji) {
    if(typeof addBarcodzToSpool === 'function') {
        let displayContext = name;
        if (typeof labelzDB !== 'undefined') {
            const l = labelzDB.find(x => x.product_name === name);
            if (l) {
                if (l.layout_json && l.layout_json.defaultContext) {
                    displayContext = l.layout_json.defaultContext;
                } else if (name.startsWith("Label - ")) {
                    displayContext = name.replace("Label - ", "");
                }
            }
        }
        
        const slug = typeof window.getItemBarcodeValue === 'function' ? window.getItemBarcodeValue(displayContext) : displayContext.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '').toUpperCase().substring(0, 30);
        addBarcodzToSpool(displayContext, slug, emoji || '🏷️', 'Custom Labelz', name);
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
            if (syncEl) {
                if (syncEl.tagName === 'INPUT') {
                    syncEl.value = val;
                } else {
                    syncEl.innerText = val + syncSuffix;
                }
            }
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

