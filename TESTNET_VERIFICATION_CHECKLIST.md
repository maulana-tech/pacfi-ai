# Pacfi AI Testnet Verification Checklist

Use this checklist to verify your testnet setup is correct before hackathon submission.

## Pre-Submission Verification (Run on April 15-16, 2026)

### ✅ Network Configuration

- [ ] `.env.local` exists in project root
- [ ] `PACIFICA_BASE_URL=https://test-api.pacifica.fi/api/v1` is set
- [ ] `PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com` is set
- [ ] Database URL points to local PostgreSQL

### ✅ Wallet Configuration

- [ ] Phantom/Wallet browser extension installed
- [ ] Wallet switched to **Solana Devnet** (not Mainnet)
- [ ] Wallet has > 1 SOL for gas fees (request from faucet if empty)
- [ ] Wallet address matches `PACIFICA_AGENT_ACCOUNT` in .env

### ✅ API Keys Configured

- [ ] At least ONE API key set:
  - [ ] `OPENROUTER_API_KEY` set and tested OR
  - [ ] `GLM_API_KEY` set and tested OR
  - [ ] `DASHSCOPE_API_KEY` set and tested

### ✅ Dependencies Installed

```bash
pnpm install
```

- [ ] No errors during installation
- [ ] node_modules/ created
- [ ] tsconfig.json detected

### ✅ Database Ready

```bash
pnpm db:init      # if first time
pnpm db:migrate   # apply schema
```

- [ ] PostgreSQL running locally (port 5432)
- [ ] Database `pacfi_ai` created
- [ ] Tables created (users, trades, portfolios, etc.)

### ✅ Services Start Correctly

```bash
pnpm dev
```

- [ ] Frontend started on http://localhost:3000
- [ ] Backend started on http://localhost:3001  
- [ ] No build errors in terminal
- [ ] Services remain running without crashes

### ✅ Frontend Works

1. Open http://localhost:3000
2. Check for layout (Sidebar, Dashboard, etc.):
   - [ ] Dashboard page loads
   - [ ] Sidebar navigation visible
   - [ ] No TypeScript errors in console

3. Connect Wallet:
   - [ ] "Connect Wallet" button visible
   - [ ] Click it → Wallet extension opens
   - [ ] Approve connection
   - [ ] Wallet address displayed in UI
   - [ ] No 404 errors in Network tab

### ✅ Backend API Works

Test endpoint connectivity:

```bash
# Health check
curl http://localhost:3001/health
# Expected: {"success":true,"data":{"status":"ok"}}

# Market info
curl https://test-api.pacifica.fi/api/v1/info
# Expected: List of available trading pairs
```

- [ ] `/health` responds with `success: true`
- [ ] Pacifica test API is reachable
- [ ] No CORS errors in browser console

### ✅ AI Models Working

Check which model is active:

```bash
# Look for backend startup logs
pnpm dev | grep -i "model\|provider"
```

- [ ] At least one AI provider initialized
- [ ] No API key errors in startup logs
- [ ] Swarm coordinator ready

### ✅ Wallet Signing Flow

1. Go to Trading page (http://localhost:3000/trading)
2. Create a test order:
   - [ ] Market/Limit order form visible
   - [ ] Can enter amount and price
   - [ ] "Place Order" button clickable
3. Click "Place Order":
   - [ ] Wallet prompts for signature
   - [ ] Can approve/reject in extension
   - [ ] After approval, order shows in history/dashboard
   - [ ] No "Failed to sign" errors

### ✅ Data Persistence

1. Create a test trade (or use mock data on Swarm page)
2. Go to Dashboard:
   - [ ] Portfolio shows connected wallet data
   - [ ] Trade history visible
   - [ ] Statistics display without errors

3. Refresh page:
   - [ ] Data persists after page reload
   - [ ] Wallet stays connected (no re-prompt)
   - [ ] Dashboard doesn't require manual re-connection

### ✅ Demo Video Readiness

Before recording your demo video:

- [ ] All above checks pass ✅
- [ ] Testnet SOL balance > 0.5 SOL
- [ ] You can narrate the trading flow
- [ ] Screen recording tool ready (OBS, ScreenFlow, etc.)
- [ ] 10-minute recording fits your demo scope

### ✅ Error Handling

Intentionally test error scenarios:

1. **Disconnect wallet** → Try to place order:
   - [ ] Error message shown (not silent fail)
   - [ ] "Connect wallet" option presented

2. **Insufficient balance** → Try to place large order:
   - [ ] Error message clear
   - [ ] Suggests requesting testnet SOL

3. **Network down** → Stop backend, try dashboard:
   - [ ] UI shows connection error gracefully
   - [ ] Does not crash/hang indefinitely

---

## Quick Verification Script

Run this to quickly test your setup:

```bash
#!/bin/bash
echo "=== Pacfi AI Testnet Verification ==="

# Check env file
echo "✓ Checking .env.local..."
grep -q "PACIFICA_BASE_URL" .env.local && echo "  ✓ Pacifica base URL found" || echo "  ✗ Missing PACIFICA_BASE_URL"
grep -q "PUBLIC_SOLANA_RPC_URL" .env.local && echo "  ✓ Solana RPC URL found" || echo "  ✗ Missing PUBLIC_SOLANA_RPC_URL"

# Check API connectivity
echo "✓ Testing API connectivity..."
curl -s https://test-api.pacifica.fi/api/v1/info > /dev/null && echo "  ✓ Pacifica testnet reachable" || echo "  ✗ Cannot reach Pacifica testnet"
curl -s https://api.devnet.solana.com/rpc > /dev/null && echo "  ✓ Solana devnet RPC reachable" || echo "  ✗ Cannot reach Solana devnet"

# Check dependencies
echo "✓ Checking dependencies..."
test -d node_modules && echo "  ✓ node_modules exists" || echo "  ✗ Run: pnpm install"
test -f package-lock.yaml || test -f pnpm-lock.yaml && echo "  ✓ Lock file present" || echo "  ✗ Lock file missing"

echo ""
echo "=== Start Development Server ==="
echo "Run: pnpm dev"
echo "Then visit: http://localhost:3000"
```

---

## Support

Need help? Check these resources:

1. **Pacifica Support**: https://docs.pacifica.fi/ 
2. **Discord**: Official Pacifica Builder Channel
3. **Telegram**: @PacificaTGPortalBot
4. **Office Hours**: Wednesdays on Discord Hackathon Stage

---

## Submission Timeline

- **April 15**: Final testing and demo video recording
- **April 16, 2026**: DEADLINE for submission
- **Requirements**: 
  - Demo video (10 min max) with voice narration
  - Working testnet trading flow
  - Clear Pacifica integration shown

---

Good luck with your submission! 🚀
