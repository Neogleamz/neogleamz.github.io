
window = global;
global.sysLog = console.log;
global.setMasterStatus = function() {};
global.supabaseClient = { from: () => ({ update: () => ({ eq: () => ({ eq: async () => ({ error: null }) }) }) }) };
global.renderSalesTable = function() {};
global.renderInventoryTable = function() {};
global.renderAnalyticsDashboard = function() {};
global.getEngineTrueCogs = function() { return 24.87; };
global.getEngineStripeFee = function() { return 10.48; };
global.getHistoricalNetProfit = function() { return 100.28; };

let salesDB = [{
    order_id: '#1028',
    storefront_sku: 'SK8Lytz SOULZ - Block',
    transaction_type: 'Standard',
    qty_sold: 3,
    actual_sale_price: 129.99,
    shipping: 0,
    taxes: 0,
    discount_amount: 38.99,
    'Outstanding Balance': 0,
    Source: 'web',
    internal_recipe_name: 'Soulz Block'
}];

// Execute the sales module (just the updateSaleType function basically)
window.updateSaleType = async function(sel, orderId, sku) {
    try {
        let newVal = sel.value;
        sysLog(`Editing Sale Type ${orderId}: ${newVal}`);
        setMasterStatus("Saving...", "mod-working");
        let row = salesDB.find(s => s.order_id === orderId && s.storefront_sku === sku);
        if(row) {
            let payload = { transaction_type: newVal };
            
            // --- POWERED BY MASTER ENGINE: Dynamic Recalculation ---
            let sim = { ...row, transaction_type: newVal };
            let qty = parseFloat(sim.qty_sold) || 1;
            let pr = parseFloat(sim.actual_sale_price) || 0;
            let ship = parseFloat(sim.shipping) || 0;
            let tax = parseFloat(sim.taxes) || 0;
            let disc = parseFloat(sim.discount_amount) || 0;
            let bal = parseFloat(sim['Outstanding Balance']) || 0;
            let src = sim['Source'] || "web";
            let rec = sim.internal_recipe_name;
            let type = sim.transaction_type || 'Standard';

            sim.subtotal = qty * pr;
            sim.total = sim.subtotal + ship + tax - disc;
            
            let isCostOnlyItem = (type === 'Exchange Replacement' || type === 'Warranty' || type === 'Gift' || type === 'NEEDS ATTENTION' || type === 'IGNORE' || type === 'Cancelled');
            sim.cogs_at_sale = (type === 'Pre-Ship Exchange' || type === 'IGNORE' || type === 'NEEDS ATTENTION' || type === 'Cancelled') ? 0 : window.getEngineTrueCogs(rec);
            
            let trueLineCaptured = isCostOnlyItem ? 0 : sim.total;
            let stripeCaptureTarget = trueLineCaptured - bal;
            
            sim.transaction_fees = (isCostOnlyItem || type === 'Cancelled') ? 0 : window.getEngineStripeFee(stripeCaptureTarget, src);
            
            let actualShipCost = (type === 'Cancelled' || type === 'Pre-Ship Exchange' || type === 'IGNORE' || type === 'NEEDS ATTENTION') ? 0 : (ship > 0 ? ship : (typeof ENGINE_CONFIG !== 'undefined' ? ENGINE_CONFIG.flatShipping : 8.00) * qty);
            
            let gross = isCostOnlyItem ? 0 : pr * qty;
            let shipRev = isCostOnlyItem ? 0 : ship;
            let taxRev = isCostOnlyItem ? 0 : tax;
            let discRev = isCostOnlyItem ? 0 : disc;
            
            let rawNet = window.getHistoricalNetProfit(gross, shipRev, taxRev, discRev, actualShipCost, rec, qty, src);
            sim.net_profit = rawNet;
            
            if (type === 'IGNORE' || type === 'NEEDS ATTENTION' || type === 'Cancelled') sim.net_profit = 0;
            if (type === 'Pre-Ship Exchange') sim.net_profit += window.getEngineTrueCogs(rec);
            if (isCostOnlyItem && type !== 'IGNORE' && type !== 'NEEDS ATTENTION' && type !== 'Cancelled') sim.net_profit = 0 - actualShipCost - sim.cogs_at_sale;

            payload.subtotal = sim.subtotal;
            payload.total = sim.total;
            payload.cogs_at_sale = sim.cogs_at_sale;
            payload.transaction_fees = sim.transaction_fees;
            payload.net_profit = sim.net_profit;
            // --------------------------------------------------------

            const { error } = await supabaseClient.from('sales_ledger').update(payload).eq('order_id', orderId).eq('storefront_sku', sku);
            if(error) throw new Error("DB Error saving type: " + error.message);

            Object.keys(payload).forEach(k => { row[k] = payload[k]; });

            setMasterStatus("Saved!", "mod-success");
            renderSalesTable();
            if(typeof renderInventoryTable === 'function') renderInventoryTable();
            if(typeof renderAnalyticsDashboard === 'function') renderAnalyticsDashboard();
            setTimeout(()=>setMasterStatus("Ready.", "status-idle"), 2000);
        }
    } catch(e) { sysLog(e.message, true); setMasterStatus("Error", "mod-error"); alert("Error saving type: \n" + e.message); }
}

window.updateSaleType({value: 'Warranty'}, '#1028', 'SK8Lytz SOULZ - Block').catch(console.error);