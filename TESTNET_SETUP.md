# Pacfi AI - Testnet Configuration Guide

**Last Updated**: April 2026  
**Purpose**: Complete setup and verification for Pacifica Testnet trading execution

## Overview

Pacfi AI is configured to run on **Pacifica Testnet** using **Solana Devnet**. This guide ensures your local environment is correctly set up to participate in the Pacifica hackathon with real trading execution on testnet.

---

## Network Configuration

### Pacifica Testnet
- **API Endpoint**: `https://test-api.pacifica.fi/api/v1`
- **Web App**: `https://test-app.pacifica.fi/`
- **Access Code**: "Pacifica"
- **Solana Network**: Devnet

### Solana Devnet
- **RPC Endpoint**: `https://api.devnet.solana.com`
- **Explorer**: `https://solscan.io/?cluster=devnet`
- **Faucet**: Free SOL available for testing

---

## Prerequisites

### 1. Wallet Setup
- **Wallet**: Phantom, Glow, Solflare, or Backpack
- **Network**: Switch wallet to Solana **Devnet** (not Mainnet)
- **Testnet SOL**: Request from [Solana Devnet Faucet](https://faucet.solana.com/)

### 2. Pacifica Account
- Visit: `https://test-app.pacifica.fi/`
- Use code: **"Pacifica"**
- Connect your wallet

### 3. API Keys (at least one required)
Choose one AI provider:
- **OpenRouter**: https://openrouter.ai/keys
- **GLM (Zhipu)**: https://open.bigmodel.cn/
- **DashScope (Qwen)**: https://dashscope.console.aliyun.com/

---

## Environment Setup

### Step 1: Copy Environment Template

```bash
cp .env.example .env.local
```

### Step 2: Configure .env.local

```env
# ============================================================================
# NETWORK (Testnet - Already Default)
# ============================================================================

# Pacifica API (Testnet)
PACIFICA_BASE_URL=https://test-api.pacifica.fi/api/v1

# Solana RPC (Devnet for testnet, Mainnet-Beta for production)
PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com

# ============================================================================
# WALLET CONFIGURATION
# ============================================================================

# Agent Wallet (for automated trading - optional)
# Get from: https://app.pacifica.fi/apikey
PACIFICA_AGENT_PRIVATE_KEY=your_agent_private_key_base58
PACIFICA_AGENT_ACCOUNT=your_connected_wallet_address

# ============================================================================
# AI MODELS (Choose at least one)
# ============================================================================

# Option A: OpenRouter (Recommended - Free tier available)
OPENROUTER_API_KEY=sk-or-v1-...
OPENROUTER_MODEL=google/gemma-3-27b-it:free
OPENROUTER_QUICK_MODEL=google/gemma-3-12b-it:free

# Option B: GLM (Zhipu AI)
# GLM_API_KEY=...

# Option C: DashScope (Qwen)
# DASHSCOPE_API_KEY=...

# ============================================================================
# APPLICATION SERVICES
# ============================================================================

# Database
DATABASE_URL=postgresql://postgres:root@localhost:5432/pacfi_ai

# Frontend
VITE_API_URL=http://localhost:3001
VITE_APP_NAME=Pacfi AI

# Backend
NODE_ENV=development
PORT=3001
API_URL=http://localhost:3001
JWT_SECRET=your_development_secret_change_in_production
```

---

## Running on Testnet

### Step 1: Install Dependencies

```bash
pnpm install
```

### Step 2: Initialize Database (if needed)

```bash
pnpm db:init
```

### Step 3: Start Development Server

```bash
pnpm dev
```

Services will start on:
- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:3001

---

## Wallet Connection Flow

### For Browser/Frontend Users:
1. Click "Connect Wallet" on the dashboard
2. Select your wallet (Phantom, Glow, etc.)
3. Ensure wallet is on **Solana Devnet**
4. Approve connection to Pacfi AI
5. Headers automatically include `X-Wallet-Address`

### For Agent Wallet (Optional):
1. Agent uses `PACIFICA_AGENT_PRIVATE_KEY` for autonomous trading
2. No wallet popup needed
3. Trades execute under agent account

---

## Testing Your Setup

### Test 1: Verify Pacifica API Connectivity

```bash
curl -s "https://test-api.pacifica.fi/api/v1/info" | jq '.data | length'
# Should return a number (market count)
```

### Test 2: Check Wallet Connection

1. Open http://localhost:3000
2. Click "Connect Wallet"
3. Approve transaction in wallet extension
4. Should display your wallet address and balance

### Test 3: Verify Backend AI Integration

```bash
# Check if OpenRouter is working
curl -s http://localhost:3001/health | jq '.data.status'
# Should return "ok"
```

### Test 4: Place a Test Order (on Testnet)

1. Go to Trading page
2. Select a market (e.g., BTC-USDC)
3. Enter order details
4. Click "Place Order"
5. Sign transaction in wallet
6. Verify order appears in history

---

## Troubleshooting

### Issue: "Network switched" or wallet connection errors

**Solution**: 
- Ensure your Phantom/Glow wallet is on **Solana Devnet** (not Mainnet)
- Check Settings → Network → Select Devnet
- Disconnect and reconnect

### Issue: "Insufficient balance" on testnet

**Solution**:
- Request free SOL from [Solana Devnet Faucet](https://faucet.solana.com/)
- Paste your wallet address and request tokens

### Issue: Orders fail with "Invalid symbol"

**Solution**:
- Check available symbols: https://test-api.pacifica.fi/api/v1/info
- Use format like `BTC-USDC` instead of just `BTC`

### Issue: AI agent decisions not showing

**Solution**:
- Verify API key is set (OPENROUTER_API_KEY, GLM_API_KEY, or DASHSCOPE_API_KEY)
- Check backend logs: `pnpm dev` terminal for errors
- Ensure key has sufficient credits

### Issue: Database connection errors

**Solution**:
- Ensure PostgreSQL is running locally
- Run `pnpm db:init` to setup schema
- Check DATABASE_URL in .env.local

---

## Production Checklist (Before Hackathon Submission)

- [ ] All wallet addresses match between Phantom and .env
- [ ] Testnet SOL balance > 1 SOL for gas fees
- [ ] API keys configured and tested
- [ ] Database initialized and migrations run
- [ ] Frontend can connect to wallet
- [ ] Backend can place orders on Pacifica testnet
- [ ] Swarm decision logic configured
- [ ] Dashboard shows real testnet data
- [ ] Demo video captures trading flow on testnet

---

## Important Notes

### Network Safety
- **Testnet Only**: This configuration ONLY works on Solana Devnet
- **No Real Funds**: Testnet tokens have no value
- **Never on Mainnet**: Do NOT use mainnet wallet keys or endpoints in development

### Wallet Security
- **Never commit .env.local** to git
- **Private keys are sensitive**: Use testnet keys only
- **Agent wallet optional**: Can trade without it using browser wallet

### API Rate Limits
- OpenRouter free tier: Limited requests per day
- Implement request throttling for production

---

## Resources

### Pacifica
- Docs: https://docs.pacifica.fi/
- API: https://docs.pacifica.fi/api-documentation/api
- Builder Program: https://docs.pacifica.fi/builder-program
- Support: Discord Builder Channel

### Solana
- Devnet Faucet: https://faucet.solana.com/
- Explorer: https://solscan.io/?cluster=devnet
- Documentation: https://docs.solana.com/

### Tools
- Phantom Wallet: https://phantom.app/
- Glow Wallet: https://www.glowsol.com/
- Solscan: https://solscan.io/

---

## Next Steps

1. **Configure .env.local** with your values
2. **Run `pnpm dev`** to start server
3. **Test wallet connection** on localhost:3000
4. **Place test orders** on Pacifica testnet
5. **Review demo video** requirements and record
6. **Submit before April 16, 2026** ⏰

Good luck with the Pacifica Hackathon! 🚀
