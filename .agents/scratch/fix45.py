import sys
import re

file_path = "c:\\Users\\Chriviper\\OneDrive - Neogleamz\\Accounting - General\\Expenses\\GitHub\\neogleamz.github.io\\sales-module.js"

with open(file_path, "r", encoding="utf-8") as f:
    text = f.read()

# 1. FIX: Make refunded_amount exist natively on every row (prevents isFirstRow bugs collapsing the refund to 0).
# Also, do NOT use isFirstRow conditionally for hashing - use the flag object.
text = text.replace(
    """refunded_amount: isFirstRow ? orderFirstRowFlags[orderId].refundedAmount : 0""",
    """refunded_amount: orderFirstRowFlags[orderId].refundedAmount || 0"""
)

# 2. FIX: Deduplicate and execute Refund logic natively inside the DB payload generator
old_execute_map = """            let net = rawNet; 
            
            if (type === 'IGNORE' || type === 'NEEDS ATTENTION') net = 0;
            if (type === 'Pre-Ship Exchange') net += getEngineTrueCogs(r.internal_recipe_name); // Re-add the true COGS (engine deducted it, but we didn't physically ship this)
            if (isCostOnlyItem) net = 0 - actualShipCost - cogs; // Complete loss
            


            let cS = Math.round(cogs * 100) / 100;
            let fS = Math.round(fee * 100) / 100;
            let nS = Math.round(net * 100) / 100;"""

new_execute_map = """            let net = rawNet; 
            
            if (type === 'IGNORE' || type === 'NEEDS ATTENTION') net = 0;
            if (type === 'Pre-Ship Exchange') net += getEngineTrueCogs(r.internal_recipe_name); // Re-add the true COGS (engine deducted it, but we didn't physically ship this)
            if (isCostOnlyItem) net = 0 - actualShipCost - cogs; // Complete loss
            
            // DEDUPLICATE DATABASE REFUNDS
            if (!window._refundDeductedDB) window._refundDeductedDB = {};
            if (refAmt > 0 && !window._refundDeductedDB[orderId]) {
                net -= refAmt;
                window._refundDeductedDB[orderId] = true;
            }

            let cS = Math.round(cogs * 100) / 100;
            let fS = Math.round(fee * 100) / 100;
            let nS = Math.round(net * 100) / 100;"""

text = text.replace(old_execute_map, new_execute_map)

# 3. FIX: Add the initializer for window._refundDeductedDB before the `.map()` loop in executeSalesSync
text = text.replace(
    """salesPayload = pendingSalesRows.map((r, index, a) => {""",
    """window._refundDeductedDB = {};
        salesPayload = pendingSalesRows.map((r, index, a) => {"""
)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(text)

print("BULLETPROOF REFUND ENGINE INTEGRATED FOR DB SYNC!")
