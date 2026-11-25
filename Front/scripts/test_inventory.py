import copy
import io
import unittest
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET
from importlib.util import spec_from_file_location, module_from_spec

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT.parent / "OneDrive_1_10-6-2026" / "Dataset Académico Parches en Servidores.xlsx"
spec = spec_from_file_location("reader", ROOT / "scripts/read-inventory.py")
reader = module_from_spec(spec)
spec.loader.exec_module(reader)
NS = reader.NS


def mutate(change, sheet="sheet2.xml"):
    source = SOURCE.read_bytes()
    output = io.BytesIO()
    with zipfile.ZipFile(io.BytesIO(source)) as original, zipfile.ZipFile(output, "w", zipfile.ZIP_DEFLATED) as target:
        for name in original.namelist():
            data = original.read(name)
            if name == f"xl/worksheets/{sheet}":
                root = ET.fromstring(data)
                change(root)
                data = ET.tostring(root)
            target.writestr(name, data)
    return output.getvalue()


def set_cell(root, address, text):
    cell = root.find(f".//s:c[@r='{address}']", NS)
    cell.clear()
    cell.attrib.update({"r": address, "t": "inlineStr"})
    string = ET.SubElement(cell, "{" + NS["s"] + "}is")
    ET.SubElement(string, "{" + NS["s"] + "}t").text = text


class InventoryReaderTests(unittest.TestCase):
    def test_optional_country_column(self):
        def change(root):
            for number, text in [(4, "País"), (5, "México")]:
                row = root.find(f".//s:row[@r='{number}']", NS)
                cell = ET.SubElement(row, "{" + NS["s"] + "}c", {"r": f"R{number}"})
                set_cell(root, cell.attrib["r"], text)
        result = reader.read_inventory(mutate(change, "sheet1.xml"))
        self.assertNotIn("errors", result)
        self.assertEqual(result["servers"][0]["Country"], "México")
        self.assertEqual(result["servers"][1]["Country"], "")

    def test_duplicate_country_headers_rejected(self):
        def change(root):
            row = root.find(".//s:row[@r='4']", NS)
            for address, name in [("R4", "Country"), ("S4", "País")]:
                ET.SubElement(row, "{" + NS["s"] + "}c", {"r": address})
                set_cell(root, address, name)
        result = reader.read_inventory(mutate(change, "sheet1.xml"))
        self.assertTrue(any("encabezados duplicados" in error for error in result.get("errors", [])))

    def test_source_counts_and_observations(self):
        result = reader.read_inventory(SOURCE.read_bytes())
        self.assertNotIn("errors", result)
        self.assertEqual((len(result["servers"]), len(result["findings"])), (246, 3450))
        self.assertEqual({w["code"]: w["count"] for w in result["warnings"]}, {"volume": 222, "age": 1337, "closed_sla": 32})

    def reject(self, change, expected):
        result = reader.read_inventory(mutate(change))
        self.assertTrue(any(expected in e for e in result.get("errors", [])), result.get("errors"))

    def test_invalid_severity_rejected(self):
        self.reject(lambda root: set_cell(root, "E5", "9"), "Severity contiene un valor no admitido")

    def test_duplicate_finding_rejected(self):
        self.reject(lambda root: set_cell(root, "A6", "FND-000001"), "FindingID duplicados")

    def test_orphan_server_rejected(self):
        self.reject(lambda root: set_cell(root, "B5", "SRV-NO-EXISTE"), "servidores inexistentes")

    def test_missing_column_rejected(self):
        self.reject(lambda root: set_cell(root, "T4", "WrongColumn"), "faltan columnas: FindingRiskBand")

    def test_missing_value_rejected(self):
        self.reject(lambda root: set_cell(root, "C5", ""), "VulnerabilityTypeID está vacío")

    def test_unknown_category_rejected(self):
        self.reject(lambda root: set_cell(root, "F5", "CLOSED"), "FindingStatus contiene un valor no admitido")

    def test_formula_rejected_even_with_cached_value(self):
        def change(root):
            cell = root.find(".//s:c[@r='E5']", NS)
            ET.SubElement(cell, "{" + NS["s"] + "}f").text = "1+0"
        self.reject(change, "valor fijo en lugar de una fórmula")

    def test_duplicate_header_rejected(self):
        self.reject(lambda root: set_cell(root, "T4", "Severity"), "encabezados duplicados")

    def test_no_findings_is_valid(self):
        def change(root):
            data = root.find("s:sheetData", NS)
            for row in list(data):
                if int(row.attrib["r"]) > 4:
                    data.remove(row)
        result = reader.read_inventory(mutate(change))
        self.assertNotIn("errors", result)
        self.assertEqual(len(result["findings"]), 0)


if __name__ == "__main__":
    unittest.main()
