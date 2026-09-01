import { livePot } from '../engine/game';
import { evaluateHand } from '../engine/hand';
import type { GameState } from '../engine/types';
import { ActionBar } from './ActionBar';
import { PlayingCard } from './PlayingCard';
import { Seat } from './Seat';
import type { Action } from '../engine/types';

export function Table({
  state,
  onAct,
  onNextHand,
  onRebuy,
  onNewTable,
}: {
  state: GameState;
  onAct: (action: Action) => void;
  onNextHand: () => void;
  onRebuy: () => void;
  onNewTable: () => void;
}) {
  const pot = livePot(state);
  const street =
    state.street === 'handOver'
      ? 'Showdown'
      : state.street === 'idle'
        ? 'Lobby'
        : state.street[0]!.toUpperCase() + state.street.slice(1);

  const you = state.players[0]!;
  let heroHand = '';
  if (you.holeCards.length === 2 && state.community.length >= 3 && you.status !== 'folded') {
    try {
      heroHand = evaluateHand([...you.holeCards, ...state.community]).name;
    } catch {
      heroHand = '';
    }
  }

  const log = state.log.slice(-12);

  return (
    <div className="felt-wrap">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">♠</span>
          <div>
            <h1>Night Table</h1>
            <p>No-Limit Texas Hold'em · 6-max</p>
          </div>
        </div>
        <div className="meta">
          <span>
            Blinds {state.config.smallBlind}/{state.config.bigBlind}
          </span>
          <span>Stack {state.config.startingStack.toLocaleString()}</span>
          <span>Hand #{state.handNumber || '—'}</span>
        </div>
      </header>

      <div className="stage">
        <div className="rail">
          <div className="felt">
            {state.players.map((p, i) => (
              <Seat key={p.id} player={p} index={i} state={state} />
            ))}

            <div className="board">
              <div className="street-chip">{street}</div>
              <div className="board-cards">
                {Array.from({ length: 5 }).map((_, i) =>
                  state.community[i] ? (
                    <PlayingCard key={i} card={state.community[i]} />
                  ) : (
                    <div key={i} className="pcard placeholder" />
                  ),
                )}
              </div>
              <div className="pot-display">
                <span className="pot-label">Pot</span>
                <span className="pot-value">{pot.toLocaleString()}</span>
                {state.currentBet > 0 && state.street !== 'handOver' && (
                  <span className="to-call">Bet {state.currentBet}</span>
                )}
              </div>
              {heroHand && <div className="hero-hand">{heroHand}</div>}
            </div>
          </div>
        </div>

        <aside className="log-panel">
          <h2>Hand history</h2>
          <ol>
            {log.map((line, i) => (
              <li key={`${state.handNumber}-${i}-${line}`}>{line}</li>
            ))}
          </ol>
        </aside>
      </div>

      <ActionBar
        state={state}
        onAct={onAct}
        onNextHand={onNextHand}
        onRebuy={onRebuy}
        onNewTable={onNewTable}
      />
    </div>
  );
}
