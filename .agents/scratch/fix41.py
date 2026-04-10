import sys
file_path = "c:\\Users\\Chriviper\\OneDrive - Neogleamz\\Accounting - General\\Expenses\\GitHub\\neogleamz.github.io\\sales-module.js"

with open(file_path, "r", encoding="utf-8") as f:
    text = f.read()

# 1. FIX EXECUTE SALES SYNC (remove undefined actualShipCost)
old_exec_transfer = """        // REVENUE TRANSFER BATCH
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

new_exec_transfer = """        // REVENUE TRANSFER BATCH
        let pg = {};
        // DEFENSIVE SHIP COST RESOLVER
        const LOCAL_SHIP = typeof ENGINE_CONFIG !== 'undefined' ? ENGINE_CONFIG.flatShipping : 8.00;
        
        salesPayload.forEach(x => { if(!pg[x.order_id]) pg[x.order_id] = []; pg[x.order_id].push(x); });
        Object.values(pg).forEach(group => {
            let primes = group.filter(x => x.transaction_type === 'Pre-Ship Exchange' || x.transaction_type === 'Post-Ship Exchange');
            let replacements = group.filter(x => x.transaction_type === 'Exchange Replacement');
            if (primes.length > 0 && replacements.length > 0) {
                let u = primes[0]; let r = replacements[0];
                
                // DECOUPLED PHYSICAL REALITY ACCOUNTING
                if (u.transaction_type === 'Post-Ship Exchange') {
                    // 1. Shift the purely positive raw revenue component onto the replacement.
                    let uRawRev = (parseFloat(u.actual_sale_price || 0) * parseFloat(u.qty_sold || 0)) + parseFloat(u.shipping || 0) - parseFloat(u.discount_amount || 0);
                    r.net_profit += uRawRev; // Replacement absorbs the pure revenue
                    
                    // 2. Original row loses the revenue (shipped to r), and loses its COGS (restocked), leaving ONLY the pure logistical losses:
                    let activeShipValue = parseFloat(u.shipping || 0) > 0 ? parseFloat(u.shipping || 0) : LOCAL_SHIP;
                    let uStripeValue = parseFloat(u.transaction_fees || 0);
                    
                    let secureNet = 0 - activeShipValue - uStripeValue;
                    u.net_profit = isNaN(secureNet) ? 0 : secureNet; 
                } else {
                    // Ghost Transfer for Unshipped
                    r.net_profit += (parseFloat(u.net_profit) || 0); 
                    u.net_profit = 0; 
                }
                
                r.net_profit = Math.round((parseFloat(r.net_profit) || 0) * 100) / 100;
                u.net_profit = Math.round((parseFloat(u.net_profit) || 0) * 100) / 100;
            }
        });"""
text = text.replace(old_exec_transfer, new_exec_transfer)

# 2. FIX RENDER SALES TABLE (Target actual source logic from fix35)
old_rend_transfer = """    // 100% PAYLOAD TRANSFER: Shift all Shopify Captured Cash from Unshipped -> Replacement
    Object.values(orderGroups).forEach(group => {
        let unshipped = group.filter(x => x.transaction_type === 'Pre-Ship Exchange');
        let replacements = group.filter(x => x.transaction_type === 'Exchange Replacement');
        
        if (unshipped.length > 0 && replacements.length > 0) {
            let u = unshipped[0];
            let r = replacements[0];

            // Transfer Revenue metrics
            r.actual_sale_price = u.actual_sale_price;
            r.shipping = parseFloat(u.shipping || 0);
            r.taxes = parseFloat(u.taxes || 0);
            r.total = parseFloat(u.total || 0);
            r.stripeFee = u.stripeFee;
            r.discount_amount = parseFloat(u.discount_amount || 0);
            r.isRevenueTransfer = true; // Protects UI from treating the transferred shipping as a warranty expense override

            // Re-calculate the Replacement's Net using pure physical attributes and true revenue, bypassing Shopify's merged 'total' string
            let rawRev = (parseFloat(r.actual_sale_price || 0) * (parseFloat(r.qty_sold) || 0)) + parseFloat(r.shipping || 0) - parseFloat(r.discount_amount || 0);
            r.net = rawRev - r.liveCogs - r.actualShipCost - r.stripeFee;

            // Zero out all metrics on the Unshipped row entirely (so it doesn't keep Revenue)
            u.actual_sale_price = 0;
            u.shipping = 0;
            u.taxes = 0;
            u.total = 0;
            u.stripeFee = 0;
            u.discount_amount = 0;
            u.liveCogs = 0; // Ensure 0
            u.net = 0;
            u.exchAdj = 0; // Clear any visual adjustments
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
            let rawRNet = rRawRev - (parseFloat(r.liveCogs) || 0) - (parseFloat(r.actualShipCost) || 0) - (parseFloat(r.stripeFee) || 0);
            r.net = isNaN(rawRNet) ? 0 : rawRNet;
            
            if (u.transaction_type === 'Post-Ship Exchange') {
                // Physical Reality Decoupling
                let uRawRev = (parseFloat(u.actual_sale_price || 0) * (parseFloat(u.qty_sold) || 0)) + parseFloat(u.shipping || 0) - parseFloat(u.discount_amount || 0);
                
                // 1. Shift Customer Payment Revenue to Replacement
                r.net += (parseFloat(uRawRev) || 0);
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
                
                let secureNetLoss = 0 - (parseFloat(u.actualShipCost) || 0) - (parseFloat(u.stripeFee) || 0);
                u.net = isNaN(secureNetLoss) ? 0 : secureNetLoss;
            } else {
                // Ghost Transfer for Unshipped (Pre-Ship)
                r.net += (parseFloat(u.net) || 0);
                r.stripeFee += (parseFloat(u.stripeFee) || 0); 
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

        // Failsafe Net Cast for All Unprocessed Rows
        group.forEach(it => { if(isNaN(it.net)) it.net = 0; });
    });"""

text = text.replace(old_rend_transfer, new_rend_transfer)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(text)
print("BULLETPROOF DECPOUPLING APPLIED!")
