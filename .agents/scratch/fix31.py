import sys

file_path = "c:\\Users\\Chriviper\\OneDrive - Neogleamz\\Accounting - General\\Expenses\\GitHub\\neogleamz.github.io\\sales-module.js"

with open(file_path, "r", encoding="utf-8") as f:
    text = f.read()

# 1. Remove the detector from after .map()
bad_detector = """    // --- AUTOMATED EXCHANGE LOGIC & AGGREGATION ---
    let orderGroups = {};
    a.forEach(x => { if(!orderGroups[x.order_id]) orderGroups[x.order_id] = []; orderGroups[x.order_id].push(x); });

    // DYNAMIC MULTI-ITEM EXCHANGE DETECTOR
    Object.values(orderGroups).forEach(group => {
        if (group.length > 1) {
            let bal = parseFloat(group[0]['Outstanding Balance'] || 0) || parseFloat(group.find(x=>x.balance)?.balance || 0);
            if (bal > 0) {
                // Determine original vs replacement chronologically (Shopify lists original first)
                let orig = group[0];
                let repl = group[group.length - 1]; // Assume last item is replacement

                if (orig && repl) {
                    let oFulfill = String(orig.lineitem_fulfillment_status || "").trim().toLowerCase();
                    let rFulfill = String(repl.lineitem_fulfillment_status || "").trim().toLowerCase();
                    
                    if ((oFulfill === 'pending' || oFulfill === 'unfulfilled') && (rFulfill === 'fulfilled' || rFulfill === '')) {
                        orig.transaction_type = 'Pre-Ship Exchange';
                        repl.transaction_type = 'Replacement / Warranty';
                        orig.isCostOnlyItem = false;
                        repl.isCostOnlyItem = true;
                    } 
                    else if (oFulfill === 'fulfilled' && (rFulfill === 'fulfilled' || rFulfill === '')) {
                        orig.transaction_type = 'Post-Ship Exchange';
                        repl.transaction_type = 'Replacement / Warranty';
                        repl.isCostOnlyItem = true;
                    }
                }
            }
        }
    });"""

clean_aggregation = """    // --- AUTOMATED EXCHANGE LOGIC & AGGREGATION ---
    let orderGroups = {};
    a.forEach(x => { if(!orderGroups[x.order_id]) orderGroups[x.order_id] = []; orderGroups[x.order_id].push(x); });"""

if bad_detector in text:
    text = text.replace(bad_detector, clean_aggregation)

# 2. Add it before the .map()!
insert_targetLine = """    let a = pendingSalesRows.map(x => {"""
new_pre_loop = """    // DYNAMIC MULTI-ITEM EXCHANGE DETECTOR (Pre-Map Mutation)
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
                        repl.transaction_type = 'Replacement / Warranty';
                    } else if (oFulfill === 'fulfilled' && (rFulfill === 'fulfilled' || rFulfill === '')) {
                        orig.transaction_type = 'Post-Ship Exchange';
                        repl.transaction_type = 'Replacement / Warranty';
                    }
                }
            }
        }
    });

    let a = pendingSalesRows.map(x => {"""

text = text.replace(insert_targetLine, new_pre_loop)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(text)
print("Detector safely shifted BEFORE the map phase!")
