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
                    icon: "🧵",
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
    
    let html = '';
    filtered.forEach((item, idx) => {
        html += `
            <div style="background:var(--bg-panel); border:1px solid var(--border-color); border-radius:10px; padding:16px; display:flex; flex-direction:column; justify-content:space-between; box-shadow:0 4px 6px rgba(0,0,0,0.1);">
                <div>
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
                        <div style="font-size:20px;">${item.icon}</div>
                        <div style="font-size:9px; font-weight:800; background:rgba(14,165,233,0.1); color:#0ea5e9; padding:2px 8px; border-radius:12px; text-transform:uppercase;">${item.type}</div>
                    </div>
                    <div style="font-size:14px; font-weight:900; color:var(--text-heading); margin-bottom:4px; line-height:1.3;">${item.name}</div>
                    <div style="font-size:10px; font-family:monospace; color:var(--text-muted); background:var(--bg-input); padding:4px; border-radius:4px; word-break:break-all;">${item.slug}</div>
                    ${item.desc ? `<div style="font-size:11px; color:var(--text-muted); margin-top:6px; font-style:italic;">${item.desc}</div>` : ''}
                </div>
                
                <div style="margin-top:16px; display:flex; gap:8px;">
                    <button onclick="triggerPrintBarcodz('${item.name}', '${item.slug}')" style="background:#10b981; color:white; border:none; padding:8px 12px; border-radius:6px; font-weight:bold; font-size:12px; cursor:pointer; flex:1; transition:0.2s;"><i style="margin-right:4px;">🖨️</i> Print Label</button>
                </div>
            </div>
        `;
    });
    
    grid.innerHTML = html;
}

// ------------------------------------------------------------
// THERMAL PRINTING LOGIC
// ------------------------------------------------------------
function triggerPrintBarcodz(itemName, slugCode) {
    const sizeSelect = document.getElementById('barcodzSizeSelect')?.value || '2.25x1.25';
    const printArea = document.getElementById('printableBarcodeArea');
    if (!printArea) return alert("Printable area missing from DOM.");
    
    // Clear area
    printArea.innerHTML = '';
    
    // Generate Layout wrapper based on size
    const wrapper = document.createElement('div');
    
    if (sizeSelect === '2.25x1.25') {
        // Typical Dymo 30334 (2.25" x 1.25") or generic equivalent
        wrapper.style.cssText = `
            width: 2.25in;
            height: 1.25in;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            text-align: center;
            box-sizing: border-box;
            padding: 0.05in;
            overflow: hidden;
            background: white;
            color: black;
            font-family: sans-serif;
            page-break-after: always;
        `;
        
        // Truncate name if it's too insanely long for the top margin
        const shortName = itemName.length > 28 ? itemName.substring(0, 26) + '...' : itemName;
        
        wrapper.innerHTML = `
            <div style="font-size:8pt; font-weight:900; line-height:1; margin-bottom:2px;">${shortName}</div>
            <svg id="print-bc-svg" style="width:100%; height:0.8in;"></svg>
        `;
    } 
    else if (sizeSelect === '1x1') {
        // Very small square QR
        wrapper.style.cssText = `
            width: 1in;
            height: 1in;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            text-align: center;
            box-sizing: border-box;
            padding: 0.02in;
            overflow: hidden;
            background: white;
            color: black;
            font-family: sans-serif;
            page-break-after: always;
        `;
        // Instead of 1D barcode which is too long, we generate a QR code for square labels
        wrapper.innerHTML = `
            <canvas id="print-bc-qr" style="width:0.75in; height:0.75in;"></canvas>
            <div style="font-size:5pt; font-weight:800; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; width:100%;">${itemName}</div>
        `;
    }
    else if (sizeSelect === '3x1') {
        // Standard wide address/inventory label
        wrapper.style.cssText = `
            width: 3in;
            height: 1in;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            text-align: center;
            box-sizing: border-box;
            padding: 0.1in;
            overflow: hidden;
            background: white;
            color: black;
            font-family: sans-serif;
            page-break-after: always;
        `;
        
        wrapper.innerHTML = `
            <div style="font-size:10pt; font-weight:900; line-height:1; margin-bottom:4px;">${itemName}</div>
            <svg id="print-bc-svg" style="width:100%; height:0.6in;"></svg>
        `;
    }
    else {
        // A4 Dump
        wrapper.style.cssText = `
            width: 100%;
            height: auto;
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            padding: 20px;
            background: white;
            color: black;
        `;
        wrapper.innerHTML = `
            <div style="font-size:18px; font-weight:bold; margin-bottom:10px;">${itemName}</div>
            <svg id="print-bc-svg" style="max-width:300px; height:100px; padding:10px; border:1px dashed #ccc;"></svg>
        `;
    }

    printArea.appendChild(wrapper);

    // Apply Code-128 via jsBarcode if needed
    if (sizeSelect !== '1x1') {
        if (typeof JsBarcode !== 'undefined') {
            JsBarcode("#print-bc-svg", slugCode, {
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
        // Apply QR Core
        if (typeof QRCode !== 'undefined') {
            QRCode.toCanvas(document.getElementById('print-bc-qr'), slugCode, { margin: 1, width: 80 }, function (err) {
                if(err) console.error(err);
            });
        }
    }

    // Force browser print overlay async so engines can run
    setTimeout(() => {
        window.print();
        setTimeout(() => {
            printArea.innerHTML = '';
        }, 1000); // cleanup
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
