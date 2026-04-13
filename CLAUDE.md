# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Pacfi AI is an autonomous AI swarm trading platform for Pacifica (a Solana perpetuals exchange). It uses a multi-agent Qwen/Dashscope system to make trading decisions with wallet-based authentication (no JWT — Ed25519 signature verification).

## Commands

### Root (run from repo root)
```bash
pnpm install          # Install all dependencies
pnpm dev              # Run frontend (port 3000) + backend (port 3001) in parallel
pnpm build            # Build all packages
pnpm type-check       # Type-check all packages
pnpm format           # Format with Prettier
pnpm db:init          # Initialize database (node apps/backend/scripts/init-db.mjs)
```

### Backend (`apps/backend`)
```bash
pnpm dev              # Run Hono server with tsx watch
pnpm build            # Compile TypeScript
pnpm db:generate      # Generate Drizzle migrations
pnpm db:migrate       # Run migrations
pnpm db:push          # Push schema directly (dev)
pnpm db:studio        # Open Drizzle Studio GUI
```

### Frontend (`apps/frontend`)
```bash
pnpm dev              # Astro dev server on port 3000
pnpm build            # Build static site
pnpm preview          # Preview built site
pnpm type-check       # Type-check frontend
```

> No test framework or ESLint is configured — Prettier is the only formatter.

## Architecture

### Monorepo Layout
```
apps/
  backend/      — Hono REST API (Node.js, port 3001)
  frontend/     — Astro + React islands (port 3000)
packages/
  shared/       — Shared TypeScript types (User, Portfolio, Trade, SwarmDecision)
  ai-swarm/     — QwenAgent + SwarmCoordinator (Dashscope/Qwen integration)
  database/     — Drizzle client + schema (mirrors apps/backend/db/)
```

### Request Flow
```
User Wallet (Phantom/Glow)
  → Frontend signs order payload with Ed25519
  → Backend validates X-Wallet-Address + X-Signature + X-Timestamp headers
  → SwarmCoordinator runs 4 Qwen agents (Market Analyst, Sentiment, Risk Manager, Coordinator)
  → Order submitted to Pacifica API
  → Trade stored in PostgreSQL
  → Dashboard updated via polling
```

### Authentication
Wallet-based only — no sessions, no tokens. Every request includes:
- `X-Wallet-Address` — user's Solana wallet public key
- `X-Signature` — Ed25519 signature of the request payload
- `X-Timestamp` — request timestamp for replay protection

The backend extracts wallet context in `apps/backend/src/middleware/auth.ts`. Signature verification is in `apps/backend/src/services/signing.ts`.

### Backend Routes (`apps/backend/src/routes/`)
| File | Prefix | Purpose |
|------|--------|---------|
| `health.ts` | `/health` | Server health check |
| `orders.ts` | `/orders` | Market/limit orders, positions, balance |
| `dashboard.ts` | `/dashboard` | Portfolio summary, trades, swarm status |
| `builder.ts` | `/builder` | Builder fee approvals/revocations |
| `agent.ts` | `/agent` | Agent wallet status |

### Frontend Pages (`apps/frontend/src/pages/`)
Astro pages are thin wrappers that import React island components for interactivity:
- `dashboard.astro` → `DashboardContent.tsx`
- `portfolio.astro` → `PortfolioContent.tsx`
- `trading.astro` → `TradingContent.tsx`
- `swarm.astro` → `SwarmContent.tsx`
- `leaderboard.astro` → `LeaderboardContent.tsx`
- `builder.astro` → `BuilderContent.tsx`

### Database Schema (PostgreSQL via Drizzle)
6 tables: `users` (wallet_address as unique key), `portfolios` (1:1 with users), `trades`, `ai_logs` (agent decision history), `leaderboard` (cached rankings), `strategies` (JSON config per user).

### AI Swarm (`packages/ai-swarm/src/coordinator.ts`)
`SwarmCoordinator` orchestrates 4 `QwenAgent` instances sequentially. Each agent returns structured JSON (decision, confidence, reasoning). The coordinator synthesizes a final `SwarmDecision`. Uses Dashscope API with model `qwen-max`.

## Environment Variables

Copy `.env.example` to `.env` in `apps/backend/`:

```env
DATABASE_URL=postgresql://user:password@host:5432/pacfi_ai   # Neon or Supabase
DASHSCOPE_API_KEY=your_key                                    # Qwen/Dashscope AI
PACIFICA_AGENT_PRIVATE_KEY=base58_key                        # Optional: agent wallet mode
PACIFICA_AGENT_PUBLIC_KEY=public_key
PACIFICA_AGENT_ACCOUNT=main_wallet
NODE_ENV=development
PORT=3001
```

Frontend uses `PUBLIC_API_URL=http://localhost:3001` (Astro public env prefix required).

## Key Conventions

- **Package manager:** pnpm with workspaces. Never use npm or yarn.
- **Path aliases:** `@pacfi/shared`, `@pacfi/ai-swarm`, `@pacfi/database` (defined in root `tsconfig.json`).
- **TypeScript:** Strict mode, ES2020 target across all packages.
- **Formatting:** Prettier with 100-char line width, single quotes, trailing commas, 2-space indent.
- **API responses:** All backend responses use `success`/`error` envelope from `apps/backend/src/lib/api.ts`.
- **Tailwind theme:** Primary color `#2563EB`, extended with `success`, `danger`, `warning` tokens (see `tailwind.config.js`).

## Known Implementation Gaps

- Portfolio and Swarm pages use mock/simulated data in some sections.
- No automated tests exist yet.
- Some docs in `/docs/` reference JWT auth (outdated — wallet-based auth replaced it).
