import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  timestamp,
  doublePrecision,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export type UserRole = 'coach' | 'student';
export type TournamentStatus = 'draft' | 'open' | 'ongoing' | 'completed';
export type MatchStatus = 'waiting' | 'active' | 'completed';
export type MatchResult = 'white' | 'black' | 'draw';
export type TerminationReason =
  | 'checkmate'
  | 'resignation'
  | 'timeout'
  | 'stalemate'
  | 'draw'
  | 'agreement';

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  role: varchar('role', { length: 32 }).notNull().$type<UserRole>().default('student'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const tournaments = pgTable('tournaments', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  timeControl: varchar('time_control', { length: 64 }).notNull().default('5+0'),
  initialTimeSeconds: integer('initial_time_seconds').notNull().default(300),
  incrementSeconds: integer('increment_seconds').notNull().default(0),
  status: varchar('status', { length: 32 }).notNull().$type<TournamentStatus>().default('open'),
  createdBy: uuid('created_by')
    .references(() => users.id)
    .notNull(),
  startDate: timestamp('start_date'),
  endDate: timestamp('end_date'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const tournamentParticipants = pgTable(
  'tournament_participants',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tournamentId: uuid('tournament_id')
      .references(() => tournaments.id, { onDelete: 'cascade' })
      .notNull(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    score: doublePrecision('score').notNull().default(0),
    joinedAt: timestamp('joined_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('tournament_participant_unique_idx').on(table.tournamentId, table.userId),
  ],
);

export const matches = pgTable('matches', {
  id: uuid('id').defaultRandom().primaryKey(),
  tournamentId: uuid('tournament_id')
    .references(() => tournaments.id, { onDelete: 'cascade' })
    .notNull(),
  whitePlayerId: uuid('white_player_id')
    .references(() => users.id)
    .notNull(),
  blackPlayerId: uuid('black_player_id')
    .references(() => users.id)
    .notNull(),
  status: varchar('status', { length: 32 }).notNull().$type<MatchStatus>().default('active'),
  result: varchar('result', { length: 32 }).$type<MatchResult>(),
  terminationReason: varchar('termination_reason', { length: 64 }).$type<TerminationReason>(),
  fen: text('fen')
    .notNull()
    .default('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'),
  pgn: text('pgn').notNull().default(''),
  turn: varchar('turn', { length: 1 }).notNull().default('w'),
  whiteTimeRemaining: integer('white_time_remaining').notNull().default(300),
  blackTimeRemaining: integer('black_time_remaining').notNull().default(300),
  lastMoveAt: timestamp('last_move_at'),
  startedAt: timestamp('started_at').defaultNow().notNull(),
  endedAt: timestamp('ended_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const matchMoves = pgTable('match_moves', {
  id: uuid('id').defaultRandom().primaryKey(),
  matchId: uuid('match_id')
    .references(() => matches.id, { onDelete: 'cascade' })
    .notNull(),
  moveNumber: integer('move_number').notNull(),
  playerId: uuid('player_id')
    .references(() => users.id)
    .notNull(),
  fromSquare: varchar('from_square', { length: 4 }).notNull(),
  toSquare: varchar('to_square', { length: 4 }).notNull(),
  promotion: varchar('promotion', { length: 2 }),
  san: varchar('san', { length: 16 }).notNull(),
  fenAfter: text('fen_after').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const matchmakingQueue = pgTable(
  'matchmaking_queue',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tournamentId: uuid('tournament_id')
      .references(() => tournaments.id, { onDelete: 'cascade' })
      .notNull(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    socketId: varchar('socket_id', { length: 128 }),
    joinedAt: timestamp('joined_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('matchmaking_queue_user_unique_idx').on(table.userId),
  ],
);

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  createdTournaments: many(tournaments),
  participations: many(tournamentParticipants),
}));

export const tournamentsRelations = relations(tournaments, ({ one, many }) => ({
  creator: one(users, {
    fields: [tournaments.createdBy],
    references: [users.id],
  }),
  participants: many(tournamentParticipants),
  matches: many(matches),
}));

export const tournamentParticipantsRelations = relations(
  tournamentParticipants,
  ({ one }) => ({
    tournament: one(tournaments, {
      fields: [tournamentParticipants.tournamentId],
      references: [tournaments.id],
    }),
    user: one(users, {
      fields: [tournamentParticipants.userId],
      references: [users.id],
    }),
  }),
);

export const matchesRelations = relations(matches, ({ one, many }) => ({
  tournament: one(tournaments, {
    fields: [matches.tournamentId],
    references: [tournaments.id],
  }),
  whitePlayer: one(users, {
    fields: [matches.whitePlayerId],
    references: [users.id],
  }),
  blackPlayer: one(users, {
    fields: [matches.blackPlayerId],
    references: [users.id],
  }),
  moves: many(matchMoves),
}));

export const matchMovesRelations = relations(matchMoves, ({ one }) => ({
  match: one(matches, {
    fields: [matchMoves.matchId],
    references: [matches.id],
  }),
  player: one(users, {
    fields: [matchMoves.playerId],
    references: [users.id],
  }),
}));
