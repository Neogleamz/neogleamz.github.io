import sys
file_path = "c:\\Users\\Chriviper\\OneDrive - Neogleamz\\Accounting - General\\Expenses\\GitHub\\neogleamz.github.io\\sales-module.js"

with open(file_path, "r", encoding="utf-8") as f:
    text = f.read()

# 1. Update the Revenue Transfer in executeSalesSync
old_transfer_db = """        // REVENUE TRANSFER BATCH
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

new_transfer_db = """        // REVENUE TRANSFER BATCH
        let pg = {};
        salesPayload.forEach(x => { if(!pg[x.order_id]) pg[x.order_id] = []; pg[x.order_id].push(x); });
        Object.values(pg).forEach(group => {
            let primes = group.filter(x => x.transaction_type === 'Pre-Ship Exchange' || x.transaction_type === 'Post-Ship Exchange');
            let replacements = group.filter(x => x.transaction_type === 'Exchange Replacement');
            if (primes.length > 0 && replacements.length > 0) {
                let u = primes[0]; let r = replacements[0];
                if (u.transaction_type === 'Post-Ship Exchange') {
                    r.net_profit += r.cogs_at_sale; // Refund the duplicate replacement COGS because the original unit was physically returned to inventory
                }
                r.net_profit += u.net_profit; 
                r.net_profit = Math.round(r.net_profit * 100) / 100;
                u.net_profit = 0; 
            }
        });"""

text = text.replace(old_transfer_db, new_transfer_db)

# 2. Update the Revenue Transfer in renderSalesTable
old_transfer_ui = """    // 100% PAYLOAD TRANSFER: Shift all Shopify Captured Cash from Unshipped -> Replacement
    Object.values(orderGroups).forEach(group => {
        let primes = group.filter(x => x.transaction_type === 'Pre-Ship Exchange' || x.transaction_type === 'Post-Ship Exchange');
        let replacements = group.filter(x => x.transaction_type === 'Exchange Replacement');
        if (primes.length > 0 && replacements.length > 0) {
            let u = primes[0]; let r = replacements[0];

            let rawRev = (parseFloat(r.actual_sale_price || 0) * (parseFloat(r.qty_sold) || 0)) + parseFloat(r.shipping || 0) - parseFloat(r.discount_amount || 0);
            r.net = rawRev - r.liveCogs - r.actualShipCost - r.stripeFee;

            r.net += u.net;"""

new_transfer_ui = """    // 100% PAYLOAD TRANSFER: Shift all Shopify Captured Cash from Unshipped -> Replacement
    Object.values(orderGroups).forEach(group => {
        let primes = group.filter(x => x.transaction_type === 'Pre-Ship Exchange' || x.transaction_type === 'Post-Ship Exchange');
        let replacements = group.filter(x => x.transaction_type === 'Exchange Replacement');
        if (primes.length > 0 && replacements.length > 0) {
            let u = primes[0]; let r = replacements[0];

            let rawRev = (parseFloat(r.actual_sale_price || 0) * (parseFloat(r.qty_sold) || 0)) + parseFloat(r.shipping || 0) - parseFloat(r.discount_amount || 0);
            r.net = rawRev - r.liveCogs - r.actualShipCost - r.stripeFee;

            if (u.transaction_type === 'Post-Ship Exchange') {
                r.net += r.liveCogs; // Refund the duplicate replacement COGS because the original unit was physically returned to inventory
            }

            r.net += u.net;"""

text = text.replace(old_transfer_ui, new_transfer_ui)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(text)
print("Physical return mechanics applied to the math!")
