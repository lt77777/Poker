import { useEffect, useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import {
  applyAction,
  createTable,
  DEFAULT_CONFIG,
  rebuyHuman,
  startHand,
} from './src/engine/game';
import { chooseBotAction } from './src/engine/bot';
import type { Action, GameState } from './src/engine/types';
import { Table } from './src/ui/Table';
import { colors } from './src/ui/theme';

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
    const t = setTimeout(() => {
      setState((s) => {
        if (s.toAct === null) return s;
        const p = s.players[s.toAct];
        if (!p || p.isHuman) return s;
        try {
          return applyAction(s, chooseBotAction(s));
        } catch {
          try {
            return applyAction(s, { type: 'check' });
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
    return () => clearTimeout(t);
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
      <SafeAreaView style={styles.safe}>
        <StatusBar style="light" />
        <View style={styles.lobby}>
          <View style={styles.card}>
            <Text style={styles.mark}>♠</Text>
            <Text style={styles.title}>Night Table</Text>
            <Text style={styles.lede}>
              No-Limit Hold'em · you vs bots. Stacks {DEFAULT_CONFIG.startingStack.toLocaleString()} ·
              blinds {DEFAULT_CONFIG.smallBlind}/{DEFAULT_CONFIG.bigBlind}.
            </Text>
            <Text style={styles.countLabel}>Players · {playerCount} ({playerCount - 1} bots)</Text>
            <View style={styles.stepper}>
              <Pressable
                style={styles.step}
                onPress={() => setPlayerCount((n) => Math.max(2, n - 1))}
              >
                <Text style={styles.stepTxt}>−</Text>
              </Pressable>
              <Text style={styles.count}>{playerCount}</Text>
              <Pressable
                style={styles.step}
                onPress={() => setPlayerCount((n) => Math.min(6, n + 1))}
              >
                <Text style={styles.stepTxt}>+</Text>
              </Pressable>
            </View>
            <Pressable
              style={styles.cta}
              onPress={() => {
                const table = createTable({ playerCount }, Math.floor(Math.random() * 1e9));
                setState(deal(table));
                setLobby(false);
              }}
            >
              <Text style={styles.ctaTxt}>Take a seat</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  lobby: { flex: 1, justifyContent: 'center', padding: 24 },
  card: {
    backgroundColor: '#111814',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(228, 195, 122, 0.25)',
    padding: 24,
    alignItems: 'center',
  },
  mark: { color: colors.gold, fontSize: 36, marginBottom: 8 },
  title: { color: colors.ink, fontSize: 28, fontWeight: '700', marginBottom: 10 },
  lede: { color: colors.muted, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  countLabel: { color: colors.muted, marginBottom: 10 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 22 },
  step: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepTxt: { color: colors.ink, fontSize: 24, fontWeight: '700' },
  count: { color: colors.gold, fontSize: 28, fontWeight: '700', minWidth: 36, textAlign: 'center' },
  cta: {
    backgroundColor: colors.gold2,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 999,
  },
  ctaTxt: { color: '#1a1208', fontWeight: '800', fontSize: 16 },
});
