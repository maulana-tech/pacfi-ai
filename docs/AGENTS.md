# AGENTS.md

## Commands

```bash
pnpm install         # Install dependencies
pnpm dev             # Run all dev servers (parallel)
pnpm build           # Build all packages
pnpm type-check      # Type-check all packages
pnpm format          # Format with Prettier
pnpm db:init         # Initialize database (apps/backend/scripts/init-db.mjs)
```

### Per-app commands

```bash
cd apps/frontend && pnpm dev   # localhost:3000 (Astro + React)
cd apps/backend && pnpm dev    # localhost:3001 (Hono)
cd apps/backend && pnpm db:push # Push Drizzle schema
```

## Next Development

See [NEXT_DEV.md](./NEXT_DEV.md) for:

- Deep integrations (TradingAgents, Pacifica API, AI models)
- Feature enhancements (trading, analytics, agents)
- UI/UX improvements per page
- Priority roadmap and quick wins

## Structure

```
apps/
  ├── backend/       # Hono API, port 3001
  └── frontend/     # Astro + React islands, port 3000
packages/
  ├── shared/       # @pacfi/shared
  ├── ai-swarm/     # @pacfi/ai-swarm
  └── database/     # @pacfi/database (Drizzle)
```

## Pacifica API Integration

**Testnet**: `https://test-api.pacifica.fi/api/v1`
**Mainnet**: `https://api.pacifica.fi/api/v1`

### Available Endpoints (Tested)

| Endpoint      | Path                         | Description                  |
| ------------- | ---------------------------- | ---------------------------- |
| Market Info   | `GET /info`                  | All trading pairs with specs |
| Orderbook     | `GET /book?symbol=BTC`       | Real-time bid/ask            |
| Trades        | `GET /trades?symbol=BTC`     | Recent trades                |
| Create Order  | `POST /orders/create`        | Limit order                  |
| Create Market | `POST /orders/create_market` | Market order                 |

### API Agent Keys Setup

Get from: https://app.pacifica.fi/apikey

```bash
# .env.local
PACIFICA_AGENT_PRIVATE_KEY=<base58_private_key>
PACIFICA_AGENT_ACCOUNT=<agent_wallet_address>
```

## AI Models

Supported model providers (priority order):

| Provider       | Env Variable         | Deep Model                     | Quick Model                         |
| -------------- | -------------------- | ------------------------------ | ----------------------------------- |
| **OpenRouter** | `OPENROUTER_API_KEY` | google/gemma-4-26b-a4b-it:free | nvidia/nemotron-3-nano-30b-a3b:free |
| **GLM**        | `GLM_API_KEY`        | glm-4-plus                     | glm-4-flash                         |
| **DashScope**  | `DASHSCOPE_API_KEY`  | qwen-max                       | qwen-turbo                          |

Get keys from:

- OpenRouter: https://openrouter.ai/keys
- GLM: https://open.bigmodel.cn/
- DashScope: https://dashscope.console.aliyun.com/

## Key conventions

- **ESM**: All packages use `"type": "module"`
- **Path aliases**: `@pacfi/*` for workspace packages
- **Database**: Drizzle ORM with PostgreSQL (Neon/Supabase)
- **Error handling**: Use `AppError` class in backend
- **Imports order**: external → workspace → relative
- **Styling**: Tailwind CSS; light mode only, no gradients, no emojis

## TypeScript

- Strict mode enabled
- Prefer `interface` over `type` for object shapes
- Avoid `any` - use `unknown` with type guards
- Explicit return types on exported functions

## Tests

No test framework configured. When adding tests:

- Use Vitest
- Run single: `pnpm test -- src/file.test.ts`
- Run watch: `pnpm test:watch`

## Env setup

```bash
cp .env.example .env.local
```

Required vars:

- `DATABASE_URL` - PostgreSQL connection
- `PACIFICA_AGENT_PRIVATE_KEY` - Agent wallet private key (base58)
- `PACIFICA_AGENT_ACCOUNT` - Agent wallet address
- `DASHSCOPE_API_KEY` - Qwen AI API key
- `VITE_API_URL` - Frontend API URL (default: http://localhost:3001)
