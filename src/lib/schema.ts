import { pgTable, serial, text, integer, boolean, timestamp, unique } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: text('username').notNull().unique(),
  password: text('password').notNull(),
  name: text('name').notNull(),
  isAdmin: boolean('is_admin').default(false).notNull(),
  hasSpecialPrivilege: boolean('has_special_privilege').default(false).notNull(),
  specialPrivilegeUsed: boolean('special_privilege_used').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const matches = pgTable('matches', {
  id: integer('id').primaryKey(), // Match number 1-104
  stage: text('stage').notNull(), // 'group', 'r32', 'r16', 'qf', 'sf', 'third', 'final'
  group: text('group'),           // 'A' through 'L', or null
  homeTeam: text('home_team').notNull(),
  awayTeam: text('away_team').notNull(),
  kickoffAt: timestamp('kickoff_at').notNull(),
  venue: text('venue').notNull(),
  homeScore: integer('home_score'),
  awayScore: integer('away_score'),
  winner: text('winner'), // 'home' | 'draw' | 'away'
  finished: boolean('finished').default(false).notNull(),
  isLockedManually: boolean('is_locked_manually').default(false).notNull(),
  isAnonymous: boolean('is_anonymous').default(false).notNull(),
  anonymityRequested: boolean('anonymity_requested').default(false).notNull(),
});

export const predictions = pgTable('predictions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  matchId: integer('match_id').references(() => matches.id, { onDelete: 'cascade' }).notNull(),
  pick: text('pick').notNull(), // 'home' | 'draw' | 'away' | 'home_advance' | 'away_advance'
  predictedHomeScore: integer('predicted_home_score'),
  predictedAwayScore: integer('predicted_away_score'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => [
  unique('user_match_unique').on(t.userId, t.matchId)
]);

export const settings = pgTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});
