"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import s from "./text-decoder.module.css";

const subscribe = (onChange: () => void) => {
  const media = matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
};
const reducedSnapshot = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

// Adapted from the TextDecoder supplied by the user: one finite decode per scope.
export function TextDecoder({ text, replayKey, speed = 1 }: { text: string; replayKey: string; speed?: number }) {
  const reduced = useSyncExternalStore(subscribe, reducedSnapshot, () => true);
  const identity = `${replayKey}:${text}`;
  const [frame, setFrame] = useState({ identity, output: text, settled: true });
  useEffect(() => {
    if (reduced || !text) { setFrame({ identity, output: text, settled: true }); return; }
    const chars = Array.from(text), digits = chars.filter(char => /\d/.test(char)).length;
    const duration = Math.max(150, Math.min(1500, 620 / Math.max(.1, speed)));
    const start = performance.now();
    let raf = 0, lastTick = -1;
    const draw = (now: number) => {
      const elapsed = now - start;
      if (elapsed >= duration) { setFrame({ identity, output: text, settled: true }); return; }
      const tick = Math.floor(elapsed / 45);
      if (tick !== lastTick) {
        lastTick = tick;
        const revealed = Math.floor(elapsed / duration * digits);
        let index = 0;
        const output = chars.map(char => !/\d/.test(char) || index++ < revealed ? char : String(Math.floor(Math.random() * 10))).join("");
        setFrame({ identity, output, settled: false });
      }
      raf = requestAnimationFrame(draw);
    };
    draw(start);
    return () => cancelAnimationFrame(raf);
  }, [identity, text, speed, reduced]);
  const settled = reduced || frame.identity !== identity || frame.settled;
  return <span className={s.decoder} role="img" aria-label={text} data-decoder="metric" data-value={text} data-replay={replayKey} data-settled={settled}>{reduced || frame.identity !== identity ? text : frame.output}</span>;
}
