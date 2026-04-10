import sys

file_path = "c:\\Users\\Chriviper\\OneDrive - Neogleamz\\Accounting - General\\Expenses\\GitHub\\neogleamz.github.io\\sales-module.js"

with open(file_path, "r", encoding="utf-8") as f:
    text = f.read()

# 1. ADD 'Cancelled' to transaction type logic
old_trans = """                if (fStat.toLowerCase() === 'refunded') return 'Refund';
                if (fStat.toLowerCase() === 'partially_refunded') {
                    if (lFulfill === 'pending' || lFulfill === 'unfulfilled' || lFulfill === 'restocked') return 'Refund';
                }"""

new_trans = """                if (fStat.toLowerCase() === 'refunded') {
                    if (lFulfill === 'pending' || lFulfill === 'unfulfilled') return 'Cancelled';
                    return 'Refund';
                }
                if (fStat.toLowerCase() === 'partially_refunded') {
                    if (lFulfill === 'pending' || lFulfill === 'unfulfilled') return 'Cancelled';
                    return 'Refund';
                }"""
text = text.replace(old_trans, new_trans)

# 2. Add 'Cancelled' into the DB Mapping Net zero-out safely
old_net = """            let actualShipCost = type === 'Pre-Ship Exchange' ? 0 : 
                                 type === 'IGNORE' ? 0 :
                                 type === 'NEEDS ATTENTION' ? 0 :
                                 (s > 0 ? s : LOCAL_SHIP);
            
            let isCostOnlyItem = (type === 'Gift' || type === 'Warranty' || type === 'NEEDS ATTENTION' || type === 'IGNORE');
            let shipRev = isCostOnlyItem ? 0 : parseFloat(r.shipping || 0);
            let taxRev = isCostOnlyItem ? 0 : parseFloat(r.taxes || 0);
            let disc = isCostOnlyItem ? 0 : parseFloat(r.discount_amount || 0);
            
            let rawNet = getHistoricalNetProfit(gross, shipRev, taxRev, disc, actualShipCost, r.internal_recipe_name, r.qty_sold, r["Source"]);
            let refAmt = parseFloat(r.refunded_amount) || 0;
            
            let net = rawNet; 
            
            if (type === 'IGNORE' || type === 'NEEDS ATTENTION') net = 0;
            if (type === 'Pre-Ship Exchange') net += getEngineTrueCogs(r.internal_recipe_name); // Re-add the true COGS (engine deducted it, but we didn't physically ship this)
            if (isCostOnlyItem) net = 0 - actualShipCost - cogs; // Complete loss"""

new_net = """            let actualShipCost = type === 'Pre-Ship Exchange' ? 0 : 
                                 type === 'IGNORE' ? 0 :
                                 type === 'Cancelled' ? 0 :
                                 type === 'NEEDS ATTENTION' ? 0 :
                                 (s > 0 ? s : LOCAL_SHIP);
            
            let isCostOnlyItem = (type === 'Gift' || type === 'Warranty' || type === 'NEEDS ATTENTION' || type === 'IGNORE' || type === 'Cancelled');
            
            if (type === 'Cancelled') {
                 // Zero-out purely voided unfulfilled transactions natively
                 cogs = 0;
                 fee = 0;
                 actualShipCost = 0;
            }
            
            let shipRev = isCostOnlyItem ? 0 : parseFloat(r.shipping || 0);
            let taxRev = isCostOnlyItem ? 0 : parseFloat(r.taxes || 0);
            let disc = isCostOnlyItem ? 0 : parseFloat(r.discount_amount || 0);
            
            let rawNet = getHistoricalNetProfit(gross, shipRev, taxRev, disc, actualShipCost, r.internal_recipe_name, r.qty_sold, r["Source"]);
            let refAmt = parseFloat(r.refunded_amount) || 0;
            
            let net = rawNet; 
            
            if (type === 'IGNORE' || type === 'NEEDS ATTENTION' || type === 'Cancelled') net = 0;
            if (type === 'Pre-Ship Exchange') net += getEngineTrueCogs(r.internal_recipe_name); // Re-add the true COGS (engine deducted it, but we didn't physically ship this)
            if (isCostOnlyItem && type !== 'IGNORE' && type !== 'NEEDS ATTENTION' && type !== 'Cancelled') net = 0 - actualShipCost - cogs; // Complete loss"""
text = text.replace(old_net, new_net)


# 3. Add Custom Type Dropdown for Unfulfilled Void
old_drop = """                <option style="background:var(--bg-panel); color:var(--text-main);" value="Refund" ${x.transaction_type==='Refund'?'selected':''}>Refund</option>"""

new_drop = """                <option style="background:var(--bg-panel); color:var(--text-main);" value="Refund" ${x.transaction_type==='Refund'?'selected':''}>Refund</option>
                <option style="background:var(--bg-panel); color:var(--text-main); color:#8b5cf6;" value="Cancelled" ${x.transaction_type==='Cancelled'?'selected':''}>Cancelled (Void)</option>"""
text = text.replace(old_drop, new_drop)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(text)

print("Zero Footprint Cancelled state embedded!")
