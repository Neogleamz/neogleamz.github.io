const fs = require('fs');

// Mock data
const aliasDB = {
  "SK8Lytz HALOZ": "Haloz",
  "NG-3090-SK8Lytz HALOZ": "Haloz",
  "NG-0488-Bla-On": null,
  "NG-2567-Dar-On": null
};

const aliasMetadataDB = {
  "SK8Lytz HALOZ": { barcode_value: "199043262", is_primary: true, is_shopify_synced: false },
  "NG-3090-SK8Lytz HALOZ": { barcode_value: "954170281", is_primary: false, is_shopify_synced: true },
  "NG-0488-Bla-On": { barcode_value: "893351297", is_primary: false, is_shopify_synced: true },
  "NG-2567-Dar-On": { barcode_value: "251345793", is_primary: false, is_shopify_synced: true }
};

const expandedAliasSkus = new Set();

function testRender() {
    let entries = Object.entries(aliasDB);
    let h = "";
    
    // Filter active mappings (only non-null recipes)
    let activeEntries = entries.filter(([sku, recipe]) => recipe !== null && recipe !== undefined && recipe !== '');
    console.log('Unfiltered entries count:', entries.length);
    console.log('Filtered active entries count:', activeEntries.length);
    
    entries.forEach(([sku, recipe]) => {
        let keyStr = String(sku);
        let valStr = String(recipe);
        let isPrimary = aliasMetadataDB[sku] ? !!aliasMetadataDB[sku].is_primary : false;
        let isExpanded = expandedAliasSkus ? expandedAliasSkus.has(sku) : false;
        let barcodeVal = aliasMetadataDB[sku] ? (aliasMetadataDB[sku].barcode_value || "") : "";
        
        const aliasesForRecipe = Object.keys(aliasDB).filter(s => aliasDB[s] === valStr);
        const aliasCount = aliasesForRecipe.length;
        const countBadge = aliasCount > 1 ? `<i style="opacity:0.6; margin-right:4px;">+${aliasCount}</i>` : '';
        
        h += `<div style="display:flex; flex-direction:column; background:rgba(0,0,0,0.25); border:1px solid rgba(45, 212, 191, 0.2); border-left:4px solid #f97316; border-radius:8px; margin-bottom:8px; width:100%; box-sizing:border-box; overflow:hidden;">
            <!-- Card Header (Toggle Expansion on Click) -->
            <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 15px; gap:15px; cursor:pointer; user-select:none;" data-click="click_toggleAliasCardExpand" data-sku="${sku.replace(/'/g, "\\'")}">
                <div style="display:flex; align-items:center; gap:8px; flex:1; min-width:0;">
                    <span title="Toggle Primary Print Template" data-click="click_togglePrimaryAliasMapping" data-sku="${sku.replace(/'/g, "\\'")}" style="cursor:pointer; font-size:18px; color: ${isPrimary ? '#eab308' : '#4b5563'}; transition: transform 0.1s; display: inline-block; position:relative; z-index:2;" onmouseover="this.style.transform='scale(1.25)'" onmouseout="this.style.transform='scale(1)'">★</span>
                    <div style="display:flex; flex-direction:column; gap:4px; flex:1; min-width:0;">
                        <span style="font-family:'Outfit', sans-serif; font-size:14px; font-weight:800; color:#f8fafc; word-break:break-word; line-height:1.2;">${keyStr}</span> 
                        <span style="font-family:'JetBrains Mono', monospace; font-size:12px; color:#f97316; font-weight:700; word-break:break-word; line-height:1.2;">${countBadge}${valStr}</span>
                    </div>
                </div>
                <div style="display:flex; align-items:center; gap:12px;">
                    <button title="Remove Mapping" class="btn-unlink-alias" data-click="click_removeAliasMapping" data-sku="${sku.replace(/'/g, "\\'")}" style="flex: 0 0 auto; width: auto !important; max-width: 100px; cursor:pointer; font-size:11px; padding:8px 14px; border-radius:6px; font-weight:900; display:flex; justify-content:center; align-items:center; position:relative; z-index:2;">UNLINK</button>
                    <span style="color:var(--text-muted); font-size:12px; transition: transform 0.2s; transform: ${isExpanded ? 'rotate(180deg)' : 'rotate(0deg)'}; display:inline-block;">▼</span>
                </div>
            </div>
        </div>`;
    });
    
    console.log("HTML length:", h.length);
}

testRender();
