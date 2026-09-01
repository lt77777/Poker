import { StyleSheet, Text, View } from 'react-native';
import { RANK_LABEL, SUIT_SYMBOL, isRed } from '../engine/cards';
import type { Card } from '../engine/types';
import { colors } from './theme';

type Size = 'sm' | 'md' | 'lg';

const SIZE: Record<Size, { w: number; h: number; rank: number; pip: number }> = {
  sm: { w: 34, h: 48, rank: 10, pip: 12 },
  md: { w: 46, h: 64, rank: 13, pip: 18 },
  lg: { w: 62, h: 88, rank: 18, pip: 26 },
};

export function PlayingCard({
  card,
  faceDown = false,
  dim = false,
  size = 'md',
}: {
  card?: Card;
  faceDown?: boolean;
  dim?: boolean;
  size?: Size;
}) {
  const box = SIZE[size];
  if (faceDown || !card) {
    return (
      <View
        style={[
          styles.card,
          styles.back,
          { width: box.w, height: box.h, opacity: dim ? 0.45 : 1 },
        ]}
      >
        <View style={styles.backInner}>
          <Text style={styles.backPip}>♠</Text>
        </View>
      </View>
    );
  }
  const red = isRed(card.suit);
  const ink = red ? colors.red : colors.black;
  return (
    <View
      style={[
        styles.card,
        styles.face,
        { width: box.w, height: box.h, opacity: dim ? 0.45 : 1 },
      ]}
    >
      <Text style={[styles.corner, { color: ink, fontSize: box.rank }]}>
        {RANK_LABEL[card.rank]}
        {SUIT_SYMBOL[card.suit]}
      </Text>
      <Text style={[styles.pip, { color: ink, fontSize: box.pip }]}>
        {SUIT_SYMBOL[card.suit]}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 6,
    overflow: 'hidden',
    marginHorizontal: 2,
  },
  face: {
    backgroundColor: colors.cardFace,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.18)',
    padding: 3,
    justifyContent: 'space-between',
  },
  back: {
    backgroundColor: '#1a2744',
    borderWidth: 1,
    borderColor: colors.gold2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backInner: {
    flex: 1,
    margin: 3,
    alignSelf: 'stretch',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(228, 195, 122, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#152038',
  },
  backPip: { color: colors.gold, fontSize: 14 },
  corner: { fontWeight: '700', letterSpacing: -0.5 },
  pip: { textAlign: 'center', fontWeight: '600' },
});
