# BTC Game API - Serverless Backend

AWS Lambda + API Gateway + DynamoDB backend for the BTC price prediction game.

## Prerequisites

1. AWS CLI configured with credentials
2. Node.js 20.x
3. Serverless Framework

## Setup

```bash
cd serverless
npm install
```

## Deploy

```bash
# Deploy to dev stage
npm run deploy

# Deploy to production
npm run deploy:prod
```

## API Endpoints

After deployment, you'll get endpoints like:

- `GET https://xxx.execute-api.eu-central-1.amazonaws.com/dev/players/{playerId}/stats`
- `POST https://xxx.execute-api.eu-central-1.amazonaws.com/dev/players/{playerId}/bids`
- `GET https://xxx.execute-api.eu-central-1.amazonaws.com/dev/players/{playerId}/bids`

## DynamoDB Schema

**Table:** `btc-game-api-{stage}`

| PK                  | SK                | Description            |
| ------------------- | ----------------- | ---------------------- |
| `PLAYER#{playerId}` | `STATS`           | Player statistics      |
| `PLAYER#{playerId}` | `BID#{timestamp}` | Individual bid records |

### Stats Record

```json
{
  "PK": "PLAYER#uuid",
  "SK": "STATS",
  "currentStreak": 5,
  "longestStreak": 10,
  "totalWins": 25,
  "totalLosses": 15,
  "totalEarnings": 5000,
  "updatedAt": "2024-12-05T..."
}
```

### Bid Record

```json
{
  "PK": "PLAYER#uuid",
  "SK": "BID#1733423456789",
  "playerId": "uuid",
  "timestamp": 1733423456789,
  "direction": "up",
  "bidPrice": 50000,
  "finalPrice": 50200,
  "earnings": 200,
  "won": true
}
```

## Remove

```bash
npm run remove
```
