# BTC Price Prediction Game

A real-time Bitcoin price prediction game built with Nuxt 3. Players predict whether BTC price will go up or down within 60 seconds.

## System Design Overview

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT (Nuxt 3 / Vue 3) @Netlify               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐   │
│  │   Pages     │    │ Components  │    │ Composables │    │   Helpers   │   │
│  ├─────────────┤    ├─────────────┤    ├─────────────┤    ├─────────────┤   │
│  │ index.vue   │───▶│PlayerHeader │    │useGameLogic │◀───│gameLogic    │   │
│  │ leaderboard │    │BtcPriceChart│    │useBtcPrice  │    │btcChart     │   │
│  │             │    │BidButtons   │    │usePlayerId  │    │bidPersist   │   │
│  │             │    │BidStatus    │    │usePlayerProf│    │             │   │
│  │             │    │PlayerStats  │    │             │    │             │   │
│  └─────────────┘    └─────────────┘    └──────┬──────┘    └─────────────┘   │
│                                               │                             │
│                     ┌─────────────────────────┼─────────────────────────┐   │
│                     │         Services Layer  │                         │   │
│                     ├─────────────────────────┼─────────────────────────┤   │
│                     │  useBtcWS    useBtcHistory   usePlayerService     │   │
│                     └──────┬────────────┬─────────────────┬─────────────┘   │
│                            │            │                 │                 │
└────────────────────────────┼────────────┼─────────────────┼─────────────────┘
                             │            │                 │
              ┌──────────────┘            │                 │
              ▼                           ▼                 ▼
┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│   Binance WebSocket │    │   Binance REST API  │    │   Nuxt Server API   │
│   (Real-time price) │    │   (Historical data) │    │   /api/players/*    │
│                     │    │   /api/v3/klines    │    │   /api/leaderboard  │
└─────────────────────┘    └─────────────────────┘    └───────────┬─────────┘
                                                                  │
┌─────────────────────────────────────────────────────────────────┼──────────┐
│                         SERVER (Nuxt 3 - Nitro) @Netlify        │          │
├─────────────────────────────────────────────────────────────────┼──────────┤
│                                                                 ▼          │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────────────┐ │
│  │   API Routes    │    │   Server Lib    │    │      Server Utils       │ │
│  ├─────────────────┤    ├─────────────────┤    ├─────────────────────────┤ │
│  │ players/        │───▶│ playerHelpers   │───▶│ playerDb.ts             │ │
│  │   [id]/index    │    │ (re-exports     │    │ supabase.ts             │ │
│  │   [id]/bids     │    │  from shared)   │    │                         │ │
│  │   [id]/name     │    │                 │    │                         │ │
│  │ leaderboard     │    │                 │    │                         │ │
│  └─────────────────┘    └─────────────────┘    └────────────┬────────────┘ │
│                                                             │              │
└─────────────────────────────────────────────────────────────┼──────────────┘
                                                              │
                                                              ▼
                                               ┌─────────────────────────────┐
                                               │        Supabase (AWS)       │
                                               │     (PostgreSQL DB)         │
                                               ├─────────────────────────────┤
                                               │  Tables:                    │
                                               │  - players (stats, name)    │
                                               │  - bids (history)           │
                                               └─────────────────────────────┘
```

### Data Flow

```
1. CONNECT & INITIALIZE
   ┌──────────┐     WebSocket      ┌──────────┐     REST API    ┌──────────┐
   │  Client  │ ─────────────────▶ │ Binance  │ ◀─────────────  │  Client  │
   │          │ (real-time price)  │          │  (5m history)   │          │
   └──────────┘                    └──────────┘                 └──────────┘

2. PLAYER IDENTIFICATION
   ┌──────────┐    localStorage    ┌──────────┐     POST        ┌──────────┐
   │  Client  │ ─────────────────▶ │ playerId │ ───────────────▶│  Server  │
   │          │  (UUID v4 stored)  │          │  (upsert player)│          │
   └──────────┘                    └──────────┘                 └──────────┘

3. MAKE A BID
   ┌──────────┐                    ┌──────────┐                 ┌──────────┐
   │  User    │ ─── clicks UP ───▶ │GameLogic │ ───────────────▶│  Chart   │
   │          │     or DOWN        │          │  (bid marker)   │          │
   └──────────┘                    └──────────┘                 └──────────┘
                                        │
                                        ▼
                                   ┌──────────┐
                                   │localStorage│ (persist bid for refresh)
                                   └──────────┘

4. COUNTDOWN & RESOLUTION (60 seconds)
   ┌──────────┐                    ┌──────────┐                 ┌──────────┐
   │  Timer   │ ─── countdown ───▶ │  Check   │ ─── if price ─▶ │ Evaluate │
   │  (1s)    │     reaches 0      │  Price   │    changed      │   Win    │
   └──────────┘                    └──────────┘                 └──────────┘
                                                                     │
                                        ┌────────────────────────────┘
                                        ▼
5. SAVE RESULT
   ┌──────────┐      POST          ┌──────────┐     INSERT      ┌──────────┐
   │  Client  │ ─────────────────▶ │  Server  │ ───────────────▶│ Supabase │
   │          │ /api/players/bids  │          │  (bid + stats)  │          │
   └──────────┘                    └──────────┘                 └──────────┘
```

### Key Components

| Layer           | Component           | Responsibility                                |
| --------------- | ------------------- | --------------------------------------------- |
| **Pages**       | `index.vue`         | Main game page, orchestrates components       |
|                 | `leaderboard.vue`   | Displays top players by score/streak/earnings |
| **Components**  | `BtcPriceChart`     | D3.js chart with real-time price line         |
|                 | `BidButtons`        | UP/DOWN prediction buttons                    |
|                 | `BidStatus`         | Countdown timer, current bid info             |
|                 | `PlayerHeader`      | Player name, score display                    |
|                 | `PlayerStatsPanel`  | Streak, wins, losses, earnings                |
| **Composables** | `useGameLogic`      | Core game state machine                       |
|                 | `useBtcPrice`       | Unified BTC data interface                    |
|                 | `usePlayerService`  | API client for player operations              |
|                 | `usePlayerId`       | UUID generation & localStorage                |
| **Services**    | `useBtcWS`          | WebSocket connection to Binance               |
|                 | `useBtcHistory`     | Historical kline data fetching                |
| **Server**      | `/api/players/[id]` | Player CRUD operations                        |
|                 | `/api/leaderboard`  | Top players query                             |
| **Shared**      | `types/`            | TypeScript interfaces (api, db, game)         |
|                 | `helpers/`          | Pure functions shared client/server           |

### State Management

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        MODULE-LEVEL SINGLETONS                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  useBtcWS                    useBtcHistory                 useGameLogic     │
│  ┌─────────────────┐         ┌─────────────────┐         ┌───────────────┐  │
│  │ priceData       │         │ priceHistory[]  │         │ score         │  │
│  │ status          │         │ isLoadingHistory│         │ guess         │  │
│  │ error           │         │ currentRange    │         │ isLocked      │  │
│  │ ws: WebSocket   │         │                 │         │ countdown     │  │
│  └─────────────────┘         └─────────────────┘         │ guessPrice    │  │
│                                                          │ currentStreak │  │
│  useBtcPrice (combines above + bid state)                │ totalEarnings │  │
│  ┌─────────────────┐                                     │ lastBidResult │  │
│  │ bidPrice        │                                     └───────────────┘  │
│  │ bidTimestamp    │                                                        │
│  │ guessDirection  │                                                        │
│  │ selectedRange   │                                                        │
│  └─────────────────┘                                                        │
│                                                                             │
│  localStorage                                                               │
│  ┌─────────────────┐                                                        │
│  │ playerId (UUID) │ ← persists player identity                             │
│  │ activeBid       │ ← persists bid across refresh                          │
│  └─────────────────┘                                                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Database Schema

```sql
-- PLAYERS TABLE
player_id      VARCHAR PRIMARY KEY  -- UUID from client
player_name    VARCHAR(20)          -- nullable, user-chosen
current_streak INTEGER              -- resets on loss
longest_streak INTEGER              -- all-time best
total_wins     INTEGER
total_losses   INTEGER
total_earnings DECIMAL              -- cumulative $ won/lost
score          INTEGER              -- wins - losses
created_at     TIMESTAMP
updated_at     TIMESTAMP

-- BIDS TABLE
id             UUID PRIMARY KEY
player_id      VARCHAR REFERENCES players
direction      VARCHAR              -- 'up' | 'down'
bid_price      DECIMAL              -- price when bid placed
final_price    DECIMAL              -- price when resolved
earnings       DECIMAL              -- + or - amount
won            BOOLEAN
timestamp      BIGINT               -- epoch ms
created_at     TIMESTAMP
```

### API Endpoints

| Method | Endpoint                | Description                         |
| ------ | ----------------------- | ----------------------------------- |
| `GET`  | `/api/players/:id`      | Fetch player stats (creates if new) |
| `PUT`  | `/api/players/:id/name` | Update player name                  |
| `GET`  | `/api/players/:id/bids` | Fetch bid history                   |
| `POST` | `/api/players/:id/bids` | Save completed bid + update stats   |
| `GET`  | `/api/leaderboard`      | Top players sorted by score         |

### Technology Stack

| Category            | Technology                           |
| ------------------- | ------------------------------------ |
| **Framework**       | Nuxt 3 (Vue 3 + Nitro)               |
| **Language**        | TypeScript (strict mode)             |
| **Styling**         | Tailwind CSS 4 + custom CSS          |
| **Charts**          | D3.js (dynamic import)               |
| **Database**        | Supabase (PostgreSQL)                |
| **Real-time Data**  | Binance WebSocket API                |
| **Historical Data** | Binance REST API (klines)            |
| **Testing**         | Vitest + @vue/test-utils (570 tests) |
| **Linting**         | ESLint + Nuxt ESLint module          |

---

## Design choices

The UX consist on a main Bitcoin chart that mimics elements from [Tradeview](https://www.tradingview.com/) implemented directly in SVG with D3 for better customization.

The game flow starts at the login screen where the player is welcomed and sets its username (the username can be edited afterwards). After that, it goes directly to the main screen where the player can see the bitcoin chart in real time. The chart defaults to a 5-min view, but it can be changed up to 24h, but for the purpose of the game, 5 or 10 min are ideal for following the visuals.

Below the chart, there are two simple up and down buttons for setting the bid. When the bid is set, a progress bar appears at one side. This progress bar is inspired in [Coinlive](https://play.google.com/store/apps/details?id=com.tenxchat.coin_live_chat&hl=en_GB) and gives additional hints so see if the player is winning or losing the bet and by what margin.

There is an additional leaderboard that states the highest score in an old-school retro game fashion.

The font choice wants to mimic a system font. Also a retro choice, but trying not to look too informal. We use fluid typography and spacing in order to assure a smooth experience at any given breakpoint, and media queries are seldom needed in the app.

---

## Setup

Make sure to install dependencies:

```bash
npm install
```

### Environment Variables

Create a `.env` file with your Supabase credentials:

```env
NUXT_SUPABASE_URL=your_supabase_url
NUXT_SUPABASE_SECRET_KEY=your_supabase_secret_key
```

## Development Server

Start the development server on `http://localhost:3000`:

```bash
npm run dev
```

## Production

Build the application for production:

```bash
npm run build
```

Locally preview production build:

```bash
npm run preview
```

## Testing

Run the test suite:

```bash
npm run test
```

Run tests in watch mode:

```bash
npm run test -- --watch
```

## Type Checking

```bash
npx nuxi typecheck
```

Check out the [Nuxt documentation](https://nuxt.com/docs/getting-started/deployment) for more information.
