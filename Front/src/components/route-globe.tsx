"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";
import { countryLabel, format } from "@/lib/inventory";
import { countryPosition, drawGlobe, drawSelectedCountry, landDots, rotate, slerp, toVec, type Vec3 } from "./route-globe-utils/globe";
import styles from "./route-globe.module.css";

const REFERENCE_PLACES = [
  { id: "REGION_NORTH", name: "Norte", country: "EUA", code: "US", lon: -99, lat: 38, destinations: [[-122, 38], [-74, 41], [-110, 46], [-84, 33], [-97, 29]] },
  { id: "REGION_CENTRAL", name: "Centro", country: "México", code: "MX", lon: -102, lat: 23, destinations: [[-116, 31], [-99, 19], [-100, 26], [-88, 21], [-104, 28]] },
  { id: "REGION_SOUTH", name: "Sur", country: "Brasil", code: "BR", lon: -52, lat: -14, destinations: [[-46, -23], [-43, -22], [-60, -3], [-38, -12], [-56, -20]] },
];
const HUBS = REFERENCE_PLACES.map(p => toVec(p.lon, p.lat));
const REGIONAL_ROUTES = REFERENCE_PLACES.flatMap((p, i) => p.destinations.map(([lon, lat], k) => {
  const destination = toVec(lon, lat);
  return { region: i + 1, offset: (i * 5 + k) / 15, points: Array.from({ length: 33 }, (_, j) => ({ v: slerp(HUBS[i], destination, j / 32), lift: 1 + Math.sin(Math.PI * j / 32) * .12 })) };
}));
const ROUTES = [...REGIONAL_ROUTES, ...HUBS.map((hub, i) => ({ region: 0, offset: i / 3, points: Array.from({ length: 33 }, (_, j) => ({ v: slerp(hub, HUBS[(i + 1) % HUBS.length], j / 32), lift: 1 + Math.sin(Math.PI * j / 32) * .2 })) }))];

const AMERICAS = { lon: -85, lat: 12 };
const RADIANS = Math.PI / 180;
const referenceMarkers = REFERENCE_PLACES.map((place, index) => ({ ...place, vector: HUBS[index] }));

type Props = {
  selected: string;
  onSelect: (id: string) => void;
  counts: ReadonlyMap<string, number>;
  countries: string[] | null;
  unmappedServers: number;
};

export function RouteGlobe({ selected, onSelect, counts, countries, unmappedServers }: Props) {
  const countryMode = countries !== null;
  const places = useMemo(() => countries?.map(code => {
    const position = countryPosition(code);
    const name = countryLabel(code);
    return { id: code, code, name, country: name, ...position, vector: position ? toVec(position.lon, position.lat) : null };
  }) ?? referenceMarkers, [countries]);
  const host = useRef<HTMLDivElement>(null), canvas = useRef<HTMLCanvasElement>(null);
  const markers = useRef<(HTMLButtonElement | null)[]>([]);
  const [paused, setPaused] = useState(false), [reset, setReset] = useState(0);
  const [ready, setReady] = useState(false);
  const maximum = Math.max(0, ...counts.values());
  const activePlace = places.find(place => place.id === selected);
  const selectedCode = activePlace?.code ?? "";
  const camera = useRef({ yaw: AMERICAS.lon * RADIANS, tilt: AMERICAS.lat * RADIANS });
  const running = !countryMode && !paused;
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const change = () => setPaused(media.matches);
    change(); media.addEventListener("change", change);
    return () => media.removeEventListener("change", change);
  }, []);
  useEffect(() => {
    const center = activePlace ?? (countryMode ? places[0] : undefined);
    camera.current = { yaw: (center?.lon ?? AMERICAS.lon) * RADIANS, tilt: (center?.lat ?? AMERICAS.lat) * RADIANS };
  }, [activePlace, countryMode, places]);
  const centerAmericas = () => {
    camera.current = { yaw: AMERICAS.lon * RADIANS, tilt: AMERICAS.lat * RADIANS };
    setReset(value => value + 1);
  };
  useEffect(() => {
    const el = host.current, cv = canvas.current, ctx = cv?.getContext("2d");
    if (!el || !cv || !ctx) return;
    const dots = landDots();
    let W = 0, H = 0, dpr = 1, raf = 0, alive = true, visible = true, last = 0, time = 0, idle = performance.now(), pointer: number | null = null, px = 0, py = 0, velocity = 0;
    const region = REFERENCE_PLACES.findIndex(p => p.id === selected) + 1;
    const project = (v: Vec3, lift = 1) => { const [x, y, z] = rotate(v, camera.current.yaw, camera.current.tilt); const r = Math.min(W, H) * .445; return { x: W / 2 + x * r * lift, y: H / 2 - y * r * lift, z }; };
    const draw = () => {
      const r = Math.min(W, H) * .445, cx = W / 2, cy = H / 2;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
      const light = ctx.createRadialGradient(cx - r * .3, cy - r * .4, r * .05, cx, cy, r);
      light.addColorStop(0, "#164367"); light.addColorStop(1, "#0c2038");
      ctx.fillStyle = light; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#4685ac"; ctx.globalAlpha = .22; ctx.lineWidth = .7; ctx.stroke(); ctx.globalAlpha = 1;
      if (selectedCode) drawSelectedCountry(ctx, { cx, cy, r, ...camera.current }, selectedCode);
      drawGlobe(ctx, dots, { cx, cy, r, ...camera.current }, time, region, paused, HUBS, !countryMode);
      for (const route of countryMode ? [] : ROUTES) {
        if (region && route.region !== region) continue;
        const points = route.points.map(p => project(p.v, p.lift));
        ctx.strokeStyle = "#b3e8ff"; ctx.lineWidth = .8;
        for (let k = 0; k < 32; k++) { const a = points[k], b = points[k + 1]; if (a.z < 0 && b.z < 0) continue; ctx.globalAlpha = .16; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
        const phase = paused ? .62 : (time / 3.9 + route.offset) % 1;
        const head = Math.floor(Math.min(1, phase / .8) * 32);
        for (let k = Math.max(0, head - 8); k < head; k++) { const a = points[k], b = points[k + 1]; if (a.z < 0) continue; ctx.globalAlpha = (1 - (head - k) / 8) * .9; ctx.strokeStyle = "#fff"; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
      }
      places.forEach(({ vector }, i) => {
        if (!vector) return;
        const p = project(vector), marker = markers.current[i];
        if (marker) {
          marker.style.transform = `translate(${p.x}px, ${p.y}px) translate(-50%, -50%)`;
          marker.style.visibility = p.z > .06 ? "visible" : "hidden";
        }
        if (countryMode || p.z < 0 || (region && region !== i + 1)) return;
        const phase = paused ? .4 : (time * .4 + i * .25) % 1;
        ctx.globalAlpha = (1 - phase) * .55; ctx.strokeStyle = "#fff"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(p.x, p.y, 8 + phase * 34, 0, Math.PI * 2); ctx.stroke();
      });
      ctx.globalAlpha = 1;
      cv.dataset.renderMode = running ? "running" : "paused";
      cv.dataset.selectedRegion = selected || "all";
    };
    const tick = (now: number) => {
      raf = 0; if (!alive || !visible || document.hidden || !running) return;
      const dt = last ? Math.min(.05, (now - last) / 1000) : .016; last = now; time += dt;
      if (pointer === null) { camera.current.yaw += velocity * dt; velocity *= Math.pow(.02, dt); if (!region && now - idle > 6000) camera.current.yaw += .025 * dt; }
      draw(); raf = requestAnimationFrame(tick);
    };
    const start = () => {
      if (!alive || document.hidden) return;
      draw();
      if (visible && running && !raf) {
        last = 0;
        raf = requestAnimationFrame(tick);
      }
    };
    const size = () => {
      W = el.clientWidth; H = el.clientHeight; dpr = Math.min(devicePixelRatio || 1, 2);
      const width = Math.round(W * dpr), height = Math.round(H * dpr);
      if (cv.width !== width) cv.width = width;
      if (cv.height !== height) cv.height = height;
      start();
    };
    const down = (event: PointerEvent) => {
      if (event.button !== 0 || pointer !== null) return;
      cv.setPointerCapture(event.pointerId);
      pointer = event.pointerId;
      px = event.clientX; py = event.clientY; velocity = 0;
      el.dataset.dragging = "true";
    };
    const move = (event: PointerEvent) => {
      if (event.pointerId !== pointer) return;
      const dx = event.clientX - px, dy = event.clientY - py;
      px = event.clientX; py = event.clientY;
      camera.current.yaw -= dx / Math.max(W * .45, 1);
      camera.current.tilt = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, camera.current.tilt + dy / Math.max(H * .45, 1)));
      velocity = -dx / Math.max(W * .45, 1) * 20;
      idle = performance.now();
      if (!running) draw();
    };
    const up = (event: PointerEvent) => {
      if (event.pointerId !== pointer) return;
      pointer = null;
      idle = performance.now();
      delete el.dataset.dragging;
    };
    const visibility = () => { if (document.hidden) { cancelAnimationFrame(raf); raf = 0; } else start(); };
    const ro = new ResizeObserver(size); ro.observe(el);
    const io = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; if (!visible) { cancelAnimationFrame(raf); raf = 0; } else start(); }); io.observe(el);
    cv.addEventListener("pointerdown", down); cv.addEventListener("pointermove", move); cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", up); cv.addEventListener("lostpointercapture", up);
    document.addEventListener("visibilitychange", visibility);
    size(); setReady(true);
    return () => { alive = false; cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); document.removeEventListener("visibilitychange", visibility); cv.removeEventListener("pointerdown", down); cv.removeEventListener("pointermove", move); cv.removeEventListener("pointerup", up); cv.removeEventListener("pointercancel", up); cv.removeEventListener("lostpointercapture", up); delete el.dataset.dragging; };
  }, [paused, running, countryMode, places, selected, selectedCode, reset]);

  const volumes = places.map(place => {
    const count = counts.get(place.id) ?? 0;
    const priority = count === 0 ? "Sin pendientes" : count === maximum ? "Mayor volumen" : count >= maximum / 2 ? "Volumen intermedio" : "Menor volumen";
    const color = count === 0 ? "#94a3b8" : count === maximum ? "#fb7185" : count >= maximum / 2 ? "#fbbf24" : "#38bdf8";
    return { ...place, count, priority, style: { "--region-color": color } as CSSProperties };
  });
  const toggle = (id: string) => onSelect(selected === id ? "" : id);

  return <div className={styles.globe} data-globe-ready={ready ? "true" : "false"} data-motion={running ? "running" : "paused"} data-selected-region={selected || "all"}>
    <div className={styles.controls}>
      {!countryMode && <button aria-label={paused ? "Reanudar animación del globo" : "Pausar animación del globo"} onClick={() => setPaused(!paused)}>{paused ? <Play size={16} aria-hidden="true" /> : <Pause size={16} aria-hidden="true" />}{paused ? "Reanudar" : "Pausar"}</button>}
      <button onClick={centerAmericas}><RotateCcw size={16} aria-hidden="true" />Centrar América</button>
    </div>
    <div className={styles.stage} ref={host}>
      <canvas ref={canvas} role="img" aria-label={countryMode ? `Globo con países del Excel. ${activePlace ? `País seleccionado: ${activePlace.name}.` : "Todos los países del corte."}` : `Globo 3D de puntos con referencias en EUA, México y Brasil. ${activePlace ? `Región ${activePlace.name} seleccionada, referencia en ${activePlace.country}, delimitada y resaltada.` : "Todas las regiones. Destellos visuales sobre cada país."}`} />
      {activePlace && <div className={styles.selection} role="status"><strong>{countryMode ? `País: ${activePlace.name}` : `${activePlace.name} seleccionada`}</strong>{!countryMode && <span>{activePlace.country} · referencia del simulador</span>}</div>}
      {volumes.map((place, index) => place.vector && <button
        key={place.id}
        ref={el => { markers.current[index] = el; }}
        style={place.style}
        className={`${styles.pin} ${countryMode ? styles.countryPin : styles[`pin${index}`]}`}
        aria-label={`Filtrar ${countryMode ? "país" : "región"} ${place.name}, ${format(place.count)} hallazgos pendientes, ${place.priority}`}
        aria-pressed={selected === place.id}
        onClick={() => toggle(place.id)}
      ><i /><span>{place.name}{!countryMode && <small>{place.country} · {place.priority}</small>}</span><em>{format(place.count)} pendientes</em></button>)}
    </div>
    <div className={`${styles.regionButtons} ${countryMode ? styles.countryButtons : ""}`} role="group" aria-label={countryMode ? "Seleccionar país del globo" : "Seleccionar región del globo"}>
      {volumes.map(place => <button style={place.style} key={place.id} aria-pressed={selected === place.id} onClick={() => toggle(place.id)}>
        {place.name}<span>{format(place.count)} pendientes</span>{!countryMode && <small>{place.priority}</small>}
      </button>)}
    </div>
    {countryMode ? <>
      <p className={styles.volumeLegend}>Países declarados en el Excel. El volumen responde a los filtros del análisis.</p>
      {unmappedServers > 0 && <p className={styles.volumeLegend}>{format(unmappedServers)} servidores sin país identificado en el alcance.</p>}
    </> : <>
      <p className={styles.volumeLegend}>Rosa: mayor volumen · Ámbar: al menos la mitad del máximo · Azul: menor volumen · Gris: sin pendientes.</p>
      <details className={styles.explanation}><summary>Ubicaciones de referencia del simulador</summary><p>Norte se representa en EUA, Centro en México y Sur en Brasil. Los destellos son ilustrativos.</p></details>
    </>}
  </div>;
}
