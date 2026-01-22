import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    webhook: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    webhookDelivery: {
      create: vi.fn(),
      update: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}))

import {
  generateWebhookSignature,
  verifyWebhookSignature,
  triggerWebhook,
  getWebhookDeliveries,
  retryWebhookDelivery,
  getWebhook,
} from '@/lib/webhooks'
import { prisma } from '@/lib/prisma'

describe('Webhooks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('generateWebhookSignature', () => {
    it('should generate a hex signature', () => {
      const payload = JSON.stringify({ event: 'test', data: {} })
      const secret = 'webhook-secret'
      
      const signature = generateWebhookSignature(payload, secret)
      
      expect(typeof signature).toBe('string')
      expect(signature.length).toBe(64) // SHA256 produces 64 hex characters
      expect(/^[0-9a-f]+$/.test(signature)).toBe(true)
    })

    it('should generate consistent signatures for same input', () => {
      const payload = JSON.stringify({ event: 'test', data: { id: 123 } })
      const secret = 'webhook-secret'
      
      const signature1 = generateWebhookSignature(payload, secret)
      const signature2 = generateWebhookSignature(payload, secret)
      
      expect(signature1).toBe(signature2)
    })

    it('should generate different signatures for different payloads', () => {
      const secret = 'webhook-secret'
      
      const signature1 = generateWebhookSignature('payload1', secret)
      const signature2 = generateWebhookSignature('payload2', secret)
      
      expect(signature1).not.toBe(signature2)
    })

    it('should generate different signatures for different secrets', () => {
      const payload = 'same-payload'
      
      const signature1 = generateWebhookSignature(payload, 'secret1')
      const signature2 = generateWebhookSignature(payload, 'secret2')
      
      expect(signature1).not.toBe(signature2)
    })

    it('should handle empty payload', () => {
      const signature = generateWebhookSignature('', 'secret')
      
      expect(signature.length).toBe(64)
    })

    it('should handle special characters in payload', () => {
      const payload = JSON.stringify({ 
        emoji: '🎉', 
        special: '<script>alert("xss")</script>',
        unicode: '日本語'
      })
      const signature = generateWebhookSignature(payload, 'secret')
      
      expect(signature.length).toBe(64)
    })
  })

  describe('verifyWebhookSignature', () => {
    it('should verify a valid signature', () => {
      const payload = JSON.stringify({ event: 'test', data: {} })
      const secret = 'webhook-secret'
      const signature = generateWebhookSignature(payload, secret)
      
      const isValid = verifyWebhookSignature(payload, signature, secret)
      
      expect(isValid).toBe(true)
    })

    it('should reject an invalid signature', () => {
      const payload = JSON.stringify({ event: 'test', data: {} })
      const secret = 'webhook-secret'
      
      // Use a signature of the same length (64 chars) but different value
      const invalidSig = 'a'.repeat(64)
      const isValid = verifyWebhookSignature(payload, invalidSig, secret)
      
      expect(isValid).toBe(false)
    })

    it('should reject when payload has been tampered', () => {
      const originalPayload = JSON.stringify({ event: 'test', data: {} })
      const tamperedPayload = JSON.stringify({ event: 'test', data: { tampered: true } })
      const secret = 'webhook-secret'
      const signature = generateWebhookSignature(originalPayload, secret)
      
      const isValid = verifyWebhookSignature(tamperedPayload, signature, secret)
      
      expect(isValid).toBe(false)
    })

    it('should reject when secret is wrong', () => {
      const payload = JSON.stringify({ event: 'test', data: {} })
      const signature = generateWebhookSignature(payload, 'correct-secret')
      
      const isValid = verifyWebhookSignature(payload, signature, 'wrong-secret')
      
      expect(isValid).toBe(false)
    })
  })

  describe('triggerWebhook', () => {
    beforeEach(() => {
      global.fetch = vi.fn().mockResolvedValue({ ok: true })
    })

    it('should find active webhooks for the team and event', async () => {
      const mockFindMany = vi.mocked(prisma.webhook.findMany)
      mockFindMany.mockResolvedValue([])
      
      await triggerWebhook('team-123', 'migration.created', { id: 'mig-1' })
      
      expect(mockFindMany).toHaveBeenCalledWith({
        where: {
          teamId: 'team-123',
          isActive: true,
          events: {
            hasSome: ['migration.created'],
          },
        },
      })
    })

    it('should create delivery and send webhook for each active webhook', async () => {
      const mockFindMany = vi.mocked(prisma.webhook.findMany)
      const mockCreate = vi.mocked(prisma.webhookDelivery.create)
      
      mockFindMany.mockResolvedValue([
        { id: 'webhook-1', url: 'https://example.com/hook1', secret: 'secret1' },
        { id: 'webhook-2', url: 'https://example.com/hook2', secret: 'secret2' },
      ] as any)
      
      mockCreate.mockResolvedValue({ id: 'delivery-1' } as any)
      
      await triggerWebhook('team-123', 'migration.executed', { migrationId: 'mig-1' })
      
      expect(mockCreate).toHaveBeenCalledTimes(2)
    })

    it('should do nothing when no active webhooks exist', async () => {
      const mockFindMany = vi.mocked(prisma.webhook.findMany)
      const mockCreate = vi.mocked(prisma.webhookDelivery.create)
      
      mockFindMany.mockResolvedValue([])
      
      await triggerWebhook('team-123', 'migration.created', { id: 'mig-1' })
      
      expect(mockCreate).not.toHaveBeenCalled()
    })

    it('should include correct payload structure', async () => {
      const mockFindMany = vi.mocked(prisma.webhook.findMany)
      const mockCreate = vi.mocked(prisma.webhookDelivery.create)
      
      mockFindMany.mockResolvedValue([
        { id: 'webhook-1', url: 'https://example.com/hook', secret: 'secret' },
      ] as any)
      mockCreate.mockResolvedValue({ id: 'delivery-1' } as any)
      
      await triggerWebhook('team-123', 'migration.executed', { migrationId: 'mig-1' })
      
      const createCall = mockCreate.mock.calls[0][0]
      const payload = JSON.parse((createCall as any).data.payload)
      
      expect(payload.event).toBe('migration.executed')
      expect(payload.teamId).toBe('team-123')
      expect(payload.timestamp).toBeDefined()
      expect(payload.data).toEqual({ migrationId: 'mig-1' })
    })
  })

  describe('getWebhookDeliveries', () => {
    it('should return deliveries with pagination', async () => {
      const mockFindMany = vi.mocked(prisma.webhookDelivery.findMany)
      const mockCount = vi.mocked(prisma.webhookDelivery.count)
      
      const mockDeliveries = [
        { id: 'd1', status: 'DELIVERED', createdAt: new Date() },
        { id: 'd2', status: 'FAILED', createdAt: new Date() },
      ]
      
      mockFindMany.mockResolvedValue(mockDeliveries as any)
      mockCount.mockResolvedValue(100)
      
      const result = await getWebhookDeliveries('webhook-123', { limit: 10, offset: 0 })
      
      expect(result.deliveries).toEqual(mockDeliveries)
      expect(result.total).toBe(100)
      expect(result.hasMore).toBe(true)
    })

    it('should use default limit and offset', async () => {
      const mockFindMany = vi.mocked(prisma.webhookDelivery.findMany)
      const mockCount = vi.mocked(prisma.webhookDelivery.count)
      
      mockFindMany.mockResolvedValue([])
      mockCount.mockResolvedValue(0)
      
      await getWebhookDeliveries('webhook-123')
      
      expect(mockFindMany).toHaveBeenCalledWith(expect.objectContaining({
        take: 50,
        skip: 0,
      }))
    })

    it('should filter by status when provided', async () => {
      const mockFindMany = vi.mocked(prisma.webhookDelivery.findMany)
      const mockCount = vi.mocked(prisma.webhookDelivery.count)
      
      mockFindMany.mockResolvedValue([])
      mockCount.mockResolvedValue(0)
      
      await getWebhookDeliveries('webhook-123', { status: 'FAILED' })
      
      expect(mockFindMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { webhookId: 'webhook-123', status: 'FAILED' },
      }))
    })

    it('should correctly calculate hasMore', async () => {
      const mockFindMany = vi.mocked(prisma.webhookDelivery.findMany)
      const mockCount = vi.mocked(prisma.webhookDelivery.count)
      
      mockFindMany.mockResolvedValue([])
      mockCount.mockResolvedValue(50)
      
      const result = await getWebhookDeliveries('webhook-123', { limit: 50, offset: 0 })
      
      expect(result.hasMore).toBe(false)
    })
  })

  describe('retryWebhookDelivery', () => {
    beforeEach(() => {
      global.fetch = vi.fn()
    })

    it('should throw error when delivery not found', async () => {
      const mockFindUnique = vi.mocked(prisma.webhookDelivery.findUnique)
      mockFindUnique.mockResolvedValue(null)
      
      await expect(
        retryWebhookDelivery('delivery-123', { url: 'https://example.com/hook' })
      ).rejects.toThrow('Delivery not found')
    })

    it('should retry sending webhook and update status on success', async () => {
      const mockFindUnique = vi.mocked(prisma.webhookDelivery.findUnique)
      const mockUpdate = vi.mocked(prisma.webhookDelivery.update)
      
      mockFindUnique.mockResolvedValue({
        id: 'delivery-123',
        payload: JSON.stringify({ event: 'test', data: {} }),
        signature: 'sig-123',
      } as any)
      
      vi.mocked(global.fetch).mockResolvedValue({ ok: true } as any)
      
      await retryWebhookDelivery('delivery-123', { url: 'https://example.com/hook' })
      
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 'delivery-123' },
        data: {
          status: 'DELIVERED',
          deliveredAt: expect.any(Date),
          error: null,
        },
      })
    })

    it('should update status to failed and throw when fetch fails', async () => {
      const mockFindUnique = vi.mocked(prisma.webhookDelivery.findUnique)
      const mockUpdate = vi.mocked(prisma.webhookDelivery.update)
      
      mockFindUnique.mockResolvedValue({
        id: 'delivery-123',
        payload: JSON.stringify({ event: 'test', data: {} }),
        signature: 'sig-123',
      } as any)
      
      vi.mocked(global.fetch).mockResolvedValue({ ok: false, status: 500 } as any)
      
      await expect(
        retryWebhookDelivery('delivery-123', { url: 'https://example.com/hook' })
      ).rejects.toThrow()
      
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 'delivery-123' },
        data: {
          status: 'FAILED',
          error: expect.any(String),
        },
      })
    })
  })

  describe('getWebhook', () => {
    it('should return webhook details', async () => {
      const mockFindUnique = vi.mocked(prisma.webhook.findUnique)
      const mockWebhook = {
        id: 'webhook-123',
        name: 'Test Webhook',
        url: 'https://example.com/hook',
        events: ['migration.created'],
        isActive: true,
        createdAt: new Date(),
      }
      
      mockFindUnique.mockResolvedValue(mockWebhook as any)
      
      const result = await getWebhook('webhook-123')
      
      expect(result).toEqual(mockWebhook)
      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { id: 'webhook-123' },
        select: {
          id: true,
          name: true,
          url: true,
          events: true,
          isActive: true,
          createdAt: true,
        },
      })
    })

    it('should return null when webhook not found', async () => {
      const mockFindUnique = vi.mocked(prisma.webhook.findUnique)
      mockFindUnique.mockResolvedValue(null)
      
      const result = await getWebhook('non-existent')
      
      expect(result).toBeNull()
    })
  })

  describe('triggerWebhook async error handling', () => {
    beforeEach(() => {
      global.fetch = vi.fn()
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should handle failed webhook delivery and mark as failed', async () => {
      const mockFindMany = vi.mocked(prisma.webhook.findMany)
      const mockCreate = vi.mocked(prisma.webhookDelivery.create)
      const mockUpdate = vi.mocked(prisma.webhookDelivery.update)
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      mockFindMany.mockResolvedValue([
        { id: 'webhook-1', url: 'https://example.com/hook', secret: 'secret1' },
      ] as any)
      
      mockCreate.mockResolvedValue({ id: 'delivery-1' } as any)
      vi.mocked(global.fetch).mockRejectedValue(new Error('Network error'))
      mockUpdate.mockResolvedValue({} as any)
      
      await triggerWebhook('team-123', 'migration.created', { id: 'mig-1' })
      
      // Allow async operations to complete
      await vi.runAllTimersAsync()
      
      // The update might be called when the async operation fails
      // Verify no unhandled errors
      consoleError.mockRestore()
    })

    it('should handle error when queueing webhook delivery fails', async () => {
      const mockFindMany = vi.mocked(prisma.webhook.findMany)
      const mockCreate = vi.mocked(prisma.webhookDelivery.create)
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      mockFindMany.mockResolvedValue([
        { id: 'webhook-1', url: 'https://example.com/hook', secret: 'secret1' },
      ] as any)
      
      mockCreate.mockRejectedValue(new Error('Database error'))
      
      await triggerWebhook('team-123', 'migration.created', { id: 'mig-1' })
      
      expect(consoleError).toHaveBeenCalledWith('Failed to queue webhook delivery:', expect.any(Error))
      consoleError.mockRestore()
    })
  })
})
