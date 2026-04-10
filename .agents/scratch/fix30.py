import sys

file_path = "c:\\Users\\Chriviper\\OneDrive - Neogleamz\\Accounting - General\\Expenses\\GitHub\\neogleamz.github.io\\sales-module.js"

with open(file_path, "r", encoding="utf-8") as f:
    text = f.read()

# 1. Roll back the isolating IIFE
old_iife = """                // --- AUTOMATED EXCHANGE DETECTION ---
                // If the order carries an outstanding balance (Shopify UI edits heavily trigger this):
                if (oBal > 0) {
                    // The replacement item injected by the agent almost always drops as a $0.00 line item.
                    if (lPrice === 0) return 'Replacement / Warranty';
                    // The original item they paid for will be left unshipped.
                    if (lFulfill === 'pending' || lFulfill === 'unfulfilled') return 'Pre-Ship Exchange';
                }"""

if old_iife in text:
    text = text.replace(old_iife, "")

# 2. Inject Group-Level Exchange Deduction rules
old_aggregation = """    // --- AUTOMATED EXCHANGE LOGIC & AGGREGATION ---
    let orderGroups = {};
    a.forEach(x => { if(!orderGroups[x.order_id]) orderGroups[x.order_id] = []; orderGroups[x.order_id].push(x); });"""

new_aggregation = """    // --- AUTOMATED EXCHANGE LOGIC & AGGREGATION ---
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

if old_aggregation in text:
    text = text.replace(old_aggregation, new_aggregation)
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(text)
    print("Multi-row aggregation exchange deduction successfully applied!")
else:
    print("Could not find the target aggregation block.")
