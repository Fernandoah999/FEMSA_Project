"use client";

import { useEffect, useRef, useState } from "react";
import { CircleHelp, Database, GitCompareArrows, LayoutDashboard, Menu, PanelLeftClose, PanelLeftOpen, Server, ShieldAlert, X } from "lucide-react";
import s from "./inventory-dashboard.module.css";

export type InventoryPage = "overview" | "servers" | "findings" | "compare" | "imports" | "method";
export const inventoryNavigation = [
  { id: "overview", name: "Panorama general", icon: LayoutDashboard },
  { id: "servers", name: "Servidores", icon: Server },
  { id: "findings", name: "Hallazgos", icon: ShieldAlert },
  { id: "compare", name: "Comparar cortes", icon: GitCompareArrows },
  { id: "imports", name: "Cargas de datos", icon: Database },
] as const;

type Props = {
  page: InventoryPage;
  count: number;
  collapsed: boolean;
  width: number;
  onToggle: () => void;
  onResize: (width: number) => void;
  onNavigate: (page: InventoryPage) => void;
};

export function InventorySidebar({ page, count, collapsed, width, onToggle, onResize, onNavigate }: Props) {
  const drawer = useRef<HTMLDialogElement>(null);
  const resizing = useRef(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const resize = (value: number) => onResize(Math.max(248, Math.min(360, value)));
  const navigate = (next: InventoryPage) => { onNavigate(next); drawer.current?.close(); };

  useEffect(() => {
    const desktop = matchMedia("(min-width: 961px)");
    const closeOnDesktop = () => { if (desktop.matches) drawer.current?.close(); };
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, []);
  useEffect(() => {
    if (!mobileOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [mobileOpen]);

  const brand = <a href="/" className={s.brand} aria-label="FEMSA Atlas, inicio"><img src="/femsa-logo.png" alt="FEMSA" width="146" height="38" /></a>;
  const menu = (compact: boolean) => <nav className={s.sideNav} aria-label="Navegación principal">{inventoryNavigation.map(item => <button key={item.id} aria-label={item.name} title={compact ? item.name : undefined} className={page === item.id ? s.navActive : ""} aria-current={page === item.id ? "page" : undefined} onClick={() => navigate(item.id)}><item.icon size={23} aria-hidden="true" /><span className={s.navLabel}>{item.name}</span>{item.id === "imports" && count > 0 && <small className={s.navCount}>{count}</small>}</button>)}</nav>;
  const footer = <div className={s.sidebarFoot}><div className={s.storageNote}><div className={s.localStatus}><i />Almacenamiento local</div><p>Las cargas se conservan en este equipo.</p></div><button title={collapsed ? "Criterios del análisis" : undefined} aria-label="Criterios del análisis" aria-current={page === "method" ? "page" : undefined} onClick={() => navigate("method")}><CircleHelp size={22} aria-hidden="true" /><span className={s.navLabel}>Criterios del análisis</span></button></div>;

  return <>
    <aside className={s.sidebar} aria-label="Barra lateral">
      <div className={s.sideHeader}>{brand}<button className={s.iconButton} aria-label={collapsed ? "Expandir menú lateral" : "Contraer menú lateral"} title={collapsed ? "Expandir menú lateral" : "Contraer menú lateral"} aria-expanded={!collapsed} aria-controls="desktop-navigation" onClick={onToggle}>{collapsed ? <PanelLeftOpen size={23} /> : <PanelLeftClose size={23} />}</button></div>
      <div className={s.productName}><span>Atlas de infraestructura</span><small>Análisis de riesgo y vulnerabilidades</small></div>
      <div id="desktop-navigation" className={s.navScroll}>{menu(collapsed)}</div>
      {footer}
      {!collapsed && <div className={s.resizeHandle} role="separator" tabIndex={0} aria-label="Ancho del menú lateral" aria-orientation="vertical" aria-valuemin={248} aria-valuemax={360} aria-valuenow={width} aria-valuetext={`${width} píxeles`} onPointerDown={event => { if (event.button !== 0) return; resizing.current = true; event.currentTarget.setPointerCapture(event.pointerId); event.preventDefault(); }} onPointerMove={event => { if (resizing.current) resize(event.clientX); }} onPointerUp={event => { resizing.current = false; if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); }} onLostPointerCapture={() => { resizing.current = false; }} onKeyDown={event => { if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return; event.preventDefault(); resize(event.key === "Home" ? 248 : event.key === "End" ? 360 : width + (event.key === "ArrowLeft" ? -16 : 16)); }}><span /></div>}
    </aside>
    <div className={s.mobileHeader}>{brand}<button className={s.mobileTrigger} aria-label="Abrir menú de navegación" aria-haspopup="dialog" aria-expanded={mobileOpen} aria-controls="mobile-navigation" onClick={() => { drawer.current?.showModal(); setMobileOpen(true); }}><Menu size={24} />Menú</button></div>
    <dialog id="mobile-navigation" ref={drawer} className={s.mobileMenu} aria-labelledby="mobile-menu-title" onClose={() => setMobileOpen(false)} onClick={event => { if (event.target === drawer.current) { const bounds = event.currentTarget.getBoundingClientRect(); if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) drawer.current?.close(); } }}>
      <div className={s.sideHeader}>{brand}<button className={s.iconButton} aria-label="Cerrar menú de navegación" autoFocus onClick={() => drawer.current?.close()}><X size={24} /></button></div>
      <div className={s.productName}><h2 id="mobile-menu-title">Atlas de infraestructura</h2><small>Análisis de riesgo y vulnerabilidades</small></div>
      <div className={s.navScroll}>{menu(false)}</div>
      {footer}
    </dialog>
  </>;
}
