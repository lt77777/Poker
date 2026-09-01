import { describe, expect, it } from 'vitest';
import { computePots } from '../pots';
import type { Player } from '../types';

function p(partial: Partial<Player> & Pick<Player, 'id' | 'totalContributed'>): Player {
  return {
    name: partial.id,
    isHuman: false,
    stack: 0,
    holeCards: [],
    bet: 0,
    status: 'active',
    hasActedThisStreet: true,
    ...partial,
  };
}

describe('side pots', () => {
  it('builds a single main pot when everyone commits the same', () => {
    const pots = computePots([
      p({ id: 'a', totalContributed: 100 }),
      p({ id: 'b', totalContributed: 100 }),
      p({ id: 'c', totalContributed: 100 }),
    ]);
    expect(pots).toEqual([{ amount: 300, eligible: ['a', 'b', 'c'] }]);
  });

  it('creates side pots for uneven all-ins', () => {
    const pots = computePots([
      p({ id: 'short', totalContributed: 50, status: 'allIn' }),
      p({ id: 'mid', totalContributed: 120, status: 'allIn' }),
      p({ id: 'deep', totalContributed: 200, status: 'active' }),
    ]);
    expect(pots).toEqual([
      { amount: 150, eligible: ['short', 'mid', 'deep'] },
      { amount: 140, eligible: ['mid', 'deep'] },
      { amount: 80, eligible: ['deep'] },
    ]);
  });

  it('keeps folded chips in the pot but not eligibility', () => {
    const pots = computePots([
      p({ id: 'a', totalContributed: 100, status: 'folded' }),
      p({ id: 'b', totalContributed: 100 }),
      p({ id: 'c', totalContributed: 100 }),
    ]);
    expect(pots[0]!.amount).toBe(300);
    expect(pots[0]!.eligible).toEqual(['b', 'c']);
  });
});
