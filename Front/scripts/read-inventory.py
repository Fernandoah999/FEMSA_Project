"""Read the academic XLSX contract using only Python's standard library.

No formulas are executed. Read stdin bytes; emit one JSON response on stdout.
"""
import io
import json
import posixpath
import sys
import zipfile
from collections import Counter
from xml.etree import ElementTree as ET

NS = {"s": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
SERVER_COLUMNS = "ServerID OSFamily OSLifecycle InfrastructureType AssetType FunctionalRole Environment RegionGroup AssetCriticality CPUCapacityBand MemoryCapacityBand ArchitectureBand InventoryFreshnessBand BootAgeBand ExposureCategory RiskBand VulnerabilityVolumeBand".split()
FINDING_COLUMNS = "FindingID ServerID VulnerabilityTypeID FunctionalCategory Severity FindingStatus AgeBand LastSeenBand DetectionFrequencyBand ReopenBand ExploitabilityCategory MalwareAssociation ComplianceFlag PortCategory ProtocolCategory EncryptionContext RemediationCategory SLAStatus AssetCriticality FindingRiskBand".split()
AGES = "AGE_0_7D AGE_8_30D AGE_31_90D AGE_91_180D AGE_GT180D".split()
CRITICALITY = "LOW MEDIUM HIGH VERY_HIGH CRITICAL".split()
ENUMS = {
    "OSFamily": "WINDOWS_SERVER LINUX_SERVER UNIX_SERVER HYPERVISOR OTHER_SERVER".split(),
    "OSLifecycle": "SUPPORTED EOL EOL_EOS".split(),
    "InfrastructureType": ["CLOUD", "ON_PREM"],
    "AssetType": "VIRTUAL_MACHINE PHYSICAL_SERVER HYPERVISOR".split(),
    "FunctionalRole": "GENERAL_INFRASTRUCTURE ERP_ANALYTICS DATABASE ERP_GOVERNANCE WEB_APPLICATION SECURITY DIRECTORY FILE_TRANSFER ERP_PRODUCTION".split(),
    "Environment": "PRODUCTION DEVELOPMENT TEST".split(),
    "RegionGroup": "REGION_NORTH REGION_CENTRAL REGION_SOUTH".split(),
    "AssetCriticality": CRITICALITY,
    "CPUCapacityBand": "CPU_1_2 CPU_3_4 CPU_5_8 CPU_9_16 CPU_GT16".split(),
    "MemoryCapacityBand": "MEM_8_15 MEM_16_31 MEM_32_63 MEM_64_127 MEM_GE128".split(),
    "ArchitectureBand": ["ARCH_64", "ARCH_OTHER"],
    "InventoryFreshnessBand": AGES,
    "BootAgeBand": AGES,
    "ExposureCategory": ["INTERNAL", "INTERNET_EXPOSED"],
    "RiskBand": CRITICALITY[:-1],
    "VulnerabilityVolumeBand": "1_5 6_20 21_50 51_100 GT100".split(),
    "FunctionalCategory": "DIRECTORY SECURITY DATABASE ERP WEB_APPLICATION OPERATING_SYSTEM SECURE_CONFIGURATION MIDDLEWARE".split(),
    "Severity": ["1", "2", "3", "4", "5"],
    "FindingStatus": "NEW ACTIVE REMEDIATED REOPENED".split(),
    "AgeBand": AGES,
    "LastSeenBand": AGES,
    "DetectionFrequencyBand": "ONCE TWO_TO_FIVE SIX_TO_TWENTY GT_TWENTY".split(),
    "ReopenBand": "NONE ONCE TWO_TO_FIVE GT_FIVE".split(),
    "ExploitabilityCategory": ["NOT_IDENTIFIED", "KNOWN_OR_AVAILABLE"],
    "MalwareAssociation": ["NOT_IDENTIFIED", "ASSOCIATED"],
    "ComplianceFlag": ["YES", "NO"],
    "PortCategory": "SYSTEM_PORT REGISTERED_PORT DYNAMIC_PORT NO_PORT".split(),
    "ProtocolCategory": "TCP UDP OTHER".split(),
    "EncryptionContext": ["YES", "NO"],
    "RemediationCategory": "PATCH_OR_UPDATE VERSION_UPGRADE CONFIGURATION_CHANGE GENERAL_REMEDIATION".split(),
    "SLAStatus": ["BREACHED", "WITHIN_OR_NOT_APPLICABLE"],
    "FindingRiskBand": CRITICALITY[:-1],
}


def read_inventory(data):
    errors = []
    warnings = []

    def error(message):
        if len(errors) < 40:
            errors.append(message)

    with zipfile.ZipFile(io.BytesIO(data)) as archive:
        infos = archive.infolist()
        if len(infos) > 3000 or sum(x.file_size for x in infos) > 150 * 1024 * 1024:
            raise ValueError("El contenido descomprimido supera el límite de 150 MB o 3,000 entradas.")
        if len({x.filename for x in infos}) != len(infos):
            raise ValueError("El archivo contiene entradas ZIP duplicadas.")

        def xml(name):
            raw = archive.read(name)
            if b"<!DOCTYPE" in raw.upper() or b"<!ENTITY" in raw.upper():
                raise ValueError("El Excel contiene declaraciones XML no admitidas.")
            return ET.fromstring(raw)

        strings = []
        if "xl/sharedStrings.xml" in archive.namelist():
            strings = ["".join(x.text or "" for x in si.findall(".//s:t", NS)) for si in xml("xl/sharedStrings.xml").findall("s:si", NS)]
        relationships = {r.attrib["Id"]: r.attrib["Target"] for r in xml("xl/_rels/workbook.xml.rels")}
        sheets = {}
        for sheet in xml("xl/workbook.xml").findall("s:sheets/s:sheet", NS):
            rid = sheet.attrib["{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id"]
            target = relationships[rid]
            path = posixpath.normpath(target.lstrip("/") if target.startswith("/") else "xl/" + target)
            if not path.startswith("xl/"):
                raise ValueError("Referencia de hoja no válida.")
            sheets[sheet.attrib["name"].strip().casefold()] = path

        def read_sheet(name, columns, limit):
            if name.casefold() not in sheets:
                error(f"Falta la hoja {name}.")
                return []
            rows = xml(sheets[name.casefold()]).findall("s:sheetData/s:row", NS)
            headers = None
            result = []
            for row in rows:
                number = int(row.attrib["r"])
                cells = {}
                formulas = set()
                for cell in row.findall("s:c", NS):
                    col = "".join(c for c in cell.attrib["r"] if c.isalpha())
                    value = cell.find("s:v", NS)
                    text = value.text or "" if value is not None else ""
                    if cell.attrib.get("t") == "s":
                        text = strings[int(text)] if text else ""
                    elif cell.attrib.get("t") == "inlineStr":
                        text = "".join(x.text or "" for x in cell.findall(".//s:t", NS))
                    cells[col] = text.strip()
                    if cell.find("s:f", NS) is not None:
                        formulas.add(col)
                if not any(cells.values()):
                    continue
                if headers is None:
                    if columns[0] in cells.values():
                        headers = cells
                        if len(set(headers.values())) != len(headers.values()):
                            error(f"{name}, fila {number}: encabezados duplicados.")
                        missing = set(columns) - set(headers.values())
                        if missing:
                            error(f"{name}: faltan columnas: {', '.join(sorted(missing))}.")
                            return []
                        extras = set(headers.values()) - set(columns) - {""}
                        if extras:
                            warnings.append({"code": "extra_columns", "count": len(extras), "message": f"{name}: se ignoraron columnas adicionales: {', '.join(sorted(extras))}."})
                    elif number > 25:
                        break
                    continue
                record = {label: cells.get(col, "") for col, label in headers.items() if label in columns}
                for col in formulas:
                    if headers.get(col) in columns:
                        error(f"{name}, fila {number}, {headers[col]}: usa un valor fijo en lugar de una fórmula.")
                for key, value in record.items():
                    if not value:
                        error(f"{name}, fila {number}: {key} está vacío.")
                    elif key in ENUMS:
                        normalized = value.upper()
                        if key == "Severity" and normalized.endswith(".0"):
                            normalized = normalized[:-2]
                        record[key] = normalized
                        if normalized not in ENUMS[key]:
                            error(f"{name}, fila {number}: {key} contiene un valor no admitido: {value[:80]}.")
                if any(len(value) > 250 for value in record.values()):
                    error(f"{name}, fila {number}: un valor supera 250 caracteres.")
                result.append(record)
                if len(result) > limit:
                    raise ValueError(f"{name} supera el límite de {limit:,} registros.")
            if headers is None:
                error(f"{name}: no se encontró el encabezado {columns[0]} en las primeras 25 filas.")
            return result

        servers = read_sheet("Servidores", SERVER_COLUMNS, 10000)
        findings = read_sheet("Vulnerabilidades", FINDING_COLUMNS, 100000)
        if not servers:
            error("La hoja Servidores no contiene registros.")
        server_ids = Counter(r["ServerID"] for r in servers)
        finding_ids = Counter(r["FindingID"] for r in findings)
        for kind, counts in [("ServerID", server_ids), ("FindingID", finding_ids)]:
            duplicates = [k for k, v in counts.items() if v > 1]
            if duplicates:
                error(f"{kind} duplicados: {', '.join(duplicates[:10])}.")
        orphans = [r["FindingID"] for r in findings if r["ServerID"] not in server_ids]
        if orphans:
            error(f"{len(orphans)} hallazgos hacen referencia a servidores inexistentes. Ejemplos: {', '.join(orphans[:5])}.")
        if errors:
            return {"errors": errors}

        by_id = {r["ServerID"]: r for r in servers}
        actual = Counter(r["ServerID"] for r in findings)

        def volume(n):
            return "0" if n == 0 else "1_5" if n <= 5 else "6_20" if n <= 20 else "21_50" if n <= 50 else "51_100" if n <= 100 else "GT100"

        checks = [
            ("volume", sum(volume(actual[s["ServerID"]]) != s["VulnerabilityVolumeBand"] for s in servers), "servidores tienen un rango declarado de vulnerabilidades diferente al detalle. Los KPIs usan el detalle importado."),
            ("criticality", sum(r["AssetCriticality"] != by_id[r["ServerID"]]["AssetCriticality"] for r in findings), "hallazgos tienen criticidad diferente a su servidor. Los filtros de activo usan la hoja Servidores."),
            ("age", sum(AGES.index(r["LastSeenBand"]) > AGES.index(r["AgeBand"]) for r in findings), "hallazgos indican una última observación más antigua que su antigüedad. Se conservan los rangos originales."),
            ("closed_sla", sum(r["FindingStatus"] == "REMEDIATED" and r["SLAStatus"] == "BREACHED" for r in findings), "hallazgos remediados conservan un SLA incumplido. No se cuentan como pendientes vencidos."),
        ]
        for code, count, message in checks:
            if count:
                warnings.append({"code": code, "count": count, "message": f"{count:,} {message}"})
        return {"servers": servers, "findings": findings, "warnings": warnings}


if __name__ == "__main__":
    try:
        data = sys.stdin.buffer.read(20 * 1024 * 1024 + 1)
        if len(data) > 20 * 1024 * 1024:
            raise ValueError("El archivo supera el límite de 20 MB.")
        result = read_inventory(data)
    except Exception as exc:
        result = {"errors": [str(exc) if isinstance(exc, ValueError) else "No se pudo leer el Excel. Usa un archivo .xlsx válido con las hojas Servidores y Vulnerabilidades."]}
    json.dump(result, sys.stdout, ensure_ascii=False)
