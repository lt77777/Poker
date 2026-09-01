import { RANK_NAME } from './cards';
import type { Card, Rank } from './types';

export type HandCategory =
  | 'high-card'
  | 'pair'
  | 'two-pair'
  | 'three-of-a-kind'
  | 'straight'
  | 'flush'
  | 'full-house'
  | 'four-of-a-kind'
  | 'straight-flush'
  | 'royal-flush';

export const CATEGORY_VALUE: Record<HandCategory, number> = {
  'high-card': 0,
  pair: 1,
  'two-pair': 2,
  'three-of-a-kind': 3,
  straight: 4,
  flush: 5,
  'full-house': 6,
  'four-of-a-kind': 7,
  'straight-flush': 8,
  'royal-flush': 9,
};

export interface HandResult {
  category: HandCategory;
  score: number[];
  bestFive: Card[];
  name: string;
}

function combinations5(cards: Card[]): Card[][] {
  const n = cards.length;
  if (n < 5) return [];
  if (n === 5) return [cards.slice()];
  const out: Card[][] = [];
  for (let a = 0; a < n - 4; a++) {
    for (let b = a + 1; b < n - 3; b++) {
      for (let c = b + 1; c < n - 2; c++) {
        for (let d = c + 1; d < n - 1; d++) {
          for (let e = d + 1; e < n; e++) {
            out.push([cards[a]!, cards[b]!, cards[c]!, cards[d]!, cards[e]!]);
          }
        }
      }
    }
  }
  return out;
}

/** Highest card of a 5-card straight, or null. Wheel (A-2-3-4-5) returns 5. */
function straightHigh(ranksDesc: number[]): number | null {
  const uniq = [...new Set(ranksDesc)].sort((a, b) => b - a);
  if (uniq.length !== 5) return null;
  if (uniq[0] === 14 && uniq[1] === 5 && uniq[2] === 4 && uniq[3] === 3 && uniq[4] === 2) {
    return 5;
  }
  if (uniq[0]! - uniq[4]! === 4) return uniq[0]!;
  return null;
}

function plural(rank: Rank): string {
  if (rank === 6) return 'Sixes';
  return `${RANK_NAME[rank]}s`;
}

function evaluate5(cards: Card[]): HandResult {
  const sorted = [...cards].sort((a, b) => b.rank - a.rank || a.suit.localeCompare(b.suit));
  const ranks = sorted.map((c) => c.rank);
  const flush = sorted.every((c) => c.suit === sorted[0]!.suit);
  const sHigh = straightHigh(ranks);

  const counts = new Map<number, number>();
  for (const r of ranks) counts.set(r, (counts.get(r) ?? 0) + 1);
  const groups = [...counts.entries()].sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1];
    return b[0] - a[0];
  });

  let category: HandCategory;
  let score: number[];
  let name: string;
  let bestFive = sorted;

  if (flush && sHigh !== null) {
    if (sHigh === 14) {
      category = 'royal-flush';
      score = [9, 14];
      name = 'Royal Flush';
    } else {
      category = 'straight-flush';
      score = [8, sHigh];
      name = `Straight Flush, ${RANK_NAME[sHigh as Rank]} high`;
    }
    if (sHigh === 5) {
      bestFive = [...sorted.filter((c) => c.rank !== 14), sorted.find((c) => c.rank === 14)!];
    }
  } else if (groups[0]![1] === 4) {
    category = 'four-of-a-kind';
    const quad = groups[0]![0] as Rank;
    const kick = groups[1]![0] as Rank;
    score = [7, quad, kick];
    name = `Four ${plural(quad)}`;
  } else if (groups[0]![1] === 3 && groups[1]![1] === 2) {
    category = 'full-house';
    const trips = groups[0]![0] as Rank;
    const pair = groups[1]![0] as Rank;
    score = [6, trips, pair];
    name = `Full House, ${plural(trips)} full of ${plural(pair)}`;
  } else if (flush) {
    category = 'flush';
    score = [5, ...ranks];
    name = `Flush, ${RANK_NAME[ranks[0]! as Rank]} high`;
  } else if (sHigh !== null) {
    category = 'straight';
    score = [4, sHigh];
    name = `Straight, ${RANK_NAME[sHigh as Rank]} high`;
    if (sHigh === 5) {
      bestFive = [...sorted.filter((c) => c.rank !== 14), sorted.find((c) => c.rank === 14)!];
    }
  } else if (groups[0]![1] === 3) {
    category = 'three-of-a-kind';
    const trips = groups[0]![0] as Rank;
    const kickers = groups.slice(1).map((g) => g[0]);
    score = [3, trips, ...kickers];
    name = `Three ${plural(trips)}`;
  } else if (groups[0]![1] === 2 && groups[1]?.[1] === 2) {
    category = 'two-pair';
    const hi = groups[0]![0] as Rank;
    const lo = groups[1]![0] as Rank;
    const kick = groups[2]![0] as Rank;
    score = [2, hi, lo, kick];
    name = `Two Pair, ${plural(hi)} and ${plural(lo)}`;
  } else if (groups[0]![1] === 2) {
    category = 'pair';
    const pair = groups[0]![0] as Rank;
    const kickers = groups.slice(1).map((g) => g[0]);
    score = [1, pair, ...kickers];
    name = `Pair of ${plural(pair)}`;
  } else {
    category = 'high-card';
    score = [0, ...ranks];
    name = `${RANK_NAME[ranks[0]! as Rank]} high`;
  }

  return { category, score, bestFive, name };
}

export function compareScores(a: number[], b: number[]): number {
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) {
    const d = (a[i] ?? 0) - (b[i] ?? 0);
    if (d) return d;
  }
  return 0;
}

/** Best 5-card poker hand from 5–7 cards. */
export function evaluateHand(cards: Card[]): HandResult {
  if (cards.length < 5) {
    throw new Error(`Need at least 5 cards, got ${cards.length}`);
  }
  if (cards.length === 5) return evaluate5(cards);
  let best: HandResult | null = null;
  for (const combo of combinations5(cards)) {
    const result = evaluate5(combo);
    if (!best || compareScores(result.score, best.score) > 0) {
      best = result;
    }
  }
  return best!;
}

export function compareHands(a: Card[], b: Card[]): number {
  return compareScores(evaluateHand(a).score, evaluateHand(b).score);
}

export function categoryLabel(category: HandCategory): string {
  switch (category) {
    case 'high-card':
      return 'High Card';
    case 'pair':
      return 'Pair';
    case 'two-pair':
      return 'Two Pair';
    case 'three-of-a-kind':
      return 'Three of a Kind';
    case 'straight':
      return 'Straight';
    case 'flush':
      return 'Flush';
    case 'full-house':
      return 'Full House';
    case 'four-of-a-kind':
      return 'Four of a Kind';
    case 'straight-flush':
      return 'Straight Flush';
    case 'royal-flush':
      return 'Royal Flush';
  }
}

/** Flush / straight draw hints from 4–7 cards (used by bots). */
export function drawHints(cards: Card[]): { flushDraw: boolean; openEnded: boolean; gutshot: boolean } {
  const suitCounts: Record<string, number> = { s: 0, h: 0, d: 0, c: 0 };
  for (const c of cards) suitCounts[c.suit] = (suitCounts[c.suit] ?? 0) + 1;
  const flushDraw = Object.values(suitCounts).some((n) => n === 4);

  const ranks = [...new Set(cards.map((c) => c.rank))].sort((a, b) => a - b);
  let openEnded = false;
  let gutshot = false;
  const expanded = ranks.includes(14) ? [1, ...ranks] : ranks;
  for (let i = 0; i < expanded.length; i++) {
    for (let j = i + 1; j < expanded.length; j++) {
      const window = expanded.slice(i, j + 1);
      const span = window[window.length - 1]! - window[0]!;
      if (window.length === 4 && span === 3) openEnded = true;
      if (window.length === 4 && span === 4) gutshot = true;
      if (window.length === 3 && span === 4) gutshot = true;
    }
  }
  return { flushDraw, openEnded, gutshot: gutshot && !openEnded };
}
