"""
Fix: Checklist button bars now use flex-wrap:wrap so buttons gracefully
stack when the horizontal slider squishes the panel narrow.
Also add min-width:0 to the outer header div to let it shrink.
Targets:
  - index.html: Master Production SOP bar (lines 3518-3526 ~0-indexed 3517-3525)
  - packerz-module.js: Inline Packerz SOP bar (lines 459-466 ~0-indexed 458-465)
"""

# ── Fix index.html Master Production SOP ──────────────────────────────────
with open(r'd:\GitHub\neogleamz.github.io\index.html', 'r', encoding='utf-8') as f:
    html_lines = f.readlines()

# The outer header div (flex between h3 and button bar)
# Find it dynamically — look for the h3 CHECKLIST line and patch the parent div above it
for i, line in enumerate(html_lines):
    # The outer wrapper div that holds h3 + button bar (should have justify-content:space-between)
    if 'justify-content:space-between' in line and 'flex-wrap:wrap' in line and 'gap:10px' in line:
        # This is the outer wrapper - already wraps. Check the inner button div on i+2
        inner_idx = i + 2
        if inner_idx < len(html_lines) and 'flex-wrap:nowrap' in html_lines[inner_idx]:
            html_lines[inner_idx] = html_lines[inner_idx].replace(
                'flex-wrap:nowrap',
                'flex-wrap:wrap'
            )
            print(f"index.html: Fixed button bar flex-wrap at line {inner_idx+1}")
        break

with open(r'd:\GitHub\neogleamz.github.io\index.html', 'w', encoding='utf-8') as f:
    f.writelines(html_lines)

print("index.html patched.")

# ── Fix packerz-module.js Inline Packerz SOP ──────────────────────────────
with open(r'd:\GitHub\neogleamz.github.io\assets\js\packerz-module.js', 'r', encoding='utf-8') as f:
    pz_lines = f.readlines()

for i, line in enumerate(pz_lines):
    # Find the compact button bar div we wrote
    if 'flex-wrap:nowrap' in line and 'gap:5px' in line and 'openSopPrintModal' in pz_lines[i+1] if i+1 < len(pz_lines) else False:
        pz_lines[i] = pz_lines[i].replace('flex-wrap:nowrap', 'flex-wrap:wrap')
        print(f"packerz-module.js: Fixed at line {i+1}")
        break

with open(r'd:\GitHub\neogleamz.github.io\assets\js\packerz-module.js', 'w', encoding='utf-8') as f:
    f.writelines(pz_lines)

print("packerz-module.js patched.")

# ── Fix production-module.js Batchez inline SOP ───────────────────────────
with open(r'd:\GitHub\neogleamz.github.io\assets\js\production-module.js', 'r', encoding='utf-8') as f:
    pm_lines = f.readlines()

for i, line in enumerate(pm_lines):
    if 'flex-wrap:nowrap' in line and 'gap:5px' in line and 'sop-print-btn' in (pm_lines[i+1] if i+1 < len(pm_lines) else ''):
        pm_lines[i] = pm_lines[i].replace('flex-wrap:nowrap', 'flex-wrap:wrap')
        print(f"production-module.js: Fixed Batchez bar at line {i+1}")
        break

with open(r'd:\GitHub\neogleamz.github.io\assets\js\production-module.js', 'w', encoding='utf-8') as f:
    f.writelines(pm_lines)

print("production-module.js patched.")
print("All flex-wrap fixes applied.")
