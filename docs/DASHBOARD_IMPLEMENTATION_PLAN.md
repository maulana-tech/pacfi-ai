# Dashboard Implementation Plan

## Objective

Membangun dashboard trading yang real-time, stabil, dan siap dipakai harian untuk memonitor performa, posisi, aktivitas AI swarm, dan eksekusi order.

## Success Criteria

1. Data utama dashboard terhubung ke backend (bukan mock data).
2. Waktu loading awal halaman dashboard <= 2.5 detik pada koneksi normal.
3. User bisa melihat metrik portfolio, posisi terbuka, recent trades, dan status AI swarm secara konsisten.
4. Error state, loading state, dan empty state tersedia untuk setiap panel penting.
5. Dashboard responsif di desktop dan mobile.

## Scope

### In Scope

1. Summary cards: total balance, open P&L, win rate, total trades.
2. Price chart + perubahan 24 jam.
3. Open positions table.
4. Recent trades table.
5. Swarm status panel (status agent + confidence).
6. Leaderboard teaser panel (top trader ringkas, link ke halaman leaderboard).
7. Integrasi wallet state untuk konteks user.

### Out of Scope (Phase Lanjutan)

1. Advanced charting (custom indicators lengkap).
2. Backtesting strategy pada dashboard.
3. Multi-account portfolio aggregation.

## Phase Plan

## Phase 1 - Data Contract and API Readiness

1. Definisikan payload API untuk tiap panel dashboard.
2. Tambahkan endpoint backend yang dibutuhkan:
   - `GET /dashboard/summary`
   - `GET /dashboard/positions`
   - `GET /dashboard/trades?limit=...`
   - `GET /dashboard/swarm-status`
3. Standarkan format response:
   - `success`, `data`, `error`, `timestamp`
4. Pastikan semua endpoint menerima konteks wallet dari header/auth yang dipakai sekarang.

Deliverable:
1. Endpoint backend siap dipakai frontend.
2. Dokumen contract response singkat di docs.

## Phase 2 - Frontend Integration (Replace Mock Data)

1. Ganti data statis di komponen dashboard menjadi fetch dari API.
2. Buat data hooks terpisah per panel agar modular.
3. Tambahkan status UI:
   - loading skeleton
   - empty state
   - retry on error
4. Tambahkan interval refresh ringan untuk panel penting (mis. tiap 10-20 detik).

Deliverable:
1. Dashboard menampilkan data live.
2. Semua panel punya state handling yang jelas.

## Phase 3 - UX, Consistency, and Responsiveness

1. Rapikan hierarchy visual antar panel utama.
2. Pastikan tabel tetap nyaman di layar kecil.
3. Tambahkan label timestamp "last updated" untuk transparansi data.
4. Pastikan CTA ke halaman terkait (portfolio, leaderboard, trading) jelas.

Deliverable:
1. Dashboard lebih konsisten dan enak dipakai lintas device.

## Phase 4 - Performance and Reliability

1. Kurangi request yang tidak perlu (memoization/cache ringan).
2. Batasi payload tabel dan gunakan pagination/limit.
3. Tambahkan timeout + fallback message pada fetch call.
4. Audit error logging frontend/backend untuk dashboard routes.

Deliverable:
1. Dashboard cepat dan stabil pada koneksi menengah.

## Phase 5 - Testing and Release Checklist

1. Unit test:
   - formatter metrik (currency, percentage)
   - mapper data API ke UI model
2. Integration test:
   - dashboard load success
   - dashboard empty state
   - dashboard error state
3. Manual QA checklist:
   - wallet terhubung/tidak terhubung
   - data nol
   - data besar
   - network lambat

Deliverable:
1. Checklist rilis dashboard terpenuhi.
2. Risiko regresi berkurang.

## Data Model Draft (Frontend)

```ts
interface DashboardSummary {
  totalBalance: number;
  openPnl: number;
  openPnlPct: number;
  winRate: number;
  totalTrades: number;
}

interface DashboardPosition {
  symbol: string;
  side: 'LONG' | 'SHORT';
  size: number;
  entryPrice: number;
  markPrice: number;
  pnl: number;
  pnlPct: number;
  leverage: number;
  liquidationPrice?: number;
}

interface DashboardTrade {
  id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  price: number;
  size: number;
  pnl?: number;
  status: 'OPEN' | 'CLOSED' | 'CANCELLED';
  executedAt: string;
}
```

## Risks and Mitigation

1. Risiko: data Pacifica lambat atau gagal.
   Mitigasi: cache singkat, timeout, retry terbatas, fallback message.
2. Risiko: perbedaan format data backend-frontend.
   Mitigasi: kontrak API jelas + type validation.
3. Risiko: refresh terlalu sering membebani API.
   Mitigasi: interval adaptif + fetch only visible/active panel.

## Suggested Execution Order

1. Phase 1
2. Phase 2
3. Phase 4
4. Phase 3
5. Phase 5

Urutan ini memprioritaskan data live dulu, lalu stabilitas, baru polish UI.
