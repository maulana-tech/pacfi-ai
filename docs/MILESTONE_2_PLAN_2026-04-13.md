# Milestone 2 Execution Plan
**Target:** Apr 14-16, 2026  
**Scope:** Live market data + automated execution + test coverage

---

## Overview

Milestone 2 focuses on removing remaining mock data and enabling automated AI execution. Three parallel work streams with clear dependencies and priorities.

---

## Task Breakdown

### Phase 1: Live Market Data (Priority 1)

**Task M2-1A: Replace TradingContent Market Prices**

**Current State:**
```javascript
const MARKET = {
  BTC: { price: 45230.5, change: 2.34, high: 45890, low: 44120, volume: '$2.4B', fundingRate: '0.0082%' },
  ETH: { price: 2845.2, change: -1.12, high: 2920, low: 2800, volume: '$1.1B', fundingRate: '-0.0031%' },
  SOL: { price: 145.3, change: 4.21, high: 148, low: 138.5, volume: '$380M', fundingRate: '0.0120%' },
}
```

**Work:**
1. Create `fetchPacificaMarketData()` helper in `apps/frontend/src/lib/pacifica.ts`
   - Call `https://test-api.pacifica.fi/api/v1/info/prices`
   - Parse response: extract symbol, mark price, 24h change, high, low, funding
   - Handle errors with fallback to old MARKET data
   - Memoize results (cache for 5-10 seconds)

2. Update `TradingContent.tsx` component:
   - Move mock MARKET constant to component state
   - Add `useEffect` to fetch market data on mount
   - Add auto-refresh timer (30 seconds)
   - Update all price displays to use state data

**Acceptance Criteria:**
- ✅ Market prices update from live API on component load
- ✅ 24h change, high, low, funding rate all live
- ✅ Auto-refresh every 30s when wallet connected
- ✅ Fallback to mock data if API fails
- ✅ Type-check passes (0 errors)

**Estimate:** 2-3 hours  
**Blockers:** None

---

### Phase 2: Automated Execution (Priority 2)

**Task M2-2A: Create `/swarm/execute` Endpoint**

**Location:** `apps/backend/src/routes/swarm.ts` (new file or extend existing)

**Responsibility:**
- Triggered manually via frontend or scheduled (implement both)
- Runs 4 Qwen agents in sequence (already in SwarmCoordinator)
- Stores decision in `ai_logs` table
- Returns decision result + confidence scores

**Implementation:**
```typescript
router.post('/execute', async (c) => {
  // 1. Get wallet context
  // 2. Get latest trade (if any) or create simulation context
  // 3. Run SwarmCoordinator.executeDecision()
  // 4. Store result in ai_logs
  // 5. Return decision + agent reasoning + confidence
})
```

**Response Schema:**
```typescript
{
  success: boolean;
  data: {
    tradeId: string;
    decision: 'BUY' | 'SELL' | 'HOLD';
    confidence: number; // 0-100
    agents: {
      market_analyst: { decision, confidence, reasoning };
      sentiment_agent: { decision, confidence, reasoning };
      risk_manager: { decision, confidence, reasoning };
      coordinator: { decision, confidence, reasoning };
    };
    timestamp: string;
  };
}
```

**Estimate:** 3-4 hours  
**Blockers:** packages/ai-swarm/ needs review (SwarmCoordinator exists but may need API key setup)

**Task M2-2B: Update SwarmContent UI for Auto-Execution**

**Location:** `apps/frontend/src/components/SwarmContent.tsx`

**Changes:**
- ❌ Remove manual "Run Cycle" button (or hide it)
- ✅ Add backend execution trigger button with loading state
- ✅ Show decision as `pending → result` animation
- ✅ Update recent decisions table on each execution
- ✅ Log execution errors clearly to user

**Estimate:** 2-3 hours  
**Blockers:** M2-2A must be complete

---

### Phase 3: Testing & Validation (Priority 3)

**Task M2-3A: Unit Tests for New Endpoints**

**Location:** `apps/backend/src/routes/__tests__/`

**Coverage:**
- `/dashboard/portfolio` — equity curve calculation, allocation grouping, Sharpe ratio formula
- `/dashboard/swarm-history` — agent log joining, confidence mapping
- `/swarm/execute` — decision execution, ai_logs insertion

**Framework:** Jest (already in package.json)

**Estimate:** 4-5 hours

**Task M2-3B: Component Tests for PortfolioContent & SwarmContent**

**Location:** `apps/frontend/src/components/__tests__/`

**Coverage:**
- PortfolioContent: Render on wallet connect, fetch trigger, error handling
- SwarmContent: Render with API data, execution button click, auto-refresh

**Framework:** React Testing Library

**Estimate:** 3-4 hours

**Task M2-3C: E2E Test: Wallet → Order → Portfolio Update**

**Flow:**
1. Connect wallet
2. Place market order
3. Verify order appears in trade history
4. Verify portfolio P&L updates
5. Verify swarm decision logged

**Framework:** Playwright or Cypress

**Estimate:** 5-6 hours

---

### Phase 4: Documentation (Priority 4)

**Task M2-4A: API Documentation Update**

**Files:**
- `docs/BACKEND_API.md` — Add new endpoints with request/response examples
- `docs/ARCHITECTURE_UPDATED.md` — Add data flow diagrams for new endpoints

**Additions:**
- `/dashboard/portfolio` spec
- `/dashboard/swarm-history` spec
- `/swarm/execute` spec

**Estimate:** 2-3 hours

**Task M2-4B: Setup Guide Update**

**Files:**
- `docs/SETUP_GUIDE.md` — Update environment variables, auth headers
- `docs/DEVELOPMENT_GUIDE.md` — Add troubleshooting for common issues

**Estimate:** 1-2 hours

---

## Parallel Execution Plan

```
Week 1 (Apr 14):
  Day 1 — M2-1A (Market Data) + M2-2A (/swarm/execute) in parallel
  Day 2 — M2-2B (UI) + M2-3A (Unit Tests) in parallel
  
Week 2 (Apr 15-16):
  Day 3 — M2-3B (Component Tests) + M2-3C (E2E) in parallel
  Day 4 — M2-4A (API Docs) + M2-4B (Setup Docs) in parallel
  Day 5 — Integration testing + final validation
```

**Total Milestone 2 Estimate:** 25-35 hours across 5-6 days

---

## Acceptance Criteria (M2 Complete)

- ✅ All hardcoded market data replaced with live Pacifica API
- ✅ Backend `/swarm/execute` endpoint working
- ✅ Frontend can trigger swarm execution and see results
- ✅ Recent decisions auto-update on execution
- ✅ TypeScript: 0 errors across all packages
- ✅ Unit test coverage: >80% for new code
- ✅ Component tests: All critical paths covered
- ✅ Documentation updated and current
- ✅ No console errors or warnings in dev mode
- ✅ Ready for UAT/demo to stakeholders

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| Pacifica API rate limits | Medium | Medium | Implement request throttling + caching |
| SwarmCoordinator API key issues | Low | High | Test with real Dashscope key early |
| Test framework compatibility | Low | Medium | Use same Jest config as existing tests |
| Type errors after refactor | Low | Low | Run type-check after each major change |

---

## Success Metrics Post-M2

1. **Data Quality:** 100% of displayed prices/stats from live API (0 mock data)
2. **Performance:** API response time <500ms for portfolio/swarm endpoints
3. **User Experience:** No manual "Run Cycle" needed; swarm executes on demand
4. **Code Quality:** >80% test coverage, 0 TypeScript errors
5. **Documentation:** All APIs documented with examples in BACKEND_API.md

---

## Dependencies & Prerequisites

**Before starting M2:**
- ✅ Milestone 1 complete and type-checking
- ✅ Database initialized with test data
- ✅ Pacifica API key functional in `.env`
- ✅ Dashscope API key functional (for AI agents)
- Optional: Test wallet prepared for E2E testing

---

## Files to Create/Modify

| File | Action | Priority |
|------|--------|----------|
| `apps/frontend/src/lib/pacifica.ts` | Add market data fetch fn | M2-1A |
| `apps/frontend/src/components/TradingContent.tsx` | Remove mock MARKET | M2-1A |
| `apps/backend/src/routes/swarm.ts` | New execute endpoint | M2-2A |
| `apps/frontend/src/components/SwarmContent.tsx` | Remove "Run Cycle" btn | M2-2B |
| `apps/backend/src/routes/__tests__/*` | Unit tests | M2-3A |
| `apps/frontend/src/components/__tests__/*` | Component tests | M2-3B |
| `docs/BACKEND_API.md` | API docs | M2-4A |
| `docs/SETUP_GUIDE.md` | Setup docs | M2-4B |

---

**Last Updated:** April 13, 2026  
**Ready to Start:** April 14, 2026
