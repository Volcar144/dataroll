import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import {
  createMockRequest,
  createMockSession,
  createMockTeam,
  createMockTeamMember,
  getJsonResponse,
  resetAllMocks,
} from './test-utils'

// Mock dependencies before importing route handlers
vi.mock('@/lib/auth', () => ({
  getSession: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    team: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    teamMember: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

vi.mock('@/lib/posthog-server', () => ({
  getPostHogClient: () => ({
    capture: vi.fn(),
  }),
  captureServerException: vi.fn(),
}))

vi.mock('@/lib/logger', () => ({
  default: {
    error: vi.fn(),
    info: vi.fn(),
  },
}))

// Import after mocking
import { GET, POST } from '@/app/api/teams/route'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

describe('Teams API Route', () => {
  beforeEach(() => {
    resetAllMocks()
  })

  describe('GET /api/teams', () => {
    it('should return 401 when not authenticated', async () => {
      vi.mocked(getSession).mockResolvedValue(null)

      const request = createMockRequest('/api/teams')
      const response = await GET(request)
      const json = await getJsonResponse(response)

      expect(response.status).toBe(401)
      expect(json.error.code).toBe('UNAUTHORIZED')
    })

    it('should return teams for authenticated user', async () => {
      const mockSession = createMockSession()
      const mockTeams = [
        {
          ...createMockTeam({ id: 'team-1', name: 'Team 1' }),
          members: [createMockTeamMember({ teamId: 'team-1' })],
          _count: { members: 1, databaseConnections: 2, migrations: 5 },
        },
        {
          ...createMockTeam({ id: 'team-2', name: 'Team 2' }),
          members: [createMockTeamMember({ teamId: 'team-2' })],
          _count: { members: 3, databaseConnections: 1, migrations: 10 },
        },
      ]

      vi.mocked(getSession).mockResolvedValue(mockSession)
      vi.mocked(prisma.team.findMany).mockResolvedValue(mockTeams as any)

      const request = createMockRequest('/api/teams')
      const response = await GET(request)
      const json = await getJsonResponse(response)

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data).toHaveLength(2)
      expect(json.data[0].name).toBe('Team 1')
      expect(json.data[1].name).toBe('Team 2')
    })

    it('should return empty array when user has no teams', async () => {
      const mockSession = createMockSession()

      vi.mocked(getSession).mockResolvedValue(mockSession)
      vi.mocked(prisma.team.findMany).mockResolvedValue([])

      const request = createMockRequest('/api/teams')
      const response = await GET(request)
      const json = await getJsonResponse(response)

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data).toHaveLength(0)
    })

    it('should handle database errors', async () => {
      const mockSession = createMockSession()

      vi.mocked(getSession).mockResolvedValue(mockSession)
      vi.mocked(prisma.team.findMany).mockRejectedValue(new Error('Database error'))

      const request = createMockRequest('/api/teams')
      const response = await GET(request)
      const json = await getJsonResponse(response)

      expect(response.status).toBe(500)
      expect(json.error).toBeDefined()
    })
  })

  describe('POST /api/teams', () => {
    it('should return 401 when not authenticated', async () => {
      vi.mocked(getSession).mockResolvedValue(null)

      const request = createMockRequest('/api/teams', {
        method: 'POST',
        body: { name: 'New Team' },
      })
      const response = await POST(request)
      const json = await getJsonResponse(response)

      expect(response.status).toBe(401)
      expect(json.error.code).toBe('UNAUTHORIZED')
    })

    it('should create a new team', async () => {
      const mockSession = createMockSession()
      const mockTeam = createMockTeam({ name: 'New Team' })

      vi.mocked(getSession).mockResolvedValue(mockSession)
      vi.mocked(prisma.$transaction).mockImplementation(async (fn: any) => {
        return fn({
          team: {
            create: vi.fn().mockResolvedValue(mockTeam),
          },
          teamMember: {
            create: vi.fn().mockResolvedValue(createMockTeamMember({ role: 'OWNER' })),
          },
        })
      })

      const request = createMockRequest('/api/teams', {
        method: 'POST',
        body: { name: 'New Team', description: 'A new team' },
      })
      const response = await POST(request)
      const json = await getJsonResponse(response)

      expect(response.status).toBe(201)
      expect(json.success).toBe(true)
      expect(json.data.name).toBe('New Team')
    })

    it('should reject invalid team data', async () => {
      const mockSession = createMockSession()

      vi.mocked(getSession).mockResolvedValue(mockSession)

      const request = createMockRequest('/api/teams', {
        method: 'POST',
        body: { name: '' }, // Empty name should be rejected
      })
      const response = await POST(request)
      const json = await getJsonResponse(response)

      expect(response.status).toBe(500) // Validation errors result in 500 with formatError
      expect(json.error).toBeDefined()
    })

    it('should handle database errors during team creation', async () => {
      const mockSession = createMockSession()

      vi.mocked(getSession).mockResolvedValue(mockSession)
      vi.mocked(prisma.$transaction).mockRejectedValue(new Error('Database error'))

      const request = createMockRequest('/api/teams', {
        method: 'POST',
        body: { name: 'New Team' },
      })
      const response = await POST(request)
      const json = await getJsonResponse(response)

      expect(response.status).toBe(500)
      expect(json.error).toBeDefined()
    })
  })
})
