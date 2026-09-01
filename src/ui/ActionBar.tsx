import { useEffect, useMemo, useState } from 'react';
import { getLegalActions } from '../engine/game';
import type { Action, GameState } from '../engine/types';

export function ActionBar({
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
  const you = state.players[0]!;
  const yourTurn = state.toAct === 0 && you.isHuman && you.status === 'active';
  const legal = yourTurn ? getLegalActions(state, 0) : getLegalActions(state, -1);
  const [raiseTo, setRaiseTo] = useState(legal.minRaiseTo || 0);

  useEffect(() => {
    if (legal.canRaise) setRaiseTo(legal.minRaiseTo);
  }, [legal.canRaise, legal.minRaiseTo, state.handNumber, state.street, state.currentBet]);

  const callLabel = useMemo(() => {
    if (legal.canCheck) return 'Check';
    if (legal.canCall) return legal.callAmount >= you.stack ? `All-in ${you.stack}` : `Call ${legal.callAmount}`;
    return 'Call';
  }, [legal, you.stack]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const k = e.key.toLowerCase();
      if (state.waitingForNewHand) {
        if (k === 'enter' || k === 'n') {
          if (you.stack === 0) onRebuy();
          else onNextHand();
        }
        return;
      }
      if (!yourTurn) return;
      if (k === 'f' && legal.canFold) onAct({ type: 'fold' });
      if (k === 'c') {
        if (legal.canCheck) onAct({ type: 'check' });
        else if (legal.canCall) onAct({ type: 'call' });
      }
      if (k === 'r' && legal.canRaise) onAct({ type: 'raise', raiseTo });
      if (k === 'a' && legal.canAllIn) onAct({ type: 'allin' });
      if (k === '1' && legal.canRaise) {
        const half = Math.min(legal.maxRaiseTo, Math.max(legal.minRaiseTo, Math.floor(legal.minRaiseTo + potHint(state) * 0.5)));
        onAct({ type: 'raise', raiseTo: half });
      }
      if (k === '2' && legal.canRaise) {
        const pot = Math.min(legal.maxRaiseTo, Math.max(legal.minRaiseTo, legal.minRaiseTo + potHint(state)));
        onAct({ type: 'raise', raiseTo: pot });
      }
      if (k === '3' && legal.canAllIn) onAct({ type: 'allin' });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [yourTurn, legal, raiseTo, state.waitingForNewHand, you.stack]);

  if (state.gameOver && you.stack === 0) {
    return (
      <div className="action-bar">
        <p className="hint">You are out of chips.</p>
        <button className="btn primary" onClick={onRebuy}>
          Rebuy {state.config.startingStack.toLocaleString()}
        </button>
        <button className="btn" onClick={onNewTable}>
          New table
        </button>
      </div>
    );
  }

  if (state.waitingForNewHand) {
    const summary = state.winners.length
      ? state.winners
          .map((w) => {
            const name = state.players.find((p) => p.id === w.playerId)?.name ?? w.playerId;
            return `${name} +${w.amount}${w.handName !== 'uncontested' && w.handName !== 'side pot' ? ` (${w.handName})` : ''}`;
          })
          .join(' · ')
      : 'Ready to deal';
    return (
      <div className="action-bar">
        <p className="hint">{summary}</p>
        <button className="btn primary" onClick={you.stack === 0 ? onRebuy : onNextHand}>
          {you.stack === 0 ? 'Rebuy' : 'Next hand'} <kbd>Enter</kbd>
        </button>
        <button className="btn" onClick={onNewTable}>
          New table
        </button>
      </div>
    );
  }

  if (!yourTurn) {
    const name = state.toAct !== null ? state.players[state.toAct]?.name : '…';
    return (
      <div className="action-bar">
        <p className="hint waiting">Waiting for {name}</p>
      </div>
    );
  }

  const pot = potHint(state);
  const half = Math.min(legal.maxRaiseTo, Math.max(legal.minRaiseTo, Math.floor(state.currentBet + pot * 0.5)));
  const potBet = Math.min(legal.maxRaiseTo, Math.max(legal.minRaiseTo, state.currentBet + pot));

  return (
    <div className="action-bar">
      <div className="shortcuts">
        {legal.canFold && (
          <span>
            <kbd>F</kbd> fold
          </span>
        )}
        <span>
          <kbd>C</kbd> {legal.canCheck ? 'check' : 'call'}
        </span>
        {legal.canRaise && (
          <span>
            <kbd>R</kbd> raise
          </span>
        )}
        {legal.canAllIn && (
          <span>
            <kbd>A</kbd> all-in
          </span>
        )}
      </div>
      <div className="btn-row">
        {legal.canFold && (
          <button className="btn danger" onClick={() => onAct({ type: 'fold' })}>
            Fold
          </button>
        )}
        {legal.canCheck && (
          <button className="btn" onClick={() => onAct({ type: 'check' })}>
            Check
          </button>
        )}
        {legal.canCall && (
          <button className="btn primary" onClick={() => onAct({ type: 'call' })}>
            {callLabel}
          </button>
        )}
        {legal.canAllIn && (
          <button className="btn warn" onClick={() => onAct({ type: 'allin' })}>
            All-in
          </button>
        )}
      </div>
      {legal.canRaise && (
        <div className="raise-row">
          <button className="btn ghost" onClick={() => setRaiseTo(legal.minRaiseTo)}>
            Min
          </button>
          <button className="btn ghost" onClick={() => setRaiseTo(half)}>
            ½ pot
          </button>
          <button className="btn ghost" onClick={() => setRaiseTo(potBet)}>
            Pot
          </button>
          <input
            type="range"
            min={legal.minRaiseTo}
            max={legal.maxRaiseTo}
            value={Math.min(legal.maxRaiseTo, Math.max(legal.minRaiseTo, raiseTo))}
            onChange={(e) => setRaiseTo(Number(e.target.value))}
          />
          <button className="btn primary" onClick={() => onAct({ type: 'raise', raiseTo })}>
            Raise to {raiseTo}
          </button>
        </div>
      )}
    </div>
  );
}

function potHint(state: GameState): number {
  return state.players.reduce((s, p) => s + p.totalContributed, 0);
}
