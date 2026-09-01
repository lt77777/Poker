# Night Table — Texas Hold'em

A local No-Limit Texas Hold'em table. You sit at a 6-max felt against a handful of bots with different styles. There is no server, no account, and no tracking.

The rules live in a **DOM-free TypeScript engine** (`src/engine/` on web, copied into `mobile/src/engine/` for iPhone) so both clients share the same logic.

Live web: https://ancient-chant-tpat.here.now/

## Web

```
npm install
npm run dev
```

Then open the URL Vite prints (usually `http://localhost:5173`).

```
npm test          # engine unit tests
npm run build     # production bundle
```

## iPhone (Expo Go)

Play on a real iPhone with Expo Go — no Mac required for v1.

1. Install **Expo Go** from the App Store.
2. `cd mobile && npm install`
3. `npx expo start`
4. Scan the QR code with the Camera app or Expo Go (same Wi-Fi, or `npx expo start --tunnel`).

```
cd mobile
npm test          # copied engine unit tests
npm run typecheck
```

This is **not** an App Store / TestFlight build. Expo Go is the v1 path.

## How to play

1. Choose 2–6 seats (you + bots) and start the table.
2. Blinds post, two hole cards are dealt, and action starts left of the big blind.
3. On your turn: **Fold**, **Check** / **Call**, **Raise** (min / half pot / pot / amount), or **All-in**.
4. Streets: preflop → flop (3) → turn (1) → river (1) → showdown.
5. Broke bots sit out. If you bust, **Rebuy** for a full stack or start a **New table**.

Web keyboard: `F` fold · `C` check/call · `R` raise · `A` all-in · `Enter` next hand · `1`/`2`/`3` half-pot / pot / shove.

## Table stakes

- Starting stack: 1,000
- Blinds: 5 / 10 (100 big blinds)
- Game: No-Limit Hold'em, 2–6 players
- Button rotates each hand; heads-up button posts the small blind

Hand ranking is standard high poker (high card through royal flush), including kickers, split pots, and the wheel (`A-2-3-4-5`). Side pots are built from uneven all-ins. An all-in for less than a full raise does not reopen betting for players who already acted.

## Bots

- Apex — tight-aggressive
- River — loose-aggressive
- Mira — tight-passive
- Knox — loose-passive
- Vesper — balanced

They use hole-card strength, made-hand category, and simple flush/straight-draw hints — not random all-ins every hand.

## Layout

- `src/engine/` — pure TS: cards, evaluator, pots, betting, bots
- `src/ui/` — React (web) table, seats, cards, action bar
- `mobile/` — Expo + React Native iPhone app (Night Table)

MIT licensed.
