FROM node:20-alpine

WORKDIR /app

# Copy all source files first
COPY . .

# Install pnpm and dependencies
RUN corepack enable && corepack prepare pnpm@9 --activate && \
    pnpm install

# Build only frontend (backend runs with tsx)
RUN pnpm --filter @pacfi/frontend build

# Expose port
EXPOSE 3001

# Start backend with tsx
CMD ["npx", "tsx", "apps/backend/src/index.ts"]