// ============================================================
// BARCODZ MODULE — Neogleamz Label Printer Engine
// ============================================================

/**
 * @typedef {Object} BarcodzCacheItem
 * @property {string} name
 * @property {string} slug
 * @property {string} type
 * @property {string} icon
 * @property {string} [desc]
 * @property {boolean} isCatalog
 */

/**
 * @typedef {Object} BarcodzSpoolItem
 * @property {string} name
 * @property {string} slug
 * @property {string} icon
 * @property {string} type
 * @property {number} qty
 */
let barcodzCache = [];

function buildBarcodzCache() {
    try {
        barcodzCache = [];

        // 1. Gather all Finished Goods & Recipes (Makerz)
        if (typeof productsDB !== 'undefined') {
            Object.keys(productsDB).forEach(pName => {
                const is3D = !!(productsDB[pName].is_3d_print);
                const isSub = !!(typeof isSubassemblyDB !== 'undefined' && isSubassemblyDB[pName]);
                const isLabel = !!(productsDB[pName].is_label);
                const typeLabel = isLabel ? 'Custom Labelz' : (is3D ? '3D Print' : (isSub ? 'Sub-Assembly' : 'Retail Product'));
                const customIcon = productsDB[pName].label_emoji || '🏷️';

                barcodzCache.push({
                    name: pName,
                    slug: getItemBarcodeValue(pName),
                    type: typeLabel,
                    icon: isLabel ? customIcon : (is3D ? "🖨️" : (isSub ? "⚙️" : "📦")),
                    isCatalog: false
                });
            });
        }

        // 2. Gather all global raw materials (Inventory)
        if (typeof catalogCache !== 'undefined') {
            Object.keys(catalogCache).forEach(k => {
                const c = catalogCache[k];
                // Prefer NeoName if available, otherwise fallback to item name
                const labelName = c.neoName && c.neoName !== '-' ? c.neoName : c.itemName;

                // Deduplicate if already exists (some sub-assemblies might crossover)
                if (!barcodzCache.find(x => x.name === labelName)) {
                    barcodzCache.push({
                        name: labelName,
                        slug: getItemBarcodeValue(labelName),
                        type: 'Raw Material',
                        icon: "🔩",
                        desc: c.spec !== '(Mixed Specs)' ? c.spec : '',
                        isCatalog: true
                    });
                }
            });
        }

        // 3. Gather Custom Labels from label_designs (LABELZ module)
        if (typeof getLabelzForBarcodz === 'function') {
            getLabelzForBarcodz().forEach(lbl => {
                if (!barcodzCache.find(x => x.name === lbl.name)) {
                    barcodzCache.push(lbl);
                }
            });
        }

        // Alphabetical sort by product name
        barcodzCache.sort((a,b) => a.name.localeCompare(b.name));

        // Update KPI counter
        const kpi = document.getElementById('kpiBarcodzCount');
        if (kpi) kpi.innerText = barcodzCache.length;

        // Update LABELZ KPI counter
        const kpiL = document.getElementById('kpiLabelzCount');
        if (kpiL) kpiL.innerText = typeof labelzDB !== 'undefined' ? labelzDB.length : 0;
    } catch(e) { sysLog('Barcodz cache build error: ' + e.message, true); }
}

function renderBarcodzGrid(forceRebuild = false) {
    try {
        let hasProducts = barcodzCache.some(x => x.type !== 'Custom Labelz');
        if (barcodzCache.length === 0 || (!hasProducts && typeof productsDB !== 'undefined' && Object.keys(productsDB).length > 0) || forceRebuild) {
            buildBarcodzCache();
        }

        const grid = document.getElementById('barcodzGrid');
        const searchInput = document.getElementById('barcodzSearch')?.value.toLowerCase() || '';
        if (!grid) return;

        const filtered = barcodzCache.filter(item =>
            item.name.toLowerCase().includes(searchInput) ||
            item.slug.toLowerCase().includes(searchInput) ||
            item.type.toLowerCase().includes(searchInput)
        );

        if (filtered.length === 0) {
            grid.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:40px; color:var(--text-muted); font-style:italic;">No labels found matching search.</div>`;
            return;
        }

        // Group items by Type
        const grouped = {};
        filtered.forEach(item => {
            if(!grouped[item.type]) grouped[item.type] = [];
            grouped[item.type].push(item);
        });

        const typeOrder = ['Retail Product', 'Sub-Assembly', 'Custom Labelz', '3D Print', 'Raw Material'];
        const groupsToRender = Object.keys(grouped).sort((a,b) => typeOrder.indexOf(a) - typeOrder.indexOf(b));

        let savedState = null;
        try { savedState = JSON.parse(localStorage.getItem('barcodzGroupState')); } catch(e){}
        window.barcodzGroupState = window.barcodzGroupState || savedState || {};
        let html = '';
        groupsToRender.forEach(type => {
            let isOpen = window.barcodzGroupState[type] !== false;
            html += `
            <details ${isOpen ? 'open' : ''} ontoggle="window.barcodzGroupState['${type}'] = this.open; localStorage.setItem('barcodzGroupState', JSON.stringify(window.barcodzGroupState));" style="margin-bottom:20px; background:rgba(0,0,0,0.1); border-radius:12px; border:1px solid var(--border-color); grid-column: 1 / -1;">
                <summary style="padding:14px 20px; cursor:pointer; font-weight:bold; font-size:14px; text-transform:uppercase; color:var(--text-heading); list-style:none; display:flex; align-items:center; border-bottom:1px solid var(--border-color); background:var(--bg-panel); border-radius:12px 12px 0 0;">
                    <span style="font-size:18px; margin-right:10px;">${grouped[type][0].icon}</span> 
                    ${type.endsWith('z') ? type : type + 's'} <span style="margin-left:10px; background:var(--bg-input); padding:2px 8px; border-radius:12px; font-size:10px; color:var(--text-muted);">${grouped[type].length}</span>
                </summary>
                <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(280px, 1fr)); gap:12px; padding:16px;">
            `;

            grouped[type].forEach(item => {
                html += `
                    <div style="background:var(--bg-panel); border:1px solid var(--border-color); border-radius:8px; padding:10px; display:flex; flex-direction:column; box-shadow:0 2px 4px rgba(0,0,0,0.1); transition:border-color 0.2s;" onmouseover="this.style.borderColor='var(--primary-color)'" onmouseout="this.style.borderColor='var(--border-color)'">

                        <div style="display:grid; grid-template-columns:auto 1fr auto; align-items:center; margin-bottom:8px; gap:8px;">
                            <!-- Emoji Top Left -->
                            <div style="font-size:18px; line-height:1; display:flex; align-items:center; justify-content:center; width:24px; height:24px; background:var(--bg-input); border-radius:6px;">${item.icon}</div>

                            <!-- Type Centered -->
                            <div style="display:flex; justify-content:center; align-items:center; height:100%;">
                                <span style="display:inline-block; font-size:8px; font-weight:800; background:rgba(14,165,233,0.1); color:#0ea5e9; padding:2px 6px; border-radius:8px; text-transform:uppercase; letter-spacing:0.5px; line-height:1.2;">${item.type}</span>
                            </div>

                            <!-- Button Top Right -->
                            <button class="btn-blue" onclick="addBarcodzToSpool('${item.name.replace(/'/g,"\\'").replace(/"/g,'&quot;')}', '${item.slug}', '${item.icon}', '${item.type}')" style="padding:4px 8px; font-size:10px;"><i style="margin-right:2px; font-style:normal;">➕</i> Spool</button>
                        </div>

                        <!-- Content -->
                        <div style="padding-top:4px; border-top:1px solid var(--border-color); text-align:center;">
                            <div style="font-size:13px; font-weight:900; color:var(--text-heading); margin-bottom:2px; line-height:1.2; word-break:break-word;">${item.name}</div>
                            <div style="font-size:9px; font-family:monospace; color:var(--text-muted); padding:2px 0; word-break:break-all;">${item.slug}</div>
                            ${item.desc ? `<div style="font-size:10px; color:var(--text-muted); margin-top:2px; font-style:italic; line-height:1.2;">${item.desc}</div>` : ''}
                        </div>
                    </div>
                `;
            });

            html += `
                </div>
            </details>
            `;
        });

        // Push grid layout down into details elements
        grid.style.display = 'block';
        grid.innerHTML = html;
    } catch(e) { sysLog('Barcodz grid render error: ' + e.message, true); }
}

// ------------------------------------------------------------
// THERMAL BATCH PRINT SPOOLER
// ------------------------------------------------------------

window.barcodzSpoolQueue = [];

function addBarcodzToSpool(name, slug, icon, type) {
    let existing = window.barcodzSpoolQueue.find(x => x.slug === slug);
    if (existing) {
        existing.qty++;
    } else {
        window.barcodzSpoolQueue.push({ name, slug, icon, type, qty: 1 });
    }
    renderBarcodzSpool();
}

function updateSpoolItem(slug, amt) {
    let existing = window.barcodzSpoolQueue.find(x => x.slug === slug);
    if (!existing) return;
    
    existing.qty += amt;
    if (existing.qty <= 0) {
        window.barcodzSpoolQueue = window.barcodzSpoolQueue.filter(x => x.slug !== slug);
    }
    renderBarcodzSpool();
}

function clearBarcodzSpool() {
    window.barcodzSpoolQueue = [];
    renderBarcodzSpool();
}

window.spoolDragItemIndex = null;

function spoolDragStart(e, idx) {
    window.spoolDragItemIndex = idx;
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => { if(e.target) e.target.style.opacity = '0.5'; }, 0);
}

function spoolDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
}

function spoolDrop(e, targetIdx) {
    e.preventDefault();
    if (window.spoolDragItemIndex === null || window.spoolDragItemIndex === targetIdx) return;
    
    // Splice from old, insert to new
    const queue = window.barcodzSpoolQueue;
    const item = queue.splice(window.spoolDragItemIndex, 1)[0];
    queue.splice(targetIdx, 0, item);
    
    renderBarcodzSpool();
}

function spoolDragEnd(e) {
    if (e && e.target) e.target.style.opacity = '1';
    window.spoolDragItemIndex = null;
}

function setSpoolItemQty(slug, qty) {
    let amt = parseInt(qty, 10);
    if (isNaN(amt) || amt < 0) amt = 0;
    
    let existing = window.barcodzSpoolQueue.find(x => x.slug === slug);
    if (!existing) return;
    
    existing.qty = amt;
    if (existing.qty <= 0) {
        window.barcodzSpoolQueue = window.barcodzSpoolQueue.filter(x => x.slug !== slug);
    }
    renderBarcodzSpool();
}

function renderBarcodzSpool() {
    const lists = [document.getElementById('barcodzSpoolList'), document.getElementById('labelzSpoolList')].filter(Boolean);
    const counters = [document.getElementById('spoolTotalCount'), document.getElementById('labelzSpoolTotalCount')].filter(Boolean);
    if (lists.length === 0) return; // not rendered yet
    
    let totalQty = 0;
    let html = '';
    
    if (window.barcodzSpoolQueue.length === 0) {
        html = `
            <div class="empty-state" style="padding:40px 10px; opacity:0.6; text-align:center;">
                <div style="font-size:32px; margin-bottom:10px;">🛒</div>
                <div style="font-size:12px; color:var(--text-muted);">Spool is empty.<br>Add items from the directory.</div>
            </div>`;
    } else {
        window.barcodzSpoolQueue.forEach((item, index) => {
            totalQty += item.qty;
            html += `
                <div draggable="true" ondragstart="spoolDragStart(event, ${index})" ondragover="spoolDragOver(event)" ondrop="spoolDrop(event, ${index})" ondragend="spoolDragEnd(event)" style="background:var(--bg-input); border:1px solid var(--border-color); border-radius:6px; padding:6px 8px; display:grid; grid-template-columns:12px 20px minmax(0, 1fr) 40px 20px; align-items:center; gap:8px; cursor:grab; width:100%; box-sizing:border-box;" onmousedown="this.style.cursor='grabbing'" onmouseup="this.style.cursor='grab'">
                    
                    <div style="color:var(--text-muted); cursor:grab; font-size:12px; margin-right:-4px; user-select:none;">⋮⋮</div>
                    
                    <div style="font-size:16px; display:flex; justify-content:center;">${item.icon}</div>
                    
                    <div style="overflow:hidden;">
                        <div style="font-size:11px; font-weight:bold; color:var(--text-main); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${item.name}">${item.name}</div>
                        <div style="font-size:9px; font-family:monospace; color:var(--text-muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${item.slug}</div>
                    </div>
                    
                    <input type="number" min="0" value="${item.qty}" onchange="setSpoolItemQty('${item.slug}', this.value)" style="width:100%; height:24px; text-align:center; font-size:12px; font-weight:bold; border:1px solid var(--border-color); border-radius:4px; background:var(--bg-panel); color:var(--text-main); box-sizing:border-box; padding:0 2px;" />
                    
                    <button onclick="updateSpoolItem('${item.slug}', -999)" style="background:transparent; border:none; cursor:pointer; font-size:11px; opacity:0.6; padding:4px; display:flex; justify-content:center; align-items:center; width:100%; height:100%;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.6'" title="Remove from queue">❌</button>
                    
                </div>
            `;
        });
    }
    
    lists.forEach(list => list.innerHTML = html);
    counters.forEach(c => c.innerText = totalQty);
}

function executeBatchPrint() {
    if (window.barcodzSpoolQueue.length === 0) return alert("Print Spool is empty!");
    
    let activeSizeSelect = 'barcodzSizeSelect';
    const labelzPane = document.getElementById('paneFulfillzLabelz');
    if (labelzPane && labelzPane.style.display !== 'none') {
        activeSizeSelect = 'labelzSizeSelect';
    }
    
    const sizeSelect = document.getElementById(activeSizeSelect)?.value || '2.25x1.25';
    const typeSelect = (document.getElementById('barcodzTypeSelect')?.value || 'CODE128');
    const isQR = typeSelect === 'QR';
    const printArea = document.getElementById('printableBarcodeArea');
    if (!printArea) return alert("Printable area missing from DOM.");
    
    // Clear Area
    printArea.innerHTML = '';
    
    // Parse JSON injected value
    let pObj = {w: 4, h: 6, n: "Default Paper"};
    try { pObj = JSON.parse(sizeSelect); } catch(e) { sysLog('Barcodz size parse error: ' + e.message, true); }
    let pW = parseFloat(pObj.w);
    let pH = parseFloat(pObj.h);

    let pageCss = `@page { size: ${pW}in ${pH}in; margin: 0; }`;
    if (pageCss) {
        printArea.innerHTML = `<style>${pageCss}</style>`;
    }
    
    let totalInjected = 0;

    // Loop through each queued SKU
    window.barcodzSpoolQueue.forEach(item => {
        
        // Loop for the requested Quantity
        for (let i = 0; i < item.qty; i++) {
        
            const wrapper = document.createElement('div');
            // Give specific IDs to JSBarcode hook correctly
            const svgId = `print-bc-${item.slug}-${i}`;
            
            let shortNameLen = Math.floor(pW * 14);
            const shortName = item.name.length > shortNameLen ? item.name.substring(0, shortNameLen-2) + '...' : item.name;
            let fontSizeTitle = Math.max(6, Math.floor(pH * 7));
            let bcHeight = Math.max(0.4, pH * 0.7);
            
            if (pW >= 4 && pH >= 6) {
                wrapper.style.cssText = `width: ${pW}in; height: ${pH}in; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; box-sizing: border-box; padding: 0.25in; overflow: hidden; background: white; color: black; font-family: sans-serif; page-break-after: always;`;
                wrapper.innerHTML = `<div style="font-size:24pt; font-weight:900; line-height:1.2; margin-bottom:20px;">${item.name}</div>${isQR ? '<img' : '<svg'} id="${svgId}" style="${isQR ? 'width:2.5in; height:2.5in; object-fit:contain; margin:0 auto; display:block;' : 'width:100%; height:2.5in;'}">${isQR ? '' : '</svg>'}<div style="font-size:14pt; margin-top:20px; font-family:monospace;">${item.slug}</div>`;
            } else {
                wrapper.style.cssText = `width: ${pW}in; height: ${pH}in; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; box-sizing: border-box; padding: 0.05in; overflow: hidden; background: white; color: black; font-family: sans-serif; page-break-after: always;`;
                wrapper.innerHTML = `<div style="font-size:${fontSizeTitle}pt; font-weight:900; line-height:1; margin-bottom:2px;">${shortName}</div>${isQR ? '<img' : '<svg'} id="${svgId}" style="${isQR ? `width:${bcHeight}in; height:${bcHeight}in; object-fit:contain; margin:0 auto; display:block;` : `width:100%; height:${bcHeight}in;`}">${isQR ? '' : '</svg>'}`;
            }

            printArea.appendChild(wrapper);

            // Execute barcode rendering based on selected type
            if (isQR) {
                if (typeof bwipjs !== 'undefined') {
                    try {
                        const offC = document.createElement('canvas');
                        bwipjs.toCanvas(offC, { bcid: 'qrcode', text: item.slug, scale: 3 });
                        const imgEl = document.getElementById(svgId);
                        if (imgEl) imgEl.src = offC.toDataURL('image/png');
                    } catch(e) {
                        const imgEl = document.getElementById(svgId);
                        if (imgEl) imgEl.outerHTML = `<div style="color:red; font-size:10px; font-weight:bold; height:100%; display:flex; align-items:center; justify-content:center;">[INVALID QR]</div>`;
                    }
                }
            } else if (sizeSelect !== '1x1') {
                if (typeof JsBarcode !== 'undefined') {
                    try {
                        JsBarcode(`#${svgId}`, item.slug, {
                            format: typeSelect,
                            lineColor: "#000",
                            width: 2,
                            height: 40,
                            displayValue: true,
                            fontSize: 12,
                            margin: 0
                        });
                    } catch(e) {
                        const ele = document.getElementById(svgId);
                        if(ele) ele.outerHTML = `<div style="color:red; font-size:10px; font-weight:bold; height:100%; display:flex; align-items:center; justify-content:center;">[INVALID FORMAT:\n${typeSelect}]</div>`;
                    }
                }
            } else {
                // 1x1 size default = QR
                if (typeof bwipjs !== 'undefined') {
                    try {
                        const offC = document.createElement('canvas');
                        bwipjs.toCanvas(offC, { bcid: 'qrcode', text: item.slug, scale: 3 });
                        const ele = document.getElementById(svgId);
                        if (ele) ele.src = offC.toDataURL('image/png');
                    } catch(e) {
                        const ele = document.getElementById(svgId);
                        if (ele) ele.outerHTML = `<div style="color:red; font-size:10px; font-weight:bold;">[INVALID QR]</div>`;
                    }
                }
            }
            
            totalInjected++;
        }
    });

    if (totalInjected === 0) return;

    // Force browser print overlay async so engines can run
    setTimeout(() => {
        window.print();
        
        // Execute Inventory Consumption API call right after print action triggers
        consumeThermalMedia(totalInjected, activeSizeSelect);
        
        setTimeout(() => {
            printArea.innerHTML = '';
            // Auto Clear Queue as defined in standard operating logic
            clearBarcodzSpool();
        }, 1500); // cleanup delay allowing OS to snapshot
    }, 750); // Increased DOM paint delay to guarantee async QR canvas finishes generating before Print Snapshot!
}

async function consumeThermalMedia(qty, activeSizeSelectId) {
    if(typeof inventoryDB === 'undefined' || typeof supabaseClient === 'undefined') return;
    
    try {
        const selectEl = document.getElementById(activeSizeSelectId);
        if(!selectEl) return;
        const sizeText = selectEl.options[selectEl.selectedIndex].text;
        
        let activeKey = sizeText;
        if(typeof catalogCache !== 'undefined') {
            const foundKey = Object.keys(catalogCache).find(k => catalogCache[k].neoName === sizeText);
            if(foundKey) activeKey = foundKey;
            else activeKey = `${sizeText}::::::(Grouped Raw Items):::(Mixed Specs)`;
        } else {
            activeKey = `${sizeText}::::::(Grouped Raw Items):::(Mixed Specs)`;
        }
        
        // Ensure standard Raw Material tracking exists for this item
        if(!inventoryDB[activeKey]) {
             inventoryDB[activeKey] = { consumed_qty: 0, manual_adjustment: 0, produced_qty: 0, sold_qty: 0, min_stock: 0, scrap_qty: 0, prototype_consumed_qty: 0, assembly_consumed_qty: 0, production_consumed_qty: 0, prototype_produced_qty: 0 };
        }
        
        // Log thermal printing as 'production_consumed_qty' and add it to the master 'consumed_qty'
        inventoryDB[activeKey].production_consumed_qty += qty;
        inventoryDB[activeKey].consumed_qty += qty;
        
        const payloads = [];
        
        // 1. Array payload for Raw Media tracking
        payloads.push({
             item_key: activeKey,
             consumed_qty: inventoryDB[activeKey].consumed_qty || 0,
             manual_adjustment: inventoryDB[activeKey].manual_adjustment || 0,
             produced_qty: inventoryDB[activeKey].produced_qty || 0,
             sold_qty: inventoryDB[activeKey].sold_qty || 0,
             min_stock: inventoryDB[activeKey].min_stock || 0,
             scrap_qty: inventoryDB[activeKey].scrap_qty || 0,
             prototype_consumed_qty: inventoryDB[activeKey].prototype_consumed_qty || 0,
             assembly_consumed_qty: inventoryDB[activeKey].assembly_consumed_qty || 0,
             production_consumed_qty: inventoryDB[activeKey].production_consumed_qty,
             prototype_produced_qty: inventoryDB[activeKey].prototype_produced_qty || 0
        });
        
        // 2. Loop through spool queue to build produced labels
        if (window.barcodzSpoolQueue && window.barcodzSpoolQueue.length > 0) {
            window.barcodzSpoolQueue.forEach(item => {
                // If it's registered as a custom label in productsDB, track its produced stock
                if (typeof productsDB !== 'undefined' && productsDB[item.name] && productsDB[item.name].is_label) {
                    let labelKey = `RECIPE:::${item.name}`;
                    if (!inventoryDB[labelKey]) {
                        inventoryDB[labelKey] = { consumed_qty: 0, manual_adjustment: 0, produced_qty: 0, sold_qty: 0, min_stock: 0, scrap_qty: 0, prototype_consumed_qty: 0, assembly_consumed_qty: 0, production_consumed_qty: 0, prototype_produced_qty: 0 };
                    }
                    // Add produced quantity from the spool
                    inventoryDB[labelKey].produced_qty += item.qty;
                    
                    payloads.push({
                         item_key: labelKey,
                         consumed_qty: inventoryDB[labelKey].consumed_qty,
                         manual_adjustment: inventoryDB[labelKey].manual_adjustment,
                         produced_qty: inventoryDB[labelKey].produced_qty,
                         sold_qty: inventoryDB[labelKey].sold_qty,
                         min_stock: inventoryDB[labelKey].min_stock,
                         scrap_qty: inventoryDB[labelKey].scrap_qty,
                         prototype_consumed_qty: inventoryDB[labelKey].prototype_consumed_qty,
                         assembly_consumed_qty: inventoryDB[labelKey].assembly_consumed_qty,
                         production_consumed_qty: inventoryDB[labelKey].production_consumed_qty,
                         prototype_produced_qty: inventoryDB[labelKey].prototype_produced_qty
                    });
                }
            });
        }
        
        const { error } = await supabaseClient.from('inventory_consumption').upsert(payloads, {onConflict:'item_key'});
        if(error) throw error;
        
        sysLog(`Consumed ${qty}x ${sizeText} via Spool.`);
        if(typeof renderInventoryTable === 'function') renderInventoryTable();
        if(typeof renderAnalyticsDashboard === 'function' && document.getElementById('paneSalezAnalyticz')?.style.display === 'flex') renderAnalyticsDashboard();
    } catch(err) {
        sysLog(`Failed to log thermal consumption: ${err.message}`, true);
    }
}

// Global Event Hook to build index once on first open
document.addEventListener('DOMContentLoaded', () => {
    // Override the general switchTab function if necessary or just hook into Fulfillz load
    const origSwitchTab = typeof switchTab === 'function' ? switchTab : null;
    window.switchTab = function(tabId) {
        if (origSwitchTab) origSwitchTab(tabId);
        if (tabId === 'fulfillzhub') {
            // Optional lazy init
            if(barcodzCache.length === 0) buildBarcodzCache();
        }
    }
});
