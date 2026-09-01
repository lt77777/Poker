import { createDeck, mulberry32, shuffle, cardToPretty } from './cards';
import { compareScores, evaluateHand } from './hand';
import { computePots, potTotal } from './pots';
import type {
  Action,
  Card,
  GameConfig,
  GameState,
  LegalActions,
  Player,
  WinnerShare,
} from './types';

export const DEFAULT_CONFIG: GameConfig = {
  startingStack: 1000,
  smallBlind: 5,
  bigBlind: 10,
  playerCount: 6,
};

export const BOT_NAMES = ['Apex', 'River', 'Mira', 'Knox', 'Vesper'] as const;

export function cloneState(state: GameState): GameState {
  return structuredClone(state);
}

export function totalChips(state: GameState): number {
  return state.players.reduce((s, p) => s + p.stack + p.totalContributed, 0);
}

function inHand(p: Player): boolean {
  return p.status === 'active' || p.status === 'allIn';
}

function nextWithChips(state: GameState, from: number): number {
  const n = state.players.length;
  for (let i = 1; i <= n; i++) {
    const j = (from + i) % n;
    if (state.players[j]!.stack > 0) return j;
  }
  return from;
}

export function playersWithChips(state: GameState): Player[] {
  return state.players.filter((p) => p.stack > 0);
}

export function createTable(config: Partial<GameConfig> = {}, rngSeed = 1): GameState {
  const cfg: GameConfig = {
    ...DEFAULT_CONFIG,
    ...config,
    playerCount: Math.min(6, Math.max(2, config.playerCount ?? DEFAULT_CONFIG.playerCount)),
  };
  const names = ['You', ...BOT_NAMES.slice(0, cfg.playerCount - 1)];
  const players: Player[] = names.map((name, i) => ({
    id: `p${i}`,
    name,
    isHuman: i === 0,
    stack: cfg.startingStack,
    holeCards: [],
    bet: 0,
    totalContributed: 0,
    status: 'active',
    hasActedThisStreet: false,
  }));
  return {
    players,
    community: [],
    deck: [],
    deckIndex: 0,
    button: 0,
    sbIndex: 0,
    bbIndex: 0,
    street: 'idle',
    currentBet: 0,
    minRaise: cfg.bigBlind,
    toAct: null,
    lastAggressor: null,
    pots: [],
    handNumber: 0,
    winners: [],
    log: [`Table opened · ${cfg.playerCount}-max · stacks ${cfg.startingStack} · blinds ${cfg.smallBlind}/${cfg.bigBlind}`],
    config: cfg,
    rngSeed,
    waitingForNewHand: true,
    gameOver: false,
  };
}

function dealCard(state: GameState): Card {
  const card = state.deck[state.deckIndex];
  if (!card) throw new Error('Deck exhausted');
  state.deckIndex += 1;
  return card;
}

function commit(player: Player, amount: number): number {
  const put = Math.min(amount, player.stack);
  player.stack -= put;
  player.bet += put;
  player.totalContributed += put;
  if (player.stack === 0) player.status = 'allIn';
  return put;
}

export function startHand(state: GameState, opts?: { deck?: Card[] }): GameState {
  const s = cloneState(state);
  const live = s.players.filter((p) => p.stack > 0);
  if (live.length < 2) {
    s.gameOver = true;
    s.waitingForNewHand = true;
    s.toAct = null;
    s.street = 'idle';
    s.log.push('Not enough players with chips to deal.');
    return s;
  }

  s.handNumber += 1;
  s.winners = [];
  s.pots = [];
  s.community = [];
  s.waitingForNewHand = false;
  s.gameOver = false;
  s.lastAggressor = null;

  for (const p of s.players) {
    p.holeCards = [];
    p.bet = 0;
    p.totalContributed = 0;
    p.hasActedThisStreet = false;
    p.status = p.stack > 0 ? 'active' : 'sittingOut';
  }

  // Rotate button among players who still have chips.
  if (s.handNumber === 1) {
    s.button = s.players.findIndex((p) => p.stack > 0);
  } else {
    s.button = nextWithChips(s, s.button);
  }

  const inCount = s.players.filter((p) => p.stack > 0).length;
  if (inCount === 2) {
    s.sbIndex = s.button;
    s.bbIndex = nextWithChips(s, s.button);
  } else {
    s.sbIndex = nextWithChips(s, s.button);
    s.bbIndex = nextWithChips(s, s.sbIndex);
  }

  const rng = mulberry32(s.rngSeed + s.handNumber * 9973);
  s.deck = opts?.deck ? opts.deck.slice() : shuffle(createDeck(), rng);
  s.deckIndex = 0;

  const sbPosted = commit(s.players[s.sbIndex]!, s.config.smallBlind);
  const bbPosted = commit(s.players[s.bbIndex]!, s.config.bigBlind);
  s.log.push(
    `Hand #${s.handNumber} · ${s.players[s.button]!.name} is dealer · ${s.players[s.sbIndex]!.name} posts SB ${sbPosted} · ${s.players[s.bbIndex]!.name} posts BB ${bbPosted}`,
  );

  // Deal two hole cards, starting at SB, clockwise.
  for (let round = 0; round < 2; round++) {
    let i = s.sbIndex;
    for (let n = 0; n < s.players.length; n++) {
      const p = s.players[i]!;
      if (p.status !== 'sittingOut') p.holeCards.push(dealCard(s));
      i = (i + 1) % s.players.length;
    }
  }

  s.street = 'preflop';
  s.currentBet = Math.max(
    ...s.players.map((p) => p.bet),
    0,
  );
  s.minRaise = s.config.bigBlind;
  s.toAct = firstToAct(s);
  if (s.toAct === null) {
    return runOutAndShowdown(s);
  }
  return s;
}

function firstToAct(state: GameState): number | null {
  const from = state.street === 'preflop' ? state.bbIndex : state.button;
  return nextActor(state, from);
}

function nextActor(state: GameState, from: number): number | null {
  const n = state.players.length;
  for (let k = 1; k <= n; k++) {
    const j = (from + k) % n;
    const p = state.players[j]!;
    if (p.status !== 'active') continue;
    if (p.hasActedThisStreet && p.bet >= state.currentBet) continue;
    return j;
  }
  return null;
}

export function getLegalActions(state: GameState, playerIndex?: number): LegalActions {
  const none: LegalActions = {
    canFold: false,
    canCheck: false,
    canCall: false,
    callAmount: 0,
    canRaise: false,
    minRaiseTo: 0,
    maxRaiseTo: 0,
    canAllIn: false,
  };
  const i = playerIndex ?? state.toAct;
  if (i === null) return none;
  const p = state.players[i];
  if (!p || p.status !== 'active') return none;
  if (state.street === 'showdown' || state.street === 'handOver' || state.street === 'idle') {
    return none;
  }

  const toCall = Math.max(0, state.currentBet - p.bet);
  const canCheck = toCall === 0;
  const canCall = toCall > 0 && p.stack > 0;
  const callAmount = Math.min(toCall, p.stack);
  const maxRaiseTo = p.bet + p.stack;
  const minRaiseTo = state.currentBet + state.minRaise;
  // A player who already acted can only call/fold if the last raise was incomplete.
  const canOpenRaise = !p.hasActedThisStreet || p.bet >= state.currentBet;
  const canRaise =
    canOpenRaise && p.stack > toCall && maxRaiseTo > state.currentBet;
  const canAllIn = p.stack > 0 && (canOpenRaise || p.stack <= toCall);

  return {
    canFold: !canCheck,
    canCheck,
    canCall,
    callAmount,
    canRaise: canRaise && maxRaiseTo >= minRaiseTo,
    minRaiseTo: Math.min(minRaiseTo, maxRaiseTo),
    maxRaiseTo,
    canAllIn,
  };
}

export function applyAction(state: GameState, action: Action): GameState {
  const s = cloneState(state);
  if (s.toAct === null) return s;
  const i = s.toAct;
  const p = s.players[i]!;
  const legal = getLegalActions(s, i);

  switch (action.type) {
    case 'fold': {
      if (legal.canCheck) {
        // Folding when you can check is allowed; treat as fold anyway.
      }
      p.status = 'folded';
      p.hasActedThisStreet = true;
      s.log.push(`${p.name} folds`);
      break;
    }
    case 'check': {
      if (!legal.canCheck) throw new Error(`${p.name} cannot check`);
      p.hasActedThisStreet = true;
      s.log.push(`${p.name} checks`);
      break;
    }
    case 'call': {
      if (!legal.canCall) throw new Error(`${p.name} cannot call`);
      const put = commit(p, legal.callAmount);
      p.hasActedThisStreet = true;
      if (p.status === 'allIn') s.log.push(`${p.name} calls ${put} and is all-in`);
      else s.log.push(`${p.name} calls ${put}`);
      break;
    }
    case 'raise': {
      const raiseTo = action.raiseTo ?? legal.minRaiseTo;
      if (!legal.canRaise && !(legal.canAllIn && raiseTo >= legal.maxRaiseTo)) {
        throw new Error(`${p.name} cannot raise`);
      }
      const target = Math.max(legal.minRaiseTo, Math.min(raiseTo, legal.maxRaiseTo));
      applyRaise(s, p, i, target);
      break;
    }
    case 'allin': {
      if (!legal.canAllIn) throw new Error(`${p.name} cannot go all-in`);
      const target = p.bet + p.stack;
      if (target > s.currentBet) {
        applyRaise(s, p, i, target);
      } else {
        const put = commit(p, p.stack);
        p.hasActedThisStreet = true;
        s.log.push(`${p.name} is all-in for ${put}`);
      }
      break;
    }
    default:
      throw new Error('Unknown action');
  }

  const remaining = s.players.filter(inHand);
  if (remaining.length === 1) {
    return awardUncontested(s, remaining[0]!);
  }

  const next = nextActor(s, i);
  if (next === null) {
    return completeStreet(s);
  }
  s.toAct = next;
  return s;
}

function applyRaise(s: GameState, p: Player, index: number, raiseTo: number): void {
  const add = raiseTo - p.bet;
  const put = commit(p, add);
  const raiseSize = p.bet - s.currentBet;
  const isFullRaise = raiseSize >= s.minRaise && p.bet > s.currentBet;
  p.hasActedThisStreet = true;
  if (isFullRaise) {
    s.minRaise = raiseSize;
    for (let k = 0; k < s.players.length; k++) {
      if (k !== index && s.players[k]!.status === 'active') {
        s.players[k]!.hasActedThisStreet = false;
      }
    }
  }
  s.currentBet = Math.max(s.currentBet, p.bet);
  s.lastAggressor = index;
  if (p.status === 'allIn') {
    s.log.push(
      `${p.name} ${isFullRaise ? 'raises' : 'shoves'} to ${p.bet} (${put} more) and is all-in`,
    );
  } else {
    s.log.push(`${p.name} raises to ${p.bet}`);
  }
}

function resetStreetBets(s: GameState): void {
  for (const p of s.players) {
    p.bet = 0;
    p.hasActedThisStreet = false;
  }
  s.currentBet = 0;
  s.minRaise = s.config.bigBlind;
  s.lastAggressor = null;
}

function completeStreet(s: GameState): GameState {
  const stillIn = s.players.filter(inHand);
  if (stillIn.length === 1) return awardUncontested(s, stillIn[0]!);

  if (s.street === 'river') {
    return doShowdown(s);
  }

  const canBet = stillIn.filter((p) => p.status === 'active' && p.stack > 0);
  if (canBet.length <= 1) {
    return runOutAndShowdown(s);
  }
  return dealNextStreet(s);
}

function dealNextStreet(s: GameState): GameState {
  resetStreetBets(s);
  if (s.street === 'preflop') {
    s.community.push(dealCard(s), dealCard(s), dealCard(s));
    s.street = 'flop';
    s.log.push(`Flop: ${s.community.map(cardToPretty).join(' ')}`);
  } else if (s.street === 'flop') {
    s.community.push(dealCard(s));
    s.street = 'turn';
    s.log.push(`Turn: ${cardToPretty(s.community[3]!)}`);
  } else if (s.street === 'turn') {
    s.community.push(dealCard(s));
    s.street = 'river';
    s.log.push(`River: ${cardToPretty(s.community[4]!)}`);
  }
  s.toAct = firstToAct(s);
  if (s.toAct === null) return doShowdown(s);
  return s;
}

function runOutAndShowdown(s: GameState): GameState {
  while (s.community.length < 5) {
    if (s.community.length === 0) {
      s.community.push(dealCard(s), dealCard(s), dealCard(s));
      s.log.push(`Flop: ${s.community.map(cardToPretty).join(' ')}`);
    } else {
      s.community.push(dealCard(s));
      s.log.push(
        `${s.community.length === 4 ? 'Turn' : 'River'}: ${cardToPretty(s.community[s.community.length - 1]!)}`,
      );
    }
  }
  return doShowdown(s);
}

function awardUncontested(s: GameState, winner: Player): GameState {
  s.pots = computePots(s.players);
  const amount = potTotal(s.pots);
  winner.stack += amount;
  s.winners = [{ playerId: winner.id, amount, handName: 'uncontested', potIndex: 0 }];
  s.pots = [];
  for (const p of s.players) {
    p.bet = 0;
    p.totalContributed = 0;
  }
  s.toAct = null;
  s.street = 'handOver';
  s.waitingForNewHand = true;
  s.log.push(`${winner.name} wins ${amount} uncontested`);
  sitOutBroke(s);
  return s;
}

function doShowdown(s: GameState): GameState {
  s.street = 'showdown';
  s.toAct = null;
  s.pots = computePots(s.players);
  const show = s.players.filter(inHand);
  for (const p of show) {
    const result = evaluateHand([...p.holeCards, ...s.community]);
    s.log.push(
      `${p.name} shows ${p.holeCards.map(cardToPretty).join(' ')} — ${result.name}`,
    );
  }

  const winners: WinnerShare[] = [];
  for (let potIndex = 0; potIndex < s.pots.length; potIndex++) {
    const pot = s.pots[potIndex]!;
    if (pot.eligible.length === 0) continue;
    if (pot.eligible.length === 1) {
      const winner = s.players.find((p) => p.id === pot.eligible[0])!;
      winner.stack += pot.amount;
      winners.push({ playerId: winner.id, amount: pot.amount, handName: 'side pot', potIndex });
      s.log.push(`${winner.name} takes ${pot.amount} (uncontested pot)`);
      continue;
    }
    const contenders = pot.eligible
      .map((id) => s.players.find((p) => p.id === id)!)
      .filter((p) => inHand(p));
    const ranked = contenders.map((p) => ({
      player: p,
      result: evaluateHand([...p.holeCards, ...s.community]),
    }));
    ranked.sort((a, b) => compareScores(b.result.score, a.result.score));
    const best = ranked[0]!.result.score;
    const tied = ranked.filter((r) => compareScores(r.result.score, best) === 0);
    const share = Math.floor(pot.amount / tied.length);
    let remainder = pot.amount - share * tied.length;
    // Odd chips go to the first winner clockwise from the button.
    const order = tied
      .map((t) => s.players.findIndex((p) => p.id === t.player.id))
      .sort((a, b) => {
        const da = (a - s.button + s.players.length) % s.players.length;
        const db = (b - s.button + s.players.length) % s.players.length;
        return da - db;
      });
    for (const t of tied) {
      let amt = share;
      const idx = s.players.findIndex((p) => p.id === t.player.id);
      if (remainder > 0 && idx === order[0]) {
        amt += remainder;
        remainder = 0;
      }
      t.player.stack += amt;
      winners.push({
        playerId: t.player.id,
        amount: amt,
        handName: t.result.name,
        potIndex,
      });
      s.log.push(`${t.player.name} wins ${amt} with ${t.result.name}`);
    }
  }

  s.winners = winners;
  s.pots = [];
  for (const p of s.players) {
    p.bet = 0;
    p.totalContributed = 0;
  }
  s.street = 'handOver';
  s.waitingForNewHand = true;
  sitOutBroke(s);
  return s;
}

function sitOutBroke(s: GameState): void {
  for (const p of s.players) {
    if (p.stack <= 0) {
      p.stack = 0;
      p.status = 'sittingOut';
    }
  }
  if (s.players.filter((p) => p.stack > 0).length < 2) {
    s.gameOver = true;
    s.log.push('Game over — not enough stacks left.');
  }
}

export function rebuyHuman(state: GameState): GameState {
  const s = cloneState(state);
  const you = s.players[0]!;
  if (you.stack > 0) return s;
  you.stack = s.config.startingStack;
  you.status = 'sittingOut';
  s.gameOver = s.players.filter((p) => p.stack > 0).length < 2;
  s.log.push(`${you.name} rebuys for ${s.config.startingStack}`);
  s.waitingForNewHand = true;
  return s;
}

export function newTable(config?: Partial<GameConfig>, rngSeed?: number): GameState {
  return createTable(config, rngSeed ?? Math.floor(Math.random() * 1e9));
}

export function livePot(state: GameState): number {
  return state.players.reduce((s, p) => s + p.totalContributed, 0);
}

export function actorName(state: GameState): string | null {
  if (state.toAct === null) return null;
  return state.players[state.toAct]?.name ?? null;
}

export { inHand };
