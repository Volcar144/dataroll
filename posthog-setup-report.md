# PostHog post-wizard report

The wizard has completed a deep integration of your Next.js 16 project with PostHog analytics. The integration includes:

- **Client-side initialization** via `instrumentation-client.ts` (the recommended approach for Next.js 15.3+)
- **Server-side tracking** using `posthog-node` for API route events
- **Reverse proxy configuration** in `next.config.ts` to route analytics through `/ingest`
- **User identification** on signup and signin to correlate anonymous and authenticated sessions
- **Error tracking** with `posthog.captureException()` for catching and reporting errors
- **Environment variables** configured in `.env` for API key and host

## Events Implemented

| Event Name | Description | File Path |
|------------|-------------|-----------|
| `user_signed_up` | User successfully completed account registration | `app/auth/signup/page.tsx` |
| `user_signed_in` | User successfully signed in with email/password | `app/auth/signin/page.tsx` |
| `user_signed_in_passkey` | User successfully signed in using passkey authentication | `app/auth/signin/page.tsx` |
| `user_signed_in_social` | User initiated social sign-in (Google, GitHub, Discord) | `app/auth/signin/page.tsx` |
| `user_signed_out` | User signed out from their account | `app/profile/page.tsx` |
| `connection_created` | User created a new database connection | `app/api/connections/route.ts` |
| `connection_tested` | User tested a database connection | `app/dashboard/connections/page.tsx` |
| `migration_executed` | User executed a database migration | `app/dashboard/migrations/page.tsx` |
| `migration_dry_run` | User performed a dry run of a migration | `app/dashboard/migrations/page.tsx` |
| `migration_rolled_back` | User rolled back a migration | `app/dashboard/migrations/page.tsx` |
| `migration_approved` | User approved a migration | `app/api/approvals/[approvalId]/approve/route.ts` |
| `team_created` | User created a new team | `app/api/teams/route.ts` |
| `team_invitation_accepted` | User accepted a team invitation | `app/api/teams/invitations/[invitationId]/accept/route.ts` |
| `two_factor_enabled` | User enabled two-factor authentication | `app/profile/page.tsx` |
| `two_factor_disabled` | User disabled two-factor authentication | `app/profile/page.tsx` |
| `passkey_added` | User added a new passkey for authentication | `app/profile/page.tsx` |
| `organization_created` | User created a new organization | `app/profile/page.tsx` |

## Files Created/Modified

### New Files
- `instrumentation-client.ts` - Client-side PostHog initialization
- `lib/posthog-server.ts` - Server-side PostHog client
- `posthog-setup-report.md` - This report

### Modified Files
- `.env` - Added PostHog environment variables
- `next.config.ts` - Added reverse proxy rewrites for PostHog
- `app/auth/signup/page.tsx` - Added signup tracking and user identification
- `app/auth/signin/page.tsx` - Added signin tracking for all auth methods
- `app/profile/page.tsx` - Added security feature and signout tracking
- `app/dashboard/connections/page.tsx` - Added connection testing tracking
- `app/dashboard/migrations/page.tsx` - Added migration activity tracking
- `app/api/connections/route.ts` - Added server-side connection creation tracking
- `app/api/teams/route.ts` - Added server-side team creation tracking
- `app/api/teams/invitations/[invitationId]/accept/route.ts` - Added invitation acceptance tracking
- `app/api/approvals/[approvalId]/approve/route.ts` - Added migration approval tracking

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

### Dashboard
- [Analytics basics](https://eu.posthog.com/project/114496/dashboard/488583) - Core analytics dashboard with all key metrics

### Insights
- [User Signups & Sign-ins Over Time](https://eu.posthog.com/project/114496/insights/EvIcMkI5) - Track daily authentication events
- [Signup to First Migration Funnel](https://eu.posthog.com/project/114496/insights/hBXonsMe) - Conversion funnel from signup to first migration
- [Migration Activity](https://eu.posthog.com/project/114496/insights/kjP46J4j) - Track executions, dry runs, and rollbacks
- [Security Features Adoption](https://eu.posthog.com/project/114496/insights/4aehWTKx) - Track 2FA and passkey adoption
- [Team & Organization Growth](https://eu.posthog.com/project/114496/insights/T44Azq4O) - Track team creation and collaboration
