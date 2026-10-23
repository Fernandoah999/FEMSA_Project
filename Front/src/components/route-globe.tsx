"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";
import { drawGlobe, drawSelectedRegion, landDots, rotate, slerp, toVec, type Vec3 } from "./route-globe-utils/globe";
import styles from "./route-globe.module.css";

export const REFERENCE_PLACES = [
  { id: "REGION_NORTH", name: "Norte", country: "EUA", lon: -99, lat: 38, destinations: [[-122, 38], [-74, 41], [-110, 46], [-84, 33], [-97, 29]] },
  { id: "REGION_CENTRAL", name: "Centro", country: "México", lon: -102, lat: 23, destinations: [[-116, 31], [-99, 19], [-100, 26], [-88, 21], [-104, 28]] },
  { id: "REGION_SOUTH", name: "Sur", country: "Brasil", lon: -52, lat: -14, destinations: [[-46, -23], [-43, -22], [-60, -3], [-38, -12], [-56, -20]] },
];
const HUBS = REFERENCE_PLACES.map(p => toVec(p.lon, p.lat));
const REGIONAL_ROUTES = REFERENCE_PLACES.flatMap((p, i) => p.destinations.map(([lon, lat], k) => {
  const destination = toVec(lon, lat);
  return { region: i + 1, offset: (i * 5 + k) / 15, points: Array.from({ length: 33 }, (_, j) => ({ v: slerp(HUBS[i], destination, j / 32), lift: 1 + Math.sin(Math.PI * j / 32) * .12 })) };
}));
const ROUTES = [...REGIONAL_ROUTES, ...HUBS.map((hub, i) => ({ region: 0, offset: i / 3, points: Array.from({ length: 33 }, (_, j) => ({ v: slerp(hub, HUBS[(i + 1) % HUBS.length], j / 32), lift: 1 + Math.sin(Math.PI * j / 32) * .2 })) }))];

export function RouteGlobe({ selected, onSelect, counts }: { selected: string; onSelect: (id: string) => void; counts: number[] }) {
  const host = useRef<HTMLDivElement>(null), canvas = useRef<HTMLCanvasElement>(null);
  const markers = useRef<(HTMLButtonElement | null)[]>([]);
  const [paused, setPaused] = useState(false), [reset, setReset] = useState(0);
  const [ready, setReady] = useState(false);
  const activePlace = REFERENCE_PLACES.find(place => place.id === selected);
  const camera = useRef({ yaw: -85 * Math.PI / 180, tilt: 12 * Math.PI / 180 });
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const change = () => setPaused(media.matches);
    change(); media.addEventListener("change", change);
    return () => media.removeEventListener("change", change);
  }, []);
  useEffect(() => {
    camera.current = { yaw: -85 * Math.PI / 180, tilt: 12 * Math.PI / 180 };
  }, [reset]);
  useEffect(() => {
    const place = REFERENCE_PLACES.find(place => place.id === selected);
    camera.current = place ? { yaw: place.lon * Math.PI / 180, tilt: place.lat * Math.PI / 180 } : { yaw: -85 * Math.PI / 180, tilt: 12 * Math.PI / 180 };
  }, [selected]);
  useEffect(() => {
    const el = host.current, cv = canvas.current, ctx = cv?.getContext("2d");
    if (!el || !cv || !ctx) return;
    const dots = landDots();
    let W = 0, H = 0, dpr = 1, raf = 0, alive = true, visible = true, last = 0, time = 0, idle = performance.now(), dragging = false, px = 0, py = 0, velocity = 0;
    const region = REFERENCE_PLACES.findIndex(p => p.id === selected) + 1;
    const project = (v: Vec3, lift = 1) => { const [x, y, z] = rotate(v, camera.current.yaw, camera.current.tilt); const r = Math.min(W, H) * .445; return { x: W / 2 + x * r * lift, y: H / 2 - y * r * lift, z }; };
    const draw = () => {
      const r = Math.min(W, H) * .445, cx = W / 2, cy = H / 2;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
      const light = ctx.createRadialGradient(cx - r * .3, cy - r * .4, r * .05, cx, cy, r);
      light.addColorStop(0, "#432439"); light.addColorStop(1, "#21131e");
      ctx.fillStyle = light; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#735367"; ctx.globalAlpha = .22; ctx.lineWidth = .7; ctx.stroke(); ctx.globalAlpha = 1;
      drawSelectedRegion(ctx, { cx, cy, r, ...camera.current }, region);
      drawGlobe(ctx, dots, { cx, cy, r, ...camera.current }, time, region, paused, HUBS);
      for (const route of ROUTES) {
        if (region && route.region !== region) continue;
        const points = route.points.map(p => project(p.v, p.lift));
        ctx.strokeStyle = "#f5d8e7"; ctx.lineWidth = .8;
        for (let k = 0; k < 32; k++) { const a = points[k], b = points[k + 1]; if (a.z < 0 && b.z < 0) continue; ctx.globalAlpha = .16; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
        const phase = paused ? .62 : (time / 3.9 + route.offset) % 1;
        const head = Math.floor(Math.min(1, phase / .8) * 32);
        for (let k = Math.max(0, head - 8); k < head; k++) { const a = points[k], b = points[k + 1]; if (a.z < 0) continue; ctx.globalAlpha = (1 - (head - k) / 8) * .9; ctx.strokeStyle = "#fff"; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
      }
      HUBS.forEach((h, i) => {
        const p = project(h), marker = markers.current[i];
        if (marker) { marker.style.left = `${p.x}px`; marker.style.top = `${p.y}px`; marker.style.visibility = p.z > .06 ? "visible" : "hidden"; }
        if (p.z < 0 || (region && region !== i + 1)) return;
        const phase = paused ? .4 : (time * .4 + i * .25) % 1;
        ctx.globalAlpha = (1 - phase) * .55; ctx.strokeStyle = "#fff"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(p.x, p.y, 8 + phase * 34, 0, Math.PI * 2); ctx.stroke();
      });
      ctx.globalAlpha = 1;
      cv.dataset.renderMode = paused ? "paused" : "running";
      cv.dataset.selectedRegion = selected || "all";
    };
    const tick = (now: number) => {
      raf = 0; if (!alive || !visible || document.hidden || paused) return;
      const dt = last ? Math.min(.05, (now - last) / 1000) : .016; last = now; time += dt;
      if (!dragging) { camera.current.yaw += velocity * dt; velocity *= Math.pow(.02, dt); if (!region && now - idle > 6000) camera.current.yaw += .025 * dt; }
      draw(); raf = requestAnimationFrame(tick);
    };
    const start = () => { if (!alive || !visible || document.hidden) return; draw(); if (!paused && !raf) { last = 0; raf = requestAnimationFrame(tick); } };
    const size = () => { W = el.clientWidth; H = el.clientHeight; dpr = Math.min(devicePixelRatio || 1, 2); cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); start(); };
    const down = (e: PointerEvent) => { if (e.button !== 0) return; cv.setPointerCapture(e.pointerId); dragging = true; px = e.clientX; py = e.clientY; velocity = 0; el.dataset.dragging = "true"; };
    const move = (e: PointerEvent) => { if (!dragging) return; const dx = e.clientX - px, dy = e.clientY - py; px = e.clientX; py = e.clientY; camera.current.yaw -= dx / Math.max(W * .45, 1); camera.current.tilt = Math.max(-.9, Math.min(.9, camera.current.tilt + dy / Math.max(H * .45, 1))); velocity = -dx / Math.max(W * .45, 1) * 20; idle = performance.now(); if (paused) draw(); };
    const up = () => { dragging = false; idle = performance.now(); delete el.dataset.dragging; };
    const visibility = () => { if (document.hidden) { cancelAnimationFrame(raf); raf = 0; } else start(); };
    const ro = new ResizeObserver(size); ro.observe(el);
    const io = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; if (!visible) { cancelAnimationFrame(raf); raf = 0; } else start(); }); io.observe(el);
    cv.addEventListener("pointerdown", down); cv.addEventListener("pointermove", move); cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", up);
    document.addEventListener("visibilitychange", visibility);
    size(); setReady(true);
    return () => { alive = false; cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); document.removeEventListener("visibilitychange", visibility); cv.removeEventListener("pointerdown", down); cv.removeEventListener("pointermove", move); cv.removeEventListener("pointerup", up); cv.removeEventListener("pointercancel", up); };
  }, [paused, selected, reset]);
  return <div className={styles.globe} data-globe-ready={ready ? "true" : "false"} data-motion={paused ? "paused" : "running"} data-selected-region={selected || "all"}>
    <div className={styles.controls}><button aria-label={paused ? "Reanudar animación del globo" : "Pausar animación del globo"} onClick={() => setPaused(!paused)}>{paused ? <Play size={16} /> : <Pause size={16} />}{paused ? "Reanudar" : "Pausar"}</button><button onClick={() => setReset(r => r + 1)}><RotateCcw size={16} />Centrar América</button></div>
    <div className={styles.stage} ref={host}>
      <canvas ref={canvas} role="img" aria-label={`Globo 3D de puntos con referencias en EUA, México y Brasil. ${activePlace ? `Región ${activePlace.name} seleccionada, referencia en ${activePlace.country}, delimitada y resaltada.` : "Todas las regiones. Destellos visuales sobre cada país."}`} />
      {activePlace && <div className={styles.selection} role="status"><strong>{activePlace.name} seleccionada</strong><span>{activePlace.country} · referencia del simulador</span></div>}
      {REFERENCE_PLACES.map((p, i) => <button key={p.id} ref={el => { markers.current[i] = el; }} className={`${styles.pin} ${styles[`pin${i}`]}`} aria-label={`Filtrar región ${p.name}, ${counts[i]} hallazgos pendientes`} aria-pressed={selected === p.id} onClick={() => onSelect(selected === p.id ? "" : p.id)}><i /><span>{p.name}<small>{p.country}</small></span><em>{counts[i].toLocaleString("es-MX")} pendientes</em></button>)}
    </div>
    <div className={styles.regionButtons} aria-label="Seleccionar región del globo">{REFERENCE_PLACES.map(p => <button key={p.id} aria-pressed={selected === p.id} onClick={() => onSelect(selected === p.id ? "" : p.id)}>{p.name}<span>{p.country}</span></button>)}</div>
    <details className={styles.explanation}><summary>Ubicaciones de referencia del simulador</summary><p>Norte se representa en EUA, Centro en México y Sur en Brasil, según la correspondencia definida para esta visualización. Los destellos son ilustrativos; no representan tráfico ni ataques detectados.</p></details>
  </div>;
}
