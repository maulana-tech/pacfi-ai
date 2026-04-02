# Pacfi AI - Autonomous Trading Swarm Platform

Pacfi AI adalah platform trading autonomous yang menggunakan multi-agent AI swarm untuk membuat keputusan trading yang intelligent di Pacifica perpetuals exchange.

## Project Structure

```
pacfi-ai/
├── apps/
│   ├── backend/          # Hono API server
│   └── frontend/         # Astro frontend
├── packages/
│   ├── shared/           # Shared types & utilities
│   ├── ai-swarm/         # Qwen AI Swarm implementation
│   └── database/         # Database schema & migrations
├── package.json          # Root package.json (workspaces)
└── pnpm-workspace.yaml   # pnpm workspace config
```

## Tech Stack

- **Frontend**: Astro + React (islands)
- **Backend**: Hono (Edge-ready)
- **Database**: PostgreSQL (Neon/Supabase)
- **AI**: Qwen (Model Studio)
- **ORM**: Drizzle
- **Package Manager**: pnpm

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm 8+
- PostgreSQL connection string (Neon or Supabase)

### Installation

```bash
# Install dependencies
pnpm install

# Setup environment variables
cp .env.example .env.local

# Run development servers
pnpm dev
```

## Development

### Frontend Development

```bash
cd apps/frontend
pnpm dev
```

Frontend akan berjalan di `http://localhost:3000`

### Backend Development

```bash
cd apps/backend
pnpm dev
```

Backend akan berjalan di `http://localhost:3001`

## Project Features

- Autonomous AI Swarm Trading (Multi-agent consensus)
- Real-time Dashboard dengan live AI activity monitoring
- Social Copy Trading (Clone successful trader strategies)
- Advanced Risk Management
- Leaderboard & Performance Tracking
- Pacifica Testnet Integration

## Performance Targets

- LCP: < 2.5s
- FID: < 100ms
- CLS: < 0.1
- TTL: < 3s

## Environment Variables

```
# Database
DATABASE_URL=postgresql://...

# Pacifica
PACIFICA_API_KEY=...
PACIFICA_API_SECRET=...

# AI
DASHSCOPE_API_KEY=...

# Frontend
VITE_API_URL=http://localhost:3001
```

## License

MIT
