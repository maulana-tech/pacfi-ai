import { config } from 'dotenv';
import postgres from 'postgres';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(__dirname, '../../../.env') });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

const sql = postgres(connectionString, { max: 1, connect_timeout: 10 });

const statements = [
  `create extension if not exists pgcrypto`,
  `create table if not exists users (
    id uuid primary key default gen_random_uuid(),
    wallet_address varchar(44) not null unique,
    username varchar(100) unique,
    risk_profile varchar(50) default 'MODERATE',
    created_at timestamp default now(),
    updated_at timestamp default now()
  )`,
  `create table if not exists portfolios (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references users(id) on delete cascade,
    total_balance numeric(20, 8) not null,
    available_balance numeric(20, 8) not null,
    total_pnl numeric(20, 8) default 0,
    total_roi numeric(10, 4) default 0,
    win_rate numeric(5, 2) default 0,
    sharpe_ratio numeric(10, 4) default 0,
    max_drawdown numeric(10, 4) default 0,
    updated_at timestamp default now()
  )`,
  `create table if not exists trades (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references users(id) on delete cascade,
    symbol varchar(50) not null,
    side varchar(10) not null,
    entry_price numeric(20, 8) not null,
    exit_price numeric(20, 8),
    size numeric(20, 8) not null,
    leverage numeric(5, 2) not null,
    pnl numeric(20, 8),
    roi numeric(10, 4),
    status varchar(50) default 'OPEN',
    executed_at timestamp default now(),
    closed_at timestamp,
    ai_reasoning text
  )`,
  `create table if not exists ai_logs (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references users(id) on delete cascade,
    trade_id uuid references trades(id) on delete set null,
    agent_name varchar(100) not null,
    agent_model varchar(50) not null,
    input_context text not null,
    output_decision text not null,
    confidence numeric(5, 2),
    timestamp timestamp default now()
  )`,
  `create table if not exists leaderboard (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references users(id) on delete cascade,
    rank integer,
    total_roi numeric(10, 4) not null,
    win_rate numeric(5, 2) not null,
    sharpe_ratio numeric(10, 4) not null,
    total_trades integer default 0,
    updated_at timestamp default now()
  )`,
  `create table if not exists strategies (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references users(id) on delete cascade,
    name varchar(255) not null,
    description text,
    market_analyst_weight numeric(5, 2) default 0.3,
    sentiment_agent_weight numeric(5, 2) default 0.2,
    risk_manager_weight numeric(5, 2) default 0.3,
    coordinator_weight numeric(5, 2) default 0.2,
    is_active boolean default false,
    created_at timestamp default now()
  )`,
  `create index if not exists idx_wallet_address on users(wallet_address)`,
  `create index if not exists idx_username on users(username)`,
  `create index if not exists idx_portfolio_user_id on portfolios(user_id)`,
  `create index if not exists idx_trades_user_id on trades(user_id)`,
  `create index if not exists idx_trades_status on trades(status)`,
  `create index if not exists idx_trades_executed_at on trades(executed_at)`,
  `create index if not exists idx_ai_logs_user_id on ai_logs(user_id)`,
  `create index if not exists idx_ai_logs_trade_id on ai_logs(trade_id)`,
  `create index if not exists idx_ai_logs_timestamp on ai_logs("timestamp")`,
  `create index if not exists idx_leaderboard_user_id on leaderboard(user_id)`,
  `create index if not exists idx_leaderboard_rank on leaderboard(rank)`,
  `create index if not exists idx_strategies_user_id on strategies(user_id)`,
];

try {
  for (const statement of statements) {
    await sql.unsafe(statement);
  }

  const tables = await sql`
    select table_name
    from information_schema.tables
    where table_schema = 'public'
      and table_type = 'BASE TABLE'
    order by table_name
  `;

  console.log(
    JSON.stringify(
      {
        ok: true,
        tables: tables.map((row) => row.table_name),
      },
      null,
      2
    )
  );
} finally {
  await sql.end({ timeout: 5 });
}
