import type { Player, Pot } from './types';

/**
 * Build main + side pots from total contributions this hand.
 * Folded players' chips stay in the pot but they are not eligible to win.
 */
export function computePots(players: Player[]): Pot[] {
  const contrib = players
    .map((p) => ({
      id: p.id,
      amount: p.totalContributed,
      folded: p.status === 'folded' || p.status === 'sittingOut',
    }))
    .filter((c) => c.amount > 0);

  if (contrib.length === 0) return [];

  const levels = [...new Set(contrib.map((c) => c.amount))].sort((a, b) => a - b);
  const raw: Pot[] = [];
  let prev = 0;
  for (const level of levels) {
    const involved = contrib.filter((c) => c.amount >= level);
    const amount = (level - prev) * involved.length;
    const eligible = involved.filter((c) => !c.folded).map((c) => c.id);
    if (amount > 0) {
      raw.push({ amount, eligible });
    }
    prev = level;
  }

  // Merge consecutive pots with identical eligible sets.
  const merged: Pot[] = [];
  for (const pot of raw) {
    const last = merged[merged.length - 1];
    if (last && sameIds(last.eligible, pot.eligible)) {
      last.amount += pot.amount;
    } else {
      merged.push({ amount: pot.amount, eligible: pot.eligible.slice() });
    }
  }
  return merged;
}

function sameIds(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sb = new Set(b);
  return a.every((id) => sb.has(id));
}

export function potTotal(pots: Pot[]): number {
  return pots.reduce((sum, p) => sum + p.amount, 0);
}
