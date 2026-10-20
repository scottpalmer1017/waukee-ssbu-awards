import { CATEGORIES } from "./data";

export type RawCategoryResult = {
  categoryId: string;
  counts: Record<string, number>;
  winners: string[];
};

export type CeremonyCategoryResult = {
  categoryId: string;
  counts: Record<string, number>;
  /** Effective winners after the no-repeat-champions rules are applied. */
  winners: string[];
  /** Ineligible groups who out-scored (or tied) the winner — passed over, and why. */
  passedOver: { groupId: string; count: number; wonAwardId: string }[];
  /**
   * groupId -> awardId, for winners of awards PRESENTED BEFORE this one.
   * Safe to show on the nominees screen. The Best Overall winner is never
   * in here for specialty awards — naming them would spoil the finale.
   */
  wonBefore: Record<string, string>;
};

/**
 * Tally priority (not presentation order):
 *
 * 1. BEST OVERALL is decided FIRST from raw votes. Its winner(s) are then
 *    ineligible for every specialty award — those pass to the next-highest
 *    group that hasn't won anything. This happens silently during the show:
 *    the Best Overall champion is never badged or named until the finale.
 * 2. Specialty awards are then decided in presentation order, each also
 *    excluding groups that won an earlier-presented specialty award (those
 *    ARE badged on nominees screens — they've already been revealed).
 *
 * Net effect: five awards, five different winning groups (plus tie
 * co-winners), and the Best Overall winner can never "sweep" the night.
 * Ties among still-eligible groups remain co-winners.
 */
export function computeCeremonyResults(raw: RawCategoryResult[], totalBallots: number): CeremonyCategoryResult[] {
  const countsOf = (categoryId: string): Record<string, number> =>
    raw.find((x) => x.categoryId === categoryId)?.counts ?? {};

  const winnersByCategory = new Map<string, string[]>();
  const passedOverByCategory = new Map<string, CeremonyCategoryResult["passedOver"]>();

  if (totalBallots > 0) {
    // Groups that have won ANYTHING, in tally-priority order.
    const wonAnything = new Map<string, string>(); // groupId -> awardId

    const decide = (categoryId: string, excludeWon: boolean) => {
      const counts = countsOf(categoryId);
      const entries = Object.entries(counts).filter(([groupId]) => !excludeWon || !wonAnything.has(groupId));
      const max = entries.length ? Math.max(...entries.map(([, c]) => c)) : 0;
      const winners = entries.filter(([, c]) => c === max).map(([groupId]) => groupId);
      const passedOver = excludeWon
        ? Object.entries(counts)
            .filter(([groupId, c]) => wonAnything.has(groupId) && c >= max)
            .map(([groupId, c]) => ({ groupId, count: c, wonAwardId: wonAnything.get(groupId)! }))
        : [];
      winnersByCategory.set(categoryId, winners);
      passedOverByCategory.set(categoryId, passedOver);
      for (const w of winners) wonAnything.set(w, categoryId);
    };

    // 1. Best Overall first — raw votes, nobody excluded yet.
    const finale = CATEGORIES.find((c) => c.isFinale);
    if (finale) decide(finale.id, false);

    // 2. Specialty awards in presentation order, Best Overall winner excluded.
    for (const category of CATEGORIES) {
      if (!category.isFinale) decide(category.id, true);
    }
  }

  // Assemble in presentation order, tracking only REVEALED winners for badges.
  const revealedWon = new Map<string, string>(); // groupId -> awardId
  return CATEGORIES.map((category) => {
    const wonBefore: Record<string, string> = Object.fromEntries(revealedWon);
    const result: CeremonyCategoryResult = {
      categoryId: category.id,
      counts: countsOf(category.id),
      winners: winnersByCategory.get(category.id) ?? [],
      passedOver: passedOverByCategory.get(category.id) ?? [],
      wonBefore,
    };
    if (!category.isFinale) {
      for (const w of result.winners) revealedWon.set(w, category.id);
    }
    return result;
  });
}
