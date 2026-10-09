#!/usr/bin/env python3
"""
FGSBot Excel Exporter
Updates the original template 'finanzplanung.xlsx' with user's customized data
and writes it out to a target path.
"""

import sys
import json
import zipfile
import xml.etree.ElementTree as ET
import os

TEMPLATE_PATH = "/Users/kunnath/projects/zgsbot/finanzplanung.xlsx"
OUTPUT_PATH = "/Users/kunnath/projects/zgsbot/public/Finanzplanung_FGSBot_Export.xlsx"

def update_cell_value(root, ns, cell_ref, new_val):
    """
    Updates or inserts a cell value in an openpyxl/spreadsheetml worksheet XML
    """
    col_str = "".join([c for c in cell_ref if c.isalpha()])
    row_num = "".join([c for c in cell_ref if c.isdigit()])
    
    # Find row
    row = root.find(f".//ns:row[@r='{row_num}']", ns)
    if row is None:
        sheetData = root.find('ns:sheetData', ns)
        if sheetData is None:
            return
        row = ET.SubElement(sheetData, '{http://schemas.openxmlformats.org/spreadsheetml/2006/main}row', {'r': row_num})
    
    # Find cell
    c = row.find(f"ns:c[@r='{cell_ref}']", ns)
    if c is None:
        c = ET.SubElement(row, '{http://schemas.openxmlformats.org/spreadsheetml/2006/main}c', {'r': cell_ref})
    
    # Remove shared string flag if it had one
    if 't' in c.attrib and c.attrib['t'] == 's':
        del c.attrib['t']
    
    v = c.find('ns:v', ns)
    if v is None:
        v = ET.SubElement(c, '{http://schemas.openxmlformats.org/spreadsheetml/2006/main}v')
    v.text = str(new_val)

def export_plan(data, output_file=OUTPUT_PATH):
    inv = data.get('investitionen', {})
    bk = data.get('betriebskosten', {})
    pa = data.get('privataufwand', {})
    up = data.get('umsatzplanung', {})
    fin = data.get('finanzierung', {})
    tax = data.get('steuer', {})

    ns = {'ns': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main',
          'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'}
    ET.register_namespace('', 'http://schemas.openxmlformats.org/spreadsheetml/2006/main')
    ET.register_namespace('r', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships')

    # Read original zip into memory
    files_data = {}
    with zipfile.ZipFile(TEMPLATE_PATH, 'r') as zin:
        for info in zin.infolist():
            files_data[info.filename] = zin.read(info.filename)

    # 1. Update Sheet 1 (Investitionen)
    if 'xl/worksheets/sheet1.xml' in files_data:
        root = ET.fromstring(files_data['xl/worksheets/sheet1.xml'])
        update_cell_value(root, ns, 'B21', inv.get('bga', 2300) * 0.65) # laptops
        update_cell_value(root, ns, 'B22', inv.get('bga', 2300) * 0.35) # web/branding
        update_cell_value(root, ns, 'B30', inv.get('gwg_unter_800', 500))
        update_cell_value(root, ns, 'B40', inv.get('gwg_800_1000', 700))
        update_cell_value(root, ns, 'B51', inv.get('maschinen', 0))
        files_data['xl/worksheets/sheet1.xml'] = ET.tostring(root, xml_declaration=True, encoding='utf-8')

    # 2. Update Sheet 2 (Betriebskosten monatl.)
    if 'xl/worksheets/sheet2.xml' in files_data:
        root = ET.fromstring(files_data['xl/worksheets/sheet2.xml'])
        months_cols = ['B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M']
        for col in months_cols:
            update_cell_value(root, ns, f'{col}7', bk.get('buero_coworking', 250))
            update_cell_value(root, ns, f'{col}10', bk.get('bueromaterial', 30))
            update_cell_value(root, ns, f'{col}11', bk.get('telefon_internet', 60))
            update_cell_value(root, ns, f'{col}13', bk.get('server_cloud', 250))
            update_cell_value(root, ns, f'{col}14', bk.get('marketing_werbung', 300))
            update_cell_value(root, ns, f'{col}16', bk.get('versicherungen', 50))
            update_cell_value(root, ns, f'{col}17', bk.get('buchhaltung_steuer', 150))
            update_cell_value(root, ns, f'{col}23', bk.get('software_lizenzen', 150))
            update_cell_value(root, ns, f'{col}25', bk.get('kontofuehrung', 20))
            update_cell_value(root, ns, f'{col}26', bk.get('weiterbildung', 50))
            update_cell_value(root, ns, f'{col}27', bk.get('sonstiger_aufwand', 100))
        # Startkosten B31, B32, B33
        update_cell_value(root, ns, 'B31', bk.get('gruendungskosten', 1500))
        update_cell_value(root, ns, 'B32', bk.get('mietkaution', 300))
        update_cell_value(root, ns, 'B33', bk.get('launch_reserve', 4700))
        files_data['xl/worksheets/sheet2.xml'] = ET.tostring(root, xml_declaration=True, encoding='utf-8')

    # 3. Update Sheet 4 (Umsatz monatlich)
    if 'xl/worksheets/sheet5.xml' in files_data:
        root = ET.fromstring(files_data['xl/worksheets/sheet5.xml'])
        months_cols = ['B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M']
        monthly_revs = up.get('monatsumsaetze_j1', [8000]*12)
        for i, col in enumerate(months_cols):
            rev_val = monthly_revs[i] if i < len(monthly_revs) else monthly_revs[-1]
            update_cell_value(root, ns, f'{col}9', rev_val)
        files_data['xl/worksheets/sheet5.xml'] = ET.tostring(root, xml_declaration=True, encoding='utf-8')

    # Write out modified zip
    os.makedirs(os.path.dirname(output_file), exist_ok=True)
    with zipfile.ZipFile(output_file, 'w', compression=zipfile.ZIP_DEFLATED) as zout:
        for fname, content in files_data.items():
            zout.writestr(fname, content)
    
    print(f"Exported successfully to {output_file}")
    return output_file

if __name__ == '__main__':
    if len(sys.argv) > 1 and os.path.exists(sys.argv[1]):
        with open(sys.argv[1], 'r', encoding='utf-8') as f:
            data = json.load(f)
    else:
        # Default data test
        data = {
            'investitionen': {'bga': 2300, 'gwg_unter_800': 500, 'gwg_800_1000': 700},
            'betriebskosten': {'buero_coworking': 250, 'server_cloud': 250, 'marketing_werbung': 300},
            'umsatzplanung': {'monatsumsaetze_j1': [8000, 9000, 10000, 11000, 12000, 12500, 13000, 13500, 14000, 14500, 15000, 22010]}
        }
    export_plan(data)
