import { StyleSheet, Text, View } from 'react-native';
import type { GameState, Player } from '../engine/types';
import { PlayingCard } from './PlayingCard';
import { colors } from './theme';

export function Seat({
  player,
  index,
  state,
  compact = false,
}: {
  player: Player;
  index: number;
  state: GameState;
  compact?: boolean;
}) {
  const isTurn = state.toAct === index && !state.waitingForNewHand;
  const isButton = state.button === index && state.street !== 'idle';
  const isSB = state.sbIndex === index && state.handNumber > 0 && state.street !== 'idle';
  const isBB = state.bbIndex === index && state.handNumber > 0 && state.street !== 'idle';
  const folded = player.status === 'folded';
  const sitting = player.status === 'sittingOut';
  const showdown = state.street === 'showdown' || state.street === 'handOver';
  const reveal =
    player.isHuman || (showdown && player.status !== 'folded' && player.status !== 'sittingOut');
  const won = state.winners.some((w) => w.playerId === player.id && w.amount > 0);
  const cardSize = player.isHuman ? 'lg' : compact ? 'sm' : 'sm';

  return (
    <View
      style={[
        styles.seat,
        player.isHuman && styles.hero,
        isTurn && styles.toAct,
        won && styles.winner,
        folded && styles.folded,
      ]}
    >
      <View style={styles.cards}>
        {player.holeCards.length === 2 ? (
          <>
            <PlayingCard card={player.holeCards[0]} faceDown={!reveal} dim={folded} size={cardSize} />
            <PlayingCard card={player.holeCards[1]} faceDown={!reveal} dim={folded} size={cardSize} />
          </>
        ) : sitting ? (
          <Text style={styles.out}>Out</Text>
        ) : null}
      </View>
      <View style={styles.plate}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>
            {player.name}
          </Text>
          {isButton ? <Text style={styles.dealer}>D</Text> : null}
          {isSB && !isButton ? <Text style={styles.blind}>SB</Text> : null}
          {isBB ? <Text style={styles.blind}>BB</Text> : null}
        </View>
        <View style={styles.stackRow}>
          <View style={styles.chipDot} />
          <Text style={styles.stack}>{sitting ? '—' : player.stack.toLocaleString()}</Text>
          {player.status === 'allIn' ? <Text style={styles.pill}>ALL-IN</Text> : null}
          {folded ? <Text style={[styles.pill, styles.pillDim]}>FOLD</Text> : null}
        </View>
        {player.bet > 0 ? (
          <Text style={styles.bet}>
            <Text style={styles.goldDot}>● </Text>
            {player.bet}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  seat: {
    alignItems: 'center',
    minWidth: 86,
    paddingHorizontal: 4,
  },
  hero: { minWidth: 140 },
  toAct: {
    backgroundColor: 'rgba(228, 195, 122, 0.12)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.gold,
    paddingVertical: 4,
  },
  winner: {
    backgroundColor: 'rgba(184, 137, 58, 0.18)',
    borderRadius: 12,
  },
  folded: { opacity: 0.7 },
  cards: { flexDirection: 'row', minHeight: 48, alignItems: 'center' },
  out: { color: colors.muted, fontSize: 12 },
  plate: {
    marginTop: 4,
    backgroundColor: colors.seat,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 78,
    borderWidth: 1,
    borderColor: 'rgba(228, 195, 122, 0.18)',
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  name: { color: colors.ink, fontSize: 12, fontWeight: '700', flexShrink: 1 },
  dealer: {
    color: '#1a1208',
    backgroundColor: colors.gold,
    fontSize: 10,
    fontWeight: '800',
    width: 16,
    height: 16,
    textAlign: 'center',
    borderRadius: 8,
    overflow: 'hidden',
  },
  blind: { color: colors.gold, fontSize: 10, fontWeight: '700' },
  stackRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  chipDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#c45c5c',
    borderWidth: 1,
    borderColor: '#f0d0d0',
  },
  stack: { color: colors.ink, fontSize: 12, fontVariant: ['tabular-nums'] },
  pill: {
    color: colors.gold,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  pillDim: { color: colors.muted },
  bet: { color: colors.gold, fontSize: 11, marginTop: 2, fontWeight: '600' },
  goldDot: { color: colors.gold2 },
});
