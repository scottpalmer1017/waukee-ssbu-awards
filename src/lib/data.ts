export type AwardCategory = {
  id: string;
  title: string;
  shortTitle: string;
  description: string;
  icon: string;
  /**
   * The finale is unrestricted: every group returns and any group may win,
   * even one the voter already picked. Specialty categories before it are
   * exclusive — a group can only receive one specialty pick per ballot.
   */
  isFinale?: boolean;
};

export type ProjectGroup = {
  id: string;
  number: number;
  name: string;
  students: string[];
  description: string;
  /** Null in Stage 1 — teacher uploads the real screenshot in Stage 3 (Supabase Storage). */
  screenshotUrl: string | null;
  /** Distinct placeholder palette so the 7 sample apps are recognisable at a glance. */
  accent: string;
  accentSoft: string;
};

export const EVENT = {
  name: "Waukee SSBU Developer Awards",
  subtitle: "AP Computer Science Principles · Tournament Manager Showcase",
  // Stage 2/3: this comes from Supabase `events.status`, controlled by the teacher.
  votingOpen: true,
} as const;

export const CATEGORIES: AwardCategory[] = [
  {
    id: "most-visually-appealing",
    title: "Most Visually Appealing",
    shortTitle: "Most Visually Appealing",
    description: "The one that looks the best — colors, style, and how polished it feels.",
    icon: "✨",
  },
  {
    id: "easiest-to-use",
    title: "Easiest to Use",
    shortTitle: "Easiest to Use",
    description: "You could run a tournament with it right away — no one has to explain it to you.",
    icon: "🕹️",
  },
  {
    id: "simplest-solution",
    title: "Simplest Solution",
    shortTitle: "Simplest Solution",
    description: "It just solves the problem in a clean, simple way. Nothing extra — it works.",
    icon: "🧩",
  },
  {
    id: "wow-award",
    title: "The WOW Award",
    shortTitle: "The WOW Award",
    description: "The one that shocked you with how cool it was — “Wait, it can do THAT?”",
    icon: "⚡",
  },
  {
    id: "best-overall",
    title: "Best Overall",
    shortTitle: "Best Overall",
    description: "All 7 are back. If we could only pick one app to run our tournament, this is it.",
    icon: "🏆",
    isFinale: true,
  },
];

export const GROUPS: ProjectGroup[] = [
  { id: "group-1", number: 1, name: "Group 1", students: ["Loukya", "Hiran", "Reva"], description: "Tournament manager project by Group 1.", screenshotUrl: null, accent: "#a78bfa", accentSoft: "#2e1065" },
  { id: "group-2", number: 2, name: "Group 2", students: ["Hari", "Kendal", "Gavin"], description: "Tournament manager project by Group 2.", screenshotUrl: null, accent: "#f472b6", accentSoft: "#500724" },
  { id: "group-3", number: 3, name: "Group 3", students: ["Oliver", "Zain", "Sadie"], description: "Tournament manager project by Group 3.", screenshotUrl: null, accent: "#f87171", accentSoft: "#450a0a" },
  { id: "group-4", number: 4, name: "Group 4", students: ["Sunaina", "James", "Ryan"], description: "Tournament manager project by Group 4.", screenshotUrl: null, accent: "#facc15", accentSoft: "#422006" },
  { id: "group-5", number: 5, name: "Group 5", students: ["Aura", "Joy", "Kate"], description: "Tournament manager project by Group 5.", screenshotUrl: null, accent: "#4ade80", accentSoft: "#052e16" },
  { id: "group-6", number: 6, name: "Group 6", students: ["Israel", "Aryan", "Hansitha"], description: "Tournament manager project by Group 6.", screenshotUrl: null, accent: "#2dd4bf", accentSoft: "#042f2e" },
  { id: "group-7", number: 7, name: "Group 7", students: ["Emma", "Curtis", "Bisesh"], description: "Tournament manager project by Group 7.", screenshotUrl: null, accent: "#60a5fa", accentSoft: "#172554" },
];
