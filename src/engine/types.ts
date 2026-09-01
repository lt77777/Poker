export type Suit = 's' | 'h' | 'd' | 'c';
export type Rank = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14;

export interface Card {
  rank: Rank;
  suit: Suit;
}

export type Street =
  | 'idle'
  | 'preflop'
  | 'flop'
  | 'turn'
  | 'river'
  | 'showdown'
  | 'handOver';

export type PlayerStatus = 'active' | 'folded' | 'allIn' | 'sittingOut';

export interface Player {
  id: string;
  name: string;
  isHuman: boolean;
  stack: number;
  holeCards: Card[];
  /** Chips committed on the current street. */
  bet: number;
  /** Chips committed across the whole hand (for side pots). */
  totalContributed: number;
  status: PlayerStatus;
  hasActedThisStreet: boolean;
}

export interface Pot {
  amount: number;
  eligible: string[];
}

export type ActionType = 'fold' | 'check' | 'call' | 'raise' | 'allin';

export interface Action {
  type: ActionType;
  /** For raise: the total bet this street (raise-to). */
  raiseTo?: number;
}

export interface LegalActions {
  canFold: boolean;
  canCheck: boolean;
  canCall: boolean;
  callAmount: number;
  canRaise: boolean;
  minRaiseTo: number;
  maxRaiseTo: number;
  canAllIn: boolean;
}

export interface GameConfig {
  startingStack: number;
  smallBlind: number;
  bigBlind: number;
  playerCount: number;
}

export interface WinnerShare {
  playerId: string;
  amount: number;
  handName: string;
  potIndex: number;
}

export interface GameState {
  players: Player[];
  community: Card[];
  deck: Card[];
  deckIndex: number;
  button: number;
  sbIndex: number;
  bbIndex: number;
  street: Street;
  currentBet: number;
  minRaise: number;
  toAct: number | null;
  lastAggressor: number | null;
  pots: Pot[];
  handNumber: number;
  winners: WinnerShare[];
  log: string[];
  config: GameConfig;
  rngSeed: number;
  waitingForNewHand: boolean;
  gameOver: boolean;
}

export type Rng = () => number;
