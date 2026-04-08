# Pacfi AI - Updated Architecture (Wallet-Based, No JWT)

## Overview

Pacfi AI adalah autonomous trading bot yang menggunakan Qwen AI Swarm untuk membuat keputusan trading di Pacifica perpetuals. Architecture telah diupdate untuk menggunakan wallet-based authentication tanpa JWT.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Astro)                         │
│  - WalletConnect component (Phantom/MetaMask)                   │
│  - OrderSigner component (Ed25519 signing)                      │
│  - Dashboard dengan live AI decisions                           │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ HTTP + Headers:
                         │ X-Wallet-Address: <wallet>
                         │ X-Signature: <signature>
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│                       BACKEND (Hono)                            │
│  - Wallet context extraction                                    │
│  - Order signing verification                                  │
│  - Pacifica API integration                                    │
│  - Database operations                                         │
└────────────────────────┬────────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ↓                ↓                ↓
    ┌────────┐    ┌──────────────┐  ┌──────────────┐
    │Database│    │Pacifica API  │  │AI Swarm      │
    │(Postgres)   │(REST)        │  │(Qwen)        │
    └────────┘    └──────────────┘  └──────────────┘
        │                │
        │                ↓
        │          ┌──────────────────┐
        │          │Solana Blockchain │
        │          │(Perpetuals)      │
        │          └──────────────────┘
        │
        └─ Store: trades, portfolios, AI logs, leaderboard
```

## Key Components

### 1. Frontend (Astro + React)

**WalletConnect Component:**
- Detects Phantom/MetaMask wallet
- Handles wallet connection/disconnection
- Provides `useWallet()` hook
- Exposes `signMessage()` function

**OrderSigner Component:**
- Creates order payload
- Recursively sorts JSON keys
- Signs with wallet private key
- Sends signed order to backend

**Dashboard:**
- Real-time portfolio stats
- AI Swarm monitoring
- Trade history
- Leaderboard

### 2. Backend (Hono)

**Middleware:**
- `getWalletContext()` - Extract wallet from headers
- `isValidWalletAddress()` - Validate Solana address format
- No JWT verification needed

**Services:**
- `PacificaClient` - API calls to Pacifica
- `PacificaOrderSigner` - Order signing utilities
- `SwarmCoordinator` - AI decision making

**Routes:**
- `POST /orders/create-market` - Create market order
- `POST /orders/create-limit` - Create limit order
- `GET /orders/positions` - Get user positions
- `GET /orders/balance` - Get user balance

### 3. Database (PostgreSQL)

**Tables:**
- `users` - Wallet-based users (walletAddress as PK)
- `portfolios` - Portfolio stats per user
- `trades` - Trade history
- `ai_logs` - AI decision logs
- `leaderboard` - Rankings
- `strategies` - User trading strategies

**No JWT tokens stored!**

### 4. AI Swarm (Qwen)

**4 Agents:**
1. **Market Analyst** - Technical analysis
2. **Sentiment Agent** - Market sentiment
3. **Risk Manager** - Position sizing
4. **Coordinator** - Final decision

**Flow:**
```
Market Data → Market Analyst → Sentiment Agent → Risk Manager → Coordinator → Order
```

### 5. Blockchain (Solana)

**Pacifica Perpetuals:**
- Linear perpetuals (1x - 50x leverage)
- Order execution via signed requests
- Position settlement
- Funding payments

## Transaction Flow

### 1. User Initiates Trade

```
Frontend: User clicks "Buy BTC"
  ↓
AI Swarm: Analyzes market
  ↓
Decision: BUY 0.1 BTC at 5x leverage
```

### 2. Create Order Payload

```javascript
{
  symbol: "BTC",
  side: "bid",
  amount: "0.1",
  price: "100000",
  leverage: 5,
  client_order_id: "uuid"
}
```

### 3. Sign Order (Frontend)

```
1. Create signature payload
2. Recursively sort JSON keys
3. Create compact JSON
4. Sign with wallet private key (Ed25519)
5. Get Base58 signature
```

### 4. Send to Backend

```
POST /orders/create-limit
Headers:
  X-Wallet-Address: 6ETnufiec2CxVWTS4u5Wiq33Zh5Y3Qm6Pkdpi375fuxP
  X-Signature: 5j1Vy9UqYUF2jKD9r2Lv5AoMWHJuW5a1mqVzEhC9SJL5GqbPkGEQKpW3UZmKXr4UWrHMJ5xHQFMJkZWE8J5VyA

Body:
{
  symbol: "BTC",
  side: "bid",
  amount: "0.1",
  price: "100000",
  signature: "...",
  timestamp: 1748970123456
}
```

### 5. Backend Validates & Sends to Pacifica

```
1. Extract wallet from header
2. Validate wallet format
3. Build signed request
4. Send to Pacifica API
5. Store in database
```

### 6. Pacifica Executes

```
1. Verify Ed25519 signature
2. Check timestamp (not expired)
3. Execute on perpetuals contract
4. Return order confirmation
```

### 7. Update Database

```
1. Store trade in trades table
2. Log AI reasoning in ai_logs
3. Update portfolio stats
4. Update leaderboard
```

## Authentication Model

**Old (JWT):**
```
User → Login → Get JWT Token → Include in every request → Verify JWT
```

**New (Wallet-Based):**
```
User → Connect Wallet → Sign Message → Include in headers → Verify Signature
```

**Benefits:**
- ✅ No server-side token storage
- ✅ No token expiry management
- ✅ No password/email needed
- ✅ User has full control (private key)
- ✅ Blockchain-native

## API Endpoints

### Orders

```
POST /orders/create-market
POST /orders/create-limit
GET  /orders/positions
GET  /orders/balance
```

### Health

```
GET /health
```

## Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:password@localhost/pacfi_ai

# Pacifica
PACIFICA_API_URL=https://test-api.pacifica.fi/api/v1

# Qwen AI
QWEN_API_KEY=your_qwen_api_key
QWEN_MODEL=qwen-max

# Builder Code (Optional)
BUILDER_CODE=PACFI_AI
BUILDER_FEE_RATE=0.0005
```

## File Structure

```
pacfi-ai/
├── apps/
│   ├── backend/
│   │   └── src/
│   │       ├── middleware/
│   │       │   ├── auth.ts (wallet context)
│   │       │   └── error.ts
│   │       ├── services/
│   │       │   ├── pacifica.ts (API client)
│   │       │   ├── signing.ts (order signing)
│   │       │   └── swarm.ts (AI coordinator)
│   │       ├── routes/
│   │       │   ├── health.ts
│   │       │   └── orders.ts
│   │       ├── db/
│   │       │   ├── schema.ts
│   │       │   └── index.ts
│   │       └── index.ts
│   └── frontend/
│       └── src/
│           ├── components/
│           │   ├── WalletConnect.tsx
│           │   ├── OrderSigner.tsx
│           │   ├── SwarmMonitor.tsx
│           │   └── PortfolioStats.tsx
│           ├── pages/
│           │   ├── index.astro
│           │   └── dashboard.astro
│           └── styles/
├── packages/
│   ├── shared/
│   ├── ai-swarm/
│   └── database/
└── README.md
```

## Development Setup

```bash
# Install dependencies
pnpm install

# Setup environment
cp .env.example .env.local
# Edit .env.local with your values

# Run development
pnpm dev

# Frontend: http://localhost:3000
# Backend: http://localhost:3001
```

## Key Differences from JWT Approach

| Aspect | JWT | Wallet-Based |
|--------|-----|--------------|
| Token Storage | Server | Client (wallet) |
| Token Expiry | Yes | No (per-request) |
| Password | Required | Not needed |
| Signing | Server | Client (wallet) |
| Complexity | Medium | Low |
| Blockchain Native | No | Yes |
| User Control | Limited | Full |

## Security Considerations

1. **Private Key:** Never leaves wallet
2. **Signature:** Proves user authorized the order
3. **Timestamp:** Prevents replay attacks (5-30 second window)
4. **Wallet Validation:** Solana address format check
5. **HTTPS Only:** All API calls must be HTTPS

## Next Steps

1. ✅ Wallet authentication setup
2. ✅ Order signing implementation
3. ✅ Pacifica API integration
4. ✅ Database schema (wallet-based)
5. ⏳ AI Swarm implementation
6. ⏳ Frontend dashboard
7. ⏳ Testing & debugging
8. ⏳ Demo preparation

## Notes

- No JWT tokens anywhere
- No password management
- No email verification needed
- All authentication via wallet signatures
- Database only for analytics & history
- Blockchain handles order settlement
