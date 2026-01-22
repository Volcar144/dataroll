// Test setup file - runs before all tests
import { vi } from 'vitest'

// Mock environment variables for testing
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/test'
process.env.DIRECT_URL = process.env.DIRECT_URL || 'postgresql://test:test@localhost:5432/test'
process.env.BETTER_AUTH_SECRET = process.env.BETTER_AUTH_SECRET || 'test-secret-key-for-testing-only'
process.env.BETTER_AUTH_URL = process.env.BETTER_AUTH_URL || 'http://localhost:3000'
process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'test-encryption-key-32-chars!!'
;(process.env as Record<string, string>).NODE_ENV = 'test'

// Mock PostHog to prevent tracking in tests
vi.mock('@/lib/posthog-server', () => ({
  captureServerException: vi.fn(),
  captureServerEvent: vi.fn(),
}))

// Mock logger to prevent console spam in tests
vi.mock('@/lib/telemetry', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
  migrationLogger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}))
