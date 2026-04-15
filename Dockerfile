FROM node:20-alpine

WORKDIR /app

# Copy all source files first
COPY . .

# Install pnpm and dependencies
RUN corepack enable && corepack prepare pnpm@9 --activate && \
    pnpm install

# Build frontend - PUBLIC_API_URL is set at build time for Railway
RUN PUBLIC_API_URL=https://pacfi-ai-production.up.railway.app pnpm --filter @pacfi/frontend build

# Expose port
EXPOSE 3001

# Start backend with tsx - serves both API and frontend
CMD ["sh", "-c", "PORT=3001 pnpm --filter @pacfi/backend dev"]