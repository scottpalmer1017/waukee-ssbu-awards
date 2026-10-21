import Image from "next/image";
import type { ProjectGroup } from "@/lib/data";
import PlaceholderScreenshot from "./PlaceholderScreenshot";

type Props = {
  group: ProjectGroup;
  selected: boolean;
  onSelect: (groupId: string) => void;
  /** Already picked for another specialty award on this ballot — visible but unpickable. */
  disabled?: boolean;
  /** Grid placement class from the parent (handles the centred 3-card second row). */
  className?: string;
};

export default function ProjectCard({ group, selected, onSelect, disabled = false, className = "" }: Props) {
  return (
    <button
      type="button"
      onClick={() => onSelect(group.id)}
      aria-pressed={selected}
      disabled={disabled}
      className={`group relative flex min-h-0 flex-col overflow-hidden rounded-2xl border-2 bg-[#17102b]/90 text-left transition-all duration-200 focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-300/70 active:scale-[0.98] ${className} ${
        disabled
          ? "cursor-not-allowed border-white/10 opacity-60 shadow-none"
          : selected
            ? "border-amber-300 shadow-[0_0_0_1px_rgba(252,211,77,0.9),0_0_28px_rgba(245,197,66,0.55),0_0_64px_rgba(168,85,247,0.35)]"
            : "border-purple-300/20 shadow-[0_8px_30px_rgba(0,0,0,0.45)] hover:border-purple-300/60 hover:shadow-[0_0_18px_rgba(168,85,247,0.35)]"
      }`}
    >
      {/* Screenshot — the dominant visual element */}
      <div className={`relative aspect-video w-full shrink-0 overflow-hidden bg-black lg:aspect-auto lg:min-h-0 lg:flex-1 ${disabled ? "opacity-50 grayscale" : ""}`}>
        {group.screenshotUrl ? (
          <Image src={group.screenshotUrl} alt={`Screenshot of ${group.name}'s app`} fill unoptimized sizes="(max-width: 1024px) 50vw, 25vw" className="object-cover" />
        ) : (
          <PlaceholderScreenshot group={group} />
        )}
        <span className="absolute left-2 top-2 rounded-md bg-black/70 px-2 py-0.5 text-[11px] font-black tracking-widest text-amber-300 backdrop-blur-sm">
          GROUP {group.number}
        </span>
        {selected && (
          <span className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-amber-300 text-base font-black text-black shadow-[0_0_16px_rgba(245,197,66,0.9)]">
            ✓
          </span>
        )}
        {disabled && (
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="rounded-full border border-amber-300/70 bg-black/75 px-3 py-1 text-[10px] font-black tracking-[0.18em] text-amber-200 backdrop-blur-sm sm:text-xs">
              ★ ALREADY HONORED
            </span>
          </span>
        )}
      </div>

      <div className="flex shrink-0 flex-col justify-center px-3 py-2">
        <span className={`truncate text-base font-extrabold leading-tight sm:text-lg ${selected ? "text-amber-200" : "text-white"}`}>
          {group.name}
        </span>
        <span className="truncate text-xs text-purple-200/75 sm:text-[13px]">
          {group.students.join(" · ")}
        </span>
      </div>

      {selected && <span className="pointer-events-none absolute inset-0 rounded-2xl bg-amber-300/5" />}
    </button>
  );
}
