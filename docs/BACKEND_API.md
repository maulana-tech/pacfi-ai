# Backend API Reference — Pacfi AI

> **Framework**: Hono (TypeScript)  
> **Runtime**: Bun  
> **Base URL (dev)**: `http://localhost:3001`  
> **Schema file**: `apps/backend/src/index.ts`

---

## Autentikasi

Seluruh endpoint yang memerlukan autentikasi menggunakan **header berbasis wallet Solana** — tidak ada JWT.

| Header | Keterangan |
|---|---|
| `X-Wallet-Address` | Alamat wallet Solana (base58, 32–44 karakter) — **wajib** pada endpoint terautentikasi |
| `X-Signature` | Tanda tangan Ed25519 dari wallet — diperlukan untuk order |

---

## Format Response

Semua endpoint sukses mengembalikan envelope standar:

```json
{
  "success": true,
  "data": { ... },
  "error": null,
  "timestamp": "2026-04-11T06:30:00.000Z"
}
```

Response error:

```json
{
  "success": false,
  "data": null,
  "error": "Pesan error"
}
```

---

## Endpoints

### Health Check

#### `GET /health`

Cek apakah server berjalan.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-04-11T06:30:00.000Z",
  "version": "1.0.0"
}
```

---

### Orders

Base path: `/orders`

#### `POST /orders/create-market`

Membuat market order baru. Trade dieksekusi langsung di harga pasar saat ini.

**Headers:**
- `X-Wallet-Address` (wajib)
- `X-Signature` (wajib)

**Request Body:**

```json
{
  "symbol": "BTC-USDC",
  "side": "bid",
  "amount": "100",
  "signature": "base58EncodedSignature...",
  "timestamp": 1712823000000,
  "builderCode": "optional_builder_code",
  "leverage": "5"
}
```

| Field | Tipe | Keterangan |
|---|---|---|
| `symbol` | string | Pair trading (e.g. `BTC-USDC`) |
| `side` | `"bid"` \| `"ask"` | `bid` = BUY, `ask` = SELL |
| `amount` | string | Jumlah posisi dalam USDC |
| `signature` | string | Signature Ed25519 dari wallet (base58) |
| `timestamp` | number | Unix timestamp (ms) |
| `builderCode` | string? | Kode builder opsional |
| `leverage` | string? | Leverage (default: `"1"`) |

**Response:**
```json
{
  "success": true,
  "order": { ... }
}
```

**Efek Samping:** Trade tersimpan di tabel `trades` dengan status `OPEN`.

---

#### `POST /orders/create-limit`

Membuat limit order. Trade dieksekusi ketika harga mencapai target.

**Headers:**
- `X-Wallet-Address` (wajib)
- `X-Signature` (wajib)

**Request Body:**

```json
{
  "symbol": "ETH-USDC",
  "side": "ask",
  "amount": "50",
  "price": "3200.50",
  "signature": "base58EncodedSignature...",
  "timestamp": 1712823000000,
  "leverage": "3"
}
```

| Field tambahan | Tipe | Keterangan |
|---|---|---|
| `price` | string | Harga target limit order |

**Catatan:** Order time-in-force otomatis `GTC` (Good Till Cancelled).

---

#### `GET /orders/positions`

Mengambil posisi open saat ini dari Pacifica API.

**Headers:**
- `X-Wallet-Address` (wajib)

**Response:**
```json
{
  "success": true,
  "positions": [ ... ]
}
```

---

#### `GET /orders/balance`

Mengambil saldo akun dari Pacifica API.

**Headers:**
- `X-Wallet-Address` (wajib)

**Response:**
```json
{
  "success": true,
  "balance": 1234.56
}
```

---

### Dashboard

Base path: `/dashboard`

#### `GET /dashboard/summary`

Ringkasan performa akun pengguna.

**Headers:**
- `X-Wallet-Address` (wajib)

**Response:**
```json
{
  "success": true,
  "data": {
    "totalBalance": 5000.00,
    "openPnl": 150.25,
    "openPnlPct": 3.005,
    "winRate": 65.5,
    "totalTrades": 42,
    "openPositions": 3
  },
  "error": null,
  "timestamp": "2026-04-11T06:30:00.000Z"
}
```

| Field | Keterangan |
|---|---|
| `totalBalance` | Total saldo USDC dari Pacifica |
| `openPnl` | Total unrealized PnL dari posisi terbuka |
| `openPnlPct` | PnL terbuka sebagai % dari total balance |
| `winRate` | % trade menang (dari trade CLOSED) |
| `totalTrades` | Total jumlah trade (semua status) |
| `openPositions` | Jumlah posisi yang sedang terbuka |

---

#### `GET /dashboard/positions`

Daftar posisi terbuka saat ini (di-normalize dari Pacifica API).

**Headers:**
- `X-Wallet-Address` (wajib)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "symbol": "BTC-USDC",
      "side": "LONG",
      "size": 0.01,
      "entryPrice": 65000.00,
      "markPrice": 65500.00,
      "pnl": 5.00,
      "pnlPct": 0.769,
      "liquidationPrice": 58000.00,
      "leverage": 5
    }
  ]
}
```

| Field | Keterangan |
|---|---|
| `side` | `LONG` atau `SHORT` |
| `pnl` | Unrealized PnL posisi ini |
| `pnlPct` | PnL sebagai persentase |

---

#### `GET /dashboard/trades`

Riwayat trade terakhir dari database lokal.

**Headers:**
- `X-Wallet-Address` (wajib)

**Query Parameters:**

| Param | Default | Keterangan |
|---|---|---|
| `limit` | `10` | Jumlah trade (min: 1, maks: 50) |

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-...",
      "symbol": "BTC-USDC",
      "side": "BUY",
      "size": 0.01,
      "entryPrice": 65000.00,
      "exitPrice": 66000.00,
      "pnl": 10.00,
      "pnlPct": 1.5385,
      "status": "CLOSED",
      "leverage": 5,
      "executedAt": "2026-04-10T10:00:00.000Z"
    }
  ]
}
```

---

#### `GET /dashboard/swarm-status`

Status terkini dari setiap AI agent dalam swarm.

**Headers:**
- `X-Wallet-Address` (wajib)

**Response:**
```json
{
  "success": true,
  "data": {
    "agents": [
      {
        "id": "market_analyst",
        "name": "Market Analyst",
        "role": "Technical Analysis",
        "status": "done",
        "decision": "BUY",
        "confidence": 78.5,
        "reasoning": "RSI oversold, bullish divergence detected..."
      },
      {
        "id": "sentiment_agent",
        "name": "Sentiment Agent",
        "role": "Market Sentiment",
        "status": "done",
        "decision": "BUY",
        "confidence": 65.0,
        "reasoning": "Funding rate negative, sentiment BULLISH..."
      },
      {
        "id": "risk_manager",
        "name": "Risk Manager",
        "role": "Position Sizing",
        "status": "idle",
        "decision": null,
        "confidence": null,
        "reasoning": null
      },
      {
        "id": "coordinator",
        "name": "Coordinator",
        "role": "Final Decision",
        "status": "idle",
        "decision": null,
        "confidence": null,
        "reasoning": null
      }
    ],
    "lastRun": "2026-04-11T06:25:00.000Z"
  }
}
```

| Field `agents[].status` | Keterangan |
|---|---|
| `done` | Agent sudah menghasilkan keputusan |
| `idle` | Agent belum aktif / tidak ada log |

| Field `agents[].decision` | Keterangan |
|---|---|
| `"BUY"` | Agent merekomendasikan beli |
| `"SELL"` | Agent merekomendasikan jual |
| `"HOLD"` | Agent merekomendasikan tahan |
| `null` | Tidak ada data |

---

#### `GET /dashboard/leaderboard-teaser`

Top-N trader (untuk ditampilkan di widget/homepage).

**Query Parameters:**

| Param | Default | Keterangan |
|---|---|---|
| `limit` | `3` | Jumlah trader (min: 1, maks: 10) |
| `period` | `all` | Periode: `all`, `7d`, `30d` |

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "rank": 1,
      "walletAddress": "7xK...abc",
      "username": "CryptoKing",
      "totalROI": 145.32,
      "winRate": 72.5,
      "totalTrades": 89,
      "updatedAt": "2026-04-11T06:00:00.000Z"
    }
  ]
}
```

---

#### `GET /dashboard/leaderboard`

Leaderboard penuh dengan pagination cursor-based.

**Query Parameters:**

| Param | Default | Keterangan |
|---|---|---|
| `limit` | `25` | Jumlah per halaman (min: 1, maks: 100) |
| `cursor` | — | Cursor pagination (base64url encoded offset) |
| `sortBy` | `roi` | Urutkan berdasarkan: `roi`, `winrate`, `trades`, `sharpe` |
| `order` | `desc` | Arah urutan: `asc` atau `desc` |
| `period` | `all` | Periode: `all`, `7d`, `30d` |

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "rank": 1,
        "globalRank": 1,
        "walletAddress": "7xK...abc",
        "username": "CryptoKing",
        "totalROI": 145.32,
        "winRate": 72.5,
        "sharpeRatio": 2.85,
        "totalTrades": 89,
        "updatedAt": "2026-04-11T06:00:00.000Z"
      }
    ],
    "pageInfo": {
      "limit": 25,
      "cursor": null,
      "nextCursor": "MjU",
      "hasMore": true
    }
  }
}
```

**Catatan Pagination:**
- `nextCursor` adalah nilai base64url dari offset berikutnya
- Gunakan `cursor=nextCursor` untuk halaman selanjutnya
- `hasMore: false` berarti tidak ada halaman lagi

---

## AI Swarm — Arsitektur

Backend menggunakan **multi-agent AI (swarm)** berbasis Qwen AI (DashScope API).

```
Permintaan Trade
       │
       ▼
┌─────────────────┐     ┌──────────────────┐
│  Market Analyst │     │  Sentiment Agent │
│  (qwen-max)     │     │  (qwen-max)      │
│  → signal:      │     │  → sentiment:    │
│    BUY/SELL/HOLD│     │    BULLISH/...   │
└────────┬────────┘     └────────┬─────────┘
         │                       │
         ▼                       ▼
┌────────────────────────────────────────────┐
│             Risk Manager (qwen-max)        │
│  Input: market analysis + sentiment         │
│  Output: positionSize, leverage, stopLoss   │
└───────────────────┬────────────────────────┘
                    │
                    ▼
┌────────────────────────────────────────────┐
│           Coordinator (qwen-max)           │
│  Agregat semua keputusan → final action    │
│  Output: action (BUY/SELL/HOLD), confidence│
└────────────────────────────────────────────┘
```

### Agent Roles

| Agent | ID | Task | Output |
|---|---|---|---|
| Market Analyst | `market_analyst` | Analisis teknikal OHLCV | `signal`, `confidence`, `reason` |
| Sentiment Agent | `sentiment_agent` | Analisis funding rate & volume | `sentiment`, `strength`, `reason` |
| Risk Manager | `risk_manager` | Hitung ukuran posisi optimal | `positionSize`, `leverage`, `stopLossPct` |
| Coordinator | `coordinator` | Keputusan akhir gabungan semua agent | `action`, `confidence`, `reasoning` |

---

## Pacifica Exchange Integration

Client: `apps/backend/src/services/pacifica.ts`  
Base URL: `https://test-api.pacifica.fi/api/v1` (Testnet)

| Metode | Endpoint Pacifica | Keterangan |
|---|---|---|
| `getBalance(wallet)` | `GET /account/balance` | Saldo akun |
| `getPositions(wallet)` | `GET /account/positions` | Posisi terbuka |
| `getMarketData(symbol)` | `GET /markets/:symbol` | Data pasar |
| `createMarketOrder(...)` | `POST /orders/create_market` | Buat market order |
| `createLimitOrder(...)` | `POST /orders/create` | Buat limit order |

**Catatan:** Tidak perlu API key — autentikasi dilakukan via wallet signature (Ed25519) yang di-generate di frontend.

---

## Error Codes

| HTTP Status | Keterangan |
|---|---|
| `400` | Bad Request — parameter tidak valid atau wallet address tidak valid |
| `404` | Not Found — endpoint tidak ditemukan |
| `500` | Internal Server Error — error dari DB atau Pacifica API |
