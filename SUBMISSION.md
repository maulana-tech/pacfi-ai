# Pacfi AI - Autonomous AI Swarm Trading Platform

## Project Overview

**Pacfi AI** is an autonomous AI swarm trading platform for Pacifica perpetuals exchange. It uses a multi-agent Qwen AI system to continuously analyze markets, manage risk, and execute trades on Solana-based Pacifica testnet - fully automated and transparent.

---

## Problem Statement

Manual trading is time-consuming, emotionally biased, and difficult to scale. Professional traders use algorithms, but building and maintaining trading bots requires significant expertise. Retail traders need a simple way to let AI trade for them with proper risk management.

---

## Solution

Pacfi AI deploys a **swarm of 4 specialized AI agents** that collaborate to analyze markets and make trading decisions:

1. **Market Analyst** - Technical analysis (RSI, MACD, price patterns)
2. **Sentiment Agent** - Market sentiment (funding rates, volume)
3. **Risk Manager** - Position sizing, leverage, stop-loss calculation
4. **Coordinator** - Aggregates all signals for final BUY/SELL/HOLD decision

---

## Key Features

### 1. Multi-Agent AI Swarm

- 4 Qwen-powered agents working in consensus
- Real-time market analysis via Pacifica API
- Configurable confidence thresholds for execution

### 2. Automated Trading

- Auto-trading mode: executes when AI confidence ≥ 60%
- Manual trading: user confirms each decision
- Support for market and limit orders

### 3. Wallet-Native Security

- Phantom/Glow/Solflare wallet connection
- Ed25519 signature verification
- No custody - user stays in full control
- Agent wallet for programmatic trading

### 4. Pacifica Integration

- Direct integration with Pacifica Testnet API
- Real-time orderbook data, prices, positions
- Builder program support for fee rebates

### 5. Real-Time Dashboard

- Portfolio overview with P&L tracking
- AI agent confidence visualization
- Trade history and analytics

---

## Technical Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (Astro + React)               │
│  /dashboard  /trading  /swarm  /portfolio  /leaderboard      │
└─────────────────────────────┬───────────────────────────────┘
                              │ Wallet Auth (Ed25519)
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backend (Hono + Node.js)                  │
│   /health  /markets  /orders  /agent/analyze  /dashboard     │
└─────────────────────────────┬───────────────────────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         ▼                    ▼                    ▼
┌──────────────┐    ┌────────────────┐    ┌──────────────┐
│ Pacifica    │    │  AI Swarm      │    │  Database    │
│ Testnet API │    │  (OpenRouter)  │    │  (PostgreSQL)│
└──────────────┘    └────────────────┘    └──────────────┘
```

### Tech Stack

| Layer      | Technology                      |
| ---------- | ------------------------------- |
| Frontend   | Astro 4, React 18, Tailwind CSS |
| Backend    | Hono, Node.js, TypeScript       |
| AI         | OpenRouter (Qwen, GLM models)   |
| Database   | PostgreSQL + Drizzle ORM        |
| Blockchain | Solana (Phantom wallet)         |
| Exchange   | Pacifica Testnet API            |

---

## API Endpoints

| Endpoint                   | Method | Description         |
| -------------------------- | ------ | ------------------- |
| `/health`                  | GET    | Server health check |
| `/markets/info`            | GET    | All trading pairs   |
| `/markets/book?symbol=BTC` | GET    | Orderbook data      |
| `/agent/analyze`           | POST   | AI market analysis  |
| `/orders/create-market`    | POST   | Place market order  |
| `/orders/create-limit`     | POST   | Place limit order   |
| `/dashboard/*`             | GET    | Portfolio data      |

---

## Deployment

**Live URL:** https://pacfi-ai-production.up.railway.app

### Railway Deployment

- Builder: Nixpacks with pnpm
- Start: `pnpm --filter @pacfi/backend dev`
- Environment: Node.js 20

### Environment Variables

```
OPENROUTER_API_KEY=...
PACIFICA_AGENT_PRIVATE_KEY=...
PACIFICA_AGENT_ACCOUNT=...
NODE_ENV=production
```

---

## Submission Requirements Met

### Core Requirements

- ✅ Multi-agent AI system (4 Qwen agents)
- ✅ Real-time market data from Pacifica
- ✅ Automated and manual trading modes
- ✅ Wallet-native authentication
- ✅ Risk management (position sizing, stop-loss)

### Additional Features

- ✅ Frontend dashboard with React islands
- ✅ Leaderboard with trading stats
- ✅ Portfolio tracking
- ✅ Docker deployment ready
- ✅ Railway deployment working

---

## Future Enhancements

1. **Paper Trading Mode** - Test strategies without real money
2. **Stop-Loss/Take-Profit** - Automated exit conditions
3. **Multiple Timeframes** - 5m, 1H, 4H analysis
4. **Backtesting** - Test strategies on historical data
5. **More AI Models** - Gemini, Claude integration
6. **WebSocket** - Real-time price updates

---

## Team

Built for **Pacifica Hackathon & Builder Program**

- Solo developer with Claude AI assistance
- Open source: https://github.com/maulana-tech/pacfi-ai

---

## Conclusion

Pacfi AI demonstrates a working autonomous trading system using multi-agent AI consensus. It shows how AI can help retail traders make better decisions while maintaining full control of their funds through wallet-native authentication.

**Status:** Testnet only - Use at your own risk
