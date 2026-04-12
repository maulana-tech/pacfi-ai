# Database Schema — Pacfi AI

> **ORM**: Drizzle ORM  
> **Database**: PostgreSQL  
> **Schema file**: `apps/backend/src/db/schema.ts`

---

## Cara Menjalankan Migrasi

Project ini menggunakan **Drizzle ORM** (bukan Go). Tidak ada `cmd/migrate/main.go` — migrasi dikelola oleh Drizzle.

### Perintah Drizzle

```bash
# Generate file migrasi dari perubahan schema
pnpm --filter @pacfi/backend drizzle-kit generate

# Jalankan migrasi (up)
pnpm --filter @pacfi/backend drizzle-kit migrate

# Push schema langsung ke DB (development)
pnpm --filter @pacfi/backend drizzle-kit push

# Buka Drizzle Studio (GUI)
pnpm --filter @pacfi/backend drizzle-kit studio
```

> **Catatan**: Pastikan `DATABASE_URL` sudah diset di `.env` sebelum menjalankan perintah di atas.

---

## Daftar Tabel

| Tabel | Keterangan |
|---|---|
| `users` | Data pengguna berdasarkan wallet Solana |
| `portfolios` | Ringkasan portofolio tiap user |
| `trades` | Riwayat dan status trade |
| `ai_logs` | Log keputusan dari tiap AI agent |
| `leaderboard` | Ranking performa trader |
| `strategies` | Konfigurasi strategi AI per user |

---

## Detail Tabel

### `users`

Menyimpan data pengguna. Identitas utama adalah `wallet_address` (Solana pubkey).

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| `id` | `uuid` | PK, default random | ID unik pengguna |
| `wallet_address` | `varchar(44)` | UNIQUE, NOT NULL | Alamat wallet Solana (base58, 32–44 karakter) |
| `username` | `varchar(100)` | UNIQUE, nullable | Username opsional |
| `risk_profile` | `varchar(50)` | default `'MODERATE'` | Profil risiko: `LOW`, `MODERATE`, `HIGH` |
| `created_at` | `timestamp` | default NOW | Waktu pendaftaran |
| `updated_at` | `timestamp` | default NOW | Waktu update terakhir |

**Indexes:**
- `idx_wallet_address` — on `wallet_address`
- `idx_username` — on `username`

---

### `portfolios`

Ringkasan statistik portofolio untuk tiap user. Satu user memiliki satu portofolio.

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| `id` | `uuid` | PK, default random | ID portofolio |
| `user_id` | `uuid` | FK → `users.id` (CASCADE) | Referensi ke user |
| `total_balance` | `numeric(20,8)` | NOT NULL | Total saldo (USDC) |
| `available_balance` | `numeric(20,8)` | NOT NULL | Saldo tersedia untuk trading |
| `total_pnl` | `numeric(20,8)` | default `0` | Total profit/loss realisasi |
| `total_roi` | `numeric(10,4)` | default `0` | Return on Investment (%) |
| `win_rate` | `numeric(5,2)` | default `0` | Persentase trade menang |
| `sharpe_ratio` | `numeric(10,4)` | default `0` | Sharpe Ratio portofolio |
| `max_drawdown` | `numeric(10,4)` | default `0` | Drawdown maksimum (%) |
| `updated_at` | `timestamp` | default NOW | Waktu update terakhir |

**Indexes:**
- `idx_portfolio_user_id` — on `user_id`

---

### `trades`

Riwayat semua trade yang dilakukan. Status bisa `OPEN` atau `CLOSED`.

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| `id` | `uuid` | PK, default random | ID trade |
| `user_id` | `uuid` | FK → `users.id` (CASCADE) | Referensi ke user |
| `symbol` | `varchar(50)` | NOT NULL | Pair trading, misal `BTC-USDC` |
| `side` | `varchar(10)` | NOT NULL | `BUY` atau `SELL` |
| `entry_price` | `numeric(20,8)` | NOT NULL | Harga masuk posisi |
| `exit_price` | `numeric(20,8)` | nullable | Harga keluar posisi (jika CLOSED) |
| `size` | `numeric(20,8)` | NOT NULL | Ukuran posisi (quantity) |
| `leverage` | `numeric(5,2)` | NOT NULL | Leverage yang digunakan (1x–50x) |
| `pnl` | `numeric(20,8)` | nullable | Profit/Loss realisasi |
| `roi` | `numeric(10,4)` | nullable | Return on Investment trade ini (%) |
| `status` | `varchar(50)` | default `'OPEN'` | Status: `OPEN` atau `CLOSED` |
| `executed_at` | `timestamp` | default NOW | Waktu eksekusi order |
| `closed_at` | `timestamp` | nullable | Waktu posisi ditutup |
| `ai_reasoning` | `text` | nullable | Penjelasan AI mengapa mengambil trade ini |

**Indexes:**
- `idx_trades_user_id` — on `user_id`
- `idx_trades_status` — on `status`
- `idx_trades_executed_at` — on `executed_at`

---

### `ai_logs`

Log setiap keputusan dari masing-masing AI agent dalam swarm.

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| `id` | `uuid` | PK, default random | ID log |
| `user_id` | `uuid` | FK → `users.id` (CASCADE) | User yang memicu sesi AI |
| `trade_id` | `uuid` | FK → `trades.id` (SET NULL) | Trade terkait (opsional) |
| `agent_name` | `varchar(100)` | NOT NULL | Nama agent: `Market Analyst`, `Sentiment Agent`, `Risk Manager`, `Coordinator` |
| `agent_model` | `varchar(50)` | NOT NULL | Model AI yang digunakan (contoh: `qwen-max`) |
| `input_context` | `text` | NOT NULL | Input yang diberikan ke agent (JSON string) |
| `output_decision` | `text` | NOT NULL | Keputusan output dari agent (JSON string atau teks) |
| `confidence` | `numeric(5,2)` | nullable | Tingkat kepercayaan agent (0–100) |
| `timestamp` | `timestamp` | default NOW | Waktu keputusan diambil |

**Indexes:**
- `idx_ai_logs_user_id` — on `user_id`
- `idx_ai_logs_trade_id` — on `trade_id`
- `idx_ai_logs_timestamp` — on `timestamp`

---

### `leaderboard`

Tabel ranking performa semua trader. Di-update secara berkala.

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| `id` | `uuid` | PK, default random | ID baris leaderboard |
| `user_id` | `uuid` | FK → `users.id` (CASCADE) | Referensi ke user |
| `rank` | `integer` | nullable | Posisi ranking global |
| `total_roi` | `numeric(10,4)` | NOT NULL | Total ROI trader |
| `win_rate` | `numeric(5,2)` | NOT NULL | Persentase win rate |
| `sharpe_ratio` | `numeric(10,4)` | NOT NULL | Sharpe Ratio |
| `total_trades` | `integer` | default `0` | Total jumlah trade |
| `updated_at` | `timestamp` | default NOW | Waktu update ranking |

**Indexes:**
- `idx_leaderboard_user_id` — on `user_id`
- `idx_leaderboard_rank` — on `rank`

---

### `strategies`

Konfigurasi bobot (weight) untuk tiap AI agent dalam strategi trading user.

| Kolom | Tipe | Constraint | Keterangan |
|---|---|---|---|
| `id` | `uuid` | PK, default random | ID strategi |
| `user_id` | `uuid` | FK → `users.id` (CASCADE) | Referensi ke user |
| `name` | `varchar(255)` | NOT NULL | Nama strategi |
| `description` | `text` | nullable | Deskripsi strategi |
| `market_analyst_weight` | `numeric(5,2)` | default `0.3` | Bobot keputusan Market Analyst (0–1) |
| `sentiment_agent_weight` | `numeric(5,2)` | default `0.2` | Bobot keputusan Sentiment Agent (0–1) |
| `risk_manager_weight` | `numeric(5,2)` | default `0.3` | Bobot keputusan Risk Manager (0–1) |
| `coordinator_weight` | `numeric(5,2)` | default `0.2` | Bobot keputusan Coordinator (0–1) |
| `is_active` | `boolean` | default `false` | Apakah strategi ini aktif |
| `created_at` | `timestamp` | default NOW | Waktu dibuat |

**Indexes:**
- `idx_strategies_user_id` — on `user_id`

---

## Relasi Antar Tabel

```mermaid
erDiagram
    users ||--o| portfolios : "memiliki"
    users ||--o{ trades : "melakukan"
    users ||--o{ ai_logs : "memiliki"
    users ||--o{ leaderboard : "tampil di"
    users ||--o{ strategies : "mengkonfigurasi"
    trades ||--o{ ai_logs : "dipicu oleh"
```

### Ringkasan Relasi (Drizzle `relations`)

| Relasi | Dari | Ke | Tipe |
|---|---|---|---|
| `users → portfolios` | `users.id` | `portfolios.user_id` | one-to-one |
| `users → trades` | `users.id` | `trades.user_id` | one-to-many |
| `users → aiLogs` | `users.id` | `ai_logs.user_id` | one-to-many |
| `users → strategies` | `users.id` | `strategies.user_id` | one-to-many |
| `trades → aiLogs` | `trades.id` | `ai_logs.trade_id` | one-to-many |

---

## Cascade Behavior

| Tabel | On Delete User | On Delete Trade |
|---|---|---|
| `portfolios` | CASCADE (ikut terhapus) | — |
| `trades` | CASCADE (ikut terhapus) | — |
| `ai_logs` | CASCADE (ikut terhapus) | SET NULL (trade_id jadi null) |
| `leaderboard` | CASCADE (ikut terhapus) | — |
| `strategies` | CASCADE (ikut terhapus) | — |

---

## Konfigurasi Koneksi Database

Koneksi dikelola di `apps/backend/src/db/index.ts`:

```typescript
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const client = postgres(process.env.DATABASE_URL!);
export const db = drizzle(client, { schema });
```

**Environment variable yang diperlukan:**

```env
DATABASE_URL=postgresql://postgres:root@localhost:5432/pacfi_ai
```
