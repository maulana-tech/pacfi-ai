# AGENTS.md

This file provides guidelines for AI agents working on the Pacfi AI codebase.

## Build Commands

```bash
# Install dependencies
pnpm install

# Run all dev servers (parallel)
pnpm dev

# Build all packages
pnpm build

# Type-check all packages
pnpm type-check

# Format code with Prettier
pnpm format
```

### App-Specific Commands

```bash
# Frontend (Astro)
cd apps/frontend && pnpm dev        # localhost:3000
cd apps/frontend && pnpm build
cd apps/frontend && pnpm type-check

# Backend (Hono)
cd apps/backend && pnpm dev         # localhost:3001
cd apps/backend && pnpm build
```

### Single Test Commands

No test framework is currently configured. When adding tests:

- Use Vitest for unit tests (preferred)
- Run single test: `pnpm test -- src/component.test.ts`
- Run tests in watch mode: `pnpm test:watch`

## Code Style Guidelines

### TypeScript

- Use strict TypeScript (`strict: true` in tsconfig)
- Prefer `interface` over `type` for object shapes
- Use explicit return types on exported functions
- Avoid `any` - use `unknown` with type guards instead

### Formatting (Prettier)

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "arrowParens": "always"
}
```

### Naming Conventions

- Files: `kebab-case.ts` or `PascalCase.tsx` for components
- Components: `PascalCase` (e.g., `Button.tsx`, `WalletConnect.tsx`)
- Functions/variables: `camelCase`
- Constants: `UPPER_SNAKE_CASE` for true constants
- Interfaces/Types: `PascalCase` with descriptive names (e.g., `UserProfile`, `TradeData`)
- Enums: `PascalCase` with `UPPER_SNAKE_CASE` values

### Imports

```typescript
// 1. External libraries (sorted)
import { Hono } from 'hono';
import { cors } from 'hono/cors';

// 2. Workspace packages
import { SwarmCoordinator } from '@pacfi/ai-swarm';
import type { User, Trade } from '@pacfi/shared';

// 3. Relative imports
import { db } from '../db';
import { healthRouter } from './routes/health';
```

### Error Handling

```typescript
// Use AppError class for HTTP errors
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

// Log errors with context
console.error('[Orders] Error creating order:', error);

// Return safe error messages
return c.json(
  {
    error: error instanceof Error ? error.message : 'Unknown error',
  },
  500
);
```

### React Components

```typescript
interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  onClick,
}: ButtonProps) {
  // Component logic
}
```

### Astro Pages

```astro
---
import Layout from '../layouts/Layout.astro';
import DashboardContent from '../components/DashboardContent';
---

<Layout title="Page Title">
  <DashboardContent client:load />
</Layout>
```

## Project Structure

```
pacfi-ai/
├── apps/
│   ├── backend/          # Hono API (port 3001)
│   └── frontend/         # Astro + React (port 3000)
├── packages/
│   ├── shared/           # Types & utilities (@pacfi/shared)
│   ├── ai-swarm/         # AI coordination (@pacfi/ai-swarm)
│   └── database/         # Drizzle schema (@pacfi/database)
```

## Key Conventions

1. **ES Modules**: All packages use `"type": "module"`
2. **Path Aliases**: Use `@pacfi/*` for workspace packages
3. **Database**: Use Drizzle ORM with PostgreSQL
4. **API**: Use Hono with proper error handling middleware
5. **Styling**: Tailwind CSS with inline styles for landing pages
6. **Icons**: Inline SVG icons (no icon libraries)
7. **Theme**: Light mode only, no gradients, no emojis

## Performance Targets

- LCP: < 2.5s
- FID: < 100ms
- CLS: < 0.1
- Total Load Time: < 3s
