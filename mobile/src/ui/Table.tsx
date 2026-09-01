import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { livePot } from '../engine/game';
import { evaluateHand } from '../engine/hand';
import type { Action, GameState, Player } from '../engine/types';
import { ActionBar } from './ActionBar';
import { PlayingCard } from './PlayingCard';
import { Seat } from './Seat';
import { colors } from './theme';

function opponentRows(players: Player[]): { player: Player; index: number }[][] {
  const bots = players.slice(1).map((player, i) => ({ player, index: i + 1 }));
  const n = bots.length;
  if (n <= 3) return [bots];
  if (n === 4) return [bots.slice(1, 3), [bots[0]!, bots[3]!]];
  return [bots.slice(1, 4), [bots[0]!, bots[4]!]];
}

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

  const rows = opponentRows(state.players);
  const log = state.log.slice(-8);

  return (
    <View style={styles.wrap}>
      <View style={styles.topbar}>
        <View>
          <Text style={styles.brand}>♠ Night Table</Text>
          <Text style={styles.sub}>NLHE · {state.config.smallBlind}/{state.config.bigBlind}</Text>
        </View>
        <Text style={styles.meta}>Hand #{state.handNumber || '—'}</Text>
      </View>

      <View style={styles.stage}>
        {rows.map((row, ri) => (
          <View key={ri} style={styles.oppRow}>
            {row.map((s) => (
              <Seat key={s.player.id} player={s.player} index={s.index} state={state} compact />
            ))}
          </View>
        ))}

        <View style={styles.felt}>
          <Text style={styles.street}>{street}</Text>
          <View style={styles.board}>
            {Array.from({ length: 5 }).map((_, i) =>
              state.community[i] ? (
                <PlayingCard key={i} card={state.community[i]} size="md" />
              ) : (
                <View key={i} style={styles.placeholder} />
              ),
            )}
          </View>
          <Text style={styles.pot}>
            Pot {pot.toLocaleString()}
            {state.currentBet > 0 && state.street !== 'handOver' ? `  ·  Bet ${state.currentBet}` : ''}
          </Text>
          {heroHand ? <Text style={styles.heroHand}>{heroHand}</Text> : null}
        </View>

        <View style={styles.heroRow}>
          <Seat player={you} index={0} state={state} />
        </View>
      </View>

      <ScrollView style={styles.log} nestedScrollEnabled>
        {log.map((line, i) => (
          <Text key={`${state.handNumber}-${i}-${line}`} style={styles.logLine}>
            {line}
          </Text>
        ))}
      </ScrollView>

      <ActionBar
        state={state}
        onAct={onAct}
        onNextHand={onNextHand}
        onRebuy={onRebuy}
        onNewTable={onNewTable}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
  topbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingBottom: 4,
  },
  brand: { color: colors.gold, fontSize: 18, fontWeight: '700' },
  sub: { color: colors.muted, fontSize: 11, marginTop: 1 },
  meta: { color: colors.ink, fontSize: 13 },
  stage: { flex: 1, paddingHorizontal: 8 },
  oppRow: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  felt: {
    flex: 1,
    backgroundColor: colors.felt,
    borderRadius: 80,
    borderWidth: 8,
    borderColor: colors.rail,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    minHeight: 140,
    marginVertical: 4,
  },
  street: {
    color: colors.gold,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  board: { flexDirection: 'row', justifyContent: 'center' },
  placeholder: {
    width: 46,
    height: 64,
    marginHorizontal: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  pot: { color: colors.ink, marginTop: 8, fontWeight: '700', fontSize: 14 },
  heroHand: { color: colors.gold, fontSize: 12, marginTop: 4 },
  heroRow: { alignItems: 'center', paddingVertical: 4 },
  log: { maxHeight: 68, paddingHorizontal: 12 },
  logLine: { color: colors.muted, fontSize: 11, lineHeight: 15 },
});
