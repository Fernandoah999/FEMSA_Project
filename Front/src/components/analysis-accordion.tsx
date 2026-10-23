"use client";

import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { ChevronDown } from "lucide-react";
import { useId, type ReactNode } from "react";
import s from "./analysis-accordion.module.css";

// Adaptation of the Radix accordion supplied by the user, styled for FEMSA.
export const AnalysisAccordion = AccordionPrimitive.Root;

export function AnalysisSection({ value, title, description, children }: { value: string; title: string; description: string; children: ReactNode }) {
  const descriptionId = useId();
  return <AccordionPrimitive.Item value={value} className={s.item} data-analysis-item={value}>
    <AccordionPrimitive.Header asChild><h2 className={s.heading}>
      <AccordionPrimitive.Trigger className={s.trigger} aria-label={title} aria-describedby={descriptionId} data-analysis-trigger={value}>
        <span><strong>{title}</strong><small id={descriptionId}>{description}</small></span>
        <ChevronDown size={23} aria-hidden="true" />
      </AccordionPrimitive.Trigger>
    </h2></AccordionPrimitive.Header>
    <AccordionPrimitive.Content className={s.content} data-analysis-content={value}>
      <div className={s.inner}>{children}</div>
    </AccordionPrimitive.Content>
  </AccordionPrimitive.Item>;
}
