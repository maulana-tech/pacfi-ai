# Dashboard API Contract

## Base

- Base URL: backend server (default `http://localhost:3001`)
- Auth header: `X-Wallet-Address: <solana_wallet_address>`
- Response envelope:

```json
{
  "success": true,
  "data": {},
  "error": null,
  "timestamp": "2026-04-08T12:00:00.000Z"
}
```

## Endpoints

## GET /dashboard/summary

Returns high-level portfolio and trading metrics.

```json
{
  "success": true,
  "data": {
    "totalBalance": 24582.5,
    "openPnl": 14.5,
    "openPnlPct": 0.06,
    "winRate": 68.5,
    "totalTrades": 142,
    "openPositions": 1
  },
  "error": null,
  "timestamp": "2026-04-08T12:00:00.000Z"
}
```

## GET /dashboard/positions

Returns normalized open positions.

```json
{
  "success": true,
  "data": [
    {
      "symbol": "SOL/USD",
      "side": "LONG",
      "size": 5,
      "entryPrice": 142.4,
      "markPrice": 145.3,
      "pnl": 14.5,
      "pnlPct": 2.04,
      "liquidationPrice": 98.2,
      "leverage": 5
    }
  ],
  "error": null,
  "timestamp": "2026-04-08T12:00:00.000Z"
}
```

## GET /dashboard/trades?limit=5

Returns recent trades for current wallet user.

```json
{
  "success": true,
  "data": [
    {
      "id": "trade-id",
      "symbol": "BTC/USD",
      "side": "BUY",
      "size": 0.05,
      "entryPrice": 44820,
      "exitPrice": 45230.5,
      "pnl": 20.53,
      "pnlPct": 0.92,
      "status": "CLOSED",
      "leverage": 3,
      "executedAt": "2026-04-08T11:55:00.000Z"
    }
  ],
  "error": null,
  "timestamp": "2026-04-08T12:00:00.000Z"
}
```

## GET /dashboard/swarm-status

Returns latest status per AI agent and most recent run timestamp.

```json
{
  "success": true,
  "data": {
    "agents": [
      {
        "id": "market_analyst",
        "name": "Market Analyst",
        "role": "Technical Analysis",
        "status": "done",
        "decision": "BUY",
        "confidence": 78,
        "reasoning": "RSI oversold, MACD bullish crossover"
      }
    ],
    "lastRun": "2026-04-08T11:58:00.000Z"
  },
  "error": null,
  "timestamp": "2026-04-08T12:00:00.000Z"
}
```

## GET /dashboard/leaderboard?limit=20&sortBy=roi&order=desc&cursor=<token>

Returns full leaderboard entries with sortable metrics.

Query params:
- `limit` (optional, default 25, max 100)
- `sortBy` (optional: `roi` | `winRate` | `trades` | `sharpe`, default `roi`)
- `order` (optional: `asc` | `desc`, default `desc`)
- `cursor` (optional, opaque pagination token from previous response)
- `period` (optional: `all` | `7d` | `30d`, default `all`)

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "rank": 1,
        "globalRank": 1,
        "walletAddress": "A1b2c3d4...",
        "username": "alpha_trader",
        "totalROI": 241.2,
        "winRate": 74.2,
        "sharpeRatio": 2.18,
        "totalTrades": 312,
        "updatedAt": "2026-04-08T11:58:00.000Z"
      }
    ],
    "pageInfo": {
      "limit": 20,
      "cursor": null,
      "nextCursor": "MjA",
      "hasMore": true
    }
  },
  "error": null,
  "timestamp": "2026-04-08T12:00:00.000Z"
}
```

## GET /dashboard/leaderboard-teaser?limit=3&period=all

Returns compact top leaderboard entries for dashboard teaser panel.

Query params:
- `limit` (optional, default 3, max 10)
- `period` (optional: `all` | `7d` | `30d`, default `all`)

```json
{
  "success": true,
  "data": [
    {
      "rank": 1,
      "walletAddress": "A1b2c3d4...",
      "username": "alpha_trader",
      "totalROI": 241.2,
      "winRate": 74.2,
      "totalTrades": 312,
      "updatedAt": "2026-04-08T11:58:00.000Z"
    }
  ],
  "error": null,
  "timestamp": "2026-04-08T12:00:00.000Z"
}
```

## Error Response

```json
{
  "success": false,
  "data": null,
  "error": "Invalid wallet address"
}
```
