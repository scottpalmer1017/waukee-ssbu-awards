import { createHash } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { CATEGORIES, GROUPS } from "@/lib/data";

/**
 * Backend selection: when SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are set
 * (Vercel deployment) ballots live in Supabase; otherwise the local JSON file
 * is used (classroom Mac / LAN mode). The API surface never changes.
 * The service-role key is server-only — it never reaches the browser, and all
 * student traffic goes through this origin, so school filters only ever see
 * the app's own domain.
 */
const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const EVENT_ID = process.env.SUPABASE_EVENT_ID ?? "11111111-1111-1111-1111-111111111111";

let supabaseClient: SupabaseClient | null = null;
function supabase(): SupabaseClient | null {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return null;
  if (!supabaseClient) {
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
  }
  return supabaseClient;
}

/**
 * Local/LAN ballot store (JSON file). This is what lets the app run end-to-end
 * today on the classroom server. For the Vercel deployment this is replaced by
 * Supabase — see supabase/migrations — using the exact same validation rules.
 */

export type StoredBallot = {
  id: string;
  deviceTokenHash: string;
  selections: Record<string, string>;
  submittedAt: string;
};

type StoreShape = { votingOpen: boolean; ballots: StoredBallot[]; screenshots?: Record<string, string> };

const STORE_PATH = path.join(process.cwd(), "data", "store.json");

let memoryFallback: StoreShape = { votingOpen: true, ballots: [] };

async function readStore(): Promise<StoreShape> {
  try {
    const raw = await fs.readFile(STORE_PATH, "utf8");
    const parsed = JSON.parse(raw) as StoreShape;
    if (typeof parsed.votingOpen === "boolean" && Array.isArray(parsed.ballots)) return parsed;
  } catch {
    /* file missing/unwritable (e.g. serverless) — use memory */
  }
  return memoryFallback;
}

async function writeStore(store: StoreShape): Promise<void> {
  memoryFallback = store;
  try {
    await fs.mkdir(path.dirname(STORE_PATH), { recursive: true });
    await fs.writeFile(STORE_PATH, JSON.stringify(store, null, 2), "utf8");
  } catch {
    /* memory fallback already updated */
  }
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function getVotingOpen(): Promise<boolean> {
  const db = supabase();
  if (db) {
    const { data } = await db.from("events").select("status").eq("id", EVENT_ID).single();
    return data?.status === "open";
  }
  return (await readStore()).votingOpen;
}

export async function setVotingOpen(open: boolean): Promise<void> {
  const db = supabase();
  if (db) {
    await db.from("events").update({ status: open ? "open" : "closed" }).eq("id", EVENT_ID);
    return;
  }
  const store = await readStore();
  store.votingOpen = open;
  await writeStore(store);
}

/**
 * Group screenshots uploaded by the teacher. Stored as compressed JPEG data
 * URLs (Supabase: groups.screenshot_path; local mode: the JSON store) so no
 * storage bucket setup is needed and student iPads load them from the same
 * school-unblocked domain as the app itself.
 */
export async function getGroupScreenshots(): Promise<Record<string, string>> {
  const db = supabase();
  if (db) {
    const { data } = await db.from("groups").select("id, screenshot_path");
    const out: Record<string, string> = {};
    for (const row of data ?? []) {
      const value = (row as { screenshot_path?: string | null }).screenshot_path;
      if (!value) continue;
      out[(row as { id: string }).id] = value.startsWith("data:image/")
        ? value
        : `${SUPABASE_URL}/storage/v1/object/public/screenshots/${value}`;
    }
    return out;
  }
  return (await readStore()).screenshots ?? {};
}

export async function setGroupScreenshot(groupId: string, imageDataUrl: string | null): Promise<void> {
  const db = supabase();
  if (db) {
    const { error } = await db.from("groups").update({ screenshot_path: imageDataUrl }).eq("id", groupId);
    if (error) throw new Error(error.message);
    return;
  }
  const store = await readStore();
  store.screenshots = store.screenshots ?? {};
  if (imageDataUrl) store.screenshots[groupId] = imageDataUrl;
  else delete store.screenshots[groupId];
  await writeStore(store);
}

export async function resetBallots(): Promise<void> {
  const db = supabase();
  if (db) {
    await db.from("ballots").delete().eq("event_id", EVENT_ID);
    return;
  }
  const store = await readStore();
  store.ballots = [];
  await writeStore(store);
}

/** Validates the whole ballot. Returns an error message, or null when valid. */
export function validateSelections(selections: Record<string, string>): string | null {
  if (!selections || typeof selections !== "object") return "Ballot is missing.";
  const categoryIds = CATEGORIES.map((c) => c.id);
  for (const id of categoryIds) {
    if (!selections[id]) return "Every award needs exactly one pick.";
  }
  if (Object.keys(selections).length !== categoryIds.length) return "Ballot has extra picks.";
  const groupIds = new Set(GROUPS.map((g) => g.id));
  for (const id of categoryIds) {
    if (!groupIds.has(selections[id])) return "That project doesn't exist.";
  }
  const specialtyPicks = CATEGORIES.filter((c) => !c.isFinale).map((c) => selections[c.id]);
  if (new Set(specialtyPicks).size !== specialtyPicks.length) {
    return "Specialty awards each need a different group.";
  }
  return null;
}

export async function submitBallot(
  deviceToken: string,
  selections: Record<string, string>,
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const db = supabase();
  if (db) {
    // Cheap JS-side validation first for friendly errors; the submit_ballot
    // Postgres function re-validates everything atomically in one transaction.
    const validation = validateSelections(selections);
    if (validation) return { ok: false, status: 400, error: validation };
    const { error } = await db.rpc("submit_ballot", {
      p_event_id: EVENT_ID,
      p_device_token_hash: hashToken(deviceToken),
      p_selections: selections,
    });
    if (error) {
      if (error.message.includes("already submitted")) return { ok: false, status: 409, error: "This device already submitted a ballot." };
      if (error.message.includes("not open")) return { ok: false, status: 403, error: "Voting is closed." };
      return { ok: false, status: 400, error: error.message };
    }
    return { ok: true };
  }
  const store = await readStore();
  if (!store.votingOpen) return { ok: false, status: 403, error: "Voting is closed." };
  const error = validateSelections(selections);
  if (error) return { ok: false, status: 400, error };
  const tokenHash = hashToken(deviceToken);
  if (store.ballots.some((b) => b.deviceTokenHash === tokenHash)) {
    return { ok: false, status: 409, error: "This device already submitted a ballot." };
  }
  store.ballots.push({
    id: `${Date.now()}-${store.ballots.length + 1}`,
    deviceTokenHash: tokenHash,
    selections,
    submittedAt: new Date().toISOString(),
  });
  await writeStore(store);
  return { ok: true };
}

export type CategoryResult = {
  categoryId: string;
  counts: Record<string, number>;
  winners: string[]; // group ids — more than one means a tie (co-winners)
};

export async function getResults(): Promise<{ votingOpen: boolean; totalBallots: number; results: CategoryResult[] }> {
  const db = supabase();
  if (db) {
    const [{ count: ballotCount }, { data: selectionRows }] = await Promise.all([
      db.from("ballots").select("*", { count: "exact", head: true }).eq("event_id", EVENT_ID),
      db.from("ballot_selections").select("category_id, group_id"),
    ]);
    const totalBallots = ballotCount ?? 0;
    const countsByCategory = new Map<string, Record<string, number>>();
    for (const row of selectionRows ?? []) {
      const counts = countsByCategory.get(row.category_id as string) ?? Object.fromEntries(GROUPS.map((g) => [g.id, 0]));
      if (row.group_id in counts) counts[row.group_id as string] += 1;
      countsByCategory.set(row.category_id as string, counts);
    }
    const results: CategoryResult[] = CATEGORIES.map((c) => {
      const counts = countsByCategory.get(c.id) ?? Object.fromEntries(GROUPS.map((g) => [g.id, 0]));
      const max = Math.max(...Object.values(counts));
      const winners = totalBallots === 0 ? [] : GROUPS.filter((g) => counts[g.id] === max).map((g) => g.id);
      return { categoryId: c.id, counts, winners };
    });
    return { votingOpen: await getVotingOpen(), totalBallots, results };
  }
  const store = await readStore();
  const results: CategoryResult[] = CATEGORIES.map((c) => {
    const counts: Record<string, number> = Object.fromEntries(GROUPS.map((g) => [g.id, 0]));
    for (const ballot of store.ballots) {
      const pick = ballot.selections[c.id];
      if (pick && pick in counts) counts[pick] += 1;
    }
    const max = Math.max(...Object.values(counts));
    const winners = store.ballots.length === 0 ? [] : GROUPS.filter((g) => counts[g.id] === max).map((g) => g.id);
    return { categoryId: c.id, counts, winners };
  });
  return { votingOpen: store.votingOpen, totalBallots: store.ballots.length, results };
}
