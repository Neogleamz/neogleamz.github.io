import sys

file_path = "c:\\Users\\Chriviper\\OneDrive - Neogleamz\\Accounting - General\\Expenses\\GitHub\\neogleamz.github.io\\sales-module.js"

with open(file_path, "r", encoding="utf-8") as f:
    text = f.read()

# 1. Inject Pre-Map Voided Revenue Scanner
old_pre = """        // Clear execution deduplicator hash per import batch
        window._refundDeductedDB = {};
        let salesPayload = pendingSalesRows.map(r => {"""

new_pre = """        // Extract natively erased ghost revenue so we don't double-penalize the primary item's refund deduction
        let voidedRevenueByOrder = {};
        pendingSalesRows.forEach(r => {
            if (r.transaction_type === 'Cancelled') {
                voidedRevenueByOrder[r.order_id] = (voidedRevenueByOrder[r.order_id] || 0) + (parseFloat(r.actual_sale_price || 0) * parseFloat(r.qty_sold || 1));
            }
        });

        // Clear execution deduplicator hash per import batch
        window._refundDeductedDB = {};
        let salesPayload = pendingSalesRows.map(r => {"""
text = text.replace(old_pre, new_pre)

# 2. Update execution map Deduplicator
old_db = """            let refAmt = parseFloat(r.refunded_amount) || 0;
            
            let net = rawNet; 
            
            if (type === 'IGNORE' || type === 'NEEDS ATTENTION' || type === 'Cancelled') net = 0;
            if (type === 'Pre-Ship Exchange') net += getEngineTrueCogs(r.internal_recipe_name); // Re-add the true COGS (engine deducted it, but we didn't physically ship this)
            if (isCostOnlyItem && type !== 'IGNORE' && type !== 'NEEDS ATTENTION' && type !== 'Cancelled') net = 0 - actualShipCost - cogs; // Complete loss
            
            // DEDUPLICATE DATABASE REFUNDS
            if (!window._refundDeductedDB) window._refundDeductedDB = {};
            if (refAmt > 0 && type !== 'Cancelled' && type !== 'IGNORE' && !window._refundDeductedDB[r.order_id]) {
                net -= refAmt;
                window._refundDeductedDB[r.order_id] = true;
            }"""

new_db = """            let refAmt = parseFloat(r.refunded_amount) || 0;
            // Erase the cancelled line-item values from the global refund penalty to prevent double-dipping ghost loops
            let voidedRev = voidedRevenueByOrder[r.order_id] || 0;
            let actualDeductibleRefund = Math.max(0, refAmt - voidedRev);
            
            let net = rawNet; 
            
            if (type === 'IGNORE' || type === 'NEEDS ATTENTION' || type === 'Cancelled') net = 0;
            if (type === 'Pre-Ship Exchange') net += getEngineTrueCogs(r.internal_recipe_name); // Re-add the true COGS (engine deducted it, but we didn't physically ship this)
            if (isCostOnlyItem && type !== 'IGNORE' && type !== 'NEEDS ATTENTION' && type !== 'Cancelled') net = 0 - actualShipCost - cogs; // Complete loss
            
            // DEDUPLICATE DATABASE REFUNDS
            if (!window._refundDeductedDB) window._refundDeductedDB = {};
            if (actualDeductibleRefund > 0 && type !== 'Cancelled' && type !== 'IGNORE' && !window._refundDeductedDB[r.order_id]) {
                net -= actualDeductibleRefund;
                window._refundDeductedDB[r.order_id] = true;
            }"""
text = text.replace(old_db, new_db)

# 3. Update renderSalesTable Deduplicator
old_ui = """        let refundDeducted = false;
        group.forEach(r => {
            let refAmt = parseFloat(r.refunded_amount) || 0;
            if (refAmt > 0 && r.transaction_type !== 'Cancelled' && r.transaction_type !== 'IGNORE' && !refundDeducted) {
                r.net -= refAmt;
                r.exchAdj = (r.exchAdj || 0) - refAmt;
                refundDeducted = true;
            }
        });"""

new_ui = """        let refundDeducted = false;
        let voidedGroupRev = 0;
        group.forEach(r => { if (r.transaction_type === 'Cancelled') voidedGroupRev += (parseFloat(r.actual_sale_price||0) * parseFloat(r.qty_sold||1)); });
        
        group.forEach(r => {
            let refAmt = parseFloat(r.refunded_amount) || 0;
            let actualDeductibleRefund = Math.max(0, refAmt - voidedGroupRev);
            if (actualDeductibleRefund > 0 && r.transaction_type !== 'Cancelled' && r.transaction_type !== 'IGNORE' && !refundDeducted) {
                r.net -= actualDeductibleRefund;
                r.exchAdj = (r.exchAdj || 0) - actualDeductibleRefund;
                refundDeducted = true;
            }
        });"""
text = text.replace(old_ui, new_ui)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(text)

print("Smart Anti-Double-Penalty Ghost logic successfully deployed!")
