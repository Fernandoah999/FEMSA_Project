"use client";

import { useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { Check, ChevronDown } from "lucide-react";
import s from "./animated-dropdown.module.css";

// Adapted from @emerald-ui's Animated Dropdown (MIT), supplied by the user.
// Uses the browser popover layer so menus remain visible outside scrolling panels.
export type DropdownOption = { value: string; label: string; disabled?: boolean };
type Props = { label: string; value: string; options: DropdownOption[]; onValueChange: (value: string) => void; disabled?: boolean; className?: string };

export function AnimatedDropdown({ label, value, options, onValueChange, disabled = false, className = "" }: Props) {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const search = useRef({ text: "", last: 0 });
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const selected = options.findIndex(option => option.value === value);
  const close = () => { menu.current?.hidePopover(); setOpen(false); };
  const choose = (index: number) => { const option = options[index]; if (!option || option.disabled) return; onValueChange(option.value); close(); trigger.current?.focus(); };
  const first = () => Math.max(0, options.findIndex(option => !option.disabled));
  const show = (index = selected >= 0 ? selected : first()) => { if (disabled || !options.length) return; setActive(index); setOpen(true); };

  useLayoutEffect(() => {
    if (!open || disabled) { menu.current?.hidePopover(); return; }
    const popup = menu.current!, button = trigger.current!;
    const position = () => {
      const bounds = button.getBoundingClientRect();
      const viewport = window.visualViewport;
      const leftEdge = viewport?.offsetLeft ?? 0, topEdge = viewport?.offsetTop ?? 0;
      const rightEdge = leftEdge + (viewport?.width ?? innerWidth), bottomEdge = topEdge + (viewport?.height ?? innerHeight);
      const below = bottomEdge - bounds.bottom - 20, above = bounds.top - topEdge - 20;
      const upward = below < 240 && above > below;
      const height = Math.min(336, Math.max(80, upward ? above : below));
      const width = Math.min(Math.max(bounds.width, 220), rightEdge - leftEdge - 24);
      popup.style.width = `${width}px`;
      popup.style.maxHeight = `${height}px`;
      popup.style.left = `${Math.max(leftEdge + 12, Math.min(bounds.left, rightEdge - width - 12))}px`;
      popup.style.top = `${upward ? Math.max(topEdge + 12, bounds.top - Math.min(popup.scrollHeight, height) - 8) : bounds.bottom + 8}px`;
      popup.dataset.direction = upward ? "up" : "down";
    };
    popup.showPopover();
    position();
    const onOutsidePointer = (event: PointerEvent) => {
      if (!button.contains(event.target as Node) && !popup.contains(event.target as Node)) { popup.hidePopover(); setOpen(false); }
    };
    const observer = new ResizeObserver(position); observer.observe(button);
    document.addEventListener("pointerdown", onOutsidePointer);
    window.addEventListener("resize", position);
    window.addEventListener("scroll", position, true);
    window.visualViewport?.addEventListener("resize", position);
    return () => { observer.disconnect(); document.removeEventListener("pointerdown", onOutsidePointer); window.removeEventListener("resize", position); window.removeEventListener("scroll", position, true); window.visualViewport?.removeEventListener("resize", position); };
  }, [open, disabled, options.length]);
  useLayoutEffect(() => { if (open) document.getElementById(`${id}-option-${active}`)?.scrollIntoView({ block: "nearest" }); }, [active, open, id]);

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "Tab") { close(); return; }
    if (event.key === "Escape") { if (open) { event.preventDefault(); event.stopPropagation(); close(); } return; }
    if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      event.preventDefault();
      const step = event.key === "ArrowUp" || event.key === "End" ? -1 : 1;
      let next = event.key === "Home" ? 0 : event.key === "End" ? options.length - 1 : open ? (active + step + options.length) % options.length : selected >= 0 ? selected : first();
      for (let i = 0; i < options.length && options[next]?.disabled; i++) next = (next + step + options.length) % options.length;
      show(next); return;
    }
    if (event.key === "Enter" || event.key === " ") { event.preventDefault(); if (open) choose(active); else show(); return; }
    if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault(); const now = performance.now();
      const text = (now - search.current.last < 700 ? search.current.text : "") + event.key;
      search.current = { text, last: now };
      const normalize = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase();
      const next = options.findIndex(option => !option.disabled && normalize(option.label).startsWith(normalize(text)));
      if (next >= 0) show(next);
    }
  }

  return <span className={`${s.root} ${className}`} data-dropdown="animated">
    <button ref={trigger} type="button" className={s.trigger} role="combobox" aria-label={label} aria-haspopup="listbox" aria-expanded={open && !disabled} aria-controls={`${id}-listbox`} aria-activedescendant={open && !disabled ? `${id}-option-${active}` : undefined} data-value={value} disabled={disabled || !options.length} onClick={() => open ? close() : show()} onKeyDown={onKeyDown}><span title={options[selected]?.label}>{options[selected]?.label ?? "Seleccionar"}</span><ChevronDown size={21} aria-hidden="true" /></button>
    <div ref={menu} id={`${id}-listbox`} role="listbox" aria-label={label} className={s.menu} popover="auto" onToggle={() => { if (!menu.current?.matches(":popover-open")) setOpen(false); }}>
      {options.map((option, index) => <div id={`${id}-option-${index}`} key={option.value} role="option" aria-selected={option.value === value} aria-disabled={option.disabled || undefined} data-value={option.value} data-active={index === active} className={s.option} style={{ animationDelay: `${Math.min(index * 18, 126)}ms` }} onPointerMove={() => { if (!option.disabled) setActive(index); }} onMouseDown={event => event.preventDefault()} onClick={event => { event.preventDefault(); choose(index); }}><span>{option.label}</span>{option.value === value && <Check size={20} aria-hidden="true" />}</div>)}
    </div>
  </span>;
}
