# PostHog Error Tracking Setup

Complete error tracking implementation for Next.js with PostHog.

## ✅ What's Configured

### Client-Side Error Tracking
- **Automatic exception capture** enabled in `instrumentation-client.ts`
- **Error boundaries** at app level (`app/error.tsx`)
- **Global error handler** for root layout errors (`app/global-error.tsx`)
- **Manual capture** available via `posthog.captureException(error)`

### Server-Side Error Tracking
- **Request error handling** in `instrumentation.ts` captures all server-side request errors
- **API route error tracking** helper function in `lib/posthog-server.ts`
- **Source map upload** configured for production builds

## 🔧 Environment Variables

Add these to your `.env.local` and your hosting provider (Vercel, etc.):

```bash
# PostHog Analytics & Error Tracking
NEXT_PUBLIC_POSTHOG_KEY="phc_6QRL1flCsesMZGKRgr53gOdj3gOBQAK8y56YBy6wWOk"
NEXT_PUBLIC_POSTHOG_HOST="https://eu.i.posthog.com"

# For source map uploads (production)
POSTHOG_API_KEY="your-personal-api-key-here"
POSTHOG_ENV_ID="your-project-id-here"
```

### Getting Your API Keys
1. **Personal API Key**: PostHog Settings → Personal API Keys → Create Key (needs "Error Tracking" write access)
2. **Environment ID**: PostHog Project Settings → Project ID

## 📝 Usage Examples

### Client-Side (Components)

```tsx
"use client"

import posthog from "posthog-js"

export function MyComponent() {
  const handleAction = async () => {
    try {
      await riskyOperation()
    } catch (error) {
      // Manually capture error
      posthog.captureException(error, {
        component: 'MyComponent',
        action: 'handleAction',
      })
      
      // Show user-friendly error
      console.error('Operation failed:', error)
    }
  }
  
  return <button onClick={handleAction}>Do Something</button>
}
```

### Server-Side (API Routes)

```typescript
import { captureServerException } from '@/lib/posthog-server'
import { getSession } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const session = await getSession({ headers: request.headers })
    // Your logic here
    
  } catch (error) {
    const session = await getSession({ headers: request.headers })
    
    await captureServerException(
      error instanceof Error ? error : new Error(String(error)),
      session?.user?.id, // Links error to user
      {
        endpoint: '/api/your-endpoint',
        method: request.method,
        // Add any custom properties
      }
    )
    
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

### Server Actions

```typescript
'use server'

import { captureServerException } from '@/lib/posthog-server'
import { auth } from '@/lib/auth'

export async function myServerAction(data: FormData) {
  try {
    const session = await auth.api.getSession({ headers: request.headers })
    // Your logic here
    
  } catch (error) {
    await captureServerException(
      error instanceof Error ? error : new Error(String(error)),
      session?.user?.id,
      {
        action: 'myServerAction',
      }
    )
    
    throw error
  }
}
```

## 🧪 Testing Error Tracking

### Test Client-Side Errors

Create a test component:

```tsx
"use client"

import posthog from "posthog-js"

export function ErrorTestButton() {
  return (
    <button onClick={() => {
      // Test manual capture
      posthog.captureException(new Error("Test client error"), {
        test: true,
      })
      
      // Test error boundary (uncomment to trigger)
      // throw new Error("Test error boundary")
    }}>
      Test Error Tracking
    </button>
  )
}
```

### Test Server-Side Errors

Add to any API route:

```typescript
// Add ?test=error to trigger
if (request.nextUrl.searchParams.get('test') === 'error') {
  throw new Error('Test server-side error tracking')
}
```

## 📊 Viewing Errors in PostHog

1. Go to your PostHog instance (https://eu.posthog.com)
2. Navigate to **Error Tracking** in the sidebar
3. View all captured exceptions with:
   - Stack traces (with source maps in production)
   - User information
   - Custom properties
   - Error frequency and trends

## 🚀 Production Deployment

### Vercel
1. Add all environment variables to your Vercel project settings
2. Deploy - source maps will be automatically uploaded

### Other Platforms
Ensure you:
1. Set all environment variables
2. Run `npm run build` (source maps uploaded during build)
3. Serve the production build

## 🔍 Source Maps

Source maps are automatically:
- **Generated** during production builds
- **Uploaded** to PostHog (if `POSTHOG_API_KEY` and `POSTHOG_ENV_ID` are set)
- **Deleted** after upload (configurable in `next.config.ts`)

This enables readable stack traces in production, showing original TypeScript source code instead of minified JavaScript.

## 📁 Files Created/Modified

- ✅ `instrumentation-client.ts` - Client-side PostHog init with exception capture
- ✅ `instrumentation.ts` - Server-side request error capture
- ✅ `app/error.tsx` - Error boundary for app router
- ✅ `app/global-error.tsx` - Global error handler
- ✅ `lib/posthog-server.ts` - Server-side PostHog client with `captureServerException`
- ✅ `next.config.ts` - PostHog config with source map upload
- ✅ `.env.local` - Environment variables

## 🎯 Best Practices

1. **Always capture context**: Add custom properties to understand errors better
2. **Link to users**: Pass `distinct_id` to track which users are affected
3. **Don't expose sensitive data**: Be careful what you include in error properties
4. **Test in development**: Use the test examples above
5. **Monitor regularly**: Check PostHog dashboard for new errors
6. **Set up alerts**: Configure PostHog alerts for critical errors

## 🆘 Troubleshooting

### Errors not appearing in PostHog?
- Check environment variables are set correctly
- Verify PostHog project key is valid
- Check browser console for PostHog initialization errors
- Ensure error tracking is enabled in PostHog project settings

### Source maps not working?
- Verify `POSTHOG_API_KEY` has "Error Tracking" write access
- Check `POSTHOG_ENV_ID` matches your project
- Ensure build runs successfully with source map upload logs

### Server-side errors not captured?
- Verify `instrumentation.ts` is at the root of your project
- Check Node.js runtime is being used (not Edge)
- Look for errors in server logs during initialization
