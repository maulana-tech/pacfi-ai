# Pacfi AI - Quick Reference Guide

**For Hackathon Participants** | **Deadline: April 16, 2026**

---

## 🚀 30-Second Setup

```bash
pnpm install
cp .env.example .env.local
# Edit .env.local - add your wallet address and API key
pnpm dev
# Open http://localhost:3000
```

---

## 🔗 Essential URLs

### Pacifica Resources
| Resource | URL | Note |
|----------|-----|------|
| **API Docs** | https://docs.pacifica.fi/api-documentation/api | Start here |
| **Testnet App** | https://test-app.pacifica.fi/ | Use code: "Pacifica" |
| **Builder Program** | https://docs.pacifica.fi/builder-program | $15k in prizes |
| **Support** | Discord Builder Channel | Office hours Wednesdays |

### Development URLs
| Service | URL | Purpose |
|---------|-----|---------|
| **Frontend** | http://localhost:3000 | User interface |
| **Backend** | http://localhost:3001 | API server |
| **Database** | localhost:5432 | PostgreSQL (optional) |

### Testnet Networks
| Network | Endpoint | Purpose |
|---------|----------|---------|
| **Pacifica API** | https://test-api.pacifica.fi/api/v1 | Trading orders |
| **Solana Devnet** | https://api.devnet.solana.com | Wallet transactions |
| **SOL Faucet** | https://faucet.solana.com/ | Free testnet SOL |

---

## ⚙️ Environment Variables You Need

### Minimal Setup (Required)

```env
# Network (Testnet - these are defaults)
PACIFICA_BASE_URL=https://test-api.pacifica.fi/api/v1
PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com

# Your Phantom Wallet
PACIFICA_AGENT_ACCOUNT=YOUR_WALLET_ADDRESS_HERE

# Pick ONE AI provider for swarm decisions
OPENROUTER_API_KEY=sk-or-v1-...          # Recommended (free tier)
# OR
# GLM_API_KEY=...
# OR  
# DASHSCOPE_API_KEY=...

# Database (optional but recommended)
DATABASE_URL=postgresql://postgres:root@localhost:5432/pacfi_ai
```

### Get Your Configuration

1. **Wallet Address**: 
   - Open Phantom wallet
   - Copy "Copy address" → paste into PACIFICA_AGENT_ACCOUNT

2. **API Key** (choose one):
   - **OpenRouter**: https://openrouter.ai/keys
   - **GLM**: https://open.bigmodel.cn/
   - **DashScope**: https://dashscope.console.aliyun.com/

3. **Database**: 
   - Ensure PostgreSQL installed
   - Or remove DATABASE_URL line to skip

---

## 📋 Before You Start

- [ ] Phantom wallet installed
- [ ] Wallet switched to **Solana Devnet** (not Mainnet!)
- [ ] Wallet has > 0.5 SOL (get from https://faucet.solana.com/)
- [ ] API key for at least one AI model
- [ ] PostgreSQL installed (optional but recommended)

---

## 🎯 Common Commands

### Setup & Installation
```bash
pnpm install              # Install dependencies
pnpm db:init              # Initialize database
pnpm db:migrate           # Run database migrations
cp .env.example .env.local # Copy environment template
```

### Development
```bash
pnpm dev                  # Start frontend + backend
pnpm build                # Build all packages
pnpm type-check           # Check TypeScript types
pnpm format               # Format code with Prettier
```

### Database
```bash
pnpm db:studio            # Open Drizzle Studio GUI
pnpm db:generate          # Generate migrations
pnpm db:push              # Push schema directly
```

### Frontend Only
```bash
cd apps/frontend
pnpm dev                  # Astro dev server (port 3000)
pnpm build                # Build static site
```

### Backend Only
```bash
cd apps/backend
pnpm dev                  # Dev server with tsx watch (port 3001)
pnpm build                # Compile TypeScript
```

---

## 🧪 Testing Your Setup

### ✅ Test 1: Is the backend running?
```bash
curl http://localhost:3001/health
# Should see: {"success":true,"data":{"status":"ok"}}
```

### ✅ Test 2: Can you reach Pacifica?
```bash
curl https://test-api.pacifica.fi/api/v1/info | jq '.data | length'
# Should see a number (market count)
```

### ✅ Test 3: Is your wallet connected?
1. Open http://localhost:3000
2. Click "Connect Wallet"
3. Approve in Phantom
4. Should see your wallet address

### ✅ Test 4: Can you place an order?
1. Go to Trading page
2. Select BTC-USDC
3. Enter: 0.01 BTC, market price
4. Click "Place Order"
5. Approve transaction

---

## 🐛 Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| **Port already in use** | Change PORT in .env.local (e.g., PORT=3002) |
| **"Cannot find module"** | Run `pnpm install` |
| **Database connection error** | Either: 1) Start PostgreSQL, or 2) Remove DATABASE_URL from .env.local |
| **Wallet not connecting** | Ensure Phantom is on **Solana Devnet** not Mainnet |
| **"Insufficient SOL"** | Request from https://faucet.solana.com/ |
| **AI not responding** | Verify API key is set and has credits |
| **TypeScript errors** | Run `pnpm type-check` to see full list |

---

## 📊 Architecture Overview

```
User (Phantom Wallet)
   ↓
Frontend (http://localhost:3000)
   ↓
Backend API (http://localhost:3001)
   ├→ Pacifica API (test-api.pacifica.fi)
   ├→ AI Swarm (OpenRouter/GLM/DashScope)
   └→ Database (PostgreSQL)
```

---

## 🎬 For Your Demo Video

**Requirements**:
- 10 minutes max (shorter is better!)
- Voice narration required
- Show real trading on testnet
- Explain what makes it valuable

**Suggested Flow** (5-7 minutes):
1. Problem statement (30s)
2. Show UI & features (1m)
3. Live trade demo on Pacifica testnet (2-3m)
4. Explain AI swarm logic (1m)
5. Show Pacifica integration (1m)
6. What's next (30s)

---

## 💰 Hackathon Prizes

- **Grand Prize**: $5,000 + 30,000 points
- **Track Winners** (4 categories): $2,000 + 14,000 points each
- **Special Awards** (2): $1,000 + 7,000 points each

**Deadline**: April 16, 2026

---

## 📚 Key Documentation

Read these in order:

1. **[TESTNET_SETUP.md](TESTNET_SETUP.md)** - Complete setup guide
2. **[TESTNET_VERIFICATION_CHECKLIST.md](TESTNET_VERIFICATION_CHECKLIST.md)** - Pre-submission checks  
3. **[TESTNET_MIGRATION_SUMMARY.md](TESTNET_MIGRATION_SUMMARY.md)** - What was changed
4. **[CLAUDE.md](CLAUDE.md)** - Architecture overview

---

## 🆘 Getting Help

1. **Setup Issues**: Check troubleshooting section above
2. **Still stuck?**: 
   - Pacifica Discord → Builder Channel
   - @PacificaTGPortalBot on Telegram
   - docs.pacifica.fi

3. **Code Issues**:
   - Check CLAUDE.md for architecture
   - Review TESTNET_SETUP.md → Troubleshooting

---

## ⏰ Timeline

| Date | Task | Status |
|------|------|--------|
| **Before Apr 16** | Development & testing | 🚀 In progress |
| **April 15-16** | Demo video recording | ⏳ Upcoming |
| **April 16** | **SUBMISSION DEADLINE** | 🎯 Target |
| **After Apr 16** | Judging & awards | 🏆 |

---

## ✨ Ready? Let's Go!

```bash
# One command to start everything:
pnpm dev

# Then visit:
# Frontend: http://localhost:3000
# API Docs: TESTNET_SETUP.md
```

**Good luck! 🚀**

---

*Last Updated: April 15, 2026 | Pacification Hackathon Edition*
