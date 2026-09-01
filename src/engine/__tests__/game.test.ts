import { describe, expect, it } from 'vitest';
import { createDeck, parseCards } from '../cards';
import { playOutHand } from '../bot';
import {
  applyAction,
  createTable,
  livePot,
  startHand,
  totalChips,
} from '../game';
import { evaluateHand } from '../hand';
import type { Card, GameState } from '../types';

function buildDeck(front: Card[]): Card[] {
  const used = new Set(front.map((c) => `${c.rank}${c.suit}`));
  const rest = createDeck().filter((c) => !used.has(`${c.rank}${c.suit}`));
  return [...front, ...rest];
}

describe('scripted showdown', () => {
  it('plays a 3-handed hand to showdown with a known winner', () => {
    // 3-max, first hand: button = p0, SB = p1, BB = p2.
    // Deal order starts at SB: p1, p2, p0, p1, p2, p0
    // Give p0 (button) pocket aces, p1 kings, p2 junk.
    // Board: 2s 7h 9d Jc 4c — aces win.
    const deck = buildDeck(
      parseCards(
        [
          'Kh', // p1
          '2c', // p2
          'As', // p0
          'Kd', // p1
          '3c', // p2
          'Ad', // p0
          '2s',
          '7h',
          '9d', // flop
          'Jc', // turn
          '4c', // river
        ].join(' '),
      ),
    );

    let s = createTable({ playerCount: 3, startingStack: 200, smallBlind: 5, bigBlind: 10 }, 99);
    s = startHand(s, { deck });
    expect(s.players[0]!.holeCards.map((c) => `${c.rank}${c.suit}`)).toEqual(['14s', '14d']);

    // p0 raises, p1 calls, p2 folds. Then check it down.
    s = applyAction(s, { type: 'raise', raiseTo: 30 });
    s = applyAction(s, { type: 'call' });
    s = applyAction(s, { type: 'fold' });
    expect(s.street).toBe('flop');
    expect(s.players.filter((p) => p.status !== 'folded' && p.status !== 'sittingOut').length).toBe(2);

    s = applyAction(s, { type: 'check' });
    s = applyAction(s, { type: 'check' });
    expect(s.street).toBe('turn');
    s = applyAction(s, { type: 'check' });
    s = applyAction(s, { type: 'check' });
    expect(s.street).toBe('river');
    s = applyAction(s, { type: 'check' });
    s = applyAction(s, { type: 'check' });

    expect(s.street).toBe('handOver');
    const youWon = s.winners.filter((w) => w.playerId === 'p0');
    const youAmount = youWon.reduce((n, w) => n + w.amount, 0);
    expect(youAmount).toBeGreaterThan(0);
    expect(s.players[0]!.stack).toBeGreaterThan(200);
    expect(s.winners[0]!.handName).toMatch(/Pair of Aces/);
    expect(s.players.reduce((n, p) => n + p.stack, 0)).toBe(600);
  });

  it('awards a side pot correctly when short stack is all-in', () => {
    // p2 short 40. Everyone all-in, p0 wins both pots with aces.
    const deck = buildDeck(
      parseCards('Kh 2c As Kd 3c Ad 9s 9h 2d Jc 4c'),
    );
    let s = createTable({ playerCount: 3, startingStack: 200, smallBlind: 5, bigBlind: 10 }, 4);
    s.players[2]!.stack = 40;
    s = startHand(s, { deck });
    s = applyAction(s, { type: 'allin' });
    s = applyAction(s, { type: 'allin' });
    // BB (p2) may already be done if short, or still to act.
    while (!s.waitingForNewHand && s.toAct !== null) {
      const actor = s.players[s.toAct]!;
      s = applyAction(s, actor.stack > 0 && s.currentBet > actor.bet ? { type: 'allin' } : { type: 'check' });
    }
    expect(s.waitingForNewHand).toBe(true);
    const sum = s.players.reduce((n, p) => n + p.stack, 0);
    expect(sum).toBe(440);
    expect(s.players[0]!.stack).toBeGreaterThan(s.players[1]!.stack);
  });
});

describe('chip conservation', () => {
  it('keeps chips constant across many bot-played hands', () => {
    let s = createTable({ playerCount: 6, startingStack: 1000, smallBlind: 5, bigBlind: 10 }, 42);
    const expected = totalChips(s);
    s = startHand(s);
    for (let i = 0; i < 80; i++) {
      if (s.gameOver) break;
      if (s.waitingForNewHand) {
        s = startHand(s);
        expect(totalChips(s)).toBe(expected);
        continue;
      }
      s = playOutHand(s);
      expect(totalChips(s)).toBe(expected);
    }
    expect(s.handNumber).toBeGreaterThan(5);
  });
});

describe('invariants', () => {
  it('never deals duplicate cards in a hand', () => {
    let s = startHand(createTable({ playerCount: 6 }, 123));
    const seen = new Set<string>();
    const take = (cards: { rank: number; suit: string }[]) => {
      for (const c of cards) {
        const k = `${c.rank}${c.suit}`;
        expect(seen.has(k)).toBe(false);
        seen.add(k);
      }
    };
    for (const p of s.players) take(p.holeCards);
    s = playOutHand(s);
    take(s.community);
  });

  it('evaluateHand matches the scripted board winner', () => {
    const board = parseCards('2s 7h 9d Jc 4c');
    const aces = evaluateHand([...parseCards('As Ad'), ...board]);
    const kings = evaluateHand([...parseCards('Kh Kd'), ...board]);
    expect(aces.score[0]).toBe(1);
    expect(kings.score[0]).toBe(1);
    expect(aces.score[1]).toBeGreaterThan(kings.score[1]!);
  });
});

describe('live pot', () => {
  it('tracks blinds in the pot after the deal', () => {
    const s = startHand(createTable({ playerCount: 4 }, 1));
    expect(livePot(s)).toBe(15);
  });
});
