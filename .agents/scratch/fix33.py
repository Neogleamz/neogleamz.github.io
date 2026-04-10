import sys

file_path = "c:\\Users\\Chriviper\\OneDrive - Neogleamz\\Accounting - General\\Expenses\\GitHub\\neogleamz.github.io\\sales-module.js"

with open(file_path, "r", encoding="utf-8") as f:
    text = f.read()

text = text.replace("'Replacement / Warranty'", "'Exchange Replacement'")
text = text.replace('"Replacement / Warranty"', '"Exchange Replacement"')

# Add new line to dropdown if it's missing (though it might already be replaced by the previous line)
# Wait, let's make sure it's perfect:
drop_old = '<option style="background:var(--bg-panel); color:var(--text-main);" value="Exchange Replacement" ${x.transaction_type===\'Exchange Replacement\'?\'selected\':\'\'}>Exchange Replacement</option>'
drop_new = '''<option style="background:var(--bg-panel); color:var(--text-main);" value="Exchange Replacement" ${x.transaction_type==='Exchange Replacement'?'selected':''}>Exchange Replacement</option>
                <option style="background:var(--bg-panel); color:var(--text-main);" value="Warranty" ${x.transaction_type==='Warranty'?'selected':''}>Warranty Replacement</option>'''

if drop_old in text:
    text = text.replace(drop_old, drop_new)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(text)
print("Dropdown UI tag separated!")
