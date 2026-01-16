import { pgTable, text, timestamp, uuid, varchar, boolean, integer, jsonb, index } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// BetterAuth tables (for reference - actual tables created by Prisma)
// Users table
export const users = pgTable('users', {
  id: varchar('id', { length: 255 }).primaryKey(),
  name: varchar('name', { length: 255 }),
  email: varchar('email', { length: 255 }).notNull().unique(),
  emailVerified: timestamp('email_verified', { withTimezone: true, mode: 'date' }),
  image: varchar('image', { length: 255 }),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
})

// Teams table
export const teams = pgTable('teams', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  createdById: varchar('created_by_id', { length: 255 }).notNull(),
}, (table) => {
  return {
    createdByIdx: index('teams_created_by_idx').on(table.createdById),
  }
})

// Team members table
export const teamMembers = pgTable('team_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  teamId: uuid('team_id').notNull(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  role: varchar('role', { length: 50 }).notNull(), // OWNER, ADMIN, MEMBER
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
}, (table) => {
  return {
    teamUserIdx: index('team_members_team_user_idx').on(table.teamId, table.userId),
    teamIdx: index('team_members_team_idx').on(table.teamId),
    userIdx: index('team_members_user_idx').on(table.userId),
  }
})

// Database connections table
export const databaseConnections = pgTable('database_connections', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  type: varchar('type', { length: 50 }).notNull(), // POSTGRESQL, MYSQL, SQLITE
  host: varchar('host', { length: 255 }).notNull(),
  port: integer('port'),
  database: varchar('database', { length: 255 }).notNull(),
  username: varchar('username', { length: 255 }).notNull(),
  password: text('password').notNull(), // encrypted
  ssl: boolean('ssl').notNull().default(false),
  url: text('url'), // direct connection string
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  teamId: uuid('team_id').notNull(),
  createdById: varchar('created_by_id', { length: 255 }).notNull(),
}, (table) => {
  return {
    teamIdx: index('database_connections_team_idx').on(table.teamId),
    createdByIdx: index('database_connections_created_by_idx').on(table.createdById),
  }
})

// Migrations table
export const migrations = pgTable('migrations', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  version: varchar('version', { length: 255 }).notNull(),
  type: varchar('type', { length: 50 }).notNull(), // PRISMA, DRIZZLE, RAW_SQL
  filePath: varchar('file_path', { length: 500 }).notNull(),
  content: text('content').notNull(),
  status: varchar('status', { length: 50 }).notNull().default('PENDING'), // PENDING, EXECUTING, EXECUTED, FAILED, ROLLED_BACK
  checksum: varchar('checksum', { length: 255 }),
  executedAt: timestamp('executed_at', { withTimezone: true, mode: 'date' }),
  rolledBackAt: timestamp('rolled_back_at', { withTimezone: true, mode: 'date' }),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  teamId: uuid('team_id').notNull(),
  databaseConnectionId: uuid('database_connection_id').notNull(),
  createdById: varchar('created_by_id', { length: 255 }).notNull(),
}, (table) => {
  return {
    teamIdx: index('migrations_team_idx').on(table.teamId),
    connectionIdx: index('migrations_connection_idx').on(table.databaseConnectionId),
    versionIdx: index('migrations_version_idx').on(table.version, table.databaseConnectionId),
    statusIdx: index('migrations_status_idx').on(table.status),
  }
})

// Migration executions table
export const migrationExecutions = pgTable('migration_executions', {
  id: uuid('id').primaryKey().defaultRandom(),
  migrationId: uuid('migration_id').notNull(),
  status: varchar('status', { length: 50 }).notNull(), // SUCCESS, FAILURE, ROLLBACK
  duration: integer('duration'), // in milliseconds
  error: text('error'),
  executedAt: timestamp('executed_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  executedBy: varchar('executed_by', { length: 255 }).notNull(),
}, (table) => {
  return {
    migrationIdx: index('migration_executions_migration_idx').on(table.migrationId),
    executedAtIdx: index('migration_executions_executed_at_idx').on(table.executedAt),
  }
})

// Migration rollbacks table
export const migrationRollbacks = pgTable('migration_rollbacks', {
  id: uuid('id').primaryKey().defaultRandom(),
  migrationId: uuid('migration_id').notNull(),
  reason: text('reason'),
  rolledBackAt: timestamp('rolled_back_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  rolledBackBy: varchar('rolled_back_by', { length: 255 }).notNull(),
  backupLocation: text('backup_location'),
}, (table) => {
  return {
    migrationIdx: index('migration_rollbacks_migration_idx').on(table.migrationId),
    rolledBackAtIdx: index('migration_rollbacks_rolled_back_at_idx').on(table.rolledBackAt),
  }
})

// Audit logs table
export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  action: varchar('action', { length: 100 }).notNull(),
  resource: varchar('resource', { length: 255 }).notNull(),
  resourceId: varchar('resource_id', { length: 255 }),
  details: text('details'),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  teamId: uuid('team_id').notNull(),
  userId: varchar('user_id', { length: 255 }).notNull(),
}, (table) => {
  return {
    teamIdx: index('audit_logs_team_idx').on(table.teamId),
    userIdx: index('audit_logs_user_idx').on(table.userId),
    actionIdx: index('audit_logs_action_idx').on(table.action),
    createdAtIdx: index('audit_logs_created_at_idx').on(table.createdAt),
  }
})

// Two factor auth table
export const twoFactorAuth = pgTable('two_factor_auth', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: varchar('user_id', { length: 255 }).notNull().unique(),
  enabled: boolean('enabled').notNull().default(false),
  secret: text('secret'),
  backupCodes: jsonb('backup_codes'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
}, (table) => {
  return {
    userIdx: index('two_factor_auth_user_idx').on(table.userId),
  }
})

// Notification preferences table
export const notificationPreferences = pgTable('notification_preferences', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: varchar('user_id', { length: 255 }).notNull().unique(),
  emailOnSuccess: boolean('email_on_success').notNull().default(true),
  emailOnFailure: boolean('email_on_failure').notNull().default(true),
  emailOnRollback: boolean('email_on_rollback').notNull().default(true),
  slackWebhook: text('slack_webhook'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
}, (table) => {
  return {
    userIdx: index('notification_preferences_user_idx').on(table.userId),
  }
})

// Auto approval rules table
export const autoApprovalRules = pgTable('auto_approval_rules', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  connectionId: varchar('connection_id', { length: 255 }),
  teamId: varchar('team_id', { length: 255 }),
  queryPattern: text('query_pattern'),
  maxRows: integer('max_rows'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
}, (table) => {
  return {
    userIdx: index('auto_approval_rules_user_idx').on(table.userId),
    connectionIdx: index('auto_approval_rules_connection_idx').on(table.connectionId),
    teamIdx: index('auto_approval_rules_team_idx').on(table.teamId),
  }
})

// Relations (for reference - actual relations handled by Prisma)
export const teamsRelations = relations(teams, ({ many }) => ({
  members: many(teamMembers),
  databaseConnections: many(databaseConnections),
  migrations: many(migrations),
  auditLogs: many(auditLogs),
}))

export const teamMembersRelations = relations(teamMembers, ({ one }) => ({
  team: one(teams, {
    fields: [teamMembers.teamId],
    references: [teams.id],
  }),
  user: one(users, {
    fields: [teamMembers.userId],
    references: [users.id],
  }),
}))

export const databaseConnectionsRelations = relations(databaseConnections, ({ one }) => ({
  team: one(teams, {
    fields: [databaseConnections.teamId],
    references: [teams.id],
  }),
  createdBy: one(users, {
    fields: [databaseConnections.createdById],
    references: [users.id],
  }),
}))

export const migrationsRelations = relations(migrations, ({ one, many }) => ({
  team: one(teams, {
    fields: [migrations.teamId],
    references: [teams.id],
  }),
  databaseConnection: one(databaseConnections, {
    fields: [migrations.databaseConnectionId],
    references: [databaseConnections.id],
  }),
  createdBy: one(users, {
    fields: [migrations.createdById],
    references: [users.id],
  }),
  executions: many(migrationExecutions),
  rollbacks: many(migrationRollbacks),
}))

export const migrationExecutionsRelations = relations(migrationExecutions, ({ one }) => ({
  migration: one(migrations, {
    fields: [migrationExecutions.migrationId],
    references: [migrations.id],
  }),
}))

export const migrationRollbacksRelations = relations(migrationRollbacks, ({ one }) => ({
  migration: one(migrations, {
    fields: [migrationRollbacks.migrationId],
    references: [migrations.id],
  }),
}))

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  team: one(teams, {
    fields: [auditLogs.teamId],
    references: [teams.id],
  }),
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
}))

export const twoFactorAuthRelations = relations(twoFactorAuth, ({ one }) => ({
  user: one(users, {
    fields: [twoFactorAuth.userId],
    references: [users.id],
  }),
}))

export const notificationPreferencesRelations = relations(notificationPreferences, ({ one }) => ({
  user: one(users, {
    fields: [notificationPreferences.userId],
    references: [users.id],
  }),
}))