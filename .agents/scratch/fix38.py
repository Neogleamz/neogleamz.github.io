import sys

file_path = "c:\\Users\\Chriviper\\OneDrive - Neogleamz\\Accounting - General\\Expenses\\GitHub\\neogleamz.github.io\\sales-module.js"

with open(file_path, "r", encoding="utf-8") as f:
    text = f.read()

# 1. Modify the Parser Strategy
old_parser = """if (oTot === 0 && fStat.toLowerCase() !== 'refunded') return 'Warranty';"""
new_parser = """if (oTot === 0 && fStat.toLowerCase() !== 'refunded') return 'NEEDS ATTENTION';"""
text = text.replace(old_parser, new_parser)

# 2. Add 'NEEDS ATTENTION' to executeSalesSync mathematical exceptions
old_exec_1 = """            let isCostOnlyItem = (type === 'Exchange Replacement' || type === 'Warranty' || type === 'Gift' || type === 'IGNORE');
            
            if (type === 'Pre-Ship Exchange' || type === 'IGNORE') { cogs = 0; }"""
new_exec_1 = """            let isCostOnlyItem = (type === 'Exchange Replacement' || type === 'Warranty' || type === 'Gift' || type === 'IGNORE');
            
            if (type === 'Pre-Ship Exchange' || type === 'IGNORE' || type === 'NEEDS ATTENTION') { cogs = 0; }"""
text = text.replace(old_exec_1, new_exec_1)

old_exec_2 = """            let actualShipCost = (type === 'Pre-Ship Exchange' || type === 'IGNORE') ? 0 : (parseFloat(r.shipping || 0) > 0 ? parseFloat(r.shipping) : (SHIP_COST * r.qty_sold));"""
new_exec_2 = """            let actualShipCost = (type === 'Pre-Ship Exchange' || type === 'IGNORE' || type === 'NEEDS ATTENTION') ? 0 : (parseFloat(r.shipping || 0) > 0 ? parseFloat(r.shipping) : (SHIP_COST * r.qty_sold));"""
text = text.replace(old_exec_2, new_exec_2)

old_exec_3 = """            if (type === 'IGNORE') net = 0;"""
new_exec_3 = """            if (type === 'IGNORE' || type === 'NEEDS ATTENTION') net = 0;"""
text = text.replace(old_exec_3, new_exec_3)


# 3. Add 'NEEDS ATTENTION' to renderSalesTable mathematical exceptions
old_rend_1 = """        let isCostOnlyItem = (type === 'Exchange Replacement' || type === 'Warranty' || type === 'Gift' || type === 'IGNORE');
        
        // --- CUSTOM EXCEPTION OVERRIDES ---
        if (type === 'Pre-Ship Exchange' || type === 'IGNORE') {
            liveCogs = 0;
        }"""
new_rend_1 = """        let isCostOnlyItem = (type === 'Exchange Replacement' || type === 'Warranty' || type === 'Gift' || type === 'IGNORE');
        
        // --- CUSTOM EXCEPTION OVERRIDES ---
        if (type === 'Pre-Ship Exchange' || type === 'IGNORE' || type === 'NEEDS ATTENTION') {
            liveCogs = 0;
        }"""
text = text.replace(old_rend_1, new_rend_1)

old_rend_2 = """        let actualShipCost = type === 'Pre-Ship Exchange' ? 0 : 
                             type === 'IGNORE' ? 0 :
                             (s > 0 ? s : SHIP_COST); """
new_rend_2 = """        let actualShipCost = type === 'Pre-Ship Exchange' ? 0 : 
                             type === 'IGNORE' ? 0 :
                             type === 'NEEDS ATTENTION' ? 0 :
                             (s > 0 ? s : SHIP_COST); """
text = text.replace(old_rend_2, new_rend_2)

# 4. Inject the User Dropdown
old_dropdown = """                <option style="background:var(--bg-panel); color:var(--text-main);" value="Standard" ${x.transaction_type==='Standard'?'selected':''}>Standard</option>"""
new_dropdown = """                <option style="background:var(--bg-panel); color:var(--text-main); font-weight:bold; color:#ef4444;" value="NEEDS ATTENTION" ${x.transaction_type==='NEEDS ATTENTION'?'selected':''}>⚠️ NEEDS ATTENTION</option>
                <option style="background:var(--bg-panel); color:var(--text-main);" value="Standard" ${x.transaction_type==='Standard'?'selected':''}>Standard</option>"""
text = text.replace(old_dropdown, new_dropdown)


# Drop the redundant Warranty tag from the dropdown (lines 635, 636)
old_redundant = """                <option style="background:var(--bg-panel); color:var(--text-main);" value="Warranty" ${x.transaction_type==='Warranty'?'selected':''}>Warranty Replacement</option>
                <option style="background:var(--bg-panel); color:var(--text-main);" value="Warranty" ${x.transaction_type==='Warranty'?'selected':''}>Warranty</option>"""
new_redundant = """                <option style="background:var(--bg-panel); color:var(--text-main);" value="Warranty" ${x.transaction_type==='Warranty'?'selected':''}>Warranty</option>"""
text = text.replace(old_redundant, new_redundant)


with open(file_path, "w", encoding="utf-8") as f:
    f.write(text)
print("SUCCESS: NEEDS ATTENTION state strictly implemented.")
