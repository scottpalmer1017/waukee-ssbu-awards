import type { ProjectGroup } from "@/lib/data";

/**
 * Stage 1 stand-in for a real uploaded screenshot. Draws a stylised
 * "tournament manager app" wireframe in the group's own accent colour so
 * each of the 7 cards is instantly distinguishable. Replaced by the real
 * screenshot (Supabase Storage) in Stage 3 — the card treats both the same.
 */
export default function PlaceholderScreenshot({ group }: { group: ProjectGroup }) {
  const { accent, accentSoft } = group;
  return (
    <svg
      viewBox="0 0 400 225"
      className="h-full w-full"
      role="img"
      aria-label={`Placeholder screenshot for ${group.name}`}
      preserveAspectRatio="xMidYMid slice"
    >
      <rect width="400" height="225" fill={accentSoft} />
      <rect width="400" height="225" fill="url(#sheen)" opacity="0.35" />
      {/* app chrome */}
      <rect width="400" height="34" fill="#000" opacity="0.45" />
      <circle cx="20" cy="17" r="5" fill={accent} />
      <rect x="34" y="12" width="90" height="10" rx="5" fill="#fff" opacity="0.75" />
      <rect x="300" y="12" width="38" height="10" rx="5" fill={accent} opacity="0.9" />
      <rect x="346" y="12" width="38" height="10" rx="5" fill="#fff" opacity="0.25" />
      {/* sidebar */}
      <rect y="34" width="86" height="191" fill="#000" opacity="0.35" />
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} x="12" y={52 + i * 26} width="62" height="12" rx="6" fill={i === 0 ? accent : "#fff"} opacity={i === 0 ? 0.95 : 0.28} />
      ))}
      {/* bracket columns */}
      {[0, 1, 2].map((col) => (
        <g key={col}>
          {[0, 1, 2, 3].slice(0, col === 2 ? 1 : col === 1 ? 2 : 4).map((row) => (
            <g key={row}>
              <rect x={110 + col * 96} y={52 + row * 44 + col * 22} width="80" height="30" rx="6" fill="#fff" opacity="0.13" stroke={accent} strokeOpacity="0.55" />
              <rect x={118 + col * 96} y={60 + row * 44 + col * 22} width="44" height="6" rx="3" fill="#fff" opacity="0.65" />
              <rect x={118 + col * 96} y={70 + row * 44 + col * 22} width="30" height="6" rx="3" fill={accent} opacity="0.8" />
            </g>
          ))}
        </g>
      ))}
      {/* big group number watermark */}
      <text x="392" y="218" textAnchor="end" fontFamily="Arial Black, Arial, sans-serif" fontWeight="900" fontSize="92" fill={accent} opacity="0.28">
        {group.number}
      </text>
      <text x="200" y="202" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="11" letterSpacing="3" fill="#fff" opacity="0.55">
        SCREENSHOT COMING SOON
      </text>
      <defs>
        <linearGradient id="sheen" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fff" />
          <stop offset="45%" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
}
