import { RANK_LABEL, SUIT_SYMBOL, isRed } from '../engine/cards';
import type { Card } from '../engine/types';

export function PlayingCard({
  card,
  faceDown = false,
  dim = false,
  large = false,
}: {
  card?: Card;
  faceDown?: boolean;
  dim?: boolean;
  large?: boolean;
}) {
  if (faceDown || !card) {
    return (
      <div className={`pcard back ${large ? 'large' : ''} ${dim ? 'dim' : ''}`} aria-label="Facedown card">
        <div className="pcard-back-pattern" />
      </div>
    );
  }
  const red = isRed(card.suit);
  const label = `${RANK_LABEL[card.rank]}${SUIT_SYMBOL[card.suit]}`;
  return (
    <div
      className={`pcard ${red ? 'red' : 'black'} ${large ? 'large' : ''} ${dim ? 'dim' : ''}`}
      aria-label={label}
    >
      <div className="pcard-corner top">
        <span>{RANK_LABEL[card.rank]}</span>
        <span className="suit">{SUIT_SYMBOL[card.suit]}</span>
      </div>
      <div className="pcard-pip">{SUIT_SYMBOL[card.suit]}</div>
      <div className="pcard-corner bot">
        <span>{RANK_LABEL[card.rank]}</span>
        <span className="suit">{SUIT_SYMBOL[card.suit]}</span>
      </div>
    </div>
  );
}
