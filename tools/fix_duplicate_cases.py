"""
Boy Scout Fix: Remove two duplicate case labels in system-event-delegator.js
- Line 463: 'click_window_openPrintSOP_currentPri' duplicates line 262 (inside multi-case)
- Line 897: check and fix second duplicate
"""

with open(r'd:\GitHub\neogleamz.github.io\assets\js\system-event-delegator.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

print(f"Total lines: {len(lines)}")

# Line 463 (0-indexed: 462) — duplicate of the multi-case at line 261-263
# The L463 handler calls window.openPrintSOP(currentPrintJob.part_name) — 3D Layerz specific
# Rename to a unique label: click_window_openLayerzPrintSOP_currentPri
target_462 = "click_window_openPrintSOP_currentPri"
if target_462 in lines[462]:
    lines[462] = lines[462].replace(
        "click_window_openPrintSOP_currentPri",
        "click_window_openLayerzPrintSOP_currentPri"
    )
    print("Fixed line 463: renamed duplicate case to 'click_window_openLayerzPrintSOP_currentPri'")
else:
    print(f"WARN: line 462 content: {repr(lines[462][:100])}")

# Inspect line 897 (0-indexed: 896)
print(f"\nLine 897 content: {repr(lines[896][:120])}")
for i in range(893, 905):
    print(f"  L{i+1}: {lines[i][:100].rstrip()}")

with open(r'd:\GitHub\neogleamz.github.io\assets\js\system-event-delegator.js', 'w', encoding='utf-8') as f:
    f.writelines(lines)

print("\nSaved.")
