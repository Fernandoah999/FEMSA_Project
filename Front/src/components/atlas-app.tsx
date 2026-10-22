"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { useSearchParams } from "next/navigation";
import {
  Activity,
  ArrowDown,
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Clock3,
  FileBarChart,
  Filter,
  Globe2,
  Layers3,
  LayoutDashboard,
  ListFilter,
  Search,
  Server as ServerIcon,
  Shield,
  ShieldAlert,
  SlidersHorizontal,
  Star,
  Target,
  X,
} from "lucide-react";
import { GeoScene } from "./geo-scene";
import {
  format,
  pageNames,
  regions,
  servers,
  severityClass,
  styles,
  vulnerabilities,
  type PageId,
  type Server,
  type Severity,
  type StyleId,
} from "@/lib/data";

const nav = [
  { id: "dashboard" as PageId, icon: LayoutDashboard },
  { id: "servidores" as PageId, icon: ServerIcon },
  { id: "vulnerabilidades" as PageId, icon: ShieldAlert },
  { id: "reportes" as PageId, icon: FileBarChart },
];
const sevOrder = ["Crítica", "Alta", "Media", "Baja"];
function Badge({ severity }: { severity: Severity }) {
  return (
    <span className={`badge ${severityClass(severity)}`}>
      <span />
      {severity}
    </span>
  );
}
function Panel({
  title,
  meta,
  children,
  className = "",
}: {
  title: string;
  meta?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel ${className}`}>
      <div className="panel-heading">
        <h2>{title}</h2>
        {meta}
      </div>
      {children}
    </section>
  );
}
function TrendChart({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`trend-chart ${compact ? "compact" : ""}`}>
      <svg
        viewBox="0 0 440 140"
        role="img"
        aria-label="Hallazgos críticos en seis semanas: 620, 570, 585, 496, 470 y 428"
      >
        {[20, 65, 110].map((y, i) => (
          <g key={y}>
            <line
              x1="30"
              x2="430"
              y1={y}
              y2={y}
              stroke="var(--line)"
              strokeDasharray="3 4"
            />
            <text x="0" y={y + 4} fill="var(--muted)" fontSize="9">
              {700 - i * 200}
            </text>
          </g>
        ))}
        <path
          d="M30 38 L110 49 L190 46 L270 68 L350 77 L430 87 L430 110 L30 110Z"
          fill="var(--accent)"
          opacity=".07"
        />
        <polyline
          points="30,38 110,49 190,46 270,68 350,77 430,87"
          fill="none"
          stroke="var(--accent)"
          strokeWidth="2"
        />
        {[38, 49, 46, 68, 77, 87].map((y, i) => (
          <circle key={i} cx={30 + i * 80} cy={y} r="3" fill="var(--accent)" />
        ))}
        {["19 ago", "26 ago", "02 sep", "09 sep", "16 sep", "24 sep"].map(
          (d, i) => (
            <text
              key={d}
              x={30 + i * 80}
              y="132"
              textAnchor={i === 5 ? "end" : "middle"}
              fill="var(--muted)"
              fontSize="9"
            >
              {d}
            </text>
          ),
        )}
      </svg>
    </div>
  );
}
function download(
  name: string,
  text: string,
  type = "text/csv;charset=utf-8;",
) {
  const blob = new Blob(["\uFEFF" + text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function AtlasApp() {
  const params = useSearchParams();
  const initialStyle =
    styles.find((s) => s.id === params.get("style"))?.id ?? "orbit";
  const [styleId, setStyleId] = useState<StyleId>(initialStyle);
  const [variant, setVariant] = useState(
    [1, 2, 3].includes(Number(params.get("v"))) ? Number(params.get("v")) : 1,
  );
  const [page, setPage] = useState<PageId>(
    nav.some((n) => n.id === params.get("page"))
      ? (params.get("page") as PageId)
      : "dashboard",
  );
  const [region, setRegion] = useState("all");
  const [search, setSearch] = useState("");
  const [severity, setSeverity] = useState("Todas");
  const [unit, setUnit] = useState("Todas");
  const [sort, setSort] = useState("risk");
  const [gallery, setGallery] = useState(false);
  const [reference, setReference] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [detail, setDetail] = useState<Server | null>(null);
  const [cveDetail, setCveDetail] = useState<
    (typeof vulnerabilities)[number] | null
  >(null);
  const [planned, setPlanned] = useState<string[]>([]);
  const [toast, setToast] = useState("");
  const [reportType, setReportType] = useState("Resumen ejecutivo");
  const [reportReady, setReportReady] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [snapshot, setSnapshot] = useState("24 sep 2026");
  const [showHelp, setShowHelp] = useState(false);
  const detailRef = useRef<HTMLDialogElement>(null);
  const currentStyle = styles.find((s) => s.id === styleId)!;
  const currentKey = `${styleId}-${variant}`;
  const selectedRegion = regions.find((r) => r.id === region);
  const total = selectedRegion?.total ?? 12480;
  const critical = selectedRegion?.critical ?? 428;
  const obsolete = selectedRegion
    ? Math.round((selectedRegion.total * (100 - selectedRegion.health)) / 100)
    : 2184;
  const health = selectedRegion?.health ?? 82.5;
  const filtered = servers
    .filter(
      (s) =>
        (region === "all" || s.region === region) &&
        (severity === "Todas" || s.severity === severity) &&
        (unit === "Todas" || s.unit === unit) &&
        `${s.name} ${s.ip} ${s.software} ${s.id}`
          .toLowerCase()
          .includes(search.toLowerCase()),
    )
    .sort((a, b) =>
      sort === "name" ? a.name.localeCompare(b.name) : b.cvss - a.cvss,
    );
  const filteredCves = vulnerabilities.filter(
    (v) =>
      (severity === "Todas" || v.severity === severity) &&
      `${v.id} ${v.title} ${v.software}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );

  useEffect(() => {
    try {
      setFavorites(
        JSON.parse(localStorage.getItem("femsa-design-favorites") ?? "[]"),
      );
    } catch {
      /* Local preferences are optional. */
    }
  }, []);
  useEffect(() => {
    const query = new URLSearchParams({
      style: styleId,
      v: String(variant),
      page,
    });
    window.history.replaceState(null, "", `?${query}`);
  }, [styleId, variant, page]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 3500);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    if (detail || cveDetail) detailRef.current?.showModal();
    else detailRef.current?.close();
  }, [detail, cveDetail]);
  function navigate(p: PageId) {
    setPage(p);
    setSearch("");
    setSeverity("Todas");
    setUnit("Todas");
    setDetail(null);
    setCveDetail(null);
  }
  function choose(id: StyleId, v: number) {
    setStyleId(id);
    setVariant(v);
    setGallery(false);
  }
  function step(delta: number) {
    const index = styles.findIndex((s) => s.id === styleId) * 3 + variant - 1;
    const next = (index + delta + 24) % 24;
    choose(styles[Math.floor(next / 3)].id, (next % 3) + 1);
  }
  function favorite(key: string) {
    const next = favorites.includes(key)
      ? favorites.filter((f) => f !== key)
      : [...favorites, key];
    setFavorites(next);
    try {
      localStorage.setItem("femsa-design-favorites", JSON.stringify(next));
    } catch {
      setToast("Favorito guardado solo durante esta sesión.");
    }
  }
  function openCritical() {
    navigate("servidores");
    setSeverity("Crítica");
  }
  function exportServers() {
    download(
      "femsa-servidores-demo.csv",
      "DATOS FICTICIOS - NO USAR COMO AUDITORÍA REAL\nServidor,IP,Software,Version instalada,Version objetivo,Riesgo,CVSS\n" +
        filtered
          .map((s) =>
            [
              s.name,
              s.ip,
              s.software,
              s.version,
              s.target,
              s.severity,
              s.cvss,
            ].join(","),
          )
          .join("\n"),
    );
    setToast("Inventario de demostración descargado.");
  }
  function generateReport() {
    setGenerating(true);
    setTimeout(() => {
      setGenerating(false);
      setReportReady(true);
      setToast("Reporte de demostración listo.");
    }, 650);
  }

  const regionList = (
    <div className="region-list">
      {regions.map((r) => (
        <button
          key={r.id}
          className={region === r.id ? "selected" : ""}
          onClick={() => setRegion(region === r.id ? "all" : r.id)}
        >
          <span className="region-code">{r.id.toUpperCase()}</span>
          <span className="region-name">
            {r.name}
            <small>{format(r.total)} servidores</small>
          </span>
          <span className="region-count">
            {r.critical}
            <small>críticos</small>
          </span>
          <ChevronRight size={13} />
        </button>
      ))}
    </div>
  );
  const metrics = (
    <div className="metrics">
      {[
        {
          label: "Servidores inventariados",
          value: format(total),
          note: "5 países · 4 unidades de negocio",
          icon: ServerIcon,
        },
        {
          label: "Servidores críticos",
          value: format(critical),
          note: "Atención prioritaria",
          icon: ShieldAlert,
        },
        {
          label: "Software obsoleto",
          value: format(obsolete),
          note: "Versiones fuera de política",
          icon: Layers3,
        },
        {
          label: "Cobertura actualizada",
          value: `${health}%`,
          note: "Objetivo de referencia: 95%",
          icon: CheckCheck,
        },
      ].map((m, i) => (
        <button
          className={`metric metric-${i}`}
          key={m.label}
          onClick={() => (i === 1 ? openCritical() : navigate("servidores"))}
        >
          <span className="metric-label">
            {m.label}
            <m.icon size={16} />
          </span>
          <strong>{m.value}</strong>
          <span className="metric-note">
            {i === 1 && <span className="status-dot danger" />}
            {m.note}
          </span>
        </button>
      ))}
    </div>
  );
  const riskPanel = (
    <Panel
      title="Distribución del riesgo"
      meta={<span className="tiny">SERVIDORES</span>}
      className="risk-panel"
    >
      <div className="risk-total">
        <strong>{format(critical + obsolete)}</strong>
        <span>requieren revisión</span>
      </div>
      <div
        className="risk-stack"
        aria-label="Crítica 16%, alta 35%, media 32%, baja 17%"
      >
        {[16, 35, 32, 17].map((v, i) => (
          <span
            key={i}
            className={["critical", "high", "medium", "low"][i]}
            style={{ width: `${v}%` }}
          />
        ))}
      </div>
      <div className="risk-legend">
        {(["Crítica", "Alta", "Media", "Baja"] as Severity[]).map((s, i) => (
          <button
            key={s}
            onClick={() => {
              navigate("servidores");
              setSeverity(s);
            }}
          >
            <Badge severity={s} />
            <strong>{[critical, 912, 836, 436][i]}</strong>
          </button>
        ))}
      </div>
    </Panel>
  );
  const priorityList = (
    <div className="priority-list">
      {servers
        .filter((s) => region === "all" || s.region === region)
        .sort((a, b) => b.cvss - a.cvss)
        .slice(0, 3)
        .map((s, i) => (
          <button key={s.id} onClick={() => setDetail(s)}>
            <span className="priority-rank">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span>
              <strong>{s.name}</strong>
              <small>
                {s.software} {s.version} · {s.owner}
              </small>
            </span>
            <span className="score">{s.cvss}</span>
            <ArrowUpRight size={16} />
          </button>
        ))}
    </div>
  );
  const map = (
    <GeoScene
      styleId={styleId}
      variant={variant}
      region={region}
      onRegion={setRegion}
    />
  );

  return (
    <div className={`atlas theme-${styleId} variant-${variant}`}>
      <a className="skip-link" href="#main">
        Ir al contenido
      </a>
      <header className="lab-bar">
        <button
          className="lab-home"
          onClick={() => setGallery((g) => !g)}
          aria-expanded={gallery}
        >
          <Layers3 size={19} />
          <span>
            Design lab<small>FEMSA / MÓDULO A</small>
          </span>
          <ChevronDown size={14} />
        </button>
        <div className="style-select">
          <label htmlFor="style">Estilo</label>
          <select
            id="style"
            value={styleId}
            onChange={(e) => setStyleId(e.target.value as StyleId)}
          >
            {styles.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div className="variant-switch" aria-label="Versión de diseño">
          {[1, 2, 3].map((v) => (
            <button
              key={v}
              aria-pressed={variant === v}
              onClick={() => setVariant(v)}
            >
              V{v}
              <span>{currentStyle.variants[v - 1]}</span>
            </button>
          ))}
        </div>
        <div className="lab-actions">
          <button
            className="icon-button"
            aria-label="Propuesta anterior"
            onClick={() => step(-1)}
          >
            <ChevronLeft size={17} />
          </button>
          <span className="design-count">
            {String(
              styles.findIndex((s) => s.id === styleId) * 3 + variant,
            ).padStart(2, "0")}
            <span> / 24</span>
          </span>
          <button
            className="icon-button"
            aria-label="Propuesta siguiente"
            onClick={() => step(1)}
          >
            <ChevronRight size={17} />
          </button>
          <button
            className={`icon-button ${favorites.includes(currentKey) ? "is-favorite" : ""}`}
            aria-label={
              favorites.includes(currentKey)
                ? "Quitar de favoritos"
                : "Guardar favorito"
            }
            aria-pressed={favorites.includes(currentKey)}
            onClick={() => favorite(currentKey)}
          >
            <Star
              size={17}
              fill={favorites.includes(currentKey) ? "currentColor" : "none"}
            />
          </button>
          <button
            className="reference-button"
            onClick={() => setReference((r) => !r)}
            aria-expanded={reference}
          >
            Referencia
            <ArrowUpRight size={13} />
          </button>
          <button
            className="all-designs"
            onClick={() => setGallery((g) => !g)}
            aria-expanded={gallery}
          >
            Ver las 24
          </button>
        </div>
      </header>

      {gallery && (
        <section className="design-gallery" aria-label="Galería de propuestas">
          <div className="gallery-heading">
            <div>
              <h2>Ocho miradas. Un mismo desafío.</h2>
              <p>
                Explora las 24 propuestas y guarda las que quieras seguir
                puliendo.
              </p>
            </div>
            <div className="button-row">
              <button
                className="secondary"
                aria-pressed={favoritesOnly}
                onClick={() => setFavoritesOnly((f) => !f)}
              >
                <Star size={15} />
                {favoritesOnly
                  ? "Mostrar todas"
                  : `Favoritas (${favorites.length})`}
              </button>
              <button
                className="icon-button"
                aria-label="Cerrar galería"
                onClick={() => setGallery(false)}
              >
                <X size={20} />
              </button>
            </div>
          </div>
          <div className="gallery-grid">
            {styles
              .filter(
                (s) =>
                  !favoritesOnly ||
                  [1, 2, 3].some((v) => favorites.includes(`${s.id}-${v}`)),
              )
              .map((s) => (
                <article
                  key={s.id}
                  className="style-card"
                  style={{ "--swatch": s.color } as CSSProperties}
                >
                  <div className="reference-thumb">
                    {s.reference ? (
                      <img
                        src={`/references/${s.reference}`}
                        alt={`Referencia visual ${s.name}`}
                      />
                    ) : (
                      <div className="brand-preview">
                        <img src="/femsa-logo.png" alt="FEMSA" />
                        <span>Identidad corporativa</span>
                      </div>
                    )}
                    <span>{s.name}</span>
                    <span className="reference-origin">Referencia visual</span>
                  </div>
                  <p>{s.subtitle}</p>
                  {s.variants.map((name, i) => (
                    <div className="gallery-version" key={name}>
                      <button
                        onClick={() => choose(s.id, i + 1)}
                        aria-label={`Abrir ${s.name} versión ${i + 1}`}
                      >
                        <small>V{i + 1}</small>
                        <span>{name}</span>
                        <ArrowUpRight size={14} />
                      </button>
                      <button
                        className="icon-button"
                        aria-label={`Favorito ${s.name} V${i + 1}`}
                        aria-pressed={favorites.includes(`${s.id}-${i + 1}`)}
                        onClick={() => favorite(`${s.id}-${i + 1}`)}
                      >
                        <Star
                          size={14}
                          fill={
                            favorites.includes(`${s.id}-${i + 1}`)
                              ? "currentColor"
                              : "none"
                          }
                        />
                      </button>
                    </div>
                  ))}
                </article>
              ))}
          </div>
          {favoritesOnly && !favorites.length && (
            <div className="empty">
              <Star size={30} />
              <h3>Aún no tienes favoritas</h3>
              <p>Marca una propuesta con la estrella para volver a ella.</p>
              <button
                className="secondary"
                onClick={() => setFavoritesOnly(false)}
              >
                Explorar propuestas
              </button>
            </div>
          )}
        </section>
      )}
      {reference && (
        <section className="reference-panel">
          <div>
            <h2>
              {currentStyle.name} · {currentStyle.variants[variant - 1]}
            </h2>
            <p>{currentStyle.descriptions[variant - 1]}</p>
            {styleId === "femsa" ? (
              <p>
                Manual proporcionado: vino web #990033, Calibri con alternativa
                sans serif, fondos blancos y sin azul. El logotipo conserva su
                proporción. Páginas 6–16 del manual.
              </p>
            ) : (
              <p>
                Referencia de tu biblioteca WebDesignInspo. La imagen es
                inspiración; la interfaz es una adaptación para auditoría de
                infraestructura.
              </p>
            )}
            <button className="secondary" onClick={() => setReference(false)}>
              Volver al diseño
            </button>
          </div>
          {currentStyle.reference ? (
            <img
              src={`/references/${currentStyle.reference}`}
              alt={`Referencia original de ${currentStyle.name}`}
            />
          ) : (
            <img
              className="femsa-reference"
              src="/femsa-logo.png"
              alt="Logotipo FEMSA del manual"
            />
          )}
        </section>
      )}

      <div className="workspace">
        <aside className="sidebar">
          <div className="product-brand">
            {styleId === "femsa" ? (
              <img src="/femsa-logo.png" alt="FEMSA" />
            ) : (
              <>
                <div className="brand-mark">
                  <Shield size={22} />
                </div>
                <span>
                  ATLAS<span>FEMSA · INFRAESTRUCTURA</span>
                </span>
              </>
            )}
          </div>
          <div className="workspace-name">
            <span className="workspace-symbol">A</span>
            <div>
              Módulo de auditoría<small>Infraestructura & riesgo</small>
            </div>
            <ChevronDown size={13} />
          </div>
          <nav aria-label="Navegación principal">
            {nav.map((n) => (
              <button
                key={n.id}
                aria-label={pageNames[n.id]}
                title={pageNames[n.id]}
                className={page === n.id ? "active" : ""}
                aria-current={page === n.id ? "page" : undefined}
                onClick={() => navigate(n.id)}
              >
                <n.icon size={18} />
                <span>{pageNames[n.id]}</span>
                {n.id === "vulnerabilidades" && <small>428</small>}
              </button>
            ))}
          </nav>
          <div className="sidebar-bottom">
            <div className="inventory-note">
              <span className="status-dot" />
              <span>
                Inventario de ejemplo<small>Corte: 24 sep 2026 · 08:30</small>
              </span>
            </div>
            <button
              className="help-button"
              onClick={() => setShowHelp((h) => !h)}
            >
              <CircleHelp size={17} />
              <span>Acerca del prototipo</span>
            </button>
            <div className="profile">
              <span>AM</span>
              <div>
                Ana Martínez<small>Seguridad de infraestructura</small>
              </div>
            </div>
          </div>
        </aside>

        <div className="work-area">
          <div className="context-bar">
            <span>
              <span className="context-company">FEMSA</span>
              <ChevronRight size={12} />
              {pageNames[page]}
            </span>
            <div>
              <span className="demo-label">DATOS DE DEMOSTRACIÓN</span>
              <button
                className="icon-button"
                aria-label="Información del prototipo"
                onClick={() => setShowHelp((h) => !h)}
              >
                <CircleHelp size={16} />
              </button>
              <span className="avatar">AM</span>
            </div>
          </div>
          {showHelp && (
            <section className="help-panel">
              <div>
                <h2>Un espacio para decidir el diseño</h2>
                <p>
                  Las cifras, servidores, hallazgos y versiones son ficticios.
                  No hay análisis de archivos ni consultas a bases CVE. Los
                  identificadores DEMO-CVE no representan vulnerabilidades
                  reales. Puedes navegar, filtrar, guardar favoritas y descargar
                  reportes ilustrativos.
                </p>
              </div>
              <button
                className="icon-button"
                aria-label="Cerrar información"
                onClick={() => setShowHelp(false)}
              >
                <X size={18} />
              </button>
            </section>
          )}
          <main id="main">
            <header className="page-heading">
              <div>
                <h1>
                  {page === "dashboard"
                    ? styleId === "estrato"
                      ? "El riesgo, en perspectiva."
                      : styleId === "femsa"
                        ? "Visibilidad para avanzar."
                        : variant === 3
                          ? "De la exposición a la acción."
                          : "Tu infraestructura. Bajo control."
                    : pageNames[page]}
                </h1>
                <p>
                  {page === "dashboard"
                    ? "Una visión conectada del software, los servidores y lo que necesita tu atención."
                    : page === "servidores"
                      ? "Explora el inventario, detecta versiones obsoletas y prioriza cada actualización."
                      : page === "vulnerabilidades"
                        ? "Entiende la exposición y encuentra los hallazgos que requieren atención."
                        : "Convierte los hallazgos en información para cada equipo y cada decisión."}
                </p>
              </div>
              <div className="heading-actions">
                {page === "servidores" ? (
                  <button className="primary" onClick={exportServers}>
                    <ArrowDownToLine size={15} />
                    Exportar inventario
                  </button>
                ) : page === "reportes" ? (
                  <span className="report-scope">
                    Solo información ilustrativa
                  </span>
                ) : (
                  <button className="primary" onClick={openCritical}>
                    Revisar críticos
                    <ArrowUpRight size={16} />
                  </button>
                )}
              </div>
            </header>
            {page === "dashboard" && (
              <>
                <div className="dashboard-toolbar">
                  <div className="view-label">
                    <span className="status-dot" />
                    Vista {selectedRegion ? selectedRegion.name : "global"}
                    <span className="toolbar-divider" />
                    Inventario de muestra
                  </div>
                  <div className="button-row">
                    <label className="select-control">
                      <Globe2 size={14} />
                      <select
                        aria-label="Filtrar por región"
                        value={region}
                        onChange={(e) => setRegion(e.target.value)}
                      >
                        <option value="all">Todas las regiones</option>
                        {regions.map((r) => (
                          <option value={r.id} key={r.id}>
                            {r.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <span className="date-label">
                      <Clock3 size={14} />
                      24 sep 2026
                    </span>
                  </div>
                </div>
                {variant !== 3 && metrics}
                {variant === 1 && (
                  <div className="dashboard-v1">
                    <Panel
                      title={
                        styleId === "femsa"
                          ? "Presencia y exposición"
                          : "Panorama regional"
                      }
                      meta={<Globe2 size={15} />}
                      className="region-panel"
                    >
                      {regionList}
                      <div className="region-summary">
                        <span>Cobertura del inventario</span>
                        <strong>98.2%</strong>
                        <div className="meter">
                          <span style={{ width: "98.2%" }} />
                        </div>
                        <small>12,480 de 12,709 activos esperados</small>
                      </div>
                    </Panel>
                    <section className="map-panel">{map}</section>
                    <div className="right-panels">
                      {riskPanel}
                      <Panel
                        title="Tendencia de críticos"
                        meta={
                          <span className="improvement">
                            <ArrowDown size={12} />
                            31%
                          </span>
                        }
                      >
                        <TrendChart compact />
                        <p className="chart-note">
                          Últimas 6 semanas · datos ilustrativos
                        </p>
                      </Panel>
                    </div>
                  </div>
                )}
                {variant === 2 && (
                  <div className="dashboard-v2">
                    <Panel
                      title="Activos que necesitan atención"
                      meta={
                        <button className="text-button" onClick={openCritical}>
                          Ver inventario
                          <ArrowRight size={13} />
                        </button>
                      }
                      className="operations-panel"
                    >
                      <div className="operations-tabs">
                        <span className="selected">Por prioridad</span>
                        <span>{filtered.length} activos de muestra</span>
                      </div>
                      {servers
                        .filter((s) => region === "all" || s.region === region)
                        .slice(0, 5)
                        .map((s) => (
                          <button
                            className="asset-row"
                            key={s.id}
                            onClick={() => setDetail(s)}
                          >
                            <span className="asset-symbol">
                              <ServerIcon size={17} />
                            </span>
                            <span>
                              <strong>{s.name}</strong>
                              <small>
                                {s.software} {s.version} · {s.ip}
                              </small>
                            </span>
                            <Badge severity={s.severity} />
                            <ChevronRight size={14} />
                          </button>
                        ))}
                      <div className="operations-foot">
                        <span>
                          <Clock3 size={14} />
                          Próxima ventana
                        </span>
                        <strong>26 sep · 02:00–04:00</strong>
                      </div>
                    </Panel>
                    <div className="map-panel">
                      {map}
                      <div className="map-region-tabs">
                        {regions.map((r) => (
                          <button
                            className={region === r.id ? "selected" : ""}
                            onClick={() =>
                              setRegion(region === r.id ? "all" : r.id)
                            }
                            key={r.id}
                          >
                            {r.id.toUpperCase()}
                            <span>{r.critical}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                {variant === 3 && (
                  <>
                    <div className="strategy-lead">
                      <section className="strategy-statement">
                        <div className="strategy-number">
                          {format(critical)}
                          <span>
                            servidores para
                            <br />
                            atender primero.
                          </span>
                        </div>
                        <p>
                          Concentra el siguiente ciclo de actualización en los
                          activos de mayor exposición.
                        </p>
                        <button className="primary" onClick={openCritical}>
                          Abrir plan de atención
                          <ArrowRight size={16} />
                        </button>
                        <div className="strategy-context">
                          <span>
                            <Check size={14} />
                            1,024 actualizaciones completadas
                          </span>
                          <span>−31% hallazgos críticos en 6 semanas</span>
                        </div>
                      </section>
                      <div className="strategy-map">{map}</div>
                      <Panel
                        title="Próximas intervenciones"
                        className="strategy-priorities"
                      >
                        {priorityList}
                        <div className="deadline">
                          <Clock3 size={20} />
                          <div>
                            Ventana de mantenimiento
                            <strong>26 septiembre · 02:00</strong>
                            <small>Duración estimada: 2 horas</small>
                          </div>
                        </div>
                      </Panel>
                    </div>
                    {metrics}
                  </>
                )}
                <div className={`dashboard-bottom bottom-${variant}`}>
                  <Panel
                    title={
                      variant === 3
                        ? "Evolución de la exposición"
                        : "Prioridad de actualización"
                    }
                    meta={
                      <button
                        className="text-button"
                        onClick={() =>
                          navigate(variant === 3 ? "reportes" : "servidores")
                        }
                      >
                        Ver {variant === 3 ? "reporte" : "todos"}
                        <ArrowRight size={13} />
                      </button>
                    }
                  >
                    {variant === 3 ? <TrendChart /> : priorityList}
                  </Panel>
                  <Panel
                    title="Ciclo de vida del software"
                    meta={<Layers3 size={15} />}
                  >
                    <div className="lifecycle">
                      {[
                        ["Fuera de soporte", 2184, 62],
                        ["Por vencer en 90 días", 846, 28],
                        ["En versión aprobada", 9450, 88],
                      ].map(([label, count, width]) => (
                        <div key={label}>
                          <span>{label}</span>
                          <strong>{format(Number(count))}</strong>
                          <div className="meter">
                            <span style={{ width: `${width}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </Panel>
                  <Panel
                    title="Cobertura por unidad"
                    meta={<span className="tiny">AL DÍA</span>}
                  >
                    <div className="unit-coverage">
                      {[
                        ["Corporativo", 91],
                        ["Coca-Cola FEMSA", 84],
                        ["OXXO", 78],
                        ["Logística", 86],
                      ].map(([label, val]) => (
                        <div key={label}>
                          <span>{label}</span>
                          <div className="meter">
                            <span style={{ width: `${val}%` }} />
                          </div>
                          <strong>{val}%</strong>
                        </div>
                      ))}
                    </div>
                  </Panel>
                </div>
              </>
            )}

            {page === "servidores" && (
              <>
                <div className="page-stats">
                  <div>
                    <span>Inventario global</span>
                    <strong>
                      12,480<small>servidores</small>
                    </strong>
                  </div>
                  <div>
                    <span>Atención inmediata</span>
                    <strong className="danger-text">
                      428<small>críticos</small>
                    </strong>
                  </div>
                  <div>
                    <span>Fuera de soporte</span>
                    <strong>
                      2,184<small>activos</small>
                    </strong>
                  </div>
                  <div>
                    <span>Actualizaciones programadas</span>
                    <strong>
                      {planned.length}
                      <small>en esta sesión</small>
                    </strong>
                  </div>
                </div>
                <div className="filter-bar">
                  <label className="search-field">
                    <Search size={17} />
                    <input
                      aria-label="Buscar servidores"
                      placeholder="Buscar servidor, IP o software…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                    {search && (
                      <button
                        aria-label="Limpiar búsqueda"
                        onClick={() => setSearch("")}
                      >
                        <X size={14} />
                      </button>
                    )}
                  </label>
                  <label className="select-control">
                    <Filter size={14} />
                    <select
                      aria-label="Filtrar severidad"
                      value={severity}
                      onChange={(e) => setSeverity(e.target.value)}
                    >
                      <option value="Todas">Todas las severidades</option>
                      {sevOrder.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </label>
                  <label className="select-control">
                    <Globe2 size={14} />
                    <select
                      aria-label="Filtrar región de servidores"
                      value={region}
                      onChange={(e) => setRegion(e.target.value)}
                    >
                      <option value="all">Todas las regiones</option>
                      {regions.map((r) => (
                        <option value={r.id} key={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="select-control">
                    <select
                      aria-label="Filtrar unidad de negocio"
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                    >
                      <option value="Todas">Todas las unidades</option>
                      {[
                        "Corporativo",
                        "Coca-Cola FEMSA",
                        "OXXO",
                        "Logística",
                      ].map((u) => (
                        <option key={u}>{u}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="table-caption">
                  <span>
                    {filtered.length} servidores de muestra
                    {region !== "all" && ` · ${selectedRegion?.name}`}
                  </span>
                  <label className="sort-control">
                    <ListFilter size={14} />
                    <select
                      aria-label="Ordenar servidores"
                      value={sort}
                      onChange={(e) => setSort(e.target.value)}
                    >
                      <option value="risk">Mayor riesgo primero</option>
                      <option value="name">Nombre A–Z</option>
                    </select>
                  </label>
                </div>
                <div className={`inventory-layout inventory-${variant}`}>
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Servidor / dirección IP</th>
                          <th>Software instalado</th>
                          <th>Versión objetivo</th>
                          <th>Severidad</th>
                          <th>CVSS</th>
                          <th>Estado</th>
                          <th>
                            <span className="sr-only">Detalle</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.map((s) => (
                          <tr key={s.id}>
                            <td>
                              <button
                                className="server-link"
                                onClick={() => setDetail(s)}
                              >
                                <ServerIcon size={16} />
                                <span>
                                  {s.name}
                                  <small>
                                    {s.ip} ·{" "}
                                    {
                                      regions.find((r) => r.id === s.region)
                                        ?.name
                                    }
                                  </small>
                                </span>
                              </button>
                            </td>
                            <td>
                              {s.software}
                              <small className="mono">{s.version}</small>
                            </td>
                            <td className="mono">{s.target}</td>
                            <td>
                              <Badge severity={s.severity} />
                            </td>
                            <td>
                              <span
                                className={`cvss ${severityClass(s.severity)}`}
                              >
                                {s.cvss.toFixed(1)}
                              </span>
                            </td>
                            <td>
                              <span className="row-status">
                                {planned.includes(s.id)
                                  ? "Programada"
                                  : s.status}
                              </span>
                            </td>
                            <td>
                              <button
                                className="icon-button"
                                aria-label={`Ver detalle de ${s.name}`}
                                onClick={() => setDetail(s)}
                              >
                                <ArrowUpRight size={16} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {!filtered.length && (
                      <div className="empty">
                        <Search size={30} />
                        <h3>No encontramos servidores</h3>
                        <p>Prueba otro nombre o restablece los filtros.</p>
                        <button
                          className="secondary"
                          onClick={() => {
                            setSearch("");
                            setSeverity("Todas");
                            setRegion("all");
                            setUnit("Todas");
                          }}
                        >
                          Restablecer filtros
                        </button>
                      </div>
                    )}
                  </div>
                  {variant === 2 && (
                    <Panel
                      title="Contexto de auditoría"
                      className="inventory-aside"
                    >
                      <Target size={30} />
                      <h3>El siguiente paso importa.</h3>
                      <p>
                        Empieza por las versiones fuera de soporte y los
                        servidores con mayor puntuación CVSS.
                      </p>
                      <div className="context-fact">
                        <span>Fecha del inventario</span>
                        <strong>24 septiembre 2026</strong>
                      </div>
                      <div className="context-fact">
                        <span>Fuente de esta vista</span>
                        <strong>12 activos ilustrativos</strong>
                      </div>
                      <button
                        className="secondary"
                        onClick={() => setSeverity("Crítica")}
                      >
                        Mostrar críticos
                        <ArrowRight size={14} />
                      </button>
                    </Panel>
                  )}
                </div>
                <div className="table-footer">
                  <span>
                    Mostrando {filtered.length} de 12 registros ilustrativos
                  </span>
                  <span>Los totales globales son KPIs de demostración.</span>
                </div>
              </>
            )}

            {page === "vulnerabilidades" && (
              <>
                <div className="vulnerability-summary">
                  <section className="exposure-banner">
                    <ShieldAlert size={30} />
                    <div>
                      <h2>La prioridad está en la exposición.</h2>
                      <p>
                        428 servidores presentan hallazgos críticos en este
                        escenario ilustrativo.
                      </p>
                    </div>
                    <button className="secondary" onClick={openCritical}>
                      Ver servidores
                      <ArrowRight size={15} />
                    </button>
                  </section>
                  <div className="cvss-key">
                    <strong>
                      CVSS <span>0–10</span>
                    </strong>
                    <p>Severidad técnica de referencia</p>
                  </div>
                </div>
                <div className="filter-bar">
                  <label className="search-field">
                    <Search size={17} />
                    <input
                      aria-label="Buscar vulnerabilidades"
                      placeholder="Buscar hallazgo o componente…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </label>
                  <label className="select-control">
                    <Filter size={14} />
                    <select
                      aria-label="Filtrar severidad de vulnerabilidades"
                      value={severity}
                      onChange={(e) => setSeverity(e.target.value)}
                    >
                      <option value="Todas">Todas las severidades</option>
                      {sevOrder.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </label>
                  <span className="filter-count">
                    {filteredCves.length} hallazgos ilustrativos
                  </span>
                </div>
                <div className={`vulnerability-list cve-layout-${variant}`}>
                  {filteredCves.map((v) => (
                    <button
                      className="vulnerability-item"
                      key={v.id}
                      onClick={() => setCveDetail(v)}
                    >
                      <div
                        className={`vulnerability-score ${severityClass(v.severity)}`}
                      >
                        <strong>{v.cvss}</strong>
                        <small>CVSS</small>
                      </div>
                      <div className="vulnerability-content">
                        <span className="vulnerability-id">
                          {v.id}
                          <Badge severity={v.severity} />
                        </span>
                        <h2>{v.title}</h2>
                        <p>
                          {v.software} · {v.vector}
                        </p>
                      </div>
                      <div className="affected">
                        <strong>{v.affected}</strong>
                        <span>servidores afectados</span>
                      </div>
                      <ArrowUpRight size={18} />
                    </button>
                  ))}
                </div>
                {!filteredCves.length && (
                  <div className="empty">
                    <Shield size={30} />
                    <h3>No hay hallazgos con estos filtros</h3>
                    <button
                      className="secondary"
                      onClick={() => {
                        setSearch("");
                        setSeverity("Todas");
                      }}
                    >
                      Restablecer filtros
                    </button>
                  </div>
                )}
                <p className="data-footnote">
                  Los códigos DEMO-CVE, asociaciones de software y puntuaciones
                  son ficticios. No constituyen una evaluación de seguridad.
                </p>
              </>
            )}

            {page === "reportes" && (
              <div className={`reports-layout reports-${variant}`}>
                <section className="report-builder">
                  <h2>El reporte adecuado para cada decisión.</h2>
                  <p>
                    Elige el nivel de detalle y prepara una descarga con los
                    datos de muestra.
                  </p>
                  <fieldset>
                    <legend>Tipo de reporte</legend>
                    {[
                      [
                        "Resumen ejecutivo",
                        "Exposición global, KPIs y prioridades.",
                      ],
                      [
                        "Detalle por servidor",
                        "Inventario, versiones y actualización propuesta.",
                      ],
                      [
                        "Hallazgos de seguridad",
                        "Severidad, componentes y acciones sugeridas.",
                      ],
                    ].map(([name, desc]) => (
                      <label
                        className={`report-option ${reportType === name ? "selected" : ""}`}
                        key={name}
                      >
                        <input
                          type="radio"
                          name="report"
                          value={name}
                          checked={reportType === name}
                          onChange={() => {
                            setReportType(name);
                            setReportReady(false);
                          }}
                        />
                        <span>
                          <strong>{name}</strong>
                          <small>{desc}</small>
                        </span>
                        <FileBarChart size={20} />
                      </label>
                    ))}
                  </fieldset>
                  <label className="field-label">
                    Corte de información
                    <select
                      value={snapshot}
                      onChange={(e) => {
                        setSnapshot(e.target.value);
                        setReportReady(false);
                      }}
                    >
                      <option>24 sep 2026</option>
                      <option>17 sep 2026</option>
                      <option>10 sep 2026</option>
                    </select>
                  </label>
                  <button
                    className="primary"
                    disabled={generating}
                    onClick={generateReport}
                  >
                    {generating ? (
                      <Activity className="loading-icon" size={16} />
                    ) : (
                      <FileBarChart size={16} />
                    )}{" "}
                    {generating
                      ? "Preparando reporte…"
                      : "Preparar reporte de muestra"}
                  </button>
                  {reportReady && (
                    <div className="report-ready" role="status">
                      <CheckCheck size={20} />
                      <span>
                        Tu reporte está listo.
                        <small>Archivo CSV · datos ficticios</small>
                      </span>
                      <button
                        className="secondary"
                        onClick={() => {
                          if (reportType === "Detalle por servidor")
                            exportServers();
                          else
                            download(
                              `femsa-${reportType.toLowerCase().replaceAll(" ", "-")}-demo.csv`,
                              `REPORTE DE DEMOSTRACIÓN FEMSA\nTipo,${reportType}\nCorte,${snapshot}\nOrigen,Datos ficticios del mockup\n\n` +
                                (reportType === "Resumen ejecutivo"
                                  ? "Indicador,Valor\nServidores,12480\nCríticos,428\nObsoletos,2184\nCobertura,82.5%\n"
                                  : "Identificador,Titulo,Software,CVSS,Afectados\n" +
                                    vulnerabilities
                                      .map((v) =>
                                        [
                                          v.id,
                                          v.title,
                                          v.software,
                                          v.cvss,
                                          v.affected,
                                        ].join(","),
                                      )
                                      .join("\n")),
                            );
                        }}
                      >
                        <ArrowDownToLine size={15} />
                        Descargar
                      </button>
                    </div>
                  )}
                </section>
                <section className="report-paper">
                  <div className="paper-top">
                    <span>FEMSA</span>
                    <span>INFRAESTRUCTURA / {snapshot}</span>
                  </div>
                  <h2>{reportType}</h2>
                  <p>Auditoría de software y exposición a vulnerabilidades</p>
                  <div className="paper-divider" />
                  <div className="paper-metrics">
                    <div>
                      <strong>12,480</strong>
                      <span>servidores</span>
                    </div>
                    <div>
                      <strong>428</strong>
                      <span>críticos</span>
                    </div>
                    <div>
                      <strong>82.5%</strong>
                      <span>actualizados</span>
                    </div>
                  </div>
                  <h3>Exposición por región</h3>
                  {regions.map((r) => (
                    <div className="paper-row" key={r.id}>
                      <span>{r.name}</span>
                      <div className="meter">
                        <span style={{ width: `${r.critical / 2}%` }} />
                      </div>
                      <strong>{r.critical}</strong>
                    </div>
                  ))}
                  <div className="paper-conclusion">
                    <h3>Prioridad del siguiente ciclo</h3>
                    <p>
                      Revisar los activos de mayor severidad, validar
                      dependencias y acordar ventanas de mantenimiento con los
                      equipos responsables.
                    </p>
                  </div>
                  <div className="paper-footer">
                    <span>VISTA PREVIA · DATOS FICTICIOS</span>
                    <span>01</span>
                  </div>
                </section>
              </div>
            )}
            <footer className="app-footer">
              <span>FEMSA · Auditoría de infraestructura</span>
              <span>
                {currentStyle.name} / {currentStyle.variants[variant - 1]}
                <span className="footer-dot">·</span>Prototipo interactivo
              </span>
            </footer>
          </main>
        </div>
      </div>
      <dialog
        ref={detailRef}
        className="detail-dialog"
        aria-label={detail ? "Detalle del servidor" : "Detalle del hallazgo"}
        onCancel={() => {
          setDetail(null);
          setCveDetail(null);
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            setDetail(null);
            setCveDetail(null);
          }
        }}
      >
        <div className="detail-content">
          <div className="detail-top">
            <span>
              {detail ? "Detalle del servidor" : "Detalle del hallazgo"}
            </span>
            <button
              className="icon-button"
              aria-label="Cerrar detalle"
              onClick={() => {
                setDetail(null);
                setCveDetail(null);
              }}
            >
              <X size={22} />
            </button>
          </div>
          {detail && (
            <>
              <ServerIcon className="detail-symbol" size={32} />
              <h2>{detail.name}</h2>
              <p className="mono">
                {detail.id} / {detail.ip}
              </p>
              <div className="detail-severity">
                <Badge severity={detail.severity} />
                <span>CVSS {detail.cvss} / 10</span>
              </div>
              <dl className="detail-facts">
                <div>
                  <dt>Unidad de negocio</dt>
                  <dd>{detail.unit}</dd>
                </div>
                <div>
                  <dt>Ubicación</dt>
                  <dd>{regions.find((r) => r.id === detail.region)?.city}</dd>
                </div>
                <div>
                  <dt>Sistema operativo</dt>
                  <dd>{detail.os}</dd>
                </div>
                <div>
                  <dt>Responsable</dt>
                  <dd>{detail.owner}</dd>
                </div>
              </dl>
              <section className="version-change">
                <h3>Actualización propuesta</h3>
                <div>
                  <span>
                    {detail.software}
                    <strong>{detail.version}</strong>
                    <small>Versión instalada</small>
                  </span>
                  <ArrowRight size={24} />
                  <span>
                    {detail.software}
                    <strong>{detail.target}</strong>
                    <small>Objetivo de muestra</small>
                  </span>
                </div>
              </section>
              <section className="detail-recommendation">
                <h3>Antes de actualizar</h3>
                <p>
                  Validar compatibilidad, respaldar la configuración y acordar
                  la ventana de mantenimiento. Las versiones mostradas son
                  ilustrativas.
                </p>
              </section>
              <button
                className="primary full"
                disabled={planned.includes(detail.id)}
                onClick={() => {
                  setPlanned((p) => [...p, detail.id]);
                  setToast("Actualización marcada en el plan de demostración.");
                }}
              >
                {planned.includes(detail.id) ? (
                  <Check size={17} />
                ) : (
                  <Clock3 size={17} />
                )}{" "}
                {planned.includes(detail.id)
                  ? "Incluido en el plan de muestra"
                  : "Añadir al plan de actualización"}
              </button>
            </>
          )}
          {cveDetail && (
            <>
              <ShieldAlert className="detail-symbol" size={32} />
              <p className="mono">{cveDetail.id}</p>
              <h2>{cveDetail.title}</h2>
              <div className="detail-severity">
                <Badge severity={cveDetail.severity} />
                <span>CVSS {cveDetail.cvss} / 10</span>
              </div>
              <dl className="detail-facts">
                <div>
                  <dt>Componente</dt>
                  <dd>{cveDetail.software}</dd>
                </div>
                <div>
                  <dt>Alcance ilustrativo</dt>
                  <dd>{cveDetail.affected} servidores</dd>
                </div>
                <div>
                  <dt>Vector</dt>
                  <dd>{cveDetail.vector}</dd>
                </div>
              </dl>
              <section className="detail-recommendation">
                <h3>Acción de referencia</h3>
                <p>{cveDetail.fix}</p>
              </section>
              <p className="data-footnote">
                Hallazgo ficticio para evaluar la interfaz. No es un registro
                CVE real ni una recomendación técnica validada.
              </p>
              <button
                className="primary full"
                onClick={() => {
                  const software = cveDetail.software;
                  navigate("servidores");
                  setSearch(software);
                }}
              >
                Explorar servidores de muestra
                <ArrowRight size={17} />
              </button>
            </>
          )}
        </div>
      </dialog>
      {toast && (
        <div className="toast" role="status">
          <Check size={16} />
          {toast}
          <button
            className="icon-button"
            aria-label="Cerrar aviso"
            onClick={() => setToast("")}
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
