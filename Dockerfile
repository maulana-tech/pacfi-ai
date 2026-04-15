FROM node:20-alpine

WORKDIR /app

# Copy all source files first
COPY . .

# Install pnpm and dependencies
RUN corepack enable && corepack prepare pnpm@9 --activate && \
    pnpm install

# Build only frontend
RUN pnpm --filter @pacfi/frontend build

# Expose port
EXPOSE 3001

# Start backend - use npx to run tsx from node_modules
CMD ["pnpm", "--filter", "@pacfi/backend", "dev"]