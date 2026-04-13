# Deployment Guide

## Prerequisites

- Docker & Docker Compose
- Node.js 18+ (for local development)
- Pacifica API keys (testnet): https://app.pacifica.fi/apikey

## Environment Setup

1. Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

2. Fill in the environment variables:

```env
# Required for AI Agents (at least one)
OPENROUTER_API_KEY=your_openrouter_key   # Get from https://openrouter.ai/keys
DASHSCOPE_API_KEY=your_dashscope_key     # Get from https://dashscope.console.aliyun.com/

# Required for programmatic trading
PACIFICA_AGENT_PRIVATE_KEY=your_key
PACIFICA_AGENT_ACCOUNT=your_account

# Production
NODE_ENV=production
PORT=3001
JWT_SECRET=generate_random_string
```

## Deployment Options

### Option 1: Docker Compose (Recommended)

```bash
# Build and run
docker-compose up --build

# Run in background
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

Services:

- Backend: http://localhost:3001
- Frontend: http://localhost:3000

### Option 2: Manual Build

```bash
# Install dependencies
pnpm install

# Build
pnpm run build

# Run backend
cd apps/backend && node dist/index.js
```

### Option 3: Deploy to Cloud

#### Railway

```bash
# Install railway CLI
npm i -g @railway/cli

# Login
railway login

# Init project
railway init

# Deploy
railway up
```

#### Render

1. Connect GitHub repo to Render
2. Set build command: `pnpm run build`
3. Set start command: `node apps/backend/dist/index.js`
4. Add environment variables

#### Vercel (Frontend)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy frontend
cd apps/frontend
vercel --prod
```

## Architecture

```
┌─────────────────────────────────────────────┐
│                 Nginx (Port 3000)           │
│        (Reverse Proxy + Static Files)        │
└──────────┬──────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────┐
│            Backend (Port 3001)              │
│  ┌─────────┐ ┌─────────┐ ┌─────────────┐   │
│  │ Trading │ │ Market  │ │ Agent API   │   │
│  │ Agents  │ │ Data    │ │ (Swarm AI) │   │
│  └────┬────┘ └────┬────┘ └──────┬──────┘   │
└───────┼───────────┼─────────────┼───────────┘
        │           │             │
        ▼           ▼             ▼
┌──────────────┐ ┌──────────┐ ┌─────────────┐
│ Pacifica API │ │External │ │  AI Models │
│ (Testnet)    │ │ REST    │ │(OpenRouter)│
└──────────────┘ └──────────┘ └─────────────┘
```

## Health Check

```bash
curl http://localhost:3001/health
```

Expected response:

```json
{ "success": true, "data": "OK" }
```

## Troubleshooting

### Backend won't start

- Check `.env.local` is present
- Verify port 3001 is not in use

### AI Agents not working

- Ensure `OPENROUTER_API_KEY` or `DASHSCOPE_API_KEY` is set
- Check logs: `docker-compose logs backend`

### Pacifica trading not working

- Verify `PACIFICA_AGENT_PRIVATE_KEY` and `PACIFICA_AGENT_ACCOUNT` are correct
- Ensure you're using testnet keys for testnet deployment
