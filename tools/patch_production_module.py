"""
Applies ALL production-module.js patches in one atomic pass:
  1. Compact Batchez inline SOP button bar (lines 1418-1424)
  2. Re-apply Rich Text telemetry parser (line 2308)
  3. Re-apply white-space:pre-wrap (line 2311)
  4. Fix getRTToolbar — add flex-shrink:0 to color input, max-width on select (line 29)
  5. Fix PHOTO/UPLOAD/NEW URL row — flex-wrap:wrap, white-space:nowrap (lines 80-86)
"""

with open(r'd:\GitHub\neogleamz.github.io\assets\js\production-module.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

print(f"Total lines: {len(lines)}")

# ── PATCH 1: getRTToolbar (line 29, 0-indexed: 28) ──────────────────────────
old_toolbar_fragment = 'width:24px; height:24px; padding:0; border:none; cursor:pointer; background:transparent;">'
new_toolbar_fragment = 'width:24px; height:24px; padding:0; border:none; cursor:pointer; background:transparent; flex-shrink:0;">'

old_select_fragment = 'style="width:auto; padding:4px; font-size:12px; border:1px solid var(--border-input); border-radius:4px; background:var(--bg-input); color:var(--text-main); margin-right:4px;">'
new_select_fragment = 'style="max-width:100px; min-width:0; padding:4px; font-size:12px; border:1px solid var(--border-input); border-radius:4px; background:var(--bg-input); color:var(--text-main); margin-right:4px;">'

if old_toolbar_fragment in lines[28]:
    lines[28] = lines[28].replace(old_toolbar_fragment, new_toolbar_fragment)
    print("PATCH 1a: color input flex-shrink applied")
else:
    print("WARN: PATCH 1a not found")

if old_select_fragment in lines[28]:
    lines[28] = lines[28].replace(old_select_fragment, new_select_fragment)
    print("PATCH 1b: select max-width applied")
else:
    print("WARN: PATCH 1b not found")

# ── PATCH 2: PHOTO/UPLOAD/NEW URL row (0-indexed 79-85) ────────────────────
# Lines 80-86 in the file (0-indexed 79-85)
print(f"Line 80 (0-idx 79): {lines[79][:80]!r}")
print(f"Line 81 (0-idx 80): {lines[80][:80]!r}")

new_action_rows = [
    '                <div style="display:flex; justify-content:flex-start; flex-wrap:wrap; margin-top:8px; margin-bottom:4px; padding:4px 8px; border-radius:6px;">\r\n',
    '                    <div style="display:flex; gap:4px; flex-wrap:wrap;">\r\n',
    '                        <button type="button" data-mousedown="mousedown_smartPhotoPaste" style="font-size:10px; font-weight:bold; padding:2px 8px; border-radius:4px; border:1px solid #F59E0B; background:rgba(245,158,11,0.15); color:#F59E0B; cursor:pointer; white-space:nowrap;" title="Smart Photo Paste">\U0001f4f8 PHOTO</button>\r\n',
    '                        <button type="button" data-mousedown="mousedown_sopDirectUpload" data-prodid="${prodId}" data-soptype="${sopType}" style="font-size:10px; font-weight:bold; padding:2px 8px; border-radius:4px; border:1px solid #3b82f6; background:rgba(59,130,246,0.15); color:#3b82f6; cursor:pointer; white-space:nowrap;" title="Upload File to Supabase">\u2601\ufe0f UPLOAD MEDIA</button>\r\n',
    '                        <button type="button" data-mousedown="mousedown_smartAttachmentUrl" style="font-size:10px; font-weight:bold; padding:2px 6px; border-radius:4px; border:1px solid #10b981; background:rgba(16,185,129,0.15); color:#10b981; cursor:pointer; white-space:nowrap;">+ NEW URL</button>\r\n',
    '                    </div>\r\n',
    '                </div>\r\n',
]
# Check the old content first
if 'justify-content:flex-end' in lines[79] or 'justify-content:flex-end' in lines[80]:
    lines[79:86] = new_action_rows
    print("PATCH 2: PHOTO/UPLOAD/NEW URL row wrapped")
else:
    print(f"WARN: PATCH 2 target not found at lines 79-80. Line 79: {lines[79][:100]!r}")

# ── PATCH 3: Batchez inline SOP button bar (0-indexed 1417-1423) ───────────
print(f"Line 1418 (0-idx 1417): {lines[1417][:80]!r}")
new_batchez = [
    '                                            <div style="display:flex; gap:5px; flex-wrap:nowrap; align-items:center;">\r\n',
    '                                                <button class="sop-print-btn" data-raw-name="${grp.rawName.replace(/\'/g, \'\\\'\')}\" style="padding:3px 8px; font-size:10px; font-weight:700; background:rgba(16,185,129,0.1); border:1px solid #10b981; color:#10b981; border-radius:5px; cursor:pointer; white-space:nowrap;">\U0001f5a8\ufe0f Print</button>\r\n',
    '                                                <button data-mousedown="mousedown_sopDirectUpload" data-prodid="${wo.product_name.replace(/\'/g, \'\\\'\')}\" data-soptype="batches" data-target-textarea="inlineSopQA_${grp.id}" style="padding:3px 8px; font-size:10px; font-weight:700; background:rgba(59,130,246,0.15); border:1px solid #3b82f6; color:#3b82f6; border-radius:5px; cursor:pointer; white-space:nowrap;" title="Upload File to Supabase">\u2601\ufe0f Upload</button>\r\n',
    '                                                <button data-click="click_openSOPSnapshotCamera_inlineProduction" data-textid="inlineSopQA_${grp.id}" style="padding:3px 8px; font-size:10px; font-weight:700; background:rgba(245,158,11,0.15); border:1px solid #F59E0B; color:#F59E0B; border-radius:5px; cursor:pointer; white-space:nowrap;">\U0001f4f8 Photo</button>\r\n',
    '                                                <button data-click="click_openSOPTokenGuide" style="padding:3px 8px; font-size:10px; font-weight:700; background:rgba(245,158,11,0.1); border:1px solid #F59E0B; color:#F59E0B; border-radius:5px; cursor:pointer; white-space:nowrap;">\u2753 Guide</button>\r\n',
    '                                                <button data-click="click_toggleHorizontalPreview" data-left="inlineLeftPane_${grp.id}" data-preview="inlinePreviewContainer_${grp.id}" style="padding:3px 8px; font-size:10px; font-weight:700; background:rgba(59,130,246,0.1); border:1px solid #3b82f6; color:#3b82f6; border-radius:5px; cursor:pointer; white-space:nowrap;">\U0001f441\ufe0f Preview</button>\r\n',
    '                                            </div>\r\n',
]
if 'display:flex; gap:8px' in lines[1417]:
    lines[1417:1424] = new_batchez
    print("PATCH 3: Batchez button bar applied")
else:
    print(f"WARN: PATCH 3 target not found. Line 1417: {lines[1417][:100]!r}")

# ── PATCH 4: Telemetry parser + pre-wrap ──────────────────────────────────
# After patches 1-3, line counts may shift by +1 (action row stays same count)
# Search dynamically for the target lines
for i, line in enumerate(lines):
    if "let content = s.text || '';" in line and 'parseProductionTelemetryLine' not in line:
        lines[i] = lines[i].replace(
            "let content = s.text || '';",
            "let content = typeof parseProductionTelemetryLine === 'function' ? parseProductionTelemetryLine(s.text || '', -1) : s.text || '';"
        )
        print(f"PATCH 4a: telemetry parser injected at line {i+1}")
    if 'font-size:15px; line-height:1.6;' in line and 'white-space:pre-wrap' not in line and '${content}' in line:
        lines[i] = lines[i].replace(
            'font-size:15px; line-height:1.6;',
            'font-size:15px; line-height:1.6; white-space:pre-wrap;'
        )
        print(f"PATCH 4b: pre-wrap injected at line {i+1}")

with open(r'd:\GitHub\neogleamz.github.io\assets\js\production-module.js', 'w', encoding='utf-8') as f:
    f.writelines(lines)

print("All patches written successfully.")
