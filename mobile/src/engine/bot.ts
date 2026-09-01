import { mulberry32 } from './cards';
import { applyAction, getLegalActions } from './game';
import { drawHints, evaluateHand } from './hand';
import type { Action, Card, GameState, Player } from './types';

export type BotStyle = 'tag' | 'lag' | 'tp' | 'lp' | 'balanced';

export const BOT_STYLE: Record<string, BotStyle> = {
  Apex: 'tag',
  River: 'lag',
  Mira: 'tp',
  Knox: 'lp',
  Vesper: 'balanced',
};

function styleOf(player: Player): BotStyle {
  return BOT_STYLE[player.name] ?? 'balanced';
}

/** 0..1 hole-card strength. Pair of aces ≈ 1, junk offsuit ≈ 0.05. */
export function holeStrength(cards: Card[]): number {
  if (cards.length < 2) return 0;
  const [a, b] = [...cards].sort((x, y) => y.rank - x.rank);
  const hi = a!.rank;
  const lo = b!.rank;
  const pair = hi === lo;
  const suited = a!.suit === b!.suit;
  const gap = hi - lo;
  if (pair) return 0.52 + (hi / 14) * 0.48;
  let s = (hi / 14) * 0.42 + (lo / 14) * 0.18;
  if (suited) s += 0.09;
  if (gap === 1) s += 0.09;
  else if (gap === 2) s += 0.04;
  else s -= Math.min(0.2, (gap - 2) * 0.025);
  if (hi === 14) s += 0.1;
  if (hi === 13 && lo >= 10) s += 0.05;
  return Math.max(0.02, Math.min(1, s));
}

function madeScore(player: Player, community: Card[]): number {
  const cards = [...player.holeCards, ...community];
  if (cards.length < 5) return holeStrength(player.holeCards);
  const cat = evaluateHand(cards).score[0] ?? 0;
  return Math.min(1, cat / 8);
}

function thresholds(style: BotStyle): { open: number; call: number; raise: number; bluff: number } {
  switch (style) {
    case 'tag':
      return { open: 0.58, call: 0.5, raise: 0.72, bluff: 0.08 };
    case 'lag':
      return { open: 0.42, call: 0.36, raise: 0.58, bluff: 0.16 };
    case 'tp':
      return { open: 0.66, call: 0.55, raise: 0.82, bluff: 0.03 };
    case 'lp':
      return { open: 0.38, call: 0.28, raise: 0.78, bluff: 0.05 };
    default:
      return { open: 0.52, call: 0.44, raise: 0.68, bluff: 0.1 };
  }
}

export function chooseBotAction(state: GameState, playerId?: string): Action {
  const idx = playerId
    ? state.players.findIndex((p) => p.id === playerId)
    : state.toAct;
  if (idx === null || idx < 0) return { type: 'check' };
  const p = state.players[idx]!;
  const legal = getLegalActions(state, idx);
  const rng = mulberry32(state.rngSeed + state.handNumber * 131 + idx * 17 + state.deckIndex * 3);
  const roll = rng();
  const style = styleOf(p);
  const t = thresholds(style);

  let strength = madeScore(p, state.community);
  if (state.community.length >= 3) {
    const draws = drawHints([...p.holeCards, ...state.community]);
    if (draws.flushDraw) strength = Math.max(strength, 0.48);
    if (draws.openEnded) strength = Math.max(strength, 0.44);
    if (draws.gutshot) strength = Math.max(strength, 0.32);
  }

  const toCall = legal.callAmount;
  const pot = state.players.reduce((s, x) => s + x.totalContributed, 0);
  const price = pot > 0 ? toCall / (pot + toCall) : 1;

  const wantBluff = roll < t.bluff && strength < 0.3;

  if (legal.canCheck) {
    if ((strength >= t.open || wantBluff) && legal.canRaise) {
      return sizedRaise(legal.minRaiseTo, legal.maxRaiseTo, pot, rng, 0.55);
    }
    if (strength >= t.raise && legal.canAllIn && !legal.canRaise) {
      return { type: 'allin' };
    }
    return { type: 'check' };
  }

  if (strength >= t.raise || (wantBluff && strength > 0.15)) {
    if (legal.canRaise) {
      return sizedRaise(legal.minRaiseTo, legal.maxRaiseTo, pot, rng, 0.7);
    }
    if (legal.canAllIn) return { type: 'allin' };
    if (legal.canCall) return { type: 'call' };
  }

  const callOk = strength >= t.call - (price > 0.35 ? 0.1 : 0) || (price < 0.2 && strength > 0.22);
  if (callOk && legal.canCall) {
    if (toCall >= p.stack * 0.65 && strength < t.raise) {
      if (legal.canFold) return { type: 'fold' };
    }
    return { type: 'call' };
  }

  if (legal.canCheck) return { type: 'check' };
  if (legal.canFold) return { type: 'fold' };
  if (legal.canCall) return { type: 'call' };
  if (legal.canAllIn) return { type: 'allin' };
  return { type: 'check' };
}

function sizedRaise(
  minTo: number,
  maxTo: number,
  pot: number,
  rng: () => number,
  aggress: number,
): Action {
  const potRaise = Math.floor(minTo + pot * (0.5 + rng() * 0.7 * aggress));
  const raiseTo = Math.max(minTo, Math.min(maxTo, potRaise));
  if (raiseTo >= maxTo && rng() < 0.25) return { type: 'allin' };
  return { type: 'raise', raiseTo };
}

/** Play a whole hand with bots (and optional human auto-pilot) for tests. */
export function playOutHand(state: GameState, maxActions = 200): GameState {
  let s = state;
  let n = 0;
  while (!s.waitingForNewHand && s.toAct !== null && n++ < maxActions) {
    const action = chooseBotAction(s);
    s = applyAction(s, action);
  }
  return s;
}
