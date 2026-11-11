import { format, label, type InventoryRow } from "@/lib/inventory";
import s from "./inventory-dashboard.module.css";
const colors = ["#2563eb", "#0891b2", "#d97706", "#16a34a"];
export function InventoryCharts({ findings, region }: { findings: InventoryRow[]; region: string }) {
  const states = ["NEW", "ACTIVE", "REOPENED", "REMEDIATED"].map((key, i) => ({ key, count: findings.filter(f => f.FindingStatus === key).length, color: colors[i] }));
  const total = findings.length; let cursor = 0;
  const gradient = states.map(v => { const start = cursor; cursor += total ? v.count / total * 100 : 0; return `${v.color} ${start}% ${cursor}%`; }).join(",");
  const pending = findings.filter(f => f.FindingStatus !== "REMEDIATED");
  const counts = [1,2,3,4,5].map(n => pending.filter(f => +f.Severity === n).length);
  const palette = ["#0891b2", "#2563eb", "#d97706", "#ea580c", "#dc2626"];
  return <section className={s.visualCharts} aria-label="Gráficas del alcance"><article><h2>Estado de los hallazgos</h2><p>{region ? label(region) : "Todas las regiones"} · alcance activo</p><div className={s.donutLayout}><div className={s.donut} role="img" aria-label={states.map(v => `${label(v.key)}: ${v.count}`).join(", ")} style={{background: total ? `conic-gradient(${gradient})` : "#e2e8f0"}}><span><strong>{format(total)}</strong>hallazgos</span></div><ul>{states.map(v => <li key={v.key}><i style={{background:v.color}}/><span>{label(v.key)}</span><strong>{format(v.count)}</strong><small>{total ? Math.round(v.count / total * 100) : 0}%</small></li>)}</ul></div></article><article><h2>Severidad de los pendientes</h2><p>Niveles originales del archivo · {format(pending.length)} pendientes</p><div className={s.columnChart}>{counts.map((count,i) => <div key={i}><strong>{format(count)}</strong><div><i style={{height:`${count / Math.max(1,...counts) * 100}%`,background:palette[i]}} /></div><span>Nivel {i+1}</span></div>)}</div>{!pending.length && <p>Sin hallazgos pendientes en este alcance.</p>}</article></section>;
}
