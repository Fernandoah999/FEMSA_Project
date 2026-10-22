"use client";

import type { ReactNode } from "react";
import s from "./inventory-dashboard.module.css";

export function InventoryTableRow({ children, onOpen }: { children: ReactNode; onOpen: () => void }) {
  return <tr className={s.recordRow} onClick={event => {
    if (event.defaultPrevented || (event.target as HTMLElement).closest("button, a, input, select, textarea")) return;
    if (window.getSelection()?.toString()) return;
    onOpen();
  }}>{children}</tr>;
}
