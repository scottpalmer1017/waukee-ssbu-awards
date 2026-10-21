"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CATEGORIES, GROUPS, type ProjectGroup } from "@/lib/data";
import PlaceholderScreenshot from "@/components/PlaceholderScreenshot";
import Confetti from "@/components/Confetti";
import { computeCeremonyResults } from "@/lib/results";
import { playSuspenseRoll, playWinnerCelebration } from "@/lib/sounds";
import { apiPath } from "@/lib/basePath";

type Results = {
  votingOpen: boolean;
  totalBallots: number;
  results: { categoryId: string; counts: Record<string, number>; winners: string[] }[];
};

type Stage = "award" | "nominees" | "suspense" | "winner";

/** Fake results for rehearsal — never touches real ballots. */
const REHEARSAL_WINNERS: Record<string, string[]> = {
  "most-visually-appealing": ["group-5"],
  "easiest-to-use": ["group-2"],
  "simplest-solution": ["group-3"],
  "wow-award": ["group-7", "group-1"],
  "best-overall": ["group-7"],
};
const REHEARSAL_COUNTS: Record<string, Record<string, number>> = Object.fromEntries(
  CATEGORIES.map((c) => [
    c.id,
    Object.fromEntries(GROUPS.map((g, i) => [g.id, REHEARSAL_WINNERS[c.id]?.includes(g.id) ? 9 : (i * 3) % 5])),
  ]),
);

function WinnerCard({ group, big }: { group: ProjectGroup; big?: boolean }) {
  return (
    <div className={`overflow-hidden rounded-3xl border-2 border-amber-300 bg-[#17102b] shadow-[0_0_60px_rgba(245,197,66,0.5)] ${big ? "w-[min(680px,80vw)]" : "w-[min(420px,42vw)]"}`}>
      <div className="relative aspect-video w-full overflow-hidden bg-black">
        <PlaceholderScreenshot group={group} />
        <span className="absolute left-3 top-3 rounded-md bg-black/70 px-2.5 py-1 text-xs font-black tracking-widest text-amber-300">GROUP {group.number}</span>
      </div>
      <div className="px-6 py-4 text-center">
        <p className={`font-display font-black text-white ${big ? "text-4xl" : "text-2xl"}`}>{group.name}</p>
        <p className="mt-1 text-lg font-semibold text-amber-200">{group.students.join(" · ")}</p>
      </div>
    </div>
  );
}

function PresentInner() {
  const params = useSearchParams();
  const rehearsal = params.get("rehearsal") === "1";
  const [data, setData] = useState<Results | null>(null);
  const [unauthorized, setUnauthorized] = useState(false);
  const [awardIdx, setAwardIdx] = useState(0);
  const [stage, setStage] = useState<Stage>("award");
  const [showCounts, setShowCounts] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [done, setDone] = useState(false);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- one-time results load on mount */
    if (rehearsal) {
      setData({ votingOpen: false, totalBallots: 21, results: CATEGORIES.map((c) => ({ categoryId: c.id, counts: REHEARSAL_COUNTS[c.id], winners: REHEARSAL_WINNERS[c.id] ?? [] })) });
      return;
    }
    fetch(apiPath("/api/admin/state"), { cache: "no-store" })
      .then(async (r) => {
        if (r.status === 401) { setUnauthorized(true); return; }
        if (r.ok) setData(await r.json());
      })
      .catch(() => setUnauthorized(true));
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [rehearsal]);

  const ceremony = useMemo(
    () => (data ? computeCeremonyResults(data.results, data.totalBallots) : []),
    [data],
  );
  const category = CATEGORIES[awardIdx];
  const result = ceremony[awardIdx];
  const winnerGroups = useMemo(
    () => (result?.winners ?? []).map((id) => GROUPS.find((g) => g.id === id)).filter((g): g is ProjectGroup => Boolean(g)),
    [result],
  );
  const wonAwardTitle = (awardId: string) => CATEGORIES.find((c) => c.id === awardId)?.shortTitle ?? awardId;

  const advance = useCallback(() => {
    if (done) return;
    if (stage === "award") setStage("nominees");
    else if (stage === "nominees") {
      setStage("suspense");
      if (soundOn) playSuspenseRoll();
    } else if (stage === "suspense") {
      setStage("winner");
      if (soundOn) playWinnerCelebration();
    }
    else if (awardIdx < CATEGORIES.length - 1) { setAwardIdx(awardIdx + 1); setStage("award"); }
    else setDone(true);
  }, [stage, awardIdx, done, soundOn]);

  const goBackStage = useCallback(() => {
    if (done) { setDone(false); setStage("winner"); return; }
    if (stage === "winner") setStage("suspense");
    else if (stage === "suspense") setStage("nominees");
    else if (stage === "nominees") setStage("award");
    else if (awardIdx > 0) { setAwardIdx(awardIdx - 1); setStage("winner"); }
  }, [stage, awardIdx, done]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === " " || e.key === "ArrowRight" || e.key === "Enter") {
        e.preventDefault();
        // A clicked footer button keeps focus, and Space would natively
        // re-click it on key-up — fighting the advance. Drop focus first.
        if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
        advance();
      }
      if (e.key === "ArrowLeft") goBackStage();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [advance, goBackStage]);

  if (unauthorized) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
        <p className="font-display text-3xl font-black">Teacher login required</p>
        <p className="text-purple-200/80">Results stay hidden until the teacher launches the reveal.</p>
        <a href={apiPath("/admin")} className="font-display rounded-xl bg-gradient-to-b from-amber-300 to-amber-500 px-6 py-3 font-black text-black">Go to Teacher Login</a>
      </main>
    );
  }
  if (!data) return <main className="flex flex-1 items-center justify-center p-8 text-purple-200">Loading results…</main>;
  if (!rehearsal && data.totalBallots === 0) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
        <p className="font-display text-3xl font-black">No ballots yet</p>
        <p className="text-purple-200/80">Open voting from the dashboard, or run a rehearsal instead.</p>
        <div className="flex gap-2">
          <a href={apiPath("/admin")} className="rounded-xl border border-white/25 bg-white/5 px-5 py-2.5 font-bold">Dashboard</a>
          <a href={apiPath("/present?rehearsal=1")} className="font-display rounded-xl bg-gradient-to-b from-amber-300 to-amber-500 px-5 py-2.5 font-black text-black">Rehearse Reveal</a>
        </div>
      </main>
    );
  }

  return (
    <main className="relative flex flex-1 select-none flex-col overflow-hidden" onClick={advance} role="presentation">
      {stage === "winner" && !done && <Confetti />}
      {rehearsal && <span className="absolute right-4 top-4 z-50 rounded-full bg-sky-400/20 px-3 py-1 text-xs font-black tracking-widest text-sky-200">REHEARSAL — FAKE RESULTS</span>}

      <div className="flex flex-1 flex-col items-center justify-center px-6 py-6 text-center">
        {done ? (
          <div className="animate-[fadeSlide_0.5s_ease]">
            <p className="text-7xl" aria-hidden>🏆</p>
            <h1 className="font-display mt-4 text-5xl font-black leading-tight sm:text-6xl">
              Congratulations<br /><span className="text-amber-300">to all our developers!</span>
            </h1>
            <p className="mt-4 text-lg text-purple-200/85">Waukee SSBU Developer Awards · AP Computer Science Principles</p>
          </div>
        ) : stage === "award" ? (
          <div key={category.id} className="animate-[fadeSlide_0.5s_ease]">
            <p className="text-sm font-black tracking-[0.45em] text-amber-300">AWARD {awardIdx + 1} OF {CATEGORIES.length}</p>
            <p className="mt-6 text-8xl" aria-hidden>{category.icon}</p>
            <h1 className="font-display mt-4 max-w-5xl text-5xl font-black leading-tight drop-shadow-[0_0_30px_rgba(168,85,247,0.7)] sm:text-7xl">{category.title}</h1>
            <p className="mx-auto mt-4 max-w-2xl text-xl text-purple-100/90">{category.description}</p>
          </div>
        ) : stage === "nominees" ? (
          <div key={`n-${category.id}`} className="animate-[fadeSlide_0.5s_ease] flex w-full max-w-6xl flex-col items-center">
            <p className="text-sm font-black tracking-[0.45em] text-amber-300">{category.icon} {category.title.toUpperCase()}</p>
            <h2 className="font-display mt-2 text-4xl font-black">The Nominees</h2>
            <div className="mt-6 grid w-full grid-cols-4 gap-3">
              {GROUPS.map((g) => {
                // Finale: everyone is live again — no badges, no grey-out.
                const alreadyWonAward = category.isFinale ? undefined : result?.wonBefore[g.id];
                return (
                  <div key={g.id}>
                    <div className={`relative overflow-hidden rounded-2xl border bg-[#17102b] ${alreadyWonAward ? "border-amber-300/40 opacity-60" : "border-purple-300/30"}`}>
                      <div className={`relative aspect-video overflow-hidden bg-black ${alreadyWonAward ? "grayscale-[0.6]" : ""}`}>
                        <PlaceholderScreenshot group={g} />
                        {alreadyWonAward && (
                          <span className="absolute inset-0 flex items-center justify-center px-2">
                            <span className="rounded-full border border-amber-300/80 bg-black/80 px-3 py-1.5 text-center text-[11px] font-black tracking-wide text-amber-200 backdrop-blur-sm">
                              🏆 WON: {wonAwardTitle(alreadyWonAward).toUpperCase()}
                            </span>
                          </span>
                        )}
                      </div>
                      <p className="px-3 py-2 text-left text-sm font-extrabold">{g.name} <span className="block truncate text-xs font-semibold text-purple-200/70">{g.students.join(" · ")}</span></p>
                    </div>
                  </div>
                );
              })}
            </div>
            {category.isFinale ? (
              <p className="mt-4 text-sm font-semibold text-amber-200/90">
                ★ Everyone is back — anyone can take Best Overall. ★
              </p>
            ) : result && Object.keys(result.wonBefore).length > 0 ? (
              <p className="mt-4 text-sm font-semibold text-purple-200/70">
                Groups with a 🏆 already won tonight — this award goes to someone new.
              </p>
            ) : null}
          </div>
        ) : stage === "suspense" ? (
          <div className="animate-[fadeSlide_0.5s_ease]">
            <p className="text-7xl" aria-hidden>{category.icon}</p>
            <h2 className="font-display mt-6 text-5xl font-black tracking-wide sm:text-7xl">
              AND THE WINNER IS<span className="animate-pulse">…</span>
            </h2>
            <p className="mt-6 text-lg text-purple-200/70">(click or press Space when you&apos;re ready)</p>
          </div>
        ) : (
          <div key={`w-${category.id}`} className="animate-[fadeSlide_0.6s_ease] flex flex-col items-center">
            <p className="text-sm font-black tracking-[0.45em] text-amber-300">{category.icon} {category.title.toUpperCase()}</p>
            <h2 className="font-display mt-2 text-4xl font-black sm:text-5xl">
              {winnerGroups.length > 1 ? "🏆 IT'S A TIE — CO-WINNERS! 🏆" : "🏆 WINNER 🏆"}
            </h2>
            <div className="mt-6 flex flex-wrap items-start justify-center gap-5" style={{ animation: "winnerPulse 2.2s ease-in-out infinite" }}>
              {winnerGroups.map((g) => <WinnerCard key={g.id} group={g} big={winnerGroups.length === 1} />)}
            </div>
            {showCounts && result && (
              <p className="mt-5 rounded-full bg-white/8 px-4 py-1.5 text-sm font-bold text-purple-100">
                {winnerGroups.map((g) => `${g.name}: ${result.counts[g.id]} votes`).join(" · ")} · {data.totalBallots} ballots
              </p>
            )}
          </div>
        )}
      </div>

      <footer className="flex items-center justify-between px-6 pb-5 text-xs text-purple-200/50" onClick={(e) => e.stopPropagation()}>
        {stage === "award" && awardIdx === 0 && !done ? (
          <a href={apiPath("/admin")} className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 font-bold text-white/80 hover:bg-white/10">← Dashboard</a>
        ) : (
          <button type="button" onClick={(e) => { goBackStage(); e.currentTarget.blur(); }} className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 font-bold text-white/80 hover:bg-white/10">← Back</button>
        )}
        <div className="flex items-center gap-4">
          <button type="button" onClick={(e) => { setSoundOn((s) => !s); e.currentTarget.blur(); }} className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 font-bold text-white/80 hover:bg-white/10" aria-pressed={soundOn}>
            {soundOn ? "🔊 Sound On" : "🔇 Sound Off"}
          </button>
          <label className="flex cursor-pointer items-center gap-2 font-semibold">
            <input type="checkbox" checked={showCounts} onChange={(e) => setShowCounts(e.target.checked)} onClick={(e) => e.currentTarget.blur()} className="h-4 w-4 accent-amber-400" />
            Show vote totals
          </label>
        </div>
        <span className="hidden sm:block">Click anywhere or press Space to advance</span>
        <button type="button" onClick={(e) => { advance(); e.currentTarget.blur(); }} className="font-display rounded-lg bg-gradient-to-b from-amber-300 to-amber-500 px-4 py-2 font-black text-black">Next →</button>
      </footer>
    </main>
  );
}

export default function PresentPage() {
  return (
    <Suspense fallback={<main className="flex flex-1 items-center justify-center p-8 text-purple-200">Loading…</main>}>
      <PresentInner />
    </Suspense>
  );
}
