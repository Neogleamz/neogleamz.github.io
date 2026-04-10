import sys

file_path = "c:\\Users\\Chriviper\\OneDrive - Neogleamz\\Accounting - General\\Expenses\\GitHub\\neogleamz.github.io\\sales-module.js"

with open(file_path, "r", encoding="utf-8") as f:
    text = f.read()

# 1. Update the pre-map logic to use "Exchange Replacement" instead of "Replacement / Warranty"
old_pre_loop = """    // DYNAMIC MULTI-ITEM EXCHANGE DETECTOR (Pre-Map Mutation)
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
    });"""

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
                        repl.transaction_type = 'Exchange Replacement';
                    } else if (oFulfill === 'fulfilled' && (rFulfill === 'fulfilled' || rFulfill === '')) {
                        orig.transaction_type = 'Post-Ship Exchange';
                        repl.transaction_type = 'Exchange Replacement';
                    }
                }
            }
        }
    });"""

if old_pre_loop in text:
    text = text.replace(old_pre_loop, new_pre_loop)


# 2. Upgrade executeSalesSync to accurately inject the payload offsets
old_payload = """        // --- POWERED BY MASTER ENGINE ---
        let salesPayload = pendingSalesRows.map(r => { 
            let cogs = getEngineTrueCogs(r.internal_recipe_name);
            let trueLineCaptured = (r.actual_sale_price * r.qty_sold) + parseFloat(r.shipping || 0) + parseFloat(r.taxes || 0) - parseFloat(r.discount_amount || 0);
            let outBal = parseFloat(r['Outstanding Balance']) || 0;
            let stripeCaptureTarget = trueLineCaptured - outBal; // Stripe doesn't charge for outstanding uncaptured funds
            
            let fee = getEngineStripeFee(stripeCaptureTarget, r["Source"]);
            
            const SHIP_COST = typeof ENGINE_CONFIG !== 'undefined' ? ENGINE_CONFIG.flatShipping : 8.00;
            let actualShipCost = SHIP_COST * r.qty_sold;
            
            let rawNet = getHistoricalNetProfit(r.actual_sale_price * r.qty_sold, r.shipping, r.taxes, r.discount_amount, actualShipCost, r.internal_recipe_name, r.qty_sold, r["Source"]);
            let refAmt = parseFloat(r.refunded_amount) || 0;
            
            let net = rawNet; // Keep gross margin sacred in database! Visual minus UI elements dynamically!
            
            let cS = Math.round(cogs * 100) / 100;
            let fS = Math.round(fee * 100) / 100;
            let nS = Math.round(net * 100) / 100;
            
            return { ...r, cogs_at_sale: cS, transaction_fees: fS, net_profit: nS }; 
        });"""

new_payload = """        // --- POWERED BY MASTER ENGINE ---
        let salesPayload = pendingSalesRows.map(r => { 
            let type = r.transaction_type || 'Standard';
            let cogs = getEngineTrueCogs(r.internal_recipe_name);
            let isCostOnlyItem = (type === 'Exchange Replacement' || type === 'Replacement / Warranty' || type === 'Warranty' || type === 'Gift' || type === 'IGNORE');
            
            if (type === 'Pre-Ship Exchange' || type === 'IGNORE') { cogs = 0; }
            
            let trueLineCaptured = isCostOnlyItem ? 0 : (r.actual_sale_price * r.qty_sold) + parseFloat(r.shipping || 0) + parseFloat(r.taxes || 0) - parseFloat(r.discount_amount || 0);
            let outBal = parseFloat(r['Outstanding Balance']) || 0;
            let stripeCaptureTarget = trueLineCaptured - outBal;
            
            let fee = isCostOnlyItem ? 0 : getEngineStripeFee(stripeCaptureTarget, r["Source"]);
            
            const SHIP_COST = typeof ENGINE_CONFIG !== 'undefined' ? ENGINE_CONFIG.flatShipping : 8.00;
            let actualShipCost = (type === 'Pre-Ship Exchange' || type === 'IGNORE') ? 0 : (parseFloat(r.shipping || 0) > 0 ? parseFloat(r.shipping) : (SHIP_COST * r.qty_sold));
            
            // Calculate true net strictly honoring the rules.
            let gross = isCostOnlyItem ? 0 : r.actual_sale_price * r.qty_sold;
            let shipRev = isCostOnlyItem ? 0 : parseFloat(r.shipping || 0);
            let taxRev = isCostOnlyItem ? 0 : parseFloat(r.taxes || 0);
            let disc = isCostOnlyItem ? 0 : parseFloat(r.discount_amount || 0);
            
            let rawNet = getHistoricalNetProfit(gross, shipRev, taxRev, disc, actualShipCost, r.internal_recipe_name, r.qty_sold, r["Source"]);
            let refAmt = parseFloat(r.refunded_amount) || 0;
            
            let net = rawNet; 
            
            if (type === 'IGNORE') net = 0;
            if (type === 'Pre-Ship Exchange') net += cogs; // Re-add the COGS that getHistoricalNetProfit assumes we shipped
            if (isCostOnlyItem) net = 0 - actualShipCost - cogs; // Complete loss
            
            // Fix double-Stripe deduction bug in Net
            net = net - fee;

            let cS = Math.round(cogs * 100) / 100;
            let fS = Math.round(fee * 100) / 100;
            let nS = Math.round(net * 100) / 100;
            
            return { ...r, cogs_at_sale: cS, transaction_fees: fS, net_profit: nS, transaction_type: type }; 
        });

        // REVENUE TRANSFER BATCH
        let pg = {};
        salesPayload.forEach(x => { if(!pg[x.order_id]) pg[x.order_id] = []; pg[x.order_id].push(x); });
        Object.values(pg).forEach(group => {
            let unshipped = group.filter(x => x.transaction_type === 'Pre-Ship Exchange');
            let replacements = group.filter(x => x.transaction_type === 'Exchange Replacement');
            if (unshipped.length > 0 && replacements.length > 0) {
                let u = unshipped[0]; let r = replacements[0];
                r.net_profit += u.net_profit; // Transfer the entire generated payload revenue onto the replacement!
                u.net_profit = 0; // Zero out unshipped so it's safely tucked away purely as a ledger trace.
            }
        });
"""

if old_payload in text:
    text = text.replace(old_payload, new_payload)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(text)
print("Updated pre-map string and embedded database logic into core matrix.")
