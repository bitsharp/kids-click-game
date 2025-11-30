# Sunny Coins — Kid-Friendly Click Game

A small, playful click-and-collect web game intended as a starter kit for a kid-focused product. It includes a simple mock store and server endpoint to demonstrate how monetization hooks could work.

## What's included

- `server.js` — Express server that serves static files and a mock `/api/purchase` endpoint.
- `public/index.html` — Game UI (collect coins, open shop).
- `public/styles.css` — Playful responsive styling.
- `public/app.js` — Game logic, localStorage balance, mock purchases.

## Run locally

1. Install dependencies and start the server:

```bash
cd /Users/lucataurisano/project/kids-click-game
npm install
npm start
```

2. Open http://localhost:3000 in your browser.

## Monetization ideas

- In-app purchases (real money): implement server-side payment verification with Stripe; show purchases behind parental gate.
- Ads: integrate rewarded ads (AdMob / Unity Ads) for coin boosts — ensure COPPA-compliant ad partners and parental consent.
- Subscriptions: offer weekly coin packs or premium skins.
- Merch, affiliate links, and promoted content.

## Safety & compliance

For kid-targeted apps, follow legal requirements (e.g., COPPA), include parental gates for purchases, and avoid targeted advertising unless compliant.

## Polish included

- Simple WebAudio chimes (no external assets), coin-particle animations, and sun bounce effect.

## Daily Missions

The app now includes a deterministic "Daily Mission" that changes each day. Missions live in `localStorage` and can be completed for coin rewards. Types include "collect X coins", "perform X taps", or "buy a specific store item". The mission resets at midnight (based on the browser's local date).

## Next steps I can implement for you

- Wire up Stripe checkout and secure server verification.
- Add rewarded-ad hooks and sample integration details.
- Add parental gates for purchases (recommended before turning real money flows on).

