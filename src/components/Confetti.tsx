"use client";

import { useMemo } from "react";

const COLORS = ["#f5c542", "#a855f7", "#ffffff", "#7c3aed", "#fbbf24", "#e9d5ff"];

/** Lightweight CSS confetti — no dependency, friendly to school Wi-Fi & old iPads. */
export default function Confetti({ count = 90 }: { count?: number }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        // Deterministic pseudo-random spread (pure — safe to compute in render).
        const rand = (seed: number) => {
          const x = Math.sin(i * 127.1 + seed * 311.7) * 43758.5453;
          return x - Math.floor(x);
        };
        return {
          id: i,
          left: rand(1) * 100,
          delay: rand(2) * 0.8,
          duration: 2.6 + rand(3) * 2.2,
          size: 6 + rand(4) * 8,
          color: COLORS[i % COLORS.length],
          round: rand(5) > 0.6,
          drift: -60 + rand(6) * 120,
        };
      }),
    [count],
  );
  return (
    <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden" aria-hidden>
      {pieces.map((p) => (
        <span
          key={p.id}
          className="absolute top-[-4vh] block animate-[confettiFall_linear_forwards]"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.round ? p.size : p.size * 0.45,
            backgroundColor: p.color,
            borderRadius: p.round ? "50%" : "2px",
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            ["--drift" as string]: `${p.drift}px`,
          }}
        />
      ))}
    </div>
  );
}
