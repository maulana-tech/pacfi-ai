FROM node:20-alpine

WORKDIR /app

# Copy all source files first
COPY . .

# Install pnpm and dependencies
RUN corepack enable && corepack prepare pnpm@9 --activate && \
    pnpm install --no-frozen-lockfile

# Build
RUN pnpm run build

# Expose port
EXPOSE 3001

# Start backend
CMD ["node", "apps/backend/dist/index.js"]