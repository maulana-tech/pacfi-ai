FROM node:20-alpine

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@8 --activate

# Copy workspace files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./

# Copy app/package files
COPY apps/backend/package.json ./apps/backend/
COPY apps/frontend/package.json ./apps/frontend/
COPY packages/*/package.json ./packages/

# Install dependencies (workspace)
RUN pnpm install --frozen-lockfile

# Copy source code
COPY apps ./apps
COPY packages ./packages

# Build
RUN pnpm run build

# Expose ports
EXPOSE 3001

# Start backend
CMD ["node", "apps/backend/dist/index.js"]