# DataRoll

A comprehensive database migration manager SaaS platform with support for both Prisma and Drizzle ORM, featuring multi-team support, migration versioning, validation, and rollback capabilities.

## Features

- 🔐 **Authentication & Authorization** - Secure user authentication with BetterAuth
- 👥 **Multi-Team Support** - Organize users and resources by teams
- 🗄️ **Database Support** - Connect to PostgreSQL, MySQL, and SQLite databases
- 📋 **Migration Management** - Version, validate, and execute database migrations
- 🔄 **Rollback Capabilities** - Safe migration rollback with audit trails
- 🛡️ **Audit Logging** - Comprehensive activity tracking and security monitoring
- 🏃‍♂️ **Dry-Run Support** - Test migrations before execution
- 📧 **Notifications** - Email and Slack integration for migration alerts
- 🔒 **Secure Credential Storage** - Encrypted database connection credentials

## Tech Stack

- **Frontend**: Next.js 16 with React 19
- **Authentication**: BetterAuth
- **Database ORM**: Prisma + Drizzle ORM
- **Database**: PostgreSQL (primary), MySQL/SQLite (targets)
- **Validation**: Zod
- **Encryption**: Node.js Crypto (AES-256-GCM)
- **Styling**: Tailwind CSS
- **TypeScript**: Full TypeScript support

## Prerequisites

- Node.js 18+ 
- PostgreSQL 14+ (for the dataroll application database)
- npm or yarn package manager

## Quick Start

### 1. Clone and Install Dependencies

```bash
git clone <your-repo-url>
cd dataroll
npm install
```

### 2. Environment Setup

Copy the example environment file and configure your variables:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Database Configuration
DATABASE_URL="postgresql://username:password@localhost:5432/dataroll?schema=public"

# BetterAuth Configuration
BETTER_AUTH_URL="http://localhost:3000"
BETTER_AUTH_SECRET="your-secret-key-here"

# Security & Encryption
ENCRYPTION_KEY="your-encryption-key-here"

# Environment
NODE_ENV="development"
```

**Generate required secrets:**

```bash
# Generate Better Auth secret (32+ characters)
openssl rand -hex(32)

# Generate encryption key (32 bytes base64)
openssl rand -base64(32)
```

### 3. Database Setup

Initialize and migrate the database:

```bash
# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push

# (Optional) Seed with demo data
npm run db:seed
```

### 4. Start Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to access the application.

## Database Management

### Available Scripts

```bash
# Prisma Commands
npm run db:push          # Push schema changes to database
npm run db:generate      # Generate Prisma client
npm run db:migrate       # Create and run migrations
npm run db:migrate:deploy # Deploy migrations in production
npm run db:studio        # Open Prisma Studio
npm run db:reset         # Reset database (development only)
npm run db:seed          # Seed database with demo data

# Drizzle Commands  
npm run drizzle:generate # Generate Drizzle migrations
npm run drizzle:migrate  # Run Drizzle migrations
npm run drizzle:push     # Push schema to database
```

### Database Schema

The application uses a comprehensive database schema with the following main entities:

- **Users** - User accounts and profiles
- **Teams** - Multi-tenant team organization
- **Team Members** - User-team relationships with roles (OWNER, ADMIN, MEMBER)
- **Database Connections** - Stored database credentials (encrypted)
- **Migrations** - Migration tracking and versioning
- **Migration Executions** - Execution history and audit trail
- **Migration Rollbacks** - Rollback history and reasoning
- **Audit Logs** - Comprehensive activity tracking
- **Two Factor Auth** - 2FA configuration
- **Notification Preferences** - User notification settings

## API Endpoints

### Authentication
- `POST /api/auth/*` - BetterAuth authentication endpoints

### Teams
- `GET /api/teams` - List user's teams
- `POST /api/teams` - Create new team

### Database Connections
- `GET /api/connections` - List team database connections
- `POST /api/connections` - Create new database connection

### Migrations
- `GET /api/migrations` - List team migrations
- `POST /api/migrations` - Create new migration

### Audit Logs
- `GET /api/audit-logs` - List team audit logs
- `POST /api/audit-logs` - Create audit log entry

## Security Features

### Authentication
- BetterAuth with password authentication
- Session management with configurable expiry
- Email verification support
- Secure password requirements (min 8 chars, uppercase, lowercase, numbers)

### Authorization
- Role-based access control (OWNER, ADMIN, MEMBER)
- Team-based resource isolation
- Resource-level permissions

### Data Protection
- AES-256-GCM encryption for stored credentials
- Secure session management
- Audit logging for all critical operations
- Input validation with Zod schemas

### Security Headers
- CSRF protection
- XSS protection
- Content Security Policy
- Secure cookie configuration

## Development

### Project Structure

```
dataroll/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   │   ├── auth/          # Authentication endpoints
│   │   ├── connections/   # Database connection management
│   │   ├── migrations/    # Migration operations
│   │   ├── teams/         # Team management
│   │   └── audit-logs/   # Audit trail endpoints
│   ├── layout.tsx         # Root layout
│   └── page.tsx          # Home page
├── lib/                   # Utility libraries
│   ├── auth.ts           # BetterAuth configuration
│   ├── prisma.ts         # Prisma client
│   ├── encryption.ts     # Credential encryption
│   ├── validation.ts    # Zod schemas
│   ├── errors.ts         # Error handling
│   ├── telemetry.ts      # Logging utilities
│   └── db/               # Database utilities
│       ├── connection.ts # Database connection testing
│       └── schema.ts     # Drizzle schema
├── prisma/               # Prisma schema and migrations
│   ├── schema.prisma     # Database schema
│   └── seed.ts          # Database seeding
├── drizzle.config.ts     # Drizzle configuration
├── .env.example         # Environment variables template
└── README.md            # This file
```

### Code Standards

- **TypeScript**: Strict mode enabled
- **ESLint**: Configured for Next.js and TypeScript
- **Path Aliases**: Use `@/` for imports from root
- **Error Handling**: Use standardized error classes
- **Validation**: Zod schemas for all inputs
- **Logging**: Structured logging with context

### Adding New Features

1. **Database Changes**: Update Prisma schema and run migrations
2. **API Endpoints**: Follow the established pattern in `/app/api`
3. **Validation**: Add Zod schemas in `/lib/validation.ts`
4. **Error Handling**: Use classes from `/lib/errors.ts`
5. **Logging**: Use logger from `/lib/telemetry.ts`

## Production Deployment

### Environment Variables

Ensure all production environment variables are set:

```env
NODE_ENV="production"
DATABASE_URL="postgresql://..."
BETTER_AUTH_URL="https://yourdomain.com"
BETTER_AUTH_SECRET="production-secret"
ENCRYPTION_KEY="production-encryption-key"
```

### Database Migration

```bash
# Run in production
npm run db:migrate:deploy
```

### Build and Start

```bash
npm run build
npm start
```

### Security Considerations

- Use strong, unique secrets for BETTER_AUTH_SECRET and ENCRYPTION_KEY
- Enable SSL/TLS for all database connections
- Set up proper firewall rules for database access
- Configure proper backup strategies
- Enable audit logging in production
- Set up monitoring and alerting

## Troubleshooting

### Common Issues

**Database Connection Failed**
- Verify DATABASE_URL is correct
- Ensure PostgreSQL is running
- Check firewall and network access

**BetterAuth Errors**
- Verify BETTER_AUTH_SECRET is set
- Check BETTER_AUTH_URL matches your domain
- Ensure database is properly migrated

**Encryption Errors**
- Verify ENCRYPTION_KEY is set and consistent
- Check that encrypted data wasn't corrupted

**Migration Issues**
- Check migration logs for specific errors
- Verify database permissions
- Test connection with database credentials

### Getting Help

1. Check the console output for specific error messages
2. Verify environment variables are correctly set
3. Ensure database is accessible and properly configured
4. Check the audit logs for failed operations

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.