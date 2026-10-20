"use client";

import { useCallback, useEffect, useState } from "react";
import { CATEGORIES, GROUPS } from "@/lib/data";
import { computeCeremonyResults } from "@/lib/results";

type Results = {
  votingOpen: boolean;
  totalBallots: number;
  results: { categoryId: string; counts: Record<string, number>; winners: string[] }[];
};

function groupName(id: string) {
  return GROUPS.find((g) => g.id === id)?.name ?? id;
}

export default function AdminPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [data, setData] = useState<Results | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const r = await fetch("/api/admin/state", { cache: "no-store" });
    if (r.status === 401) { setAuthed(false); return; }
    if (r.ok) { setAuthed(true); setData(await r.json()); }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- initial teacher-state load on mount
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!authed) return;
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [authed, load]);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setLoginError(null);
    const r = await fetch("/api/admin/login", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (r.ok) { setPassword(""); await load(); }
    else setLoginError("Wrong password — try again.");
  }

  async function control(action: "open" | "close" | "reset") {
    if (action === "reset") {
      if (!window.confirm("Delete ALL submitted ballots? This cannot be undone.")) return;
      if (window.prompt('Type RESET to confirm deleting all ballots') !== "RESET") return;
    }
    setBusy(true);
    await fetch("/api/admin/control", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    await load();
    setBusy(false);
  }

  if (authed === null) return <main className="flex flex-1 items-center justify-center p-6 text-purple-200">Loading…</main>;

  if (!authed) {
    return (
      <main className="flex flex-1 items-center justify-center p-6">
        <form onSubmit={login} className="w-full max-w-sm rounded-2xl border border-purple-300/25 bg-[#17102b]/90 p-6 shadow-2xl">
          <p className="text-[10px] font-black tracking-[0.35em] text-amber-300">TEACHER ONLY</p>
          <h1 className="font-display mt-1 text-2xl font-black">Admin Dashboard</h1>
          <label className="mt-5 block text-sm font-bold text-purple-100" htmlFor="pw">Password</label>
          <input
            id="pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            className="mt-1.5 w-full rounded-xl border border-white/20 bg-black/40 px-4 py-3 text-white outline-none focus:border-amber-300"
          />
          {loginError && <p role="alert" className="mt-2 text-sm font-bold text-red-300">{loginError}</p>}
          <button type="submit" className="font-display mt-5 w-full rounded-xl bg-gradient-to-b from-amber-300 to-amber-500 px-4 py-3 font-black tracking-wider text-black active:scale-95">
            LOG IN
          </button>
          <p className="mt-4 text-center text-xs text-purple-200/50">Students: head back to the voting page.</p>
        </form>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-black tracking-[0.35em] text-amber-300">TEACHER DASHBOARD</p>
          <h1 className="font-display text-3xl font-black">Waukee SSBU Developer Awards</h1>
        </div>
        <div className="flex gap-2">
          <a href="/present?rehearsal=1" className="rounded-xl border border-white/25 bg-white/5 px-4 py-2.5 text-sm font-bold hover:bg-white/10">🎬 Rehearse Reveal</a>
          <a href="/present" className="font-display rounded-xl bg-gradient-to-b from-amber-300 to-amber-500 px-4 py-2.5 text-sm font-black tracking-wide text-black shadow-[0_0_20px_rgba(245,197,66,0.45)] hover:brightness-110">🏆 Launch Reveal</a>
        </div>
      </div>

      <section className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-purple-300/25 bg-[#17102b]/90 p-5">
          <p className="text-xs font-black tracking-widest text-purple-200/70">BALLOTS SUBMITTED</p>
          <p className="font-display mt-1 text-5xl font-black text-white">{data?.totalBallots ?? 0}</p>
        </div>
        <div className="rounded-2xl border border-purple-300/25 bg-[#17102b]/90 p-5">
          <p className="text-xs font-black tracking-widest text-purple-200/70">VOTING STATUS</p>
          <p className={`font-display mt-1 text-3xl font-black ${data?.votingOpen ? "text-emerald-300" : "text-red-300"}`}>
            {data?.votingOpen ? "● OPEN" : "● CLOSED"}
          </p>
          <div className="mt-3 flex gap-2">
            <button disabled={busy || data?.votingOpen} onClick={() => control("open")} className="rounded-lg bg-emerald-400/90 px-3 py-1.5 text-sm font-black text-black disabled:opacity-30">Open Voting</button>
            <button disabled={busy || !data?.votingOpen} onClick={() => control("close")} className="rounded-lg bg-red-400/90 px-3 py-1.5 text-sm font-black text-black disabled:opacity-30">Close Voting</button>
          </div>
        </div>
        <div className="rounded-2xl border border-red-300/25 bg-[#17102b]/90 p-5">
          <p className="text-xs font-black tracking-widest text-red-200/70">DANGER ZONE</p>
          <p className="mt-1 text-sm text-purple-100/80">For rehearsals &amp; testing only.</p>
          <button disabled={busy} onClick={() => control("reset")} className="mt-3 rounded-lg border border-red-300/60 bg-red-500/15 px-3 py-1.5 text-sm font-black text-red-200 hover:bg-red-500/25 disabled:opacity-30">
            Reset — Delete All Ballots
          </button>
        </div>
      </section>

      <section className="mt-6 grid gap-3 lg:grid-cols-2">
        {CATEGORIES.map((cat) => {
          const ceremony = data ? computeCeremonyResults(data.results, data.totalBallots) : [];
          const result = ceremony.find((r) => r.categoryId === cat.id);
          const entries = GROUPS.map((g) => ({ g, count: result?.counts[g.id] ?? 0 })).sort((a, b) => b.count - a.count);
          const max = Math.max(1, ...entries.map((e) => e.count));
          const isTie = (result?.winners.length ?? 0) > 1;
          return (
            <article key={cat.id} className="rounded-2xl border border-purple-300/25 bg-[#17102b]/90 p-5">
              <header className="flex items-center justify-between gap-2">
                <h2 className="font-display text-lg font-black">{cat.icon} {cat.title}</h2>
                {data && data.totalBallots > 0 && (
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-black tracking-wide ${isTie ? "bg-sky-400/20 text-sky-200" : "bg-amber-300/20 text-amber-200"}`}>
                    {isTie ? `TIE — ${result!.winners.length} CO-WINNERS` : `WINNER: ${groupName(result!.winners[0] ?? "")}`}
                  </span>
                )}
              </header>
              <div className="mt-4 space-y-2">
                {entries.map(({ g, count }) => {
                  const winner = result?.winners.includes(g.id) && data!.totalBallots > 0;
                  return (
                    <div key={g.id} className="flex items-center gap-3">
                      <span className={`w-24 shrink-0 truncate text-sm font-bold ${winner ? "text-amber-200" : "text-purple-100/80"}`}>
                        {winner ? "🏆 " : ""}{g.name}
                      </span>
                      <div className="h-5 flex-1 overflow-hidden rounded-md bg-white/8">
                        <div className={`h-full rounded-md transition-all duration-500 ${winner ? "bg-gradient-to-r from-amber-500 to-amber-300" : "bg-purple-500/60"}`} style={{ width: `${(count / max) * 100}%` }} />
                      </div>
                      <span className="w-8 shrink-0 text-right text-sm font-black text-white">{count}</span>
                    </div>
                  );
                })}
              </div>
              {result && result.passedOver.length > 0 && (
                <p className="mt-3 rounded-lg bg-sky-400/10 px-3 py-2 text-xs font-semibold text-sky-200">
                  Passed over (already won): {result.passedOver.map((p) => `${groupName(p.groupId)} — ${p.count} votes, won ${CATEGORIES.find((c) => c.id === p.wonAwardId)?.shortTitle}`).join(" · ")}. Award goes to the next highest.
                </p>
              )}
            </article>
          );
        })}
      </section>
      <p className="mt-4 text-center text-xs text-purple-200/40">Results on this page are teacher-only. The reveal at 🏆 Launch Reveal shows winners one at a time, only when you advance it.</p>
    </main>
  );
}
