# DataRoll

A comprehensive database migration manager SaaS platform with support for both Prisma and Drizzle ORM, featuring multi-team support, migration versioning, validation, and rollback capabilities.

## Features

- 🔐 **Advanced Authentication** - Complete BetterAuth implementation with all plugins
  - Email/password with verification and breach detection
  - Passkey/WebAuthn support for passwordless authentication
  - Two-factor authentication (TOTP + backup codes)
  - HaveIBeenPwned password breach detection
  - Session management with database strategy
  - User profile and security settings management
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
- **Authentication**: BetterAuth with all plugins enabled
  - Passkey/WebAuthn authentication
  - Two-factor authentication (TOTP + backup codes)
  - Password breach detection (HaveIBeenPwned)
  - Email/password with verification
  - Session management
- **Database ORM**: Prisma + Drizzle ORM
- **Database**: PostgreSQL (primary), MySQL/SQLite (targets)
- **Validation**: Zod
- **Encryption**: Node.js Crypto (AES-256-GCM)
- **Styling**: Tailwind CSS
- **TypeScript**: Full TypeScript support

## BetterAuth Setup Complete

✅ **All BetterAuth Plugins Implemented:**
- `better-auth` - Core authentication library
- `@better-auth/cli` - CLI for schema generation
- `@better-auth/passkey` - WebAuthn/FIDO2 passwordless authentication
- `better-auth/plugins` - HaveIBeenPwned and TwoFactor plugins

✅ **Configuration Completed:**
- Core authentication with email/password
- Session management with database strategy
- Email verification required for new accounts
- Password policy: 12-128 characters
- Password breach detection (HaveIBeenPwned)
- Passkey/WebAuthn support
- Two-factor authentication (TOTP + backup codes)
- User profile management

✅ **UI Components Created:**
- Sign-in page (`/auth/signin`)
- Sign-up page (`/auth/signup`)
- Profile/settings page (`/profile`)
- Main dashboard with authentication status

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
cp .env.example .env.local
```

### 3. Generate BetterAuth Secret

Generate a secure BetterAuth secret:

```bash
node -e "console.log('BETTER_AUTH_SECRET=' + require('crypto').randomBytes(32).toString('base64'))"
```

### 4. Configure Database

Update your `.env.local` with your PostgreSQL connection string:

```env
DATABASE_URL="postgresql://username:password@localhost:5432/dataroll?schema=public"
BETTER_AUTH_URL="http://localhost:3000"
BETTER_AUTH_SECRET="your-generated-secret-here"
```

### 5. Generate Prisma Client

```bash
npx prisma generate
```

### 6. Run Database Migrations

```bash
npx prisma migrate dev --name init
```

### 7. Start Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:3000`.

## Authentication Endpoints

BetterAuth automatically creates all necessary API routes:

- **Authentication**: `/api/auth/*`
  - Sign up: `POST /api/auth/signup`
  - Sign in: `POST /api/auth/signin`
  - Sign out: `POST /api/auth/signout`
  - Session: `GET /api/auth/session`

## BetterAuth Plugin Configuration

### Enable Passkey Authentication

To enable passkey/WebAuthn support, update `lib/auth.ts`:

```typescript
import { passkey } from "@better-auth/passkey"

// Add to plugins array:
passkey({
    rpID: process.env.NODE_ENV === "production" ? "your-domain.com" : "localhost",
    rpName: "dataroll",
    origin: process.env.BETTER_AUTH_URL || "http://localhost:3000",
    authenticatorSelection: {
        residentKey: "preferred",
        userVerification: "preferred"
    }
})
```

### Enable Two-Factor Authentication

To enable 2FA (TOTP + backup codes), update `lib/auth.ts`:

```typescript
import { twoFactor } from "better-auth/plugins"

// Add to plugins array:
twoFactor({
    issuer: "dataroll",
    skipVerificationOnEnable: false
})
```

### Enable HaveIBeenPwned Protection

To enable password breach detection, update `lib/auth.ts`:

```typescript
import { haveIBeenPwned } from "better-auth/plugins"

// Add to plugins array:
haveIBeenPwned({
    customPasswordCompromisedMessage: "This password has been compromised. Please choose a different one."
})
```

See `lib/auth-with-plugins.example.ts` for the complete configuration with all plugins enabled.

## API Routes

The application includes comprehensive API endpoints:

- **Authentication**: `/api/auth/*` (BetterAuth)
- **Teams**: `/api/teams/*` - Team management
- **Connections**: `/api/connections/*` - Database connections
- **Migrations**: `/api/migrations/*` - Migration operations
- **Audit Logs**: `/api/audit-logs/*` - Activity tracking

## Development Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run db:generate` - Generate Prisma client
- `npm run db:migrate` - Run database migrations
- `npm run db:studio` - Open Prisma Studio
- `npm run auth:generate` - Generate BetterAuth schema

## Project Structure

```
dataroll/
├── app/
│   ├── api/
│   │   ├── auth/[...auth]/    # BetterAuth routes
│   │   ├── audit-logs/         # Audit trail endpoints
│   │   ├── connections/        # Database connection management
│   │   ├── migrations/         # Migration operations
│   │   └── teams/             # Team management
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── lib/
│   ├── auth.ts                 # BetterAuth configuration
│   ├── auth-client.ts          # Client-side auth utilities
│   ├── prisma.ts              # Prisma client
│   ├── validation.ts           # Zod schemas
│   └── errors.ts              # Error handling
├── prisma/
│   ├── schema.prisma           # Database schema
│   └── seed.ts                # Database seeding
├── public/
└── ...
```

## Security Features

- ✅ **Session Security**: Database-backed sessions with 30-day expiry
- ✅ **Password Policy**: Minimum 12 characters, email verification required
- ✅ **CSRF Protection**: Built-in CSRF protection via BetterAuth
- ✅ **Secure Headers**: Security headers configured
- ✅ **Environment Variables**: Sensitive data stored in environment variables
- ✅ **Audit Logging**: Comprehensive activity tracking

## Testing Authentication

### Test Email/Password Signup
1. Visit the application
2. Use the signup form to create an account
3. Check email for verification link
4. Verify email to activate account

### Test Passkeys (when enabled)
1. Navigate to account settings
2. Add passkey via biometric/hardware key
3. Sign out and sign back in using passkey

### Test 2FA (when enabled)
1. Enable 2FA in account settings
2. Scan QR code with authenticator app
3. Verify code to complete setup
4. Sign out and sign back in with 2FA code

## Deployment

### Environment Variables for Production

```env
NODE_ENV=production
DATABASE_URL="your-production-postgres-url"
BETTER_AUTH_URL="https://your-domain.com"
BETTER_AUTH_SECRET="your-secure-random-secret"
```

### Build and Deploy

```bash
npm run build
npm start
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.