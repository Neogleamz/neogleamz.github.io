import sys

file_path = "c:\\Users\\Chriviper\\OneDrive - Neogleamz\\Accounting - General\\Expenses\\GitHub\\neogleamz.github.io\\sales-module.js"

with open(file_path, "r", encoding="utf-8") as f:
    text = f.read()

import re

# Remove any existing detectors
text = re.sub(r'// DYNAMIC MULTI-ITEM EXCHANGE DETECTOR.*?\}\);\n\n    // DEDUPLICATE OUTBOUND SHIPPING OVERHEAD FOR MULTI-ITEM ORDERS', r'// DEDUPLICATE OUTBOUND SHIPPING OVERHEAD FOR MULTI-ITEM ORDERS', text, flags=re.DOTALL)
text = re.sub(r'// DYNAMIC MULTI-ITEM EXCHANGE DETECTOR.*?(let a = pendingSalesRows\.map)', r'\1', text, flags=re.DOTALL)


# Accurately inject into executeSalesSync BEFORE salesPayload mapping
target = """        sysLog(`Pushing ${pendingSalesRows.length} sales...`); setMasterStatus("Syncing Sales...", "mod-working"); setSysProgress(60, 'working');

        // --- POWERED BY MASTER ENGINE ---"""

proper_injector = """        sysLog(`Pushing ${pendingSalesRows.length} sales...`); setMasterStatus("Syncing Sales...", "mod-working"); setSysProgress(60, 'working');

        // DYNAMIC MULTI-ITEM EXCHANGE DETECTOR (Pre-Map Mutation)
        let preGroups = {};
        pendingSalesRows.forEach(x => { if(!preGroups[x.order_id]) preGroups[x.order_id] = []; preGroups[x.order_id].push(x); });
        Object.values(preGroups).forEach(group => {
            if (group.length > 1) {
                let bal = parseFloat(group[0]['Outstanding Balance'] || 0) || parseFloat(group.find(x=>x["Outstanding Balance"])?.["Outstanding Balance"] || 0);
                if (bal > 0) {
                    let orig = group[0];
                    let repl = group[group.length - 1]; 
                    if (orig && repl) {
                        let oFulfill = String(orig.lineitem_fulfillment_status || "").trim().toLowerCase();
                        let rFulfill = String(repl.lineitem_fulfillment_status || "").trim().toLowerCase();
                        if ((oFulfill === 'pending' || oFulfill === 'unfulfilled') && (rFulfill === 'fulfilled' || rFulfill === '')) {
                            orig.transaction_type = 'Pre-Ship Exchange';
                            repl.transaction_type = 'Exchange Replacement';
                        } else if (oFulfill === 'fulfilled' && (rFulfill === 'fulfilled' || rFulfill === '')) {
                            orig.transaction_type = 'Post-Ship Exchange';
                            repl.transaction_type = 'Exchange Replacement';
                        }
                    }
                }
            }
        });

        // --- POWERED BY MASTER ENGINE ---"""

if target in text:
    text = text.replace(target, proper_injector)
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(text)
    print("SUCCESS: Core detector firmly injected at the top of executeSalesSync!")
else:
    print("FATAL: Target lock missed.")
