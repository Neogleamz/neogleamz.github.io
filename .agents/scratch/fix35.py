import sys

file_path = "c:\\Users\\Chriviper\\OneDrive - Neogleamz\\Accounting - General\\Expenses\\GitHub\\neogleamz.github.io\\sales-module.js"

with open(file_path, "r", encoding="utf-8") as f:
    text = f.read()

# 1. Fix the COGS local variable leak in Pre-Ship Exchange inside executeSalesSync
old_cogs_readd = """            if (type === 'IGNORE') net = 0;
            if (type === 'Pre-Ship Exchange') net += cogs; // Re-add the COGS that getHistoricalNetProfit assumes we shipped"""

new_cogs_readd = """            if (type === 'IGNORE') net = 0;
            if (type === 'Pre-Ship Exchange') net += getEngineTrueCogs(r.internal_recipe_name); // Re-add the true COGS (engine deducted it, but we didn't physically ship this)"""

text = text.replace(old_cogs_readd, new_cogs_readd)

# 2. Add Post-Ship Exchange into the Data Buffer!
old_transfer = """        // REVENUE TRANSFER BATCH
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
        });"""

new_transfer = """        // REVENUE TRANSFER BATCH
        let pg = {};
        salesPayload.forEach(x => { if(!pg[x.order_id]) pg[x.order_id] = []; pg[x.order_id].push(x); });
        Object.values(pg).forEach(group => {
            let primes = group.filter(x => x.transaction_type === 'Pre-Ship Exchange' || x.transaction_type === 'Post-Ship Exchange');
            let replacements = group.filter(x => x.transaction_type === 'Exchange Replacement');
            if (primes.length > 0 && replacements.length > 0) {
                let u = primes[0]; let r = replacements[0];
                r.net_profit += u.net_profit; // Physically consume the entire net profit (combining the original profitability with the sheer loss of the replacement)
                u.net_profit = 0; // Zero out original row so it only serves as an empty metadata trace in the DB
            }
        });"""

text = text.replace(old_transfer, new_transfer)

# 3. Synchronize `renderSalesTable` to also absorb Post-Ship Exchange!
old_render_transfer = """    // 100% PAYLOAD TRANSFER: Shift all Shopify Captured Cash from Unshipped -> Replacement
    Object.values(orderGroups).forEach(group => {
        let unshipped = group.filter(x => x.transaction_type === 'Pre-Ship Exchange');
        let replacements = group.filter(x => x.transaction_type === 'Exchange Replacement');
        if (unshipped.length > 0 && replacements.length > 0) {
            let u = unshipped[0]; let r = replacements[0];

            // Re-calculate the Replacement's Net using pure physical attributes and true revenue, bypassing Shopify's merged 'total' string
            let rawRev = (parseFloat(r.actual_sale_price || 0) * (parseFloat(r.qty_sold) || 0)) + parseFloat(r.shipping || 0) - parseFloat(r.discount_amount || 0);
            r.net = rawRev - r.liveCogs - r.actualShipCost - r.stripeFee;

            // Natively shift the revenue from the unused item
            r.net += u.net;
            r.stripeFee += u.stripeFee; // Bring the original stripe fee payload onto the new transaction block
            r.actual_sale_price = u.actual_sale_price; // Shift price tag visually for sanity
            r.discount_amount = u.discount_amount;
            r.shipping = u.shipping;

            // Zero out original untouched transaction
            u.actual_sale_price = 0;
            u.liveCogs = 0;
            u.stripeFee = 0;
            u.net = 0;
            u.discount_amount = 0;
            u.shipping = 0;
            u.taxes = 0;
            u.actualShipCost = 0;
            
            // Mark for visual tagging
            u.isExchanged = true;
        }
    });"""

new_render_transfer = """    // 100% PAYLOAD TRANSFER: Shift all Shopify Captured Cash from Unshipped -> Replacement
    Object.values(orderGroups).forEach(group => {
        let primes = group.filter(x => x.transaction_type === 'Pre-Ship Exchange' || x.transaction_type === 'Post-Ship Exchange');
        let replacements = group.filter(x => x.transaction_type === 'Exchange Replacement');
        if (primes.length > 0 && replacements.length > 0) {
            let u = primes[0]; let r = replacements[0];

            let rawRev = (parseFloat(r.actual_sale_price || 0) * (parseFloat(r.qty_sold) || 0)) + parseFloat(r.shipping || 0) - parseFloat(r.discount_amount || 0);
            r.net = rawRev - r.liveCogs - r.actualShipCost - r.stripeFee;

            r.net += u.net;
            r.stripeFee += u.stripeFee; 
            r.actual_sale_price = u.actual_sale_price; 
            r.discount_amount = u.discount_amount;
            r.shipping = u.shipping;

            // Zero out original metrics
            u.actual_sale_price = 0;
            u.stripeFee = 0;
            u.net = 0;
            u.discount_amount = 0;
            u.shipping = 0;
            u.taxes = 0;
            u.actualShipCost = u.transaction_type === 'Post-Ship Exchange' ? u.actualShipCost : 0; // retain metadata visually if shipped
            u.liveCogs = u.transaction_type === 'Post-Ship Exchange' ? u.liveCogs : 0; // retain metadata visually if shipped
            
            u.isExchanged = true;
        }
    });"""

text = text.replace(old_render_transfer, new_render_transfer)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(text)
print("Solid Math Deployed and Syncing Post-Ship Transfer!!!")
