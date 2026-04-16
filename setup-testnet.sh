#!/bin/bash
# Quick startup script for Pacfi AI Testnet Development
# Run this to quickly verify your environment is ready

set -e

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  Pacfi AI - Testnet Quick Setup                               ║"
echo "║  Pacifica Hackathon - Submission Deadline: April 16, 2026     ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "📋 Checking prerequisites..."
echo ""

# Check Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    echo -e "${GREEN}✓${NC} Node.js installed: $NODE_VERSION"
else
    echo -e "${RED}✗${NC} Node.js not found. Please install Node.js 18+"
    exit 1
fi

# Check pnpm
if command -v pnpm &> /dev/null; then
    PNPM_VERSION=$(pnpm -v)
    echo -e "${GREEN}✓${NC} pnpm installed: $PNPM_VERSION"
else
    echo -e "${RED}✗${NC} pnpm not found. Install with: npm install -g pnpm"
    exit 1
fi

# Check PostgreSQL
if command -v psql &> /dev/null; then
    echo -e "${GREEN}✓${NC} PostgreSQL installed"
else
    echo -e "${YELLOW}⚠${NC}  PostgreSQL not found (optional - app can work without DB)"
fi

echo ""
echo "🔧 Checking project setup..."
echo ""

# Check .env.local
if [ -f ".env.local" ]; then
    echo -e "${GREEN}✓${NC} .env.local exists"
    
    if grep -q "PACIFICA_BASE_URL" .env.local; then
        echo -e "${GREEN}✓${NC} Pacifica API configured"
    else
        echo -e "${YELLOW}⚠${NC}  Pacifica API not configured in .env.local"
    fi
    
    if grep -q "PUBLIC_SOLANA_RPC_URL" .env.local; then
        echo -e "${GREEN}✓${NC} Solana RPC endpoint configured"
    else
        echo -e "${YELLOW}⚠${NC}  Solana RPC endpoint not configured"
    fi
else
    echo -e "${YELLOW}⚠${NC}  .env.local not found. Copying from .env.example..."
    cp .env.example .env.local
    echo -e "${GREEN}✓${NC} .env.local created. Please edit with your configuration."
fi

echo ""
echo "📦 Checking dependencies..."
echo ""

if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    pnpm install
    echo -e "${GREEN}✓${NC} Dependencies installed"
else
    echo -e "${GREEN}✓${NC} Dependencies already installed"
fi

echo ""
echo "🚀 Ready to start!"
echo ""
echo "Next steps:"
echo "1. Edit .env.local with your configuration:"
echo "   - Set PACIFICA_AGENT_ACCOUNT to your Phantom wallet address"
echo "   - Add your AI provider API key (OpenRouter, GLM, or DashScope)"
echo ""
echo "2. Initialize database (if PostgreSQL is running):"
echo "   ${YELLOW}pnpm db:init${NC}"
echo ""
echo "3. Start development server:"
echo "   ${YELLOW}pnpm dev${NC}"
echo ""
echo "4. Open browser:"
echo "   ${YELLOW}http://localhost:3000${NC}"
echo ""
echo "📚 For detailed setup instructions, see: TESTNET_SETUP.md"
echo ""
