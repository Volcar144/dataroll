import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    autoApprovalRule: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    teamMember: {
      findMany: vi.fn(),
    },
  },
}))

import { AutoApprovalService } from '@/lib/auto-approval'
import { prisma } from '@/lib/prisma'

describe('AutoApprovalService', () => {
  let service: AutoApprovalService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new AutoApprovalService()
  })

  describe('checkAutoApproval', () => {
    it('should return false when no rules exist', async () => {
      vi.mocked(prisma.autoApprovalRule.findMany).mockResolvedValue([])
      vi.mocked(prisma.teamMember.findMany).mockResolvedValue([])

      const result = await service.checkAutoApproval(
        'user-123',
        'conn-456',
        'SELECT * FROM users'
      )

      expect(result).toBe(false)
    })

    it('should return true when a matching rule exists', async () => {
      vi.mocked(prisma.teamMember.findMany).mockResolvedValue([])
      vi.mocked(prisma.autoApprovalRule.findMany).mockResolvedValue([
        {
          id: 'rule-1',
          userId: 'user-123',
          connectionId: 'conn-456',
          queryPattern: null,
          maxRows: null,
          isActive: true,
        },
      ] as any)

      const result = await service.checkAutoApproval(
        'user-123',
        'conn-456',
        'SELECT * FROM users'
      )

      expect(result).toBe(true)
    })

    it('should match rules with query pattern', async () => {
      vi.mocked(prisma.teamMember.findMany).mockResolvedValue([])
      vi.mocked(prisma.autoApprovalRule.findMany).mockResolvedValue([
        {
          id: 'rule-1',
          userId: 'user-123',
          connectionId: null,
          queryPattern: '^SELECT',
          maxRows: null,
          isActive: true,
        },
      ] as any)

      const result = await service.checkAutoApproval(
        'user-123',
        'conn-456',
        'SELECT * FROM users'
      )

      expect(result).toBe(true)
    })

    it('should not match rules with non-matching query pattern', async () => {
      vi.mocked(prisma.teamMember.findMany).mockResolvedValue([])
      vi.mocked(prisma.autoApprovalRule.findMany).mockResolvedValue([
        {
          id: 'rule-1',
          userId: 'user-123',
          connectionId: null,
          queryPattern: '^INSERT',
          maxRows: null,
          isActive: true,
        },
      ] as any)

      const result = await service.checkAutoApproval(
        'user-123',
        'conn-456',
        'SELECT * FROM users'
      )

      expect(result).toBe(false)
    })

    it('should match rules with maxRows constraint', async () => {
      vi.mocked(prisma.teamMember.findMany).mockResolvedValue([])
      vi.mocked(prisma.autoApprovalRule.findMany).mockResolvedValue([
        {
          id: 'rule-1',
          userId: 'user-123',
          connectionId: null,
          queryPattern: null,
          maxRows: 100,
          isActive: true,
        },
      ] as any)

      const result = await service.checkAutoApproval(
        'user-123',
        'conn-456',
        'SELECT * FROM users',
        50 // estimatedRows
      )

      expect(result).toBe(true)
    })

    it('should not match when estimatedRows exceeds maxRows', async () => {
      vi.mocked(prisma.teamMember.findMany).mockResolvedValue([])
      vi.mocked(prisma.autoApprovalRule.findMany).mockResolvedValue([
        {
          id: 'rule-1',
          userId: 'user-123',
          connectionId: null,
          queryPattern: null,
          maxRows: 100,
          isActive: true,
        },
      ] as any)

      const result = await service.checkAutoApproval(
        'user-123',
        'conn-456',
        'SELECT * FROM users',
        150 // exceeds maxRows
      )

      expect(result).toBe(false)
    })

    it('should not match rule for different connection', async () => {
      vi.mocked(prisma.teamMember.findMany).mockResolvedValue([])
      vi.mocked(prisma.autoApprovalRule.findMany).mockResolvedValue([
        {
          id: 'rule-1',
          userId: 'user-123',
          connectionId: 'conn-other',
          queryPattern: null,
          maxRows: null,
          isActive: true,
        },
      ] as any)

      const result = await service.checkAutoApproval(
        'user-123',
        'conn-456',
        'SELECT * FROM users'
      )

      expect(result).toBe(false)
    })

    it('should handle invalid regex pattern gracefully', async () => {
      vi.mocked(prisma.teamMember.findMany).mockResolvedValue([])
      vi.mocked(prisma.autoApprovalRule.findMany).mockResolvedValue([
        {
          id: 'rule-1',
          userId: 'user-123',
          connectionId: null,
          queryPattern: '[invalid(regex',
          maxRows: null,
          isActive: true,
        },
      ] as any)

      const result = await service.checkAutoApproval(
        'user-123',
        'conn-456',
        'SELECT * FROM users'
      )

      expect(result).toBe(false)
    })

    it('should return false when database error occurs', async () => {
      vi.mocked(prisma.teamMember.findMany).mockRejectedValue(new Error('DB Error'))

      const result = await service.checkAutoApproval(
        'user-123',
        'conn-456',
        'SELECT * FROM users'
      )

      expect(result).toBe(false)
    })

    it('should check team rules for user', async () => {
      vi.mocked(prisma.teamMember.findMany).mockResolvedValue([
        { teamId: 'team-1' },
        { teamId: 'team-2' },
      ] as any)
      vi.mocked(prisma.autoApprovalRule.findMany).mockResolvedValue([])

      await service.checkAutoApproval('user-123', 'conn-456', 'SELECT * FROM users')

      expect(prisma.autoApprovalRule.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-123',
          isActive: true,
          OR: [
            { connectionId: 'conn-456' },
            { connectionId: null, teamId: null },
            { teamId: { in: ['team-1', 'team-2'] } },
          ],
        },
      })
    })
  })

  describe('createRule', () => {
    it('should create a new rule', async () => {
      vi.mocked(prisma.autoApprovalRule.create).mockResolvedValue({
        id: 'rule-new',
        userId: 'user-123',
        connectionId: 'conn-456',
        teamId: null,
        queryPattern: '^SELECT',
        maxRows: 100,
        isActive: true,
      } as any)

      const result = await service.createRule({
        userId: 'user-123',
        connectionId: 'conn-456',
        queryPattern: '^SELECT',
        maxRows: 100,
      })

      expect(prisma.autoApprovalRule.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-123',
          connectionId: 'conn-456',
          queryPattern: '^SELECT',
          maxRows: 100,
          isActive: true,
        },
      })
      expect(result.id).toBe('rule-new')
      expect(result.isActive).toBe(true)
    })

    it('should create a global rule without connection', async () => {
      vi.mocked(prisma.autoApprovalRule.create).mockResolvedValue({
        id: 'rule-global',
        userId: 'user-123',
        connectionId: null,
        teamId: null,
        queryPattern: null,
        maxRows: null,
        isActive: true,
      } as any)

      const result = await service.createRule({
        userId: 'user-123',
      })

      expect(result.connectionId).toBeUndefined()
      expect(result.isActive).toBe(true)
    })
  })

  describe('updateRule', () => {
    it('should update an existing rule', async () => {
      vi.mocked(prisma.autoApprovalRule.update).mockResolvedValue({
        id: 'rule-1',
        userId: 'user-123',
        connectionId: null,
        teamId: null,
        queryPattern: '^UPDATE',
        maxRows: 200,
        isActive: true,
      } as any)

      const result = await service.updateRule('rule-1', {
        queryPattern: '^UPDATE',
        maxRows: 200,
      })

      expect(prisma.autoApprovalRule.update).toHaveBeenCalledWith({
        where: { id: 'rule-1' },
        data: {
          queryPattern: '^UPDATE',
          maxRows: 200,
        },
      })
      expect(result?.queryPattern).toBe('^UPDATE')
      expect(result?.maxRows).toBe(200)
    })

    it('should return null when update fails', async () => {
      vi.mocked(prisma.autoApprovalRule.update).mockRejectedValue(new Error('Not found'))

      const result = await service.updateRule('rule-nonexistent', {
        isActive: false,
      })

      expect(result).toBeNull()
    })

    it('should deactivate a rule', async () => {
      vi.mocked(prisma.autoApprovalRule.update).mockResolvedValue({
        id: 'rule-1',
        userId: 'user-123',
        connectionId: null,
        teamId: null,
        queryPattern: null,
        maxRows: null,
        isActive: false,
      } as any)

      const result = await service.updateRule('rule-1', {
        isActive: false,
      })

      expect(result?.isActive).toBe(false)
    })
  })

  describe('deleteRule', () => {
    it('should delete a rule and return true', async () => {
      vi.mocked(prisma.autoApprovalRule.delete).mockResolvedValue({} as any)

      const result = await service.deleteRule('rule-1')

      expect(prisma.autoApprovalRule.delete).toHaveBeenCalledWith({
        where: { id: 'rule-1' },
      })
      expect(result).toBe(true)
    })

    it('should return false when delete fails', async () => {
      vi.mocked(prisma.autoApprovalRule.delete).mockRejectedValue(new Error('Not found'))

      const result = await service.deleteRule('rule-nonexistent')

      expect(result).toBe(false)
    })
  })

  describe('getUserRules', () => {
    it('should return all rules for a user', async () => {
      vi.mocked(prisma.autoApprovalRule.findMany).mockResolvedValue([
        {
          id: 'rule-1',
          userId: 'user-123',
          connectionId: 'conn-1',
          teamId: null,
          queryPattern: '^SELECT',
          maxRows: 100,
          isActive: true,
          createdAt: new Date(),
        },
        {
          id: 'rule-2',
          userId: 'user-123',
          connectionId: null,
          teamId: 'team-1',
          queryPattern: null,
          maxRows: null,
          isActive: false,
          createdAt: new Date(),
        },
      ] as any)

      const result = await service.getUserRules('user-123')

      expect(prisma.autoApprovalRule.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        orderBy: { createdAt: 'desc' },
      })
      expect(result).toHaveLength(2)
      expect(result[0].connectionId).toBe('conn-1')
      expect(result[1].teamId).toBe('team-1')
    })

    it('should return empty array when user has no rules', async () => {
      vi.mocked(prisma.autoApprovalRule.findMany).mockResolvedValue([])

      const result = await service.getUserRules('user-new')

      expect(result).toEqual([])
    })

    it('should convert null values to undefined', async () => {
      vi.mocked(prisma.autoApprovalRule.findMany).mockResolvedValue([
        {
          id: 'rule-1',
          userId: 'user-123',
          connectionId: null,
          teamId: null,
          queryPattern: null,
          maxRows: null,
          isActive: true,
          createdAt: new Date(),
        },
      ] as any)

      const result = await service.getUserRules('user-123')

      expect(result[0].connectionId).toBeUndefined()
      expect(result[0].teamId).toBeUndefined()
      expect(result[0].queryPattern).toBeUndefined()
      expect(result[0].maxRows).toBeUndefined()
    })
  })
})
