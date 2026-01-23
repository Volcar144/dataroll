import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createMockRequest,
  createMockSession,
  createMockTeamMember,
  createMockWorkflow,
  getJsonResponse,
  resetAllMocks,
} from './test-utils'

// Mock dependencies before importing route handlers
vi.mock('@/lib/auth', () => ({
  getSession: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    teamMember: {
      findFirst: vi.fn(),
    },
    workflow: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    workflowDefinition: {
      create: vi.fn(),
    },
    workflowExecution: {
      groupBy: vi.fn(),
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

vi.mock('@/lib/telemetry', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
  securityLogger: {
    unauthorized: vi.fn(),
    suspicious: vi.fn(),
    access: vi.fn(),
  },
}))

vi.mock('@/lib/workflows/parser', () => ({
  WorkflowParser: {
    reconstructDefinition: vi.fn().mockReturnValue({ name: 'test', nodes: [], edges: [] }),
    stringify: vi.fn().mockReturnValue('{}'),
  },
}))

vi.mock('@/lib/workflows/validation', () => ({
  CreateWorkflowSchema: {
    parse: vi.fn((data) => data),
  },
  UpdateWorkflowSchema: {
    parse: vi.fn((data) => data),
  },
  ExecuteWorkflowSchema: {
    parse: vi.fn((data) => data),
  },
}))

// Import after mocking
import { GET, POST } from '@/app/api/workflows/route'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

describe('Workflows API Route', () => {
  beforeEach(() => {
    resetAllMocks()
  })

  describe('GET /api/workflows', () => {
    it('should return 401 when not authenticated', async () => {
      vi.mocked(getSession).mockResolvedValue(null)

      const request = createMockRequest('/api/workflows', {
        searchParams: { teamId: 'cltest000team000001' },
      })
      const response = await GET(request)
      const json = await getJsonResponse(response)

      expect(response.status).toBe(401)
      expect(json.error.code).toBe('UNAUTHORIZED')
    })

    it('should return 400 when teamId is missing', async () => {
      const mockSession = createMockSession()
      vi.mocked(getSession).mockResolvedValue(mockSession)

      const request = createMockRequest('/api/workflows')
      const response = await GET(request)
      const json = await getJsonResponse(response)

      expect(response.status).toBe(400)
      expect(json.error.code).toBe('MISSING_TEAM_ID')
    })

    it('should return 403 when user is not team member', async () => {
      const mockSession = createMockSession()
      vi.mocked(getSession).mockResolvedValue(mockSession)
      vi.mocked(prisma.teamMember.findFirst).mockResolvedValue(null)

      const request = createMockRequest('/api/workflows', {
        searchParams: { teamId: 'cltest000team000001' },
      })
      const response = await GET(request)
      const json = await getJsonResponse(response)

      expect(response.status).toBe(403)
      expect(json.error.code).toBe('FORBIDDEN')
    })

    it('should return workflows for team member', async () => {
      const mockSession = createMockSession()
      const mockWorkflows = [
        {
          ...createMockWorkflow({ id: 'wf-1', name: 'Workflow 1' }),
          executions: [],
        },
        {
          ...createMockWorkflow({ id: 'wf-2', name: 'Workflow 2' }),
          executions: [{ triggeredAt: new Date() }],
        },
      ]

      vi.mocked(getSession).mockResolvedValue(mockSession)
      vi.mocked(prisma.teamMember.findFirst).mockResolvedValue(createMockTeamMember() as any)
      vi.mocked(prisma.workflow.findMany).mockResolvedValue(mockWorkflows as any)
      vi.mocked(prisma.workflowExecution.groupBy).mockResolvedValue([
        { workflowId: 'wf-1', _count: { workflowId: 5 } },
        { workflowId: 'wf-2', _count: { workflowId: 10 } },
      ] as any)

      const request = createMockRequest('/api/workflows', {
        searchParams: { teamId: 'cltest000team000001' },
      })
      const response = await GET(request)
      const json = await getJsonResponse(response)

      expect(response.status).toBe(200)
      expect(json.data).toHaveLength(2)
      expect(json.meta.total).toBe(2)
    })

    it('should filter by status (published)', async () => {
      const mockSession = createMockSession()
      vi.mocked(getSession).mockResolvedValue(mockSession)
      vi.mocked(prisma.teamMember.findFirst).mockResolvedValue(createMockTeamMember() as any)
      vi.mocked(prisma.workflow.findMany).mockResolvedValue([])
      vi.mocked(prisma.workflowExecution.groupBy).mockResolvedValue([])

      const request = createMockRequest('/api/workflows', {
        searchParams: { teamId: 'cltest000team000001', status: 'published' },
      })
      await GET(request)

      expect(prisma.workflow.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            teamId: 'cltest000team000001',
            isPublished: true,
          }),
        })
      )
    })

    it('should filter by trigger', async () => {
      const mockSession = createMockSession()
      vi.mocked(getSession).mockResolvedValue(mockSession)
      vi.mocked(prisma.teamMember.findFirst).mockResolvedValue(createMockTeamMember() as any)
      vi.mocked(prisma.workflow.findMany).mockResolvedValue([])
      vi.mocked(prisma.workflowExecution.groupBy).mockResolvedValue([])

      const request = createMockRequest('/api/workflows', {
        searchParams: { teamId: 'cltest000team000001', trigger: 'manual' },
      })
      await GET(request)

      expect(prisma.workflow.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            teamId: 'cltest000team000001',
            trigger: 'manual',
          }),
        })
      )
    })
  })

  describe('POST /api/workflows', () => {
    it('should return 401 when not authenticated', async () => {
      vi.mocked(getSession).mockResolvedValue(null)

      const request = createMockRequest('/api/workflows', {
        method: 'POST',
        body: {
          teamId: 'cltest000team000001',
          name: 'New Workflow',
          trigger: 'manual',
        },
      })
      const response = await POST(request)
      const json = await getJsonResponse(response)

      expect(response.status).toBe(401)
      expect(json.error.code).toBe('UNAUTHORIZED')
    })

    it('should return 403 when user is not team member', async () => {
      const mockSession = createMockSession()
      vi.mocked(getSession).mockResolvedValue(mockSession)
      vi.mocked(prisma.teamMember.findFirst).mockResolvedValue(null)

      const request = createMockRequest('/api/workflows', {
        method: 'POST',
        body: {
          teamId: 'cltest000team000001',
          name: 'New Workflow',
          trigger: 'manual',
        },
      })
      const response = await POST(request)
      const json = await getJsonResponse(response)

      expect(response.status).toBe(403)
      expect(json.error.code).toBe('FORBIDDEN')
    })

    it('should create a new workflow', async () => {
      const mockSession = createMockSession()
      const mockWorkflow = createMockWorkflow({ name: 'New Workflow' })

      vi.mocked(getSession).mockResolvedValue(mockSession)
      vi.mocked(prisma.teamMember.findFirst).mockResolvedValue(createMockTeamMember() as any)
      vi.mocked(prisma.$transaction).mockImplementation(async (fn: any) => {
        return fn({
          workflow: {
            create: vi.fn().mockResolvedValue(mockWorkflow),
            update: vi.fn().mockResolvedValue(mockWorkflow),
          },
          workflowDefinition: {
            create: vi.fn().mockResolvedValue({ id: 'def-1' }),
          },
        })
      })

      const request = createMockRequest('/api/workflows', {
        method: 'POST',
        body: {
          teamId: 'cltest000team000001',
          name: 'New Workflow',
          description: 'A new workflow',
          trigger: 'manual',
          nodes: [],
          edges: [],
        },
      })
      const response = await POST(request)
      const json = await getJsonResponse(response)

      expect(response.status).toBe(201)
      expect(json.data.name).toBe('New Workflow')
    })

    it('should handle database errors during workflow creation', async () => {
      const mockSession = createMockSession()

      vi.mocked(getSession).mockResolvedValue(mockSession)
      vi.mocked(prisma.teamMember.findFirst).mockResolvedValue(createMockTeamMember() as any)
      vi.mocked(prisma.$transaction).mockRejectedValue(new Error('Database error'))

      const request = createMockRequest('/api/workflows', {
        method: 'POST',
        body: {
          teamId: 'cltest000team000001',
          name: 'New Workflow',
          trigger: 'manual',
        },
      })
      const response = await POST(request)
      const json = await getJsonResponse(response)

      expect(response.status).toBe(500)
      expect(json.error.code).toBe('INTERNAL_ERROR')
    })
  })
})
