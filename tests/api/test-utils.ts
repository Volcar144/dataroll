/**
 * Test utilities for API route testing
 */
import { NextRequest } from 'next/server'
import { vi } from 'vitest'

/**
 * Creates a mock NextRequest object for testing
 */
export function createMockRequest(
  url: string,
  options: {
    method?: string
    body?: Record<string, any>
    headers?: Record<string, string>
    searchParams?: Record<string, string>
  } = {}
): NextRequest {
  const { method = 'GET', body, headers = {}, searchParams = {} } = options

  // Build URL with search params
  const urlObj = new URL(url, 'http://localhost:3000')
  Object.entries(searchParams).forEach(([key, value]) => {
    urlObj.searchParams.set(key, value)
  })

  const request = new NextRequest(urlObj.toString(), {
    method,
    headers: new Headers(headers),
    ...(body ? { body: JSON.stringify(body) } : {}),
  })

  return request
}

/**
 * Creates a mock session object
 */
export function createMockSession(overrides: {
  userId?: string
  email?: string
  name?: string
} = {}) {
  return {
    user: {
      id: overrides.userId || 'cltest000user000001',
      email: overrides.email || 'test@example.com',
      name: overrides.name || 'Test User',
      image: null,
    },
    session: {
      id: 'cltest000session001',
      userId: overrides.userId || 'cltest000user000001',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  }
}

/**
 * Creates mock team member data
 */
export function createMockTeamMember(overrides: {
  userId?: string
  teamId?: string
  role?: 'OWNER' | 'ADMIN' | 'DEVELOPER' | 'VIEWER' | 'MEMBER'
} = {}) {
  return {
    id: 'cltest000member0001',
    userId: overrides.userId || 'cltest000user000001',
    teamId: overrides.teamId || 'cltest000team000001',
    role: overrides.role || 'MEMBER',
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

/**
 * Creates mock team data
 */
export function createMockTeam(overrides: {
  id?: string
  name?: string
  slug?: string
} = {}) {
  return {
    id: overrides.id || 'cltest000team000001',
    name: overrides.name || 'Test Team',
    slug: overrides.slug || 'test-team',
    description: 'A test team',
    createdById: 'cltest000user000001',
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

/**
 * Creates mock database connection data
 */
export function createMockConnection(overrides: {
  id?: string
  name?: string
  type?: 'POSTGRESQL' | 'MYSQL' | 'SQLITE'
  teamId?: string
} = {}) {
  return {
    id: overrides.id || 'cltest000conn000001',
    name: overrides.name || 'Test Connection',
    type: overrides.type || 'POSTGRESQL',
    host: 'localhost',
    port: 5432,
    database: 'testdb',
    username: 'testuser',
    ssl: false,
    isActive: true,
    teamId: overrides.teamId || 'cltest000team000001',
    createdById: 'cltest000user000001',
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

/**
 * Creates mock migration data
 */
export function createMockMigration(overrides: {
  id?: string
  name?: string
  version?: string
  status?: 'PENDING' | 'EXECUTED' | 'FAILED' | 'ROLLED_BACK'
  teamId?: string
  connectionId?: string
} = {}) {
  return {
    id: overrides.id || 'cltest000mig0000001',
    name: overrides.name || 'add-users-table',
    version: overrides.version || '20240101000000',
    type: 'PRISMA',
    filePath: 'migrations/add-users-table.sql',
    content: 'CREATE TABLE users (id SERIAL PRIMARY KEY);',
    status: overrides.status || 'PENDING',
    checksum: 'abc123',
    teamId: overrides.teamId || 'cltest000team000001',
    databaseConnectionId: overrides.connectionId || 'cltest000conn000001',
    createdById: 'cltest000user000001',
    notes: null,
    executedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

/**
 * Creates mock audit log data
 */
export function createMockAuditLog(overrides: {
  id?: string
  action?: string
  resource?: string
  teamId?: string
  userId?: string
} = {}) {
  return {
    id: overrides.id || 'cltest000audit00001',
    action: overrides.action || 'MIGRATION_EXECUTED',
    resource: overrides.resource || 'migration',
    resourceId: 'cltest000resource01',
    details: JSON.stringify({ version: '1.0' }),
    teamId: overrides.teamId || 'cltest000team000001',
    userId: overrides.userId || 'cltest000user000001',
    ipAddress: '127.0.0.1',
    userAgent: 'Test Agent',
    createdAt: new Date(),
    user: {
      id: overrides.userId || 'cltest000user000001',
      name: 'Test User',
      email: 'test@example.com',
      image: null,
    },
    team: {
      id: overrides.teamId || 'cltest000team000001',
      name: 'Test Team',
    },
  }
}

/**
 * Creates mock workflow data
 */
export function createMockWorkflow(overrides: {
  id?: string
  name?: string
  teamId?: string
} = {}) {
  return {
    id: overrides.id || 'cltest000wf00000001',
    name: overrides.name || 'Test Workflow',
    description: 'A test workflow',
    trigger: 'manual',
    isPublished: false,
    publishedAt: null,
    version: 1,
    tags: [],
    definitionId: 'cltest000def0000001',
    teamId: overrides.teamId || 'cltest000team000001',
    createdBy: 'cltest000user000001',
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

/**
 * Creates mock notification data
 */
export function createMockNotification(overrides: {
  id?: string
  userId?: string
  type?: string
} = {}) {
  return {
    id: overrides.id || 'cltest000notif00001',
    userId: overrides.userId || 'cltest000user000001',
    type: overrides.type || 'INFO',
    title: 'Test Notification',
    message: 'This is a test notification',
    link: null,
    metadata: null,
    read: false,
    archived: false,
    createdAt: new Date(),
  }
}

/**
 * Creates mock integration data
 */
export function createMockIntegration(overrides: {
  id?: string
  userId?: string
  type?: string
  name?: string
} = {}) {
  return {
    id: overrides.id || 'cltest000integ00001',
    userId: overrides.userId || 'cltest000user000001',
    type: overrides.type || 'EMAIL',
    name: overrides.name || 'Test Integration',
    teamId: null,
    isActive: true,
    isDefault: false,
    config: 'encrypted-config',
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

/**
 * Creates mock API key data
 */
export function createMockApiKey(overrides: {
  id?: string
  userId?: string
  key?: string
} = {}) {
  return {
    id: overrides.id || 'cltest000apikey0001',
    userId: overrides.userId || 'cltest000user000001',
    key: overrides.key || 'test-api-key-123',
    name: 'Test API Key',
    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    createdAt: new Date(),
    updatedAt: new Date(),
    user: {
      id: overrides.userId || 'cltest000user000001',
      email: 'test@example.com',
      name: 'Test User',
    },
  }
}

/**
 * Extracts JSON response from NextResponse
 */
export async function getJsonResponse(response: Response): Promise<any> {
  return response.json()
}

/**
 * Common mock reset helper
 */
export function resetAllMocks() {
  vi.clearAllMocks()
}
