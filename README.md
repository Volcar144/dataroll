# DataRoll v1.0.0

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
- 🎨 **Modern UI/UX** - Dark/light theme support with keyboard shortcuts
- ⌨️ **Keyboard Shortcuts** - Power user navigation and actions
- 📱 **Responsive Design** - Mobile-first approach with accessibility
- 🔄 **Loading States** - Skeleton loaders and smooth transitions
- 🎯 **Empty States** - Helpful guidance when data is missing

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
- **Styling**: Tailwind CSS with custom properties
- **UI Components**: Radix UI primitives with class-variance-authority
- **Icons**: Lucide React
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

## UI/UX Enhancements

✅ **Dark/Light Theme System:**
- Complete theme provider with React Context
- CSS custom properties for dynamic theming
- System preference detection and localStorage persistence
- Theme toggle component with Sun/Moon/Monitor icons

✅ **Keyboard Shortcuts:**
- Global shortcut system with React hooks
- Dashboard navigation shortcuts (C, M, T, A, P)
- Landing page shortcuts (S, G, D)
- Help modal with comprehensive shortcut reference
- Input field awareness (shortcuts disabled when typing)

✅ **Loading States & Skeletons:**
- Skeleton components for dashboard stats
- Quick actions skeleton loading
- Recent activity skeleton with proper structure
- Smooth loading transitions

✅ **Empty States:**
- Informative empty state component
- Contextual actions and descriptions
- Consistent iconography and messaging

✅ **Security Hardening:**
- Security headers (X-Frame-Options, X-Content-Type-Options, etc.)
- Rate limiting middleware (100 req/min general, 50 req/min API)
- CSRF protection for state-changing operations
- IP-based rate limiting with proper headers

✅ **UI Component Library:**
- Radix UI primitives (Dialog, Dropdown, Button)
- Class variance authority for component variants
- Consistent design system with accessibility
- Utility functions for className management

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
│   ├── dashboard/             # Dashboard pages
│   ├── auth/                  # Authentication pages
│   ├── globals.css            # Global styles with theme variables
│   ├── layout.tsx             # Root layout with theme provider
│   └── page.tsx               # Landing page
├── components/
│   ├── ui/                    # Reusable UI components
│   │   ├── button.tsx         # Button component with variants
│   │   ├── dialog.tsx         # Dialog/modal component
│   │   ├── dropdown-menu.tsx  # Dropdown menu component
│   │   └── skeleton.tsx       # Loading skeleton component
│   ├── theme-toggle.tsx       # Theme switcher component
│   ├── keyboard-shortcuts-help.tsx  # Shortcuts help modal
│   ├── empty-state.tsx        # Empty state component
│   └── dashboard-skeletons.tsx # Dashboard loading skeletons
├── lib/
│   ├── auth.ts                 # BetterAuth configuration
│   ├── auth-client.ts          # Client-side auth utilities
│   ├── theme-provider.tsx      # Theme context provider
│   ├── keyboard-shortcuts.tsx  # Keyboard shortcuts system
│   ├── csrf.ts                 # CSRF protection utilities
│   ├── prisma.ts              # Prisma client
│   ├── validation.ts           # Zod schemas
│   ├── errors.ts              # Error handling
│   └── telemetry.ts           # Logging and monitoring
├── middleware.ts              # Rate limiting and security middleware
├── prisma/
│   ├── schema.prisma           # Database schema
│   └── seed.ts                # Database seeding
├── public/
└── ...
```

## Security Features

- ✅ **Session Security**: Database-backed sessions with 30-day expiry
- ✅ **Password Policy**: Minimum 12 characters, email verification required
- ✅ **CSRF Protection**: Built-in CSRF protection via BetterAuth + custom token validation
- ✅ **Security Headers**: X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy
- ✅ **Rate Limiting**: 100 requests/minute general, 50 requests/minute API routes
- ✅ **Environment Variables**: Sensitive data stored in environment variables
- ✅ **Audit Logging**: Comprehensive activity tracking and security monitoring
- ✅ **IP-based Protection**: Request rate limiting with client IP tracking

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
