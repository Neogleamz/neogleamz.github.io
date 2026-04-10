import sys

file_path = "c:\\Users\\Chriviper\\OneDrive - Neogleamz\\Accounting - General\\Expenses\\GitHub\\neogleamz.github.io\\sales-module.js"

with open(file_path, "r", encoding="utf-8") as f:
    text = f.read()

old_block = """            transaction_type: (function() {
                let fStat = orderFirstRowFlags[orderId].fStatus || "";
                let lFulfill = String(r['Lineitem fulfillment status'] || "").trim().toLowerCase();
                let oTot = orderFirstRowFlags[orderId].firstRowTotal || 0;
                
                if (oTot === 0 && fStat.toLowerCase() !== 'refunded') return 'Warranty';
                // If they technically paid for it but we never shipped it, it was almost certainly a Pre-Ship Exchange or cancellation!
                if (lFulfill === 'pending' || lFulfill === 'unfulfilled') {
                    if (fStat.toLowerCase() === 'paid') return 'Pre-Ship Exchange';
                }

                if (fStat.toLowerCase() === 'refunded') return 'Refund';
                if (fStat.toLowerCase() === 'partially_refunded') {
                    if (lFulfill === 'pending' || lFulfill === 'unfulfilled' || lFulfill === 'restocked') return 'Refund';
                }
                return 'Standard';
            })(),"""

new_block = """            transaction_type: (function() {
                let fStat = orderFirstRowFlags[orderId].fStatus || "";
                let lFulfill = String(r['Lineitem fulfillment status'] || "").trim().toLowerCase();
                let oTot = orderFirstRowFlags[orderId].firstRowTotal || 0;
                let oBal = orderFirstRowFlags[orderId].balance || 0;
                let lPrice = parseFloat(r['Lineitem price'] || r['Price'] || r['Item Price'] || 0) || parseFloat(r.actual_sale_price) || 0;
                
                if (oTot === 0 && fStat.toLowerCase() !== 'refunded') return 'Warranty';

                // --- AUTOMATED EXCHANGE DETECTION ---
                // If the order carries an outstanding balance (Shopify UI edits heavily trigger this):
                if (oBal > 0) {
                    // The replacement item injected by the agent almost always drops as a $0.00 line item.
                    if (lPrice === 0) return 'Replacement / Warranty';
                    // The original item they paid for will be left unshipped.
                    if (lFulfill === 'pending' || lFulfill === 'unfulfilled') return 'Pre-Ship Exchange';
                }
                
                // If they technically paid for it but we never shipped it, it was almost certainly a Pre-Ship Exchange or cancellation!
                if (lFulfill === 'pending' || lFulfill === 'unfulfilled') {
                    if (fStat.toLowerCase() === 'paid') return 'Pre-Ship Exchange';
                }

                if (fStat.toLowerCase() === 'refunded') return 'Refund';
                if (fStat.toLowerCase() === 'partially_refunded') {
                    if (lFulfill === 'pending' || lFulfill === 'unfulfilled' || lFulfill === 'restocked') return 'Refund';
                }
                return 'Standard';
            })(),"""

if old_block in text:
    text = text.replace(old_block, new_block)
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(text)
    print("Automated exchange logic fully deployed in transaction_type IIFE!")
else:
    print("Could not find the target block.")
