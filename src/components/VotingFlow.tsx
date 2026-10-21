"use client";

import { useEffect, useMemo, useState } from "react";
import { CATEGORIES, EVENT, GROUPS, type ProjectGroup } from "@/lib/data";
import { apiPath } from "@/lib/basePath";
import ProjectCard from "./ProjectCard";
import PlaceholderScreenshot from "./PlaceholderScreenshot";

type Phase = "intro" | "voting" | "review" | "submitted";
type Selections = Record<string, string>; // categoryId -> groupId

const STORAGE_KEY = "waukee-ssbu-ballot-v1";

type SavedState = { phase: Phase; step: number; selections: Selections };

function groupById(groups: ProjectGroup[], id?: string): ProjectGroup | undefined {
  return groups.find((g) => g.id === id);
}

/** 4-across top row, 3 centred underneath on large/landscape screens (8-col trick). */
function cardPlacement(index: number) {
  if (index === 4) return "lg:col-start-2";
  return "";
}

export default function VotingFlow() {
  const [phase, setPhase] = useState<Phase>("intro");
  const [step, setStep] = useState(0);
  const [selections, setSelections] = useState<Selections>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [votingOpen, setVotingOpen] = useState<boolean>(EVENT.votingOpen);
  const [groups, setGroups] = useState<ProjectGroup[]>(GROUPS);
  const [hydrated, setHydrated] = useState(false);

  // Live open/closed status + teacher-uploaded screenshots from the server.
  useEffect(() => {
    fetch(apiPath("/api/status"))
      .then((r) => r.json())
      .then((d: { votingOpen?: boolean }) => { if (typeof d.votingOpen === "boolean") setVotingOpen(d.votingOpen); })
      .catch(() => { /* offline/demo — keep default */ });
    fetch(apiPath("/api/groups"))
      .then((r) => r.json())
      .then((d: { groups?: ProjectGroup[] }) => { if (Array.isArray(d.groups) && d.groups.length) setGroups(d.groups); })
      .catch(() => { /* keep placeholders */ });
  }, []);

  // Resume an in-progress ballot after a refresh; a submitted ballot stays submitted on this iPad.
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- one-time restore of a saved ballot on mount */
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as SavedState;
        if (saved.phase === "submitted" || saved.phase === "review" || saved.phase === "voting") {
          setPhase(saved.phase);
          setStep(Math.min(saved.step ?? 0, CATEGORIES.length - 1));
          setSelections(saved.selections ?? {});
        }
      }
    } catch {
      /* corrupted storage — start fresh */
    }
    setHydrated(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ phase, step, selections } satisfies SavedState));
    } catch {
      /* storage unavailable (private mode) — voting still works in-memory */
    }
  }, [hydrated, phase, step, selections]);

  const category = CATEGORIES[step];
  const selectedForStep = selections[category.id];
  const allChosen = useMemo(
    () => CATEGORIES.every((c) => selections[c.id]),
    [selections],
  );

  // Specialty awards are exclusive per ballot: a group already picked for a
  // different specialty award is shown greyed out. The finale ignores this.
  const disabledGroupIds = useMemo(() => {
    if (category.isFinale) return new Set<string>();
    return new Set(
      CATEGORIES.filter((c) => !c.isFinale && c.id !== category.id)
        .map((c) => selections[c.id])
        .filter(Boolean),
    );
  }, [category, selections]);

  function select(groupId: string) {
    if (disabledGroupIds.has(groupId)) return;
    setSelections((s) => {
      const nextSel: Selections = { ...s, [category.id]: groupId };
      if (!category.isFinale) {
        // Changing an earlier pick may collide with a later specialty pick —
        // clear the colliding one so it can simply be re-picked going forward.
        for (const c of CATEGORIES) {
          if (!c.isFinale && c.id !== category.id && nextSel[c.id] === groupId) {
            delete nextSel[c.id];
          }
        }
      }
      return nextSel;
    });
  }

  function next() {
    if (!selectedForStep) return;
    if (step < CATEGORIES.length - 1) setStep(step + 1);
    else setPhase("review");
  }

  function back() {
    if (phase === "review") {
      setPhase("voting");
      setStep(CATEGORIES.length - 1);
    } else if (step > 0) setStep(step - 1);
    else setPhase("intro");
  }

  async function submit() {
    if (!allChosen || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      let token = localStorage.getItem("waukee-device-token");
      if (!token) {
        token = typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `device-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        localStorage.setItem("waukee-device-token", token);
      }
      const response = await fetch(apiPath("/api/ballot"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceToken: token, selections }),
      });
      if (response.ok) {
        setPhase("submitted");
      } else if (response.status === 409) {
        // Already recorded from this device — show the confirmation.
        setPhase("submitted");
      } else {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        setSubmitError(data.error ?? "Something went wrong. Please try again.");
      }
    } catch {
      setSubmitError("Couldn't reach the server. Check Wi-Fi and try again — your picks are saved on this screen.");
    } finally {
      setSubmitting(false);
    }
  }

  function resetDemo() {
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
    setSelections({});
    setStep(0);
    setPhase("intro");
  }

  if (!hydrated) return <div className="flex-1" aria-hidden />;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* ── Header ─────────────────────────────────────────── */}
      <header className="flex items-center justify-between gap-3 px-4 pt-4 sm:px-6">
        <div>
          <p className="text-[10px] font-black tracking-[0.35em] text-amber-300 sm:text-xs">WAUKEE HIGH SCHOOL</p>
          <h1 className="font-display text-lg font-black leading-none tracking-wide text-white sm:text-2xl">
            SSBU DEVELOPER <span className="text-amber-300">AWARDS</span>
          </h1>
        </div>
        {phase === "voting" && (
          <div className="text-right">
            <div className="flex gap-1.5" aria-hidden>
              {CATEGORIES.map((c, i) => (
                <span
                  key={c.id}
                  className={`h-1.5 w-8 rounded-full transition-all sm:w-10 ${
                    i < step ? "bg-purple-400" : i === step ? "bg-amber-300 shadow-[0_0_10px_rgba(245,197,66,0.9)]" : "bg-white/15"
                  }`}
                />
              ))}
            </div>
          </div>
        )}
      </header>

      {/* ── Intro ──────────────────────────────────────────── */}
      {phase === "intro" && (
        <main className="flex flex-1 flex-col items-center justify-center px-4 py-6 text-center">
          <p className="text-5xl sm:text-6xl" aria-hidden>🏆</p>
          <h2 className="font-display mt-4 max-w-2xl text-3xl font-black leading-tight text-white sm:text-5xl">
            {EVENT.name}
          </h2>
          <p className="mt-2 text-sm text-purple-200/80 sm:text-base">{EVENT.subtitle}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {CATEGORIES.map((c) => (
              <span key={c.id} className="rounded-full border border-purple-300/30 bg-purple-500/10 px-3 py-1.5 text-xs font-bold text-purple-100 sm:text-sm">
                {c.icon} {c.shortTitle}
              </span>
            ))}
          </div>
          <p className="mt-6 max-w-md text-sm text-purple-200/70">
            Watch the demos, then tap your favourite project in each award. Each specialty award needs a
            <span className="font-bold text-amber-200"> different group</span> — but in the Best Overall finale,
            <span className="font-bold text-amber-200"> everyone is back</span>. You can vote for any group, including your own.
          </p>
          {votingOpen ? (
            <button
              type="button"
              onClick={() => setPhase("voting")}
              className="font-display mt-8 rounded-xl bg-gradient-to-b from-amber-300 to-amber-500 px-10 py-4 text-lg font-black tracking-widest text-black shadow-[0_0_32px_rgba(245,197,66,0.5)] transition hover:brightness-110 active:scale-95"
            >
              START VOTING →
            </button>
          ) : (
            <p className="mt-8 rounded-xl border border-amber-300/40 bg-amber-300/10 px-6 py-4 font-bold text-amber-200">
              Voting isn&apos;t open right now — hang tight and watch the screen!
            </p>
          )}
        </main>
      )}

      {/* ── Voting ─────────────────────────────────────────── */}
      {phase === "voting" && (
        <>
          <div className="px-4 pt-3 sm:px-6">
            <div
              key={`banner-${category.id}`}
              className="animate-[fadeSlide_0.35s_ease] relative overflow-hidden rounded-2xl border-2 border-amber-300/60 bg-gradient-to-r from-purple-950 via-[#2a1060] to-purple-950 px-4 py-3 shadow-[0_0_36px_rgba(168,85,247,0.4),inset_0_0_32px_rgba(245,197,66,0.06)] sm:px-6 sm:py-4"
            >
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-300 to-transparent" aria-hidden />
              <div className="flex items-center justify-center gap-3 text-center sm:gap-5">
                <span
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-amber-300 bg-amber-300/15 text-3xl shadow-[0_0_24px_rgba(245,197,66,0.55)] sm:h-[4.5rem] sm:w-[4.5rem] sm:text-4xl"
                  aria-hidden
                >
                  {category.icon}
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] font-black tracking-[0.4em] text-amber-300 sm:text-xs">
                    {category.isFinale ? "★ THE FINALE — ALL 7 ARE BACK ★" : `NOW VOTING · AWARD ${step + 1} OF ${CATEGORIES.length}`}
                  </p>
                  <h2 className="font-display mt-1 text-2xl font-black leading-none tracking-wide text-white drop-shadow-[0_0_18px_rgba(168,85,247,0.65)] sm:text-4xl lg:text-[2.75rem]">
                    {category.title}
                  </h2>
                  <p className="mt-1.5 text-sm font-semibold text-purple-100/90 sm:text-base">
                    {category.description}{" "}
                    <span className="text-amber-200">
                      {category.isFinale
                        ? "Tap your champion below."
                        : disabledGroupIds.size > 0
                          ? "Greyed-out groups are already honored — pick a different one."
                          : "Tap one project below."}
                    </span>
                  </p>
                </div>
              </div>
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-amber-300 to-transparent" aria-hidden />
            </div>
          </div>

          <main className="min-h-0 flex-1 overflow-y-auto px-4 py-3 sm:px-6 lg:overflow-hidden">
            <div key={category.id} className="animate-[fadeSlide_0.35s_ease] grid h-full grid-cols-1 gap-3 min-[480px]:grid-cols-2 lg:grid-cols-8 lg:grid-rows-2">
              {groups.map((g, i) => (
                <div key={g.id} className={`min-h-0 lg:col-span-2 ${cardPlacement(i)}`}>
                  <ProjectCard group={g} selected={selectedForStep === g.id} onSelect={select} disabled={disabledGroupIds.has(g.id)} className="h-full w-full" />
                </div>
              ))}
            </div>
          </main>

          <footer className="flex items-center justify-between gap-3 px-4 pb-4 sm:px-6">
            <button
              type="button"
              onClick={back}
              className="rounded-xl border border-white/20 bg-white/5 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/10 active:scale-95 sm:px-7 sm:text-base"
            >
              ← Back
            </button>
            <p className="hidden text-xs text-purple-200/60 sm:block">
              {selectedForStep ? `${groupById(groups, selectedForStep)?.name} selected` : "Tap a project to continue"}
            </p>
            <button
              type="button"
              onClick={next}
              disabled={!selectedForStep}
              className="font-display rounded-xl bg-gradient-to-b from-amber-300 to-amber-500 px-5 py-3 text-sm font-black tracking-wider text-black shadow-[0_0_24px_rgba(245,197,66,0.45)] transition enabled:hover:brightness-110 enabled:active:scale-95 disabled:cursor-not-allowed disabled:opacity-30 disabled:shadow-none sm:px-7 sm:text-base"
            >
              {step === CATEGORIES.length - 1 ? "Review Ballot →" : "Next Award →"}
            </button>
          </footer>
        </>
      )}

      {/* ── Review ─────────────────────────────────────────── */}
      {phase === "review" && (
        <>
          <main className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
            <h2 className="font-display text-center text-2xl font-black text-white sm:text-3xl">Review Your Ballot</h2>
            <p className="mt-1 text-center text-sm text-purple-200/75">Check your picks. Tap Change to fix any award.</p>
            <div className="mx-auto mt-5 grid max-w-4xl gap-3 sm:grid-cols-2">
              {CATEGORIES.map((c, i) => {
                const g = groupById(groups, selections[c.id]);
                return (
                  <div key={c.id} className="flex items-center gap-3 rounded-2xl border border-purple-300/25 bg-[#17102b]/90 p-3">
                    <div className="relative aspect-video w-28 shrink-0 overflow-hidden rounded-lg bg-black sm:w-36">
                      {g && (g.screenshotUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={g.screenshotUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <PlaceholderScreenshot group={g} />
                      ))}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-black tracking-[0.2em] text-amber-300">{c.icon} {c.shortTitle.toUpperCase()}</p>
                      <p className="truncate text-lg font-extrabold text-white">{g?.name ?? "—"}</p>
                      <p className="truncate text-xs text-purple-200/70">{g?.students.join(" · ")}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setStep(i); setPhase("voting"); }}
                      className="shrink-0 rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-xs font-bold text-white transition hover:bg-white/10 active:scale-95"
                    >
                      Change
                    </button>
                  </div>
                );
              })}
            </div>
          </main>
          <footer className="flex items-center justify-between gap-3 px-4 pb-4 sm:px-6">
            <button type="button" onClick={back} className="rounded-xl border border-white/20 bg-white/5 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/10 active:scale-95 sm:px-7 sm:text-base">
              ← Back
            </button>
            {submitError && (
              <p role="alert" className="max-w-xs rounded-lg border border-red-400/50 bg-red-500/15 px-3 py-2 text-center text-xs font-bold text-red-200">
                {submitError}
              </p>
            )}
            <button
              type="button"
              onClick={submit}
              disabled={!allChosen || submitting}
              className="font-display rounded-xl bg-gradient-to-b from-amber-300 to-amber-500 px-6 py-3 text-sm font-black tracking-wider text-black shadow-[0_0_28px_rgba(245,197,66,0.55)] transition enabled:hover:brightness-110 enabled:active:scale-95 disabled:opacity-40 sm:px-9 sm:text-base"
            >
              {submitting ? "Submitting…" : "✓ Submit Ballot"}
            </button>
          </footer>
        </>
      )}

      {/* ── Submitted ──────────────────────────────────────── */}
      {phase === "submitted" && (
        <main className="flex flex-1 flex-col items-center justify-center px-4 py-6 text-center">
          <div className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-amber-300 bg-amber-300/10 text-5xl shadow-[0_0_48px_rgba(245,197,66,0.5)]" aria-hidden>
            ✓
          </div>
          <h2 className="font-display mt-6 text-3xl font-black text-white sm:text-4xl">Ballot Recorded!</h2>
          <p className="mt-2 max-w-md text-sm text-purple-200/80 sm:text-base">
            Thanks for voting. Your picks for all 4 awards are in — now sit back and get ready for the big reveal! 🏆
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {CATEGORIES.map((c) => (
              <span key={c.id} className="rounded-full border border-purple-300/30 bg-purple-500/10 px-3 py-1.5 text-xs font-bold text-purple-100">
                {c.icon} {groupById(groups, selections[c.id])?.name}
              </span>
            ))}
          </div>
          {/* Stage 1 demo aid — removed/hidden once real ballots are live. */}
          <button type="button" onClick={resetDemo} className="mt-10 text-xs text-purple-300/40 underline underline-offset-4 hover:text-purple-300/80">
            Demo: reset this device
          </button>
        </main>
      )}
    </div>
  );
}
