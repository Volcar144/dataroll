import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    notification: {
      create: vi.fn(),
      createMany: vi.fn(),
      count: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    databaseConnection: {
      findUnique: vi.fn(),
    },
  },
}))

// Mock email service
vi.mock('@/lib/email', () => ({
  EmailService: vi.fn().mockImplementation(() => ({
    sendEmail: vi.fn().mockResolvedValue({ success: true }),
  })),
}))

import {
  createNotification,
  createNotificationsForUsers,
  getUnreadNotificationCount,
  NotificationService,
} from '@/lib/notifications'
import { prisma } from '@/lib/prisma'

describe('Notifications', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createNotification', () => {
    it('should create a notification with all fields', async () => {
      const mockCreate = vi.mocked(prisma.notification.create)
      const mockNotification = {
        id: 'notif-123',
        userId: 'user-123',
        type: 'approval_request',
        title: 'Test Title',
        message: 'Test message',
        link: '/dashboard',
        metadata: { key: 'value' },
      }
      mockCreate.mockResolvedValue(mockNotification as any)

      const result = await createNotification({
        userId: 'user-123',
        type: 'approval_request',
        title: 'Test Title',
        message: 'Test message',
        link: '/dashboard',
        metadata: { key: 'value' },
      })

      expect(mockCreate).toHaveBeenCalledWith({
        data: {
          userId: 'user-123',
          type: 'approval_request',
          title: 'Test Title',
          message: 'Test message',
          link: '/dashboard',
          metadata: { key: 'value' },
        },
      })
      expect(result).toEqual(mockNotification)
    })

    it('should create a notification with minimal fields', async () => {
      const mockCreate = vi.mocked(prisma.notification.create)
      mockCreate.mockResolvedValue({ id: 'notif-123' } as any)

      await createNotification({
        userId: 'user-123',
        type: 'system',
        title: 'System Alert',
        message: 'Something happened',
      })

      expect(mockCreate).toHaveBeenCalledWith({
        data: {
          userId: 'user-123',
          type: 'system',
          title: 'System Alert',
          message: 'Something happened',
          link: undefined,
          metadata: undefined,
        },
      })
    })

    it('should return null when creation fails', async () => {
      const mockCreate = vi.mocked(prisma.notification.create)
      mockCreate.mockRejectedValue(new Error('Database error'))

      const result = await createNotification({
        userId: 'user-123',
        type: 'system',
        title: 'Test',
        message: 'Test',
      })

      expect(result).toBeNull()
    })

    it('should handle all notification types', async () => {
      const mockCreate = vi.mocked(prisma.notification.create)
      mockCreate.mockResolvedValue({ id: 'notif-123' } as any)

      const types = [
        'approval_request',
        'approval_response',
        'workflow_success',
        'workflow_failure',
        'team_invite',
        'system',
        'migration_complete',
        'migration_failed',
      ] as const

      for (const type of types) {
        await createNotification({
          userId: 'user-123',
          type,
          title: 'Test',
          message: 'Test',
        })
      }

      expect(mockCreate).toHaveBeenCalledTimes(types.length)
    })
  })

  describe('createNotificationsForUsers', () => {
    it('should create notifications for multiple users', async () => {
      const mockCreateMany = vi.mocked(prisma.notification.createMany)
      mockCreateMany.mockResolvedValue({ count: 3 })

      const result = await createNotificationsForUsers(
        ['user-1', 'user-2', 'user-3'],
        {
          type: 'approval_request',
          title: 'Approval Needed',
          message: 'Please review',
          link: '/approve/123',
          metadata: { queryId: '123' },
        }
      )

      expect(mockCreateMany).toHaveBeenCalledWith({
        data: [
          {
            userId: 'user-1',
            type: 'approval_request',
            title: 'Approval Needed',
            message: 'Please review',
            link: '/approve/123',
            metadata: { queryId: '123' },
          },
          {
            userId: 'user-2',
            type: 'approval_request',
            title: 'Approval Needed',
            message: 'Please review',
            link: '/approve/123',
            metadata: { queryId: '123' },
          },
          {
            userId: 'user-3',
            type: 'approval_request',
            title: 'Approval Needed',
            message: 'Please review',
            link: '/approve/123',
            metadata: { queryId: '123' },
          },
        ],
      })
      expect(result).toEqual({ count: 3 })
    })

    it('should return null when creation fails', async () => {
      const mockCreateMany = vi.mocked(prisma.notification.createMany)
      mockCreateMany.mockRejectedValue(new Error('Bulk insert failed'))

      const result = await createNotificationsForUsers(
        ['user-1', 'user-2'],
        {
          type: 'system',
          title: 'Test',
          message: 'Test',
        }
      )

      expect(result).toBeNull()
    })

    it('should handle empty user array', async () => {
      const mockCreateMany = vi.mocked(prisma.notification.createMany)
      mockCreateMany.mockResolvedValue({ count: 0 })

      const result = await createNotificationsForUsers([], {
        type: 'system',
        title: 'Test',
        message: 'Test',
      })

      expect(mockCreateMany).toHaveBeenCalledWith({
        data: [],
      })
      expect(result).toEqual({ count: 0 })
    })
  })

  describe('getUnreadNotificationCount', () => {
    it('should return count of unread notifications', async () => {
      const mockCount = vi.mocked(prisma.notification.count)
      mockCount.mockResolvedValue(5)

      const result = await getUnreadNotificationCount('user-123')

      expect(mockCount).toHaveBeenCalledWith({
        where: {
          userId: 'user-123',
          read: false,
          archived: false,
        },
      })
      expect(result).toBe(5)
    })

    it('should return 0 when count fails', async () => {
      const mockCount = vi.mocked(prisma.notification.count)
      mockCount.mockRejectedValue(new Error('Database error'))

      const result = await getUnreadNotificationCount('user-123')

      expect(result).toBe(0)
    })

    it('should return 0 when user has no unread notifications', async () => {
      const mockCount = vi.mocked(prisma.notification.count)
      mockCount.mockResolvedValue(0)

      const result = await getUnreadNotificationCount('user-123')

      expect(result).toBe(0)
    })
  })

  describe('NotificationService', () => {
    describe('constructor', () => {
      it('should create instance without config', () => {
        const service = new NotificationService()
        expect(service).toBeDefined()
      })

      it('should create instance with email service', () => {
        const service = new NotificationService({
          emailService: {} as any,
        })
        expect(service).toBeDefined()
      })

      it('should create instance with slack webhook', () => {
        const service = new NotificationService({
          slackWebhook: 'https://hooks.slack.com/services/xxx',
        })
        expect(service).toBeDefined()
      })

      it('should create instance with both email and slack', () => {
        const service = new NotificationService({
          emailService: {} as any,
          slackWebhook: 'https://hooks.slack.com/services/xxx',
        })
        expect(service).toBeDefined()
      })
    })

    describe('notifyQueryApprovalRequest', () => {
      let service: NotificationService

      beforeEach(() => {
        service = new NotificationService()
        global.fetch = vi.fn()
      })

      it('should handle when user is not found', async () => {
        vi.mocked(prisma.user.findUnique).mockResolvedValue(null)
        vi.mocked(prisma.databaseConnection.findUnique).mockResolvedValue({
          id: 'conn-1',
          name: 'Test DB',
          team: { members: [] },
        } as any)

        // Should not throw
        await service.notifyQueryApprovalRequest('query-1', 'user-1', 'conn-1', 'SELECT * FROM users')
        
        expect(prisma.user.findUnique).toHaveBeenCalled()
      })

      it('should handle when connection is not found', async () => {
        vi.mocked(prisma.user.findUnique).mockResolvedValue({
          id: 'user-1',
          name: 'Test User',
          email: 'test@example.com',
        } as any)
        vi.mocked(prisma.databaseConnection.findUnique).mockResolvedValue(null)

        // Should not throw
        await service.notifyQueryApprovalRequest('query-1', 'user-1', 'conn-1', 'SELECT * FROM users')
        
        expect(prisma.databaseConnection.findUnique).toHaveBeenCalled()
      })

      it('should create in-app notifications for team members', async () => {
        const mockNotificationCreateMany = vi.mocked(prisma.notification.createMany)
        mockNotificationCreateMany.mockResolvedValue({ count: 2 })

        vi.mocked(prisma.user.findUnique).mockResolvedValue({
          id: 'user-1',
          name: 'Requester',
          email: 'requester@example.com',
          notificationPreferences: {},
        } as any)

        vi.mocked(prisma.databaseConnection.findUnique).mockResolvedValue({
          id: 'conn-1',
          name: 'Production DB',
          team: {
            members: [
              { userId: 'user-1', user: { notificationPreferences: {} } },
              { userId: 'user-2', user: { notificationPreferences: {} } },
              { userId: 'user-3', user: { notificationPreferences: {} } },
            ],
          },
        } as any)

        await service.notifyQueryApprovalRequest('query-1', 'user-1', 'conn-1', 'SELECT * FROM users')

        // Should create notifications for team members excluding the requester
        expect(mockNotificationCreateMany).toHaveBeenCalledWith({
          data: expect.arrayContaining([
            expect.objectContaining({
              userId: 'user-2',
              type: 'approval_request',
            }),
            expect.objectContaining({
              userId: 'user-3',
              type: 'approval_request',
            }),
          ]),
        })
      })

      it('should send email notifications when email service is configured', async () => {
        const mockSendEmail = vi.fn().mockResolvedValue(true)
        const emailService = { sendEmail: mockSendEmail } as any
        const serviceWithEmail = new NotificationService({ emailService })

        vi.mocked(prisma.notification.createMany).mockResolvedValue({ count: 1 })

        vi.mocked(prisma.user.findUnique).mockResolvedValue({
          id: 'user-1',
          name: 'Requester',
          email: 'requester@example.com',
        } as any)

        vi.mocked(prisma.databaseConnection.findUnique).mockResolvedValue({
          id: 'conn-1',
          name: 'Production DB',
          environment: 'production',
          team: {
            members: [
              { 
                userId: 'user-2', 
                user: { 
                  email: 'user2@example.com',
                  notificationPreferences: { emailOnSuccess: true } 
                } 
              },
            ],
          },
        } as any)

        await serviceWithEmail.notifyQueryApprovalRequest('query-1', 'user-1', 'conn-1', 'SELECT * FROM users')

        expect(mockSendEmail).toHaveBeenCalledWith(
          'user2@example.com',
          expect.stringContaining('Query Approval Request'),
          expect.stringContaining('Production DB')
        )
      })

      it('should not send email when user has no email preferences', async () => {
        const mockSendEmail = vi.fn().mockResolvedValue(true)
        const emailService = { sendEmail: mockSendEmail } as any
        const serviceWithEmail = new NotificationService({ emailService })

        vi.mocked(prisma.notification.createMany).mockResolvedValue({ count: 1 })

        vi.mocked(prisma.user.findUnique).mockResolvedValue({
          id: 'user-1',
          name: 'Requester',
          email: 'requester@example.com',
        } as any)

        vi.mocked(prisma.databaseConnection.findUnique).mockResolvedValue({
          id: 'conn-1',
          name: 'Production DB',
          environment: 'production',
          team: {
            members: [
              { 
                userId: 'user-2', 
                user: { 
                  email: 'user2@example.com',
                  notificationPreferences: { emailOnSuccess: false } 
                } 
              },
            ],
          },
        } as any)

        await serviceWithEmail.notifyQueryApprovalRequest('query-1', 'user-1', 'conn-1', 'SELECT * FROM users')

        expect(mockSendEmail).not.toHaveBeenCalled()
      })

      it('should send Slack notification when webhook is configured', async () => {
        const mockFetch = vi.fn().mockResolvedValue({ ok: true })
        global.fetch = mockFetch

        const serviceWithSlack = new NotificationService({ 
          slackWebhook: 'https://hooks.slack.com/services/xxx' 
        })

        vi.mocked(prisma.notification.createMany).mockResolvedValue({ count: 1 })

        vi.mocked(prisma.user.findUnique).mockResolvedValue({
          id: 'user-1',
          name: 'Requester',
          email: 'requester@example.com',
        } as any)

        vi.mocked(prisma.databaseConnection.findUnique).mockResolvedValue({
          id: 'conn-1',
          name: 'Production DB',
          environment: 'production',
          team: {
            members: [
              { userId: 'user-2', user: { notificationPreferences: {} } },
            ],
          },
        } as any)

        await serviceWithSlack.notifyQueryApprovalRequest('query-1', 'user-1', 'conn-1', 'SELECT * FROM users')

        expect(mockFetch).toHaveBeenCalledWith(
          'https://hooks.slack.com/services/xxx',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          })
        )
      })

      it('should truncate long queries in Slack notification', async () => {
        const mockFetch = vi.fn().mockResolvedValue({ ok: true })
        global.fetch = mockFetch

        const serviceWithSlack = new NotificationService({ 
          slackWebhook: 'https://hooks.slack.com/services/xxx' 
        })

        vi.mocked(prisma.notification.createMany).mockResolvedValue({ count: 1 })

        vi.mocked(prisma.user.findUnique).mockResolvedValue({
          id: 'user-1',
          name: 'Requester',
          email: 'requester@example.com',
        } as any)

        vi.mocked(prisma.databaseConnection.findUnique).mockResolvedValue({
          id: 'conn-1',
          name: 'Production DB',
          environment: 'production',
          team: {
            members: [
              { userId: 'user-2', user: { notificationPreferences: {} } },
            ],
          },
        } as any)

        const longQuery = 'SELECT ' + 'a'.repeat(600) // Query longer than 500 chars

        await serviceWithSlack.notifyQueryApprovalRequest('query-1', 'user-1', 'conn-1', longQuery)

        expect(mockFetch).toHaveBeenCalled()
        const callArgs = mockFetch.mock.calls[0]
        const body = JSON.parse(callArgs[1].body)
        // Should contain truncation indicator
        expect(body.blocks[2].text.text).toContain('...')
      })

      it('should handle Slack notification failure', async () => {
        const mockFetch = vi.fn().mockResolvedValue({ ok: false, statusText: 'Forbidden' })
        global.fetch = mockFetch
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

        const serviceWithSlack = new NotificationService({ 
          slackWebhook: 'https://hooks.slack.com/services/xxx' 
        })

        vi.mocked(prisma.notification.createMany).mockResolvedValue({ count: 1 })

        vi.mocked(prisma.user.findUnique).mockResolvedValue({
          id: 'user-1',
          name: 'Requester',
          email: 'requester@example.com',
        } as any)

        vi.mocked(prisma.databaseConnection.findUnique).mockResolvedValue({
          id: 'conn-1',
          name: 'Production DB',
          environment: 'production',
          team: {
            members: [
              { userId: 'user-2', user: { notificationPreferences: {} } },
            ],
          },
        } as any)

        await serviceWithSlack.notifyQueryApprovalRequest('query-1', 'user-1', 'conn-1', 'SELECT 1')

        expect(consoleError).toHaveBeenCalledWith('Failed to send Slack notification:', 'Forbidden')
        consoleError.mockRestore()
      })

      it('should handle Slack fetch error', async () => {
        const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'))
        global.fetch = mockFetch
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

        const serviceWithSlack = new NotificationService({ 
          slackWebhook: 'https://hooks.slack.com/services/xxx' 
        })

        vi.mocked(prisma.notification.createMany).mockResolvedValue({ count: 1 })

        vi.mocked(prisma.user.findUnique).mockResolvedValue({
          id: 'user-1',
          name: 'Requester',
          email: 'requester@example.com',
        } as any)

        vi.mocked(prisma.databaseConnection.findUnique).mockResolvedValue({
          id: 'conn-1',
          name: 'Production DB',
          environment: 'production',
          team: {
            members: [
              { userId: 'user-2', user: { notificationPreferences: {} } },
            ],
          },
        } as any)

        await serviceWithSlack.notifyQueryApprovalRequest('query-1', 'user-1', 'conn-1', 'SELECT 1')

        expect(consoleError).toHaveBeenCalledWith('Error sending Slack notification:', expect.any(Error))
        consoleError.mockRestore()
      })

      it('should use requester email when name is not available', async () => {
        const mockSendEmail = vi.fn().mockResolvedValue(true)
        const emailService = { sendEmail: mockSendEmail } as any
        const serviceWithEmail = new NotificationService({ emailService })

        vi.mocked(prisma.notification.createMany).mockResolvedValue({ count: 1 })

        vi.mocked(prisma.user.findUnique).mockResolvedValue({
          id: 'user-1',
          name: null,
          email: 'requester@example.com',
        } as any)

        vi.mocked(prisma.databaseConnection.findUnique).mockResolvedValue({
          id: 'conn-1',
          name: 'Production DB',
          environment: 'production',
          team: {
            members: [
              { 
                userId: 'user-2', 
                user: { 
                  email: 'user2@example.com',
                  notificationPreferences: { emailOnSuccess: true } 
                } 
              },
            ],
          },
        } as any)

        await serviceWithEmail.notifyQueryApprovalRequest('query-1', 'user-1', 'conn-1', 'SELECT * FROM users')

        expect(mockSendEmail).toHaveBeenCalledWith(
          'user2@example.com',
          expect.any(String),
          expect.stringContaining('requester@example.com')
        )
      })

      it('should handle general errors gracefully', async () => {
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
        
        vi.mocked(prisma.user.findUnique).mockRejectedValue(new Error('Database error'))

        await service.notifyQueryApprovalRequest('query-1', 'user-1', 'conn-1', 'SELECT 1')

        expect(consoleError).toHaveBeenCalledWith(
          'Failed to send approval request notifications:',
          expect.any(Error)
        )
        consoleError.mockRestore()
      })
    })
  })
})
