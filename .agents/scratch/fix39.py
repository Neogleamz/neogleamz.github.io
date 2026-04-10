import sys
file_path = "c:\\Users\\Chriviper\\OneDrive - Neogleamz\\Accounting - General\\Expenses\\GitHub\\neogleamz.github.io\\sales-module.js"

with open(file_path, "r", encoding="utf-8") as f:
    text = f.read()

# 1. Update executeSalesSync math
old_exec_transfer = """        // REVENUE TRANSFER BATCH
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

new_exec_transfer = """        // REVENUE TRANSFER BATCH
        let pg = {};
        salesPayload.forEach(x => { if(!pg[x.order_id]) pg[x.order_id] = []; pg[x.order_id].push(x); });
        Object.values(pg).forEach(group => {
            let primes = group.filter(x => x.transaction_type === 'Pre-Ship Exchange' || x.transaction_type === 'Post-Ship Exchange');
            let replacements = group.filter(x => x.transaction_type === 'Exchange Replacement');
            if (primes.length > 0 && replacements.length > 0) {
                let u = primes[0]; let r = replacements[0];
                
                // DECOUPLED PHYSICAL REALITY ACCOUNTING
                if (u.transaction_type === 'Post-Ship Exchange') {
                    // 1. Shift the purely positive raw revenue component onto the replacement.
                    let rawRevShift = (u.actual_sale_price * u.qty_sold) + parseFloat(u.shipping || 0) - parseFloat(u.discount_amount || 0);
                    r.net_profit += rawRevShift; // Replacement absorbs the pure revenue
                    
                    // 2. Original row loses the revenue (shipped to r), and loses its COGS (restocked), leaving ONLY the pure logistical losses:
                    u.net_profit = 0 - u.actualShipCost - parseFloat(u.transaction_fees || 0); // Isolated Loss
                } else {
                    // Pre-Ship Exchanges never fulfilled, so we completely zero out the original footprint to consolidate math
                    r.net_profit += u.net_profit; 
                    u.net_profit = 0; 
                }
                
                r.net_profit = Math.round(r.net_profit * 100) / 100;
                u.net_profit = Math.round(u.net_profit * 100) / 100;
            }
        });"""
text = text.replace(old_exec_transfer, new_exec_transfer)

# 2. Update renderSalesTable math
old_rend_transfer = """    // 100% PAYLOAD TRANSFER: Shift all Shopify Captured Cash from Unshipped -> Replacement
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

new_rend_transfer = """    // DECOUPLED LOGISTICS TRANSFER: Accurately map true financial footprints natively in UI
    Object.values(orderGroups).forEach(group => {
        let primes = group.filter(x => x.transaction_type === 'Pre-Ship Exchange' || x.transaction_type === 'Post-Ship Exchange');
        let replacements = group.filter(x => x.transaction_type === 'Exchange Replacement');
        if (primes.length > 0 && replacements.length > 0) {
            let u = primes[0]; let r = replacements[0];

            // Replacements natively evaluate locally, then absorb the original revenue.
            let rRawRev = (parseFloat(r.actual_sale_price || 0) * (parseFloat(r.qty_sold) || 0)) + parseFloat(r.shipping || 0) - parseFloat(r.discount_amount || 0);
            r.net = rRawRev - r.liveCogs - r.actualShipCost - r.stripeFee;
            
            if (u.transaction_type === 'Post-Ship Exchange') {
                // Physical Reality Decoupling
                let uRawRev = (parseFloat(u.actual_sale_price || 0) * parseFloat(u.qty_sold || 0)) + parseFloat(u.shipping || 0) - parseFloat(u.discount_amount || 0);
                
                // 1. Shift Customer Payment Revenue to Replacement
                r.net += uRawRev;
                r.actual_sale_price = u.actual_sale_price; 
                r.discount_amount = u.discount_amount;
                r.shipping = u.shipping;
                r.taxes = u.taxes;
                
                // 2. Original Item is left isolated as a pure loss string (burns ship cost + stripe fee)
                u.actual_sale_price = 0; 
                u.shipping = 0;
                u.discount_amount = 0;
                u.taxes = 0;
                u.liveCogs = 0; // Restocked
                u.net = 0 - u.actualShipCost - u.stripeFee; 
            } else {
                // Ghost Transfer for Unshipped (Leaves no physical footprint natively)
                r.net += u.net;
                r.stripeFee += u.stripeFee; 
                r.actual_sale_price = u.actual_sale_price; 
                r.discount_amount = u.discount_amount;
                r.shipping = u.shipping;

                u.actual_sale_price = 0;
                u.stripeFee = 0;
                u.net = 0;
                u.discount_amount = 0;
                u.shipping = 0;
                u.taxes = 0;
                u.actualShipCost = 0;
                u.liveCogs = 0;
            }
            
            u.isExchanged = true;
        }
    });"""
    
text = text.replace(old_rend_transfer, new_rend_transfer)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(text)
print("DECOUPLED LOGISTICS TRANSFER SYNCHRONIZED!")
