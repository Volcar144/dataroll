import { z } from 'zod'

// User schemas
export const UserSchema = z.object({
  id: z.string().cuid(),
  name: z.string().min(1).max(255).optional(),
  email: z.string().email(),
  emailVerified: z.date().optional(),
  image: z.string().url().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export const CreateUserSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email(),
  password: z.string().min(8).max(128),
})

export const UpdateUserSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  image: z.string().url().optional(),
})

// Team schemas
export const TeamSchema = z.object({
  id: z.string().cuid(),
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(255),
  description: z.string().max(500).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  createdById: z.string().cuid(),
})

export const CreateTeamSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(500).optional(),
})

export const UpdateTeamSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(500).optional(),
})

// Team member schemas
export const TeamMemberSchema = z.object({
  id: z.string().cuid(),
  teamId: z.string().cuid(),
  userId: z.string().cuid(),
  role: z.enum(['OWNER', 'ADMIN', 'MEMBER']),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export const AddTeamMemberSchema = z.object({
  userId: z.string().cuid(),
  role: z.enum(['ADMIN', 'MEMBER']),
})

export const UpdateTeamMemberSchema = z.object({
  role: z.enum(['OWNER', 'ADMIN', 'MEMBER']),
})

// Database connection schemas
export const DatabaseConnectionSchema = z.object({
  id: z.string().cuid(),
  name: z.string().min(1).max(255),
  type: z.enum(['POSTGRESQL', 'MYSQL', 'SQLITE']),
  host: z.string().min(1).max(255),
  port: z.number().int().positive().optional(),
  database: z.string().min(1).max(255),
  username: z.string().min(1).max(255),
  ssl: z.boolean().default(false),
  url: z.string().url().optional(),
  isActive: z.boolean().default(true),
  createdAt: z.date(),
  updatedAt: z.date(),
  teamId: z.string().cuid(),
  createdById: z.string().cuid(),
})

export const CreateDatabaseConnectionSchema = z.object({
  name: z.string().min(1).max(255),
  type: z.enum(['POSTGRESQL', 'MYSQL', 'SQLITE']),
  host: z.string().min(1).max(255),
  port: z.number().int().positive().optional(),
  database: z.string().min(1).max(255),
  username: z.string().min(1).max(255),
  password: z.string().min(1).max(255),
  ssl: z.boolean().default(false),
  url: z.string().url().optional(),
  teamId: z.string().cuid(),
})

export const UpdateDatabaseConnectionSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  host: z.string().min(1).max(255).optional(),
  port: z.number().int().positive().optional(),
  database: z.string().min(1).max(255).optional(),
  username: z.string().min(1).max(255).optional(),
  password: z.string().min(1).max(255).optional(),
  ssl: z.boolean().optional(),
  url: z.string().url().optional(),
  isActive: z.boolean().optional(),
})

export const TestConnectionSchema = z.object({
  connectionId: z.string().cuid(),
})

// Migration schemas
export const MigrationSchema = z.object({
  id: z.string().cuid(),
  name: z.string().min(1).max(255),
  version: z.string().min(1).max(255),
  type: z.enum(['PRISMA', 'DRIZZLE', 'RAW_SQL']),
  filePath: z.string().min(1).max(500),
  content: z.string().min(1),
  status: z.enum(['PENDING', 'EXECUTING', 'EXECUTED', 'FAILED', 'ROLLED_BACK']),
  checksum: z.string().optional(),
  executedAt: z.date().optional(),
  rolledBackAt: z.date().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  teamId: z.string().cuid(),
  databaseConnectionId: z.string().cuid(),
  createdById: z.string().cuid(),
})

export const CreateMigrationSchema = z.object({
  name: z.string().min(1).max(255),
  version: z.string().min(1).max(255),
  type: z.enum(['PRISMA', 'DRIZZLE', 'RAW_SQL']),
  filePath: z.string().min(1).max(500),
  content: z.string().min(1),
  databaseConnectionId: z.string().cuid(),
  teamId: z.string().cuid(),
  dryRun: z.boolean().default(false),
})

export const ExecuteMigrationSchema = z.object({
  migrationId: z.string().cuid(),
  dryRun: z.boolean().default(false),
  checksum: z.string().optional(),
  teamId: z.string().cuid().optional(),
})

export const RollbackMigrationSchema = z.object({
  migrationId: z.string().cuid(),
  reason: z.string().optional(),
  force: z.boolean().default(false),
  createBackup: z.boolean().default(true),
  teamId: z.string().cuid().optional(),
})

// Audit log schemas
export const AuditLogSchema = z.object({
  id: z.string().cuid(),
  action: z.enum([
    'USER_LOGIN',
    'USER_LOGOUT',
    'TEAM_CREATED',
    'TEAM_UPDATED',
    'TEAM_DELETED',
    'MEMBER_ADDED',
    'MEMBER_REMOVED',
    'MEMBER_ROLE_CHANGED',
    'CONNECTION_CREATED',
    'CONNECTION_UPDATED',
    'CONNECTION_DELETED',
    'MIGRATION_CREATED',
    'MIGRATION_EXECUTED',
    'MIGRATION_ROLLED_BACK',
    'MIGRATION_FAILED',
  ]),
  resource: z.string().min(1).max(255),
  resourceId: z.string().optional(),
  details: z.string().optional(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  createdAt: z.date(),
  teamId: z.string().cuid(),
  userId: z.string().cuid(),
})

// Pagination schemas
export const PaginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

export const PaginatedResponseSchema = <T extends z.ZodType>(itemSchema: T) =>
  z.object({
    data: z.array(itemSchema),
    pagination: z.object({
      page: z.number(),
      limit: z.number(),
      total: z.number(),
      totalPages: z.number(),
      hasNext: z.boolean(),
      hasPrev: z.boolean(),
    }),
  })

// API Response schemas
export const ApiResponseSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: z.object({
      code: z.string(),
      message: z.string(),
      details: z.any().optional(),
    }).optional(),
  })

export const EmptyResponseSchema = ApiResponseSchema(z.object({}))

// Query parameter schemas
export const IdParamSchema = z.object({
  id: z.string().cuid(),
})

export const TeamIdParamSchema = z.object({
  teamId: z.string().cuid(),
})

// Form validation schemas
export const LoginFormSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

export const RegisterFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name is too long'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password is too long')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
})

// Export commonly used types
export type User = z.infer<typeof UserSchema>
export type CreateUser = z.infer<typeof CreateUserSchema>
export type UpdateUser = z.infer<typeof UpdateUserSchema>

export type Team = z.infer<typeof TeamSchema>
export type CreateTeam = z.infer<typeof CreateTeamSchema>
export type UpdateTeam = z.infer<typeof UpdateTeamSchema>

export type TeamMember = z.infer<typeof TeamMemberSchema>
export type AddTeamMember = z.infer<typeof AddTeamMemberSchema>
export type UpdateTeamMember = z.infer<typeof UpdateTeamMemberSchema>

export type DatabaseConnection = z.infer<typeof DatabaseConnectionSchema>
export type CreateDatabaseConnection = z.infer<typeof CreateDatabaseConnectionSchema>
export type UpdateDatabaseConnection = z.infer<typeof UpdateDatabaseConnectionSchema>

export type Migration = z.infer<typeof MigrationSchema>
export type CreateMigration = z.infer<typeof CreateMigrationSchema>
export type ExecuteMigration = z.infer<typeof ExecuteMigrationSchema>
export type RollbackMigration = z.infer<typeof RollbackMigrationSchema>

export type AuditLog = z.infer<typeof AuditLogSchema>
export type Pagination = z.infer<typeof PaginationSchema>

export type LoginForm = z.infer<typeof LoginFormSchema>
export type RegisterForm = z.infer<typeof RegisterFormSchema>