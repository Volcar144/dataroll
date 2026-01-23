import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createMockRequest,
  createMockSession,
  createMockNotification,
  getJsonResponse,
  resetAllMocks,
} from './test-utils'

// Mock dependencies before importing route handlers
vi.mock('@/lib/auth', () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    notification: {
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}))

vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}))

// Import after mocking
import { GET, POST, PATCH, DELETE } from '@/app/api/notifications/route'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

describe('Notifications API Route', () => {
  beforeEach(() => {
    resetAllMocks()
  })

  describe('GET /api/notifications', () => {
    it('should return 401 when not authenticated', async () => {
      vi.mocked(auth.api.getSession).mockResolvedValue(null)

      const request = createMockRequest('/api/notifications')
      const response = await GET(request)
      const json = await getJsonResponse(response)

      expect(response.status).toBe(401)
      expect(json.error).toBe('Unauthorized')
    })

    it('should return notifications for authenticated user', async () => {
      const mockSession = createMockSession()
      const mockNotifications = [
        createMockNotification({ id: 'notif-1' }),
        createMockNotification({ id: 'notif-2' }),
      ]

      vi.mocked(auth.api.getSession).mockResolvedValue(mockSession as any)
      vi.mocked(prisma.notification.findMany).mockResolvedValue(mockNotifications as any)
      vi.mocked(prisma.notification.count)
        .mockResolvedValueOnce(10) // totalCount
        .mockResolvedValueOnce(5) // unreadCount

      const request = createMockRequest('/api/notifications')
      const response = await GET(request)
      const json = await getJsonResponse(response)

      expect(response.status).toBe(200)
      expect(json.notifications).toHaveLength(2)
      expect(json.totalCount).toBe(10)
      expect(json.unreadCount).toBe(5)
    })

    it('should filter unread notifications', async () => {
      const mockSession = createMockSession()
      vi.mocked(auth.api.getSession).mockResolvedValue(mockSession as any)
      vi.mocked(prisma.notification.findMany).mockResolvedValue([])
      vi.mocked(prisma.notification.count).mockResolvedValue(0)

      const request = createMockRequest('/api/notifications', {
        searchParams: { unread: 'true' },
      })
      await GET(request)

      expect(prisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'cltest000user000001',
            archived: false,
            read: false,
          }),
        })
      )
    })

    it('should handle pagination', async () => {
      const mockSession = createMockSession()
      vi.mocked(auth.api.getSession).mockResolvedValue(mockSession as any)
      vi.mocked(prisma.notification.findMany).mockResolvedValue([])
      vi.mocked(prisma.notification.count).mockResolvedValue(0)

      const request = createMockRequest('/api/notifications', {
        searchParams: { limit: '10', offset: '20' },
      })
      await GET(request)

      expect(prisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
          skip: 20,
        })
      )
    })
  })

  describe('POST /api/notifications', () => {
    it('should return 401 when not authenticated', async () => {
      vi.mocked(auth.api.getSession).mockResolvedValue(null)

      const request = createMockRequest('/api/notifications', {
        method: 'POST',
        body: {
          userId: 'user-123',
          type: 'INFO',
          title: 'Test',
          message: 'Test message',
        },
      })
      const response = await POST(request)
      const json = await getJsonResponse(response)

      expect(response.status).toBe(401)
      expect(json.error).toBe('Unauthorized')
    })

    it('should return 400 when required fields are missing', async () => {
      const mockSession = createMockSession()
      vi.mocked(auth.api.getSession).mockResolvedValue(mockSession as any)

      const request = createMockRequest('/api/notifications', {
        method: 'POST',
        body: {
          userId: 'user-123',
          // missing type, title, message
        },
      })
      const response = await POST(request)
      const json = await getJsonResponse(response)

      expect(response.status).toBe(400)
      expect(json.error).toContain('Missing required fields')
    })

    it('should create a notification', async () => {
      const mockSession = createMockSession()
      const mockNotification = createMockNotification()

      vi.mocked(auth.api.getSession).mockResolvedValue(mockSession as any)
      vi.mocked(prisma.notification.create).mockResolvedValue(mockNotification as any)

      const request = createMockRequest('/api/notifications', {
        method: 'POST',
        body: {
          userId: 'user-123',
          type: 'INFO',
          title: 'Test Notification',
          message: 'This is a test',
        },
      })
      const response = await POST(request)

      expect(response.status).toBe(201)
    })
  })

  describe('PATCH /api/notifications', () => {
    it('should return 401 when not authenticated', async () => {
      vi.mocked(auth.api.getSession).mockResolvedValue(null)

      const request = createMockRequest('/api/notifications', {
        method: 'PATCH',
        body: { ids: ['notif-1'], action: 'read' },
      })
      const response = await PATCH(request)
      const json = await getJsonResponse(response)

      expect(response.status).toBe(401)
      expect(json.error).toBe('Unauthorized')
    })

    it('should return 400 when required fields are missing', async () => {
      const mockSession = createMockSession()
      vi.mocked(auth.api.getSession).mockResolvedValue(mockSession as any)

      const request = createMockRequest('/api/notifications', {
        method: 'PATCH',
        body: {}, // missing ids and action
      })
      const response = await PATCH(request)
      const json = await getJsonResponse(response)

      expect(response.status).toBe(400)
    })

    it('should mark notifications as read', async () => {
      const mockSession = createMockSession()
      vi.mocked(auth.api.getSession).mockResolvedValue(mockSession as any)
      vi.mocked(prisma.notification.updateMany).mockResolvedValue({ count: 2 } as any)

      const request = createMockRequest('/api/notifications', {
        method: 'PATCH',
        body: { ids: ['notif-1', 'notif-2'], action: 'read' },
      })
      const response = await PATCH(request)
      const json = await getJsonResponse(response)

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(prisma.notification.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: { in: ['notif-1', 'notif-2'] },
            userId: 'cltest000user000001',
          }),
          data: { read: true },
        })
      )
    })

    it('should mark notifications as unread', async () => {
      const mockSession = createMockSession()
      vi.mocked(auth.api.getSession).mockResolvedValue(mockSession as any)
      vi.mocked(prisma.notification.updateMany).mockResolvedValue({ count: 1 } as any)

      const request = createMockRequest('/api/notifications', {
        method: 'PATCH',
        body: { ids: ['notif-1'], action: 'unread' },
      })
      const response = await PATCH(request)
      const json = await getJsonResponse(response)

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
    })

    it('should archive notifications', async () => {
      const mockSession = createMockSession()
      vi.mocked(auth.api.getSession).mockResolvedValue(mockSession as any)
      vi.mocked(prisma.notification.updateMany).mockResolvedValue({ count: 1 } as any)

      const request = createMockRequest('/api/notifications', {
        method: 'PATCH',
        body: { ids: ['notif-1'], action: 'archive' },
      })
      const response = await PATCH(request)
      const json = await getJsonResponse(response)

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
    })

    it('should mark all notifications as read', async () => {
      const mockSession = createMockSession()
      vi.mocked(auth.api.getSession).mockResolvedValue(mockSession as any)
      vi.mocked(prisma.notification.updateMany).mockResolvedValue({ count: 10 } as any)

      const request = createMockRequest('/api/notifications', {
        method: 'PATCH',
        body: { ids: [], action: 'read_all' },
      })
      const response = await PATCH(request)
      const json = await getJsonResponse(response)

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
    })

    it('should return 400 for invalid action', async () => {
      const mockSession = createMockSession()
      vi.mocked(auth.api.getSession).mockResolvedValue(mockSession as any)

      const request = createMockRequest('/api/notifications', {
        method: 'PATCH',
        body: { ids: ['notif-1'], action: 'invalid_action' },
      })
      const response = await PATCH(request)
      const json = await getJsonResponse(response)

      expect(response.status).toBe(400)
      expect(json.error).toBe('Invalid action')
    })
  })

  describe('DELETE /api/notifications', () => {
    it('should return 401 when not authenticated', async () => {
      vi.mocked(auth.api.getSession).mockResolvedValue(null)

      const request = createMockRequest('/api/notifications', {
        method: 'DELETE',
        searchParams: { ids: 'notif-1,notif-2' },
      })
      // Need to mock nextUrl
      Object.defineProperty(request, 'nextUrl', {
        value: {
          searchParams: new URLSearchParams({ ids: 'notif-1,notif-2' }),
        },
      })
      const response = await DELETE(request)
      const json = await getJsonResponse(response)

      expect(response.status).toBe(401)
      expect(json.error).toBe('Unauthorized')
    })

    it('should return 400 when ids are missing', async () => {
      const mockSession = createMockSession()
      vi.mocked(auth.api.getSession).mockResolvedValue(mockSession as any)

      const request = createMockRequest('/api/notifications', {
        method: 'DELETE',
      })
      Object.defineProperty(request, 'nextUrl', {
        value: {
          searchParams: new URLSearchParams(),
        },
      })
      const response = await DELETE(request)
      const json = await getJsonResponse(response)

      expect(response.status).toBe(400)
      expect(json.error).toBe('Missing notification IDs')
    })

    it('should delete notifications', async () => {
      const mockSession = createMockSession()
      vi.mocked(auth.api.getSession).mockResolvedValue(mockSession as any)
      vi.mocked(prisma.notification.deleteMany).mockResolvedValue({ count: 2 } as any)

      const request = createMockRequest('/api/notifications', {
        method: 'DELETE',
      })
      Object.defineProperty(request, 'nextUrl', {
        value: {
          searchParams: new URLSearchParams({ ids: 'notif-1,notif-2' }),
        },
      })
      const response = await DELETE(request)
      const json = await getJsonResponse(response)

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(prisma.notification.deleteMany).toHaveBeenCalledWith({
        where: {
          id: { in: ['notif-1', 'notif-2'] },
          userId: 'cltest000user000001',
        },
      })
    })
  })
})
