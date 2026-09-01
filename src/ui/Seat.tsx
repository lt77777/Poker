import { PlayingCard } from './PlayingCard';
import type { GameState, Player } from '../engine/types';

const SEAT_SLOTS: Record<number, number[]> = {
  2: [0, 3],
  3: [0, 2, 4],
  4: [0, 1, 3, 5],
  5: [0, 1, 2, 3, 5],
  6: [0, 1, 2, 3, 4, 5],
};

export function Seat({
  player,
  index,
  state,
}: {
  player: Player;
  index: number;
  state: GameState;
}) {
  const slot = (SEAT_SLOTS[state.players.length] ?? SEAT_SLOTS[6])![index] ?? index;
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

  return (
    <div
      className={[
        'seat',
        `seat-${slot}`,
        isTurn ? 'to-act' : '',
        folded ? 'folded' : '',
        sitting ? 'sitting' : '',
        won ? 'winner' : '',
        player.isHuman ? 'human' : '',
      ].join(' ')}
    >
      <div className="seat-cards">
        {player.holeCards.length === 2 ? (
          <>
            <PlayingCard
              card={player.holeCards[0]}
              faceDown={!reveal}
              dim={folded}
              large={player.isHuman}
            />
            <PlayingCard
              card={player.holeCards[1]}
              faceDown={!reveal}
              dim={folded}
              large={player.isHuman}
            />
          </>
        ) : (
          sitting && <div className="empty-seat">Out</div>
        )}
      </div>
      <div className="nameplate">
        <div className="name-row">
          <span className="name">{player.name}</span>
          {isButton && <span className="dealer-btn" title="Dealer">D</span>}
          {isSB && !isButton && <span className="blind-tag">SB</span>}
          {isBB && <span className="blind-tag">BB</span>}
        </div>
        <div className="stack-row">
          <span className="chip-dot" />
          <span className="stack">{sitting ? '—' : player.stack.toLocaleString()}</span>
          {player.status === 'allIn' && <span className="status-pill">ALL-IN</span>}
          {folded && <span className="status-pill dim">FOLD</span>}
        </div>
        {player.bet > 0 && (
          <div className="street-bet">
            <span className="chip-dot gold" />
            {player.bet}
          </div>
        )}
      </div>
    </div>
  );
}
