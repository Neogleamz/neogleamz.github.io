with open(r'd:\GitHub\neogleamz.github.io\assets\js\production-module.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Lines 1418-1424 (0-indexed: 1417-1423) = the Batchez inline SOP button container div + 5 buttons + closing div
# Replace the container div style and all 5 buttons with compact versions
new_block = [
    '                                            <div style="display:flex; gap:5px; flex-wrap:nowrap; align-items:center;">\r\n',
    '                                                <button class="sop-print-btn" data-raw-name="${grp.rawName.replace(/\'/g, \'\\\'\')}\" style="padding:3px 8px; font-size:10px; font-weight:700; background:rgba(16,185,129,0.1); border:1px solid #10b981; color:#10b981; border-radius:5px; cursor:pointer; white-space:nowrap;">\U0001f5a8\ufe0f Print</button>\r\n',
    '                                                <button data-mousedown="mousedown_sopDirectUpload" data-prodid="${wo.product_name.replace(/\'/g, \'\\\'\')}\" data-soptype="batches" data-target-textarea="inlineSopQA_${grp.id}" style="padding:3px 8px; font-size:10px; font-weight:700; background:rgba(59,130,246,0.15); border:1px solid #3b82f6; color:#3b82f6; border-radius:5px; cursor:pointer; white-space:nowrap;" title="Upload File to Supabase">\u2601\ufe0f Upload</button>\r\n',
    '                                                <button data-click="click_openSOPSnapshotCamera_inlineProduction" data-textid="inlineSopQA_${grp.id}" style="padding:3px 8px; font-size:10px; font-weight:700; background:rgba(245,158,11,0.15); border:1px solid #F59E0B; color:#F59E0B; border-radius:5px; cursor:pointer; white-space:nowrap;">\U0001f4f8 Photo</button>\r\n',
    '                                                <button data-click="click_openSOPTokenGuide" style="padding:3px 8px; font-size:10px; font-weight:700; background:rgba(245,158,11,0.1); border:1px solid #F59E0B; color:#F59E0B; border-radius:5px; cursor:pointer; white-space:nowrap;">\u2753 Guide</button>\r\n',
    '                                                <button data-click="click_toggleHorizontalPreview" data-left="inlineLeftPane_${grp.id}" data-preview="inlinePreviewContainer_${grp.id}" style="padding:3px 8px; font-size:10px; font-weight:700; background:rgba(59,130,246,0.1); border:1px solid #3b82f6; color:#3b82f6; border-radius:5px; cursor:pointer; white-space:nowrap;">\U0001f441\ufe0f Preview</button>\r\n',
    '                                            </div>\r\n',
]

# 0-indexed slice: lines 1417 to 1423 inclusive (7 lines)
print(f"BEFORE[1417]: {lines[1417][:120]!r}")
print(f"BEFORE[1423]: {lines[1423][:120]!r}")

lines[1417:1424] = new_block

print(f"AFTER[1417]: {lines[1417][:120]!r}")
print(f"Total lines: {len(lines)}")

with open(r'd:\GitHub\neogleamz.github.io\assets\js\production-module.js', 'w', encoding='utf-8') as f:
    f.writelines(lines)

print("Done.")
