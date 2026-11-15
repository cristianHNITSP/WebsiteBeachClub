"use client";;
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const SPREAD = 0.42;

export function Ripple({
  strength = 0.12,
  className
}) {
  const reduce = useReducedMotion();
  const ref = useRef(null);
  const [waves, setWaves] = useState([]);

  useEffect(() => {
    const host = ref.current?.parentElement;
    if (!host) return;
    let next = 0;
    const live = new Map();
    const timers = new Set();
    let pressing = null;
    let keyHeld = false;

    const start = (clientX, clientY) => {
      const b = host.getBoundingClientRect();
      const x = clientX === undefined ? b.width / 2 : clientX - b.left;
      const y = clientY === undefined ? b.height / 2 : clientY - b.top;
      const r = Math.hypot(Math.max(x, b.width - x), Math.max(y, b.height - y)) / 0.78;
      const id = next++;
      live.set(id, performance.now());
      setWaves((w) => [...w, { id, x, y, r }]);
      return id;
    };

    const end = (id) => {
      if (id === null || !live.has(id)) return;
      const born = live.get(id) ?? 0;
      live.delete(id);
      const wait = Math.max(0, SPREAD * 1000 - (performance.now() - born));
      const t = setTimeout(() => {
        timers.delete(t);
        setWaves((w) => w.filter((wave) => wave.id !== id));
      }, wait);
      timers.add(t);
    };

    const down = (e) => {
      if (e.button !== 0 || (host).disabled) return;
      end(pressing);
      pressing = start(e.clientX, e.clientY);
    };
    const up = () => {
      end(pressing);
      pressing = null;
    };
    const keydown = (e) => {
      if ((e.key !== "Enter" && e.key !== " ") || e.repeat || keyHeld || e.target !== host) return;
      keyHeld = e.key === " ";
      const id = start();
      if (e.key === "Enter") end(id);
      else pressing = id;
    };
    const keyup = (e) => {
      if (e.key !== " ") return;
      keyHeld = false;
      up();
    };

    host.addEventListener("pointerdown", down);
    host.addEventListener("pointerup", up);
    host.addEventListener("pointerleave", up);
    host.addEventListener("pointercancel", up);
    host.addEventListener("keydown", keydown);
    host.addEventListener("keyup", keyup);
    host.addEventListener("blur", up);
    return () => {
      host.removeEventListener("pointerdown", down);
      host.removeEventListener("pointerup", up);
      host.removeEventListener("pointerleave", up);
      host.removeEventListener("pointercancel", up);
      host.removeEventListener("keydown", keydown);
      host.removeEventListener("keyup", keyup);
      host.removeEventListener("blur", up);
      for (const t of timers) clearTimeout(t);
    };
  }, []);

  return (
    <span aria-hidden className={cn("pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]", className)} ref={ref}>
      <AnimatePresence>
        {waves.map((w) => (
          <motion.span
            animate={{ scale: 1, opacity: strength }}
            className="absolute rounded-full"
            exit={{ opacity: 0, transition: { duration: 0.32, ease: "easeOut" } }}
            initial={reduce ? { scale: 1, opacity: 0 } : { scale: 0.1, opacity: strength * 0.6 }}
            key={w.id}
            style={{
              left: w.x - w.r,
              top: w.y - w.r,
              width: w.r * 2,
              height: w.r * 2,
              background: "radial-gradient(closest-side, currentColor 78%, transparent)",
            }}
            transition={
              reduce
                ? { duration: 0.12 }
                : { scale: { duration: SPREAD, ease: [0.23, 1, 0.32, 1] }, opacity: { duration: 0.1 } }
            }
          />
        ))}
      </AnimatePresence>
    </span>
  );
}
