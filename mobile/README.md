# Night Table for iPhone

Expo + TypeScript client. Same DOM-free Hold'em engine as the web app (`src/engine/`). Display name: **Night Table**.

## Run on iPhone (Expo Go)

No Mac required for v1.

1. Install **Expo Go** from the App Store.
2. `cd mobile && npm install`
3. `npx expo start`
4. Scan the QR code with Camera or Expo Go. Same Wi-Fi, or `npx expo start --tunnel`.

Portrait 6-max: you at the bottom, opponents along the top. Fold / check / call / raise / all-in. Rebuy and new table. Blinds 5/10, stacks 1,000. Bots: Apex, River, Mira, Knox, Vesper.

```
npm test          # copied engine unit tests
npm run typecheck
```

This is **not** an App Store or TestFlight build. Expo Go is the v1 path.
