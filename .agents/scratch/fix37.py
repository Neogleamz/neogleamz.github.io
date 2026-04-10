import sys
file_path = "c:\\Users\\Chriviper\\OneDrive - Neogleamz\\Accounting - General\\Expenses\\GitHub\\neogleamz.github.io\\sales-module.js"

with open(file_path, "r", encoding="utf-8") as f:
    text = f.read()

old_bug = """            // Fix double-Stripe deduction bug in Net
            net = net - fee;"""
            
if old_bug in text:
    text = text.replace(old_bug, "")
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(text)
    print("Successfully removed the double stripe fee penalty!")
else:
    print("Could not find double stripe fee line.")
