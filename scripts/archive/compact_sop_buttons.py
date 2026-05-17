import re

with open(r'd:\GitHub\neogleamz.github.io\index.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# 0-indexed: lines 3519-3525 = the Master Production SOP button bar div
new_block = [
    '                        <div style="display:flex; gap:5px; flex-wrap:nowrap; align-items:center;">\r\n',
    '                            <button class="sop-print-btn" data-click="click_window_openSopPrintModal_prod" style="padding:3px 8px; font-size:10px; font-weight:700; background:rgba(16,185,129,0.1); border:1px solid #10b981; color:#10b981; border-radius:5px; cursor:pointer; white-space:nowrap;">\U0001f5a8\ufe0f Print</button>\r\n',
    '                            <button data-mousedown="mousedown_sopDirectUpload" data-soptype="batches" data-target-textarea="productionAdminQA" style="padding:3px 8px; font-size:10px; font-weight:700; background:rgba(59,130,246,0.15); border:1px solid #3b82f6; color:#3b82f6; border-radius:5px; cursor:pointer; white-space:nowrap;" title="Upload File to Supabase">\u2601\ufe0f Upload</button>\r\n',
    '                            <button data-click="click_openSOPSnapshotCamera_production" style="padding:3px 8px; font-size:10px; font-weight:700; background:rgba(245,158,11,0.15); border:1px solid #F59E0B; color:#F59E0B; border-radius:5px; cursor:pointer; white-space:nowrap;">\U0001f4f8 Photo</button>\r\n',
    '                            <button data-click="click_openSOPTokenGuide" style="padding:3px 8px; font-size:10px; font-weight:700; background:rgba(245,158,11,0.1); border:1px solid #F59E0B; color:#F59E0B; border-radius:5px; cursor:pointer; white-space:nowrap;">\u2753 Guide</button>\r\n',
    '                            <button data-click="click_if_typeof_toggleHorizontalPrev" style="padding:3px 8px; font-size:10px; font-weight:700; background:rgba(59,130,246,0.1); border:1px solid #3b82f6; color:#3b82f6; border-radius:5px; cursor:pointer; white-space:nowrap;">\U0001f441\ufe0f Preview</button>\r\n',
    '                        </div>\r\n',
]

lines[3519:3526] = new_block

with open(r'd:\GitHub\neogleamz.github.io\index.html', 'w', encoding='utf-8') as f:
    f.writelines(lines)

print(f'Done. Replaced 7 lines with {len(new_block)} lines.')
