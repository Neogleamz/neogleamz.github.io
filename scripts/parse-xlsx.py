import zipfile
import xml.etree.ElementTree as ET
import os

xlsx_path = r"D:\GitHub\neogleamz.github.io\data\exports\Neogleamz_Full_Backup_2026-06-03_18-20-30.xlsx"

with zipfile.ZipFile(xlsx_path, 'r') as z:
    # Get shared strings
    shared_strings = []
    try:
        ss_xml = z.read("xl/sharedStrings.xml")
        root = ET.fromstring(ss_xml)
        for si in root.findall('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}si'):
            t = si.find('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t')
            if t is not None:
                shared_strings.append(t.text)
            else:
                # sometimes text is inside <r><t>
                text = ""
                for r in si.findall('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}r'):
                    t_el = r.find('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t')
                    if t_el is not None and t_el.text:
                        text += t_el.text
                shared_strings.append(text)
    except KeyError:
        pass # No shared strings

    # Find the sheet ID for "inventory_consumption"
    wb_xml = z.read("xl/workbook.xml")
    root = ET.fromstring(wb_xml)
    sheet_id = None
    for sheet in root.iter('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}sheet'):
        if sheet.attrib.get('name') == 'inventory_consumption':
            # r:id is like rId1, we need to match it in _rels
            rid = sheet.attrib.get('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id')
            sheet_id = rid
            break

    if not sheet_id:
        print("Could not find inventory_consumption sheet")
        exit(1)

    # Resolve sheet filename
    rels_xml = z.read("xl/_rels/workbook.xml.rels")
    root = ET.fromstring(rels_xml)
    sheet_filename = None
    for rel in root.findall('{http://schemas.openxmlformats.org/package/2006/relationships}Relationship'):
        if rel.attrib.get('Id') == sheet_id:
            sheet_filename = "xl/" + rel.attrib.get('Target')
            break

    # Parse sheet
    sheet_xml = z.read(sheet_filename)
    root = ET.fromstring(sheet_xml)
    
    rows = []
    for row in root.iter('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}row'):
        cells = []
        for c in row.iter('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}c'):
            v = c.find('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}v')
            val = None
            if v is not None:
                if c.attrib.get('t') == 's':
                    val = shared_strings[int(v.text)]
                else:
                    val = v.text
            cells.append(val)
        rows.append(cells)

    # Print first 20 rows
    for r in rows[:20]:
        print(r)
    
    # Save to CSV
    import csv
    with open(r"D:\GitHub\neogleamz.github.io\data\exports\inventory_consumption_restored.csv", 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerows(rows)
    print(f"Saved {len(rows)} rows to inventory_consumption_restored.csv")
