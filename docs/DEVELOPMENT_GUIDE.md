# Pacfi AI - Development Guide

## Project Setup

### Prerequisites

- Node.js 18+
- pnpm 8+
- PostgreSQL (Neon or Supabase)

### Installation

```bash
# Navigate to project directory
cd pacfi-ai

# Install dependencies
pnpm install

# Setup environment variables
cp .env.example .env.local
```

### Environment Variables

Edit `.env.local` with your configuration:

```
# Database (Neon or Supabase)
DATABASE_URL=postgresql://user:password@host:5432/pacfi_ai

# Pacifica API (Testnet)
PACIFICA_API_KEY=your_api_key
PACIFICA_API_SECRET=your_api_secret

# Qwen AI Model Studio
DASHSCOPE_API_KEY=your_dashscope_key

# Backend
NODE_ENV=development
PORT=3001
JWT_SECRET=your_jwt_secret_change_in_production

# Frontend
VITE_API_URL=http://localhost:3001
VITE_APP_NAME=Pacfi AI
```

## Development

### Running Development Servers

```bash
# Run all services in parallel
pnpm dev

# Or run individually:

# Backend (port 3001)
cd apps/backend && pnpm dev

# Frontend (port 3000)
cd apps/frontend && pnpm dev
```

### Project Structure

```
pacfi-ai/
├── apps/
│   ├── backend/          # Hono API server
│   │   ├── src/
│   │   │   ├── index.ts           # Main entry
│   │   │   ├── routes/            # API routes
│   │   │   ├── services/          # Business logic
│   │   │   ├── middleware/        # Auth, error handling
│   │   │   ├── types/             # TypeScript types
│   │   │   └── db/                # Database setup
│   │   └── package.json
│   │
│   └── frontend/         # Astro frontend
│       ├── src/
│       │   ├── pages/             # Astro pages
│       │   ├── components/        # React components
│       │   ├── layouts/           # Astro layouts
│       │   └── styles/            # Global CSS
│       └── package.json
│
├── packages/
│   ├── shared/           # Shared types
│   ├── ai-swarm/         # Qwen AI agents
│   └── database/         # Database schema
│
└── README.md
```

## Database Setup

### Using Neon (Recommended)

1. Create account at https://neon.tech
2. Create new project
3. Copy connection string to `.env.local`

### Using Supabase

1. Create account at https://supabase.com
2. Create new project
3. Copy PostgreSQL connection string to `.env.local`

### Create Tables

```bash
# Using Drizzle ORM (automatic on first connection)
# Tables will be created automatically based on schema
```

## Backend Development

### Adding New Routes

1. Create file in `apps/backend/src/routes/`
2. Define Hono router
3. Import and register in `apps/backend/src/index.ts`

Example:

```typescript
// apps/backend/src/routes/example.ts
import { Hono } from 'hono';

const router = new Hono();

router.get('/', (c) => {
  return c.json({ message: 'Hello' });
});

export { router as exampleRouter };
```

### Adding Services

Services contain business logic and are imported by routes.

Example:

```typescript
// apps/backend/src/services/example.ts
export class ExampleService {
  async doSomething() {
    // Implementation
  }
}
```

## Frontend Development

### Adding New Pages

Create `.astro` file in `apps/frontend/src/pages/`

```astro
---
import Layout from '../layouts/Layout.astro';
---

<Layout title="Page Title">
  <main>
    <!-- Content -->
  </main>
</Layout>
```

### Adding React Components

Create `.tsx` file in `apps/frontend/src/components/`

```tsx
export default function MyComponent() {
  return <div>Component</div>;
}
```

Use in Astro pages with `client:load` directive:

```astro
<MyComponent client:load />
```

## Performance Optimization

### Frontend (Astro)

- Use Astro for static content (fast LCP)
- Use React Islands only for interactive parts
- Lazy load components with `client:idle`
- Optimize images
- Minimize CSS

### Backend (Hono)

- Use connection pooling for database
- Cache frequently accessed data
- Implement rate limiting
- Use appropriate indexes on database

### Database

- Proper indexing on frequently queried columns
- Use connection pooling
- Monitor slow queries

## Testing

```bash
# Run tests (when implemented)
pnpm test

# Type checking
pnpm type-check

# Linting
pnpm lint
```

## Code Style

- Use TypeScript for all code
- Follow existing code patterns
- Use meaningful variable names
- Keep functions small and focused
- Add comments for complex logic

## Common Tasks

### Add New API Endpoint

1. Create route file in `apps/backend/src/routes/`
2. Define handler function
3. Register route in `index.ts`
4. Test with curl or Postman

### Add New Database Table

1. Add table definition to `packages/database/src/schema.ts`
2. Tables are created automatically on connection
3. Use in backend via `@pacfi/database` import

### Connect Frontend to Backend

```typescript
// In React component
const response = await fetch('/api/endpoint', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

## Troubleshooting

### Database Connection Error

- Check DATABASE_URL in .env.local
- Verify database is running
- Check network connectivity

### Port Already in Use

- Backend: Change PORT in .env.local
- Frontend: Change port in astro.config.mjs

### Module Not Found

- Ensure dependencies are installed: `pnpm install`
- Check import paths match file structure
- Verify workspace configuration

## Deployment (Future)

- Frontend: Deploy to Vercel
- Backend: Deploy to Cloudflare Workers or Railway
- Database: Use Neon or Supabase

## Resources

- [Hono Documentation](https://hono.dev)
- [Astro Documentation](https://docs.astro.build)
- [Drizzle ORM](https://orm.drizzle.team)
- [Pacifica API](https://docs.pacifica.fi)
- [Qwen Model Studio](https://dashscope.aliyun.com)
