"use client";

import { useState } from "react";
import { ArrowLeft, ArrowUpRight, ChevronLeft, ChevronRight, X } from "lucide-react";
import { format, isOpen, label, type InventoryRow } from "@/lib/inventory";
import { InventoryTableRow } from "./inventory-table-row";
import s from "./inventory-dashboard.module.css";

type Props = {
  kind: "server" | "finding"; row: InventoryRow; findings: InventoryRow[];
  names: Record<string, string>; onClose: () => void;
  onFinding: (row: InventoryRow) => void; onServer: (id: string) => void;
};
export function InventoryRecordDetail({ kind, row, findings, names, onClose, onFinding, onServer }: Props) {
  const [view, setView] = useState("OPEN"), [offset, setOffset] = useState(0);
  const all = findings.filter(f => f.ServerID === row.ServerID);
  const pending = all.filter(isOpen);
  const rows = all.filter(f => view === "ALL" || (view === "OPEN" ? isOpen(f) : !isOpen(f))).sort((a, b) => +b.Severity - +a.Severity || a.FindingID.localeCompare(b.FindingID));
  const context = ["FunctionalRole", "OSFamily", "Environment", "RegionGroup", "InfrastructureType", "ExposureCategory", "AssetCriticality", "OSLifecycle"];
  const fields = (keys: string[]) => <dl className={s.detailFields}>{keys.map(key => <div key={key}><dt>{names[key] ?? key}</dt><dd>{key === "Severity" ? `Nivel ${row[key]}` : label(row[key] ?? "")}</dd></div>)}</dl>;
  return <div className={s.detailContent}>
    <header className={s.detailHeading}><div><h2>{kind === "server" ? "Servidor" : "Hallazgo"} {row.FindingID ?? row.ServerID}</h2><p>{kind === "server" ? `${label(row.FunctionalRole)} · ${label(row.Environment)} · Región ${label(row.RegionGroup)}` : `${label(row.FunctionalCategory)} · En el servidor ${row.ServerID}`}</p></div><button className={s.secondary} onClick={onClose} aria-label="Cerrar detalle"><X size={20} />Cerrar</button></header>
    {kind === "server" ? <>
      <section className={s.serverMetrics} aria-label="Resumen del servidor"><div><strong>{format(pending.filter(f => +f.Severity >= 4).length)}</strong><span>Pendientes de nivel 4–5</span></div><div><strong>{format(pending.length)}</strong><span>Hallazgos pendientes</span></div><div><strong>{format(pending.filter(f => f.SLAStatus === "BREACHED").length)}</strong><span>Fuera del plazo de atención</span></div></section>
      <section className={s.detailSection}><h3>¿Qué función cumple este servidor?</h3><p>Su contexto operativo ayuda a entender el impacto de los hallazgos.</p>{fields(context)}</section>
      <section className={s.detailSection} aria-label="Hallazgos del servidor"><div className={s.detailSectionHeading}><div><h3>¿Qué necesita atención?</h3><p>Hallazgos que coinciden con los filtros del análisis, ordenados por severidad.</p></div><div className={s.detailTabs}>{[["OPEN", "Pendientes"], ["ALL", "Todos"], ["REMEDIATED", "Remediados"]].map(([id, text]) => <button key={id} aria-pressed={view === id} onClick={() => { setView(id); setOffset(0); }}>{text}</button>)}</div></div>
        <div className={s.tableWrap}><table><thead><tr><th>Hallazgo</th><th>Severidad</th><th>Estado</th><th>Tiempo reportado</th><th>Acción requerida</th><th><span className={s.srOnly}>Detalle</span></th></tr></thead><tbody>{rows.slice(offset, offset + 20).map(f => <InventoryTableRow key={f.FindingID} onOpen={() => onFinding(f)}><td><span className={s.rowLink}>{f.FindingID}</span><small>{label(f.FunctionalCategory)}</small></td><td><span className={`${s.severity} ${s[`level${f.Severity}`]}`}>Nivel {f.Severity}</span></td><td>{label(f.FindingStatus)}</td><td>{label(f.AgeBand)}</td><td>{label(f.RemediationCategory)}</td><td><button className={s.iconButton} aria-label={`Abrir hallazgo ${f.FindingID}`} onClick={() => onFinding(f)}><ArrowUpRight size={20} /></button></td></InventoryTableRow>)}</tbody></table>{!rows.length && <p className={s.panelPadding}>No hay hallazgos en esta selección. Puedes cambiar entre pendientes, todos y remediados.</p>}</div>
        {rows.length > 20 && <div className={s.pagination}><span>{offset + 1}–{Math.min(offset + 20, rows.length)} de {format(rows.length)}</span><div><button className={s.iconButton} disabled={!offset} onClick={() => setOffset(offset - 20)} aria-label="Hallazgos anteriores"><ChevronLeft size={20} /></button><button className={s.iconButton} disabled={offset + 20 >= rows.length} onClick={() => setOffset(offset + 20)} aria-label="Hallazgos siguientes"><ChevronRight size={20} /></button></div></div>}
      </section>
    </> : <>
      <button className={s.textButton} onClick={() => onServer(row.ServerID)}><ArrowLeft size={17} />Volver al servidor {row.ServerID}</button>
      <section className={s.findingSummary}><div><h3>¿Qué tan prioritario es?</h3><strong>Nivel {row.Severity}</strong><p>{label(row.FindingStatus)} · Riesgo reportado: {label(row.FindingRiskBand)}</p></div><div><h3>¿Cuánto tiempo lleva registrado?</h3><strong>{label(row.AgeBand)}</strong><p>Última observación: {label(row.LastSeenBand)}</p></div></section>
      <section className={s.detailSection}><h3>¿Qué acción requiere?</h3><p className={s.remediationAction}>{label(row.RemediationCategory)}</p><p>{row.SLAStatus === "BREACHED" ? "El plazo de atención figura como incumplido en el archivo." : "El archivo agrupa este hallazgo dentro del plazo o como no aplicable."}</p>{fields(["FunctionalCategory", "ExploitabilityCategory", "MalwareAssociation", "AssetCriticality"])}</section>
    </>}
    <details className={s.technical}><summary>Ver ficha técnica completa · {Object.keys(row).length} campos</summary><p>Valores del Excel. Los códigos originales se conservan para consulta.</p><dl className={s.detailFields}>{Object.entries(row).map(([key, value]) => <div key={key}><dt>{names[key] ?? key}<small>{key}</small></dt><dd>{key === "Severity" ? `Nivel ${value}` : label(value)}{label(value) !== value && <small>{value}</small>}</dd></div>)}</dl></details>
  </div>;
}
