# Pacfi AI - Setup Guide

## Prerequisites

- Node.js 18+
- pnpm (or npm/yarn)
- PostgreSQL 14+
- Git

## Installation

### 1. Clone Repository

```bash
cd /home/ubuntu/pacfi-ai
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Setup Environment Variables

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/pacfi_ai

# Pacifica API
PACIFICA_API_URL=https://test-api.pacifica.fi/api/v1

# Qwen AI
QWEN_API_KEY=your_api_key_here
QWEN_MODEL=qwen-max

# Builder Code (Optional)
BUILDER_CODE=PACFI_AI
BUILDER_FEE_RATE=0.0005
```

### 4. Setup Database

```bash
# Create database
createdb pacfi_ai

# Run migrations
pnpm db:migrate
```

### 5. Start Development Servers

```bash
# Terminal 1: Backend
pnpm dev:backend

# Terminal 2: Frontend
pnpm dev:frontend
```

Access:
- Frontend: http://localhost:3000
- Backend: http://localhost:3001

## Project Structure

```
pacfi-ai/
├── apps/
│   ├── backend/          # Hono API server
│   │   ├── src/
│   │   │   ├── middleware/    # Auth, error handling
│   │   │   ├── services/      # Pacifica, Signing, Swarm
│   │   │   ├── routes/        # API endpoints
│   │   │   ├── db/            # Database setup
│   │   │   └── index.ts       # Entry point
│   │   └── package.json
│   └── frontend/         # Astro + React frontend
│       ├── src/
│       │   ├── components/    # React components
│       │   ├── pages/         # Astro pages
│       │   └── styles/        # CSS
│       └── astro.config.mjs
├── packages/
│   ├── shared/           # Shared types
│   ├── ai-swarm/         # Qwen AI agents
│   └── database/         # Database schema
└── README.md
```

## Key Files

### Backend

- `apps/backend/src/middleware/auth.ts` - Wallet authentication
- `apps/backend/src/services/pacifica.ts` - Pacifica API client
- `apps/backend/src/services/signing.ts` - Order signing utilities
- `apps/backend/src/routes/orders.ts` - Order endpoints

### Frontend

- `apps/frontend/src/components/WalletConnect.tsx` - Wallet connection
- `apps/frontend/src/components/OrderSigner.tsx` - Order signing
- `apps/frontend/src/pages/dashboard.astro` - Dashboard page

### Database

- `packages/database/src/schema.ts` - Database schema
- `apps/backend/src/db/index.ts` - Database client

## Development Workflow

### 1. Make Changes

Edit files in `apps/backend/src` or `apps/frontend/src`

### 2. Test Locally

```bash
# Test backend
curl -X GET http://localhost:3001/health

# Test frontend
# Visit http://localhost:3000
```

### 3. Connect Wallet

1. Install Phantom wallet extension
2. Click "Connect Wallet" on frontend
3. Approve connection

### 4. Create Order

1. Fill in order details
2. Click "Sign & Send Order"
3. Approve in wallet
4. Order sent to Pacifica

## API Endpoints

### Health Check

```bash
GET /health
```

### Create Market Order

```bash
POST /orders/create-market
Headers:
  X-Wallet-Address: <wallet_address>
  X-Signature: <signature>

Body:
{
  "symbol": "BTC",
  "side": "bid",
  "amount": "0.1",
  "signature": "...",
  "timestamp": 1748970123456
}
```

### Create Limit Order

```bash
POST /orders/create-limit
Headers:
  X-Wallet-Address: <wallet_address>
  X-Signature: <signature>

Body:
{
  "symbol": "BTC",
  "side": "bid",
  "amount": "0.1",
  "price": "100000",
  "signature": "...",
  "timestamp": 1748970123456
}
```

### Get Positions

```bash
GET /orders/positions
Headers:
  X-Wallet-Address: <wallet_address>
```

### Get Balance

```bash
GET /orders/balance
Headers:
  X-Wallet-Address: <wallet_address>
```

## Troubleshooting

### Wallet Not Connecting

1. Install Phantom wallet
2. Create/import account
3. Switch to Solana network
4. Refresh page

### Order Signing Failed

1. Check wallet is connected
2. Verify timestamp is current
3. Check signature format
4. Ensure wallet has SOL for gas

### Database Connection Error

1. Check PostgreSQL is running
2. Verify DATABASE_URL in .env.local
3. Ensure database exists
4. Check credentials

### API Errors

1. Check backend is running (port 3001)
2. Verify environment variables
3. Check network connectivity
4. Review error logs

## Testing

### Manual Testing

1. Connect wallet
2. Create market order
3. Check order in Pacifica
4. Verify trade in database

### Automated Testing

```bash
# Run tests
pnpm test

# Run with coverage
pnpm test:coverage
```

## Deployment

### Frontend (Vercel)

```bash
# Deploy to Vercel
pnpm deploy:frontend
```

### Backend (Railway/Render)

```bash
# Deploy to Railway
pnpm deploy:backend
```

### Database (Neon)

1. Create Neon project
2. Update DATABASE_URL
3. Run migrations

## Performance Tips

### Frontend

- Use Astro for static pages
- React Islands for interactive components
- Lazy load components
- Optimize images

### Backend

- Use connection pooling
- Cache market data
- Batch database operations
- Monitor API rate limits

### Database

- Add indexes on frequently queried columns
- Use prepared statements
- Monitor query performance
- Archive old trades

## Security

1. **Never commit .env.local**
2. **Keep private keys in wallet**
3. **Use HTTPS in production**
4. **Validate all inputs**
5. **Monitor for suspicious activity**

## Support

- GitHub Issues: Report bugs
- Discord: Community support
- Docs: https://docs.pacifica.fi

## Next Steps

1. ✅ Setup complete
2. ⏳ Implement AI Swarm
3. ⏳ Build dashboard
4. ⏳ Test trading
5. ⏳ Prepare for hackathon
