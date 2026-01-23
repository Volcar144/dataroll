import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createMockSession,
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
    webhook: {
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}))

vi.mock('@/lib/permissions', () => ({
  requirePermission: vi.fn(),
  Permission: {
    UPDATE_WEBHOOK: 'update_webhook',
    DELETE_WEBHOOK: 'delete_webhook',
  },
}))

vi.mock('@/lib/audit', () => ({
  createAuditLog: vi.fn(),
}))

vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}))

// Import after mocking
import { PATCH, DELETE } from '@/app/api/webhooks/[webhookId]/route'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'

function createMockWebhook(overrides: {
  id?: string
  name?: string
  url?: string
  teamId?: string
  events?: string[]
  isActive?: boolean
} = {}) {
  return {
    id: overrides.id || 'cltest000webhook001',
    name: overrides.name || 'Test Webhook',
    url: overrides.url || 'https://example.com/webhook',
    teamId: overrides.teamId || 'cltest000team000001',
    events: overrides.events || ['migration.executed', 'migration.failed'],
    isActive: overrides.isActive ?? true,
    secret: 'test-secret',
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

function createMockRequest(body: any): Request {
  return new Request('http://localhost:3000/api/webhooks/webhook-123', {
    method: 'PATCH',
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
    },
  })
}

describe('Webhooks API Routes', () => {
  beforeEach(() => {
    resetAllMocks()
  })

  describe('PATCH /api/webhooks/[webhookId]', () => {
    it('should return 401 when not authenticated', async () => {
      vi.mocked(auth.api.getSession).mockResolvedValue(null)

      const request = createMockRequest({ name: 'Updated Webhook' })
      const response = await PATCH(request, {
        params: Promise.resolve({ webhookId: 'webhook-123' }),
      })
      const json = await response.json()

      expect(response.status).toBe(401)
      expect(json.error).toBe('Unauthorized')
    })

    it('should return 404 when webhook not found', async () => {
      const mockSession = createMockSession()
      vi.mocked(auth.api.getSession).mockResolvedValue(mockSession as any)
      vi.mocked(prisma.webhook.findUnique).mockResolvedValue(null)

      const request = createMockRequest({ name: 'Updated Webhook' })
      const response = await PATCH(request, {
        params: Promise.resolve({ webhookId: 'non-existent' }),
      })
      const json = await response.json()

      expect(response.status).toBe(404)
      expect(json.error).toBe('Webhook not found')
    })

    it('should return 403 when user lacks permission', async () => {
      const mockSession = createMockSession()
      const mockWebhook = createMockWebhook()

      vi.mocked(auth.api.getSession).mockResolvedValue(mockSession as any)
      vi.mocked(prisma.webhook.findUnique).mockResolvedValue(mockWebhook as any)
      vi.mocked(requirePermission).mockRejectedValue(
        new Error('User does not have update_webhook permission')
      )

      const request = createMockRequest({ name: 'Updated Webhook' })
      const response = await PATCH(request, {
        params: Promise.resolve({ webhookId: 'webhook-123' }),
      })
      const json = await response.json()

      expect(response.status).toBe(403)
      expect(json.error).toBe('Forbidden')
    })

    it('should return 400 for invalid URL', async () => {
      const mockSession = createMockSession()
      const mockWebhook = createMockWebhook()

      vi.mocked(auth.api.getSession).mockResolvedValue(mockSession as any)
      vi.mocked(prisma.webhook.findUnique).mockResolvedValue(mockWebhook as any)
      vi.mocked(requirePermission).mockResolvedValue(undefined)

      const request = createMockRequest({ url: 'not-a-valid-url' })
      const response = await PATCH(request, {
        params: Promise.resolve({ webhookId: 'webhook-123' }),
      })
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.error).toBe('Invalid webhook URL')
    })

    it('should return 400 when events array is empty', async () => {
      const mockSession = createMockSession()
      const mockWebhook = createMockWebhook()

      vi.mocked(auth.api.getSession).mockResolvedValue(mockSession as any)
      vi.mocked(prisma.webhook.findUnique).mockResolvedValue(mockWebhook as any)
      vi.mocked(requirePermission).mockResolvedValue(undefined)

      const request = createMockRequest({ events: [] })
      const response = await PATCH(request, {
        params: Promise.resolve({ webhookId: 'webhook-123' }),
      })
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.error).toBe('At least one event must be selected')
    })

    it('should update webhook successfully', async () => {
      const mockSession = createMockSession()
      const mockWebhook = createMockWebhook()
      const updatedWebhook = {
        ...mockWebhook,
        name: 'Updated Webhook',
        url: 'https://new-url.com/webhook',
      }

      vi.mocked(auth.api.getSession).mockResolvedValue(mockSession as any)
      vi.mocked(prisma.webhook.findUnique).mockResolvedValue(mockWebhook as any)
      vi.mocked(requirePermission).mockResolvedValue(undefined)
      vi.mocked(prisma.webhook.update).mockResolvedValue(updatedWebhook as any)

      const request = createMockRequest({
        name: 'Updated Webhook',
        url: 'https://new-url.com/webhook',
      })
      const response = await PATCH(request, {
        params: Promise.resolve({ webhookId: 'webhook-123' }),
      })
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.webhook.name).toBe('Updated Webhook')
    })
  })

  describe('DELETE /api/webhooks/[webhookId]', () => {
    it('should return 401 when not authenticated', async () => {
      vi.mocked(auth.api.getSession).mockResolvedValue(null)

      const request = new Request('http://localhost:3000/api/webhooks/webhook-123', {
        method: 'DELETE',
      })
      const response = await DELETE(request, {
        params: Promise.resolve({ webhookId: 'webhook-123' }),
      })
      const json = await response.json()

      expect(response.status).toBe(401)
      expect(json.error).toBe('Unauthorized')
    })

    it('should return 404 when webhook not found', async () => {
      const mockSession = createMockSession()
      vi.mocked(auth.api.getSession).mockResolvedValue(mockSession as any)
      vi.mocked(prisma.webhook.findUnique).mockResolvedValue(null)

      const request = new Request('http://localhost:3000/api/webhooks/non-existent', {
        method: 'DELETE',
      })
      const response = await DELETE(request, {
        params: Promise.resolve({ webhookId: 'non-existent' }),
      })
      const json = await response.json()

      expect(response.status).toBe(404)
      expect(json.error).toBe('Webhook not found')
    })

    it('should return 403 when user lacks permission', async () => {
      const mockSession = createMockSession()
      const mockWebhook = createMockWebhook()

      vi.mocked(auth.api.getSession).mockResolvedValue(mockSession as any)
      vi.mocked(prisma.webhook.findUnique).mockResolvedValue(mockWebhook as any)
      vi.mocked(requirePermission).mockRejectedValue(
        new Error('User does not have delete_webhook permission')
      )

      const request = new Request('http://localhost:3000/api/webhooks/webhook-123', {
        method: 'DELETE',
      })
      const response = await DELETE(request, {
        params: Promise.resolve({ webhookId: 'webhook-123' }),
      })
      const json = await response.json()

      expect(response.status).toBe(403)
      expect(json.error).toBe('Forbidden')
    })

    it('should delete webhook successfully', async () => {
      const mockSession = createMockSession()
      const mockWebhook = createMockWebhook()

      vi.mocked(auth.api.getSession).mockResolvedValue(mockSession as any)
      vi.mocked(prisma.webhook.findUnique).mockResolvedValue(mockWebhook as any)
      vi.mocked(requirePermission).mockResolvedValue(undefined)
      vi.mocked(prisma.webhook.delete).mockResolvedValue(mockWebhook as any)

      const request = new Request('http://localhost:3000/api/webhooks/webhook-123', {
        method: 'DELETE',
      })
      const response = await DELETE(request, {
        params: Promise.resolve({ webhookId: 'webhook-123' }),
      })
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.message).toBe('Webhook deleted')
    })
  })
})
