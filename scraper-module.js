/**
 * @fileoverview Vendor Scraper Foundry Module
 * A Tri-Pane local DOM extraction workbench.
 * Pane 1 (Left 60%): Visual X-Ray rendered view of the vendor HTML
 * Pane 2 (Top-Right 40%): Parent-Child Bounding Container Logic
 * Pane 3 (Bottom-Right 40%): Live Tabular Dataset mapping & XLSX Export
 */

let _scraperParsedDoc = null;
let _scraperRawHtml = '';
let _scraperXrayCount = 0;
let _scraperXrayIndex = [];

// NEW STATE: Dataset & Containers
let _scraperDataset = [];
let _scraperContainers = []; 

const _XRAY_COLORS = [
    '#ef4444','#f59e0b','#10b981','#0ea5e9','#8b5cf6',
    '#ec4899','#14b8a6','#f97316','#6366f1','#22d3ee',
    '#a3e635','#fb923c','#c084fc','#2dd4bf','#fbbf24',
];

function _scraperEscapeHtml(str) {
    if (!str) return '';
    if (typeof str !== 'string') str = String(str);
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function _scraperSetStatus(msg, color) {
    const el = document.getElementById('scraperStatus');
    if (!el) return;
    el.style.display = 'block';
    el.style.color = color || '#94a3b8';
    el.textContent = msg;
}

function openScraperFoundry() {
    if (document.getElementById('scraperFoundryOverlay')) {
        document.getElementById('scraperFoundryOverlay').style.display = 'flex';
        return;
    }
    const o = document.createElement('div');
    o.id = 'scraperFoundryOverlay';
    o.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:var(--bg-main,#0f172a);z-index:10050;display:flex;flex-direction:column;font-family:Inter,system-ui,sans-serif;';
    o.innerHTML = `
    <div style="height:50px;background:var(--bg-bar,#334155);border-bottom:1px solid var(--border-color,#334155);display:flex;justify-content:space-between;align-items:center;padding:0 20px;flex-shrink:0;">
        <div style="display:flex;align-items:center;gap:12px;">
            <span style="font-size:15px;font-weight:900;color:#f59e0b;">🔬 SCRAPER FOUNDRY</span>
            <div style="width:1px;height:24px;background:var(--border-color,#334155);"></div>
            <span id="scraperFileName" style="font-size:12px;color:var(--text-muted,#94a3b8);font-style:italic;">No file loaded</span>
            <span id="scraperXrayBadge" style="font-size:10px;color:#0ea5e9;font-weight:bold;display:none;">0 elements</span>
        </div>
        <div style="display:flex;align-items:center;gap:10px;">
            <label style="display:flex;align-items:center;gap:6px;cursor:pointer;padding:6px 14px;background:rgba(245,158,11,0.15);border:1px solid rgba(245,158,11,0.4);border-radius:6px;font-size:11px;font-weight:bold;color:#f59e0b;">
                📂 LOAD .HTML
                <input type="file" id="scraperFileInput" accept=".html,.htm" style="display:none;">
            </label>
            <button id="scraperCloseBtn" style="padding:6px 16px;font-size:12px;font-weight:800;background:rgba(239,68,68,0.15);border:1px solid rgba(239,68,68,0.4);color:#ef4444;border-radius:6px;cursor:pointer;">✕ CLOSE</button>
        </div>
    </div>
    <div style="display:flex;flex:1;overflow:hidden;">
        <!-- PANE 1: VISUAL MAP -->
        <div id="scraperPane1" style="width:60%;min-width:300px;border-right:1px solid var(--border-color,#334155);display:flex;flex-direction:column;overflow:hidden;background:#0b1121;">
            <div style="padding:8px 16px;background:var(--bg-bar,#334155);border-bottom:1px solid var(--border-color,#334155);display:flex;justify-content:space-between;align-items:center;flex-shrink:0;">
                <span style="font-size:11px;font-weight:800;color:var(--text-muted,#94a3b8);text-transform:uppercase;letter-spacing:0.5px;">🧿 X-Ray Visual Map</span>
            </div>
            <div id="scraperDropZone" style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;padding:40px;">
                <div style="font-size:64px;opacity:0.3;">📄</div>
                <div style="font-size:14px;color:var(--text-muted,#94a3b8);text-align:center;">Drag & drop a vendor <strong>.html</strong> file here<br>or use the <strong>LOAD</strong> button above.</div>
            </div>
            <iframe id="scraperIframe" sandbox="allow-same-origin" style="flex:1;width:100%;border:none;background:#fff;display:none;"></iframe>
        </div>
        
        <!-- RIGHT PANES -->
        <div style="width:40%;display:flex;flex-direction:column;overflow:hidden;">
            <!-- PANE 2: LOGIC ENGINE -->
            <div id="scraperPane2" style="flex:1;border-bottom:1px solid var(--border-color,#334155);display:flex;flex-direction:column;overflow:hidden;">
                <div style="padding:8px 16px;background:var(--bg-bar,#334155);border-bottom:1px solid var(--border-color,#334155);flex-shrink:0;">
                    <span style="font-size:11px;font-weight:800;color:var(--text-muted,#94a3b8);text-transform:uppercase;letter-spacing:0.5px;">⚙️ Schema Mapping & Extraction</span>
                </div>
                
                <div style="padding:16px;overflow-y:auto;flex:1;display:flex;flex-direction:column;gap:20px;">
                    <!-- STEP 1: DEFINE BOUNDARY -->
                    <div style="background:rgba(14,165,233,0.05);padding:14px;border-radius:8px;border:1px solid rgba(14,165,233,0.3);display:flex;flex-direction:column;gap:8px;">
                        <div style="display:flex;justify-content:space-between;align-items:center;">
                            <span style="font-size:11px;font-weight:900;color:#0ea5e9;text-transform:uppercase;">Step 1. Define Row Container</span>
                            <span id="scraperContainerTargetCount" style="font-size:10px;color:#0ea5e9;font-weight:bold;">0 Blocks</span>
                        </div>
                        <p style="margin:0;font-size:10px;color:var(--text-muted,#94a3b8);line-height:1.4;">Identify the X-Ray ID of the outer wrapper (e.g. an entire Order Card or Table Row). This establishes total row bounds for your dataset.</p>
                        <div style="display:grid; grid-template-columns: 1fr auto; gap:8px;">
                            <input type="text" id="scraperContainerIdInput" placeholder="X-Ray ID (e.g. 14)" style="width:100%;padding:8px 12px;font-size:13px;background:var(--bg-input,#0f172a);border:1px solid rgba(14,165,233,0.4);border-radius:6px;color:var(--text-main,#e2e8f0);font-family:monospace;box-sizing:border-box;">
                            <button id="scraperSetContainerBtn" style="padding:8px 16px;font-size:12px;font-weight:800;background:rgba(14,165,233,0.2);border:1px solid rgba(14,165,233,0.5);color:#0ea5e9;border-radius:6px;cursor:pointer;white-space:nowrap;">📦 SET BOUNDS</button>
                        </div>
                    </div>

                    <!-- STEP 2: MAP FIELDS -->
                    <div id="scraperStep2Wrapper" style="background:rgba(16,185,129,0.05);padding:14px;border-radius:8px;border:1px solid rgba(16,185,129,0.3);display:flex;flex-direction:column;gap:12px;opacity:0.4;pointer-events:none;">
                        <span style="font-size:11px;font-weight:900;color:#10b981;text-transform:uppercase;">Step 2. Map Child Column fields</span>
                        <p style="margin:0;font-size:10px;color:var(--text-muted,#94a3b8);line-height:1.4;">Pick a target X-Ray ID inside the first wrapper block. We calculate structural relativity to pull this field identically from all mapped rows.</p>
                        
                        <div style="display:flex;flex-direction:column;gap:6px;">
                            <label style="font-size:10px;font-weight:bold;color:var(--text-muted,#94a3b8);text-transform:uppercase;">Column Header</label>
                            <input type="text" id="scraperColName" placeholder="e.g. Price, Order_ID" style="width:100%;padding:8px 12px;font-size:13px;background:var(--bg-input,#0f172a);border:1px solid rgba(16,185,129,0.4);border-radius:6px;color:var(--text-main,#e2e8f0);box-sizing:border-box;">
                        </div>

                        <div style="display:flex;flex-direction:column;gap:6px;">
                            <label style="font-size:10px;font-weight:bold;color:var(--text-muted,#94a3b8);text-transform:uppercase;">Child X-Ray ID Target</label>
                            <div style="display:grid; grid-template-columns: 1fr auto; gap:8px;">
                                <input type="text" id="scraperChildTargetInput" placeholder="X-Ray ID (e.g. 18)" style="width:100%;padding:8px 12px;font-size:13px;background:var(--bg-input,#0f172a);border:1px solid rgba(16,185,129,0.4);border-radius:6px;color:var(--text-main,#e2e8f0);font-family:monospace;box-sizing:border-box;">
                                <button id="scraperExtractChildBtn" style="padding:8px 16px;font-size:12px;font-weight:800;background:rgba(16,185,129,0.2);border:1px solid rgba(16,185,129,0.5);color:#10b981;border-radius:6px;cursor:pointer;white-space:nowrap;">⚡ MAP TO ROWS</button>
                            </div>
                        </div>
                    </div>

                    <div id="scraperStatus" style="font-size:10px;color:var(--text-muted,#94a3b8);font-family:monospace;padding:6px 0;display:none;"></div>
                </div>
            </div>

            <!-- PANE 3: EXPORT GRID -->
            <div id="scraperPane3" style="flex:1;display:flex;flex-direction:column;overflow:hidden;">
                <div style="padding:8px 16px;background:var(--bg-bar,#334155);border-bottom:1px solid var(--border-color,#334155);display:flex;justify-content:space-between;align-items:center;flex-shrink:0;">
                    <span style="font-size:11px;font-weight:800;color:var(--text-muted,#94a3b8);text-transform:uppercase;letter-spacing:0.5px;">📋 Tabular Dataset Array</span>
                    <div style="display:flex;gap:6px;align-items:center;">
                        <span id="scraperOutputCount" style="font-size:10px;color:#f59e0b;font-weight:bold;margin-right:8px;">0 rows</span>
                        <button id="scraperExportXlsxBtn" style="padding:3px 10px;font-size:10px;font-weight:bold;background:rgba(16,185,129,0.15);border:1px solid rgba(16,185,129,0.3);color:#10b981;border-radius:4px;cursor:pointer;">💾 EXPORT XLSX</button>
                        <button id="scraperCopyBtn" style="padding:3px 10px;font-size:10px;font-weight:bold;background:rgba(14,165,233,0.15);border:1px solid rgba(14,165,233,0.3);color:#0ea5e9;border-radius:4px;cursor:pointer;">📋 COPY JSON</button>
                        <button id="scraperClearBtn" style="padding:3px 10px;font-size:10px;font-weight:bold;background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);color:#ef4444;border-radius:4px;cursor:pointer;">🗑️ START OVER</button>
                    </div>
                </div>
                <div id="scraperOutputList" style="flex:1;overflow:auto;font-family:monospace;font-size:11px;color:#10b981;background:#0b1121;display:block;">
                    <div style="color:#94a3b8;font-style:italic;text-align:center;padding:40px;">Dataset is empty... set your boundary in Step 1.</div>
                </div>
            </div>
        </div>
    </div>`;
    document.body.appendChild(o);
    _scraperBindEvents();
    if (typeof sysLog === 'function') sysLog('Scraper Foundry opened.');
}

function closeScraperFoundry() {
    const o = document.getElementById('scraperFoundryOverlay');
    if (o) o.style.display = 'none';
    _scraperParsedDoc = null;
    _scraperRawHtml = '';
    _scraperXrayCount = 0;
    _scraperXrayIndex = [];
    _scraperDataset = [];
    _scraperContainers = [];
    if (typeof sysLog === 'function') sysLog('Scraper Foundry closed.');
}

function _scraperBindEvents() {
    document.getElementById('scraperCloseBtn').addEventListener('click', closeScraperFoundry);
    document.getElementById('scraperFileInput').addEventListener('change', (e) => {
        if (e.target.files[0]) _scraperIngestFile(e.target.files[0]);
    });

    const pane1 = document.getElementById('scraperPane1');
    pane1.addEventListener('dragover', (e) => { e.preventDefault(); e.stopPropagation(); });
    pane1.addEventListener('drop', (e) => {
        e.preventDefault(); e.stopPropagation();
        const f = e.dataTransfer.files[0];
        if (f && (f.name.endsWith('.html') || f.name.endsWith('.htm'))) _scraperIngestFile(f);
    });

    document.getElementById('scraperSetContainerBtn').addEventListener('click', _scraperSetContainerBounds);
    document.getElementById('scraperExtractChildBtn').addEventListener('click', _scraperMapChildColumn);
    
    document.getElementById('scraperExportXlsxBtn').addEventListener('click', _scraperExportXLSX);
    document.getElementById('scraperCopyBtn').addEventListener('click', _scraperCopyJSON);
    document.getElementById('scraperClearBtn').addEventListener('click', _scraperClearDataset);
}

function _scraperIngestFile(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        _scraperRawHtml = e.target.result;
        document.getElementById('scraperFileName').textContent = file.name;
        document.getElementById('scraperFileName').style.color = '#10b981';
        document.getElementById('scraperFileName').style.fontStyle = 'normal';
        _scraperParseAndXray(_scraperRawHtml, file.name);
        _scraperClearDataset(); 
    };
    reader.readAsText(file);
}

function _scraperParseAndXray(rawHtml, fileName) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(rawHtml, 'text/html');
    doc.querySelectorAll('script').forEach(s => s.remove());

    _scraperXrayIndex = [];
    let idCounter = 1;
    const skip = ['style','link','meta','head','br','hr','img','noscript'];

    doc.body.querySelectorAll('*').forEach(el => {
        const tag = el.tagName.toLowerCase();
        if (skip.includes(tag)) return;

        const color = _XRAY_COLORS[(idCounter - 1) % _XRAY_COLORS.length];
        el.setAttribute('data-xray-id', idCounter);
        el.style.outline = `2px dashed ${color}`;
        el.style.outlineOffset = '-1px';
        el.style.position = 'relative';

        const badge = doc.createElement('span');
        badge.textContent = `#${idCounter}`;
        badge.style.cssText = `position:absolute;top:-2px;left:-2px;background:${color};color:#fff;font-size:9px;font-weight:900;padding:1px 4px;border-radius:0 0 4px 0;z-index:9999;line-height:1.2;pointer-events:none;font-family:monospace;`;
        el.insertBefore(badge, el.firstChild);

        _scraperXrayIndex.push({ id: idCounter, tag, classes: el.className || '' });
        idCounter++;
    });

    _scraperXrayCount = idCounter - 1;
    _scraperParsedDoc = doc;

    const b = document.getElementById('scraperXrayBadge');
    b.textContent = `${_scraperXrayCount} elements tagged`;
    b.style.display = 'inline';

    document.getElementById('scraperDropZone').style.display = 'none';

    const iframe = document.getElementById('scraperIframe');
    iframe.style.display = 'block';
    const serializer = new XMLSerializer();
    iframe.srcdoc = serializer.serializeToString(doc);

    _scraperSetStatus(`✅ Parsed ${fileName || 'file'}: ${_scraperXrayCount} DOM elements X-Ray tagged.`, '#10b981');
}

// -------------------------------------------------------------
// CONTAINER MAPPER ENGINE
// -------------------------------------------------------------

function _scraperSetContainerBounds() {
    if (!_scraperParsedDoc) { _scraperSetStatus('❌ No file loaded.','#ef4444'); return; }
    
    document.getElementById('scraperStep2Wrapper').style.opacity = '0.4';
    document.getElementById('scraperStep2Wrapper').style.pointerEvents = 'none';
    _scraperContainers = [];
    _scraperDataset = [];
    _scraperRenderDataset();
    document.getElementById('scraperContainerTargetCount').textContent = '0 Blocks';

    const rawId = parseInt(document.getElementById('scraperContainerIdInput').value.trim(), 10);
    if (isNaN(rawId)) { _scraperSetStatus('⚠️ Enter a valid X-Ray ID.', '#f59e0b'); return; }

    const refEl = _scraperParsedDoc.querySelector(`[data-xray-id="${rawId}"]`);
    if (!refEl) { _scraperSetStatus(`❌ X-Ray ID #${rawId} not found in document.`, '#ef4444'); return; }

    // Derive base structurally repeating selector from tag and legitimate classes
    let tag = refEl.tagName.toLowerCase();
    let legitimateClasses = Array.from(refEl.classList).filter(c => c && !c.startsWith('xray') && !c.includes('hover') && !c.includes('focus'));
    let selector = tag;
    if (legitimateClasses.length > 0) {
        selector += '.' + legitimateClasses.join('.');
    }

    _scraperContainers = Array.from(_scraperParsedDoc.querySelectorAll(selector));
    
    if (_scraperContainers.length === 0) {
        _scraperSetStatus(`⚠️ No bounding boxes matched: ${selector}`, '#ef4444');
        return;
    }

    // Initialize dataset empty rows
    for (let i = 0; i < _scraperContainers.length; i++) {
        _scraperDataset.push({});
    }
    
    document.getElementById('scraperContainerTargetCount').textContent = `${_scraperContainers.length} Bounds Set`;
    document.getElementById('scraperStep2Wrapper').style.opacity = '1';
    document.getElementById('scraperStep2Wrapper').style.pointerEvents = 'auto';

    _scraperSetStatus(`✅ Bounding set! Identified ${_scraperContainers.length} valid container blocks.`, '#0ea5e9');
    _scraperRenderDataset();
}

function _scraperGetRelativeSelector(childNode, parentNode) {
    if (childNode === parentNode) return ':scope';
    
    let path = [];
    let current = childNode;
    
    while (current && current !== parentNode && current.tagName !== 'BODY') {
        let tag = current.tagName.toLowerCase();
        let domParent = current.parentNode;
        if (!domParent) break;
        
        let siblings = Array.from(domParent.children).filter(n => n.nodeType === Node.ELEMENT_NODE && n.tagName !== 'SPAN'); // ignore injected xray badges
        let legitimateSiblings = siblings.filter(s => s.tagName.toLowerCase() === tag);

        // ALWAYS use simple nth-child routing vertically upwards
        let physicalIndex = siblings.indexOf(current) + 1;
        path.unshift(`${tag}:nth-child(${physicalIndex})`);
        
        current = domParent;
    }
    
    return path.join(' > ');
}

function _scraperMapChildColumn() {
    if (_scraperContainers.length === 0) {
        _scraperSetStatus('❌ Containers not initiated. Run Step 1 first.', '#ef4444');
        return;
    }

    const colName = document.getElementById('scraperColName').value.trim();
    if (!colName) { _scraperSetStatus('⚠️ Enter a Column Header name first.', '#f59e0b'); return; }

    const childId = parseInt(document.getElementById('scraperChildTargetInput').value.trim(), 10);
    if (isNaN(childId)) { _scraperSetStatus('⚠️ Enter the Target X-Ray ID for the child.', '#f59e0b'); return; }

    const originChild = _scraperParsedDoc.querySelector(`[data-xray-id="${childId}"]`);
    if (!originChild) { _scraperSetStatus(`❌ Child X-Ray #${childId} not found.`, '#ef4444'); return; }

    // Locate which container this child resides inside of
    let originContainerIndex = -1;
    let nodeTrace = originChild;
    while(nodeTrace && nodeTrace.tagName !== 'BODY') {
        let foundIdx = _scraperContainers.indexOf(nodeTrace);
        if (foundIdx !== -1) { originContainerIndex = foundIdx; break; }
        nodeTrace = nodeTrace.parentNode;
    }

    if (originContainerIndex === -1) {
        _scraperSetStatus(`❌ The chosen target #${childId} is NOT nested inside your defined bounding containers.`, '#ef4444');
        return;
    }

    // Build perfect relative tree
    const relativeSelector = _scraperGetRelativeSelector(originChild, _scraperContainers[originContainerIndex]);
    
    let captureCount = 0;
    
    // Evaluate mapping across all instantiated block envelopes
    _scraperContainers.forEach((containerRoot, rowIdx) => {
        try {
            if (relativeSelector === ':scope') {
                _scraperDataset[rowIdx][colName] = containerRoot.innerText.trim();
                captureCount++;
            } else {
                let mappedTarget = containerRoot.querySelector(relativeSelector);
                if (mappedTarget) {
                    _scraperDataset[rowIdx][colName] = mappedTarget.innerText.trim();
                    captureCount++;
                } else {
                    _scraperDataset[rowIdx][colName] = ""; // Graceful null mapping for missing DOM blocks
                }
            }
        } catch(e) {
            _scraperDataset[rowIdx][colName] = ""; 
        }
    });

    document.getElementById('scraperColName').value = '';
    document.getElementById('scraperChildTargetInput').value = '';
    
    _scraperRenderDataset();
    _scraperSetStatus(`✅ Matrix Extracted: Captured ${captureCount} isolated node(s) mapped to [${colName}].`, '#10b981');
}

// -------------------------------------------------------------
// SPREADSHEET RENDERING & EXPORT
// -------------------------------------------------------------

function _scraperRenderDataset() {
    const container = document.getElementById('scraperOutputList');
    const countEl = document.getElementById('scraperOutputCount');
    
    if (_scraperDataset.length === 0) {
        container.innerHTML = '<div style="color:#94a3b8;font-style:italic;text-align:center;padding:40px;">Dataset is empty...</div>';
        countEl.textContent = '0 rows';
        return;
    }

    countEl.textContent = `${_scraperDataset.length} rows`;

    // Extract all unique column keys
    let cols = new Set();
    _scraperDataset.forEach(row => Object.keys(row).forEach(k => cols.add(k)));
    const colArray = Array.from(cols);

    // Build standard tabular HTML view
    let html = '<table style="width:100%; border-collapse:collapse; text-align:left;">';
    html += '<thead style="position:sticky; top:0; background:#0f172a; box-shadow:0 1px 0 rgba(255,255,255,0.1);"><tr style="white-space:nowrap;">';
    html += '<th style="padding:8px 12px; font-weight:900; color:#f59e0b; border-right:1px solid rgba(255,255,255,0.05);">#</th>';
    colArray.forEach(c => {
        html += `<th style="padding:8px 12px; font-weight:900; color:#10b981; border-right:1px solid rgba(255,255,255,0.05);">${_scraperEscapeHtml(c)}</th>`;
    });
    html += '</tr></thead><tbody>';

    _scraperDataset.forEach((row, rIdx) => {
        const bg = rIdx % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent';
        html += `<tr style="background:${bg}; border-bottom:1px solid rgba(255,255,255,0.02);">`;
        html += `<td style="padding:6px 12px; color:#f59e0b; border-right:1px solid rgba(255,255,255,0.05); font-weight:bold;">${rIdx + 1}</td>`;
        colArray.forEach(c => {
            // Trim rendering visual representation to save DOM
            let val = row[c] !== undefined ? String(row[c]) : '';
            if (val.length > 80) val = val.substring(0,80) + '...';
            if (val === '') val = '<span style="color:rgba(255,255,255,0.1)">empty</span>';
            html += `<td style="padding:6px 12px; color:var(--text-main,#e2e8f0); border-right:1px solid rgba(255,255,255,0.05);">${val}</td>`;
        });
        html += '</tr>';
    });
    html += '</tbody></table>';

    container.innerHTML = html;
}

function _scraperExportXLSX() {
    if (_scraperDataset.length === 0) {
        _scraperSetStatus('⚠️ Dataset is empty. Nothing to export.', '#f59e0b');
        return;
    }
    
    if (typeof XLSX === 'undefined') {
        _scraperSetStatus('❌ SheetJS global dependency not found.', '#ef4444');
        return;
    }

    try {
        const ws = XLSX.utils.json_to_sheet(_scraperDataset);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "FoundryData");
        
        let fName = document.getElementById('scraperFileName').textContent;
        if (!fName || fName.includes('No file')) fName = "Vendor_Scrape";
        fName = fName.replace('.html', '').replace('.htm', '');
        
        XLSX.writeFile(wb, `${fName}_Export.xlsx`);
        _scraperSetStatus('💾 XLSX Dataset Extracted Successfully.', '#10b981');
    } catch(e) {
        _scraperSetStatus(`❌ Export failed: ${e.message}`, '#ef4444');
    }
}

function _scraperCopyJSON() {
    if (_scraperDataset.length === 0) { 
        _scraperSetStatus('⚠️ Dataset is empty.', '#f59e0b'); 
        return; 
    }
    const payload = JSON.stringify(_scraperDataset, null, 2);
    navigator.clipboard.writeText(payload).then(() => {
        _scraperSetStatus(`📋 Copied JSON Array to clipboard.`, '#0ea5e9');
    }).catch(() => { 
        _scraperSetStatus('❌ Clipboard write failed.', '#ef4444'); 
    });
}

function _scraperClearDataset() {
    _scraperDataset = [];
    _scraperContainers = [];
    _scraperRenderDataset();
    document.getElementById('scraperStep2Wrapper').style.opacity = '0.4';
    document.getElementById('scraperStep2Wrapper').style.pointerEvents = 'none';
    document.getElementById('scraperContainerTargetCount').textContent = '0 Blocks';
    document.getElementById('scraperContainerIdInput').value = '';
    document.getElementById('scraperColName').value = '';
    document.getElementById('scraperChildTargetInput').value = '';
    _scraperSetStatus('🗑️ Boundaries cleared. Start over.', '#ef4444');
}
