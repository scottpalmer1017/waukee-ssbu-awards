import { CATEGORIES } from "./data";

export type RawCategoryResult = {
  categoryId: string;
  counts: Record<string, number>;
  winners: string[];
};

export type CeremonyCategoryResult = {
  categoryId: string;
  counts: Record<string, number>;
  /** Effective winners after removing groups that already won an earlier award. */
  winners: string[];
  /** Ineligible groups who out-scored (or tied) the winner — passed over, and why. */
  passedOver: { groupId: string; count: number; wonAwardId: string }[];
  /** groupId -> awardId it won, for every winner BEFORE this category. */
  wonBefore: Record<string, string>;
};

/**
 * The no-repeat-champions rule: awards are decided in ceremony order.
 * A group that already won an earlier award cannot win again — the award
 * passes to the next-highest vote total among groups that haven't won yet.
 * Ties among still-eligible groups remain co-winners.
 */
export function computeCeremonyResults(raw: RawCategoryResult[], totalBallots: number): CeremonyCategoryResult[] {
  const wonBy = new Map<string, string>(); // groupId -> awardId
  const out: CeremonyCategoryResult[] = [];

  for (const category of CATEGORIES) {
    const r = raw.find((x) => x.categoryId === category.id);
    const counts = r?.counts ?? {};
    const wonBefore: Record<string, string> = Object.fromEntries(wonBy);

    if (totalBallots === 0) {
      out.push({ categoryId: category.id, counts, winners: [], passedOver: [], wonBefore });
      continue;
    }

    // The finale (Best Overall) is exempt: every group is live again,
    // earlier winners included, and nobody is passed over.
    if (category.isFinale) {
      const max = Math.max(...Object.values(counts));
      const winners = Object.entries(counts).filter(([, c]) => c === max).map(([groupId]) => groupId);
      out.push({ categoryId: category.id, counts, winners, passedOver: [], wonBefore });
      continue;
    }

    const eligible = Object.entries(counts).filter(([groupId]) => !wonBy.has(groupId));
    const maxEligible = eligible.length ? Math.max(...eligible.map(([, c]) => c)) : 0;
    const winners = eligible.filter(([, c]) => c === maxEligible).map(([groupId]) => groupId);

    const passedOver = Object.entries(counts)
      .filter(([groupId, c]) => wonBy.has(groupId) && c >= maxEligible)
      .map(([groupId, c]) => ({ groupId, count: c, wonAwardId: wonBy.get(groupId)! }));

    out.push({ categoryId: category.id, counts, winners, passedOver, wonBefore });
    for (const w of winners) wonBy.set(w, category.id);
  }
  return out;
}
