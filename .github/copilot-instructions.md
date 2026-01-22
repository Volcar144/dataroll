# DataRoll - AI Coding Agent Instructions

DataRoll is a comprehensive database migration manager SaaS platform with multi-team support, migration versioning, validation, and rollback capabilities. Built with Next.js 16, React 19, Prisma, and BetterAuth.

## Architecture Overview

### Core Tech Stack
- **Frontend**: Next.js 16 App Router with React 19, Tailwind CSS 4, Radix UI
- **Authentication**: BetterAuth with Prisma adapter (email/password, passkeys, 2FA, breach detection)
- **Database**: PostgreSQL (Prisma ORM) with support for managing MySQL/SQLite target databases
- **Validation**: Zod schemas in `lib/validation.ts`
- **Encryption**: AES-256-GCM via Node crypto (see `lib/encryption.ts`)
- **Logging**: Pino with optional Logflare transport (`lib/logger.ts`)
- **Monitoring**: PostHog for error tracking and analytics

### Data Model Architecture
- **Multi-tenancy**: Team-based isolation with `TeamMember` roles (OWNER, ADMIN, DEVELOPER, VIEWER)
- **Migrations**: Support both Prisma and Drizzle ORM workflows with versioning, dry-run, and rollback
- **Audit Trail**: All actions logged via `lib/audit.ts` → `AuditLog` table with team/user/IP tracking
- **Approvals**: Migration approvals with status tracking (PENDING, APPROVED, REJECTED)
- **Workflows**: Visual node-based workflow system (YAML/JSON definitions) - see `instructions.md` for planned features

## Critical Developer Patterns

### Authentication & Authorization
```typescript
// All API routes MUST start with session check
import { getSession } from '@/lib/auth'
const session = await getSession(request)
if (!session?.user) {
  return NextResponse.json({ error: { code: 'UNAUTHORIZED', ... } }, { status: 401 })
}

// Then verify team membership
const teamMember = await prisma.teamMember.findFirst({
  where: { teamId, userId: session.user.id }
})
if (!teamMember) {
  return NextResponse.json({ error: { code: 'FORBIDDEN', ... } }, { status: 403 })
}
```

BetterAuth setup: All plugins enabled in `lib/auth.ts` including passkey, twoFactor, haveIBeenPwned, deviceAuthorization, and apiKey. Session strategy is database-backed.

### Error Handling Standard
Use typed errors from `lib/errors.ts`:
```typescript
import { formatError } from '@/lib/errors'
import { logger } from '@/lib/telemetry'

try {
  // operation
} catch (error) {
  logger.error('Operation failed', error instanceof Error ? error : undefined, { userId, teamId })
  const formatted = formatError(error)
  return NextResponse.json(formatted, { status: formatted.error.statusCode || 500 })
}
```

### Audit Logging Pattern
Every mutation MUST create audit log:
```typescript
import { createAuditLog } from '@/lib/audit'

await createAuditLog({
  action: 'MIGRATION_EXECUTE', // See AuditAction enum in schema
  resource: 'Migration',
  resourceId: migration.id,
  details: { version: migration.version, status: 'success' },
  teamId,
  userId: session.user.id,
  ipAddress: request.headers.get('x-forwarded-for'),
  userAgent: request.headers.get('user-agent')
})
```

### Credential Encryption
Database connection credentials ALWAYS encrypted:
```typescript
import { encryptCredentials, decryptCredentials } from '@/lib/encryption'

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-encryption-key-change-in-production'

// Before storing
const encrypted = await encryptCredentials(credentials, ENCRYPTION_KEY)
await prisma.databaseConnection.create({ data: { ...data, credentials: encrypted } })

// When reading
const decrypted = await decryptCredentials(connection.credentials, ENCRYPTION_KEY)
```

### Validation with Zod
All API inputs validated via schemas in `lib/validation.ts`:
```typescript
import { CreateMigrationSchema } from '@/lib/validation'

const body = await request.json()
const validated = CreateMigrationSchema.parse(body) // Throws ValidationError if invalid
```

## Environment & Configuration

### Required Environment Variables
```bash
# Database (Prisma uses DIRECT_URL for migrations)
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."

# BetterAuth (CRITICAL - generate with: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")
BETTER_AUTH_SECRET="..."
BETTER_AUTH_URL="http://localhost:3000"  # or production URL

# Encryption (CRITICAL for production - used for database credentials)
ENCRYPTION_KEY="..."

# Optional: Logging & Monitoring
LOGFLARE_API_KEY="..."
POSTHOG_API_KEY="..."  # Personal API key (phx_...)
POSTHOG_ENV_ID="..."
NEXT_PUBLIC_POSTHOG_KEY="..."
NEXT_PUBLIC_POSTHOG_HOST="https://eu.i.posthog.com"

# Optional: OAuth providers (Google, GitHub, Discord)
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
```

## Development Workflows

### Running Locally
```bash
npm install
npx prisma generate              # Generate Prisma client
npx prisma migrate dev           # Apply migrations to local DB
npm run db:seed                  # Optional: seed test data
npm run dev                      # Start dev server on :3000
```

### Database Commands
```bash
npm run db:push            # Push schema changes without migration
npm run db:migrate         # Create and apply new migration
npm run db:migrate:deploy  # Apply migrations (production)
npm run db:studio          # Open Prisma Studio GUI
npm run db:reset           # Reset database (dev only!)
npm run db:seed            # Run seed script
```

### BetterAuth Schema Updates
When modifying auth tables, regenerate schema:
```bash
npx better-auth generate   # or npm run auth:generate
```

## Security Middleware

Rate limiting configured in `middleware.ts`:
- API routes: 50 req/min per IP
- General routes: 100 req/min per IP
- Headers: X-Frame-Options: DENY, CSP, HSTS (see `next.config.ts`)

CSRF protection available via `/api/csrf` endpoint (see `lib/csrf.ts`).

## Code Conventions

### File Organization
- **API Routes**: `app/api/[resource]/route.ts` - follow REST patterns (GET, POST, PUT, DELETE)
- **Page Routes**: `app/[route]/page.tsx` - App Router server components by default
- **Lib Utilities**: `lib/[feature].ts` - server-side only (marked `'use server'` where needed)
- **Components**: `components/[name].tsx` - client components when interactive
- **UI Primitives**: `components/ui/[component].tsx` - Radix UI wrappers with CVA

### Naming Conventions
- React components: PascalCase (`TeamSwitcher.tsx`)
- API routes: lowercase with hyphens (`app/api/audit-logs/route.ts`)
- Database models: PascalCase singular (`Migration`, `TeamMember`)
- Zod schemas: PascalCase with `Schema` suffix (`CreateMigrationSchema`)

### TypeScript Patterns
- Use Zod `.parse()` for runtime validation, not TypeScript types alone
- Prisma types: `import { AuditAction } from '@prisma/client'` for enums
- Never use `any` - prefer `unknown` and narrow with type guards
- Server actions marked with `'use server'` directive

## Testing & Debugging

### Testing Framework
**Vitest** configured with TypeScript support. Run tests via:
```bash
npm test              # Run tests once
npm run test:watch    # Watch mode for TDD
npm run test:ui       # Open Vitest UI
npm run test:coverage # Generate coverage report
```

### Test Organization
```
tests/
├── setup.ts                      # Global test setup, mocks
├── lib/
│   ├── validation.test.ts        # Zod schema validation tests (10 tests)
│   ├── validation-advanced.test.ts # Advanced schema tests (16 tests)
│   ├── encryption.test.ts        # Encryption/decryption tests (6 tests)
│   ├── errors.test.ts            # Error handling tests (20 tests)
│   ├── utils.test.ts             # Utility function tests (4 tests)
│   ├── audit.test.ts             # Audit logging tests (4 tests)
│   └── permissions.test.ts       # Permission system tests (13 tests)
└── api/
    └── [feature]/
        └── route.test.ts         # API route tests (TBD)
```

**Total: 73 tests passing**

### Testing Patterns

**Unit Tests - Pure Functions**
```typescript
import { describe, it, expect } from 'vitest'
import { encrypt, decrypt } from '@/lib/encryption'

describe('Encryption', () => {
  it('should encrypt and decrypt data', async () => {
    const data = 'sensitive'
    const key = 'test-key'
    const encrypted = await encrypt(data, key)
    const decrypted = await decrypt(encrypted, key)
    expect(decrypted).toBe(data)
  })
})
```

**Validation Tests - Zod Schemas**
```typescript
import { CreateMigrationSchema } from '@/lib/validation'

it('should validate migration input', () => {
  const result = CreateMigrationSchema.safeParse({
    name: 'add-users',
    type: 'PRISMA',
    content: 'CREATE TABLE...',
  })
  expect(result.success).toBe(true)
})
```

**Mocking Pattern** (configured in `tests/setup.ts`):
- PostHog tracking mocked globally
- Logger functions mocked to prevent console spam
- Environment variables set for test isolation

### Manual Testing Tools
- `/test-error-tracking` - PostHog error capture
- `test-login.js` - Auth flow testing
- Prisma Studio for DB inspection

### Coverage Goals
Focus on:
- ✅ Validation schemas (100% - critical for API security)
- ✅ Encryption/decryption (100% - data security)
- ✅ Error handling: 92% (comprehensive error management)
- ✅ Utility functions: 100%
- ✅ Permissions: 50% (role-based access control)
- ✅ Audit logging: 19% (basic coverage)
- 🎯 Database operations: Future
- 📝 API routes: Future (integration tests)

### Logging Approach
Use structured logging with context:
```typescript
import { logger } from '@/lib/telemetry'
logger.info('Migration executed', { migrationId, teamId, userId, duration })
logger.error('Database connection failed', error, { connectionId, type: 'postgresql' })
```

### Error Tracking
PostHog captures all server exceptions automatically via `lib/posthog-server.ts`. Client-side errors via global-error.tsx and error.tsx boundaries.

## Migration System Details

### Workflow
1. User creates migration via `/api/migrations` with SQL content
2. Optional: Request approval → `MigrationApproval` record
3. Execute via migration execution service (`lib/migration-execution.ts`)
4. Create `MigrationExecution` record with output/errors
5. Audit log created automatically
6. Optional: Rollback creates new migration with inverse SQL

### Dry-Run Pattern
All migrations support `dryRun: true` flag - wraps in transaction and rolls back.

## Integration Points

### Email Notifications
See `lib/email.ts` - uses Nodemailer. Password reset, invitations, migration alerts.

### Webhooks
Webhook delivery tracking in `WebhookDelivery` table. Events: migration executed, approval requested, etc.

### Linear Integration
SDK integrated for issue tracking (`@linear/sdk`). Config stored encrypted in `UserIntegration` table.

## Common Gotchas

1. **Account Model**: NextAuth fields (`type`, `provider`) are nullable for BetterAuth compatibility - see `DEPLOYMENT_INSTRUCTIONS.md`
2. **Prisma Generate**: Always run after schema changes or pulling code
3. **Environment URLs**: Remove trailing slashes from `BETTER_AUTH_URL` - middleware handles this
4. **Encryption Key**: Never commit real keys - use env vars, generate with `openssl rand -base64 32`
5. **Rate Limiting**: In-memory store - use Redis for production multi-instance deployments
6. **PostHog Sourcemaps**: Only upload when `POSTHOG_API_KEY` starts with `phx_` and `POSTHOG_ENV_ID` set

## DataRoll SDK (`packages/dataroll-sdk`)

### Overview
TypeScript SDK published as `@dataroll/sdk` providing both programmatic and CLI interfaces for database management. Includes device authorization flow for secure CLI authentication.

### SDK Architecture
```typescript
// Core client with axios-based HTTP layer
export class DataRollClient {
  constructor(config: { apiKey: string, baseUrl?: string, teamId?: string })
  
  // Connection management
  createConnection(data), getConnections(), testConnection(connectionId)
  
  // Migration operations
  createMigration(connectionId, data), executeMigration(connectionId, migrationId)
  rollbackMigration(connectionId, migrationId), getMigrations(connectionId)
  
  // Monitoring
  getHealthStatus(connectionId), performHealthCheck(connectionId)
  getErrors(connectionId, options)
}

// Device authorization for CLI
export async function login(options: { baseUrl: string }): Promise<{ apiKey: string }>
```

### CLI Tool
Located in `src/cli/index.ts` using Commander.js. Config stored in `~/.dataroll/config.json`.

**Key patterns:**
```bash
# Device-based authentication (better-auth deviceAuthorization plugin)
dataroll login  # Opens browser for approval, saves API key locally

# File path security: readFileSafely() restricts access to git repo root
dataroll migrate -c <conn-id> -f migration.sql  # File must be in repo
```

**Common commands:**
- `dataroll connections` - List all connections
- `dataroll migrate -c <id> -n "name" -f file.sql` - Create and execute migration
- `dataroll health -c <id>` - Check database health
- `dataroll rollback -c <id> -m <migration-id>` - Rollback migration

### SDK Development Workflow
```bash
cd packages/dataroll-sdk
npm run dev          # Watch mode for TypeScript compilation
npm run build        # Build for distribution
npm link             # Test locally before publish
```

**Important notes:**
- Uses Zod for validation matching main app schemas
- All API calls authenticated via `Authorization: Bearer <apiKey>` header
- `ApiKey` model in Prisma tracks CLI keys per user
- Device flow leverages `/api/auth/device` (BetterAuth plugin)

## CI/CD Integration (`/api/cicd`)

### Endpoint Overview
RESTful API for automated migration execution from CI/CD pipelines. Authenticates via API keys (stored in `ApiKey` table).

### Request Pattern
```bash
# API Key authentication (not session-based)
curl -X POST https://your-domain.com/api/cicd?action=migrate \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "connectionId": "...",
    "name": "add-users-table",
    "type": "PRISMA",
    "content": "CREATE TABLE users...",
    "description": "Add users table",
    "autoExecute": true
  }'
```

### Actions
- **`?action=migrate`** - Create and optionally execute migration
  - Validates `MigrationRequestSchema` (Zod)
  - Creates migration with `filePath: "ci/{name}.sql"`
  - If `autoExecute: true`, runs via `executeMigration()`
  - Logs to audit trail with `via: 'CI/CD API'`
  
- **`?action=query`** - Execute arbitrary SQL (pending approval flow)
  - Validates `QueryRequestSchema`
  - Creates `PendingQuery` requiring approval
  - Returns query ID for status polling

### CI/CD Pipeline Example
```yaml
# GitHub Actions / GitLab CI
- name: Run DataRoll Migration
  env:
    DATAROLL_API_KEY: ${{ secrets.DATAROLL_API_KEY }}
  run: |
    npx @dataroll/sdk migrate \
      -c $CONNECTION_ID \
      -n "migration-$CI_COMMIT_SHA" \
      -f prisma/migrations/latest.sql
```

**Security considerations:**
- API keys scoped to user/team via `ApiKey.userId` → `TeamMember` relations
- All mutations create audit logs with `via: 'CI/CD API'` tag
- Connection access verified: user must own connection or be team member
- Rate limiting applies (50 req/min per IP via middleware)

### API Key Management
```typescript
// Generate API key (done via UI or SDK login flow)
await prisma.apiKey.create({
  data: {
    name: 'GitHub Actions CI',
    key: crypto.randomBytes(32).toString('hex'),
    userId: session.user.id,
    teamId: team.id,
    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
  }
})
```

**Rotate keys regularly** - Expired keys fail with 401. Check `expiresAt` in `/api/cicd` handler.

## Key Files Reference

- [lib/auth.ts](lib/auth.ts) - BetterAuth config with all plugins
- [prisma/schema.prisma](prisma/schema.prisma) - Complete data model (991 lines)
- [lib/validation.ts](lib/validation.ts) - Zod schemas for all entities
- [lib/encryption.ts](lib/encryption.ts) - AES-256-GCM credential encryption
- [lib/audit.ts](lib/audit.ts) - Audit logging service
- [middleware.ts](middleware.ts) - Rate limiting, security headers
- [app/api/migrations/route.ts](app/api/migrations/route.ts) - Migration CRUD example
- [app/api/cicd/route.ts](app/api/cicd/route.ts) - CI/CD API endpoint for automation
- [packages/dataroll-sdk/src/index.ts](packages/dataroll-sdk/src/index.ts) - SDK client implementation
- [packages/dataroll-sdk/src/cli/index.ts](packages/dataroll-sdk/src/cli/index.ts) - CLI tool with Commander.js
- [instructions.md](instructions.md) - Workflow system implementation plan

## AI Agent Best Practices

- Always check session and team membership in API routes
- Create audit logs for all mutations
- Validate inputs with Zod schemas
- Encrypt sensitive data before storage
- Follow error handling patterns with typed errors
- Use structured logging with context
- Check for existing patterns in similar routes before creating new code
- Reference Prisma schema for accurate field names and relations
- For SDK changes, update both TypeScript types and Zod schemas
- CI/CD endpoints use API key auth, not session auth - check `ApiKey` table
- Tag audit logs with context: `via: 'CI/CD API'`, `via: 'SDK'`, `via: 'UI'`
