// ============================================================
// LABEL DESIGNER (STATE-DRIVEN DOM / CSS PHYSICAL UNITS)
// ============================================================

window.ldState = {
    elements: [],
    selectedId: null,
    widthIn: 2.25,
    heightIn: 1.25,
    paperProfile: null,
    zoom: 3.5,
    dragging: null,
    resizing: null,
    templates: [],
    activeTemplateId: null,
    previewSlug: null
};

async function ldLoadTemplatesFromStorage() {
    try {
        const stored = localStorage.getItem('neogleamz_label_templates');
        if (stored) window.ldState.templates = JSON.parse(stored);
        
        if (typeof supabaseClient !== 'undefined') {
            const { data, error } = await supabaseClient.from('label_templates').select('*');
            if (data && !error) {
                window.ldState.templates = data.map(row => ({
                    id: row.id,
                    name: row.name,
                    widthIn: row.widthIn,
                    heightIn: row.heightIn,
                    paperProfile: row.paper_profile,
                    elements: row.elements
                }));
                localStorage.setItem('neogleamz_label_templates', JSON.stringify(window.ldState.templates));
            }
        }
        
        if (typeof window.ldRenderGlobalTemplateDropdown === 'function') window.ldRenderGlobalTemplateDropdown();
    } catch(_e){ /* ignore */ }
}
async function ldSaveTemplatesToStorage() {
    localStorage.setItem('neogleamz_label_templates', JSON.stringify(window.ldState.templates));
    
    if (typeof supabaseClient !== 'undefined') {
        try {
            const payloads = window.ldState.templates.map(t => ({
                id: t.id,
                name: t.name,
                widthIn: t.widthIn,
                heightIn: t.heightIn,
                paper_profile: t.paperProfile,
                elements: t.elements
            }));
            await supabaseClient.from('label_templates').upsert(payloads, {onConflict: 'id'});
        } catch(_e) { /* ignore */ }
    }
    
    if (typeof window.ldRenderGlobalTemplateDropdown === 'function') window.ldRenderGlobalTemplateDropdown();
}

window.ldRenderGlobalTemplateDropdown = function() {
    const selects = [
        document.getElementById('barcodzTemplateSelect'),
        document.getElementById('labelzTemplateSelect'),
        document.getElementById('labelzDesignerTemplateSelect')
    ];
    
    // Default (No Template) uses Standard Template's UUID as its value so both options
    // are functionally identical everywhere code reads the select's .value
    const _stdTpl = window.ldState.templates
        ? window.ldState.templates.find(t => t.name.toLowerCase() === 'standard template')
        : null;
    const _defaultVal = _stdTpl ? _stdTpl.id : '';
    let html = `<option value="${_defaultVal}"${!window.ldState.activeTemplateId ? ' selected' : ''}>Default (No Template)</option>`;
    if (window.ldState && window.ldState.templates) {
        window.ldState.templates.forEach(t => {
            const isSelected = window.ldState.activeTemplateId === t.id;
            html += `<option value="${t.id}"${isSelected ? ' selected' : ''}>${t.name}</option>`;
        });
    }
    
    selects.forEach(sel => {
        if (sel) sel.innerHTML = window.safeHTML(html);
    });
};

window.click_openWhiteboardDesigner = function() {
    let modal = document.getElementById('whiteboardDesignerModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'whiteboardDesignerModal';
        modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:var(--bg-main);z-index:99999;display:flex;flex-direction:column;color:white;font-family:sans-serif;';
        document.body.appendChild(modal);
        
        document.addEventListener('pointermove', ldPointerMove);
        document.addEventListener('pointerup', ldPointerUp);
    }
    
    ldLoadTemplatesFromStorage();
    
    let previewOptions = '<option value="">-- No Preview Context --</option>';
    if (window.barcodzSpoolQueue) {
        window.barcodzSpoolQueue.forEach(item => {
            const isSelected = window.ldState.previewSlug === item.slug ? 'selected' : '';
            previewOptions += `<option value="${item.slug}" ${isSelected}>${item.name}</option>`;
        });
    }
    
    let templateOptions = '<option value="">-- Select Template --</option>';
    window.ldState.templates.forEach(t => {
        const isSelected = window.ldState.activeTemplateId === t.id ? 'selected' : '';
        templateOptions += `<option value="${t.id}" ${isSelected}>${t.name}</option>`;
    });

    let paperOptions = '<option value="">-- Custom Size --</option>';
    if (window.activePaperProfiles) {
        window.activePaperProfiles.forEach(p => {
            const isSelected = window.ldState.paperProfile === p.n ? 'selected' : '';
            paperOptions += `<option value="${p.n.replace(/"/g, '&quot;')}" ${isSelected}>${p.n}</option>`;
        });
    }

    modal.innerHTML = window.safeHTML ? window.safeHTML(`
        <div style="height:60px; background:var(--bg-panel); border-bottom:1px solid var(--border-color); display:flex; justify-content:space-between; align-items:center; padding:0 24px; box-shadow:0 4px 15px rgba(0,0,0,0.2); z-index:10;">
            <div style="display:flex; align-items:center; gap:10px;">
                <span style="font-size:24px;">✏️</span>
                <span style="font-weight:bold; font-size:18px; color:white; letter-spacing:0.5px;">Whiteboard Designer</span>
                <span style="color:var(--text-muted); font-size:14px; background:rgba(255,255,255,0.1); padding:2px 8px; border-radius:12px;">Template Engine</span>
            </div>
            <button data-click="click_closeWhiteboardDesigner" class="btn-red" style="font-weight:bold; letter-spacing:1px; padding:6px 20px; width:max-content; border-radius:6px;">
                CLOSE
            </button>
        </div>
        <div style="display:flex; flex:1; overflow:hidden;">
            <!-- Toolbar -->
            <div style="width:250px; background:var(--bg-panel); border-right:1px solid var(--border-color); padding:15px; display:flex; flex-direction:column; gap:10px; overflow-y:auto;">
                
                <h3 style="margin:0; font-size:12px; color:var(--text-heading); text-transform:uppercase;">TEMPLATES</h3>
                <select id="ldTemplateSelect" style="width:100%; padding:5px; background:var(--bg-input); border:1px solid var(--border-color); color:white;">
                    ${templateOptions}
                </select>
                <button class="btn-green" data-click="click_ldSaveTemplate">Save Template</button>
                <button class="btn-red" data-click="click_ldDeleteTemplate">Delete Template</button>
                <hr style="border:0; border-bottom:1px solid var(--border-color); margin:5px 0;">

                <h3 style="margin:0; font-size:12px; color:var(--text-heading); text-transform:uppercase;">PREVIEW CONTEXT</h3>
                <select id="ldPreviewSelect" style="width:100%; padding:5px; background:var(--bg-input); border:1px solid var(--border-color); color:white;">
                    ${previewOptions}
                </select>
                <hr style="border:0; border-bottom:1px solid var(--border-color); margin:5px 0;">

                <button class="btn-blue" data-click="click_ldAddProductName">Add Product Name</button>
                <button class="btn-blue" data-click="click_ldAddSku">Add SKU</button>
                <button class="btn-blue" data-click="click_ldAddBarcode">Add Barcode</button>
                <hr style="border:0; border-bottom:1px solid var(--border-color); margin:5px 0;">
                
                <h3 style="margin:0; font-size:12px; color:var(--text-heading); text-transform:uppercase;">PAPER PROFILE</h3>
                <select id="ldPaperProfileSelect" style="width:100%; padding:5px; background:var(--bg-input); border:1px solid var(--border-color); color:white;">
                    ${paperOptions}
                </select>
                <hr style="border:0; border-bottom:1px solid var(--border-color); margin:5px 0;">

                <label>Width (in)</label>
                <input type="number" id="ldWidth" value="${window.ldState.widthIn}" step="0.1" style="width:100%; padding:5px; background:var(--bg-input); border:1px solid var(--border-color); color:white;">
                <label>Height (in)</label>
                <input type="number" id="ldHeight" value="${window.ldState.heightIn}" step="0.1" style="width:100%; padding:5px; background:var(--bg-input); border:1px solid var(--border-color); color:white;">
                <button class="btn-green" data-click="click_ldUpdateSize">Apply Size</button>
                
                <hr style="border:0; border-bottom:1px solid var(--border-color); margin:5px 0; flex:1;">
                <button class="btn-green-neon" data-click="click_ldPrintState">🖨️ PRINT BATCH (TEMPLATE)</button>
            </div>
            
            <!-- Canvas Area -->
            <div style="flex:1; background:#1e1e1e; display:flex; justify-content:center; align-items:center; overflow:auto; position:relative;" id="ldCanvasWrapper">
                <div id="ldCanvas" style="background:white; position:relative; overflow:hidden; box-shadow:0 10px 30px rgba(0,0,0,0.5); transform-origin:center; transform:scale(3.5);">
                    <!-- Elements go here -->
                </div>
            </div>
            
            <!-- Properties Area -->
            <div style="width:250px; background:var(--bg-panel); border-left:1px solid var(--border-color); padding:15px; display:flex; flex-direction:column; gap:10px;" id="ldProperties">
                <div style="color:var(--text-muted); font-style:italic; text-align:center;">Select an element to edit properties.</div>
            </div>
        </div>
    `) : '';
    
    document.getElementById('ldTemplateSelect')?.addEventListener('change', function() { window.click_ldLoadTemplate(this.value); });
    document.getElementById('ldPreviewSelect')?.addEventListener('change', function() { window.click_ldChangePreview(this.value); });
    document.getElementById('ldPaperProfileSelect')?.addEventListener('change', function() { window.click_ldChangePaperProfile(this.value); });
    
    document.getElementById('ldCanvas').addEventListener('pointerdown', ldPointerDown);
    modal.style.display = 'flex';
    ldRender();
};

window.click_closeWhiteboardDesigner = function() {
    document.getElementById('whiteboardDesignerModal').style.display = 'none';
};

window.click_ldChangePreview = function(slug) {
    window.ldState.previewSlug = slug;
    ldRender();
};

window.click_ldChangePaperProfile = function(val) {
    window.ldState.paperProfile = val;
    if (val && window.activePaperProfiles) {
        let p = window.activePaperProfiles.find(x => x.n === val);
        if (p) {
            window.ldState.widthIn = p.w;
            window.ldState.heightIn = p.h;
            
            const wInput = document.getElementById('ldWidth');
            const hInput = document.getElementById('ldHeight');
            if (wInput) wInput.value = p.w;
            if (hInput) hInput.value = p.h;
        }
    }
    ldRender();
};

window.click_ldSaveTemplate = async function() {
    if (window.ldState.activeTemplateId) {
        const existing = window.ldState.templates.find(t => t.id === window.ldState.activeTemplateId);
        if (existing) {
            if (confirm("Update existing template '" + existing.name + "'?\n\nClick OK to Overwrite it.\nClick Cancel to Save As a New Template instead.")) {
                existing.widthIn = window.ldState.widthIn;
                existing.heightIn = window.ldState.heightIn;
                existing.paperProfile = window.ldState.paperProfile;
                existing.elements = JSON.parse(JSON.stringify(window.ldState.elements));
                await ldSaveTemplatesToStorage();
                alert("Template updated!");
                return;
            }
        }
    }

    const name = prompt("Enter a name for this NEW Template:");
    if (!name) return;
    
    // Create deep copy of elements
    const elementsCopy = JSON.parse(JSON.stringify(window.ldState.elements));
    
    const newTemplate = {
        id: 'tpl_' + Date.now(),
        name: name,
        widthIn: window.ldState.widthIn,
        heightIn: window.ldState.heightIn,
        paperProfile: window.ldState.paperProfile,
        elements: elementsCopy
    };
    
    window.ldState.templates.push(newTemplate);
    window.ldState.activeTemplateId = newTemplate.id;
    await ldSaveTemplatesToStorage();
    
    // Re-render modal to show new dropdown option
    document.getElementById('whiteboardDesignerModal').style.display = 'none';
    window.click_openWhiteboardDesigner();
};

window.click_ldLoadTemplate = function(id) {
    if (!id) {
        window.ldState.activeTemplateId = null;
        window.ldState.elements = [];
        ldRender();
        if (typeof window.ldRenderGlobalTemplateDropdown === 'function') window.ldRenderGlobalTemplateDropdown();
        return;
    }
    const tpl = window.ldState.templates.find(t => t.id === id);
    if (tpl) {
        window.ldState.activeTemplateId = tpl.id;
        window.ldState.widthIn = tpl.widthIn;
        window.ldState.heightIn = tpl.heightIn;
        window.ldState.paperProfile = tpl.paperProfile || null;
        window.ldState.elements = JSON.parse(JSON.stringify(tpl.elements));
        window.ldState.selectedId = null;
        
        const wInput = document.getElementById('ldWidth');
        const hInput = document.getElementById('ldHeight');
        if (wInput) wInput.value = tpl.widthIn;
        if (hInput) hInput.value = tpl.heightIn;
        const pSelect = document.getElementById('ldPaperProfileSelect');
        if (pSelect) pSelect.value = window.ldState.paperProfile || "";
        
        ldRender();
        if (typeof window.ldRenderGlobalTemplateDropdown === 'function') window.ldRenderGlobalTemplateDropdown();
        
        if (tpl.paperProfile) {
            const sizeSel = document.getElementById('barcodzSizeSelect');
            if (sizeSel) {
                Array.from(sizeSel.options).forEach(opt => {
                    try {
                        let p = JSON.parse(opt.value);
                        if (p.n === tpl.paperProfile) sizeSel.value = opt.value;
                    } catch (_e) {
                        // ignore parse errors for invalid paper options
                    }
                });
            }
        }
    }
};

window.click_ldDeleteTemplate = async function() {
    if (!window.ldState.activeTemplateId) return;
    if (confirm("Delete this template?")) {
        const idToDelete = window.ldState.activeTemplateId;
        window.ldState.templates = window.ldState.templates.filter(t => t.id !== idToDelete);
        window.ldState.activeTemplateId = null;
        window.ldState.elements = [];
        
        if (typeof supabaseClient !== 'undefined') {
            await supabaseClient.from('label_templates').delete().eq('id', idToDelete);
        }
        
        await ldSaveTemplatesToStorage();
        ldRender();
        document.getElementById('ldTemplateSelect').value = '';
        document.getElementById('whiteboardDesignerModal').style.display = 'none';
        window.click_openWhiteboardDesigner();
    }
};

window.click_ldUpdateSize = function() {
    window.ldState.widthIn = parseFloat(document.getElementById('ldWidth').value) || 2.25;
    window.ldState.heightIn = parseFloat(document.getElementById('ldHeight').value) || 1.25;
    ldRender();
};

window.click_ldAddProductName = function() {
    window.ldState.elements.push({
        id: 'el_' + Date.now(),
        type: 'text',
        x: 0.1, y: 0.1,
        width: 1.5, height: 0.3,
        value: '{{PRODUCT_NAME}}',
        fontSize: 14,
        fontWeight: 'bold',
        textAlign: 'center'
    });
    ldRender();
};

window.click_ldAddSku = function() {
    window.ldState.elements.push({
        id: 'el_' + Date.now(),
        type: 'text',
        x: 0.1, y: 0.6,
        width: 1.5, height: 0.2,
        value: '{{SKU}}',
        fontSize: 10,
        fontWeight: 'normal',
        textAlign: 'center'
    });
    ldRender();
};

window.click_ldAddBarcode = function() {
    window.ldState.elements.push({
        id: 'el_' + Date.now(),
        type: 'barcode',
        x: 0.1, y: 0.4,
        width: 1.5, height: 0.5,
        value: '{{BARCODE}}',
        fontSize: 10
    });
    ldRender();
};

function ldRender() {
    const canvas = document.getElementById('ldCanvas');
    if (!canvas) return;
    
    // Parse dynamic fields based on active previewSlug
    let ctxName = "Product Name";
    let ctxSku = "SKU-PREVIEW";
    let ctxBarcode = "123456789";
    
    if (window.ldState.previewSlug && window.barcodzSpoolQueue) {
        const item = window.barcodzSpoolQueue.find(x => x.slug === window.ldState.previewSlug);
        if (item) {
            ctxName = item.name;
            ctxBarcode = item.slug;
            ctxSku = typeof window.getItemSKUValue === 'function' ? window.getItemSKUValue(item.name) : item.slug;
        }
    }
    
    const parseVal = (val) => {
        if (!val) return '';
        return val.replace(/\{\{PRODUCT_NAME\}\}/g, ctxName)
                  .replace(/\{\{SKU\}\}/g, ctxSku)
                  .replace(/\{\{BARCODE\}\}/g, ctxBarcode);
    };

    // Convert inches to pixels for display. Browsers assume 96 DPI for CSS 'in' units.
    const DPI = 96;
    canvas.style.width = (window.ldState.widthIn * DPI) + 'px';
    canvas.style.height = (window.ldState.heightIn * DPI) + 'px';
    
    let html = '';
    window.ldState.elements.forEach(el => {
        const isSelected = window.ldState.selectedId === el.id;
        const border = isSelected ? '1px dashed #0ea5e9' : 'none';
        const parsedValue = parseVal(el.value);
        
        if (el.type === 'text') {
            html += `
                <div id="${el.id}" class="ld-element" style="position:absolute; left:${el.x * DPI}px; top:${el.y * DPI}px; width:${el.width * DPI}px; height:${el.height * DPI}px; border:${border}; color:black; font-size:${el.fontSize}pt; font-weight:${el.fontWeight}; text-align:${el.textAlign}; display:flex; align-items:center; justify-content:${el.textAlign==='center'?'center':el.textAlign==='right'?'flex-end':'flex-start'}; overflow:hidden; user-select:none; cursor:move; font-family:sans-serif;"><span>${parsedValue}</span></div>
            `;
        } else if (el.type === 'barcode') {
            html += `
                <div id="${el.id}" class="ld-element" style="position:absolute; left:${el.x * DPI}px; top:${el.y * DPI}px; width:${el.width * DPI}px; height:${el.height * DPI}px; border:${border}; cursor:move; display:flex; flex-direction:column; justify-content:center; align-items:center;">
                    <canvas id="bc_${el.id}" style="width:100%; flex:1; min-height:0; object-fit:fill;"></canvas>
                    <div style="font-family:sans-serif; font-size:${el.fontSize}pt; color:black; text-align:center; padding-top:2px; user-select:none;">${parsedValue}</div>
                </div>
            `;
        }
        
        // Add resize handle if selected
        if (isSelected) {
            html += `
                <div id="resizer_${el.id}" style="position:absolute; left:${(el.x + el.width) * DPI - 5}px; top:${(el.y + el.height) * DPI - 5}px; width:10px; height:10px; background:#0ea5e9; cursor:nwse-resize; z-index:10;"></div>
            `;
        }
    });
    
    canvas.innerHTML = window.safeHTML ? window.safeHTML(html) : html;
    
    // Post-render Barcodes
    window.ldState.elements.forEach(el => {
        if (el.type === 'barcode') {
            try {
                bwipjs.toCanvas(`bc_${el.id}`, {
                    bcid: 'code128',
                    text: parseVal(el.value) || '123456789',
                    scale: 3,
                    height: 10,
                    includetext: false
                });
            } catch(e) { console.error("BWIP Error", e); }
        }
    });
    
    ldRenderProperties();
}

function ldRenderProperties() {
    const props = document.getElementById('ldProperties');
    if (!props) return;
    
    const selId = window.ldState.selectedId;
    const el = window.ldState.elements.find(e => e.id === selId);
    
    if (!el) {
        props.innerHTML = window.safeHTML ? window.safeHTML('<div style="color:var(--text-muted); font-style:italic; text-align:center;">Select an element to edit properties.</div>') : '';
        return;
    }
    
    let html = `
        <h3 style="margin:0; font-size:12px; color:var(--text-heading); text-transform:uppercase; margin-bottom:10px;">PROPERTIES</h3>
        <label>X (in)</label>
        <input type="number" id="ldPropX" value="${el.x.toFixed(2)}" step="0.05" style="background:var(--bg-input); border:1px solid var(--border-color); color:white; padding:4px;">
        <label>Y (in)</label>
        <input type="number" id="ldPropY" value="${el.y.toFixed(2)}" step="0.05" style="background:var(--bg-input); border:1px solid var(--border-color); color:white; padding:4px;">
        <label>Width (in)</label>
        <input type="number" id="ldPropW" value="${el.width.toFixed(2)}" step="0.05" style="background:var(--bg-input); border:1px solid var(--border-color); color:white; padding:4px;">
        <label>Height (in)</label>
        <input type="number" id="ldPropH" value="${el.height.toFixed(2)}" step="0.05" style="background:var(--bg-input); border:1px solid var(--border-color); color:white; padding:4px;">
        <label>Value</label>
        <input type="text" id="ldPropVal" value="${el.value}" style="background:var(--bg-input); border:1px solid var(--border-color); color:white; padding:4px;">
        <label>Font Size (pt)</label>
        <input type="number" id="ldPropF" value="${el.fontSize || 10}" step="1" style="background:var(--bg-input); border:1px solid var(--border-color); color:white; padding:4px;">
        ${el.type === 'text' ? `
        <label>Align</label>
        <select id="ldPropAlign" style="background:var(--bg-input); border:1px solid var(--border-color); color:white; padding:4px;">
            <option value="left" ${el.textAlign === 'left' ? 'selected' : ''}>Left</option>
            <option value="center" ${el.textAlign === 'center' ? 'selected' : ''}>Center</option>
            <option value="right" ${el.textAlign === 'right' ? 'selected' : ''}>Right</option>
        </select>
        ` : ''}
        <button id="ldCenterBtn" class="btn-blue" style="margin-top:10px;">Center on Label</button>
        <button id="ldDeleteBtn" class="btn-red" style="margin-top:5px;">Delete Element</button>
    `;
    props.innerHTML = window.safeHTML ? window.safeHTML(html) : html;
    
    // Attach Event Listeners dynamically to avoid DOMPurify stripping inline handlers
    document.getElementById('ldPropX')?.addEventListener('change', () => window.ldUpdateProp('x'));
    document.getElementById('ldPropY')?.addEventListener('change', () => window.ldUpdateProp('y'));
    document.getElementById('ldPropW')?.addEventListener('change', () => window.ldUpdateProp('width'));
    document.getElementById('ldPropH')?.addEventListener('change', () => window.ldUpdateProp('height'));
    document.getElementById('ldPropVal')?.addEventListener('change', () => window.ldUpdateProp('value'));
    document.getElementById('ldPropVal')?.addEventListener('keyup', () => window.ldUpdateProp('value'));
    document.getElementById('ldPropF')?.addEventListener('change', () => window.ldUpdateProp('fontSize'));
    document.getElementById('ldPropF')?.addEventListener('keyup', () => window.ldUpdateProp('fontSize'));
    document.getElementById('ldPropAlign')?.addEventListener('change', () => window.ldUpdateProp('textAlign'));
    document.getElementById('ldCenterBtn')?.addEventListener('click', () => window.ldCenterElement(el.id));
    document.getElementById('ldDeleteBtn')?.addEventListener('click', () => window.ldDeleteElement(el.id));
}

window.ldUpdateProp = function(key) {
    const selId = window.ldState.selectedId;
    const el = window.ldState.elements.find(e => e.id === selId);
    if (!el) return;
    
    if (key === 'value') {
        el.value = document.getElementById('ldPropVal').value;
    } else if (key === 'textAlign') {
        el.textAlign = document.getElementById('ldPropAlign').value;
    } else if (key === 'fontSize') {
        el.fontSize = parseInt(document.getElementById('ldPropF').value) || 10;
    } else {
        const val = parseFloat(document.getElementById('ldProp' + key.toUpperCase().charAt(0)).value);
        if (!isNaN(val)) el[key] = val;
    }
    ldRender();
};

window.ldDeleteElement = function(id) {
    window.ldState.elements = window.ldState.elements.filter(e => e.id !== id);
    if (window.ldState.selectedId === id) window.ldState.selectedId = null;
    ldRender();
};

window.ldCenterElement = function(id) {
    const el = window.ldState.elements.find(e => e.id === id);
    if (el) {
        el.x = (window.ldState.widthIn - el.width) / 2;
        if (el.x < 0) el.x = 0;
        ldRender();
    }
};

// --- Pointer Drag Logic ---
let startX = 0, startY = 0, origX = 0, origY = 0, origW = 0, origH = 0;

function ldPointerDown(e) {
    const target = e.target;
    
    if (target.id && target.id.startsWith('resizer_')) {
        window.ldState.resizing = target.id.replace('resizer_', '');
        const el = window.ldState.elements.find(el => el.id === window.ldState.resizing);
        if(el) { origW = el.width; origH = el.height; }
        startX = e.clientX; startY = e.clientY;
        e.stopPropagation();
        return;
    }
    
    const elDiv = target.closest('.ld-element');
    if (elDiv) {
        window.ldState.selectedId = elDiv.id;
        window.ldState.dragging = elDiv.id;
        const el = window.ldState.elements.find(el => el.id === elDiv.id);
        if(el) { origX = el.x; origY = el.y; }
        startX = e.clientX; startY = e.clientY;
        ldRender();
    } else {
        window.ldState.selectedId = null;
        ldRender();
    }
}

function ldPointerMove(e) {
    const DPI = 96;
    const zoom = window.ldState.zoom;
    
    if (window.ldState.dragging) {
        const dx = (e.clientX - startX) / (DPI * zoom);
        const dy = (e.clientY - startY) / (DPI * zoom);
        const el = window.ldState.elements.find(el => el.id === window.ldState.dragging);
        if (el) {
            el.x = origX + dx;
            el.y = origY + dy;
            ldRender();
        }
    } else if (window.ldState.resizing) {
        const dx = (e.clientX - startX) / (DPI * zoom);
        const dy = (e.clientY - startY) / (DPI * zoom);
        const el = window.ldState.elements.find(el => el.id === window.ldState.resizing);
        if (el) {
            el.width = Math.max(0.1, origW + dx);
            el.height = Math.max(0.1, origH + dy);
            ldRender();
        }
    }
}

function ldPointerUp(_e) {
    window.ldState.dragging = null;
    window.ldState.resizing = null;
}

// --- Print Engine ---
window.click_ldPrintState = function() {
    let iframe = document.getElementById('ldPrintEngineIframe');
    if (!iframe) {
        iframe = document.createElement('iframe');
        iframe.id = 'ldPrintEngineIframe';
        iframe.style.position = 'absolute';
        iframe.style.width = '1px';
        iframe.style.height = '1px';
        iframe.style.border = 'none';
        iframe.style.opacity = '0';
        iframe.style.pointerEvents = 'none';
        iframe.style.zIndex = '-9999';
        document.body.appendChild(iframe);
    }
    
    const doc = iframe.contentWindow.document;
    
    let printHtml = `
        <html><head>
        <style>
            @media print {
                @page { size: ${window.ldState.widthIn}in ${window.ldState.heightIn}in; margin: 0; }
                body { margin: 0; padding: 0; }
            }
            body { margin: 0; background: white; }
            .ld-page { position: relative; width: ${window.ldState.widthIn}in; height: ${window.ldState.heightIn}in; overflow: hidden; page-break-after: always; }
        </style>
        </head><body>
    `;
    
    let totalPrinted = 0;
    const itemsToPrint = (window.barcodzSpoolQueue && window.barcodzSpoolQueue.length > 0) 
        ? window.barcodzSpoolQueue 
        : [{ name: 'Template Demo', slug: '123456789', qty: 1 }];

    itemsToPrint.forEach(item => {
        for (let q = 0; q < item.qty; q++) {
            totalPrinted++;
            printHtml += '<div class="ld-page">';
            
            const ctxName = item.name;
            const ctxBarcode = item.slug;
            const ctxSku = typeof window.getItemSKUValue === 'function' ? window.getItemSKUValue(item.name) : item.slug;
            const parseVal = (val) => {
                if (!val) return '';
                return val.replace(/\{\{PRODUCT_NAME\}\}/g, ctxName)
                          .replace(/\{\{SKU\}\}/g, ctxSku)
                          .replace(/\{\{BARCODE\}\}/g, ctxBarcode);
            };

            window.ldState.elements.forEach(el => {
                const parsedValue = parseVal(el.value);
                
                if (el.type === 'text') {
                    printHtml += `
                        <div style="position:absolute; left:${el.x}in; top:${el.y}in; width:${el.width}in; height:${el.height}in; font-size:${el.fontSize}pt; font-weight:${el.fontWeight}; text-align:${el.textAlign}; font-family:sans-serif; color:black; display:flex; align-items:center; justify-content:${el.textAlign==='center'?'center':el.textAlign==='right'?'flex-end':'flex-start'}; overflow:hidden;"><span>${parsedValue}</span></div>
                    `;
                } else if (el.type === 'barcode') {
                    let imgData = '';
                    if (typeof bwipjs !== 'undefined') {
                        try {
                            const offC = document.createElement('canvas');
                            bwipjs.toCanvas(offC, {
                                bcid: 'code128',
                                text: parsedValue || '123456789',
                                scale: 3,
                                height: 10,
                                includetext: false
                            });
                            imgData = offC.toDataURL('image/png');
                        } catch(_e){ /* ignore */ }
                    }
                    if (imgData) {
                        printHtml += `
                            <div style="position:absolute; left:${el.x}in; top:${el.y}in; width:${el.width}in; height:${el.height}in; display:flex; flex-direction:column; justify-content:center; align-items:center;">
                                <img src="${imgData}" style="width:100%; flex:1; min-height:0; object-fit:fill;" />
                                <div style="font-family:sans-serif; font-size:${el.fontSize}pt; color:black; text-align:center; padding-top:2px;">${parsedValue}</div>
                            </div>
                        `;
                    }
                }
            });
            
            printHtml += '</div>';
        }
    });
    
    printHtml += '</body></html>';
    doc.open();
    doc.write(printHtml);
    doc.close();
    
    setTimeout(() => {
        let printFired = false;
        const afterPrintHandler = () => {
            if (printFired) return;
            printFired = true;
            iframe.contentWindow.removeEventListener('afterprint', afterPrintHandler);
            if(typeof window.click_confirmPrintSuccess === 'function') {
                const modalEl = document.createElement('div');
                modalEl.id = 'printConfirmModal';
                modalEl.style.cssText = 'position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.8); z-index:99999; display:flex; align-items:center; justify-content:center; flex-direction:column; color:white; font-family:sans-serif;';
                const innerHtml = `
                    <div style="background:var(--bg-panel); border:1px solid var(--border-color); padding:30px; border-radius:12px; text-align:center; max-width:400px; box-shadow:0 10px 30px rgba(0,0,0,0.5);">
                        <div style="font-size:48px; margin-bottom:10px;">🖨️</div>
                        <h2 style="margin:0 0 10px 0; color:var(--text-heading);">Print Verification</h2>
                        <p style="color:var(--text-main); margin-bottom:20px;">Did all <b>${totalPrinted}</b> labels print successfully?</p>
                        <div style="display:flex; gap:10px; justify-content:center;">
                            <button class="btn-green" data-click="click_confirmPrintSuccess" data-total="${totalPrinted}" data-size="${window.ldState.paperProfile || (window.ldState.widthIn + 'x' + window.ldState.heightIn)}" style="padding:10px 20px; font-weight:bold; font-size:16px; cursor:pointer;">✅ Yes</button>
                            <button class="btn-red" data-click="click_cancelPrintSuccess" style="padding:10px 20px; font-weight:bold; font-size:16px; cursor:pointer;">❌ No</button>
                        </div>
                    </div>
                `;
                modalEl.innerHTML = innerHtml;
                document.body.appendChild(modalEl);
            }
        };
        iframe.contentWindow.addEventListener('afterprint', afterPrintHandler);
        
        // Fallback
        setTimeout(() => { if (!printFired) afterPrintHandler(); }, 3000);
        
        iframe.contentWindow.print();
    }, 500);
};

// Initialize global templates dropdown on script load
setTimeout(ldLoadTemplatesFromStorage, 100);
