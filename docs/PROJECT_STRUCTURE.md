# Pacfi AI - Project Structure

## Complete File Tree

```
pacfi-ai/
├── .env.example                    # Environment variables template
├── .gitignore                      # Git ignore rules
├── .prettierrc                     # Code formatting config
├── README.md                       # Project overview
├── DEVELOPMENT_GUIDE.md            # Development setup & guide
├── PROJECT_STRUCTURE.md            # This file
├── package.json                    # Root workspace config
├── pnpm-workspace.yaml             # pnpm workspaces config
├── tsconfig.json                   # Root TypeScript config
│
├── apps/
│   ├── backend/                    # Hono API Server
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts                # Main entry point
│   │       ├── types/
│   │       │   └── index.ts            # TypeScript type definitions
│   │       ├── db/
│   │       │   ├── index.ts            # Database initialization
│   │       │   └── schema.ts           # Database schema (Drizzle)
│   │       ├── middleware/
│   │       │   ├── auth.ts             # JWT authentication
│   │       │   └── error.ts            # Error handling
│   │       ├── routes/
│   │       │   └── health.ts           # Health check endpoint
│   │       └── services/
│   │           ├── pacifica.ts         # Pacifica API client
│   │           └── swarm.ts            # AI Swarm coordinator
│   │
│   └── frontend/                   # Astro Frontend
│       ├── package.json
│       ├── tsconfig.json
│       ├── astro.config.mjs
│       └── src/
│           ├── pages/
│           │   ├── index.astro         # Home page
│           │   └── dashboard.astro     # Dashboard page
│           ├── components/
│           │   ├── SwarmMonitor.tsx    # Live AI activity monitor
│           │   └── PortfolioStats.tsx  # Portfolio overview
│           ├── layouts/
│           │   └── Layout.astro        # Base layout
│           └── styles/
│               └── global.css          # Global styles
│
└── packages/
    ├── shared/                     # Shared Types & Utilities
    │   ├── package.json
    │   ├── tsconfig.json
    │   └── src/
    │       ├── index.ts
    │       └── types.ts             # Shared TypeScript types
    │
    ├── ai-swarm/                   # Qwen AI Swarm Engine
    │   ├── package.json
    │   ├── tsconfig.json
    │   └── src/
    │       ├── index.ts
    │       └── coordinator.ts       # SwarmCoordinator & QwenAgent
    │
    └── database/                   # Database Schema & ORM
        ├── package.json
        ├── tsconfig.json
        └── src/
            ├── index.ts
            └── schema.ts            # Drizzle ORM schema
```

## Directory Descriptions

### Root Level

- **package.json**: Monorepo root configuration with pnpm workspaces
- **pnpm-workspace.yaml**: Workspace definitions for apps and packages
- **tsconfig.json**: Root TypeScript configuration with path aliases
- **.env.example**: Template for environment variables
- **.gitignore**: Git ignore patterns
- **.prettierrc**: Code formatting rules
- **README.md**: Project overview and quick start
- **DEVELOPMENT_GUIDE.md**: Detailed development setup and guidelines
- **PROJECT_STRUCTURE.md**: This file

### apps/backend

Hono API server for handling trading logic, AI swarm coordination, and database operations.

- **index.ts**: Main entry point, sets up Hono app with middleware and routes
- **types/index.ts**: TypeScript interfaces for User, Portfolio, Trade, etc.
- **db/index.ts**: Drizzle ORM database initialization
- **db/schema.ts**: Database table definitions (users, portfolios, trades, etc.)
- **middleware/auth.ts**: JWT token generation and verification
- **middleware/error.ts**: Global error handling
- **routes/health.ts**: Health check endpoint
- **services/pacifica.ts**: Pacifica API client for trading operations
- **services/swarm.ts**: QwenAgent and SwarmCoordinator for AI decision making

### apps/frontend

Astro frontend with React islands for interactive components.

- **astro.config.mjs**: Astro configuration
- **pages/index.astro**: Home page with feature overview
- **pages/dashboard.astro**: Main dashboard layout
- **components/SwarmMonitor.tsx**: React component showing live AI activity
- **components/PortfolioStats.tsx**: React component showing portfolio metrics
- **layouts/Layout.astro**: Base Astro layout with HTML structure
- **styles/global.css**: Global CSS with light mode theme

### packages/shared

Shared types and utilities used across the monorepo.

- **types.ts**: TypeScript interfaces for User, Portfolio, Trade, SwarmDecision, etc.
- **index.ts**: Exports all shared types

### packages/ai-swarm

Qwen AI swarm agent implementation for autonomous trading decisions.

- **coordinator.ts**: QwenAgent class and SwarmCoordinator for multi-agent consensus
- **index.ts**: Exports AI components

### packages/database

Database schema and ORM configuration.

- **schema.ts**: Drizzle ORM table definitions with relations
- **index.ts**: Database initialization and exports

## Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | Astro | Static site generation with fast LCP |
| Frontend | React | Interactive components (islands) |
| Frontend | CSS | Light mode styling |
| Backend | Hono | Ultra-fast edge-ready API framework |
| Backend | TypeScript | Type-safe backend code |
| Database | PostgreSQL | Relational database (Neon/Supabase) |
| Database | Drizzle ORM | Type-safe ORM |
| AI | Qwen | Multi-agent reasoning via Model Studio |
| Trading | Pacifica API | Perpetuals trading integration |

## Key Features

### Backend Features

- JWT authentication with token generation/verification
- Pacifica API client for order placement and market data
- Qwen AI Swarm with multi-agent consensus
- Database schema with proper indexing
- Error handling and logging
- Type-safe operations with TypeScript

### Frontend Features

- Static page generation with Astro (fast LCP)
- React islands for interactive components
- Real-time AI activity monitoring
- Portfolio statistics dashboard
- Light mode UI with clean design
- Responsive layout

### AI Swarm Features

- Market Analyst Agent: Technical analysis
- Sentiment Agent: Market sentiment analysis
- Risk Manager Agent: Position sizing and risk calculation
- Coordinator Agent: Final decision making
- Explainable AI with reasoning logs

## Development Workflow

1. **Setup**: Install dependencies with `pnpm install`
2. **Environment**: Configure `.env.local` with API keys
3. **Development**: Run `pnpm dev` to start all services
4. **Backend**: Develop routes and services in `apps/backend/src`
5. **Frontend**: Create pages and components in `apps/frontend/src`
6. **Database**: Update schema in `packages/database/src/schema.ts`
7. **Testing**: Test API endpoints and UI components
8. **Deployment**: Ready for Vercel (frontend) and Railway/Cloudflare (backend)

## Performance Optimization

### Frontend (Astro)

- Static HTML generation for fast LCP
- React islands only for interactive parts
- Lazy loading with `client:idle`
- Minimal CSS with light mode
- No gradients or animations (performance)

### Backend (Hono)

- Edge-ready framework for low latency
- Connection pooling for database
- Efficient JSON serialization
- Proper error handling

### Database (PostgreSQL)

- Indexed columns for fast queries
- Proper relationships and constraints
- Connection pooling via Neon/Supabase

## Monorepo Benefits

- **Code Sharing**: Shared types and utilities across apps
- **Dependency Management**: Single package manager (pnpm)
- **Type Safety**: Unified TypeScript configuration
- **Development**: Run all services with single command
- **Scalability**: Easy to add new packages or apps

## Next Steps

1. Install dependencies: `pnpm install`
2. Configure environment variables in `.env.local`
3. Start development: `pnpm dev`
4. Access frontend at http://localhost:3000
5. Access backend at http://localhost:3001
6. Check health: http://localhost:3001/health
