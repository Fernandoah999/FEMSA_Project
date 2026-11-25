import { useState, type FormEvent } from "react";
import { criticalities, format, isSlaDays, label, type Criticality, type InventoryRow, type SlaPolicy } from "@/lib/inventory";
import s from "./inventory-dashboard.module.css";

const states = [
  { key: "NEW", color: "var(--chart-new)" },
  { key: "ACTIVE", color: "var(--chart-active)" },
  { key: "REOPENED", color: "var(--chart-reopened)" },
  { key: "REMEDIATED", color: "var(--chart-within)" },
];
const severityColors = ["var(--chart-level-1)", "var(--chart-level-2)", "var(--chart-new)", "var(--chart-active)", "var(--chart-overdue)"];

export function InventoryCharts({ findings, pending, scope }: { findings: InventoryRow[]; pending: InventoryRow[]; scope: string }) {
  let cursor = 0;
  const total = findings.length;
  const distribution = states.map(state => {
    const count = findings.filter(finding => finding.FindingStatus === state.key).length;
    const percent = total ? count / total * 100 : 0;
    const start = cursor;
    cursor += percent;
    return { ...state, count, percent, segment: `${state.color} ${start}% ${cursor}%` };
  });
  const counts = severityColors.map((_, index) => pending.filter(finding => +finding.Severity === index + 1).length);
  const max = Math.max(1, ...counts);

  return <section className={s.visualCharts} aria-label="Gráficas del alcance">
    <article>
      <h2>Estado de los hallazgos</h2>
      <p>{scope}</p>
      <div className={s.donutLayout}>
        <div className={s.donut} aria-hidden="true" style={{ background: total ? `conic-gradient(${distribution.map(state => state.segment).join(",")})` : undefined }}>
          <span><strong>{format(total)}</strong>hallazgos</span>
        </div>
        <ul>{distribution.map(state => <li key={state.key}>
          <i aria-hidden="true" style={{ background: state.color }} />
          <span>{label(state.key)}</span>
          <strong>{format(state.count)}</strong>
          <small>{Math.round(state.percent)}%</small>
        </li>)}</ul>
      </div>
    </article>
    <article>
      <h2>Severidad de los pendientes</h2>
      <p>{pending.length ? `${format(pending.length)} pendientes por nivel del Excel` : "Sin pendientes en este alcance."}</p>
      <div className={s.columnChart}>{counts.map((count, index) => <div key={index}>
        <strong>{format(count)}</strong>
        <div aria-hidden="true"><i style={{ height: `${count / max * 100}%`, background: severityColors[index] }} /></div>
        <span>Nivel {index + 1}</span>
      </div>)}</div>
    </article>
  </section>;
}

const slaStates = [
  { key: "WITHIN", name: "Dentro del plazo", color: "var(--chart-within)" },
  { key: "BREACHED", name: "Fuera del plazo", color: "var(--chart-overdue)" },
  { key: "UNKNOWN", name: label("UNKNOWN"), color: "var(--chart-unknown)" },
];

export function SlaChart({ pending, policy, onChange }: { pending: InventoryRow[]; policy: SlaPolicy; onChange: (policy: SlaPolicy) => void }) {
  const [draft, setDraft] = useState<Partial<Record<Criticality, string>>>({});
  const [applied, setApplied] = useState(false);
  const counts = slaStates.map(state => {
    const count = pending.filter(finding => finding.SLAStatus === state.key).length;
    return { ...state, count, percent: pending.length ? count / pending.length * 100 : 0 };
  });

  function applyPolicy(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = { ...policy };
    for (const level of criticalities) {
      const value = draft[level];
      if (value === undefined) continue;
      const days = Number(value);
      if (value === "" || !isSlaDays(days)) return;
      next[level] = days;
    }
    onChange(next);
    setDraft({});
    setApplied(true);
  }

  return <section className={s.slaChart} aria-labelledby="sla-heading">
    <div className={s.slaResults}>
      <h2 id="sla-heading">Cumplimiento del SLA</h2>
      <p>{pending.length ? `${format(pending.length)} pendientes en el alcance activo` : "Sin pendientes en el alcance activo."}</p>
      <div className={s.slaTrack} aria-hidden="true">{counts.map(state => <i key={state.key} style={{ width: `${state.percent}%`, background: state.color }} />)}</div>
      <ul className={s.slaLegend} aria-live="polite">{counts.map(state => <li key={state.key}>
        <i aria-hidden="true" style={{ background: state.color }} />
        <span>{state.name}</span>
        <strong>{format(state.count)}</strong>
        <small>{state.percent.toLocaleString("es-MX", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%</small>
      </li>)}</ul>
      <p className={s.slaNote}>El SLA queda indeterminado si el rango de antigüedad cruza el plazo o faltan datos para evaluarlo.</p>
    </div>
    <form className={s.slaPolicy} onSubmit={applyPolicy}>
      <fieldset aria-describedby="sla-help">
        <legend>Plazo por criticidad del activo</legend>
        <p id="sla-help">Escribe días enteros por criticidad. Usa 0 para el mismo día.</p>
        <div className={s.slaFields}>{criticalities.map(level => <div key={level}>
          <label htmlFor={`sla-days-${level}`}>{label(level)}</label>
          <input id={`sla-days-${level}`} type="number" inputMode="numeric" min={0} max={Number.MAX_SAFE_INTEGER} step={1} required value={draft[level] ?? policy[level]}
            onChange={event => {
              const value = event.target.value;
              setDraft(previous => ({ ...previous, [level]: value }));
              setApplied(false);
            }} />
        </div>)}</div>
        <div className={s.slaActions}>
          <button className={s.secondary} type="submit" disabled={!Object.keys(draft).length}>Aplicar plazos</button>
          <span role="status">{applied && "Plazos aplicados."}</span>
        </div>
      </fieldset>
    </form>
  </section>;
}
