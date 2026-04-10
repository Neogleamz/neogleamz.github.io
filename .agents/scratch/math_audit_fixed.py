import csv
from collections import defaultdict

def safe_float(v):
    if not v: return 0.0
    import re
    s = re.sub(r'[^0-9.-]', '', str(v))
    try: return float(s)
    except: return 0.0

def get_cogs(name):
    n = str(name).lower()
    if 'charging bundle' in n: return 2.32
    if 'clipz' in n: return 5.86
    if 'soulz' in n: return 6.13
    return 12.16 

orders = defaultdict(list)
with open('orders_export_1.csv', 'r', encoding='utf-8') as f:
    r = csv.DictReader(f)
    for row in r:
        if row['Name']:
            orders[row['Name']].append(row)

markdown = ["# Ledger Mathematical Breakdown\n"]

for order_id, rows in orders.items():
    markdown.append(f"## Order {order_id}\n")
    
    global_refund = 0
    ref_str = rows[0].get('Refunded Amount', '0')
    if ref_str and ref_str.strip():
        global_refund = safe_float(ref_str)
        
    cancelled_rev = 0
    
    # 2. Determine Cancelled Revenue exactly as executeSalesSync does
    # First get orderFirstRowFlags simulation
    order_fstat = rows[0].get('Financial Status', '').lower()
    
    for row in rows:
        # Cascade fstat if empty
        fstat_val = row.get('Financial Status', '')
        if not fstat_val.strip():
             fstat_val = order_fstat
        fstat = fstat_val.lower()
        
        lfulfill = str(row.get('Lineitem fulfillment status', '')).lower()
        
        type_str = 'Standard'
        
        if fstat == 'refunded':
            if lfulfill in ['pending', 'unfulfilled']: type_str = 'Cancelled'
            else: type_str = 'Refund'
        elif fstat == 'partially_refunded':
            # Note: executeSalesSync has this logic
            if lfulfill in ['pending', 'unfulfilled', 'restocked']: type_str = 'Cancelled'
            else: type_str = 'Refund'
        elif lfulfill in ['pending', 'unfulfilled']:
             if fstat == 'paid': type_str = 'Pre-Ship Exchange'
             
        row['_type'] = type_str
        
        if type_str == 'Cancelled':
            cancelled_rev += safe_float(row.get('Lineitem price', 0)) * safe_float(row.get('Lineitem quantity', 1))

    # 3. Process Rows
    deductible_refund = max(0, global_refund - cancelled_rev)
    refund_deducted = False
    
    order_total_net = 0
    for i, row in enumerate(rows):
        t = row['_type']
        qty = safe_float(row.get('Lineitem quantity', 1))
        price = safe_float(row.get('Lineitem price', 0))
        
        gross = price * qty
        ship = safe_float(row.get('Shipping', 0))
        tax = safe_float(row.get('Taxes', 0))
        disc = safe_float(row.get('Discount Amount', 0))
        
        is_cost_only = (t in ['Cancelled', 'Gift', 'Warranty', 'NEEDS ATTENTION', 'IGNORE'])
        
        cogs = get_cogs(row.get('Lineitem name'))
        
        if t in ['Cancelled', 'Pre-Ship Exchange', 'IGNORE', 'NEEDS ATTENTION']:
            cogs = 0
            
        true_line_cap = 0 if is_cost_only else (gross + ship + tax - disc)
        out_bal = safe_float(row.get('Outstanding Balance', 0))
        stripe_target = true_line_cap - out_bal
        
        fee = 0 if (is_cost_only or t == 'Cancelled') else ((stripe_target * 0.029) + 0.30)
        act_ship = 0 if (t in ['Cancelled', 'Pre-Ship Exchange', 'IGNORE', 'NEEDS ATTENTION']) else (ship if ship > 0 else 8.00 * qty)
        
        g = 0 if is_cost_only else gross
        sR = 0 if is_cost_only else ship
        tR = 0 if is_cost_only else tax
        dR = 0 if is_cost_only else disc
        
        raw_net = g + sR - dR - fee - act_ship - cogs
        
        net = raw_net
        if t in ['Cancelled', 'IGNORE', 'NEEDS ATTENTION']: net = 0
        if is_cost_only and t not in ['IGNORE', 'NEEDS ATTENTION', 'Cancelled']:
            net = 0 - act_ship - cogs
            
        deducted_str = ""
        if deductible_refund > 0 and t not in ['Cancelled', 'IGNORE'] and not refund_deducted:
            net -= deductible_refund
            refund_deducted = True
            deducted_str = f" (Absorbed ${deductible_refund:.2f} Refund Penalty)"
            
        order_total_net += net
        
        markdown.append(f"**Row {i+1}: {row.get('Lineitem name', 'Unknown')}**  \n")
        markdown.append(f"- **Type:** `{t}`  \n")
        markdown.append(f"- **Math:** `+${g:.2f}` (Gross) `+${sR:.2f}` (ShipRev) `-${fee:.2f}` (Fee) `-${act_ship:.2f}` (ShipCost) `-${cogs:.2f}` (COGS)  \n")
        markdown.append(f"- **Row Net:** **`${net:.2f}`**{deducted_str}  \n\n")
        
    markdown.append(f"### Total Embedded Order Profit: `${order_total_net:.2f}`\n")
    markdown.append("---\n")

with open(\'C:\\Users\\Chriviper\\.gemini\\antigravity\\brain\\b8131e06-b557-4549-9a09-8a32c742beeb\\math_audit.md\', 'w', encoding='utf-8') as f:
    f.write(''.join(markdown))
print("Rewrite complete")
