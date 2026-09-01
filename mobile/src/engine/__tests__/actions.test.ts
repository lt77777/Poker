import { describe, expect, it } from 'vitest';
import { applyAction, createTable, getLegalActions, startHand } from '../game';
import { parseCards } from '../cards';
import type { GameState } from '../types';

function threeMax(seed = 7): GameState {
  return createTable({ playerCount: 3, startingStack: 1000, smallBlind: 5, bigBlind: 10 }, seed);
}

describe('legal actions', () => {
  it('preflop first actor can fold, call BB, or raise at least 2x', () => {
    let s = startHand(threeMax());
    const legal = getLegalActions(s);
    expect(legal.canCheck).toBe(false);
    expect(legal.canFold).toBe(true);
    expect(legal.canCall).toBe(true);
    expect(legal.callAmount).toBe(10);
    expect(legal.canRaise).toBe(true);
    expect(legal.minRaiseTo).toBe(20);
    expect(legal.maxRaiseTo).toBe(1000);
  });

  it('check is available when facing no bet postflop', () => {
    let s = startHand(threeMax(11));
    s = applyAction(s, { type: 'call' });
    s = applyAction(s, { type: 'call' });
    s = applyAction(s, { type: 'check' });
    expect(s.street).toBe('flop');
    const legal = getLegalActions(s);
    expect(legal.canCheck).toBe(true);
    expect(legal.canFold).toBe(false);
    expect(legal.canRaise).toBe(true);
    expect(legal.minRaiseTo).toBe(10);
  });

  it('min-raise after an open to 30 is 50', () => {
    let s = startHand(threeMax(3));
    s = applyAction(s, { type: 'raise', raiseTo: 30 });
    const legal = getLegalActions(s);
    expect(legal.callAmount).toBe(25);
    expect(legal.minRaiseTo).toBe(50);
  });

  it('incomplete all-in does not reopen raising for players who already acted', () => {
    let s = createTable({ playerCount: 3, startingStack: 1000, smallBlind: 5, bigBlind: 10 }, 1);
    s.players[2]!.stack = 25;
    s = startHand(s, {});
    s = createTable({ playerCount: 3, startingStack: 200, smallBlind: 5, bigBlind: 10 }, 2);
    s.players[1]!.stack = 35;
    s = startHand(s);
    s = applyAction(s, { type: 'raise', raiseTo: 40 });
    s = applyAction(s, { type: 'allin' });
    const bbLegal = getLegalActions(s);
    expect(bbLegal.canCall || bbLegal.canFold).toBe(true);
    expect(bbLegal.canRaise).toBe(true);
  });
});

describe('scripted fold-out', () => {
  it('awards the pot to BB when everyone folds', () => {
    let s = startHand(threeMax(5));
    const startTotal = 3000;
    s = applyAction(s, { type: 'fold' });
    s = applyAction(s, { type: 'fold' });
    expect(s.street).toBe('handOver');
    expect(s.winners).toHaveLength(1);
    expect(s.winners[0]!.handName).toBe('uncontested');
    const stacks = s.players.reduce((n, p) => n + p.stack, 0);
    expect(stacks).toBe(startTotal);
  });
});
