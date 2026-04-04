// ============================================================
// BARCODZ MODULE — Neogleamz Label Printer Engine
// ============================================================

let barcodzCache = [];

function buildBarcodzCache() {
    barcodzCache = [];
    
    // 1. Gather all Finished Goods & Recipes (Makerz)
    if (typeof productsDB !== 'undefined') {
        Object.keys(productsDB).forEach(pName => {
            const is3D = !!(productsDB[pName].is_3d_print);
            const isSub = !!(typeof isSubassemblyDB !== 'undefined' && isSubassemblyDB[pName]);
            const typeLabel = is3D ? '3D Print' : (isSub ? 'Sub-Assembly' : 'Retail Product');
            
            barcodzCache.push({
                name: pName,
                slug: getItemBarcodeValue(pName),
                type: typeLabel,
                icon: is3D ? "🖨️" : (isSub ? "⚙️" : "📦"),
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
    
    // Alphabetical sort by product name
    barcodzCache.sort((a,b) => a.name.localeCompare(b.name));
    
    // Update KPI counter
    const kpi = document.getElementById('kpiBarcodzCount');
    if (kpi) kpi.innerText = barcodzCache.length;
}

function renderBarcodzGrid() {
    if (barcodzCache.length === 0) buildBarcodzCache();
    
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
    
    const typeOrder = ['Retail Product', 'Sub-Assembly', '3D Print', 'Raw Material'];
    const groupsToRender = Object.keys(grouped).sort((a,b) => typeOrder.indexOf(a) - typeOrder.indexOf(b));

    let html = '';
    groupsToRender.forEach(type => {
        html += `
        <details open style="margin-bottom:20px; background:rgba(0,0,0,0.1); border-radius:12px; border:1px solid var(--border-color); grid-column: 1 / -1;">
            <summary style="padding:14px 20px; cursor:pointer; font-weight:bold; font-size:14px; text-transform:uppercase; color:var(--text-heading); list-style:none; display:flex; align-items:center; border-bottom:1px solid var(--border-color); background:var(--bg-panel); border-radius:12px 12px 0 0;">
                <span style="font-size:18px; margin-right:10px;">${grouped[type][0].icon}</span> 
                ${type}s <span style="margin-left:10px; background:var(--bg-input); padding:2px 8px; border-radius:12px; font-size:10px; color:var(--text-muted);">${grouped[type].length}</span>
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
                        <div style="text-align:center;">
                            <span style="font-size:8px; font-weight:800; background:rgba(14,165,233,0.1); color:#0ea5e9; padding:2px 6px; border-radius:8px; text-transform:uppercase; letter-spacing:0.5px;">${item.type}</span>
                        </div>
                        
                        <!-- Button Top Right -->
                        <button onclick="addBarcodzToSpool('${item.name.replace(/'/g,"\\'").replace(/"/g,'&quot;')}', '${item.slug}', '${item.icon}', '${item.type}')" style="background:var(--primary-color); color:white; border:none; padding:4px 8px; border-radius:4px; font-weight:bold; font-size:10px; cursor:pointer;"><i style="margin-right:2px;">➕</i> Spool</button>
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
    
    // We remove the static CSS grid on `barcodzGrid` since we pushed it down into the details elements
    grid.style.display = 'block';
    
    grid.innerHTML = html;
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

function renderBarcodzSpool() {
    const list = document.getElementById('barcodzSpoolList');
    const counter = document.getElementById('spoolTotalCount');
    if (!list) return; // not rendered yet
    
    let totalQty = 0;
    
    if (window.barcodzSpoolQueue.length === 0) {
        list.innerHTML = `
            <div class="empty-state" style="padding:40px 10px; opacity:0.6; text-align:center;">
                <div style="font-size:32px; margin-bottom:10px;">🛒</div>
                <div style="font-size:12px; color:var(--text-muted);">Spool is empty.<br>Add items from the directory.</div>
            </div>`;
    } else {
        let html = '';
        window.barcodzSpoolQueue.forEach(item => {
            totalQty += item.qty;
            html += `
                <div style="background:var(--bg-input); border:1px solid var(--border-color); border-radius:8px; padding:10px; display:flex; flex-direction:column; gap:8px;">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                        <div style="font-size:16px;">${item.icon}</div>
                        <div style="font-size:8px; font-weight:bold; color:var(--text-muted); background:var(--bg-panel); padding:2px 6px; border-radius:6px; border:1px solid var(--border-color); text-transform:uppercase;">${item.type}</div>
                    </div>
                    
                    <div>
                        <div style="font-size:12px; font-weight:bold; color:var(--text-main); line-height:1.2; margin-bottom:2px;">${item.name}</div>
                        <div style="font-size:9px; font-family:monospace; color:var(--text-muted); padding:2px 0;">${item.slug}</div>
                    </div>
                    
                    <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid var(--border-color); padding-top:6px;">
                        <button class="icon-btn" style="color:#ef4444;" onclick="updateSpoolItem('${item.slug}', -999)">🗑️</button>
                        
                        <div style="display:flex; align-items:center; background:var(--bg-panel); border:1px solid var(--border-color); border-radius:6px; overflow:hidden;">
                            <button onclick="updateSpoolItem('${item.slug}', -1)" style="width:24px; height:24px; background:transparent; border:none; cursor:pointer; color:var(--text-main); font-weight:bold;">-</button>
                            <div style="width:30px; text-align:center; font-size:12px; font-weight:bold; border-left:1px solid var(--border-color); border-right:1px solid var(--border-color); line-height:24px;">${item.qty}</div>
                            <button onclick="updateSpoolItem('${item.slug}', 1)" style="width:24px; height:24px; background:transparent; border:none; cursor:pointer; color:var(--text-main); font-weight:bold;">+</button>
                        </div>
                    </div>
                </div>
            `;
        });
        list.innerHTML = html;
    }
    
    if (counter) counter.innerText = totalQty;
}

function executeBatchPrint() {
    if (window.barcodzSpoolQueue.length === 0) return alert("Print Spool is empty!");
    
    const sizeSelect = document.getElementById('barcodzSizeSelect')?.value || '2.25x1.25';
    const printArea = document.getElementById('printableBarcodeArea');
    if (!printArea) return alert("Printable area missing from DOM.");
    
    // Clear Area
    printArea.innerHTML = '';
    
    let totalInjected = 0;

    // Loop through each queued SKU
    window.barcodzSpoolQueue.forEach(item => {
        
        // Loop for the requested Quantity
        for (let i = 0; i < item.qty; i++) {
        
            const wrapper = document.createElement('div');
            // Give specific IDs to JSBarcode hook correctly
            const svgId = `print-bc-${item.slug}-${i}`;
            
            if (sizeSelect === '2.25x1.25') {
                wrapper.style.cssText = `width: 2.25in; height: 1.25in; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; box-sizing: border-box; padding: 0.05in; overflow: hidden; background: white; color: black; font-family: sans-serif; page-break-after: always;`;
                const shortName = item.name.length > 28 ? item.name.substring(0, 26) + '...' : item.name;
                wrapper.innerHTML = `<div style="font-size:8pt; font-weight:900; line-height:1; margin-bottom:2px;">${shortName}</div><svg id="${svgId}" style="width:100%; height:0.8in;"></svg>`;
            } 
            else if (sizeSelect === '1x1') {
                wrapper.style.cssText = `width: 1in; height: 1in; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; box-sizing: border-box; padding: 0.02in; overflow: hidden; background: white; color: black; font-family: sans-serif; page-break-after: always;`;
                wrapper.innerHTML = `<canvas id="${svgId}" style="width:0.75in; height:0.75in;"></canvas><div style="font-size:5pt; font-weight:800; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; width:100%;">${item.name}</div>`;
            }
            else if (sizeSelect === '3x1') {
                wrapper.style.cssText = `width: 3in; height: 1in; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; box-sizing: border-box; padding: 0.1in; overflow: hidden; background: white; color: black; font-family: sans-serif; page-break-after: always;`;
                wrapper.innerHTML = `<div style="font-size:10pt; font-weight:900; line-height:1; margin-bottom:4px;">${item.name}</div><svg id="${svgId}" style="width:100%; height:0.6in;"></svg>`;
            }
            else {
                wrapper.style.cssText = `width: 100%; height: auto; display: flex; flex-direction: column; align-items: flex-start; padding: 20px; background: white; color: black;`;
                wrapper.innerHTML = `<div style="font-size:18px; font-weight:bold; margin-bottom:10px;">${item.name}</div><svg id="${svgId}" style="max-width:300px; height:100px; padding:10px; border:1px dashed #ccc;"></svg>`;
            }

            printArea.appendChild(wrapper);

            // Execute SVG Generation Inline immediately on the appended node
            if (sizeSelect !== '1x1') {
                if (typeof JsBarcode !== 'undefined') {
                    JsBarcode(`#${svgId}`, item.slug, {
                        format: "code128",
                        lineColor: "#000",
                        width: 2,
                        height: 40,
                        displayValue: true,
                        fontSize: 12,
                        margin: 0
                    });
                }
            } else {
                if (typeof QRCode !== 'undefined') {
                    QRCode.toCanvas(document.getElementById(svgId), item.slug, { margin: 1, width: 80 }, function (err) { if(err) console.error(err); });
                }
            }
            
            totalInjected++;
        }
    });

    if (totalInjected === 0) return;

    // Force browser print overlay async so engines can run
    setTimeout(() => {
        window.print();
        setTimeout(() => {
            printArea.innerHTML = '';
            // Auto Clear Queue as defined in standard operating logic
            clearBarcodzSpool();
        }, 1500); // cleanup delay allowing OS to snapshot
    }, 200);
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
