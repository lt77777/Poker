import { useEffect, useState } from 'react';
import {
  applyAction,
  createTable,
  DEFAULT_CONFIG,
  rebuyHuman,
  startHand,
} from './engine/game';
import { chooseBotAction } from './engine/bot';
import type { Action, GameState } from './engine/types';
import { Table } from './ui/Table';

export default function App() {
  const [playerCount, setPlayerCount] = useState(6);
  const [lobby, setLobby] = useState(true);
  const [state, setState] = useState<GameState>(() => createTable({ playerCount: 6 }));

  useEffect(() => {
    if (lobby) return;
    if (state.toAct === null) return;
    const actor = state.players[state.toAct];
    if (!actor || actor.isHuman) return;
    const wait = 520 + (state.handNumber % 3) * 80;
    const t = window.setTimeout(() => {
      setState((s) => {
        if (s.toAct === null) return s;
        const p = s.players[s.toAct];
        if (!p || p.isHuman) return s;
        try {
          return applyAction(s, chooseBotAction(s));
        } catch {
          const fallback: Action = { type: 'check' };
          try {
            return applyAction(s, fallback);
          } catch {
            try {
              return applyAction(s, { type: 'fold' });
            } catch {
              return s;
            }
          }
        }
      });
    }, wait);
    return () => window.clearTimeout(t);
  }, [lobby, state.toAct, state.street, state.handNumber, state.log.length]);

  const deal = (from: GameState) => {
    try {
      return startHand(from);
    } catch {
      return from;
    }
  };

  if (lobby) {
    return (
      <div className="lobby">
        <div className="lobby-card">
          <div className="brand lobby-brand">
            <span className="brand-mark">♠</span>
            <div>
              <h1>Night Table</h1>
              <p>No-Limit Hold'em · local-only</p>
            </div>
          </div>
          <p className="lede">
            You vs tight-aggressive bots at a 6-max table. Starting stack{' '}
            {DEFAULT_CONFIG.startingStack.toLocaleString()} with blinds {DEFAULT_CONFIG.smallBlind}/
            {DEFAULT_CONFIG.bigBlind}. Fold, check, call, raise, or shove — keyboard works too.
          </p>
          <label className="count-label">
            Players
            <input
              type="range"
              min={2}
              max={6}
              value={playerCount}
              onChange={(e) => setPlayerCount(Number(e.target.value))}
            />
            <strong>
              {playerCount} <span>({playerCount - 1} bots)</span>
            </strong>
          </label>
          <button
            className="btn primary lg"
            onClick={() => {
              const table = createTable({ playerCount }, Math.floor(Math.random() * 1e9));
              setState(deal(table));
              setLobby(false);
            }}
          >
            Take a seat
          </button>
        </div>
      </div>
    );
  }

  return (
    <Table
      state={state}
      onAct={(action) => setState((s) => applyAction(s, action))}
      onNextHand={() => setState((s) => deal(s))}
      onRebuy={() =>
        setState((s) => {
          const rebought = rebuyHuman(s);
          return deal(rebought);
        })
      }
      onNewTable={() => setLobby(true)}
    />
  );
}
