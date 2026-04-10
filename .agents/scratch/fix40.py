import sys
file_path = "c:\\Users\\Chriviper\\OneDrive - Neogleamz\\Accounting - General\\Expenses\\GitHub\\neogleamz.github.io\\sales-module.js"

with open(file_path, "r", encoding="utf-8") as f:
    text = f.read()

# Replace all occurrences of isCostOnlyItem array
old_str = "let isCostOnlyItem = (type === 'Exchange Replacement' || type === 'Warranty' || type === 'Gift' || type === 'IGNORE');"
new_str = "let isCostOnlyItem = (type === 'Exchange Replacement' || type === 'Warranty' || type === 'Gift' || type === 'NEEDS ATTENTION' || type === 'IGNORE');"

text = text.replace(old_str, new_str)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(text)
print("SUCCESS: isCostOnlyItem updated to include NEEDS ATTENTION")
