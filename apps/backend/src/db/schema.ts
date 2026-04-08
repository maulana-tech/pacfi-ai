import {
  pgTable,
  text,
  varchar,
  numeric,
  timestamp,
  uuid,
  index,
  boolean,
  integer,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    walletAddress: varchar('wallet_address', { length: 44 }).unique().notNull(),
    username: varchar('username', { length: 100 }).unique(),
    riskProfile: varchar('risk_profile', { length: 50 }).default('MODERATE'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    walletIdx: index('idx_wallet_address').on(table.walletAddress),
    usernameIdx: index('idx_username').on(table.username),
  })
);

export const portfolios = pgTable(
  'portfolios',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    totalBalance: numeric('total_balance', { precision: 20, scale: 8 }).notNull(),
    availableBalance: numeric('available_balance', { precision: 20, scale: 8 }).notNull(),
    totalPnL: numeric('total_pnl', { precision: 20, scale: 8 }).default('0'),
    totalROI: numeric('total_roi', { precision: 10, scale: 4 }).default('0'),
    winRate: numeric('win_rate', { precision: 5, scale: 2 }).default('0'),
    sharpeRatio: numeric('sharpe_ratio', { precision: 10, scale: 4 }).default('0'),
    maxDrawdown: numeric('max_drawdown', { precision: 10, scale: 4 }).default('0'),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    userIdIdx: index('idx_portfolio_user_id').on(table.userId),
  })
);

export const trades = pgTable(
  'trades',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    symbol: varchar('symbol', { length: 50 }).notNull(),
    side: varchar('side', { length: 10 }).notNull(),
    entryPrice: numeric('entry_price', { precision: 20, scale: 8 }).notNull(),
    exitPrice: numeric('exit_price', { precision: 20, scale: 8 }),
    size: numeric('size', { precision: 20, scale: 8 }).notNull(),
    leverage: numeric('leverage', { precision: 5, scale: 2 }).notNull(),
    pnl: numeric('pnl', { precision: 20, scale: 8 }),
    roi: numeric('roi', { precision: 10, scale: 4 }),
    status: varchar('status', { length: 50 }).default('OPEN'),
    executedAt: timestamp('executed_at').defaultNow(),
    closedAt: timestamp('closed_at'),
    aiReasoning: text('ai_reasoning'),
  },
  (table) => ({
    userIdIdx: index('idx_trades_user_id').on(table.userId),
    statusIdx: index('idx_trades_status').on(table.status),
    executedAtIdx: index('idx_trades_executed_at').on(table.executedAt),
  })
);

export const aiLogs = pgTable(
  'ai_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tradeId: uuid('trade_id').references(() => trades.id, { onDelete: 'set null' }),
    agentName: varchar('agent_name', { length: 100 }).notNull(),
    agentModel: varchar('agent_model', { length: 50 }).notNull(),
    inputContext: text('input_context').notNull(),
    outputDecision: text('output_decision').notNull(),
    confidence: numeric('confidence', { precision: 5, scale: 2 }),
    timestamp: timestamp('timestamp').defaultNow(),
  },
  (table) => ({
    userIdIdx: index('idx_ai_logs_user_id').on(table.userId),
    tradeIdIdx: index('idx_ai_logs_trade_id').on(table.tradeId),
    timestampIdx: index('idx_ai_logs_timestamp').on(table.timestamp),
  })
);

export const leaderboard = pgTable(
  'leaderboard',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    rank: integer('rank'),
    totalROI: numeric('total_roi', { precision: 10, scale: 4 }).notNull(),
    winRate: numeric('win_rate', { precision: 5, scale: 2 }).notNull(),
    sharpeRatio: numeric('sharpe_ratio', { precision: 10, scale: 4 }).notNull(),
    totalTrades: integer('total_trades').default(0),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    userIdIdx: index('idx_leaderboard_user_id').on(table.userId),
    rankIdx: index('idx_leaderboard_rank').on(table.rank),
  })
);

export const strategies = pgTable(
  'strategies',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    marketAnalystWeight: numeric('market_analyst_weight', { precision: 5, scale: 2 }).default(
      '0.3'
    ),
    sentimentAgentWeight: numeric('sentiment_agent_weight', { precision: 5, scale: 2 }).default(
      '0.2'
    ),
    riskManagerWeight: numeric('risk_manager_weight', { precision: 5, scale: 2 }).default('0.3'),
    coordinatorWeight: numeric('coordinator_weight', { precision: 5, scale: 2 }).default('0.2'),
    isActive: boolean('is_active').default(false),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => ({
    userIdIdx: index('idx_strategies_user_id').on(table.userId),
  })
);

export const usersRelations = relations(users, ({ one, many }) => ({
  portfolio: one(portfolios, { fields: [users.id], references: [portfolios.userId] }),
  trades: many(trades),
  aiLogs: many(aiLogs),
  strategies: many(strategies),
}));

export const tradesRelations = relations(trades, ({ one, many }) => ({
  user: one(users, { fields: [trades.userId], references: [users.id] }),
  aiLogs: many(aiLogs),
}));
