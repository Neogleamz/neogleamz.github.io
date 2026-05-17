"""
Fix line 897: 'click_printPackerzSOP' at L897 duplicates L275.
L897 handler calls legacy printPackerzSOP() - rename to 'click_printPackerzSOP_legacy'
so the new openSopPrintModal routing at L275 takes precedence.
"""

with open(r'd:\GitHub\neogleamz.github.io\assets\js\system-event-delegator.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Line 897 (0-indexed: 896)
if "click_printPackerzSOP" in lines[896] and "legacy" not in lines[896]:
    lines[896] = lines[896].replace(
        "click_printPackerzSOP",
        "click_printPackerzSOP_legacy"
    )
    print(f"Fixed line 897: renamed to 'click_printPackerzSOP_legacy'")
else:
    print(f"WARN: line 896 = {repr(lines[896][:100])}")

with open(r'd:\GitHub\neogleamz.github.io\assets\js\system-event-delegator.js', 'w', encoding='utf-8') as f:
    f.writelines(lines)

print("Saved.")
