# Next Development Plan

> **Related Documentation**: See also [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md), [AGENTS.md](./AGENTS.md), [BACKEND_API.md](./BACKEND_API.md), [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md)

This document outlines the roadmap for continued development of Pacfi AI - Autonomous AI Swarm Trading Platform.

---

## 1. Deep Integrations

### 1.1 TradingAgents Framework Integration

**Status**: Package created at `packages/ai-swarm/` but not fully integrated

**Current State**:

- `TradingAgentsGraph` class implemented with 8 agent types
- Uses DashScope/OpenRouter for LLM calls
- Fallback mock responses when API unavailable

**Next Steps**:

```typescript
// Integrate TradingAgentsGraph into backend routes
import { TradingAgentsGraph } from '@pacfi/ai-swarm';

const agents = new TradingAgentsGraph({
  apiKey: process.env.OPENROUTER_API_KEY,
  deepThinkModel: 'qwen/qwen2.5-72b-instruct',
  quickThinkModel: 'qwen/qwen2.5-7b-instruct',
});

const decision = await agents.run('BTC', marketContext, portfolioBalance);
```

**Enhancement**: Add streaming responses for real-time agent updates

### 1.2 Pacifica API Enhanced Integration

**Current**: Basic orderbook, trades, market info endpoints

**Enhanced Features to Implement**:
| Feature | Endpoint | Priority |
|---------|----------|----------|
| Position management | `GET /positions` | High |
| Order history | `GET /orders` | High |
| Funding payments | `GET /funding` | Medium |
| Account balance | `GET /balance` | High |
| Real-time price feed | WebSocket | Medium |
| Perp/spot trading | Full order lifecycle | High |

### 1.3 AI Model Integration

**Supported Providers**:

- **OpenRouter** (recommended) - `qwen/qwen2.5-72b-instruct`
- **DashScope** - `qwen-max`, `qwen-turbo`

**Enhancement Ideas**:

1. **Model Selection UI** - Let users choose AI model
2. **Temperature/Config** - Adjust model parameters
3. **Prompt Templates** - Custom system prompts per agent
4. **Response Caching** - Cache similar analyses

---

## 2. Feature Enhancements

### 2.1 Trading Features

| Feature              | Description                           | Complexity |
| -------------------- | ------------------------------------- | ---------- |
| **Auto-Trading**     | Execute agent decisions automatically | High       |
| **Paper Trading**    | Simulate trades without real money    | Medium     |
| **Stop-Loss/TP**     | Auto-exit at price levels             | Medium     |
| **Position Manager** | View/close all open positions         | Medium     |
| **Order Book Depth** | Visualize orderbook liquidity         | Medium     |
| **Multi-Symbol**     | Trade multiple pairs simultaneously   | High       |
| **Grid Trading**     | Automated range-based orders          | High       |
| **DCA Bot**          | Dollar-cost averaging strategy        | High       |

### 2.2 Analytics Features

| Feature                 | Description                        | Priority |
| ----------------------- | ---------------------------------- | -------- |
| **PnL Dashboard**       | Profit/loss over time              | High     |
| **Trade History**       | All completed trades               | High     |
| **Performance Metrics** | Win rate, Sharpe ratio, drawdown   | Medium   |
| **Risk Analytics**      | Portfolio risk exposure            | Medium   |
| **Backtesting**         | Test strategies on historical data | High     |

### 2.3 Agent Features

| Feature                  | Description                  | Priority |
| ------------------------ | ---------------------------- | -------- |
| **Agent Status**         | Real-time agent health       | High     |
| **Agent Config**         | Customize agent parameters   | Medium   |
| **Agent History**        | Past decisions & outcomes    | Medium   |
| **Debate Visualization** | Show agent reasoning process | Medium   |
| **Agent Collaboration**  | Multi-agent communication    | High     |

---

## 3. UI/UX Enhancements

### 3.1 Per-Page Improvements

#### **Dashboard Page** (`dashboard.astro` → `DashboardContent.tsx`)

**Current State**:

- Fetches from `/dashboard/summary`, `/dashboard/positions`, `/dashboard/trades`, `/dashboard/swarm-status`
- 15-second auto-refresh interval
- Uses `fetchWithRetry` utility for data fetching

**Current Issues**:

- Fails without database (mock data fallback)
- Positions data may be empty due to Pacifica API address format issue
- No real-time price chart

**Enhancements**:
| Feature | Description | Effort |
|---------|-------------|--------|
| Interactive chart | Add 7d/30d/90d portfolio chart using Recharts | 2hr |
| Position cards | Visual P&L cards with leverage indicator | 1hr |
| Quick actions | Add Fund / Trade / Withdraw buttons | 1hr |
| Auto-refresh | 5-second refresh for prices | 0.5hr |
| Risk metrics | Show margin used, available, liquidation price | 2hr |

**Code Reference**: `apps/frontend/src/components/DashboardContent.tsx:261-293` (statCards)

---

#### **Trading Page** (`trading.astro` → `TradingContent.tsx`)

**Current State**:

- Symbol selector (BTC, ETH, SOL, etc.)
- Order form (side, amount, price, leverage)
- Orderbook display
- Recent trades table

**Current Issues**:

- Basic price chart without indicators
- No position size calculator
- No open orders tab

**Enhancements**:
| Feature | Description | Effort |
|---------|-------------|--------|
| TradingView chart | Add lightweight-charts with candlesticks | 3hr |
| Indicators | RSI, MACD, EMA overlay | 2hr |
| Position calculator | Size × leverage × price = notional value | 1hr |
| Open orders tab | View/cancel pending orders | 2hr |
| Order types | Add stop-loss, take-profit fields | 2hr |
| Trade history | Switch tabs between open/history | 1hr |

**Code Reference**:

- `apps/frontend/src/components/TradingContent.tsx` (main component)
- `apps/frontend/src/components/PriceChart.tsx:67` (current chart)

---

#### **Swarm Page** (`swarm.astro` → `SwarmContent.tsx`)

**Current State**:

- Calls `/agent/analyze` endpoint
- Shows 4 agents: Market Analyst, Sentiment, Risk Manager, Coordinator
- Mock decision data (no real AI)
- Visual agent network graph

**Current Issues**:

- Uses mock responses (API key unavailable)
- No symbol selector (hardcoded BTC)
- No decision history

**Enhancements**:
| Feature | Description | Effort |
|---------|-------------|--------|
| Symbol selector | Dropdown to select trading pair | 1hr |
| Live agent updates | Real-time reasoning display | 2hr |
| Decision history | Table of past decisions with outcomes | 2hr |
| Agent config | Adjust confidence thresholds | 2hr |
| Debate view | Expand agent reasoning steps | 2hr |
| Run controls | Start/stop, interval settings | 1hr |

**Code Reference**: `apps/frontend/src/components/SwarmContent.tsx:244-284` (runCycle)

---

#### **Portfolio Page** (`portfolio.astro` → `PortfolioContent.tsx`)

**Current State**:

- Holdings list with values
- Total value summary

**Current Issues**:

- No performance charts
- No asset allocation visualization

**Enhancements**:
| Feature | Description | Effort |
|---------|-------------|--------|
| Allocation pie | Pie chart of asset distribution | 1hr |
| Performance chart | 7d/30d/1y portfolio value | 2hr |
| Transaction history | All deposits/withdrawals/trades | 2hr |
| P&L breakdown | Unrealized vs realized | 1hr |
| Export CSV | Download transaction history | 1hr |

---

#### **Leaderboard Page** (`leaderboard.astro` → `LeaderboardContent.tsx`)

**Current State**:

- Sortable table (ROI, win rate, trades, sharpe)
- Period filter (all, 30d, 7d)
- Pagination

**Current Issues**:

- Mock data (no real leaderboard)

**Enhancements**:
| Feature | Description | Effort |
|---------|-------------|--------|
| Real data | Connect to database leaderboard | 1hr |
| Time filters | Daily/weekly/monthly toggles | 1hr |
| Strategy badges | Show strategy type per trader | 1hr |
| Profile cards | Click to see trader details | 2hr |
| Follow traders | Follow/unfollow functionality | 2hr |

**Code Reference**: `apps/frontend/src/components/LeaderboardContent.tsx:36-50`

---

#### **Builder Page** (`builder.astro` → `BuilderContent.tsx`)

**Current State**:

- Strategy name input
- Basic parameter fields
- Save button

**Enhancements**:
| Feature | Description | Effort |
|---------|-------------|--------|
| Template library | Pre-built strategy templates | 3hr |
| Validation | Real-time parameter validation | 1hr |
| Backtest preview | Quick historical test | 4hr |
| Save/load | Local storage or database | 2hr |
| Share | Generate shareable link | 2hr |

---

### 3.2 Global UI Improvements

| Area              | Enhancement                                   |
| ----------------- | --------------------------------------------- |
| **Navigation**    | Sidebar with icons, active state, collapsible |
| **Theme**         | Dark mode toggle                              |
| **Notifications** | Toast notifications for actions               |
| **Loading**       | Skeleton screens, progress indicators         |
| **Mobile**        | Responsive layout for all pages               |
| **Accessibility** | Keyboard navigation, screen reader support    |
| **Charts**        | Use lightweight-chart for trading charts      |

---

## 4. Technical Enhancements

### 4.1 Backend Improvements

```typescript
// Add rate limiting
import { rateLimit } from 'hono-rate-limiter';

app.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: 100,
  })
);

// Add caching
import { cache } from 'hono/cache';

app.get(
  '/markets',
  cache({
    cacheControl: 'max-age=60',
  }),
  marketsRouter
);

// Add input validation
import { z } from 'zod';

const orderSchema = z.object({
  symbol: z.string().min(1),
  side: z.enum(['bid', 'ask']),
  amount: z.string().regex(/^\d+$/),
  price: z.string().optional(),
});
```

### 4.2 Database Schema Updates

```sql
-- Users table
ALTER TABLE users ADD COLUMN total_pnl DECIMAL(20, 8);
ALTER TABLE users ADD COLUMN win_rate DECIMAL(5, 2);
ALTER TABLE users ADD COLUMN created_at TIMESTAMP DEFAULT NOW();

-- Trades table
ALTER TABLE trades ADD COLUMN exit_price DECIMAL(20, 8);
ALTER TABLE trades ADD COLUMN exit_time TIMESTAMP;
ALTER TABLE trades ADD COLUMN pnl DECIMAL(20, 8);
ALTER TABLE trades ADD COLUMN status VARCHAR(20) DEFAULT 'OPEN';

-- Add indexes
CREATE INDEX idx_trades_user ON trades(user_id);
CREATE INDEX idx_trades_symbol ON trades(symbol);
CREATE INDEX idx_trades_status ON trades(status);
```

### 4.3 Real-time Features

**Implementation Options**:

1. **Server-Sent Events (SSE)** - Simple, uni-directional
2. **WebSocket** - Bidirectional, more complex

```typescript
// SSE endpoint example
router.get('/events', (c) => {
  const stream = new ReadableStream({
    start(controller) {
      // Push updates
      controller.enqueue(`data: ${JSON.stringify(update)}\n\n`);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
    },
  });
});
```

---

## 5. Priority Roadmap

### Phase 1 - Foundation (Week 1-2)

- [ ] Fix DashScope API key or switch to OpenRouter
- [ ] Integrate TradingAgentsGraph into `/agent/analyze`
- [ ] Add position management endpoints
- [ ] Fix dashboard data display

### Phase 2 - Trading (Week 3-4)

- [ ] Paper trading mode
- [ ] Stop-loss/take-profit
- [ ] Order history
- [ ] Enhanced trading UI

### Phase 3 - Analytics (Week 5-6)

- [ ] P&L dashboard
- [ ] Trade history
- [ ] Performance metrics
- [ ] Leaderboard with real data

### Phase 4 - Agents (Week 7-8)

- [ ] Live agent debate visualization
- [ ] Agent configuration UI
- [ ] Decision history with outcomes
- [ ] Auto-trading capability

### Phase 5 - Polish (Week 9+)

- [ ] Dark mode
- [ ] Mobile responsive
- [ ] Performance optimization
- [ ] Testing & bug fixes

---

## 6. Quick Wins

These can be implemented quickly:

| Task                              | Effort | Impact |
| --------------------------------- | ------ | ------ |
| Add symbol selector to Swarm page | 1hr    | High   |
| Show real prices in Trading page  | 2hr    | High   |
| Add loading skeletons             | 2hr    | Medium |
| Fix API key validation            | 1hr    | High   |
| Add error toasts                  | 1hr    | Medium |
| Mobile responsive check           | 4hr    | High   |
| Fix dark mode colors              | 2hr    | Medium |

---

## 7. Dependencies to Add

```json
{
  "dependencies": {
    "zod": "^3.22.0",
    "hono-rate-limiter": "^0.3.0",
    "hono-cache": "^0.1.0",
    "lightweight-charts": "^4.0.0",
    "socket.io": "^4.7.0"
  }
}
```

---

## 8. Files to Modify

| File                                                | Changes                       |
| --------------------------------------------------- | ----------------------------- |
| `apps/backend/src/routes/agent.ts`                  | Integrate TradingAgentsGraph  |
| `apps/backend/src/routes/orders.ts`                 | Add more order types          |
| `apps/frontend/src/components/SwarmContent.tsx`     | Symbol selector, live updates |
| `apps/frontend/src/components/TradingContent.tsx`   | Chart, position calculator    |
| `apps/frontend/src/components/DashboardContent.tsx` | Real data, charts             |
| `packages/database/src/schema.ts`                   | Extended schema               |

---

_Last Updated: April 2026_
_Status: Planning_
