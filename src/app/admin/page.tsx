"use client";

import { useCallback, useEffect, useState } from "react";
import { CATEGORIES, GROUPS, type ProjectGroup } from "@/lib/data";
import { computeCeremonyResults } from "@/lib/results";
import { apiPath } from "@/lib/basePath";
import PlaceholderScreenshot from "@/components/PlaceholderScreenshot";

/** Shrink an uploaded screenshot so it loads fast on school Wi-Fi. */
async function compressImage(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const maxWidth = 1280;
  const scale = Math.min(1, maxWidth / bitmap.width);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Image processing not supported in this browser.");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.78);
}

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
  const [groups, setGroups] = useState<ProjectGroup[]>(GROUPS);
  const [uploadState, setUploadState] = useState<Record<string, string>>({});

  const loadGroups = useCallback(async () => {
    try {
      const r = await fetch(apiPath("/api/groups"), { cache: "no-store" });
      if (r.ok) {
        const d = (await r.json()) as { groups?: ProjectGroup[] };
        if (Array.isArray(d.groups) && d.groups.length) setGroups(d.groups);
      }
    } catch { /* keep placeholders */ }
  }, []);

  useEffect(() => { loadGroups(); }, [loadGroups]);

  async function uploadScreenshot(group: ProjectGroup, file: File | null) {
    if (!file) return;
    setUploadState((s) => ({ ...s, [group.id]: "Uploading…" }));
    try {
      const imageDataUrl = await compressImage(file);
      const r = await fetch(apiPath("/api/admin/screenshot"), {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId: group.id, imageDataUrl }),
      });
      if (!r.ok) {
        const d = (await r.json().catch(() => ({}))) as { error?: string };
        throw new Error(d.error ?? "Upload failed.");
      }
      await loadGroups();
      setUploadState((s) => ({ ...s, [group.id]: "Saved ✓ Students see it now." }));
    } catch (e) {
      setUploadState((s) => ({ ...s, [group.id]: e instanceof Error ? e.message : "Upload failed." }));
    }
  }

  async function removeScreenshot(group: ProjectGroup) {
    setUploadState((s) => ({ ...s, [group.id]: "Removing…" }));
    await fetch(apiPath("/api/admin/screenshot"), {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groupId: group.id, imageDataUrl: null }),
    });
    await loadGroups();
    setUploadState((s) => ({ ...s, [group.id]: "Removed." }));
  }

  const load = useCallback(async () => {
    const r = await fetch(apiPath("/api/admin/state"), { cache: "no-store" });
    if (r.status === 401) { setAuthed(false); return; }
    if (r.ok) { setAuthed(true); setData(await r.json()); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!authed) return;
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [authed, load]);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setLoginError(null);
    const r = await fetch(apiPath("/api/admin/login"), {
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
    await fetch(apiPath("/api/admin/control"), {
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
          <a href={apiPath("/present?rehearsal=1")} className="rounded-xl border border-white/25 bg-white/5 px-4 py-2.5 text-sm font-bold hover:bg-white/10">🎬 Rehearse Reveal</a>
          <a href={apiPath("/present")} className="font-display rounded-xl bg-gradient-to-b from-amber-300 to-amber-500 px-4 py-2.5 text-sm font-black tracking-wide text-black shadow-[0_0_20px_rgba(245,197,66,0.45)] hover:brightness-110">🏆 Launch Reveal</a>
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

      <section className="mt-6">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="font-display text-2xl font-black">📸 Group Screenshots</h2>
            <p className="mt-0.5 text-sm text-purple-200/70">One spot per group. Upload each team&apos;s app screenshot — students see it on their voting cards right away.</p>
          </div>
          <p className="text-sm font-bold text-purple-100/80">{groups.filter((g) => g.screenshotUrl).length} of {groups.length} uploaded</p>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {groups.map((g) => (
            <article key={g.id} className="overflow-hidden rounded-2xl border border-purple-300/25 bg-[#17102b]/90">
              <div className="relative aspect-video w-full overflow-hidden bg-black">
                {g.screenshotUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={g.screenshotUrl} alt={`Screenshot for ${g.name}`} className="h-full w-full object-cover" />
                ) : (
                  <PlaceholderScreenshot group={g} />
                )}
                <span className="absolute left-2 top-2 rounded-md bg-black/70 px-2 py-0.5 text-[11px] font-black tracking-widest text-amber-300">GROUP {g.number}</span>
                {g.screenshotUrl && <span className="absolute right-2 top-2 rounded-full bg-emerald-400 px-2 py-0.5 text-[11px] font-black text-black">✓ LIVE</span>}
              </div>
              <div className="p-3">
                <p className="font-extrabold text-white">{g.name} <span className="block truncate text-xs font-semibold text-purple-200/70">{g.students.join(" · ")}</span></p>
                <div className="mt-2.5 flex items-center gap-2">
                  <label className="font-display flex-1 cursor-pointer rounded-lg bg-gradient-to-b from-amber-300 to-amber-500 px-3 py-2 text-center text-sm font-black text-black transition hover:brightness-110 active:scale-95">
                    {g.screenshotUrl ? "Replace Screenshot" : "Upload Screenshot"}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => { void uploadScreenshot(g, e.target.files?.[0] ?? null); e.target.value = ""; }}
                    />
                  </label>
                  {g.screenshotUrl && (
                    <button type="button" onClick={() => void removeScreenshot(g)} className="rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm font-bold text-white/85 hover:bg-white/10">
                      Remove
                    </button>
                  )}
                </div>
                {uploadState[g.id] && <p className="mt-2 text-xs font-semibold text-purple-100/80">{uploadState[g.id]}</p>}
              </div>
            </article>
          ))}
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
      <p className="mt-4 text-center text-xs text-purple-200/40">
        Tally priority: <span className="font-bold text-amber-200/80">Best Overall is decided first</span> — its winner is
        silently ineligible for the specialty awards (each passes to the next highest), so nobody sweeps all five.
        Results on this page are teacher-only; the reveal shows winners one at a time, only when you advance it.
      </p>
    </main>
  );
}
