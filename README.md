# Pacfi AI - Autonomous AI Swarm Trading Platform

<p align="center">
  <img src="https://img.shields.io/badge/Pacifica-Hackathon-blue" alt="Pacifica Hackathon">
  <img src="https://img.shields.io/badge/Status-Testnet-orange" alt="Status">
  <img src="https://img.shields.io/badge/License-MIT-green" alt="License">
</p>

**Pacfi AI** is an autonomous AI swarm trading platform for Pacifica perpetuals exchange. It uses a multi-agent Qwen AI system to continuously analyze markets, manage risk, and execute trades on Solana-based Pacifica testnet - fully automated and transparent.

---

## 🌟 Features

### Multi-Agent AI Swarm

- **4 specialized AI agents** working in consensus:
  - Market Analyst (technical analysis)
  - Sentiment Agent (market sentiment)
  - Risk Manager (position sizing & stop-loss)
  - Coordinator (final BUY/SELL/HOLD decision)
- Configurable confidence threshold for auto-execution

### Trading

- **Auto-Trading Mode**: Executes when AI confidence ≥ 60%
- **Manual Trading**: User confirms each decision
- Market and limit order support
- Real-time position tracking

### Wallet-Native Security

- Phantom, Glow, Solflare wallet support
- Ed25519 signature verification
- No custody - you stay in full control
- Builder program support for fee rebates

### Dashboard

- Portfolio overview with P&L
- AI agent confidence visualization
- Trade history & analytics
- Leaderboard

---

## 🛠️ Tech Stack

| Layer      | Technology                      |
| ---------- | ------------------------------- |
| Frontend   | Astro 4, React 18, Tailwind CSS |
| Backend    | Hono, Node.js, TypeScript       |
| AI         | OpenRouter (Qwen, GLM)          |
| Database   | PostgreSQL + Drizzle ORM        |
| Blockchain | Solana                          |
| Exchange   | Pacifica Testnet API            |

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- pnpm 9+

### Installation

```bash
# Clone the repository
git clone https://github.com/maulana-tech/pacfi-ai.git
cd pacfi-ai

# Install dependencies
pnpm install

# Setup environment
cp .env.example .env.local
# Edit .env.local with your API keys
```

### Run Development

```bash
# Run both frontend and backend
pnpm dev
```

- Frontend: http://localhost:3000
- Backend: http://localhost:3001

---

## 📡 API Endpoints

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

## 🔧 Environment Variables

```env
# AI Models (choose one)
OPENROUTER_API_KEY=your_openrouter_key
GLM_API_KEY=your_glm_key
DASHSCOPE_API_KEY=your_dashscope_key

# Pacifica (Testnet)
PACIFICA_AGENT_PRIVATE_KEY=your_agent_private_key
PACIFICA_AGENT_ACCOUNT=your_agent_account

# Frontend
PUBLIC_API_URL=http://localhost:3001

# Backend
NODE_ENV=development
PORT=3001
```

---

## 🐳 Docker Deployment

```bash
# Build and run
docker-compose up --build

# Or use Railway (see DEPLOYMENT.md)
```

---

## 🌐 Live Demo

**Production URL:** https://pacfi-ai-production.up.railway.app

> ⚠️ **Testnet Only** - Use at your own risk

---

## 📁 Project Structure

```
pacfi-ai/
├── apps/
│   ├── backend/           # Hono API server (port 3001)
│   └── frontend/          # Astro + React (port 3000)
├── packages/
│   ├── shared/            # Shared types
│   ├── ai-swarm/          # TradingAgents implementation
│   └── database/           # Drizzle schema
├── docs/                   # Documentation
├── Dockerfile
├── docker-compose.yml
├── railway.json
└── pnpm-workspace.yaml
```

---

## 📄 Documentation

- [DEPLOYMENT.md](./DEPLOYMENT.md) - Deployment guide
- [SUBMISSION.md](./SUBMISSION.md) - Hackathon submission
- [docs/](./docs/) - Additional documentation

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

---

## 📝 License

MIT License - See [LICENSE](./LICENSE) for details.

---

## ⚠️ Disclaimer

This project is for **educational purposes only**.

- Testnet only - no real funds involved
- Trading bots can lose money
- Use at your own risk
- Always do your own research
