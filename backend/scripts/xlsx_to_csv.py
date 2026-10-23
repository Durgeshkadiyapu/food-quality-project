import sys
import zipfile
import xml.etree.ElementTree as ET
import csv

def convert(xlsx_path, target_csv):
    with zipfile.ZipFile(xlsx_path) as z:
        wb_tree = ET.fromstring(z.read("xl/workbook.xml"))
        ns = {"main": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
        sheet_elem = wb_tree.find(".//main:sheet", ns)
        sheet_name = sheet_elem.attrib["name"] if sheet_elem is not None else "Sheet1"
        
        sheet1 = ET.fromstring(z.read("xl/worksheets/sheet1.xml"))
        rows = []
        for r in sheet1.findall(".//main:row", ns):
            row_vals = []
            for c in r.findall("main:c", ns):
                v = c.find("main:v", ns)
                inline = c.find(".//main:t", ns)
                if v is not None and v.text:
                    row_vals.append(v.text)
                elif inline is not None and inline.text:
                    row_vals.append(inline.text)
                else:
                    row_vals.append("")
            rows.append(row_vals)

    with open(target_csv, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerows(rows)

    print(sheet_name)

if __name__ == "__main__":
    if len(sys.argv) > 2:
        convert(sys.argv[1], sys.argv[2])
    else:
        print("Usage: py xlsx_to_csv.py input.xlsx output.csv")
