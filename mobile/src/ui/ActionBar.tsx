import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { getLegalActions } from '../engine/game';
import type { Action, GameState } from '../engine/types';
import { colors } from './theme';

function potHint(state: GameState): number {
  return state.players.reduce((s, p) => s + p.totalContributed, 0);
}

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
    if (legal.canCall) {
      return legal.callAmount >= you.stack ? `All-in ${you.stack}` : `Call ${legal.callAmount}`;
    }
    return 'Call';
  }, [legal, you.stack]);

  if (state.gameOver && you.stack === 0) {
    return (
      <View style={styles.bar}>
        <Text style={styles.hint}>You are out of chips.</Text>
        <View style={styles.row}>
          <Btn kind="primary" label={`Rebuy ${state.config.startingStack.toLocaleString()}`} onPress={onRebuy} />
          <Btn label="New table" onPress={onNewTable} />
        </View>
      </View>
    );
  }

  if (state.waitingForNewHand) {
    const summary = state.winners.length
      ? state.winners
          .map((w) => {
            const name = state.players.find((p) => p.id === w.playerId)?.name ?? w.playerId;
            return `${name} +${w.amount}${
              w.handName !== 'uncontested' && w.handName !== 'side pot' ? ` (${w.handName})` : ''
            }`;
          })
          .join(' · ')
      : 'Ready to deal';
    return (
      <View style={styles.bar}>
        <Text style={styles.hint} numberOfLines={3}>
          {summary}
        </Text>
        <View style={styles.row}>
          <Btn
            kind="primary"
            label={you.stack === 0 ? 'Rebuy' : 'Next hand'}
            onPress={you.stack === 0 ? onRebuy : onNextHand}
          />
          <Btn label="New table" onPress={onNewTable} />
        </View>
      </View>
    );
  }

  if (!yourTurn) {
    const name = state.toAct !== null ? state.players[state.toAct]?.name : '…';
    return (
      <View style={styles.bar}>
        <Text style={styles.waiting}>Waiting for {name}</Text>
      </View>
    );
  }

  const pot = potHint(state);
  const clamp = (n: number) => Math.min(legal.maxRaiseTo, Math.max(legal.minRaiseTo, n));
  const half = clamp(Math.floor(state.currentBet + pot * 0.5));
  const potBet = clamp(state.currentBet + pot);
  const step = Math.max(state.config.bigBlind, Math.round((legal.maxRaiseTo - legal.minRaiseTo) / 20) || 10);

  return (
    <View style={styles.bar}>
      <View style={styles.row}>
        {legal.canFold ? <Btn kind="danger" label="Fold" onPress={() => onAct({ type: 'fold' })} /> : null}
        {legal.canCheck ? <Btn label="Check" onPress={() => onAct({ type: 'check' })} /> : null}
        {legal.canCall ? <Btn kind="primary" label={callLabel} onPress={() => onAct({ type: 'call' })} /> : null}
        {legal.canAllIn ? <Btn kind="warn" label="All-in" onPress={() => onAct({ type: 'allin' })} /> : null}
      </View>
      {legal.canRaise ? (
        <View style={styles.raiseBlock}>
          <View style={styles.row}>
            <Btn kind="ghost" label="Min" onPress={() => setRaiseTo(legal.minRaiseTo)} />
            <Btn kind="ghost" label="½ pot" onPress={() => setRaiseTo(half)} />
            <Btn kind="ghost" label="Pot" onPress={() => setRaiseTo(potBet)} />
          </View>
          <View style={styles.stepper}>
            <Pressable
              style={styles.stepBtn}
              onPress={() => setRaiseTo(clamp(raiseTo - step))}
            >
              <Text style={styles.stepTxt}>−</Text>
            </Pressable>
            <Text style={styles.raiseAmt}>{raiseTo}</Text>
            <Pressable
              style={styles.stepBtn}
              onPress={() => setRaiseTo(clamp(raiseTo + step))}
            >
              <Text style={styles.stepTxt}>+</Text>
            </Pressable>
            <Btn
              kind="primary"
              label={`Raise to ${raiseTo}`}
              onPress={() => onAct({ type: 'raise', raiseTo })}
            />
          </View>
        </View>
      ) : null}
    </View>
  );
}

function Btn({
  label,
  onPress,
  kind = 'default',
}: {
  label: string;
  onPress: () => void;
  kind?: 'default' | 'primary' | 'danger' | 'warn' | 'ghost';
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.btn, styles[kind], pressed && styles.pressed]}
    >
      <Text style={[styles.btnTxt, kind === 'primary' && styles.btnTxtDark]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: 'rgba(10, 14, 12, 0.94)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(228, 195, 122, 0.22)',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 8,
    gap: 8,
  },
  hint: { color: colors.ink, fontSize: 13, lineHeight: 18, textAlign: 'center' },
  waiting: { color: colors.gold, fontSize: 15, textAlign: 'center', paddingVertical: 10 },
  row: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  raiseBlock: { gap: 8 },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  stepBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(228, 195, 122, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepTxt: { color: colors.ink, fontSize: 20, fontWeight: '700' },
  raiseAmt: { color: colors.gold, fontSize: 18, fontWeight: '700', minWidth: 56, textAlign: 'center' },
  btn: {
    borderWidth: 1,
    borderColor: 'rgba(228, 195, 122, 0.25)',
    backgroundColor: '#1c2420',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
  },
  default: {},
  primary: {
    backgroundColor: colors.gold2,
    borderColor: 'transparent',
  },
  danger: { backgroundColor: '#3a1515', borderColor: '#7a3030' },
  warn: { backgroundColor: '#3a2a12', borderColor: '#8a5a20' },
  ghost: { backgroundColor: 'transparent', paddingVertical: 6, paddingHorizontal: 10 },
  pressed: { opacity: 0.75 },
  btnTxt: { color: colors.ink, fontWeight: '700', fontSize: 14 },
  btnTxtDark: { color: '#1a1208' },
});
